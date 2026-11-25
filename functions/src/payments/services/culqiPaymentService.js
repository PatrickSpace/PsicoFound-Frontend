const {getAuth} = require("firebase-admin/auth");
const {FieldValue, Timestamp} = require("firebase-admin/firestore");
const crypto = require("node:crypto");

const {
  MarketplacePaymentService,
} = require("./marketplacePaymentService");
const {PaymentDomainError} = require("../domain/paymentErrors");
const {encryptToken} = require("../security/tokenVault");


const CONSENT_VERSION = "2026-08-24";

class CulqiPaymentService extends MarketplacePaymentService {
  async createPaymentAccountConnection(uid) {
    return this.getPaymentAccountStatus(uid);
  }

  async getPaymentAccountStatus(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    const snapshot = await this.db
        .collection("payment_accounts")
        .doc(therapist.id)
        .get();
    const account = snapshot.data() || {};
    return {
      status:
        account.provider === "culqi" ? account.status : "not_started",
      provider: "culqi",
      environment: this.config.environment,
      isFake: this.config.useFakeProvider,
      payoutStatus: account.payoutStatus || "not_configured",
      cciLastFour: account.cciLastFour || "",
      bankName: account.bankName || "",
      sessionPriceAmount: Number(therapist.sessionPriceAmount || 0),
      currency: "PEN",
      platformPercentage: this.config.platformCommissionPercentage,
      psychologistPercentage: this.config.psychologistPercentage,
      restrictions: account.restrictions || [],
    };
  }

  async savePayoutAccount(uid, data) {
    const {therapist} = await this.requirePsychologist(uid);
    const cci = String(data.cci || "").replace(/\s/g, "");
    const bankName = clean(data.bankName, 80);
    if (!/^\d{20}$/.test(cci) || bankName.length < 2) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const now = FieldValue.serverTimestamp();
    const batch = this.db.batch();
    batch.set(
        this.db.collection("payout_accounts").doc(therapist.id),
        {
          psychologistId: therapist.id,
          psychologistUid: uid,
          encryptedCci: encryptToken(cci, this.config.payoutEncryptionKey),
          bankName,
          holderName: clean(therapist.nombre, 160),
          status: "pending_verification",
          updatedAt: now,
        },
        {merge: true},
    );
    batch.set(
        this.db.collection("payment_accounts").doc(therapist.id),
        {
          psychologistId: therapist.id,
          psychologistUid: uid,
          provider: "culqi",
          environment: this.config.environment,
          providerAccountId: "lurems-culqi",
          status: "connected",
          payoutStatus: "pending_verification",
          cciLastFour: cci.slice(-4),
          bankName,
          isFake: this.config.useFakeProvider,
          restrictions: [],
          updatedAt: now,
        },
        {merge: true},
    );
    await batch.commit();
    return this.getPaymentAccountStatus(uid);
  }

  async disconnectPaymentAccount(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    const batch = this.db.batch();
    batch.set(
        this.db.collection("payment_accounts").doc(therapist.id),
        {
          status: "disconnected",
          payoutStatus: "not_configured",
          cciLastFour: "",
          updatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
    );
    batch.delete(this.db.collection("payout_accounts").doc(therapist.id));
    await batch.commit();
    return {status: "disconnected"};
  }

  async getSellerAccessToken() {
    return "";
  }

  async listCards(uid) {
    await this.requireRole(uid, "patient");
    const snapshot = await this.db
        .collection("culqi_payment_cards")
        .where("ownerUid", "==", uid)
        .get();
    return {
      cards: snapshot.docs
          .filter((doc) => doc.data().status === "active")
          .map((doc) => publicCard(doc.id, doc.data())),
    };
  }

  async saveCard(uid, data) {
    const identity = await this.patientIdentity(uid);
    if (
      data.cardStorageConsent !== true ||
      clean(data.paymentConsentVersion, 40) !== CONSENT_VERSION
    ) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const tokenId = clean(data.tokenId, 80);
    const expectedPrefix =
      this.config.environment === "production" ? "tkn_live_" : "tkn_test_";
    if (
      !tokenId.startsWith(expectedPrefix) &&
      !(this.config.useFakeProvider && tokenId === "fake-card-token")
    ) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const billing = validBilling(data.billing);
    const deviceId = validDeviceId(data.deviceId);
    const customerRef = this.db.collection("culqi_customers").doc(uid);
    const customerSnapshot = await customerRef.get();
    let customerId = customerSnapshot.data()?.customerId;
    if (!customerId) {
      const customer = await this.provider.createCustomer({
        ...billing,
        email: identity.email,
      });
      customerId = customer.customerId;
      await customerRef.set({
        ownerUid: uid,
        customerId,
        provider: "culqi",
        environment: this.config.environment,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    const card = await this.provider.createCard({
      customerId,
      tokenId,
      deviceId,
    });
    if (card.requires3DS) {
      const challengeRef = this.db
          .collection("culqi_card_challenges")
          .doc();
      await challengeRef.set({
        ownerUid: uid,
        customerId,
        tokenId,
        deviceId,
        billing,
        status: "awaiting_3ds",
        expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
        createdAt: FieldValue.serverTimestamp(),
      });
      return {requires3DS: true, challengeId: challengeRef.id, tokenId};
    }
    return {
      card: await this.storeCard(uid, card, billing, identity.email),
    };
  }

  async completeCard3DS(uid, data) {
    await this.requireRole(uid, "patient");
    const challengeRef = this.db
        .collection("culqi_card_challenges")
        .doc(clean(data.challengeId, 180));
    let challenge;
    await this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeRef);
      challenge = snapshot.data();
      if (
        !challenge ||
        challenge.ownerUid !== uid ||
        challenge.status !== "awaiting_3ds" ||
        challenge.expiresAt.toMillis() <= Date.now()
      ) {
        throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
      }
      transaction.update(challengeRef, {status: "submitting_3ds"});
    });
    const card = await this.provider.createCard({
      customerId: challenge.customerId,
      tokenId: challenge.tokenId,
      deviceId: challenge.deviceId,
      authentication3DS: valid3DS(data.authentication3DS),
    });
    if (card.requires3DS) throw new PaymentDomainError("PAYMENT_REJECTED");
    const identity = await this.patientIdentity(uid);
    const stored = await this.storeCard(
        uid,
        card,
        challenge.billing,
        identity.email,
    );
    await challengeRef.delete();
    return {card: stored};
  }

  async storeCard(uid, card, billing, email) {
    const recordId = hash(card.cardId);
    const record = {
      ownerUid: uid,
      provider: "culqi",
      environment: this.config.environment,
      providerCardId: card.cardId,
      customerId: card.customerId,
      tokenId: card.tokenId,
      brand: card.brand,
      lastFour: card.lastFour,
      email,
      billing,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await this.db
        .collection("culqi_payment_cards")
        .doc(recordId)
        .set(record);
    return publicCard(recordId, record);
  }

  async removeCard(uid, data) {
    await this.requireRole(uid, "patient");
    const cardRef = this.db
        .collection("culqi_payment_cards")
        .doc(clean(data.cardId, 180));
    const snapshot = await cardRef.get();
    const card = snapshot.data();
    if (!card || card.ownerUid !== uid || card.status !== "active") {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    await this.provider.deleteCard({cardId: card.providerCardId});
    await cardRef.update({
      status: "deleted",
      tokenId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {removed: true};
  }

  async createBookingPayment(uid, data) {
    const identity = await this.patientIdentity(uid);
    if (
      data.paymentTermsAccepted !== true ||
      clean(data.paymentConsentVersion, 40) !== CONSENT_VERSION
    ) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const bookingId = clean(data.bookingId, 180);
    const cardRef = this.db
        .collection("culqi_payment_cards")
        .doc(clean(data.cardId, 180));
    const bookingRef = this.db.collection("bookings").doc(bookingId);
    const paymentRef = this.db.collection("payments").doc(bookingId);
    const attemptRef = this.db.collection("payment_attempts").doc();
    const deviceId = validDeviceId(data.deviceId);
    let chargeInput;
    const alreadyPaid = await this.db.runTransaction(
        async (transaction) => {
          const [bookingSnapshot, paymentSnapshot, cardSnapshot] =
          await Promise.all([
            transaction.get(bookingRef),
            transaction.get(paymentRef),
            transaction.get(cardRef),
          ]);
          const booking = bookingSnapshot.data();
          const payment = paymentSnapshot.data();
          const card = cardSnapshot.data();
          if (!booking || !payment) {
            throw new PaymentDomainError("BOOKING_NOT_FOUND");
          }
          if (booking.patientId !== uid) {
            throw new PaymentDomainError("BOOKING_NOT_OWNED_BY_PATIENT");
          }
          if (
            payment.status === "approved" ||
          booking.status === "confirmed"
          ) {
            return true;
          }
          if (
            !card ||
          card.ownerUid !== uid ||
          card.status !== "active" ||
          card.environment !== this.config.environment
          ) {
            throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
          }
          if (booking.holdExpiresAt?.toMillis() <= Date.now()) {
            throw new PaymentDomainError("BOOKING_HOLD_EXPIRED");
          }
          if (!["created", "rejected"].includes(payment.status)) {
            throw new PaymentDomainError("PAYMENT_PENDING");
          }
          const attemptNumber = Number(payment.attemptCount || 0) + 1;
          const idempotencyKey =
            `${payment.idempotencyKey}:attempt:${attemptNumber}`;
          chargeInput = {
            cardId: card.providerCardId,
            tokenId: card.tokenId,
            email: identity.email,
            firstName: card.billing.firstName,
            lastName: card.billing.lastName,
            phoneNumber: card.billing.phoneNumber,
            deviceId,
            grossAmount: booking.priceAmount,
            externalReference: payment.externalReference,
            idempotencyKey,
            providerAccountId: "lurems-culqi",
            metadata: this.config.useFakeProvider ?
            {fakeScenario: clean(data.fakeScenario, 40)} :
            {},
          };
          transaction.create(attemptRef, {
            paymentId: bookingId,
            bookingId,
            ownerUid: uid,
            attemptNumber,
            idempotencyKey,
            cardRecordId: cardRef.id,
            deviceId,
            status: "submitted",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          transaction.update(paymentRef, {
            status: "processing",
            attemptCount: attemptNumber,
            paymentConsent: {
              version: CONSENT_VERSION,
              accepted: true,
              acceptedBy: uid,
              acceptedAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          });
          return false;
        },
    );
    if (alreadyPaid) {
      return this.getBookingPaymentStatus(uid, {bookingId});
    }
    return this.submitCharge(uid, bookingId, attemptRef, chargeInput);
  }

  async completePayment3DS(uid, data) {
    await this.requireRole(uid, "patient");
    const bookingId = clean(data.bookingId, 180);
    const attemptRef = this.db
        .collection("payment_attempts")
        .doc(clean(data.challengeId, 180));
    const paymentRef = this.db.collection("payments").doc(bookingId);
    const bookingRef = this.db.collection("bookings").doc(bookingId);
    let input;
    await this.db.runTransaction(async (transaction) => {
      const [attemptSnapshot, paymentSnapshot, bookingSnapshot] =
        await Promise.all([
          transaction.get(attemptRef),
          transaction.get(paymentRef),
          transaction.get(bookingRef),
        ]);
      const attempt = attemptSnapshot.data();
      const payment = paymentSnapshot.data();
      const booking = bookingSnapshot.data();
      if (
        !attempt ||
        attempt.ownerUid !== uid ||
        attempt.bookingId !== bookingId ||
        attempt.status !== "awaiting_3ds" ||
        payment?.status !== "requires_3ds"
      ) {
        throw new PaymentDomainError("PAYMENT_PENDING");
      }
      if (
        booking?.patientId !== uid ||
        booking.holdExpiresAt?.toMillis() <= Date.now()
      ) {
        throw new PaymentDomainError("BOOKING_HOLD_EXPIRED");
      }
      const cardSnapshot = await transaction.get(
          this.db
              .collection("culqi_payment_cards")
              .doc(attempt.cardRecordId),
      );
      const card = cardSnapshot.data();
      if (!card || card.ownerUid !== uid || card.status !== "active") {
        throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
      }
      input = {
        cardId: card.providerCardId,
        email: card.email,
        firstName: card.billing.firstName,
        lastName: card.billing.lastName,
        phoneNumber: card.billing.phoneNumber,
        deviceId: attempt.deviceId,
        grossAmount: booking.priceAmount,
        externalReference: payment.externalReference,
        idempotencyKey: attempt.idempotencyKey,
        providerAccountId: "lurems-culqi",
        authentication3DS: valid3DS(data.authentication3DS),
      };
      transaction.update(attemptRef, {
        status: "submitting_3ds",
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(paymentRef, {
        status: "processing",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return this.submitCharge(uid, bookingId, attemptRef, input);
  }

  async submitCharge(uid, bookingId, attemptRef, input) {
    const paymentRef = this.db.collection("payments").doc(bookingId);
    const bookingRef = this.db.collection("bookings").doc(bookingId);
    let result;
    try {
      result = await this.provider.createPayment(input);
    } catch (error) {
      const state = error.outcomeUnknown ? "manual_review" : "rejected";
      await this.db.runTransaction(async (transaction) => {
        transaction.update(attemptRef, {
          status: state,
          failureCode: error.code || "provider_error",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(paymentRef, {
          status: state,
          failureCode: error.code || "provider_error",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(bookingRef, {
          status: error.outcomeUnknown ?
            "payment_processing" :
            "payment_failed",
          paymentStatus: state,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      throw error;
    }
    if (result.requires3DS) {
      const cardSnapshot = await this.db
          .collection("culqi_payment_cards")
          .doc((await attemptRef.get()).data().cardRecordId)
          .get();
      await this.db.runTransaction(async (transaction) => {
        transaction.update(attemptRef, {
          status: "awaiting_3ds",
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.update(paymentRef, {
          status: "requires_3ds",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return {
        requires3DS: true,
        challengeId: attemptRef.id,
        tokenId: cardSnapshot.data()?.tokenId || "",
      };
    }
    await this.db.runTransaction(async (transaction) => {
      transaction.update(attemptRef, {
        providerPaymentId: result.providerPaymentId,
        status: result.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(paymentRef, {
        providerPaymentId: result.providerPaymentId,
        providerAccountId: "lurems-culqi",
        status: "processing",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    try {
      const verified = this.config.useFakeProvider ?
        result :
        await this.provider.getPayment({
          providerPaymentId: result.providerPaymentId,
        });
      await this.processPaymentProviderEvent(verified);
    } catch {
      await paymentRef.set(
          {status: "pending", updatedAt: FieldValue.serverTimestamp()},
          {merge: true},
      );
      await bookingRef.set(
          {
            status: "payment_processing",
            paymentStatus: "pending",
            updatedAt: FieldValue.serverTimestamp(),
          },
          {merge: true},
      );
    }
    return this.getBookingPaymentStatus(uid, {bookingId});
  }

  async patientIdentity(uid) {
    const user = await this.requireRole(uid, "patient");
    let email = clean(user.email, 240).toLowerCase();
    if (!email) {
      const authUser = await getAuth().getUser(uid);
      email = clean(authUser.email, 240).toLowerCase();
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    return {email};
  }
}

function validBilling(value = {}) {
  const billing = {
    firstName: clean(value.firstName, 80),
    lastName: clean(value.lastName, 80),
    phoneNumber: clean(value.phoneNumber, 20).replace(/\s/g, ""),
    address: clean(value.address, 180),
    addressCity: clean(value.addressCity, 100),
  };
  if (
    billing.firstName.length < 2 ||
    billing.lastName.length < 2 ||
    !/^\+?\d{9,15}$/.test(billing.phoneNumber) ||
    billing.address.length < 5 ||
    billing.addressCity.length < 2
  ) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }
  return billing;
}

function validDeviceId(value) {
  const id = clean(value, 120);
  if (!/^[a-zA-Z0-9-]{16,120}$/.test(id)) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }
  return id;
}

function valid3DS(value = {}) {
  const result = Object.fromEntries(
      [
        "eci",
        "xid",
        "cavv",
        "protocolVersion",
        "directoryServerTransactionId",
      ].map((field) => [field, clean(value[field], 200)]),
  );
  if (
    !result.eci ||
    !result.xid ||
    !result.cavv ||
    !result.protocolVersion
  ) {
    throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
  }
  return result;
}

function publicCard(id, card) {
  return {
    id,
    brand: card.brand || "Tarjeta",
    lastFour: card.lastFour || "",
  };
}

function clean(value, maxLength) {
  return String(value || "")
      .trim()
      .slice(0, maxLength);
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

module.exports = {CulqiPaymentService, valid3DS, validBilling};

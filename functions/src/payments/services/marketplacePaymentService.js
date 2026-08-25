const crypto = require("node:crypto");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {calculatePaymentAllocation} = require("../domain/paymentAllocation");
const {PaymentDomainError} = require("../domain/paymentErrors");
const {canTransitionPayment} = require("../domain/paymentStates");
const {evaluateCancellationPolicy} = require("../domain/cancellationPolicy");
const {decryptToken, encryptToken} = require("../security/tokenVault");
const {
  buildInitialTherapyFields,
  buildIntakeSnapshot,
} = require("../../therapies/intakeSnapshot");

const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

class MarketplacePaymentService {
  constructor({db, config, provider}) {
    this.db = db;
    this.config = config;
    this.provider = provider;
  }

  async createPaymentAccountConnection(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    if (!this.config.useFakeProvider) {
      return this.createSellerAuthorizationUrl(uid);
    }
    const now = FieldValue.serverTimestamp();
    await this.db.collection("payment_accounts").doc(therapist.id).set({
      psychologistId: therapist.id,
      psychologistUid: uid,
      provider: "mercado_pago",
      environment: this.config.environment,
      status: "connected",
      providerAccountId: `fake-seller-${therapist.id}`,
      providerUserId: `fake-user-${therapist.id}`,
      isFake: true,
      restrictions: [],
      connectedAt: now,
      lastValidatedAt: now,
      createdAt: now,
      updatedAt: now,
    }, {merge: true});
    return {status: "connected", isFake: true};
  }

  async createSellerAuthorizationUrl(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    const state = crypto.randomBytes(32).toString("base64url");
    const stateHash = hash(state);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000);
    await this.db.collection("payment_oauth_states").doc(stateHash).set({
      psychologistId: therapist.id,
      psychologistUid: uid,
      provider: "mercado_pago",
      stateHash,
      status: "pending",
      expiresAt,
      createdAt: now,
    });
    const result = await this.provider.createSellerAuthorizationUrl({state});
    return {authorizationUrl: result.authorizationUrl};
  }

  async completeOAuth({code, state}) {
    if (!code || !state) throw new PaymentDomainError("INVALID_WEBHOOK");
    const stateRef = this.db.collection("payment_oauth_states").doc(hash(state));
    const snapshot = await stateRef.get();
    const oauthState = snapshot.data();
    if (!snapshot.exists || oauthState.status !== "pending" ||
      oauthState.expiresAt.toMillis() <= Date.now()) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const connection = await this.provider.exchangeAuthorizationCode({
      code,
      psychologistId: oauthState.psychologistId,
    });
    const secretPayload = connection.isFake ? null : {
      accessToken: encryptToken(
          connection.accessToken,
          this.config.mercadoPago.tokenEncryptionKey,
      ),
      refreshToken: encryptToken(
          connection.refreshToken,
          this.config.mercadoPago.tokenEncryptionKey,
      ),
    };
    const accountRef = this.db.collection("payment_accounts")
        .doc(oauthState.psychologistId);
    const secretRef = this.db.collection("payment_account_secrets")
        .doc(oauthState.psychologistId);
    await this.db.runTransaction(async (transaction) => {
      const latestState = await transaction.get(stateRef);
      if (!latestState.exists || latestState.data().status !== "pending") {
        throw new PaymentDomainError("DUPLICATE_EVENT");
      }
      const now = FieldValue.serverTimestamp();
      transaction.set(accountRef, {
        psychologistId: oauthState.psychologistId,
        psychologistUid: oauthState.psychologistUid,
        provider: "mercado_pago",
        environment: this.config.environment,
        status: "connected",
        providerAccountId: connection.providerAccountId,
        providerUserId: connection.providerUserId,
        isFake: Boolean(connection.isFake),
        restrictions: [],
        connectedAt: now,
        lastValidatedAt: now,
        createdAt: now,
        updatedAt: now,
      }, {merge: true});
      if (secretPayload) {
        transaction.set(secretRef, {
          ...secretPayload,
          expiresIn: connection.expiresIn || null,
          updatedAt: now,
        }, {merge: true});
      }
      transaction.update(stateRef, {status: "used", usedAt: now});
    });
    return {psychologistId: oauthState.psychologistId, status: "connected"};
  }

  async getPaymentAccountStatus(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    const snapshot = await this.db.collection("payment_accounts").doc(therapist.id).get();
    const account = snapshot.data() || {};
    return {
      status: account.status || "not_started",
      isFake: Boolean(account.isFake),
      environment: account.environment || this.config.environment,
      restrictions: account.restrictions || [],
      connectedAt: toIso(account.connectedAt),
      lastValidatedAt: toIso(account.lastValidatedAt),
      sessionPriceAmount: Number(therapist.sessionPriceAmount || 0),
      currency: "PEN",
      platformPercentage: this.config.platformCommissionPercentage,
      psychologistPercentage: this.config.psychologistPercentage,
    };
  }

  async updatePaymentSettings(uid, data) {
    const {therapist} = await this.requirePsychologist(uid);
    const sessionPriceAmount = Number(data.sessionPriceAmount);
    if (!Number.isSafeInteger(sessionPriceAmount) || sessionPriceAmount < 100) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    await this.db.collection("therapists").doc(therapist.id).update({
      sessionPriceAmount,
      paymentCurrency: "PEN",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {sessionPriceAmount, currency: "PEN"};
  }

  async disconnectPaymentAccount(uid) {
    const {therapist} = await this.requirePsychologist(uid);
    const accountRef = this.db.collection("payment_accounts").doc(therapist.id);
    const snapshot = await accountRef.get();
    const account = snapshot.data() || {};
    await this.provider.disconnectSeller({providerAccountId: account.providerAccountId});
    await accountRef.set({
      status: "disconnected",
      disconnectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    await this.db.collection("payment_account_secrets").doc(therapist.id).delete();
    return {status: "disconnected"};
  }

  async createBookingHold(uid, data) {
    const patient = await this.requireRole(uid, "patient");
    const slotId = cleanText(data.slotId, 180);
    const requestedTherapyId = cleanText(data.terapiaId, 180);
    if (!slotId) throw new PaymentDomainError("SLOT_NOT_AVAILABLE");
    const bookingRef = this.db.collection("bookings").doc();
    const newTherapyRef = this.db.collection("terapias")
        .doc(`booking-${bookingRef.id}`);
    const slotRef = this.db.collection("therapist_availability").doc(slotId);
    const holdExpiresAt = Timestamp.fromMillis(
        Date.now() + this.config.bookingHoldMinutes * 60 * 1000,
    );
    let response;
    await this.db.runTransaction(async (transaction) => {
      const slotSnapshot = await transaction.get(slotRef);
      if (!slotSnapshot.exists) throw new PaymentDomainError("SLOT_NOT_AVAILABLE");
      const slot = slotSnapshot.data();
      const therapistRef = this.db.collection("therapists").doc(slot.therapistId);
      const accountRef = this.db.collection("payment_accounts").doc(slot.therapistId);
      const ruleRef = this.db.collection("commission_rules")
          .doc("default-marketplace-split");
      const therapyTarget = requestedTherapyId ?
        this.db.collection("terapias").doc(requestedTherapyId) :
        this.db.collection("terapias")
            .where("pacienteUid", "==", uid)
            .where("estado", "==", "activo")
            .limit(1);
      const [therapistSnapshot, accountSnapshot, ruleSnapshot, therapySnapshot] =
        await Promise.all([
          transaction.get(therapistRef),
          transaction.get(accountRef),
          transaction.get(ruleRef),
          transaction.get(therapyTarget),
        ]);
      const therapist = therapistSnapshot.data() || {};
      const account = accountSnapshot.data() || {};
      const activeTherapyDocument = requestedTherapyId ?
        (therapySnapshot.exists ? therapySnapshot : null) :
        (therapySnapshot.empty ? null : therapySnapshot.docs[0]);
      const activeTherapy = activeTherapyDocument?.data() || null;
      if (slot.status !== "available") throw new PaymentDomainError("SLOT_NOT_AVAILABLE");
      if (!therapistSnapshot.exists || therapist.activo === false) {
        throw new PaymentDomainError("PSYCHOLOGIST_NOT_ACTIVE");
      }
      assertConnectedAccount(account);
      if (requestedTherapyId && !activeTherapyDocument) {
        throw new PaymentDomainError("BOOKING_NOT_FOUND");
      }
      if (activeTherapy && (activeTherapy.pacienteUid !== uid ||
        activeTherapy.terapeutaId !== slot.therapistId ||
        activeTherapy.estado !== "activo")) {
        throw new PaymentDomainError("BOOKING_ALREADY_RESERVED");
      }
      const therapyId = activeTherapyDocument?.id || newTherapyRef.id;
      const priceAmount = Number(therapist.sessionPriceAmount || 0);
      if (!Number.isSafeInteger(priceAmount) || priceAmount < 100) {
        throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
      }
      const commissionRuleSnapshot = this.commissionRuleSnapshot(
          ruleSnapshot.data(),
      );
      const allocation = calculatePaymentAllocation({
        grossAmount: priceAmount,
        platformCommissionPercentage: commissionRuleSnapshot.platformPercentage,
        psychologistPercentage: commissionRuleSnapshot.psychologistPercentage,
        processorFeeBearer: commissionRuleSnapshot.processorFeeBearer,
      });
      const now = FieldValue.serverTimestamp();
      if (!ruleSnapshot.exists) {
        transaction.create(ruleRef, {
          name: "Distribución marketplace inicial",
          version: 1,
          type: "percentage",
          platformPercentage: commissionRuleSnapshot.platformPercentage,
          psychologistPercentage: commissionRuleSnapshot.psychologistPercentage,
          processorFeeBearer: commissionRuleSnapshot.processorFeeBearer,
          active: true,
          effectiveFrom: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      const booking = {
        patientId: uid,
        psychologistId: slot.therapistId,
        psychologistUid: therapist.uid || "",
        slotId,
        terapiaId: therapyId,
        patientName: cleanText(patient.nombre, 160) || "Paciente",
        patientEmail: cleanText(patient.email, 240),
        psychologistName: cleanText(therapist.nombre, 160) || "Psicólogo",
        status: "payment_pending",
        paymentStatus: "created",
        startsAt: slotTimestamp(slot.date, slot.startTime),
        endsAt: slotTimestamp(slot.date, slot.endTime),
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: cleanText(data.timezone, 80) || "America/Lima",
        modality: normalizeModality(slot.modality),
        location: cleanText(slot.location, 240),
        notes: cleanText(data.notes, 800),
        currency: "PEN",
        priceAmount,
        paymentId: bookingRef.id,
        holdExpiresAt,
        commissionRuleSnapshot,
        createdAt: now,
        updatedAt: now,
      };
      transaction.create(bookingRef, booking);
      transaction.create(this.db.collection("payments").doc(bookingRef.id), {
        bookingId: bookingRef.id,
        patientId: uid,
        psychologistId: slot.therapistId,
        provider: "mercado_pago",
        environment: this.config.environment,
        isFake: this.config.useFakeProvider,
        externalReference: `booking:${bookingRef.id}`,
        idempotencyKey: `payment:create:${bookingRef.id}`,
        status: "created",
        currency: "PEN",
        ...allocation,
        commissionRuleSnapshot,
        createdAt: now,
        updatedAt: now,
      });
      transaction.update(slotRef, {
        status: "held",
        heldBy: uid,
        bookingId: bookingRef.id,
        holdExpiresAt,
        updatedAt: now,
      });
      response = publicBooking(bookingRef.id, booking);
    });
    logger.info("Payment booking hold created", paymentLog({bookingId: bookingRef.id}));
    return response;
  }

  async createBookingPayment(uid, data) {
    await this.requireRole(uid, "patient");
    if (data.paymentTermsAccepted !== true ||
      cleanText(data.paymentConsentVersion, 40) !== "2026-08-24") {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    const bookingId = cleanText(data.bookingId, 180);
    const bookingRef = this.db.collection("bookings").doc(bookingId);
    const paymentRef = this.db.collection("payments").doc(bookingId);
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([
      bookingRef.get(),
      paymentRef.get(),
    ]);
    if (!bookingSnapshot.exists) throw new PaymentDomainError("BOOKING_NOT_FOUND");
    const booking = bookingSnapshot.data();
    const payment = paymentSnapshot.data() || {};
    if (booking.patientId !== uid) {
      throw new PaymentDomainError("BOOKING_NOT_OWNED_BY_PATIENT");
    }
    if (booking.status === "confirmed" || payment.status === "approved") {
      return {bookingId, paymentId: paymentRef.id, status: "approved"};
    }
    if (booking.holdExpiresAt?.toMillis() <= Date.now()) {
      throw new PaymentDomainError("BOOKING_HOLD_EXPIRED");
    }
    const accountSnapshot = await this.db.collection("payment_accounts")
        .doc(booking.psychologistId).get();
    const account = accountSnapshot.data() || {};
    assertConnectedAccount(account);
    const sellerAccessToken = await this.getSellerAccessToken(booking.psychologistId, account);
    const attemptRef = this.db.collection("payment_attempts").doc();
    const attemptNumber = Number(payment.attemptCount || 0) + 1;
    const idempotencyKey = `${payment.idempotencyKey}:attempt:${attemptNumber}`;
    await attemptRef.set({
      paymentId: paymentRef.id,
      bookingId,
      attemptNumber,
      idempotencyKey,
      status: "submitted",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await paymentRef.set({
      status: "processing",
      attemptCount: attemptNumber,
      paymentConsent: {
        version: "2026-08-24",
        accepted: true,
        acceptedAt: FieldValue.serverTimestamp(),
        acceptedBy: uid,
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    let providerPayment;
    try {
      providerPayment = await this.provider.createPayment({
        sellerAccessToken,
        providerAccountId: account.providerAccountId,
        paymentToken: cleanText(data.paymentToken, 4000),
        paymentMethodId: cleanText(data.paymentMethodId, 80),
        installments: normalizeInstallments(data.installments),
        payer: data.payer || {},
        grossAmount: booking.priceAmount,
        platformCommissionGrossAmount: payment.platformCommissionGrossAmount,
        currency: booking.currency,
        externalReference: payment.externalReference,
        idempotencyKey,
        metadata: this.config.useFakeProvider ? {
          fakeScenario: cleanText(data.fakeScenario, 40),
        } : {},
      });
    } catch (error) {
      await Promise.all([
        attemptRef.set({status: "failed", failureCode: error.code || "provider_error",
          updatedAt: FieldValue.serverTimestamp()}, {merge: true}),
        paymentRef.set({status: "provider_error", failureCode: error.code || "provider_error",
          updatedAt: FieldValue.serverTimestamp()}, {merge: true}),
      ]);
      throw error;
    }
    await attemptRef.set({
      providerPaymentId: providerPayment.providerPaymentId,
      status: providerPayment.status === "approved" ? "approved" : providerPayment.status,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    await paymentRef.set({
      providerPaymentId: providerPayment.providerPaymentId,
      providerAccountId: providerPayment.providerAccountId || account.providerAccountId,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    if (this.config.useFakeProvider) {
      await this.processPaymentProviderEvent(providerPayment);
    } else {
      try {
        const verifiedPayment = await this.provider.getPayment({
          providerPaymentId: providerPayment.providerPaymentId,
          sellerAccessToken,
        });
        await this.processPaymentProviderEvent(verifiedPayment);
      } catch (error) {
        logger.warn("Payment created but immediate verification is pending", paymentLog({
          paymentId: paymentRef.id,
          providerPaymentId: providerPayment.providerPaymentId,
          errorType: error.code || error.name,
        }));
        await Promise.all([
          paymentRef.set({status: "pending", updatedAt: FieldValue.serverTimestamp()},
              {merge: true}),
          bookingRef.set({status: "payment_processing", paymentStatus: "pending",
            updatedAt: FieldValue.serverTimestamp()}, {merge: true}),
        ]);
      }
    }
    if (this.config.useFakeProvider &&
      providerPayment.metadata?.scenario === "duplicate_webhook") {
      await this.processPaymentProviderEvent(providerPayment);
    }
    return this.getBookingPaymentStatus(uid, {bookingId});
  }

  async simulatePaymentEvent(uid, data) {
    if (!this.config.useFakeProvider || this.config.appEnvironment !== "development") {
      throw new PaymentDomainError("INVALID_ROLE");
    }
    const bookingId = cleanText(data.bookingId, 180);
    const allowedStatuses = [
      "approved",
      "pending",
      "rejected",
      "refunded",
      "charged_back",
    ];
    const status = cleanText(data.status, 40).toLowerCase();
    if (!allowedStatuses.includes(status)) {
      throw new PaymentDomainError("PAYMENT_CONFIGURATION_INVALID");
    }
    await this.getBookingPaymentStatus(uid, {bookingId});
    const paymentSnapshot = await this.db.collection("payments").doc(bookingId).get();
    const payment = paymentSnapshot.data() || {};
    if (!payment.providerPaymentId) throw new PaymentDomainError("PAYMENT_PENDING");
    return this.processPaymentProviderEvent({
      providerEventId: `fake-manual:${payment.providerPaymentId}:${status}`,
      providerPaymentId: payment.providerPaymentId,
      providerAccountId: payment.providerAccountId,
      status,
      currency: payment.currency,
      grossAmount: payment.grossAmount,
      processorFeeAmount: Number(data.processorFeeAmount || 0),
      externalReference: payment.externalReference,
      metadata: {scenario: "manual", isFake: true},
    });
  }

  async getBookingPaymentStatus(uid, data) {
    const bookingId = cleanText(data.bookingId, 180);
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([
      this.db.collection("bookings").doc(bookingId).get(),
      this.db.collection("payments").doc(bookingId).get(),
    ]);
    if (!bookingSnapshot.exists) throw new PaymentDomainError("BOOKING_NOT_FOUND");
    const booking = bookingSnapshot.data();
    if (booking.patientId !== uid && booking.psychologistUid !== uid &&
      !(await this.isAdmin(uid))) {
      throw new PaymentDomainError("INVALID_ROLE");
    }
    const payment = paymentSnapshot.data() || {};
    return {
      booking: publicBooking(bookingId, booking),
      payment: {
        id: paymentSnapshot.id,
        status: payment.status || "created",
        currency: payment.currency || "PEN",
        grossAmount: Number(payment.grossAmount || 0),
        failureCode: payment.failureCode || "",
        isFake: Boolean(payment.isFake),
        reference: payment.externalReference || "",
      },
    };
  }

  async listMyBookings(uid) {
    await this.requireRole(uid, "patient");
    const snapshot = await this.db.collection("bookings")
        .where("patientId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();
    return {
      bookings: snapshot.docs.map((document) =>
        publicBooking(document.id, document.data())),
    };
  }

  async processWebhook(input) {
    const eventHeader = await this.provider.processWebhookEvent(input);
    const paymentQuery = await this.db.collection("payments")
        .where("providerPaymentId", "==", eventHeader.providerPaymentId)
        .limit(1).get();
    if (paymentQuery.empty) return {ignored: true};
    const paymentDocument = paymentQuery.docs[0];
    const payment = paymentDocument.data();
    const accountSnapshot = await this.db.collection("payment_accounts")
        .doc(payment.psychologistId).get();
    const sellerAccessToken = await this.getSellerAccessToken(
        payment.psychologistId,
        accountSnapshot.data() || {},
    );
    const providerPayment = await this.provider.getPayment({
      providerPaymentId: eventHeader.providerPaymentId,
      sellerAccessToken,
    });
    providerPayment.providerEventId = eventHeader.providerEventId ||
      providerPayment.providerEventId;
    return this.processPaymentProviderEvent(providerPayment);
  }

  async processPaymentProviderEvent(event) {
    const eventId = cleanText(event.providerEventId, 240) ||
      `payment:${event.providerPaymentId}:${event.status}`;
    const eventRef = this.db.collection("payment_events").doc(hash(eventId));
    let outcome = {duplicate: false, status: event.status};
    await this.db.runTransaction(async (transaction) => {
      const paymentQuery = await this.db.collection("payments")
          .where("providerPaymentId", "==", event.providerPaymentId)
          .limit(1).get();
      if (paymentQuery.empty) throw new PaymentDomainError("BOOKING_NOT_FOUND");
      const paymentRef = paymentQuery.docs[0].ref;
      const paymentSnapshot = await transaction.get(paymentRef);
      const payment = paymentSnapshot.data();
      const bookingRef = this.db.collection("bookings").doc(payment.bookingId);
      const bookingSnapshot = await transaction.get(bookingRef);
      const eventSnapshot = await transaction.get(eventRef);
      if (eventSnapshot.exists && eventSnapshot.data().status === "processed") {
        outcome = {duplicate: true, status: payment.status};
        return;
      }
      const booking = bookingSnapshot.data();
      const slotRef = this.db.collection("therapist_availability").doc(booking.slotId);
      const slotSnapshot = await transaction.get(slotRef);
      let therapyRef = null;
      let therapySnapshot = null;
      let profileSnapshot = null;
      let therapyConflict = false;
      if (event.status === "approved") {
        const activeTherapyQuery = this.db.collection("terapias")
            .where("pacienteUid", "==", booking.patientId)
            .where("estado", "==", "activo")
            .limit(1);
        const activeTherapySnapshot = await transaction.get(activeTherapyQuery);
        if (!activeTherapySnapshot.empty) {
          therapySnapshot = activeTherapySnapshot.docs[0];
          therapyRef = therapySnapshot.ref;
          therapyConflict = therapySnapshot.data().terapeutaId !== booking.psychologistId;
        } else {
          therapyRef = this.db.collection("terapias")
              .doc(booking.terapiaId || `booking-${payment.bookingId}`);
          therapySnapshot = await transaction.get(therapyRef);
          if (therapySnapshot.exists) {
            const therapy = therapySnapshot.data();
            therapyConflict = therapy.pacienteUid !== booking.patientId ||
              therapy.terapeutaId !== booking.psychologistId ||
              therapy.estado !== "activo";
          }
        }
        if (!therapySnapshot?.exists) {
          profileSnapshot = await transaction.get(
              this.db.collection("profiles").doc(booking.patientId),
          );
        }
      } else if (["refunded", "charged_back"].includes(event.status) &&
        booking.terapiaId) {
        therapyRef = this.db.collection("terapias").doc(booking.terapiaId);
        therapySnapshot = await transaction.get(therapyRef);
      }
      const mismatch = validateProviderPayment(payment, event);
      const now = FieldValue.serverTimestamp();
      transaction.set(eventRef, {
        provider: "mercado_pago",
        environment: this.config.environment,
        providerEventId: eventId,
        providerPaymentId: event.providerPaymentId,
        paymentId: paymentRef.id,
        bookingId: payment.bookingId,
        type: "payment",
        status: mismatch ? "manual_review" : "processed",
        payloadHash: hash(JSON.stringify({status: event.status, id: event.providerPaymentId})),
        attempts: FieldValue.increment(1),
        errorCode: mismatch || "",
        receivedAt: now,
        processedAt: now,
        updatedAt: now,
      }, {merge: true});
      if (mismatch) {
        transaction.update(paymentRef, {status: "manual_review", failureCode: mismatch,
          updatedAt: now});
        transaction.update(bookingRef, {status: "payment_failed", paymentStatus: "manual_review",
          updatedAt: now});
        outcome = {manualReview: true, status: "manual_review"};
        return;
      }
      if (isDuplicateTerminalState(payment.status, event.status)) {
        outcome = {duplicate: true, status: payment.status};
        return;
      }
      if (!canTransitionPayment(payment.status, event.status)) {
        outcome = {ignored: true, status: payment.status};
        return;
      }
      const allocation = calculatePaymentAllocation({
        grossAmount: payment.grossAmount,
        platformCommissionPercentage: payment.commissionRuleSnapshot.platformPercentage,
        psychologistPercentage: payment.commissionRuleSnapshot.psychologistPercentage,
        processorFeeAmount: Number(event.processorFeeAmount || 0),
        processorFeeBearer: payment.commissionRuleSnapshot.processorFeeBearer,
      });
      transaction.update(paymentRef, {
        status: event.status,
        ...allocation,
        failureCode: cleanText(event.failureCode, 120),
        approvedAt: event.status === "approved" ? now : payment.approvedAt || null,
        updatedAt: now,
      });
      if (event.status === "approved") {
        const slot = slotSnapshot.data() || {};
        const canClaimSlot = slot.bookingId === payment.bookingId || slot.status === "available";
        const bookingWasCancelled = String(booking.status).startsWith("cancelled_");
        if (!canClaimSlot || therapyConflict || bookingWasCancelled) {
          const conflictCode = bookingWasCancelled ? "late_approval_cancelled_booking" :
            therapyConflict ? "active_therapy_conflict" :
              "late_approval_slot_conflict";
          transaction.update(paymentRef, {status: "manual_review",
            failureCode: conflictCode, updatedAt: now});
          transaction.update(bookingRef, {status: "refund_pending",
            paymentStatus: "manual_review", updatedAt: now});
          outcome = {manualReview: true, refundRequired: true, status: "manual_review"};
          return;
        }
        transaction.update(bookingRef, {
          status: "confirmed",
          paymentStatus: "approved",
          confirmedAt: now,
          updatedAt: now,
        });
        transaction.update(slotRef, {
          status: "booked",
          bookedBy: booking.patientId,
          appointmentId: payment.bookingId,
          bookingId: payment.bookingId,
          heldBy: FieldValue.delete(),
          holdExpiresAt: FieldValue.delete(),
          updatedAt: now,
        });
        this.writeLedger(transaction, paymentRef.id, booking, allocation, now);
        const resolvedTherapyId = therapyRef.id;
        this.writeTherapyProjection(
            transaction,
            therapyRef,
            therapySnapshot,
            payment.bookingId,
            booking,
            profileSnapshot?.data() || {},
            now,
        );
        this.writeLegacyAppointment(
            transaction,
            payment.bookingId,
            {...booking, terapiaId: resolvedTherapyId},
            now,
        );
        transaction.update(bookingRef, {terapiaId: resolvedTherapyId});
        this.writeNotifications(transaction, payment.bookingId, booking, "approved", now);
      } else if (event.status === "rejected" || event.status === "provider_error") {
        transaction.update(bookingRef, {
          status: "payment_failed",
          paymentStatus: event.status,
          updatedAt: now,
        });
        this.writeNotifications(transaction, payment.bookingId, booking, "rejected", now);
      } else if (["refunded", "partially_refunded"].includes(event.status)) {
        transaction.update(bookingRef, {
          status: event.status === "refunded" ? "refunded" : "refund_pending",
          paymentStatus: event.status,
          updatedAt: now,
        });
        if (event.status === "refunded") {
          this.writeRefundLedger(transaction, paymentRef.id, booking, payment, now);
          this.writeLegacyPaymentState(
              transaction,
              payment.bookingId,
              therapyRef,
              therapySnapshot,
              "cancelada",
              "refunded",
              now,
          );
          this.writeNotifications(transaction, payment.bookingId, booking, "refunded", now);
        }
      } else if (event.status === "charged_back") {
        transaction.update(bookingRef, {
          status: "chargeback",
          paymentStatus: "charged_back",
          updatedAt: now,
        });
        this.writeChargebackLedger(transaction, paymentRef.id, booking, payment, now);
        this.writeLegacyPaymentState(
            transaction,
            payment.bookingId,
            therapyRef,
            therapySnapshot,
            "revision",
            "charged_back",
            now,
        );
      } else {
        transaction.update(bookingRef, {status: "payment_processing",
          paymentStatus: event.status, updatedAt: now});
      }
    });
    logger.info("Payment event processed", paymentLog({
      paymentEventId: eventId,
      providerPaymentId: event.providerPaymentId,
      status: outcome.status,
    }));
    return outcome;
  }

  async expireBookingHold(bookingId) {
    const bookingRef = this.db.collection("bookings").doc(bookingId);
    return this.db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) return {ignored: true};
      const booking = bookingSnapshot.data();
      if (!["payment_pending", "payment_processing", "payment_failed"].includes(booking.status) ||
        booking.paymentStatus === "approved" ||
        booking.holdExpiresAt?.toMillis() > Date.now()) return {ignored: true};
      const slotRef = this.db.collection("therapist_availability").doc(booking.slotId);
      const slotSnapshot = await transaction.get(slotRef);
      const now = FieldValue.serverTimestamp();
      transaction.update(bookingRef, {status: "expired", updatedAt: now});
      if (slotSnapshot.exists && slotSnapshot.data().bookingId === bookingId &&
        slotSnapshot.data().status === "held") {
        transaction.update(slotRef, {
          status: "available",
          bookedBy: "",
          appointmentId: "",
          bookingId: "",
          heldBy: FieldValue.delete(),
          holdExpiresAt: FieldValue.delete(),
          updatedAt: now,
        });
      }
      this.writeNotifications(transaction, bookingId, booking, "expired", now);
      return {expired: true};
    });
  }

  async expirePendingBookingHolds() {
    const snapshot = await this.db.collection("bookings")
        .where("status", "in", ["payment_pending", "payment_processing", "payment_failed"])
        .where("holdExpiresAt", "<=", Timestamp.now()).limit(100).get();
    const results = await Promise.all(snapshot.docs.map((doc) => this.expireBookingHold(doc.id)));
    return {checked: snapshot.size, expired: results.filter((item) => item.expired).length};
  }

  async cancelBooking(uid, data) {
    const bookingId = cleanText(data.bookingId, 180);
    const bookingSnapshot = await this.db.collection("bookings").doc(bookingId).get();
    if (!bookingSnapshot.exists) throw new PaymentDomainError("BOOKING_NOT_FOUND");
    const booking = bookingSnapshot.data();
    const adminUser = await this.isAdmin(uid);
    const isPatient = booking.patientId === uid;
    const isPsychologist = booking.psychologistUid === uid;
    if (!isPatient && !isPsychologist && !adminUser) {
      throw new PaymentDomainError("INVALID_ROLE");
    }
    const reason = isPsychologist ? "psychologist_cancelled" :
      adminUser ? "platform_cancelled" : "patient_cancelled";
    const policy = evaluateCancellationPolicy({
      startsAtMs: booking.startsAt.toMillis(),
      cancelledAtMs: Date.now(),
      cancelledBy: isPsychologist ? "psychologist" :
        adminUser ? "platform" : "patient",
    });
    const refundable = policy.refundable;
    await this.db.runTransaction(async (transaction) => {
      const bookingRef = this.db.collection("bookings").doc(bookingId);
      const slotRef = this.db.collection("therapist_availability")
          .doc(booking.slotId);
      const therapyRef = booking.terapiaId ?
        this.db.collection("terapias").doc(booking.terapiaId) : null;
      const [slotSnapshot, therapySnapshot] = await Promise.all([
        transaction.get(slotRef),
        therapyRef ? transaction.get(therapyRef) : Promise.resolve(null),
      ]);
      const now = FieldValue.serverTimestamp();
      transaction.set(bookingRef, {
        status: isPsychologist ? "cancelled_by_psychologist" :
          adminUser ? "cancelled_by_platform" : "cancelled_by_patient",
        cancelledAt: now,
        updatedAt: now,
      }, {merge: true});
      if (slotSnapshot.exists && slotSnapshot.data().bookingId === bookingId) {
        transaction.update(slotRef, {
          status: "available",
          bookedBy: "",
          appointmentId: "",
          bookingId: "",
          heldBy: FieldValue.delete(),
          holdExpiresAt: FieldValue.delete(),
          updatedAt: now,
        });
      }
      if (booking.paymentStatus === "approved") {
        this.writeLegacyPaymentState(
            transaction,
            bookingId,
            therapyRef,
            therapySnapshot,
            "cancelada",
            refundable ? "refund_pending" : "approved",
            now,
        );
      } else {
        transaction.set(this.db.collection("payments").doc(bookingId), {
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
        }, {merge: true});
      }
    });
    if (booking.paymentStatus === "approved" && refundable) {
      return this.refundBookingPayment(uid, {bookingId, reasonCode: reason}, {systemAllowed: true});
    }
    return {bookingId, status: "cancelled", refundable};
  }

  async refundBookingPayment(uid, data, options = {}) {
    const bookingId = cleanText(data.bookingId, 180);
    const [bookingSnapshot, paymentSnapshot] = await Promise.all([
      this.db.collection("bookings").doc(bookingId).get(),
      this.db.collection("payments").doc(bookingId).get(),
    ]);
    if (!bookingSnapshot.exists || !paymentSnapshot.exists) {
      throw new PaymentDomainError("BOOKING_NOT_FOUND");
    }
    const booking = bookingSnapshot.data();
    const payment = paymentSnapshot.data();
    const isAllowed = options.systemAllowed || await this.isAdmin(uid) ||
      booking.patientId === uid || booking.psychologistUid === uid;
    if (!isAllowed) throw new PaymentDomainError("INVALID_ROLE");
    if (payment.status === "refunded") {
      return {bookingId, status: "refunded", duplicate: true};
    }
    if (payment.status !== "approved" && payment.status !== "refund_pending") {
      throw new PaymentDomainError("REFUND_NOT_ALLOWED");
    }
    const refundId = hash(`refund:${bookingId}:full`);
    const refundRef = this.db.collection("refunds").doc(refundId);
    const accountSnapshot = await this.db.collection("payment_accounts")
        .doc(booking.psychologistId).get();
    const sellerAccessToken = await this.getSellerAccessToken(
        booking.psychologistId,
        accountSnapshot.data() || {},
    );
    await refundRef.set({
      paymentId: paymentSnapshot.id,
      bookingId,
      requestedByUserId: uid,
      requestedByRole: options.systemAllowed ? "system" : "patient",
      reasonCode: cleanText(data.reasonCode, 120) || "requested",
      amount: payment.grossAmount,
      currency: "PEN",
      status: "processing",
      idempotencyKey: `payment:refund:${paymentSnapshot.id}:${refundId}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    const refund = await this.provider.refundPayment({
      providerPaymentId: payment.providerPaymentId,
      sellerAccessToken,
      amount: payment.grossAmount,
      idempotencyKey: `payment:refund:${paymentSnapshot.id}:${refundId}`,
    });
    const refundApproved = refund.status === "approved";
    await this.db.runTransaction(async (transaction) => {
      const therapyRef = booking.terapiaId ?
        this.db.collection("terapias").doc(booking.terapiaId) : null;
      const [latestPayment, therapySnapshot] = await Promise.all([
        transaction.get(paymentSnapshot.ref),
        therapyRef ? transaction.get(therapyRef) : Promise.resolve(null),
      ]);
      if (latestPayment.data()?.status === "refunded") return;
      const now = FieldValue.serverTimestamp();
      const paymentStatus = refundApproved ? "refunded" : "refund_pending";
      transaction.update(paymentSnapshot.ref, {status: paymentStatus,
        refundedAt: refundApproved ? now : null,
        updatedAt: now});
      transaction.update(bookingSnapshot.ref, {
        status: refundApproved ? "refunded" : "refund_pending",
        paymentStatus,
        updatedAt: now});
      transaction.set(refundRef, {status: refundApproved ? "approved" : "processing",
        providerRefundId: refund.providerRefundId,
        processedAt: refundApproved ? now : null, updatedAt: now}, {merge: true});
      if (refundApproved) {
        this.writeRefundLedger(transaction, paymentSnapshot.id, booking, payment, now);
      }
      this.writeLegacyPaymentState(
          transaction,
          bookingId,
          therapyRef,
          therapySnapshot,
          "cancelada",
          paymentStatus,
          now,
      );
      if (refundApproved) {
        this.writeNotifications(transaction, bookingId, booking, "refunded", now);
      }
    });
    return {bookingId, refundId, status: refundApproved ? "refunded" : "refund_pending"};
  }

  async reconcilePayments() {
    if (!this.config.reconciliationEnabled) {
      return {disabled: true, checked: 0, processed: 0, manualReview: 0};
    }
    const snapshot = await this.db.collection("payments")
        .where("status", "in", ["pending", "processing", "provider_error"])
        .limit(100).get();
    let processed = 0;
    let manualReview = 0;
    for (const document of snapshot.docs) {
      const payment = document.data();
      if (!payment.providerPaymentId) continue;
      try {
        const accountSnapshot = await this.db.collection("payment_accounts")
            .doc(payment.psychologistId).get();
        const sellerAccessToken = await this.getSellerAccessToken(
            payment.psychologistId,
            accountSnapshot.data() || {},
        );
        const event = await this.provider.getPayment({
          providerPaymentId: payment.providerPaymentId,
          providerAccountId: payment.providerAccountId,
          sellerAccessToken,
          status: payment.status,
          grossAmount: payment.grossAmount,
          currency: payment.currency,
          externalReference: payment.externalReference,
        });
        await this.processPaymentProviderEvent(event);
        processed += 1;
      } catch (error) {
        manualReview += 1;
        logger.error("Payment reconciliation failed", paymentLog({
          paymentId: document.id,
          errorType: error.code || error.name,
        }));
      }
    }
    return {checked: snapshot.size, processed, manualReview};
  }

  commissionRuleSnapshot(rule = {}) {
    const snapshot = {
      ruleId: "default-marketplace-split",
      version: Number(rule.version || 1),
      platformPercentage: Number(
          rule.platformPercentage ?? this.config.platformCommissionPercentage,
      ),
      psychologistPercentage: Number(
          rule.psychologistPercentage ?? this.config.psychologistPercentage,
      ),
      processorFeeBearer: rule.processorFeeBearer ||
        this.config.processorFeeBearer,
    };
    calculatePaymentAllocation({
      grossAmount: 100,
      platformCommissionPercentage: snapshot.platformPercentage,
      psychologistPercentage: snapshot.psychologistPercentage,
      processorFeeBearer: snapshot.processorFeeBearer,
    });
    return snapshot;
  }

  async requireRole(uid, role) {
    if (!uid) throw new PaymentDomainError("AUTH_REQUIRED");
    const snapshot = await this.db.collection("users").doc(uid).get();
    const user = snapshot.data() || {};
    const roles = normalizeRoles(user);
    if (!roles.includes(role) && !roles.includes("admin")) {
      throw new PaymentDomainError("INVALID_ROLE");
    }
    return user;
  }

  async requirePsychologist(uid) {
    await this.requireRole(uid, "psychologist");
    const snapshot = await this.db.collection("therapists").where("uid", "==", uid)
        .limit(1).get();
    if (snapshot.empty) throw new PaymentDomainError("INVALID_ROLE");
    return {therapist: {id: snapshot.docs[0].id, ...snapshot.docs[0].data()}};
  }

  async isAdmin(uid) {
    if (!uid) return false;
    const snapshot = await this.db.collection("users").doc(uid).get();
    return normalizeRoles(snapshot.data() || {}).includes("admin");
  }

  async getSellerAccessToken(psychologistId, account) {
    if (account.isFake) return `fake-token-${psychologistId}`;
    const snapshot = await this.db.collection("payment_account_secrets")
        .doc(psychologistId).get();
    return decryptToken(
        snapshot.data()?.accessToken,
        this.config.mercadoPago.tokenEncryptionKey,
    );
  }

  writeLedger(transaction, paymentId, booking, allocation, now) {
    const entries = [
      ["cash_collected", "debit", allocation.grossAmount],
      ["psychologist_payable", "credit", allocation.psychologistNetAmount],
      ["platform_revenue", "credit", allocation.platformCommissionGrossAmount],
      ["processor_fee", "debit", allocation.processorFeeAmount],
    ];
    entries.filter(([, , amount]) => amount > 0).forEach(([account, direction, amount]) => {
      const id = hash(`ledger:${paymentId}:payment_approved:${account}`);
      transaction.create(this.db.collection("ledger_entries").doc(id), {
        paymentId,
        bookingId: booking.paymentId || paymentId,
        patientId: booking.patientId,
        psychologistId: booking.psychologistId,
        account,
        direction,
        amount,
        currency: "PEN",
        eventType: "payment_approved",
        idempotencyKey: `ledger:${paymentId}:payment_approved:${account}`,
        createdAt: now,
      });
    });
  }

  writeRefundLedger(transaction, paymentId, booking, payment, now) {
    const id = hash(`ledger:${paymentId}:payment_refunded:refund`);
    transaction.create(this.db.collection("ledger_entries").doc(id), {
      paymentId,
      bookingId: booking.paymentId || paymentId,
      patientId: booking.patientId,
      psychologistId: booking.psychologistId,
      account: "refund",
      direction: "debit",
      amount: payment.grossAmount,
      currency: "PEN",
      eventType: "payment_refunded",
      idempotencyKey: `ledger:${paymentId}:payment_refunded:refund`,
      createdAt: now,
    });
  }

  writeChargebackLedger(transaction, paymentId, booking, payment, now) {
    const id = hash(`ledger:${paymentId}:chargeback:chargeback`);
    transaction.create(this.db.collection("ledger_entries").doc(id), {
      paymentId,
      bookingId: booking.paymentId || paymentId,
      patientId: booking.patientId,
      psychologistId: booking.psychologistId,
      account: "chargeback",
      direction: "debit",
      amount: payment.grossAmount,
      currency: "PEN",
      eventType: "chargeback",
      idempotencyKey: `ledger:${paymentId}:chargeback:chargeback`,
      createdAt: now,
    });
  }

  writeLegacyAppointment(transaction, bookingId, booking, now) {
    transaction.set(this.db.collection("citas").doc(bookingId), {
      usuarioId: booking.patientId,
      pacienteUid: booking.patientId,
      terapeutaId: booking.psychologistId,
      terapeutaNombre: booking.psychologistName || "",
      terapiaId: booking.terapiaId || "",
      pacienteNombre: booking.patientName || "",
      pacienteEmail: booking.patientEmail || "",
      fecha: booking.date,
      hora: booking.startTime,
      modalidad: booking.modality === "virtual" ? "Remoto" : "Presencial",
      ubicacion: booking.location,
      notas: booking.notes || "",
      estado: "confirmada",
      availabilitySlotId: booking.slotId,
      bookingId,
      paymentId: bookingId,
      paymentStatus: "approved",
      createdAt: now,
      updatedAt: now,
    }, {merge: true});
  }

  writeTherapyProjection(transaction, therapyRef, therapySnapshot, bookingId,
      booking, profile, now) {
    const appointment = {
      citaId: bookingId,
      terapiaId: therapyRef.id,
      usuarioId: booking.patientId,
      terapeutaId: booking.psychologistId,
      fecha: booking.date,
      hora: booking.startTime,
      estado: "confirmada",
      notas: booking.notes || "",
      modalidad: booking.modality === "virtual" ? "Remoto" : "Presencial",
      ubicacion: booking.location || "",
      availabilitySlotId: booking.slotId,
      bookingId,
      paymentId: bookingId,
      paymentStatus: "approved",
    };
    if (therapySnapshot.exists) {
      transaction.update(therapyRef, {
        citas: FieldValue.arrayUnion(appointment),
        updatedAt: now,
      });
      return;
    }
    const intakeSnapshot = buildIntakeSnapshot(profile, now);
    transaction.create(therapyRef, {
      usuarioId: booking.patientId,
      pacienteUid: booking.patientId,
      pacienteNombre: booking.patientName || "Paciente",
      pacienteEmail: booking.patientEmail || "",
      terapeutaId: booking.psychologistId,
      terapeutaNombre: booking.psychologistName || "Psicólogo",
      modalidad: appointment.modalidad,
      estado: "activo",
      fechaCreacion: new Date().toISOString(),
      citas: [appointment],
      intakeSnapshot,
      ...buildInitialTherapyFields(intakeSnapshot),
      createdAt: now,
      updatedAt: now,
    });
  }

  writeLegacyPaymentState(transaction, bookingId, therapyRef, therapySnapshot,
      appointmentStatus, paymentStatus, now) {
    transaction.set(this.db.collection("citas").doc(bookingId), {
      estado: appointmentStatus,
      paymentStatus,
      updatedAt: now,
    }, {merge: true});
    if (!therapyRef || !therapySnapshot?.exists) return;
    const appointments = Array.isArray(therapySnapshot.data().citas) ?
      therapySnapshot.data().citas : [];
    transaction.update(therapyRef, {
      citas: appointments.map((appointment) =>
        appointment.citaId === bookingId ?
          {...appointment, estado: appointmentStatus, paymentStatus} : appointment,
      ),
      updatedAt: now,
    });
  }

  writeNotifications(transaction, bookingId, booking, event, now) {
    const recipients = [booking.patientId, booking.psychologistUid].filter(Boolean);
    recipients.forEach((recipientUid) => {
      const id = hash(`payment-notification:${bookingId}:${event}:${recipientUid}`);
      const message = event === "approved" ? "La cita y el pago fueron confirmados." :
        event === "rejected" ? "El pago no pudo procesarse. Puedes intentarlo nuevamente." :
          event === "expired" ? "La reserva temporal venció y el horario fue liberado." :
            event === "refunded" ? "El reembolso fue procesado." : "El estado del pago cambió.";
      transaction.set(this.db.collection("notifications").doc(id), {
        recipientUid,
        actorUid: "system",
        type: `payment_${event}`,
        title: "Actualización de tu cita",
        message,
        route: "/sesiones",
        readAt: null,
        metadata: {bookingId, paymentStatus: event},
        createdAt: now,
      }, {merge: false});
    });
  }
}

function assertConnectedAccount(account) {
  if (account.status === "restricted") {
    throw new PaymentDomainError("PAYMENT_ACCOUNT_RESTRICTED");
  }
  if (account.status !== "connected") {
    throw new PaymentDomainError("PAYMENT_ACCOUNT_NOT_CONNECTED");
  }
}

function validateProviderPayment(payment, event) {
  if (event.grossAmount !== payment.grossAmount) return "PAYMENT_AMOUNT_MISMATCH";
  if (event.currency !== payment.currency) return "PAYMENT_CURRENCY_MISMATCH";
  if (event.externalReference !== payment.externalReference) {
    return "PAYMENT_REFERENCE_MISMATCH";
  }
  if (payment.providerAccountId && event.providerAccountId &&
    payment.providerAccountId !== event.providerAccountId) {
    return "PAYMENT_REFERENCE_MISMATCH";
  }
  return "";
}

function isDuplicateTerminalState(currentStatus, incomingStatus) {
  return currentStatus === incomingStatus &&
    ["approved", "refunded", "charged_back"].includes(currentStatus);
}

function normalizeRoles(user) {
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  if (["paciente", "patient"].includes(user.rol)) roles.push("patient");
  if (["psicologo", "psychologist"].includes(user.rol)) roles.push("psychologist");
  if (["admin", "psicofound-admin"].includes(user.rol)) roles.push("admin");
  return [...new Set(roles.map((role) => role.toLowerCase()))];
}

function publicBooking(id, booking) {
  return {
    id,
    psychologistId: booking.psychologistId,
    psychologistName: booking.psychologistName || "Psicólogo",
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone: booking.timezone,
    modality: booking.modality,
    location: booking.location,
    currency: booking.currency,
    priceAmount: booking.priceAmount,
    holdExpiresAt: toIso(booking.holdExpiresAt),
  };
}

function slotTimestamp(date, time) {
  const value = new Date(`${date}T${time || "00:00"}:00-05:00`);
  if (Number.isNaN(value.getTime())) throw new PaymentDomainError("SLOT_NOT_AVAILABLE");
  return Timestamp.fromDate(value);
}

function normalizeModality(value) {
  const normalized = String(value || "").toLowerCase();
  return ["remoto", "online", "virtual"].includes(normalized) ? "virtual" : "in_person";
}

function normalizeInstallments(value) {
  const installments = Number(value || 1);
  return Number.isInteger(installments) && installments > 0 && installments <= 36 ?
    installments : 1;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function paymentLog(fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

module.exports = {MarketplacePaymentService, normalizeRoles, validateProviderPayment};

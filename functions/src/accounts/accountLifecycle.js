/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const {FieldValue, FieldPath} = firestoreAdmin;
const authAdmin = require("firebase-admin/auth");
const {HttpsError} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {rolesOf} = require("./adminHandlers");

function millis(value) {
  if (value == null) return 0;
  const result = value.toMillis ? value.toMillis() : Date.parse(value);
  return Number.isFinite(result) ? result : 0;
}

function inactivityCutoff(now = new Date()) {
  // Lima has no daylight saving time. Clamp month-end rather than overflow.
  const local = new Date(now.getTime() - 5 * 3600000);
  const first = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 3, 1,
      local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(local.getUTCDate(), lastDay));
  return first.getTime() + 5 * 3600000;
}

function latestActivity(user, authUser = {}) {
  return Math.max(millis(user.lastActivityAt), millis(user.createdAt),
      millis(authUser.metadata?.lastSignInTime),
      millis(authUser.metadata?.creationTime));
}

async function recordAccountActivity(uid) {
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}`);
    const user = (await tx.get(ref)).data();
    if (user && (!user.accountStatus || user.accountStatus === "active")) {
      tx.update(ref, {lastActivityAt: FieldValue.serverTimestamp(), inactivityReviewRequired: FieldValue.delete()});
    }
    return user;
  });
}

function writeSuspension(tx, db, uid, user, professionals, type) {
  const now = FieldValue.serverTimestamp();
  tx.update(db.doc(`users/${uid}`), {accountStatus: "suspended", suspensionType: type,
    suspendedAt: now, accountStatusUpdatedAt: now, accountStatusUpdatedBy: type === "voluntary" ? uid : "system:inactivity", updatedAt: now});
  for (const professional of professionals.docs) {
    const data = professional.data();
    const version = (data.adminVersion || 0) + 1;
    tx.update(professional.ref, {activo: false, adminVersion: version,
      accountSuspension: {previousActive: data.activo !== false, version},
      updatedAt: now, updatedBy: type === "voluntary" ? uid : "system:inactivity"});
  }
  tx.create(db.collection("admin_audit").doc(), {actorUid: type === "voluntary" ? uid : "system:inactivity",
    targetUid: uid, action: "account_suspended", previousStatus: user.accountStatus || "active",
    status: "suspended", suspensionType: type, createdAt: now});
}

function requireConfirmation(request, confirmation) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  if (request.data?.confirmation !== confirmation) throw new HttpsError("invalid-argument", `Escribe ${confirmation} para confirmar.`);
  return request.auth.uid;
}

async function suspendOwnAccount(request) {
  const uid = requireConfirmation(request, "SUSPENDER MI CUENTA");
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (tx) => {
    const user = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!user) throw new HttpsError("not-found", "No encontramos tu cuenta.");
    if (user.accountStatus === "suspended") return {status: "suspended"};
    if (rolesOf(user).includes("admin")) throw new HttpsError("failed-precondition", "Transfiere tus responsabilidades y retira el rol administrador antes de suspender tu cuenta.");
    if (user.accountStatus && user.accountStatus !== "active") throw new HttpsError("failed-precondition", "El estado actual requiere revisión de soporte.");
    const professionals = await tx.get(db.collection("therapists").where("uid", "==", uid));
    writeSuspension(tx, db, uid, user, professionals, "voluntary");
    return {status: "suspended"};
  });
}

async function reactivateOwnAccount(request) {
  const uid = requireConfirmation(request, "REACTIVAR MI CUENTA");
  const db = firestoreAdmin.getFirestore();
  return db.runTransaction(async (tx) => {
    const ref = db.doc(`users/${uid}`);
    const user = (await tx.get(ref)).data();
    if (!user) throw new HttpsError("not-found", "No encontramos tu cuenta.");
    if (!user.accountStatus || user.accountStatus === "active") return {status: "active"};
    if (user.accountStatus !== "suspended" || !["voluntary", "involuntary"].includes(user.suspensionType)) {
      throw new HttpsError("failed-precondition", "El estado actual requiere revisión de soporte.");
    }
    const professionals = await tx.get(db.collection("therapists").where("uid", "==", uid));
    const now = FieldValue.serverTimestamp();
    tx.update(ref, {accountStatus: "active", suspensionType: FieldValue.delete(),
      suspendedAt: FieldValue.delete(), inactivityReviewRequired: FieldValue.delete(), lastActivityAt: now, accountStatusUpdatedAt: now,
      accountStatusUpdatedBy: uid, updatedAt: now});
    for (const profile of professionals.docs) {
      const data = profile.data();
      // Never undo an administrative decision made after suspension.
      if (data.accountSuspension?.version === data.adminVersion) {
        tx.update(profile.ref, {activo: rolesOf(user).includes("psychologist") && data.accountSuspension.previousActive === true,
          accountSuspension: FieldValue.delete(), adminVersion: data.adminVersion + 1, updatedAt: now, updatedBy: uid});
      }
    }
    tx.create(db.collection("admin_audit").doc(), {actorUid: uid, targetUid: uid,
      action: "account_reactivated", previousSuspensionType: user.suspensionType, createdAt: now});
    return {status: "active"};
  });
}

async function recentMovements(db, uid, professionals, transaction) {
  const queries = [db.collection("payment_operations").where("patientUid", "==", uid),
    db.collection("citas").where("pacienteUid", "==", uid),
    db.collection("longitudinal_history").where("pacienteUid", "==", uid)];
  for (const profile of professionals.docs) {
    queries.push(db.collection("payment_operations").where("therapistId", "==", profile.id),
        db.collection("professional_transfers").where("therapistId", "==", profile.id),
        db.collection("citas").where("terapeutaId", "==", profile.id));
  }
  let latest = 0;
  for (const query of queries) {
    const result = await (transaction ? transaction.get(query) : query.get());
    for (const item of result.docs) {
      const data = item.data();
      latest = Math.max(latest, ...["createdAt", "updatedAt", "submittedAt", "reconciledAt"].map((key) => millis(data[key])));
    }
  }
  return latest;
}

async function suspendInactiveAccounts() {
  const db = firestoreAdmin.getFirestore();
  const cutoff = inactivityCutoff();
  const counts = {suspended: 0, skipped: 0, review: 0, errors: 0};
  let cursor;
  do {
    let query = db.collection("users").orderBy(FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const snapshot of page.docs) {
      const uid = snapshot.id;
      const user = snapshot.data();
      if (rolesOf(user).includes("admin") || user.accountStatus && user.accountStatus !== "active" || latestActivity(user) > cutoff) {
        counts.skipped++; continue;
      }
      try {
        const authUser = await authAdmin.getAuth().getUser(uid);
        const activity = latestActivity(user, authUser);
        if (!activity) {
          await snapshot.ref.update({inactivityReviewRequired: true});
          counts.review++; continue;
        }
        if (activity > cutoff) {
          counts.skipped++; continue;
        }
        const professionals = await db.collection("therapists").where("uid", "==", uid).get();
        const movement = await recentMovements(db, uid, professionals);
        if (movement > cutoff) {
          counts.skipped++; continue;
        }
        const status = await db.runTransaction(async (tx) => {
          const current = (await tx.get(snapshot.ref)).data();
          if (!current || rolesOf(current).includes("admin") || current.accountStatus && current.accountStatus !== "active" || latestActivity(current) > cutoff) return "skipped";
          const currentProfessionals = await tx.get(db.collection("therapists").where("uid", "==", uid));
          // Recheck movement queries in the same transaction so a concurrent
          // payment or appointment update cannot race the inactivity decision.
          if (await recentMovements(db, uid, currentProfessionals, tx) > cutoff) return "skipped";
          writeSuspension(tx, db, uid, current, currentProfessionals, "involuntary");
          return "suspended";
        });
        counts[status]++;
      } catch (error) {
        counts.errors++;
        logger.warn("inactivity account review failed", {code: typeof error.code === "string" ? error.code : "internal"});
      }
    }
    cursor = page.size === 200 ? page.docs.at(-1) : null;
  } while (cursor);
  logger.info("inactivity review completed", counts);
  return counts;
}

module.exports = {inactivityCutoff, latestActivity, recordAccountActivity,
  suspendOwnAccount, reactivateOwnAccount, suspendInactiveAccounts};

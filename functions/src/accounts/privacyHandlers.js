/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const authAdmin = require("firebase-admin/auth");
const {FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {createHash, randomUUID} = require("node:crypto");
const {inventoryAccount} = require("./dataInventory");
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fail = (message) => {
  throw new HttpsError("failed-precondition", message);
};

function privacyPolicy(env = process.env) {
  try {
    const p = JSON.parse(env.PRIVACY_POLICY_JSON || "null");
    if (!p || !/^[\w.-]{1,80}$/.test(p.version) || !p.approvalReference ||
        !["approved", "synthetic"].includes(p.status) || !["delete", "disable", "retain"].includes(p.authentication) ||
        p.storage !== "not_used_verified" || !p.categories || typeof p.categories !== "object") return null;
    if (p.status === "synthetic" && !(env.FUNCTIONS_EMULATOR === "true" && /^demo-/.test(env.GCLOUD_PROJECT || ""))) return null;
    for (const rule of Object.values(p.categories)) {
      if (!["delete", "redact", "retain"].includes(rule.action) || !rule.basis ||
          !Number.isInteger(rule.minimumAgeDays) || rule.minimumAgeDays < 0) return null;
      if (rule.action === "redact" && (!Array.isArray(rule.removeFields) || !rule.removeFields.length ||
          rule.removeFields.some((f) => typeof f !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(f)))) return null;
    }
    // The user's request and execution evidence remain available for follow-up.
    if (p.categories.account_requests?.action !== "retain") return null;
    return p;
  } catch (_) {
    return null;
  }
}

function requireOperator(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  if (request.auth.token?.privacyOperator !== true ||
      Date.now() / 1000 - Number(request.auth.token.auth_time || 0) > 300) {
    throw new HttpsError("permission-denied", "Requiere operador de privacidad y autenticación reciente.");
  }
}
function identifier(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Identificador inválido.");
  }
  return value;
}
function buildManifest(inventory, policy, now = Date.now()) {
  const blockers = [...inventory.unknown.map((p) => `unknown_subcollection:${p}`)];
  const items = inventory.records.map(({snapshot, category}) => {
    const rule = policy?.categories[category];
    if (!rule) blockers.push(`missing_policy:${category}`);
    const data = snapshot.data();
    const timestamp = data.updatedAt || data.createdAt;
    const millis = timestamp?.toMillis ? timestamp.toMillis() : Date.parse(timestamp);
    if (rule && rule.action !== "retain" && rule.minimumAgeDays > 0 &&
        (!Number.isFinite(millis) || now - millis < rule.minimumAgeDays * 86400000)) blockers.push(`retention:${snapshot.ref.path}`);
    return {path: snapshot.ref.path, category, version: snapshot.updateTime.toMillis(),
      updateTime: {seconds: snapshot.updateTime.seconds, nanoseconds: snapshot.updateTime.nanoseconds}, action: rule?.action || "pending_policy",
      removeFields: rule?.removeFields || []};
  });
  return {items, blockers: [...new Set(blockers)], fingerprint: digest(items)};
}
async function diagnoseAccountDeletion(request) {
  requireOperator(request);
  const uid = identifier(request.data?.uid);
  const db = firestoreAdmin.getFirestore();
  const consent = await db.doc(`account_requests/${uid}_deletion`).get();
  if (!consent.exists) fail("Primero debe existir una solicitud de eliminación del titular.");
  const policy = privacyPolicy();
  const manifest = buildManifest(await inventoryAccount(db, uid), policy);
  const user = (await db.doc(`users/${uid}`).get()).data() || {};
  if ([...(user.roles || []), user.rol, user.role].some((role) => ["admin", "psicofound-admin"].includes(role))) manifest.blockers.push("admin_role_must_be_removed");
  if (!policy) manifest.blockers.unshift("pending_policy");
  const ref = db.collection("privacy_jobs").doc();
  // Large manifests are separate documents; no sensitive record contents are copied.
  const batch = db.batch();
  batch.create(ref, {uid, policyVersion: policy?.version || null, policyHash: digest(policy),
    fingerprint: manifest.fingerprint, blockers: manifest.blockers, status: "diagnosed",
    count: manifest.items.length, cursor: 0, createdAt: FieldValue.serverTimestamp(), createdBy: request.auth.uid});
  await batch.commit();
  for (let start = 0; start < manifest.items.length; start += 200) {
    const chunk = db.batch();
    manifest.items.slice(start, start + 200).forEach((item, index) => chunk.set(ref.collection("items").doc(String(start + index).padStart(8, "0")), item));
    await chunk.commit();
  }
  await ref.update({manifestReady: true});
  return {jobId: ref.id, count: manifest.items.length, fingerprint: manifest.fingerprint,
    status: policy ? "diagnosed" : "pending_policy", blockers: manifest.blockers};
}
async function authorizeAccountDeletion(request) {
  requireOperator(request);
  const ref = firestoreAdmin.getFirestore().doc(`privacy_jobs/${identifier(request.data?.jobId)}`);
  const evidence = request.data?.authorizationReference;
  if (typeof evidence !== "string" || !evidence.trim() || evidence.length > 200) fail("Falta referencia de autorización revisable.");
  return firestoreAdmin.getFirestore().runTransaction(async (tx) => {
    const job = (await tx.get(ref)).data();
    if (!job?.manifestReady || job.blockers.length || job.fingerprint !== request.data.fingerprint ||
        job.policyHash !== digest(privacyPolicy())) fail("Repite el diagnóstico y resuelve sus dependencias.");
    if (job.status !== "diagnosed" && job.status !== "authorized") fail("La ejecución ya comenzó.");
    tx.update(ref, {status: "authorized", authorizedBy: request.auth.uid,
      authorizationReference: evidence.trim(), authorizedAt: FieldValue.serverTimestamp()});
    return {status: "authorized"};
  });
}
async function executeAccountDeletion(request) {
  requireOperator(request);
  const db = firestoreAdmin.getFirestore(); const ref = db.doc(`privacy_jobs/${identifier(request.data?.jobId)}`);
  const policy = privacyPolicy(); const lease = randomUUID();
  let job;
  await db.runTransaction(async (tx) => {
    const maintenance = (await tx.get(db.doc("runtime_controls/maintenance"))).data();
    job = (await tx.get(ref)).data();
    if (job?.status === "completed") return;
    if (maintenance?.enabled !== true || !maintenance.startedAt?.toMillis || Date.now() - maintenance.startedAt.toMillis() < 180000) fail("Requiere ventana de mantenimiento sin escrituras de la aplicación.");
    if (!job || !["authorized", "partial", "executing"].includes(job.status) || job.policyHash !== digest(policy)) fail("Falta autorización o cambió la política.");
    const targetUser = (await tx.get(db.doc(`users/${job.uid}`))).data() || {};
    if ([...(targetUser.roles || []), targetUser.rol, targetUser.role].some((role) => ["admin", "psicofound-admin"].includes(role))) fail("Retira primero el rol administrativo mediante el proceso que protege al último administrador.");
    if (job.leaseUntil > Date.now()) throw new HttpsError("aborted", "Ya existe una ejecución activa.");
    tx.update(ref, {status: "executing", lease, leaseUntil: Date.now() + 120000});
  });
  if (job.status === "completed") return {status: "completed"};
  try {
    if (job.cursor === 0) {
      const current = buildManifest(await inventoryAccount(db, job.uid), policy);
      if (current.fingerprint !== job.fingerprint) fail("Los datos cambiaron; crea un diagnóstico nuevo.");
    }
    if (policy.authentication !== "retain") {
      try {
        await authAdmin.getAuth().updateUser(job.uid, {disabled: true}); await authAdmin.getAuth().revokeRefreshTokens(job.uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
      }
    }
    const items = await ref.collection("items").orderBy("__name__").offset(job.cursor).limit(100).get();
    await db.runTransaction(async (tx) => {
      const active = (await tx.get(ref)).data();
      if (active.lease !== lease) throw new HttpsError("aborted", "La ejecución cambió.");
      const snapshots = await Promise.all(items.docs.map((item) => tx.get(db.doc(item.data().path))));
      for (let i = 0; i < items.size; i++) {
        const item = items.docs[i].data(); const current = snapshots[i];
        if (item.action === "retain") continue;
        if (!current.exists || (current.updateTime.seconds !== item.updateTime.seconds || current.updateTime.nanoseconds !== item.updateTime.nanoseconds)) fail("Un registro cambió; la ejecución parcial requiere un diagnóstico nuevo.");
      }
      // Retained request blocks existing ID tokens even after maintenance ends.
      tx.update(db.doc(`account_requests/${job.uid}_deletion`), {accessBlocked: true});
      items.docs.forEach((entry, i) => {
        const item = entry.data();
        if (item.action === "delete") tx.delete(snapshots[i].ref);
        if (item.action === "redact") tx.update(snapshots[i].ref, Object.fromEntries(item.removeFields.map((f) => [f, FieldValue.delete()])));
      });
      tx.update(ref, {cursor: job.cursor + items.size, leaseUntil: Date.now() + 120000, status: "executing", updatedAt: FieldValue.serverTimestamp()});
    });
    const cursor = job.cursor + items.size;
    if (cursor < job.count) {
      await ref.update({status: "partial", leaseUntil: 0});
      return {status: "partial", processed: cursor, total: job.count};
    }
    if (policy.authentication === "delete") {
      try {
        await authAdmin.getAuth().deleteUser(job.uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
      }
    }
    const completion = db.batch();
    completion.update(ref, {status: "completed", completedAt: FieldValue.serverTimestamp(), leaseUntil: 0});
    completion.update(db.doc(`account_requests/${job.uid}_deletion`), {status: "completed_under_policy", policyVersion: policy.version,
      jobId: ref.id, retainedRecords: true, updatedAt: FieldValue.serverTimestamp()});
    await completion.commit();
    return {status: "completed", policyVersion: policy.version};
  } catch (error) {
    await ref.update({status: "partial", leaseUntil: 0, lastFailure: "execution_incomplete", updatedAt: FieldValue.serverTimestamp()});
    throw new HttpsError("failed-precondition", "Operación parcial. Revisa el diagnóstico antes de continuar.");
  }
}
module.exports = {privacyPolicy, buildManifest, diagnoseAccountDeletion, authorizeAccountDeletion, executeAccountDeletion};

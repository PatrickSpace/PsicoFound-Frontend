/* eslint-disable max-len */
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireDocumentId} = require("../payments/paymentRates");

function rolesOf(user = {}) {
  const aliases = {"paciente": "patient", "psicologo": "psychologist", "psicólogo": "psychologist", "psicóloga": "psychologist", "psicofound-admin": "admin"};
  return [...new Set([...(Array.isArray(user.roles) ? user.roles : []), user.rol, user.role].filter(Boolean).map((role) => aliases[role] || role))];
}
async function requireAdmin(transaction, db, auth) {
  if (!auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const user = (await transaction.get(db.doc(`users/${auth.uid}`))).data();
  if (!rolesOf(user).includes("admin")) throw new HttpsError("permission-denied", "Necesitas permisos de administrador vigentes.");
  return user;
}
function text(value, max, required = false) {
  if (typeof value !== "string" || value.trim().length > max || required && !value.trim()) throw new HttpsError("invalid-argument", "Revisa los datos ingresados.");
  return value.trim();
}
function checkVersion(current, expected) {
  if (!Number.isSafeInteger(expected) || expected !== (current.adminVersion || 0)) throw new HttpsError("aborted", "El registro cambió. Actualiza y revisa antes de guardar.");
}
function audit(transaction, db, actorUid, targetUid, action, details) {
  transaction.create(db.collection("admin_audit").doc(), {actorUid, targetUid, action, ...details, createdAt: FieldValue.serverTimestamp()});
}
async function updateUserByAdmin(request) {
  const db = getFirestore(); const data = request.data || {};
  const uid = requireDocumentId(data.uid);
  // Identity is created exclusively by the existing Auth registration flow.
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  try {
    await getAuth().getUser(uid);
  } catch {
    throw new HttpsError("failed-precondition", "La cuenta no existe en Authentication. Usa el registro de cuentas.");
  }
  if (Object.keys(data).some((key) => !["uid", "nombre", "telefono", "roles", "expectedVersion"].includes(key))) throw new HttpsError("invalid-argument", "Correo, nacimiento y habilitación profesional se gestionan en sus procesos específicos.");
  const nombre = text(data.nombre, 120, true); const telefono = text(data.telefono, 40);
  if (!Array.isArray(data.roles) || !data.roles.length || data.roles.some((role) => !["patient", "psychologist", "admin"].includes(role))) throw new HttpsError("invalid-argument", "Roles inválidos.");
  const roles = [...new Set(data.roles)].sort();
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const ref = db.doc(`users/${uid}`); const user = (await tx.get(ref)).data();
    if (!user) throw new HttpsError("not-found", "Usa el registro para preparar el perfil de la cuenta.");
    checkVersion(user, data.expectedVersion);
    const previousRoles = rolesOf(user);
    if (roles.includes("psychologist") !== previousRoles.includes("psychologist")) throw new HttpsError("failed-precondition", "La habilitación profesional requiere solicitud aprobada; usa el directorio para activar o desactivar.");
    // All administrative role edits serialize here, including legacy role-only accounts.
    const lock = db.doc("runtime_controls/admin_membership");
    await tx.get(lock);
    const users = await tx.get(db.collection("users"));
    if (previousRoles.includes("admin") && !roles.includes("admin")) {
      const candidates = users.docs.filter((item) => item.id !== uid && rolesOf(item.data()).includes("admin") &&
        (!item.data().accountStatus || item.data().accountStatus === "active"));
      const available = await Promise.all(candidates.map(async (item) => {
        try {
          return !(await getAuth().getUser(item.id)).disabled;
        } catch (error) {
          if (error.code === "auth/user-not-found") return false;
          throw error;
        }
      }));
      if (!available.some(Boolean)) throw new HttpsError("failed-precondition", "Debe conservarse al menos un administrador con cuenta habilitada en Authentication.");
    }
    const version = (user.adminVersion || 0) + 1;
    tx.update(ref, {nombre, telefono, roles, rol: roles.includes("admin") ? "admin" : roles.includes("psychologist") ? "psicologo" : "patient", role: FieldValue.delete(), adminVersion: version, updatedAt: FieldValue.serverTimestamp()});
    tx.set(lock, {updatedAt: FieldValue.serverTimestamp()});
    audit(tx, db, request.auth.uid, uid, "user_updated", {fields: ["nombre", "telefono", "roles"].filter((field) => JSON.stringify(user[field]) !== JSON.stringify({nombre, telefono, roles}[field])), previousRoles, roles, version});
    return {uid, version};
  });
}
async function updateProfessionalByAdmin(request) {
  const db = getFirestore(); const data = request.data || {};
  const id = requireDocumentId(data.id);
  const allowed = ["nombre", "description", "direccion", "especialidades", "enfoques", "modalidades", "activo"];
  if (!data.profile || Object.keys(data.profile).some((key) => !allowed.includes(key))) throw new HttpsError("invalid-argument", "No se puede cambiar la identidad ni tarifa desde el directorio.");
  const profile = {};
  for (const field of ["nombre", "description", "direccion"]) profile[field] = text(data.profile[field], field === "description" ? 1200 : 180, field === "nombre");
  for (const field of ["especialidades", "enfoques", "modalidades"]) {
    if (!Array.isArray(data.profile[field]) || !data.profile[field].length || data.profile[field].length > 12) throw new HttpsError("invalid-argument", "Completa las especialidades, enfoques y modalidades.");
    profile[field] = [...new Set(data.profile[field].map((item) => text(item, 80, true)))];
  }
  if (typeof data.profile.activo !== "boolean") throw new HttpsError("invalid-argument", "Indica el estado profesional.");
  profile.activo = data.profile.activo;
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const ref = db.doc(`therapists/${id}`); const current = (await tx.get(ref)).data();
    if (!current) throw new HttpsError("not-found", "Perfil inexistente.");
    const user = (await tx.get(db.doc(`users/${current.uid}`))).data();
    if (!rolesOf(user).includes("psychologist")) throw new HttpsError("failed-precondition", "La cuenta requiere habilitación profesional coherente.");
    checkVersion(current, data.expectedVersion);
    const version = (current.adminVersion || 0) + 1;
    tx.update(ref, {...profile, adminVersion: version, updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth.uid});
    audit(tx, db, request.auth.uid, current.uid, "professional_updated", {therapistId: id, fields: allowed.filter((key) => JSON.stringify(current[key]) !== JSON.stringify(profile[key])), active: profile.activo, version});
    return {id, version};
  });
}
async function getPaymentOperationContext(request) {
  const db = getFirestore(); const operationId = requireDocumentId(request.data?.operationId);
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const operation = (await tx.get(db.doc(`payment_operations/${operationId}`))).data();
    if (!operation?.appointmentId) throw new HttpsError("failed-precondition", "Falta la cita de la operación.");
    const appointment = (await tx.get(db.doc(`citas/${requireDocumentId(operation.appointmentId)}`))).data();
    if (!appointment || appointment.pacienteUid !== operation.patientUid || appointment.terapeutaId !== operation.therapistId) throw new HttpsError("failed-precondition", "Revisa la consistencia de la cita y sus participantes.");
    const {resolveSchedule} = require("../appointments/schedulePolicy.mjs");
    const schedule = resolveSchedule(appointment);
    return {id: operation.appointmentId, status: appointment.estado,
      startAtIso: schedule.start?.toISOString() || null, scheduleStatus: schedule.status,
      paymentStatus: operation.status};
  });
}
// Ordinary operators see an operational projection, never privacy manifests or clinical records.
async function getAdministrativeAccountRequests(request) {
  const db = getFirestore();
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  const requests = await db.collection("account_requests").get();
  const jobs = await db.collection("privacy_jobs").get();
  const items = requests.docs.map((doc) => {
    const data = doc.data();
    const related = jobs.docs.filter((job) => job.data().uid === data.requesterUid)
        .map((job) => {
          const value = job.data();
          return {id: job.id, status: value.status, count: value.count || 0, processed: value.cursor || 0,
            blockers: [...new Set((value.blockers || []).map((reason) => reason.startsWith("missing_policy:") ? reason : reason.split(":")[0]))],
            updatedAt: (value.updatedAt || value.createdAt)?.toDate?.().toISOString() || null};
        });
    return {id: doc.id, requesterUid: data.requesterUid, status: data.status,
      createdAt: data.createdAt?.toDate?.().toISOString() || null,
      policyVersion: data.policyVersion || null, jobs: related};
  });
  // Recheck after the potentially slow query, so revocation also affects read responses.
  await db.runTransaction((tx) => requireAdmin(tx, db, request.auth));
  return {items};
}
module.exports = {rolesOf, updateUserByAdmin, updateProfessionalByAdmin, getAdministrativeAccountRequests, getPaymentOperationContext, requireAdmin, audit};

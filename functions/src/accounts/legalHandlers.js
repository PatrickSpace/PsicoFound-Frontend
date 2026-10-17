/* eslint-disable max-len */
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {requireAdmin, audit} = require("./adminHandlers");
const {legalPolicy} = require("./accessPolicy");

function clean(value, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpsError("invalid-argument", "Completa los campos y respeta su longitud máxima.");
  }
  return value.trim();
}
function legalDraft(data, publishing = false) {
  const version = clean(data.version, 80);
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(version) || version === "current") throw new HttpsError("invalid-argument", "La versión solo admite letras, números, puntos, guiones y guiones bajos.");
  const content = (value) => {
    if (!publishing && typeof value === "string" && !value.trim()) return "";
    return clean(value, 100000);
  };
  return {version, termsText: content(data.termsText), privacyText: content(data.privacyText)};
}
function checkRevision(draft, expectedRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (draft?.revision || 0)) {
    throw new HttpsError("aborted", "El borrador cambió. Actualiza y revisa antes de continuar.");
  }
  if (draft?.publishedVersion) throw new HttpsError("failed-precondition", "Esta versión está publicada. Crea otro borrador.");
}
async function saveLegalDraft(request) {
  const data = request.data || {};
  const id = clean(data.id, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new HttpsError("invalid-argument", "Identificador de borrador inválido.");
  const value = legalDraft(data);
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const ref = db.doc(`legal_drafts/${id}`);
    const current = (await tx.get(ref)).data();
    checkRevision(current, data.expectedRevision);
    const revision = (current?.revision || 0) + 1;
    tx.set(ref, {...value, revision, updatedBy: request.auth.uid, updatedAt: FieldValue.serverTimestamp()}, {merge: true});
    audit(tx, db, request.auth.uid, id, "legal_draft_saved", {version: value.version, revision});
    return {id, revision};
  });
}
async function publishLegalDraft(request) {
  const data = request.data || {};
  const id = clean(data.id, 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new HttpsError("invalid-argument", "Identificador de borrador inválido.");
  if (data.confirmReviewed !== true) throw new HttpsError("failed-precondition", "Confirma la revisión de ambos documentos antes de publicar.");
  const approvalReference = clean(data.approvalReference, 500);
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    await requireAdmin(tx, db, request.auth);
    const ref = db.doc(`legal_drafts/${id}`);
    const draft = (await tx.get(ref)).data();
    if (!draft) throw new HttpsError("not-found", "No existe el borrador.");
    const currentRef = db.doc("legal_settings/current");
    const current = (await tx.get(currentRef)).data();
    // A retry after a successful commit must not publish a second version.
    if (draft.publishedVersion && current?.version === draft.publishedVersion) return {version: draft.publishedVersion};
    checkRevision(draft, data.expectedRevision);
    if ((current?.version || legalPolicy()?.version || "") !== data.expectedCurrentVersion) throw new HttpsError("aborted", "La versión vigente cambió. Actualiza antes de publicar.");
    const value = legalDraft(draft, true);
    const releaseRef = db.doc(`legal_releases/${value.version}`);
    if ((await tx.get(releaseRef)).exists) throw new HttpsError("already-exists", "La versión ya existe. Usa un identificador nuevo.");
    const origin = "https://app.lurems.lat";
    const policy = {version: value.version, termsUrl: `${origin}/terminos?version=${encodeURIComponent(value.version)}`, privacyUrl: `${origin}/privacidad?version=${encodeURIComponent(value.version)}`};
    if (!legalPolicy({LEGAL_DOCUMENT_VERSION: policy.version, LEGAL_TERMS_URL: policy.termsUrl, LEGAL_PRIVACY_URL: policy.privacyUrl})) throw new HttpsError("failed-precondition", "La configuración legal es inválida.");
    const publishedAt = FieldValue.serverTimestamp();
    tx.create(releaseRef, {...value, publishedAt});
    tx.set(currentRef, {...policy, publishedAt});
    tx.update(ref, {publishedVersion: value.version, approvalReference, publishedBy: request.auth.uid, publishedAt});
    audit(tx, db, request.auth.uid, id, "legal_version_published", {version: value.version, previousVersion: current?.version || "", approvalReference});
    return {version: value.version};
  });
}
module.exports = {saveLegalDraft, publishLegalDraft, legalDraft, checkRevision};

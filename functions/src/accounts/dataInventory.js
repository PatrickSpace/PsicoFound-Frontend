/* eslint-disable max-len */
// Every path is derived from authenticated ownership, never from client input.
const OWNED_QUERIES = Object.freeze({
  terapias: "pacienteUid", citas: "pacienteUid", therapy_goals: "pacienteUid",
  exercises: "pacienteUid", emotional_checkins: "pacienteUid", longitudinal_history: "pacienteUid",
  notifications: "recipientUid", feedback: "userId", feddback: "userId",
  support_requests: "requesterUid", payment_operations: "patientUid", account_requests: "requesterUid",
  psychologist_requests: "userUid", therapists: "uid", profile_chat_operations: "uid",
  admin_audit: "targetUid", appointment_operations: "actorUid", professional_obligations: "patientUid",
});
const SUBCOLLECTIONS = {users: ["consents"], conversations: ["messages"],
  therapy_goals: ["progress"], therapists: ["rate_history"]};

async function inventoryAccount(db, uid) {
  const records = new Map();
  const unknown = [];
  async function include(snapshot, category) {
    if (snapshot.exists) records.set(snapshot.ref.path, {snapshot, category});
    const children = await snapshot.ref.listCollections();
    for (const collection of children) {
      if (!(SUBCOLLECTIONS[category.replace("professional_shared/", "")] || []).includes(collection.id)) {
        unknown.push(collection.path);
        continue;
      }
      const docs = await collection.get();
      for (const child of docs.docs) await include(child, `${category}/${collection.id}`);
    }
  }
  for (const category of ["users", "profiles", "conversations", "profile_chat_quotas"]) {
    await include(await db.doc(`${category}/${uid}`).get(), category);
  }
  for (const [category, field] of Object.entries(OWNED_QUERIES)) {
    const docs = await db.collection(category).where(field, "==", uid).get();
    for (const doc of docs.docs) await include(doc, category);
  }
  // Records shared as a professional need an explicit retention decision too.
  const professionals = [...records.values()].filter((r) => r.category === "therapists");
  for (const {snapshot} of professionals) {
    for (const category of ["terapias", "citas", "therapy_goals", "exercises", "emotional_checkins", "longitudinal_history", "payment_operations", "professional_obligations", "professional_transfers", "therapist_availability"]) {
      const field = ["therapist_availability", "payment_operations", "professional_obligations", "professional_transfers"].includes(category) ? "therapistId" : "terapeutaId";
      const docs = await db.collection(category).where(field, "==", snapshot.id).get();
      for (const doc of docs.docs) {
        if (!records.has(doc.ref.path)) await include(doc, `professional_shared/${category}`);
      }
    }
  }
  // Resolve ledger links only after both patient and professional ownership are known.
  for (const {snapshot, category: paymentCategory} of [...records.values()].filter((record) =>
    ["payment_operations", "professional_shared/payment_operations"].includes(record.category))) {
    const prefix = paymentCategory.startsWith("professional_shared/") ? "professional_shared/" : "";
    for (const category of ["payment_receipts", "professional_transfers", "payment_audit"]) {
      const docs = await db.collection(category).where("operationId", "==", snapshot.id).get();
      for (const doc of docs.docs) {
        if (!records.has(doc.ref.path)) await include(doc, `${prefix}${category}`);
      }
    }
  }
  // Operator attribution also belongs in the inventory. These shared records
  // require their own policy; deleting an operator must not erase another
  // person's financial or administrative evidence by implicit ownership.
  for (const [category, field] of [["admin_audit", "actorUid"], ["payment_audit", "actorUid"], ["professional_transfers", "recordedBy"]]) {
    const docs = await db.collection(category).where(field, "==", uid).get();
    for (const doc of docs.docs) {
      if (!records.has(doc.ref.path)) await include(doc, `administrative_shared/${category}`);
    }
  }
  return {records: [...records.values()].sort((a, b) => a.snapshot.ref.path.localeCompare(b.snapshot.ref.path)), unknown};
}
module.exports = {inventoryAccount};

import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

const functions = getFunctions(
  app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);
const saveRateCallable = httpsCallable(functions, "savePaymentRate");
const selectRateCallable = httpsCallable(functions, "setPsychologistPaymentRate");
const quoteCallable = httpsCallable(functions, "getBookingQuote");
const submittedCallable = httpsCallable(functions, "markPaymentSubmitted");
const refundCallable = httpsCallable(functions, "requestPaymentRefundReview");

export function newPaymentRateId() {
  return doc(collection(db, "payment_rates")).id;
}

export function watchPaymentRates(onData, onError) {
  return onSnapshot(collection(db, "payment_rates"), (snapshot) => {
    const rates = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    onData(rates.sort((a, b) => a.amountMinor - b.amountMinor || a.name.localeCompare(b.name)));
  }, onError);
}

export function watchTherapistRate(therapistId, onData, onError) {
  return onSnapshot(doc(db, "therapists", therapistId), (snapshot) => {
    onData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
}

export async function savePaymentRate(data) {
  const result = await saveRateCallable(data);
  return result.data;
}

export async function setPsychologistPaymentRate(data) {
  const result = await selectRateCallable(data);
  return result.data;
}

export async function getPaymentRateHistory(rateId) {
  const snapshot = await getDocs(query(
    collection(db, "payment_rates", rateId, "versions"),
    orderBy("version", "desc"),
    limit(20)
  ));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getBookingQuote(therapistId, availabilitySlotId = "") {
  const response = await quoteCallable({ therapistId, availabilitySlotId });
  return response.data;
}

export async function markPaymentSubmitted(operationId) {
  const response = await submittedCallable({ operationId });
  return response.data;
}

export async function requestPaymentRefundReview(operationId, reason) {
  const response = await refundCallable({ operationId, reason });
  return response.data;
}

export function watchPatientPaymentOperations(uid, onData, onError) {
  if (!uid) return () => {};
  const paymentQuery = query(
    collection(db, "payment_operations"),
    where("patientUid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(paymentQuery, (snapshot) => {
    onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }, onError);
}

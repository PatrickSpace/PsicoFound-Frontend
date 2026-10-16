import {
  collection,
  doc,
  getDocs,
  query,
  where,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { createOperationId } from "@/services/citaService";
import { useAppContextStore } from "@/store/appContext";

import { agendaPresentation } from "@/utils/dateTime";

function presentTherapy(data) {
  return {...data, citas: (data.citas || []).map(agendaPresentation)};
}

const THERAPIES_COLLECTION = "terapias";
const ACTIVE_THERAPY_STATUS = "activo";
const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);

export async function getTherapyById(terapiaId) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);
  const snapshot = await getDoc(therapyRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...presentTherapy(snapshot.data()),
  };
}

export async function getTherapiesByPatient(pacienteUid) {
  if (!pacienteUid) {
    return [];
  }

  const therapiesRef = collection(db, THERAPIES_COLLECTION);
  const therapiesQuery = query(
    therapiesRef,
    where("pacienteUid", "==", pacienteUid)
  );

  const snapshot = await getDocs(therapiesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...presentTherapy(item.data()),
  }));
}

export function watchTherapiesByPatient(pacienteUid, onData, onError) {
  if (!pacienteUid) {
    onData([]);
    return () => {};
  }

  const therapiesQuery = query(
    collection(db, THERAPIES_COLLECTION),
    where("pacienteUid", "==", pacienteUid)
  );
  return onSnapshot(
    therapiesQuery,
    (snapshot) => onData(snapshot.docs.map((item) => ({
      id: item.id,
      ...presentTherapy(item.data()),
    }))),
    onError
  );
}

export async function getTherapiesByTherapist(terapeutaId) {
  if (!terapeutaId) {
    return [];
  }

  const therapiesRef = collection(db, THERAPIES_COLLECTION);
  const therapiesQuery = query(
    therapiesRef,
    where("terapeutaId", "==", terapeutaId)
  );

  const snapshot = await getDocs(therapiesQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...presentTherapy(item.data()),
  }));
}

export async function getActiveTherapyByPatient(pacienteUid) {
  const therapies = await getTherapiesByPatient(pacienteUid);

  return (
    therapies.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() ===
        ACTIVE_THERAPY_STATUS
    ) || null
  );
}

export async function getTherapyByIdForPatient(terapiaId, pacienteUid) {
  if (!terapiaId || !pacienteUid) {
    return null;
  }

  const therapy = await getTherapyById(terapiaId);

  if (!therapy || therapy.pacienteUid !== pacienteUid) {
    return null;
  }

  return therapy;
}

export async function updateTherapyStatus(
  terapiaId,
  estado,
  { reason = "", requestId = "" } = {}
) {
  if (!terapiaId || !estado) {
    throw new Error("Missing terapiaId or estado");
  }

  const response = await httpsCallable(functions, "changeTherapyStatus")({
    therapyId: terapiaId,
    status: estado,
    reason,
    requestId: requestId || createOperationId("therapy_status"),
    mode: useAppContextStore().activeMode || "patient",
  });
  return response.data;
}

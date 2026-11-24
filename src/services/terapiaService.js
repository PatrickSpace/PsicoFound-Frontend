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

import { attachAppointments } from '@/services/appointmentRepository';
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
    ...presentTherapy((await attachAppointments([{id: snapshot.id, ...snapshot.data()}]))[0]),
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

  const therapies = await attachAppointments(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  return therapies.map(therapy => ({ ...therapy, ...presentTherapy(therapy) }));
}

export function watchTherapiesByPatient(pacienteUid, onData, onError) {
  if (!pacienteUid) { onData([]); return () => {}; }
  let active = true, generation = 0;
  let therapies = null, appointments = null;
  async function emit() {
    if (!active || !therapies || !appointments) return;
    const current = ++generation;
    const merged = await attachAppointments(therapies, appointments);
    if (active && current === generation) {
      onData(merged.map(therapy => ({ ...therapy, ...presentTherapy(therapy) })));
    }
  }
  const stops = [
    onSnapshot(query(collection(db, THERAPIES_COLLECTION), where('pacienteUid', '==', pacienteUid)), snapshot => {
      therapies = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      emit();
    }, onError),
    onSnapshot(query(collection(db, 'citas'), where('pacienteUid', '==', pacienteUid)), snapshot => {
      appointments = snapshot.docs.map(item => ({ ...item.data(), citaId: item.id }));
      emit();
    }, onError),
  ];
  return () => { active = false; stops.forEach(stop => stop()); };
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

  const therapies = await attachAppointments(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  return therapies.map(therapy => ({ ...therapy, ...presentTherapy(therapy) }));
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

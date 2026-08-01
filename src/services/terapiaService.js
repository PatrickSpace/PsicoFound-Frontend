import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { readDocument, readQuery, trackWrite } from "@/repositories/firestoreRepository";
import {
  CACHE_TTL,
  getOrFetch,
  invalidateCachePrefix,
} from "@/utils/requestCache";

const THERAPIES_COLLECTION = "terapias";
const ACTIVE_THERAPY_STATUS = "activo";

export async function createTherapy(data = {}) {
  if (data.pacienteUid) {
    const activeTherapy = await getActiveTherapyByPatient(data.pacienteUid);

    if (activeTherapy) {
      throw new Error(
        "Ya tienes una terapia activa. Debes pausarla o cancelarla antes de crear una nueva."
      );
    }
  }

  const therapiesRef = collection(db, THERAPIES_COLLECTION);
  const payload = {
    usuarioId: data.usuarioId || data.pacienteUid || "demo-user",
    pacienteUid: data.pacienteUid || "demo-user",
    pacienteNombre: data.pacienteNombre || "Usuario demo",
    pacienteEmail: data.pacienteEmail || "",
    terapeutaId: data.terapeutaId || "",
    terapeutaNombre: data.terapeutaNombre || "",
    modalidad: data.modalidad || "",
    estado: data.estado || "activo",
    fechaCreacion: data.fechaCreacion || new Date().toISOString(),
    citas: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: THERAPIES_COLLECTION,
    source: "createTherapy",
    operation: "addDoc",
    write: () => addDoc(therapiesRef, payload),
  });
  invalidateTherapyCaches();

  return {
    id: docRef.id,
    ...payload,
  };
}

export async function appendAppointmentToTherapy(terapiaId, appointmentSummary) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await trackWrite({
    resource: THERAPIES_COLLECTION,
    source: "appendAppointmentToTherapy",
    operation: "updateDoc",
    write: () => updateDoc(therapyRef, {
      citas: arrayUnion(appointmentSummary),
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateTherapyCaches();
}

export async function replaceTherapyAppointments(terapiaId, citas = []) {
  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await trackWrite({
    resource: THERAPIES_COLLECTION,
    source: "replaceTherapyAppointments",
    operation: "updateDoc",
    write: () => updateDoc(therapyRef, {
      citas,
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateTherapyCaches();
}

export async function getTherapyById(terapiaId, options = {}) {
  if (!terapiaId) return null;

  return getOrFetch({
    key: `therapy:id:${terapiaId}`,
    ttl: CACHE_TTL.THERAPY,
    force: options.force,
    resource: THERAPIES_COLLECTION,
    source: "getTherapyById",
    fetcher: async () => {
      const snapshot = await readDocument(
        doc(db, THERAPIES_COLLECTION, terapiaId),
        { resource: THERAPIES_COLLECTION, source: "getTherapyById" }
      );
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },
  });
}

export async function getTherapiesByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) {
    return [];
  }

  return getOrFetch({
    key: `therapies:patient:${pacienteUid}`,
    ttl: CACHE_TTL.THERAPY,
    force: options.force,
    resource: THERAPIES_COLLECTION,
    source: "getTherapiesByPatient",
    fetcher: async () => {
      const therapiesQuery = query(
        collection(db, THERAPIES_COLLECTION),
        where("pacienteUid", "==", pacienteUid)
      );
      const snapshot = await readQuery(therapiesQuery, {
        resource: THERAPIES_COLLECTION,
        source: "getTherapiesByPatient",
      });
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  });
}

export async function getTherapiesByPatients(patientUids = [], options = {}) {
  const uniqueIds = [...new Set(patientUids.filter(Boolean))].sort();

  if (!uniqueIds.length) return new Map();

  return getOrFetch({
    key: `therapies:patients:${uniqueIds.join(",")}`,
    ttl: CACHE_TTL.ADMIN_LIST,
    force: options.force,
    resource: THERAPIES_COLLECTION,
    source: "getTherapiesByPatients",
    fetcher: async () => {
      const snapshots = await Promise.all(
        chunk(uniqueIds, 30).map((uids) =>
          readQuery(
            query(
              collection(db, THERAPIES_COLLECTION),
              where("pacienteUid", "in", uids)
            ),
            {
              resource: THERAPIES_COLLECTION,
              source: "getTherapiesByPatients",
            }
          )
        )
      );
      const byPatient = new Map(uniqueIds.map((uid) => [uid, []]));

      snapshots
        .flatMap((snapshot) => snapshot.docs)
        .forEach((item) => {
          const therapy = { id: item.id, ...item.data() };
          const patientUid = therapy.pacienteUid;
          if (byPatient.has(patientUid)) {
            byPatient.get(patientUid).push(therapy);
          }
        });

      return byPatient;
    },
  });
}

export async function getTherapiesByTherapist(terapeutaId, options = {}) {
  if (!terapeutaId) {
    return [];
  }

  return getOrFetch({
    key: `therapies:therapist:${terapeutaId}`,
    ttl: CACHE_TTL.THERAPY,
    force: options.force,
    resource: THERAPIES_COLLECTION,
    source: "getTherapiesByTherapist",
    fetcher: async () => {
      const therapiesQuery = query(
        collection(db, THERAPIES_COLLECTION),
        where("terapeutaId", "==", terapeutaId)
      );
      const snapshot = await readQuery(therapiesQuery, {
        resource: THERAPIES_COLLECTION,
        source: "getTherapiesByTherapist",
      });
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    },
  });
}

export async function getActiveTherapyByPatient(pacienteUid, options = {}) {
  if (!pacienteUid) return null;

  return getOrFetch({
    key: `therapy:active:${pacienteUid}`,
    ttl: CACHE_TTL.THERAPY,
    force: options.force,
    resource: THERAPIES_COLLECTION,
    source: "getActiveTherapyByPatient",
    fetcher: async () => {
      const activeTherapyQuery = query(
        collection(db, THERAPIES_COLLECTION),
        where("pacienteUid", "==", pacienteUid),
        where("estado", "==", ACTIVE_THERAPY_STATUS),
        limit(1)
      );
      const snapshot = await readQuery(activeTherapyQuery, {
        resource: THERAPIES_COLLECTION,
        source: "getActiveTherapyByPatient",
      });
      const item = snapshot.docs[0];
      return item ? { id: item.id, ...item.data() } : null;
    },
  });
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

export async function updateTherapyStatus(terapiaId, estado) {
  if (!terapiaId || !estado) {
    throw new Error("Missing terapiaId or estado");
  }

  const currentTherapy = await getTherapyById(terapiaId);

  if (!currentTherapy) {
    throw new Error("No se encontro la terapia a actualizar.");
  }

  const normalizedStatus = estado.toString().trim().toLowerCase();

  if (normalizedStatus === ACTIVE_THERAPY_STATUS) {
    const activeTherapy = await getActiveTherapyByPatient(currentTherapy.pacienteUid);

    if (activeTherapy && activeTherapy.id !== terapiaId) {
      throw new Error(
        "Ya tienes otra terapia activa. Debes pausarla o cancelarla antes de reactivar esta."
      );
    }
  }

  const therapyRef = doc(db, THERAPIES_COLLECTION, terapiaId);

  await trackWrite({
    resource: THERAPIES_COLLECTION,
    source: "updateTherapyStatus",
    operation: "updateDoc",
    write: () => updateDoc(therapyRef, {
      estado,
      updatedAt: serverTimestamp(),
    }),
  });
  invalidateTherapyCaches();
}

function invalidateTherapyCaches() {
  invalidateCachePrefix("therap");
}

function chunk(items, size) {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}

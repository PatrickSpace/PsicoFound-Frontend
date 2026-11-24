import { collection, query, where, orderBy, limit, startAfter } from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { readQuery, subscribeQuery } from "@/repositories/firestoreRepository";
import { invalidateAppointmentCaches } from "@/services/citaService";

// Preserve the view contract during migration; canonical documents always win.
export async function attachAppointments(therapies) {
  if (!therapies.length || !auth.currentUser) return therapies;
  const uid = auth.currentUser.uid;
  const allOwned = therapies.every((therapy) => therapy.pacienteUid === uid);
  const filters = allOwned
    ? [[where("pacienteUid", "==", uid)]]
    : [...new Set(therapies.map((therapy) => therapy.terapeutaId))]
      .map((id) => [where("terapeutaId", "==", id)]);
  const pages = await Promise.all(filters.map(async (conditions) => {
    const result = [];
    let cursor = null;
    do {
      const constraints = [...conditions, orderBy("__name__"), limit(200)];
      if (cursor) constraints.push(startAfter(cursor));
      const snapshot = await readQuery(query(collection(db, "citas"), ...constraints), {
        resource: "citas", source: "attachAppointments",
      });
      result.push(...snapshot.docs.map((item) => ({ ...item.data(), citaId: item.id })));
      cursor = snapshot.size === 200 ? snapshot.docs.at(-1) : null;
    } while (cursor);
    return result;
  }));
  const appointments = pages.flat();
  return therapies.map((therapy) => {
    const merged = new Map((therapy.citas || []).map((item) => [item.citaId, item]));
    appointments.filter((item) => item.terapiaId === therapy.id)
      .forEach((item) => merged.set(item.citaId, item));
    return { ...therapy, citas: [...merged.values()].sort((a, b) =>
      `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`)) };
  });
}

export function watchAppointmentChanges({ patientId, therapistId }, onChange, onError) {
  const field = therapistId ? "terapeutaId" : "pacienteUid";
  const value = therapistId || patientId;
  if (!value) return () => {};
  return subscribeQuery(query(collection(db, "citas"), where(field, "==", value),
    orderBy("updatedAt", "desc"), limit(1)), {
    key: `appointment-changes:${field}:${value}`, resource: "citas", source: "watchAppointmentChanges",
  }, () => {
    invalidateAppointmentCaches();
    onChange();
  }, onError);
}

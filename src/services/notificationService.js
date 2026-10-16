import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const NOTIFICATIONS_COLLECTION = "notifications";

export function watchNotifications(recipientUid, onData, onError) {
  if (!recipientUid) {
    onData([]);
    return () => {};
  }

  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const notificationsQuery = query(
    notificationsRef,
    where("recipientUid", "==", recipientUid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...presentNotification(item.data()),
        }))
      );
    },
    onError
  );
}

export async function markNotificationAsRead(notificationId) {
  if (!notificationId) {
    return;
  }

  const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  await updateDoc(notificationRef, {
    readAt: serverTimestamp(),
  });
}

function presentNotification(data) {
  if (!data.type?.startsWith("appointment_")) return data;
  const scheduleMessage = data.metadata?.scheduleLabel
    ? `${data.title} · ${data.metadata.scheduleLabel}`
    : `${data.title} · Consulta la cita para verificar su horario en hora de Lima; el aviso histórico no conserva un instante verificable.`;
  const rejectionMessage = data.type === "appointment_rejected" && data.metadata?.rescheduleRequested
    ? ` · ${data.metadata.cancellationReason || "Tu profesional no podrá atenderte en este horario."} · Elige un nuevo horario desde Mis sesiones. Si ya pagaste, el pago requiere revisión y no se aplica automáticamente a otra reserva.`
    : "";
  const attendanceMessage = data.metadata?.attendanceAction
    ? ` · ${data.metadata.attendanceReason || 'Consulta el registro de atención.'} · Puedes revisar los datos y el historial de cambios desde tu proceso.` : "";
  return {...data, message: scheduleMessage + rejectionMessage + attendanceMessage};
}

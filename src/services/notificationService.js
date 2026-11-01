import { watchPagedQuery } from "./pagedQuery";
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

const NOTIFICATIONS_COLLECTION = "notifications";

const sharedFeeds = new Map();

export function watchNotifications(recipientUid, onData, onError) {
  if (!recipientUid) { onData([]); return () => {}; }
  let feed = sharedFeeds.get(recipientUid);
  if (!feed) {
    feed = { consumers: new Set(), latest: null, stop: null, failed: true };
    sharedFeeds.set(recipientUid, feed);
  }
  if (feed.failed) {
    // Permission errors terminate Firestore listeners. Restart the same shared
    // feed on retry so every existing consumer receives the fresh subscription.
    feed.stop?.(); feed.failed = false; feed.latest = null;
    feed.stop = startNotifications(recipientUid, (items, page) => {
      feed.latest = [items, page];
      for (const consumer of feed.consumers) consumer.onData(items, page);
    }, error => {
      feed.failed = true;
      for (const consumer of feed.consumers) consumer.onError?.(error);
    });
  }
  const consumer = { onData, onError };
  feed.consumers.add(consumer);
  if (feed.latest) onData(...feed.latest);
  return () => {
    feed.consumers.delete(consumer);
    // Vue replaces layouts in one render turn. Reuse the feed through that transition.
    queueMicrotask(() => {
      if (!feed.consumers.size && sharedFeeds.get(recipientUid) === feed) {
        feed.stop(); sharedFeeds.delete(recipientUid);
      }
    });
  };
}

function startNotifications(recipientUid, onData, onError) {
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

  return watchPagedQuery(notificationsQuery, (items, page) => {
    onData(items.map(item => ({ ...presentNotification(item), id: item.id })), page);
  }, onError);
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

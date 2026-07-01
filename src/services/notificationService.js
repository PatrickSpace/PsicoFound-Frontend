import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";

const NOTIFICATIONS_COLLECTION = "notifications";

export async function createNotification(data = {}) {
  const recipientUid = data.recipientUid || "";

  if (!recipientUid) {
    return null;
  }

  const payload = {
    recipientUid,
    actorUid: data.actorUid || auth.currentUser?.uid || "",
    type: data.type || "general",
    title: data.title || "Notificación",
    message: data.message || "",
    route: data.route || "",
    readAt: null,
    metadata: sanitizeMetadata(data.metadata),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), payload);

  return {
    id: docRef.id,
    ...payload,
  };
}

export function watchNotifications(recipientUid, onData, onError) {
  if (!recipientUid) {
    onData([]);
    return () => {};
  }

  const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
  const notificationsQuery = query(
    notificationsRef,
    where("recipientUid", "==", recipientUid),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
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

function sanitizeMetadata(metadata = {}) {
  return {
    citaId: metadata.citaId || "",
    terapiaId: metadata.terapiaId || "",
    terapeutaId: metadata.terapeutaId || "",
    appointmentStatus: metadata.appointmentStatus || "",
    hasMeetingUrl: Boolean(metadata.hasMeetingUrl),
  };
}

import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth } from "@/plugins/Firebase/firebase";
import { db } from "@/plugins/Firebase/firestore";
import { subscribeQuery, trackWrite } from "@/repositories/firestoreRepository";

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

  const docRef = await trackWrite({
    resource: NOTIFICATIONS_COLLECTION,
    source: "createNotification",
    operation: "addDoc",
    write: () => addDoc(collection(db, NOTIFICATIONS_COLLECTION), payload),
  });

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

  return subscribeQuery(
    notificationsQuery,
    {
      key: `notifications:${recipientUid}`,
      resource: NOTIFICATIONS_COLLECTION,
      source: "watchNotifications",
    },
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
  await trackWrite({
    resource: NOTIFICATIONS_COLLECTION,
    source: "markNotificationAsRead",
    operation: "updateDoc",
    write: () => updateDoc(notificationRef, {
      readAt: serverTimestamp(),
    }),
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

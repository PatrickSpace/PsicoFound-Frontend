import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";
import { trackWrite } from "@/repositories/firestoreRepository";

const FEEDBACK_COLLECTION = "feddback";

export async function createFeedback(data = {}) {
  const payload = {
    nombreUsuario: data.nombreUsuario || "Usuario",
    userId: data.userId || "",
    correoUsuario: data.correoUsuario || "",
    mensajeObservacion: data.mensajeObservacion || "",
    categoria: data.categoria || "comentario",
    createdAt: serverTimestamp(),
  };

  const docRef = await trackWrite({
    resource: FEEDBACK_COLLECTION,
    source: "createFeedback",
    operation: "addDoc",
    write: () => addDoc(collection(db, FEEDBACK_COLLECTION), payload),
  });

  return {
    id: docRef.id,
    ...payload,
  };
}

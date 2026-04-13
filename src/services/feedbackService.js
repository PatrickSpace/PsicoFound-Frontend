import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/plugins/Firebase/firestore";

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

  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), payload);

  return {
    id: docRef.id,
    ...payload,
  };
}

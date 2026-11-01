import { app, useEmulators } from "@/plugins/Firebase/firebase.js";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

//set database
export const db = getFirestore(app);
if (useEmulators) connectFirestoreEmulator(db, "127.0.0.1", Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080));

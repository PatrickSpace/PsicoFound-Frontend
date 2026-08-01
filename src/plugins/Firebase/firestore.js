import { app } from "@/plugins/Firebase/firebase.js";
import { getFirestore } from "firebase/firestore";

export const db = getFirestore(app);

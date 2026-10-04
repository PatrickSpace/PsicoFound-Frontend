import { app } from "@/plugins/Firebase/firebase.js";
import { getFirestore } from "firebase/firestore";

//set database
export const db = getFirestore(app);

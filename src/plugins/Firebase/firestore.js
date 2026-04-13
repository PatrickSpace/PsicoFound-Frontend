import { app } from "@/plugins/Firebase/firebase.js";
import { getFirestore, doc, setDoc } from "firebase/firestore";

//set database
export const db = getFirestore(app);

//Gestion de usuarios en Firestore
async function createUserProfile(newUser) {
  try {
    const ref = doc(db, "users", newUser.id);
    await setDoc(ref, {
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
      rol: newUser.rol,
    }, { merge: true });
    console.log("User profile created with ID:", ref.id);
  } catch (error) {
    console.error("Error creating user profile:", error.message);
  }
}

export const createUserInFirestore = createUserProfile;

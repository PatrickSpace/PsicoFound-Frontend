import { app } from "@/plugins/Firebase/firebase.js";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { APP_ROLES } from "@/utils/roles";

//set database
export const db = getFirestore(app);

//Gestion de usuarios en Firestore
async function createUserProfile(newUser) {
  try {
    const ref = doc(db, "users", newUser.id);
    const snapshot = await getDoc(ref);
    const payload = {
      id: newUser.id,
      email: newUser.email,
      nombre: newUser.nombre,
    };

    if (!snapshot.exists()) {
      payload.roles =
        Array.isArray(newUser.roles) && newUser.roles.length
          ? newUser.roles
          : [APP_ROLES.PATIENT];
      payload.rol = newUser.rol || APP_ROLES.PATIENT;
    }

    await setDoc(ref, payload, { merge: true });
    console.log("User profile created with ID:", ref.id);
  } catch (error) {
    console.error("Error creating user profile:", error.message);
  }
}

export const createUserInFirestore = createUserProfile;

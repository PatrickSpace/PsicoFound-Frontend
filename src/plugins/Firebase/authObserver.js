import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
export function observeAuth(onUser) { return onAuthStateChanged(auth, onUser); }

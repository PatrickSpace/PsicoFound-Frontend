import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { clearRequestCache } from "@/utils/requestCache";
import { clearSharedSubscriptions } from "@/utils/sharedSubscriptions";
export function observeAuth(onUser) {
  return onAuthStateChanged(auth, user => {
    clearRequestCache();
    clearSharedSubscriptions();
    onUser(user);
  });
}

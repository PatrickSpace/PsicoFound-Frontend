import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";

export { isProfileReadyForRecommendations } from "@/utils/recommendationProfile";

const functions = getFunctions(
  app,
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1"
);
const getRecommendedTherapistsCallable = httpsCallable(
  functions,
  "getRecommendedTherapists"
);

export async function getRecommendedTherapists() {
  try {
    const result = await getRecommendedTherapistsCallable();
    return {
      therapists: Array.isArray(result.data?.therapists)
        ? result.data.therapists
        : [],
      profile: result.data?.profile || null,
      criteria: result.data?.criteria || null,
    };
  } catch (error) {
    const readableError = new Error(
      error?.message ||
        "No pudimos obtener las recomendaciones. Inténtalo nuevamente."
    );
    readableError.code = error?.code || "";
    throw readableError;
  }
}

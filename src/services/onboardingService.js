import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/plugins/Firebase/firebase";

const FUNCTIONS_REGION = "southamerica-east1";
const functions = getFunctions(app, FUNCTIONS_REGION);

const finalizeRegistrationCallable = httpsCallable(
  functions,
  "finalizeRegistration"
);
const completePatientOnboardingCallable = httpsCallable(
  functions,
  "completePatientOnboarding"
);
const submitPsychologistApplicationCallable = httpsCallable(
  functions,
  "submitPsychologistApplication"
);
const reviewPsychologistApplicationCallable = httpsCallable(
  functions,
  "reviewPsychologistApplication"
);

export const REGISTRATION_INTENTS = {
  PATIENT: "patient",
  PSYCHOLOGIST: "psychologist",
};

export const REGISTRATION_INTENT_STORAGE_KEY =
  "lurems-registration-intent";

export const REGISTRATION_OPTIONS = [
  {
    value: REGISTRATION_INTENTS.PATIENT,
    label: "Paciente",
    description: "Quiero encontrar apoyo psicológico.",
    icon: "mdi-account-heart-outline",
  },
  {
    value: REGISTRATION_INTENTS.PSYCHOLOGIST,
    label: "Psicólogo/a",
    description: "Quiero ofrecer atención profesional.",
    icon: "mdi-account-tie-outline",
  },
];

export async function finalizeRegistration(data = {}) {
  const result = await finalizeRegistrationCallable(data);
  return result.data;
}

export async function completePatientOnboarding(data = {}) {
  const result = await completePatientOnboardingCallable(data);
  return result.data;
}

export async function submitPsychologistApplication(data = {}) {
  const result = await submitPsychologistApplicationCallable(data);
  return result.data;
}

export async function reviewPsychologistApplication(data = {}) {
  const result = await reviewPsychologistApplicationCallable(data);
  return result.data;
}

export function getBlockingOnboardingRoute(profile = {}) {
  if (!profile.registrationIntent || profile.onboardingStatus === "complete") {
    return "";
  }

  return profile.registrationIntent === REGISTRATION_INTENTS.PSYCHOLOGIST
    ? "/onboarding/psicologo"
    : "/onboarding/paciente";
}

export function getPostAuthenticationRoute(profile = {}) {
  const blockingRoute = getBlockingOnboardingRoute(profile);

  if (blockingRoute) {
    return blockingRoute;
  }

  if (
    profile.registrationIntent === REGISTRATION_INTENTS.PSYCHOLOGIST &&
    profile.professionalAccessStatus === "pending"
  ) {
    return "/onboarding/psicologo/pendiente";
  }

  if (
    profile.registrationIntent === REGISTRATION_INTENTS.PSYCHOLOGIST &&
    profile.professionalAccessStatus === "rejected"
  ) {
    return "/onboarding/psicologo";
  }

  if (
    profile.registrationIntent === REGISTRATION_INTENTS.PSYCHOLOGIST &&
    profile.professionalAccessStatus === "approved"
  ) {
    return "/psicologo/sesiones";
  }

  if (
    Array.isArray(profile.roles) &&
    profile.roles.includes("psychologist") &&
    !profile.roles.includes("patient")
  ) {
    return "/psicologo/sesiones";
  }

  return "/dashboard";
}

export function getCallableErrorMessage(
  error,
  fallback = "No pudimos completar la operación."
) {
  const detailsMessage =
    typeof error?.details === "string"
      ? error.details
      : error?.details?.message;
  const message = (
    detailsMessage ||
    error?.message?.replace(/^Firebase:\s*/i, "") ||
    ""
  ).trim();
  const normalizedMessage = message.toLowerCase();

  if (
    !message ||
    ["internal", "unknown", "functions/internal"].includes(normalizedMessage)
  ) {
    return fallback;
  }

  return message;
}

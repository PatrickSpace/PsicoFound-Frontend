/* eslint-disable max-len */
const firestoreAdmin = require("firebase-admin/firestore");
const {HttpsError} = require("firebase-functions/v2/https");
const {agendaDate} = require("../appointments/schedulePolicy.mjs");

// No default policy: configuring a proposal is not product/legal approval.
function eligibilityPolicy(env = process.env) {
  try {
    const policy = JSON.parse(env.ELIGIBILITY_POLICY_JSON || "null");
    if (!policy || !/^[A-Za-z0-9_.-]{1,80}$/.test(policy.version) ||
        !Number.isInteger(policy.minimumAge) || policy.minimumAge < 18 ||
        policy.minimumAge > 120 || policy.ageBasis !== "declared_birth_date" ||
        policy.timeZone !== "America/Lima" ||
        !["approved", "synthetic"].includes(policy.status) ||
        typeof policy.approvalReference !== "string" || !policy.approvalReference.trim()) return null;
    if (policy.status === "synthetic" && !(env.FUNCTIONS_EMULATOR === "true" &&
        /^demo-/.test(env.GCLOUD_PROJECT || ""))) return null;
    return {version: policy.version, minimumAge: policy.minimumAge,
      ageBasis: policy.ageBasis, timeZone: policy.timeZone};
  } catch (_) {
    return null;
  }
}

function legalPolicy(env = process.env) {
  const policy = {
    version: env.LEGAL_DOCUMENT_VERSION || "",
    termsUrl: env.LEGAL_TERMS_URL || "",
    privacyUrl: env.LEGAL_PRIVACY_URL || "",
  };
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(policy.version) ||
      ![policy.termsUrl, policy.privacyUrl].every((value) => {
        try {
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password &&
            (env.FUNCTIONS_EMULATOR === "true" ||
              !/(^localhost$|^127\.|^\[|(^|\.)example\.(com|org|net)$|\.(test|invalid|example)$)/.test(url.hostname));
        } catch (_) {
          return false;
        }
      })) {
    return null;
  }
  return policy;
}

function ageOnDate(birthDate, today = agendaDate(new Date())) {
  if (typeof birthDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const parsed = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate || birthDate > today) return null;
  return Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)) -
    (today.slice(5) < birthDate.slice(5) ? 1 : 0);
}

function assertEligible(birthDate, today, policy = eligibilityPolicy()) {
  if (!policy) {
    throw new HttpsError("failed-precondition", "La política de elegibilidad todavía no está configurada.",
        {reason: "eligibility_policy_unavailable"});
  }
  const age = ageOnDate(birthDate, today);
  if (age === null || age < policy.minimumAge) {
    throw new HttpsError("failed-precondition",
        `La política vigente requiere ${policy.minimumAge} años o más. Revisa tu fecha de nacimiento.`,
        {reason: "eligibility_required"});
  }
}

function hasCurrentConsent(user, policy) {
  return Boolean(policy && user.legalAcceptance?.acceptedAt &&
    ["version", "termsUrl", "privacyUrl"].every((key) => user.legalAcceptance[key] === policy[key]));
}

function evaluateAccess(user = {}, auth = {}, policy = legalPolicy(), eligibility = eligibilityPolicy()) {
  let reason = "ready";
  if (["deletion_pending", "deleting", "deleted", "disabled"].includes(user.accountStatus)) reason = "account_restricted";
  else if (auth.token?.email_verified !== true) reason = "verification_required";
  else if (!eligibility) reason = "eligibility_policy_unavailable";
  else if (!policy) reason = "policy_unavailable";
  else if (!hasCurrentConsent(user, policy)) reason = "consent_required";
  else if (user.patientOnboardingStatus !== "complete") reason = "onboarding_required";
  else if (ageOnDate(user.fechaNacimiento) === null || ageOnDate(user.fechaNacimiento) < eligibility.minimumAge) reason = "eligibility_required";
  return {allowed: reason === "ready", reason, eligibility, legal: policy};
}

function requirePatientRole(user = {}) {
  const roles = [...(Array.isArray(user.roles) ? user.roles : []), user.rol, user.role];
  if (!roles.some((role) => ["patient", "paciente"].includes(role))) {
    throw new HttpsError("permission-denied", "Tu cuenta no tiene acceso a acciones de paciente.");
  }
}

async function requirePatientAccess(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const snapshot = await firestoreAdmin.getFirestore().doc(`users/${request.auth.uid}`).get();
  requirePatientRole(snapshot.data());
  const access = evaluateAccess(snapshot.data(), request.auth);
  if (!access.allowed) {
    throw new HttpsError("failed-precondition",
        "Revisa los requisitos de tu cuenta antes de continuar. La ayuda sigue disponible.",
        {reason: access.reason});
  }
  return snapshot.data();
}

module.exports = {eligibilityPolicy, legalPolicy, ageOnDate, assertEligible,
  hasCurrentConsent, evaluateAccess, requirePatientAccess, requirePatientRole};

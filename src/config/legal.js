export const legalConfig = Object.freeze({
  version: (import.meta.env.VITE_LEGAL_DOCUMENT_VERSION || "").trim(),
  termsUrl: (import.meta.env.VITE_TERMS_URL || "").trim(),
  privacyUrl: (import.meta.env.VITE_PRIVACY_URL || "").trim(),
});

export const hasPublishedLegalDocuments = Boolean(
  legalConfig.version &&
  /^https:\/\//.test(legalConfig.termsUrl) &&
  /^https:\/\//.test(legalConfig.privacyUrl)
);

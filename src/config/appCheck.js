// reCAPTCHA site keys are public identifiers, bundled in the browser by design.
// This fallback belongs only to the production Firebase project. Other projects
// must provide their own VITE_APP_CHECK_SITE_KEY.
const productionSiteKey = "6LcEYvMtAAAAAGDtppQG0oV1MqmBODADzTIP3_-G";
export const appCheckSiteKey = (
  import.meta.env.VITE_APP_CHECK_SITE_KEY ||
  (import.meta.env.VITE_FIREBASE_PROJECT_ID === "psicosaas-3c819" ? productionSiteKey : "")
).trim();

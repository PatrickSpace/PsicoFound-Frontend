import { computed, reactive } from "vue";

const legacyConfig = {
  version: (import.meta.env.VITE_LEGAL_DOCUMENT_VERSION || "").trim(),
  termsUrl: (import.meta.env.VITE_TERMS_URL || "").trim(),
  privacyUrl: (import.meta.env.VITE_PRIVACY_URL || "").trim(),
};
export const legalConfig = reactive({version: "", termsUrl: "", privacyUrl: "", managed: false, loading: true, error: ""});
export const hasPublishedLegalDocuments = computed(() => Boolean(
  !legalConfig.loading && !legalConfig.error && legalConfig.version &&
  /^https:\/\//.test(legalConfig.termsUrl) && /^https:\/\//.test(legalConfig.privacyUrl)
));
export function watchPublishedLegalDocuments() {
  let stopped = false, unsubscribe;
  legalConfig.loading = true;
  import("@/services/legalPublicationService").then(({observeLegalPublication}) => {
    if (stopped) return;
    unsubscribe = observeLegalPublication( snapshot => {
    const value = snapshot.exists() ? snapshot.data() : legacyConfig;
    Object.assign(legalConfig, {version: value.version || "", termsUrl: value.termsUrl || "", privacyUrl: value.privacyUrl || "", managed: snapshot.exists(), loading: false, error: ""});
  }, () => {
    Object.assign(legalConfig, {version: "", termsUrl: "", privacyUrl: "", loading: false, error: "No pudimos consultar los documentos vigentes. Intenta nuevamente."});
  });
  }).catch(() => { if (!stopped) Object.assign(legalConfig, {loading: false, error: "No pudimos consultar los documentos vigentes."}); });
  return () => { stopped = true; unsubscribe?.(); };
}

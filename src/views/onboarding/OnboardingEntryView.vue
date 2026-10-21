<template>
  <div class="brand-system-scope onboarding-resolver min-dvh-page">
    <v-card v-if="needsConsent" class="pa-6 card-backgoundcustom onboarding-recovery">
      <h1 class="text-h5 font-weight-bold">Completa tu registro</h1>
      <p class="my-4">Tu acceso ya existe. Revisa los documentos para terminar de preparar tu perfil sin crear otra cuenta.</p>
      <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4">{{ errorMessage }}</v-alert>
      <template v-if="hasPublishedLegalDocuments">
        <p class="text-body-2">Versión {{ legalConfig.version }}</p>
        <div class="d-flex flex-wrap ga-2 my-3">
          <v-btn :href="legalConfig.termsUrl" target="_blank" rel="noopener noreferrer" variant="text">Términos de uso</v-btn>
          <v-btn :href="legalConfig.privacyUrl" target="_blank" rel="noopener noreferrer" variant="text">Política de privacidad</v-btn>
        </div>
        <v-checkbox v-model="accepted" label="He leído y acepto los términos de uso y la política de privacidad vigentes." :disabled="loading" />
      </template>
      <v-alert v-else type="info" variant="tonal" class="my-4">{{ legalConfig.loading ? 'Consultando documentos legales…' : legalConfig.error || 'Los documentos legales todavía no están disponibles.' }}</v-alert>
      <v-btn class="pf-btn-primary" :disabled="!accepted || !hasPublishedLegalDocuments || loading" :loading="loading" @click="resolveOnboarding">Completar registro</v-btn>
    </v-card>
    <template v-else-if="!errorMessage">
      <v-progress-circular color="primary" indeterminate size="44" />
      <p class="text-body-2 text-medium-emphasis">Preparando tu cuenta…</p>
    </template>
    <template v-else>
      <v-icon color="error" size="44">mdi-alert-circle-outline</v-icon>
      <p class="text-body-2 text-center">{{ errorMessage }}</p>
      <v-btn class="pf-btn-primary" @click="resolveOnboarding">Intentar nuevamente</v-btn>
    </template>
  </div>
</template>
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { safeReturnPath } from "@/utils/returnPath";
import { auth } from "@/plugins/Firebase/firebase";
import { getUserById } from "@/services/userService";
import { hasPublishedLegalDocuments, legalConfig } from "@/config/legal";
import { finalizeRegistration, getPostAuthenticationRoute, REGISTRATION_INTENT_STORAGE_KEY, REGISTRATION_INTENTS } from "@/services/onboardingService";
const router = useRouter();
const route = useRoute();
const errorMessage = ref(""), needsConsent = ref(false), accepted = ref(false), loading = ref(false);
let generation = 0;
watch(() => legalConfig.version, () => { accepted.value = false; });
onMounted(resolveOnboarding);
onBeforeUnmount(() => { generation++; });
async function resolveOnboarding() {
  if (loading.value) return;
  const current = ++generation;
  const uid = auth.currentUser?.uid;
  const active = () => current === generation && auth.currentUser?.uid === uid;
  errorMessage.value = "";
  if (!uid) { await router.replace("/login"); return; }
  loading.value = true;
  try {
    let profile = await getUserById(uid);
    if (!active()) return;
    if (!profile) {
      if (route.path !== "/registro") {
        await router.replace({path: "/registro", query: {redirect: safeReturnPath(route.query.redirect)}});
        return;
      }
      needsConsent.value = true;
      if (!accepted.value || !hasPublishedLegalDocuments.value) return;
      const storedIntent = sessionStorage.getItem(REGISTRATION_INTENT_STORAGE_KEY);
      const intent = Object.values(REGISTRATION_INTENTS).includes(storedIntent) ? storedIntent : REGISTRATION_INTENTS.PATIENT;
      const result = await finalizeRegistration({intent, displayName: auth.currentUser?.displayName || "",
        legalAccepted: true, legalVersion: legalConfig.version, termsUrl: legalConfig.termsUrl, privacyUrl: legalConfig.privacyUrl});
      if (!active()) return;
      profile = result.profile;
      sessionStorage.removeItem(REGISTRATION_INTENT_STORAGE_KEY);
    }
    const next = getPostAuthenticationRoute(profile);
    await router.replace(typeof route.query.redirect === "string" ?
      (profile.onboardingStatus === "complete" ? safeReturnPath(route.query.redirect) :
        {path: next, query: {redirect: safeReturnPath(route.query.redirect)}}) : next);
  } catch (error) {
    if (!active()) return;
    console.error("Onboarding resolution error:", error);
    errorMessage.value = "No pudimos preparar tu cuenta. Revisa tu conexión e inténtalo nuevamente.";
  } finally { if (active()) loading.value = false; }
}
</script>
<style scoped>
.onboarding-resolver { display:grid; place-content:center; justify-items:center; gap:16px; padding:24px; background:var(--pf-auth-gradient); }
.onboarding-recovery { width:min(100%, 620px); }
</style>

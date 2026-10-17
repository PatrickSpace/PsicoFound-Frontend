<template>
  <v-card v-if="!status?.allowed" class="card-backgoundcustom pa-4 mb-4" variant="text">
    <h2 class="text-h6 mb-2">Requisitos de la cuenta</h2>
    <p v-if="status?.eligibility" class="text-body-2 mb-3">La política vigente requiere {{ status.eligibility.minimumAge }} años o más. La fecha declarada no equivale a verificación documental.</p>
    <v-alert v-if="error" color="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
    <p role="status" class="mb-3">{{ message }}</p>
    <template v-if="status?.reason === 'consent_required' && status.legal">
      <div class="d-flex flex-wrap ga-2">
        <v-btn :href="status.legal.termsUrl" target="_blank" rel="noopener noreferrer" class="pf-btn-ghost">Términos de uso</v-btn>
        <v-btn :href="status.legal.privacyUrl" target="_blank" rel="noopener noreferrer" class="pf-btn-ghost">Política de privacidad</v-btn>
      </div>
      <v-checkbox v-model="accepted" :label="`He leído y acepto los documentos de la versión ${status.legal.version}`" />
      <v-btn class="pf-btn-primary" :disabled="!accepted || loading" :loading="loading" @click="accept">Aceptar versión vigente</v-btn>
    </template>
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn v-if="['onboarding_required', 'eligibility_required'].includes(status?.reason)" to="/onboarding/paciente" class="pf-btn-secondary">Revisar datos de cuenta</v-btn>
      <v-btn v-if="status?.reason === 'verification_required'" to="/verificar-correo" class="pf-btn-secondary">Verificar correo</v-btn>
      <v-btn class="pf-btn-ghost" :loading="loading" @click="refresh">Revisar requisitos</v-btn>
    </div>
  </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAuthStore } from "@/store/auth";
import { acceptCurrentConsent, getAccountAccessStatus } from "@/services/accountService";
import { legalConfig } from "@/config/legal";
const emit = defineEmits(["access"]);
const authStore = useAuthStore();
const status = ref(null), error = ref(""), loading = ref(false), accepted = ref(false);
let generation = 0;
const message = computed(() => ({
  eligibility_policy_unavailable: "La política de elegibilidad todavía está pendiente. La encuesta permanece deshabilitada.",
  policy_unavailable: "Los documentos legales aprobados todavía no están configurados. La encuesta permanece deshabilitada.",
  consent_required: "Antes de continuar, revisa y acepta la versión vigente de los documentos.",
  verification_required: "Verifica tu correo antes de continuar.",
  onboarding_required: "Completa los datos de tu cuenta antes de continuar.",
  eligibility_required: "Revisa tu fecha de nacimiento y los requisitos de la política vigente.",
  account_restricted: "El acceso está restringido por el estado de tu cuenta. Puedes consultar soporte y tus datos.",
})[status.value?.reason] || "Comprobando requisitos…");
async function refresh() {
  const current = ++generation;
  status.value = null; error.value = ""; accepted.value = false;
  emit("access", false); loading.value = true;
  try {
    const result = await getAccountAccessStatus();
    if (current !== generation) return;
    status.value = result; emit("access", result.allowed);
  } catch {
    if (current === generation) error.value = "No pudimos comprobar tu cuenta. Intenta nuevamente.";
  } finally { if (current === generation) loading.value = false; }
}
async function accept() {
  if (!accepted.value || !status.value?.legal || loading.value) return;
  const current = generation;
  loading.value = true; error.value = "";
  try {
    await acceptCurrentConsent(status.value.legal);
    if (current === generation) await refresh();
  } catch {
    if (current === generation) error.value = "No pudimos registrar tu aceptación. Revisa los requisitos e intenta nuevamente.";
  } finally { if (current === generation) loading.value = false; }
}
watch(() => [authStore.currentUser?.uid, legalConfig.version], ([uid]) => {
  if (uid) refresh();
  else { generation++; status.value = null; emit("access", false); }
}, { immediate: true });
onBeforeUnmount(() => { generation++; });
</script>

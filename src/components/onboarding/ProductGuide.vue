<template>
  <div v-if="role && !careActive" class="mb-3">
    <v-card v-if="showPatientWelcome" variant="tonal" color="secondary" class="pa-4 mb-4">
      <h2 class="text-h6">Tu primer paso en Lurems</h2>
      <p class="my-2">Cuéntanos cómo te sientes, encuentra un profesional y sigue tu proceso a tu ritmo.</p>
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="tonal" @click="openGuide">Conocer Lurems</v-btn>
        <v-btn variant="text" :disabled="saving" @click="dismissWelcome">Más tarde</v-btn>
      </div>
    </v-card>
    <div class="d-flex justify-end">
      <v-btn prepend-icon="mdi-compass-outline" variant="text" size="small" @click="openGuide">Guía de funciones</v-btn>
    </div>
    <v-alert v-if="error && !guideSession.open" type="error" variant="tonal" class="mt-3" role="alert">{{ error }}</v-alert>
    <GuidedSpotlight v-if="guideSession.open && currentStep && route.path === currentStep.path" :key="`${role}-${guideSession.step}`"
      :steps="[{ selector: currentStep.selector, title: currentStep.title, text: currentStep.text }]"
      controlled :progress="`${guideSession.step + 1} de ${steps.length}`" :has-previous="guideSession.step > 0"
      :busy="saving" :error="error" :next-label="guideSession.step === steps.length - 1 ? 'Terminar recorrido' : 'Siguiente'"
      @previous="move(-1)" @next="move(1)" @close="closeGuide" />
  </div>
</template>

<script setup>
import GuidedSpotlight from './GuidedSpotlight.vue';
import { careGuide } from '@/services/patientCareGuideService';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppContextStore } from '@/store/appContext';
import { guideSession, saveProductGuide } from '@/services/productGuideService';
import { getCallableErrorMessage } from '@/services/onboardingService';

const context = useAppContextStore(), route = useRoute(), router = useRouter();
const error = ref(''), saving = ref(false), locallyDismissed = ref(false);
const role = computed(() => context.activeMode === 'psychologist' && context.hasPsychologistAccess ? 'psychologist' : context.activeMode === 'patient' && context.hasPatientAccess ? 'patient' : '');
const careActive = computed(() => role.value === 'patient' && careGuide.uid === context.loadedForUid && (careGuide.loading || careGuide.available));
const saved = computed(() => context.userProfile?.productGuides?.[role.value]);
const showPatientWelcome = computed(() => role.value === 'patient' && route.path === '/dashboard' && !saved.value && !locallyDismissed.value);
const professionalSteps = [
  { title: 'Organiza tu agenda', text: 'Abre bloques de una hora en horario de Lima. Aquí consultas tus citas, gestionas solicitudes y añades el enlace externo de la sesión. Si aún no tienes citas, puedes empezar por tus horarios.', action: 'Ver mi agenda', path: '/psicologo/sesiones', selector: '[data-product-guide=agenda]' },
  { title: 'Conoce a tus pacientes', text: 'En Pacientes encontrarás los procesos vinculados a ti y el resumen compartido disponible. Si todavía no hay pacientes, la lista aparecerá vacía hasta tu primera vinculación.', action: 'Ver pacientes', path: '/pacientes', selector: '[data-product-guide=patients]' },
  { title: 'Acompaña cada proceso', text: 'Selecciona un paciente y su terapia para consultar objetivos, ejercicios e historial. Elige una terapia activa para registrar avances y asignar ejercicios. Si aún no tienes pacientes, podrás hacerlo cuando inicies un proceso.', action: 'Ver seguimiento', path: '/progreso', selector: '[data-care-guide=goals] .v-card-title' },
  { title: 'Configura tu consulta', text: 'Revisa tu tarifa y la preparación de tu consulta. Puedes pausar nuevas reservas conservando las citas acordadas. Si tienes varias vistas, alterna entre paciente y psicólogo desde Configuración.', action: 'Ir a configuración', path: '/configuracion', selector: '[data-product-guide=setup-title]' },
];
const patientSteps = [
  { title: 'Cuéntanos cómo te sientes', text: 'La encuesta te ayuda a expresar lo que buscas y preparar un resumen que puedes revisar. Puedes retomarla y corregir tus preferencias. Los canales de apoyo siguen accesibles sin terminar esta guía.', action: 'Ir a la encuesta', path: '/encuesta', selector: '[data-product-guide=survey-title]' },
  { title: 'Encuentra un profesional', text: 'Después de confirmar tu resumen podrás revisar profesionales y horarios. Si no has terminado la encuesta, continúa desde ahí. Antes de reservar verás el precio y las condiciones; informar un pago no lo confirma.', action: 'Continuar mi encuesta', path: '/encuesta', selector: '[data-product-guide=survey-help]' },
  { title: 'Sigue tu proceso', text: 'En Sesiones verás tus citas y el enlace de atención cuando esté disponible. Con una terapia activa también podrás consultar objetivos, ejercicios y registrar cómo te sientes.', action: 'Ver mis sesiones', path: '/sesiones', selector: '[data-product-guide=sessions-title]' },
];
const steps = computed(() => role.value === 'psychologist' ? professionalSteps : patientSteps);
const currentStep = computed(() => steps.value[guideSession.step]);
watch(() => [context.loadedForUid, role.value], () => {
  if (guideSession.uid !== context.loadedForUid || guideSession.role !== role.value) {
    Object.assign(guideSession, { uid: context.loadedForUid, role: role.value, open: false, step: 0 });
    error.value = ''; saving.value = false; locallyDismissed.value = false;
  }
}, { immediate: true, flush: 'sync' });
watch(() => route.query.guia, async value => {
  if (value === '1' && role.value) { await openGuide(); const query = { ...route.query }; delete query.guia; await router.replace({ path: route.path, query, hash: route.hash }); }
}, { immediate: true });
async function openGuide() {
  error.value = '';
  guideSession.step = saved.value?.status === 'completed' ? 0 : Math.min(saved.value?.step ?? guideSession.step, steps.value.length - 1);
  if (await persist('started')) { guideSession.open = true; await router.push(currentStep.value.path); }
}
async function persist(status, step = guideSession.step) {
  if (saving.value || !role.value) return false;
  const uid = context.loadedForUid, currentRole = role.value;
  saving.value = true; error.value = '';
  try {
    await saveProductGuide({ role: currentRole, step, status });
    return uid === context.loadedForUid && currentRole === role.value;
  } catch (cause) {
    if (uid === context.loadedForUid && currentRole === role.value) error.value = getCallableErrorMessage(cause, 'No pudimos guardar tu avance. Intenta otra vez.');
    return false;
  } finally { if (uid === context.loadedForUid && currentRole === role.value) saving.value = false; }
}
async function move(delta) {
  const next = guideSession.step + delta;
  if (next === steps.value.length) { if (await persist('completed')) guideSession.open = false; }
  else if (await persist('started', next) && guideSession.open) { guideSession.step = next; await router.push(currentStep.value.path); }
}
async function closeGuide() { guideSession.open = false; if (!saving.value) await persist('dismissed'); }
async function dismissWelcome() { if (await persist('dismissed', 0)) locallyDismissed.value = true; }
watch(() => [route.path, careActive.value], ([path, care]) => {
  if (guideSession.open && (care || path !== currentStep.value?.path)) closeGuide();
});
</script>

<style scoped>
.product-guide :deep(.v-card-title) { white-space: normal; }
</style>

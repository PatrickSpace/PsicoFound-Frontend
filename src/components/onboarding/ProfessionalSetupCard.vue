<template>
  <v-card class="setup-card pa-4 mb-5" variant="outlined" color="secondary" aria-label="Preparación de la consulta">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
      <h2 class="text-h6">{{ state?.completedAt ? 'Tu consulta' : 'Prepara tu consulta' }}</h2>
      <v-btn variant="text" size="small" :loading="loading" :disabled="busy" @click="load">Actualizar guía</v-btn>
    </div>
    <v-progress-linear v-if="loading" indeterminate class="my-3" aria-label="Cargando preparación" />
    <v-alert v-if="error" type="error" variant="tonal" class="my-3" role="alert">{{ error }}</v-alert>
    <template v-if="state">
      <p v-if="!state.welcomeDismissed && !state.completedAt" class="my-3">
        Bienvenido a tu consulta en Lurems. Revisa tus datos, elige tu tarifa y abre tus primeros horarios.
        Tú decides cuándo empezar a recibir reservas.
      </p>
      <v-alert v-if="state.legacy && state.acceptingBookings" type="info" variant="tonal" class="my-3">
        Tu perfil conserva su funcionamiento actual. Puedes revisar esta guía sin interrumpir tus citas.
      </v-alert>
      <p class="my-3" role="status">{{ statusText }}</p>
      <v-progress-linear v-if="showTasks" :model-value="completed * 25" color="secondary" height="6" rounded class="mb-4" />
      <template v-if="showTasks">
        <ol class="setup-list">
          <li v-for="(task, index) in tasks" :key="task.title">
            <div class="d-flex align-start ga-3">
              <v-icon :color="task.done ? 'success' : 'secondary'" class="mt-1">{{ task.done ? 'mdi-check-circle' : 'mdi-circle-outline' }}</v-icon>
              <div class="flex-grow-1">
                <h3 class="text-subtitle-1 font-weight-bold">{{ index + 1 }}. {{ task.title }} <span class="text-caption">{{ task.done ? '· Completado' : '· Pendiente' }}</span></h3>
                <p class="text-body-2 mb-2">{{ task.description }}</p>
                <v-btn v-if="index === 0" variant="tonal" size="small" :disabled="busy" @click="reviewDialog = true">Revisar perfil</v-btn>
                <v-btn v-if="index === 1" variant="tonal" size="small" to="/configuracion?preparacion=1#mi-tarifa">Elegir tarifa</v-btn>
                <v-btn v-if="index === 2" variant="tonal" size="small" :to="agendaPage ? undefined : '/psicologo/sesiones?abrirHorario=1'" @click="agendaPage && emit('open-availability')">Abrir horario</v-btn>
                <v-btn v-if="index === 3" variant="tonal" size="small" :disabled="busy || !state.canActivate" @click="activationDialog = true">{{ state.completedAt ? 'Reactivar nuevas reservas' : 'Empezar a recibir reservas' }}</v-btn>
              </div>
            </div>
          </li>
        </ol>
        <p v-if="!state.canActivate" class="text-body-2 mt-3">{{ missingReason }}</p>
      </template>
      <div class="d-flex flex-wrap ga-2 mt-4">
        <v-btn v-if="state.completedAt || state.welcomeDismissed" variant="text" size="small" @click="expanded = !expanded">{{ expanded ? 'Ocultar preparación' : state.completedAt ? 'Revisar preparación' : 'Preparar mi consulta' }}</v-btn>
        <v-btn v-if="state.acceptingBookings" variant="text" size="small" :disabled="busy" @click="pauseDialog = true">Pausar nuevas reservas</v-btn>
        <v-btn variant="text" size="small" :to="{ path: '/psicologo/sesiones', query: { guia: '1' } }">Conocer las funciones</v-btn>
        <v-btn v-if="!state.welcomeDismissed && !state.completedAt" variant="text" size="small" :disabled="busy" @click="mutate('dismiss')">Más tarde</v-btn>
      </div>
    </template>
    <v-dialog v-model="reviewDialog" max-width="600" scrollable>
      <v-card v-if="state" title="Revisa tu perfil profesional">
        <v-card-text>
          <dl class="profile-summary">
            <dt>Nombre</dt><dd>{{ state.profile.nombre || 'Pendiente' }}</dd>
            <dt>Presentación</dt><dd>{{ state.profile.description || 'Pendiente' }}</dd>
            <dt>Colegiatura / licencia</dt><dd>{{ state.profile.licenseNumber || 'Pendiente' }}</dd>
            <dt>Especialidades</dt><dd>{{ state.profile.especialidades.join(', ') || 'Pendiente' }}</dd>
            <dt>Enfoques</dt><dd>{{ state.profile.enfoques.join(', ') || 'Sin especificar' }}</dd>
            <dt>Modalidades</dt><dd>{{ state.profile.modalidades.join(', ') || 'Pendiente' }}</dd>
            <dt>Ubicación</dt><dd>{{ state.profile.direccion || 'Sin ubicación presencial' }}</dd>
          </dl>
          <p class="mt-4">Si algún dato necesita corregirse, solicita su actualización al equipo de Lurems antes de confirmar.</p>
          <v-btn variant="text" href="mailto:jplosta01@gmail.com?subject=Correcci%C3%B3n%20de%20perfil%20profesional">Solicitar corrección</v-btn>
          <v-alert v-if="!state.profileComplete" type="warning" variant="tonal" class="mt-3">Faltan datos esenciales. Solicita completarlos para habilitar nuevas reservas.</v-alert>
        </v-card-text>
        <v-card-actions class="flex-wrap"><v-btn :disabled="busy" @click="reviewDialog = false">Cerrar</v-btn><v-spacer /><v-btn :loading="busy" :disabled="!state.profileComplete" @click="mutate('review')">Mis datos son correctos</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="activationDialog" max-width="560" scrollable>
      <v-card v-if="state" title="Empieza a recibir reservas">
        <v-card-text>
          <p class="mb-3">{{ state.profile.nombre }} · {{ state.profile.modalidades.join(', ') }}</p>
          <p>Precio por sesión: <strong>{{ amount(state.rate?.amountMinor) }}</strong></p>
          <p v-if="state.rate">Reparto: {{ state.rate.psychologistPercent }}% para ti y {{ state.rate.platformPercent }}% para Lurems.</p>
          <p class="mt-3">Próximos bloques de una hora · Lima (UTC−5):</p>
          <ul><li v-for="(slot, index) in state.slots.slice(0, 5)" :key="index">{{ slot.date }} · {{ slot.startTime }} · {{ slot.modality }}</li></ul>
          <p class="mt-3">Tu perfil podrá ofrecerse para nuevas reservas. El pago requiere conciliación; abrir el enlace de pago no confirma una cita.</p>
        </v-card-text>
        <v-card-actions class="flex-wrap"><v-btn :disabled="busy" @click="activationDialog = false">Cancelar</v-btn><v-spacer /><v-btn :loading="busy" :disabled="!state.canActivate" @click="mutate('activate')">Confirmar activación</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="pauseDialog" max-width="520">
      <v-card title="Pausar nuevas reservas">
        <v-card-text>Dejarás de recibir nuevas reservas. Tus citas acordadas y el seguimiento de tus pacientes se conservan. Tu cuenta seguirá activa.</v-card-text>
        <v-card-actions class="flex-wrap"><v-btn :disabled="busy" @click="pauseDialog = false">Cancelar</v-btn><v-spacer /><v-btn :loading="busy" @click="mutate('pause')">Confirmar pausa</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from 'vue-router';
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useAppContextStore } from "@/store/appContext";
import { db } from "@/plugins/Firebase/firestore";
import { getProfessionalSetup, updateProfessionalSetup } from "@/services/productGuideService";
import { getCallableErrorMessage } from "@/services/onboardingService";
import { formatPaymentAmount as amount } from "@/utils/paymentRates";

defineProps({ agendaPage: Boolean });
const emit = defineEmits(['open-availability']);
const context = useAppContextStore();
const route = useRoute();
const state = ref(null), loading = ref(false), busy = ref(false), error = ref('');
const reviewDialog = ref(false), activationDialog = ref(false), pauseDialog = ref(false), expanded = ref(false);
let generation = 0, requestVersion = 0, stopSlots, stopRate, timer;
const tasks = computed(() => state.value ? [
  { title: 'Revisa tu perfil', description: 'Comprueba cómo se presentará tu información profesional.', done: state.value.reviewed },
  { title: 'Elige tu tarifa', description: state.value.rateReady ? `Tarifa guardada: ${amount(state.value.rate.amountMinor)} por sesión.` : state.value.rate?.isTest ? 'Tienes una tarifa de prueba. Elige una tarifa de atención real.' : 'Selecciona una tarifa comercial activa del catálogo.', done: state.value.rateReady },
  { title: 'Abre tus primeros horarios', description: `${state.value.slots.length} ${state.value.slots.length === 1 ? 'bloque futuro disponible' : 'bloques futuros disponibles'}. Cada bloque dura una hora, en hora de Lima (UTC−5).`, done: state.value.slots.length > 0 },
  { title: 'Empieza a recibir reservas', description: 'Revisa el resumen y decide cuándo habilitar nuevas reservas.', done: state.value.completedAt && state.value.acceptingBookings },
] : []);
const completed = computed(() => tasks.value.filter(task => task.done).length);
const showTasks = computed(() => state.value && (expanded.value || (!state.value.completedAt && !state.value.welcomeDismissed)));
const statusText = computed(() => !state.value ? '' : state.value.acceptingBookings ? (!state.value.rateReady ? 'Necesitas una tarifa comercial activa para recibir nuevas reservas.' : state.value.slots.length ? 'Recepción de reservas habilitada.' : 'Añade horarios para recibir nuevas reservas.') : `${completed.value} de 4 pasos · Nuevas reservas pausadas o pendientes de activación.`);
const missingReason = computed(() => !state.value?.profileComplete ? 'Solicita completar los datos esenciales de tu perfil.' : !state.value.reviewed ? 'Revisa y confirma tus datos profesionales.' : !state.value.rateReady ? 'Elige una tarifa real y activa para continuar.' : 'Abre al menos un horario futuro compatible con tu modalidad.');
async function load() {
  if (!context.hasPsychologistAccess || context.activeMode !== 'psychologist') return;
  const current = generation, request = ++requestVersion;
  loading.value = true;
  try { const next = await getProfessionalSetup(); if (current === generation && request === requestVersion) { state.value = next; error.value = ''; } }
  catch (cause) { if (current === generation && request === requestVersion) error.value = getCallableErrorMessage(cause, 'No pudimos cargar tu guía. Intenta actualizarla.'); }
  finally { if (current === generation && request === requestVersion) loading.value = false; }
}
function scheduleLoad() { clearTimeout(timer); timer = setTimeout(load, 250); }
watch(() => [route.hash, loading.value], async ([hash, pending]) => {
  if (hash === '#mi-tarifa' && !pending) { await nextTick(); document.getElementById('mi-tarifa')?.scrollIntoView({ block: 'start' }); }
}, { immediate: true, flush: 'post' });
async function mutate(action) {
  if (busy.value || !state.value) return;
  const current = generation;
  busy.value = true; error.value = '';
  if (action === 'dismiss') expanded.value = false;
  try {
    await updateProfessionalSetup({ action, expectedVersion: state.value.version, fingerprint: state.value.profileFingerprint, activationFingerprint: state.value.activationFingerprint });
    if (current !== generation) return;
    reviewDialog.value = activationDialog.value = pauseDialog.value = false;
    await load();
  } catch (cause) {
    if (current === generation) { await load(); error.value = getCallableErrorMessage(cause, 'No pudimos guardar el cambio.'); }
  } finally { if (current === generation) busy.value = false; }
}
watch(() => [context.loadedForUid, context.activeMode, context.therapistProfile], () => {
  generation++; requestVersion++; clearTimeout(timer); stopSlots?.(); stopRate?.();
  state.value = null; busy.value = false; loading.value = false; error.value = '';
  reviewDialog.value = activationDialog.value = pauseDialog.value = false;
  const profile = context.therapistProfile;
  if (!profile?.id || !context.hasPsychologistAccess || context.activeMode !== 'psychologist') return;
  stopSlots = onSnapshot(query(collection(db, 'therapist_availability'), where('therapistId', '==', profile.id)), scheduleLoad, () => scheduleLoad());
  if (profile.paymentRateId) stopRate = onSnapshot(doc(db, 'payment_rates', profile.paymentRateId), scheduleLoad, () => scheduleLoad());
  scheduleLoad();
}, { immediate: true });
onBeforeUnmount(() => { generation++; clearTimeout(timer); stopSlots?.(); stopRate?.(); });
</script>

<style scoped>
.setup-card { border-color: rgba(var(--v-theme-secondary), .35); color: rgb(var(--v-theme-on-surface)); }
.setup-list { list-style: none; padding: 0; display: grid; gap: 20px; }
.profile-summary { overflow-wrap: anywhere; }
.profile-summary dt { font-weight: 700; margin-top: 12px; }
.profile-summary dd { margin: 0; white-space: pre-wrap; }
.setup-card :deep(.v-card-title) { white-space: normal; }
</style>

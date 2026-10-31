<template>
  <section v-if="patient && careGuide.available" class="care-guide mb-4" aria-label="Guía de acompañamiento">
    <v-card v-if="welcome" class="pa-5 mb-3 care-welcome" variant="tonal" color="secondary">
      <p class="text-overline">Tu espacio de acompañamiento</p>
      <h2 class="text-h5 font-weight-bold">Tu cita está confirmada</h2>
      <p class="my-3">Te mostramos dónde encontrar tu sesión y cómo usar tu espacio de acompañamiento. Puedes recorrerlo ahora o retomarlo cuando quieras.</p>
      <div class="d-flex flex-wrap ga-2">
        <v-btn color="secondary" :disabled="careGuide.saving" @click="start">Conocer mi espacio</v-btn>
        <v-btn variant="outlined" to="/sesiones">Ver mi cita</v-btn>
        <v-btn variant="text" :disabled="careGuide.saving" @click="defer">Más tarde</v-btn>
      </div>
    </v-card>
    <div class="d-flex justify-end ga-2 flex-wrap">
      <v-btn v-if="['dismissed', 'started'].includes(careGuide.progress?.status)" size="small" variant="text" @click="start(false)">Retomar recorrido</v-btn>
      <v-menu>
        <template #activator="{ props }"><v-btn v-bind="props" prepend-icon="mdi-compass-outline" variant="text" size="small">Guía de mi proceso</v-btn></template>
        <v-list aria-label="Ayudas del proceso">
          <v-list-item title="Repetir recorrido inicial" @click="start(true)" />
          <v-list-item v-for="item in sections" :key="item.key" :title="item.title" @click="openSection(item)" />
          <v-list-item title="Configuración de mi cuenta" to="/configuracion" />
        </v-list>
      </v-menu>
    </div>
    <v-alert v-if="careGuide.error" type="warning" variant="tonal" class="mt-2" role="alert">{{ careGuide.error }}</v-alert>
    <GuidedSpotlight v-if="careGuide.open && route.path === current.path" :key="`${careGuide.section}-${careGuide.step}`"
      :steps="careGuide.section === 'emociones' ? emotionTour : [{ selector: focusSelector, fallbackSelector: '.page-header h1', title: current.title, text: explanation, advanceOnClick: current.anchor === 'navigation' }]"
      :controlled="careGuide.section !== 'emociones'" :progress="careGuide.section ? undefined : `${careGuide.step + 1} de 3`"
      :has-previous="!careGuide.section && careGuide.step > 0" :busy="careGuide.saving" :error="careGuide.error"
      :next-label="careGuide.section === 'emociones' ? 'Terminar guía' : careGuide.section ? 'Entendido' : careGuide.step === 2 ? 'Terminar recorrido' : 'Siguiente'"
      @previous="move(-1)" @next="next" @complete="next" @close="close" />
    <v-card v-if="!careGuide.open && suggested && !welcome" class="pa-4 mt-3" variant="outlined">
      <h2 class="text-subtitle-1 font-weight-bold">{{ firstExercise ? 'Ya tienes una herramienta para explorar' : `Conoce ${suggested.title.toLowerCase()}` }}</h2>
      <p class="text-body-2 mt-1">{{ firstExercise ? 'Lee las instrucciones antes de comenzar. El recorrido no marcará el ejercicio como realizado.' : 'Una explicación breve de lo que puedes hacer aquí, cuando quieras.' }}</p>
      <div class="d-flex flex-wrap ga-2 mt-2">
        <v-btn variant="tonal" color="secondary" @click="openSection(suggested)">Explícame esta sección</v-btn>
        <v-btn variant="text" :disabled="careGuide.saving" @click="dismissSuggestion">Más tarde</v-btn>
      </div>
    </v-card>
  </section>
  <v-alert v-else-if="patient && careGuide.error" type="info" variant="tonal" class="mb-3">
    {{ careGuide.error }} <v-btn variant="text" size="small" @click="refreshCareGuide">Reintentar guía</v-btn>
  </v-alert>
</template>

<script setup>
import GuidedSpotlight from './GuidedSpotlight.vue';
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { app } from '@/plugins/Firebase/firebase';
import { useAppContextStore } from '@/store/appContext';
import { careGuide, resetCareGuide, refreshCareGuide, saveCareGuide } from '@/services/patientCareGuideService';
const context = useAppContextStore(), route = useRoute(), router = useRouter();
const patient = computed(() => context.activeMode === 'patient' && context.hasPatientAccess && !['suspended', 'deletion_pending', 'deleting', 'deleted', 'disabled'].includes(context.userProfile?.accountStatus));
const viewportWidth = ref(innerWidth);
const updateViewport = () => { viewportWidth.value = innerWidth; };
const target = ref(null), contentState = ref(''), exercisePresent = ref(false);
const sections = [
  { key: 'sesiones', path: '/sesiones', title: 'Sesiones', anchor: 'next-appointment', text: 'Aquí encuentras la fecha, la hora de Lima y los datos de tu próxima cita. Si necesitas un cambio, revisa las opciones y condiciones de la cita.' },
  { key: 'inicio', path: '/dashboard', title: 'Inicio', anchor: 'summary', text: 'Este es el resumen de tu proceso: tu próxima sesión y la actividad disponible. Puedes volver aquí para orientarte sin repetir la encuesta.' },
  { key: 'emociones', path: '/registro-emocional', title: 'Emociones', anchor: 'emotions', text: 'Puedes registrar cómo te sientes entre sesiones. Antes de guardar, el formulario explica quién podrá ver el registro y la nota: tu profesional vinculado y el personal administrador autorizado. Es opcional; no es un canal de urgencias ni tiene vigilancia permanente.' },
  { key: 'progreso', path: '/progreso', title: 'Progreso', anchor: 'goals', text: 'Aquí consultas los objetivos de tu proceso y sus avances. Revisa la terapia seleccionada antes de crear o actualizar un objetivo; la guía no modifica tus resultados.' },
  { key: 'herramientas', path: '/herramientas', title: 'Herramientas', anchor: 'tools', text: 'Aquí encontrarás los ejercicios asignados por tu psicólogo. Lee sus instrucciones y usa el botón para completar solo después de realizarlo. Explorar esta ayuda no cuenta como haberlo hecho.' },
  { key: 'historial', path: '/historial', title: 'Historial', anchor: 'history', text: 'Consulta las sesiones y los eventos disponibles de tu proceso. Los filtros de terapia, fechas y tipo de evento cambian lo que ves. Una selección vacía no significa que nunca haya existido actividad.' },
];
const emotionTour = [
  { selector: '[data-care-guide="add-emotion"]', title: 'Empieza un registro emocional', text: 'Pulsa Agregar registro para abrir el formulario. Todavía no se guardará ninguna información.', advanceOnClick: true },
  { selector: '[data-care-guide="emotion-visibility"]', title: 'Antes de compartir, revisa quién lo verá', text: 'Este aviso identifica a tu profesional y explica el acceso del personal administrador autorizado. Después puedes completar el formulario o pulsar Cancelar. Terminar esta guía no guarda un registro.' },
];
const walkthrough = [sections[0], sections[1], { title: 'Tu espacio, a tu ritmo', path: '/dashboard', anchor: 'navigation', text: 'Usa el menú para ir a Sesiones, Emociones, Progreso, Herramientas e Historial. En el móvil, abre Más para encontrar las secciones adicionales. Desde Guía de mi proceso puedes repetir el recorrido o consultar cada ayuda. En Configuración puedes revisar tu cuenta.' }];
const current = computed(() => careGuide.section ? sections.find(item => item.key === careGuide.section) : walkthrough[careGuide.step]);
const focusSelector = computed(() => {
  const anchor = current.value.anchor;
  if (anchor === 'navigation') return viewportWidth.value < 1280 ? '[data-care-guide=navigation-more]' : '[data-care-guide=navigation]';
  let root = `[data-care-guide="${anchor}"]`;
  if (anchor === 'next-appointment') {
    if (careGuide.appointment) root += `[data-care-appointment-id="${careGuide.appointment.id}"]`;
    return `${root} .session-date`;
  }
  return `${root} ${['emotions', 'history'].includes(anchor) ? 'h1' : '.v-card-title'}`;
});
const welcome = computed(() => careGuide.welcomeEligible && !careGuide.progress?.status && !careGuide.open && ['/dashboard', '/sesiones'].includes(route.path));
const routeSection = computed(() => sections.find(item => item.path === route.path));
const firstExercise = computed(() => route.path === '/herramientas' && exercisePresent.value && !careGuide.progress?.firstExerciseSeen);
const suggested = computed(() => firstExercise.value || !careGuide.progress?.sections?.[routeSection.value?.key] ? routeSection.value : null);
const explanation = computed(() => {
  if (contentState.value === 'error') return 'No pudimos cargar los datos de esta sección. Usa Actualizar o vuelve a intentarlo. No se puede concluir que esté vacía por este error.';
  if (contentState.value === 'loading') return 'Estamos cargando los datos de tu proceso. Puedes esperar o continuar con la guía.';
  if (contentState.value === 'empty' && current.value?.key === 'progreso') return 'Todavía no hay objetivos en esta selección. Puedes revisarlos con tu psicólogo; los objetivos aparecerán aquí cuando se creen. No necesitas crear uno para terminar la guía.';
  if (contentState.value === 'empty' && current.value?.key === 'herramientas') return 'Todavía no tienes ejercicios asignados en esta selección. Cuando tu psicólogo te asigne uno, aparecerá aquí. No tienes que completar ningún ejercicio para terminar la guía.';
  if (current.value?.key === 'sesiones') return `${current.value.text} ${careGuide.appointment?.remote ? careGuide.appointment.hasMeetingLink ? 'El enlace de tu sesión ya está disponible en la cita.' : 'Tu psicólogo todavía debe agregar el enlace de la sesión; lo encontrarás aquí cuando esté disponible.' : careGuide.appointment ? 'Revisa la modalidad y el lugar de atención que figuran en tu cita.' : 'Consulta la lista para ver el estado actual; puede que ya no haya una próxima cita confirmada.'}`;
  return current.value?.text || '';
});
let unsubscribes = [], timer, observer, highlighted;
function clearTarget() { highlighted?.classList.remove('care-guide-target'); highlighted = null; target.value = null; }
function inspect() {
  exercisePresent.value = Boolean(document.querySelector('[data-testid="exercise-card"]'));
  if (!careGuide.open || !patient.value || route.path !== current.value?.path) { clearTarget(); return; }
  let selector = `[data-care-guide="${current.value.anchor}"]`;
  if (current.value.anchor === 'next-appointment' && careGuide.appointment) selector += `[data-care-appointment-id="${careGuide.appointment.id}"]`;
  const candidates = [...document.querySelectorAll(selector)];
  const found = candidates.find(el => el.getClientRects().length > 0);
  if (highlighted !== found) { clearTarget(); if (found) { highlighted = found; found.classList.add('care-guide-target'); target.value = found; } }
  contentState.value = found?.dataset.careGuideState || '';
}
function scheduleRefresh() { clearTimeout(timer); timer = setTimeout(refreshCareGuide, 150); }
watch(() => [context.loadedForUid, patient.value], ([uid, enabled]) => {
  unsubscribes.forEach(stop => stop()); unsubscribes = []; clearTimeout(timer); clearTarget();
  const owner = enabled ? uid : '';
  if (owner !== careGuide.uid) resetCareGuide(owner);
  if (!owner) return;
  careGuide.loading = true;
  for (const name of ['citas', 'terapias']) unsubscribes.push(onSnapshot(query(collection(getFirestore(app), name), where('pacienteUid', '==', owner)), scheduleRefresh, () => { careGuide.error = 'No pudimos actualizar la guía. Reintenta la consulta.'; }));
}, { immediate: true, flush: 'sync' });
watch(() => context.userProfile?.productGuides?.patientCare, value => { if (value && patient.value && context.loadedForUid === careGuide.uid) careGuide.progress = value; });
watch(() => [route.path, careGuide.open, careGuide.step, careGuide.section], () => nextTick(inspect));
watch(() => careGuide.open, value => { careGuide.spotlight = value; }, { immediate: true });
onMounted(() => { window.addEventListener('resize', updateViewport); if (careGuide.open && route.path !== current.value?.path) close(); observer = new MutationObserver(inspect); observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-care-guide-state'] }); inspect(); });
onBeforeUnmount(() => { window.removeEventListener('resize', updateViewport); careGuide.spotlight = false; observer?.disconnect(); unsubscribes.forEach(stop => stop()); clearTimeout(timer); clearTarget(); });
async function reveal() { await router.push(current.value.path); await nextTick(); inspect(); }
async function start(repeat = false) {
  const step = !repeat && ['dismissed', 'started'].includes(careGuide.progress?.status) ? careGuide.progress.step || 0 : 0;
  if (await saveCareGuide({ kind: 'walkthrough', step, status: 'started' })) { Object.assign(careGuide, { step, section: '', open: true }); await reveal(); }
}
async function defer() { await saveCareGuide({ kind: 'walkthrough', step: careGuide.progress?.step || 0, status: 'dismissed' }); }
async function move(delta) {
  const step = careGuide.step + delta;
  if (await saveCareGuide({ kind: 'walkthrough', step, status: 'started' }) && careGuide.open) { careGuide.step = step; await reveal(); }
}
async function close() {
  careGuide.open = false;
  if (!careGuide.saving) await saveCareGuide(careGuide.section ? { kind: 'section', section: careGuide.section, status: 'deferred' } : { kind: 'walkthrough', step: careGuide.step, status: 'dismissed' });
}
async function next() {
  if (!careGuide.section && careGuide.step < 2) return move(1);
  if (careGuide.section && firstExercise.value && !await saveCareGuide({ kind: 'exercise', status: 'seen' })) return;
  const ok = await saveCareGuide(careGuide.section ? { kind: 'section', section: careGuide.section, status: 'seen' } : { kind: 'walkthrough', step: 2, status: 'completed' });
  if (ok) careGuide.open = false;
}
async function openSection(item) { careGuide.section = item.key; careGuide.open = true; await reveal(); }
async function dismissSuggestion() {
  const section = suggested.value.key;
  if (firstExercise.value && !await saveCareGuide({ kind: 'exercise', status: 'seen' })) return;
  await saveCareGuide({ kind: 'section', section, status: 'deferred' });
}

</script>
<style>
.care-guide-target { outline: 3px solid #43a99c !important; outline-offset: 5px; scroll-margin-top: 130px; }
.care-guide .v-btn { max-width: 100%; }
.care-guide .v-btn__content { white-space: normal; }
</style>

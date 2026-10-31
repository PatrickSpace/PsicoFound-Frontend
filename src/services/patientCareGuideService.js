import { reactive } from 'vue';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/plugins/Firebase/firebase';
const functions = getFunctions(app, import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'southamerica-east1');
// Survives layout remounts between views, but is reset on identity/mode changes.
export const careGuide = reactive({ uid: '', loading: false, available: false, welcomeEligible: false,
  appointment: null, progress: null, open: false, step: 0, section: '', error: '', saving: false, spotlight: false });
let generation = 0;
export function resetCareGuide(uid = '') {
  generation++;
  Object.assign(careGuide, { uid, loading: false, available: false, welcomeEligible: false,
    appointment: null, progress: null, open: false, step: 0, section: '', error: '', saving: false, spotlight: false });
}
export async function refreshCareGuide() {
  if (!careGuide.uid) return;
  const current = generation;
  careGuide.loading = true;
  try {
    const result = (await httpsCallable(functions, 'getPatientCareGuide')({})).data;
    if (current === generation) Object.assign(careGuide, result, { error: '' });
  } catch {
    if (current === generation) { careGuide.available = false; careGuide.open = false; careGuide.error = 'No pudimos consultar la guía. Puedes volver a intentarlo.'; }
  } finally { if (current === generation) careGuide.loading = false; }
}
export async function saveCareGuide(data) {
  if (careGuide.saving) return false;
  const current = generation;
  careGuide.saving = true; careGuide.error = '';
  try {
    await httpsCallable(functions, 'savePatientCareGuide')(data);
    if (current !== generation) return false;
    const progress = { ...careGuide.progress, version: 1 };
    if (data.kind === 'walkthrough') Object.assign(progress, { step: data.step, status: data.status });
    if (data.kind === 'section') progress.sections = { ...progress.sections, [data.section]: data.status };
    if (data.kind === 'exercise') progress.firstExerciseSeen = true;
    careGuide.progress = progress;
    return true;
  } catch {
    if (current === generation) careGuide.error = 'No pudimos guardar la guía. Intenta nuevamente; tu atención no se ha modificado.';
    return false;
  } finally { if (current === generation) careGuide.saving = false; }
}

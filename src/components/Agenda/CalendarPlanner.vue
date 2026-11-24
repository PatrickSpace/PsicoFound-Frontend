<template>
  <v-card class="pa-4 mb-5 card-backgoundcustom" variant="text">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h2 class="text-h6">Mi calendario</h2>
        <p class="text-body-2 text-medium-emphasis">Horarios en Perú · America/Lima</p>
      </div>
      <div class="d-flex ga-2 flex-wrap">
        <v-btn variant="text" @click="exceptionDialog = true">Bloquear días</v-btn>
        <v-btn color="secondary" variant="tonal" prepend-icon="mdi-calendar-plus" @click="editor = true">
          Proyectar horarios
        </v-btn>
      </div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
    <v-alert v-if="success" type="success" variant="tonal" class="mb-3">{{ success }}</v-alert>
    <div class="d-flex align-center justify-space-between mb-3">
      <v-btn icon="mdi-chevron-left" variant="text" aria-label="Semana anterior" @click="moveWeek(-7)" />
      <strong>{{ displayDate(weekStart) }} – {{ displayDate(weekEnd) }}</strong>
      <v-btn icon="mdi-chevron-right" variant="text" aria-label="Semana siguiente" @click="moveWeek(7)" />
    </div>
    <v-progress-linear v-if="loading" indeterminate color="secondary" />
    <div class="calendar-week">
      <section v-for="day in weekDays" :key="day.date" class="calendar-day">
        <h3 class="text-subtitle-2 mb-3">{{ day.label }}</h3>
        <p v-if="!day.slots.length" class="text-caption text-medium-emphasis">Sin bloques</p>
        <div v-for="slot in day.slots" :key="slot.id" class="calendar-slot mb-2">
          <div class="d-flex align-center justify-space-between">
            <strong class="text-body-2">{{ slot.startTime }}–{{ slot.endTime }}</strong>
            <v-btn v-if="slot.status === 'available'" icon="mdi-close" size="x-small" variant="text"
              aria-label="Cerrar horario" :disabled="busy" @click="closeSlot(slot)" />
          </div>
          <div class="text-caption">{{ slot.durationMinutes }} min · {{ slot.modality }}</div>
          <v-chip size="x-small" :color="slot.status === 'available' ? 'success' : 'warning'" class="mt-1">
            {{ slotLabel(slot.status) }}
          </v-chip>
        </div>
      </section>
    </div>
  </v-card>

  <v-dialog v-model="editor" max-width="960" scrollable :persistent="busy">
    <v-card class="pa-4 card-backgoundcustom">
      <v-card-title>Arma tu semana y proyecta tus sesiones</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-4">Guarda tus franjas habituales y elige hasta 12 semanas. Los cambios se aplican a bloques nuevos; las sesiones ya reservadas conservan su duración.</p>
        <v-row>
          <v-col cols="12" sm="4"><v-text-field v-model.number="settings.durationMinutes" type="number" label="Sesión (minutos)" :min="15" :max="180" :step="5" variant="outlined" /></v-col>
          <v-col cols="12" sm="4"><v-text-field v-model.number="settings.bufferMinutes" type="number" label="Descanso entre sesiones (min)" :min="0" :max="120" :step="5" variant="outlined" /></v-col>
          <v-col cols="12" sm="4"><v-text-field v-model.number="settings.minimumNoticeHours" type="number" label="Anticipación para reservar (horas)" :min="0" :max="168" variant="outlined" /></v-col>
        </v-row>
        <p class="text-body-2 mb-4">Ejemplo: {{ settings.durationMinutes }} minutos de sesión + {{ settings.bufferMinutes }} de descanso.</p>
        <div v-for="(window, index) in settings.windows" :key="index" class="weekly-window mb-3">
          <v-select v-model="window.day" :items="dayOptions" label="Día" variant="outlined" hide-details />
          <v-text-field v-model="window.startTime" type="time" label="Desde" variant="outlined" hide-details />
          <v-text-field v-model="window.endTime" type="time" label="Hasta" variant="outlined" hide-details />
          <v-select v-model="window.modality" :items="['Remoto', 'Presencial']" label="Modalidad" variant="outlined" hide-details />
          <v-btn icon="mdi-close" variant="text" aria-label="Quitar franja" @click="settings.windows.splice(index, 1)" />
          <v-text-field v-if="window.modality === 'Presencial'" v-model="window.location" label="Dirección" class="window-address" variant="outlined" hide-details />
        </div>
        <v-btn variant="text" prepend-icon="mdi-plus" :disabled="settings.windows.length >= 28" @click="addWindow">Agregar franja</v-btn>
        <v-divider class="my-5" />
        <v-row>
          <v-col cols="12" sm="6"><v-text-field v-model="fromDate" type="date" :min="today" label="Proyectar desde" variant="outlined" /></v-col>
          <v-col cols="12" sm="6"><v-text-field v-model="toDate" type="date" :min="fromDate" label="Hasta" variant="outlined" /></v-col>
        </v-row>
        <p class="text-caption mb-3">Para abrir solo un día, usa la misma fecha de inicio y fin y agrega su franja.</p>
        <div class="d-flex align-center ga-2">
          <v-text-field v-model="excludedDate" label="Día libre o feriado" type="date" :min="fromDate" :max="toDate" variant="outlined" hide-details />
          <v-btn variant="tonal" :disabled="!excludedDate" @click="excludeDay">Excluir día</v-btn>
        </div>
        <div class="d-flex flex-wrap ga-2 my-3">
          <v-chip v-for="day in excludedDates" :key="day" closable @click:close="excludedDates = excludedDates.filter((item) => item !== day)">{{ displayDate(day) }}</v-chip>
        </div>
        <v-alert v-if="editorError" type="error" variant="tonal" class="mt-4">{{ editorError }}</v-alert>
        <template v-if="preview">
          <v-alert type="info" variant="tonal" class="my-4">
            {{ preview.count }} bloques nuevos · {{ preview.conflicts }} omitidos porque se cruzan con tu agenda.
          </v-alert>
          <v-data-table :headers="previewHeaders" :items="preview.slots" :items-per-page="8" density="compact" />
        </template>
      </v-card-text>
      <v-card-actions class="flex-wrap">
        <v-btn variant="text" :disabled="busy" @click="editor = false">Cerrar</v-btn>
        <v-spacer />
        <v-btn variant="outlined" :loading="previewing" :disabled="busy || !settings.windows.length" @click="showPreview">Ver vista previa</v-btn>
        <v-btn color="secondary" variant="tonal" :loading="publishing" :disabled="!preview || busy" @click="publish">Publicar horarios</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="exceptionDialog" max-width="520" :persistent="busy">
    <v-card class="pa-4 card-backgoundcustom">
      <v-card-title>Bloquear días de mi agenda</v-card-title>
      <v-card-text>
        <p class="mb-4">Se cerrarán los horarios libres del periodo. Las reservas existentes se conservarán y deberán gestionarse desde la cita.</p>
        <v-text-field v-model="closedFrom" type="date" label="Desde" variant="outlined" />
        <v-text-field v-model="closedTo" type="date" :min="closedFrom" label="Hasta" variant="outlined" />
        <v-alert v-if="exceptionError" type="error" variant="tonal">{{ exceptionError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn :disabled="busy" @click="exceptionDialog = false">Volver</v-btn>
        <v-spacer />
        <v-btn color="secondary" :loading="closing" @click="closeDays">Cerrar horarios libres</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { getCalendarSettings, projectAvailability, getAvailabilityByTherapist, closeAvailability } from "@/services/availabilityService";
import { peruDateKey, shiftDate } from "@/utils/appointmentTime";

const props = defineProps({ therapistId: { type: String, required: true } });
const emit = defineEmits(["changed"]);
const today = peruDateKey();
const settings = ref({ durationMinutes: 45, bufferMinutes: 15, minimumNoticeHours: 2, windows: [] });
const fromDate = ref(today);
const toDate = ref(shiftDate(today, 27));
const excludedDates = ref([]);
const excludedDate = ref("");
const editor = ref(false);
const exceptionDialog = ref(false);
const preview = ref(null);
const previewPayload = ref(null);
const loading = ref(false);
const previewing = ref(false);
const publishing = ref(false);
const closing = ref(false);
const busy = computed(() => previewing.value || publishing.value || closing.value);
const error = ref("");
const success = ref("");
const editorError = ref("");
const exceptionError = ref("");
const closedFrom = ref(today);
const closedTo = ref(today);
const weekStart = ref(today);
const weekEnd = computed(() => shiftDate(weekStart.value, 6));
const slots = ref([]);
let requestVersion = 0;
const dayOptions = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((title, value) => ({ title, value }));
const previewHeaders = [{ title: "Fecha", key: "date" }, { title: "Inicio", key: "startTime" }, { title: "Fin", key: "endTime" }, { title: "Modalidad", key: "modality" }];
const weekDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = shiftDate(weekStart.value, index);
  return { date, label: new Date(`${date}T12:00:00-05:00`).toLocaleDateString("es-PE", { weekday: "short", day: "numeric", timeZone: "America/Lima" }), slots: slots.value.filter((slot) => slot.date === date) };
}));
const displayDate = (date) => new Date(`${date}T12:00:00-05:00`).toLocaleDateString("es-PE", { timeZone: "America/Lima" });
const slotLabel = (status) => ({ available: "Libre", held: "En reserva", booked: "Reservado" })[status] || status;
function addWindow() { settings.value.windows.push({ day: 1, startTime: "09:00", endTime: "13:00", modality: "Remoto", location: "" }); }
function excludeDay() { excludedDates.value = [...new Set([...excludedDates.value, excludedDate.value])].sort(); excludedDate.value = ""; }
function moveWeek(days) { weekStart.value = shiftDate(weekStart.value, days); }
watch([settings, fromDate, toDate, excludedDates], () => { preview.value = null; previewPayload.value = null; }, { deep: true });
async function loadWeek() {
  const version = ++requestVersion;
  if (!props.therapistId) return;
  loading.value = true;
  error.value = "";
  try {
    const result = await getAvailabilityByTherapist(props.therapistId, { fromDate: weekStart.value, toDate: weekEnd.value });
    if (version === requestVersion) slots.value = result;
  } catch (e) { if (version === requestVersion) error.value = e.message; }
  finally { if (version === requestVersion) loading.value = false; }
}
watch([() => props.therapistId, weekStart], loadWeek, { immediate: true });
watch(() => props.therapistId, async (id) => {
  if (!id) return;
  try { const result = await getCalendarSettings(id); settings.value = structuredClone(result.settings); }
  catch (e) { error.value = e.message; }
}, { immediate: true });
async function showPreview() {
  previewing.value = true;
  editorError.value = "";
  const payload = JSON.parse(JSON.stringify({ therapistId: props.therapistId, fromDate: fromDate.value, toDate: toDate.value, settings: settings.value, excludedDates: excludedDates.value }));
  try { preview.value = await projectAvailability(payload); previewPayload.value = payload; }
  catch (e) { editorError.value = e.message; }
  finally { previewing.value = false; }
}
async function publish() {
  if (!previewPayload.value) return;
  publishing.value = true;
  editorError.value = "";
  try {
    const result = await projectAvailability({ ...previewPayload.value, publish: true });
    success.value = `${result.count} horarios publicados. ${result.conflicts} omitidos por cruces. Tu semana tipo quedó guardada.`;
    editor.value = false;
    preview.value = null;
    weekStart.value = fromDate.value;
    await loadWeek();
    emit("changed");
  } catch (e) { editorError.value = e.message; }
  finally { publishing.value = false; }
}
async function closeSlot(slot) {
  closing.value = true;
  try { await closeAvailability({ therapistId: props.therapistId, slotId: slot.id }); await loadWeek(); }
  catch (e) { error.value = e.message; }
  finally { closing.value = false; }
}
async function closeDays() {
  closing.value = true;
  exceptionError.value = "";
  try {
    const result = await closeAvailability({ therapistId: props.therapistId, fromDate: closedFrom.value, toDate: closedTo.value });
    success.value = `${result.closed} horarios cerrados. ${result.reserved} reservas conservadas.`;
    exceptionDialog.value = false;
    await loadWeek();
  } catch (e) { exceptionError.value = e.message; }
  finally { closing.value = false; }
}
</script>

<style scoped>
.calendar-week { display: grid; grid-template-columns: repeat(7, minmax(135px, 1fr)); overflow-x: auto; gap: 8px; }
.calendar-day { padding: 12px 8px; border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 10px; min-height: 180px; }
.calendar-slot { padding: 8px; border-radius: 8px; background: rgba(var(--v-theme-secondary), .08); }
.weekly-window { display: grid; grid-template-columns: 1.2fr 1fr 1fr 1.2fr 40px; align-items: center; gap: 10px; }
.window-address { grid-column: 1 / -1; }
@media (max-width: 600px) { .weekly-window { grid-template-columns: 1fr 1fr; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12); padding-bottom: 12px; } }
</style>

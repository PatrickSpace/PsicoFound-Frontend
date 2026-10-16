<template>
  <LayoutDefault layout>
    <v-container class="pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">Continuidad del proceso</p>
            <h1 class="text-h4 font-weight-bold">Historial terapéutico</h1>
            <p class="text-body-1 text-medium-emphasis mt-2">{{ professional ? 'Terapias, sesiones y eventos de tus pacientes asignados.' : 'Terapias, sesiones y eventos de tu proceso personal.' }}</p>
          </div>
          <v-btn class="pf-btn-secondary" :loading="loading" @click="workspace.refresh">Actualizar</v-btn>
        </div>
        <v-divider class="page-header-divider" />
      </div>
      <TherapyContextFilters :therapies="therapies" :professional="professional"
        v-model:patient="patientFilter" v-model:therapy="therapyFilter" />
      <v-row>
        <v-col cols="12" sm="4"><v-text-field v-model="from" label="Desde" type="date" variant="outlined" /></v-col>
        <v-col cols="12" sm="4"><v-text-field v-model="until" label="Hasta" type="date" variant="outlined" /></v-col>
        <v-col cols="12" sm="4"><v-select v-model="eventType" :items="eventTypes" label="Tipo de evento" clearable variant="outlined" /></v-col>
      </v-row>
      <v-alert v-if="workspace.error.value" type="error" class="mb-4">{{ workspace.error.value }}</v-alert>
      <v-progress-linear v-if="loading" indeterminate class="mb-4" />
      <template v-else-if="!workspace.error.value">
        <v-card class="pa-4 mb-5 card-backgoundcustom">
          <h2 class="text-h6 mb-4">Terapias registradas</h2>
          <TerapiasDatatable :therapies="filteredTherapies" />
        </v-card>
        <v-card class="pa-4 mb-5 card-backgoundcustom">
          <h2 class="text-h6 mb-4">Sesiones y citas</h2>
          <CitasDatatable :appointments="appointments" />
        </v-card>
        <v-card class="pa-4 card-backgoundcustom">
          <h2 class="text-h6 mb-4">Línea de tiempo</h2>
          <p v-if="!events.length">No hay eventos registrados para estos filtros. Esto no confirma ausencia de actividad anterior.</p>
          <v-timeline v-else side="end" density="compact">
            <v-timeline-item v-for="event in events" :key="event.id" dot-color="secondary" size="small">
              <v-card class="card-backgoundcustom pa-4" data-testid="history-event">
                <h3 class="text-subtitle-1">{{ event.title || eventLabel(event.eventType) }}</h3>
                <p class="text-caption">{{ event.sourceType === "appointment" ? new Date(event.occurredAt).toLocaleString("es-PE", { timeZone: DEFAULT_TIME_ZONE }) + " · hora de Lima" : formatTherapyDate(event.occurredAt) }}<span v-if="event.authorName || event.createdBy"> · {{ event.authorName || event.createdBy }}</span></p>
                <p v-if="professional">{{ event.pacienteNombre }}</p>
                <p class="text-caption">Terapia: {{ event.terapiaId }} · {{ eventLabel(event.eventType) }}</p>
                <p v-if="event.sourceType === 'appointment'" class="mt-2">Horario de la cita: {{ resolveSchedule(event.metadata || {}).label }}</p>
                <p class="mt-2"><span v-if="event.sourceType === 'appointment'">Registro original: </span>{{ event.summary }}</p>
                <p v-if="event.metadata?.note" class="mt-2">{{ event.metadata.note }}</p>
                <v-btn v-if="sourceRoute(event)" class="pf-btn-ghost mt-2" :to="sourceRoute(event)">Consultar origen</v-btn>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </template>
    </v-container>
  </LayoutDefault>
</template>
<script setup>
import { agendaDate, resolveSchedule, DEFAULT_TIME_ZONE } from "@/utils/dateTime";
import { computed, ref, watch } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import TherapyContextFilters from "@/components/Terapias/TherapyContextFilters.vue";
import CitasDatatable from "@/components/Terapias/CitasDatatable.vue";
import TerapiasDatatable from "@/components/Terapias/TerapiasDatatable.vue";
import { useTherapyWorkspace } from "@/composables/useTherapyWorkspace";
import { getLongitudinalHistoryByTherapy } from "@/services/longitudinalHistoryService";
import { formatTherapyDate } from "@/utils/therapyContext";

const workspace = useTherapyWorkspace(async (therapies) => (await Promise.all(therapies.map(async (therapy) =>
  (await getLongitudinalHistoryByTherapy(therapy.id)).map((event) => ({
    ...event, terapeutaId: therapy.terapeutaId, pacienteNombre: therapy.pacienteNombre,
  }))))).flat());
const { therapies, professional, loading, patientFilter, therapyFilter, filteredTherapies, visibleItems, revision } = workspace;
const from = ref("");
const until = ref("");
const eventType = ref("");
watch(revision, () => { from.value = ""; until.value = ""; eventType.value = ""; }, { flush: "sync" });
const labels = {
  appointment_created: "Cita agendada", appointment_rescheduled: "Cita reprogramada",
  appointment_meeting_link_updated: "Enlace actualizado", appointment_updated: "Cita actualizada",
  appointment_confirmed: "Cita confirmada", appointment_completed: "Sesión realizada",
  appointment_attendance_corrected: "Datos de atención corregidos", appointment_completion_undone: "Realización deshecha",
  appointment_rejected: "Nuevo horario solicitado por el profesional",
  appointment_pending: "Cita pendiente", exercise_assigned: "Ejercicio asignado",
  exercise_completed: "Ejercicio completado", goal_created: "Objetivo creado",
  goal_updated: "Avance de objetivo", goal_achieved: "Objetivo alcanzado",
  goal_reopened: "Objetivo reabierto", goal_corrected: "Avance corregido", emotional_checkin_created: "Registro emocional",
};
const eventLabel = (type) => labels[type] || type || "Evento";
const eventTypes = computed(() => [...new Set(visibleItems.value.map((e) => e.eventType))]
  .map((value) => ({ value, title: eventLabel(value) })));
function inPeriod(value) {
  const date = value?.toDate ? value.toDate() : new Date(value || "");
  if (!from.value && !until.value) return true;
  if (Number.isNaN(date.getTime())) return false;
  return (!from.value || agendaDate(date) >= from.value) &&
    (!until.value || agendaDate(date) <= until.value);
}
const events = computed(() => visibleItems.value.filter((e) => (!eventType.value || e.eventType === eventType.value) && inPeriod(e.occurredAt))
  .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)));
const appointments = computed(() => filteredTherapies.value.flatMap((therapy) => (therapy.citas || [])
  .filter((cita) => (!from.value || cita.fecha >= from.value) && (!until.value || cita.fecha <= until.value))
  .map((cita) => ({ ...cita, terapiaId: therapy.id, pacienteNombre: therapy.pacienteNombre }))));
function sourceRoute(event) {
  const therapy = therapies.value.find((t) => t.id === event.terapiaId);
  if (!therapy) return null;
  const query = workspace.contextQuery(therapy);
  if (event.sourceType === "therapy_goal") return { path: "/progreso", query };
  if (event.sourceType === "exercise") return { path: "/herramientas", query };
  return { path: "/terapiadetail", query: { ...query, id: therapy.id } };
}
</script>

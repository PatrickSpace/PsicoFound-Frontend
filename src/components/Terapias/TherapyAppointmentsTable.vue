<template>
  <p class="text-caption mb-3">{{ AGENDA_NOTICE }}</p>
  <v-data-table
    :headers="headers"
    :items="appointmentItems"
    class="card-backgoundcustom therapy-appointments-table"
    :items-per-page="itemsPerPage"
  >
    <template #no-data>
      <v-empty-state
        headline="Aún no hay citas asociadas"
        text="No hay citas registradas para esta selección."
        icon="mdi-calendar-search"
      />
    </template>
    <template #item.estado="{ value }">
      <v-chip size="small" variant="tonal" :color="statusColor(value)">
        {{ value || "pendiente" }}
      </v-chip>
    </template>
    <template #item.notas="{ item }">
      <div v-if="item.rescheduleRequested">
        <strong>El profesional solicitó otro horario</strong>
        <p class="text-pre-wrap">{{ item.cancellationReason }}</p>
      </div>
      <span v-else>{{ item.notas }}</span>
    </template>
    <template #item.summary="{ item }">
      <v-btn v-if="item.sessionSummary || item.attendanceUpdatedAt || item.completedAt" class="pf-btn-secondary" @click="openAttendance(item)">{{ item.sessionSummary ? 'Ver resumen' : 'Ver atención' }}</v-btn>
      <span v-else class="text-caption">Sin resumen compartido</span>
    </template>
    <template #item.meetingUrl="{ item }">
      <a
        v-if="item.meetingUrl"
        :href="item.meetingUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="session-link"
      >
        Enlace listo
      </a>
      <v-chip v-else size="small" variant="tonal" color="secondary">
        Pendiente
      </v-chip>
    </template>
  </v-data-table>
  <v-dialog :model-value="Boolean(selected)" max-width="640" @update:model-value="selected = null">
    <v-card v-if="selected" class="card-backgoundcustom pa-4">
      <v-card-title class="text-wrap">Resumen compartido de sesión</v-card-title>
      <v-card-text>
        <p>{{ selected.pacienteNombre }} · {{ selected.terapiaId }}</p>
        <p>{{ selected.fecha }} · {{ selected.hora }} · hora de Lima</p>
        <p v-if="selected.attendedAt">Atención: {{ formatAgendaInstant(selected.attendedAt) }}</p>
        <p v-else>Fecha de atención no registrada.</p>
        <p class="my-4 text-pre-wrap">{{ selected.sessionSummary }}</p>
        <p v-if="selected.completedAt">Registrado: {{ formatAgendaInstant(selected.completedAt) }}</p>
        <p v-if="selected.completedBy">Autor: {{ recordingAuthor }}</p>
        <h3 class="text-subtitle-1 mt-5">Historial de registros y correcciones</h3>
        <v-progress-linear v-if="loadingRevisions" indeterminate />
        <v-alert v-if="revisionError" type="error">{{ revisionError }}<v-btn @click="loadRevisions">Reintentar</v-btn></v-alert>
        <p v-if="!loadingRevisions && !revisionError && !revisions.length">No hay registros de corrección disponibles para esta cita.</p>
        <article v-for="revision in revisions" :key="revision.id" class="mt-4 pa-3 border rounded">
          <p class="font-weight-bold">{{ revision.title }}</p>
          <p>{{ formatAgendaInstant(revision.change.recordedAt) }} · Autor: {{ revision.authorName }}</p>
          <p v-if="revision.change.reason">Motivo: {{ revision.change.reason }}</p>
          <template v-if="revision.change.action !== 'complete'">
            <p class="mt-2 font-weight-bold">Registro anterior</p>
            <p>Estado: {{ revision.change.before.status }} · Atención: {{ revision.change.before.attendedAt ? formatAgendaInstant(revision.change.before.attendedAt) : 'No registrada' }}</p>
            <p class="text-pre-wrap">{{ revision.change.before.sessionSummary || 'Sin resumen compartido' }}</p>
          </template>
          <p class="mt-2 font-weight-bold">Registro guardado</p>
          <p>Estado: {{ revision.change.after.status }} · Atención: {{ revision.change.after.attendedAt ? formatAgendaInstant(revision.change.after.attendedAt) : 'No registrada' }}</p>
          <p class="text-pre-wrap">{{ revision.change.after.sessionSummary || 'Sin resumen compartido' }}</p>
        </article>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn class="pf-btn-ghost" @click="selected = null">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { AGENDA_NOTICE, agendaPresentation, formatAgendaInstant } from "@/utils/dateTime";
import { computed, ref, watch } from "vue";
import { getLongitudinalHistoryByTherapy } from "@/services/longitudinalHistoryService";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const selected = ref(null);
const auth = useAuthStore();
const revisions = ref([]);
const loadingRevisions = ref(false);
const revisionError = ref("");
const recordingAuthor = computed(() => revisions.value.find(item => item.change.action === "complete")?.authorName || selected.value?.completedBy || "");
let revisionGeneration = 0;
function openAttendance(item) { selected.value = item; loadRevisions(); }
async function loadRevisions() {
  const ticket = ++revisionGeneration;
  const item = selected.value;
  revisions.value = [];
  revisionError.value = "";
  if (!item?.terapiaId) { loadingRevisions.value = false; return; }
  loadingRevisions.value = true;
  try {
    const history = await getLongitudinalHistoryByTherapy(item.terapiaId);
    if (ticket !== revisionGeneration) return;
    revisions.value = history.filter(event => event.sourceId === item.citaId && event.metadata?.attendanceChange)
      .map(event => ({id: event.id, title: event.title, authorName: event.terapeutaNombre || event.metadata.attendanceChange.actorUid, change: event.metadata.attendanceChange}));
  } catch {
    if (ticket === revisionGeneration) revisionError.value = "No se pudo cargar el historial de atención.";
  } finally {
    if (ticket === revisionGeneration) loadingRevisions.value = false;
  }
}

const props = defineProps({
  appointments: {
    type: Array,
    default: () => [],
  },
});

const headers = [
  { title: "Paciente / terapia", value: "context" },
  { title: "Fecha", value: "fecha" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Modalidad", value: "modalidad" },
  { title: "Enlace de sesión", value: "meetingUrl", sortable: false },
  { title: "Notas", value: "notas" },
  { title: "Resumen compartido", key: "summary", sortable: false },
];

const itemsPerPage = computed(() =>
  appContext.activeMode === "patient" ? 25 : 10
);

const appointmentItems = computed(() =>
  props.appointments.map(agendaPresentation).map((appointment) => ({
    ...appointment,
    context: [appointment.pacienteNombre, appointment.terapiaId].filter(Boolean).join(" · "),
    citaId:
      appointment.citaId ||
      `${appointment.fecha || "sin-fecha"}-${appointment.hora || "sin-hora"}`,
    fecha: appointment.fecha || "Sin fecha",
    hora: appointment.hora || "Sin hora",
    estado: appointment.estado || "pendiente",
    modalidad: appointment.modalidad || "No definida",
    meetingUrl: appointment.meetingUrl || "",
    notas: appointment.notas || "Sin notas",
  }))
);
watch(() => [props.appointments, appContext.activeMode, auth.currentUser?.uid, Boolean(selected.value)], (values, previous) => {
  if (!previous || values[0] !== previous[0] || values[1] !== previous[1] || values[2] !== previous[2] || !values[3]) {
    revisionGeneration++; selected.value = null; revisions.value = []; loadingRevisions.value = false; revisionError.value = "";
  }
}, { flush: "sync" });

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();

  if (normalized === "confirmada") return "success";
  if (normalized === "cancelada" || normalized === "finalizado") return "error";
  if (normalized === "realizada" || normalized === "completada") return "primary";
  return "secondary";
}
</script>

<style scoped>
.session-link {
  color: rgb(var(--v-theme-secondary));
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.session-link:hover,
.session-link:focus-visible {
  color: rgb(var(--v-theme-primary));
}
</style>

<template>
  <LayoutDefault layout>
    <v-container class="pa-0">
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4">
        <div>
          <h1 class="text-h4 font-weight-bold">Historial longitudinal</h1>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
            {{ pageSubtitle }}
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loadingHistory"
          class="align-self-start"
          @click="loadHistory"
        >
          Actualizar
        </v-btn>
      </div>

      <v-alert
        v-if="historyError"
        class="my-5"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ historyError }}
      </v-alert>

      <v-card class="pa-4 mt-5 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
          <v-icon color="secondary">mdi-timeline-text-outline</v-icon>
          Línea de tiempo
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <div v-if="loadingHistory" class="py-8 d-flex justify-center">
            <v-progress-circular indeterminate color="secondary" />
          </div>

          <v-empty-state
            v-else-if="historyEvents.length === 0"
            headline="Aun no hay eventos longitudinales"
            text="Cuando agendes, confirmes o completes sesiones, apareceran aqui como parte de tu proceso."
            icon="mdi-timeline-clock-outline"
          ></v-empty-state>

          <v-timeline v-else class="history-timeline" side="end" density="compact">
            <v-timeline-item
              v-for="event in historyEvents"
              :key="event.id"
              :dot-color="eventColor(event.eventType)"
              size="small"
            >
              <v-card
                class="history-event-card card-backgoundcustom pa-1"
                elevation="2"
                variant="text"
              >
                <v-card-title class="text-subtitle-1 font-weight-bold">
                  {{ event.title || eventLabel(event.eventType) }}
                </v-card-title>
                <v-card-subtitle class="text-medium-emphasis">
                  {{ formatEventDate(event.occurredAt) }}
                </v-card-subtitle>
                <v-card-text>
                  <p class="mb-3">
                    {{ event.summary || "Evento registrado en tu historial." }}
                  </p>
                  <div class="d-flex flex-wrap ga-2">
                    <v-chip
                      v-if="event.pacienteNombre || event.metadata?.pacienteNombre"
                      size="small"
                      color="secondary"
                      variant="tonal"
                    >
                      {{ event.pacienteNombre || event.metadata.pacienteNombre }}
                    </v-chip>
                    <v-chip
                      v-if="event.metadata?.terapeutaNombre"
                      size="small"
                      color="secondary"
                      variant="tonal"
                    >
                      {{ event.metadata.terapeutaNombre }}
                    </v-chip>
                    <v-chip
                      v-if="event.metadata?.fecha"
                      size="small"
                      color="info"
                      variant="tonal"
                    >
                      {{ event.metadata.fecha }}
                      {{ event.metadata?.hora ? `• ${event.metadata.hora}` : "" }}
                    </v-chip>
                    <v-chip size="small" :color="eventColor(event.eventType)" variant="tonal">
                      {{ eventLabel(event.eventType) }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
      </v-card>

      <v-card class="pa-4 mt-6 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
          <v-icon color="secondary">mdi-clipboard-text-clock-outline</v-icon>
          Terapias registradas
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>
          <TerapiasDatatable v-if="!isPsychologistMode" />
          <v-empty-state
            v-else
            headline="Vista de psicólogo"
            text="El seguimiento de terapias asignadas se muestra en la línea de tiempo superior."
            icon="mdi-account-tie-outline"
          ></v-empty-state>
        </v-card-text>
      </v-card>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import TerapiasDatatable from "@/components/Terapias/TerapiasDatatable.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getTherapiesByTherapist } from "@/services/terapiaService";
import {
  getLongitudinalHistoryByPatient,
  getLongitudinalHistoryByTherapy,
} from "@/services/longitudinalHistoryService";

const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const historyEvents = ref([]);
const loadingHistory = ref(false);
const historyError = ref("");

const isPsychologistMode = computed(
  () => appContext.activeMode === "psychologist"
);

const pageSubtitle = computed(() =>
  isPsychologistMode.value
    ? "Eventos relevantes de pacientes asignados registrados por la plataforma."
    : "Eventos relevantes de tu proceso terapeutico registrados por la plataforma."
);

async function loadHistory() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    historyEvents.value = [];
    return;
  }

  loadingHistory.value = true;
  historyError.value = "";

  try {
    if (isPsychologistMode.value) {
      historyEvents.value = await loadTherapistHistory(uid);
    } else {
      historyEvents.value = await getLongitudinalHistoryByPatient(uid);
    }
  } catch (error) {
    console.error("Error loading longitudinal history:", error);
    historyError.value =
      error?.message || "No pudimos cargar tu historial longitudinal.";
    historyEvents.value = [];
  } finally {
    loadingHistory.value = false;
  }
}

async function loadTherapistHistory(uid) {
  const therapist = await getTherapistByUserUid(uid);

  if (!therapist?.id) {
    return [];
  }

  const therapies = await getTherapiesByTherapist(therapist.id);
  const historyGroups = await Promise.all(
    therapies.map(async (therapy) => {
      const events = await getLongitudinalHistoryByTherapy(therapy.id);
      return events.map((event) => ({
        ...event,
        pacienteNombre: therapy.pacienteNombre || event.pacienteNombre || "",
      }));
    })
  );

  return historyGroups
    .flat()
    .sort((a, b) => toDate(b.occurredAt) - toDate(a.occurredAt));
}

function formatEventDate(value) {
  const date = toDate(value);

  if (!date) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventLabel(eventType) {
  const labels = {
    appointment_created: "Cita agendada",
    appointment_rescheduled: "Cita reprogramada",
    appointment_meeting_link_updated: "Enlace actualizado",
    appointment_updated: "Cita actualizada",
    appointment_confirmed: "Cita confirmada",
    appointment_completed: "Sesión realizada",
    appointment_pending: "Cita pendiente",
    exercise_assigned: "Ejercicio asignado",
    exercise_completed: "Ejercicio completado",
    goal_created: "Objetivo creado",
    goal_updated: "Objetivo actualizado",
    goal_achieved: "Objetivo alcanzado",
    emotional_checkin_created: "Registro emocional",
  };

  return labels[eventType] || "Evento";
}

function eventColor(eventType) {
  if (eventType === "appointment_completed") return "success";
  if (eventType === "appointment_confirmed") return "success";
  if (eventType === "appointment_meeting_link_updated") return "secondary";
  if (eventType === "appointment_rescheduled") return "warning";
  if (eventType === "exercise_completed") return "success";
  if (eventType === "emotional_checkin_created") return "info";
  return "secondary";
}

watch(
  () => [currentUser.value?.uid, appContext.activeMode],
  () => {
    loadHistory();
  },
  { immediate: true }
);
</script>

<style scoped>
.history-event-card {
  border-radius: 8px;
}

@media (max-width: 599px) {
  .history-timeline :deep(.v-timeline-item__body) {
    padding-inline-start: 10px;
  }

  .history-event-card :deep(.v-card-title) {
    font-size: 0.98rem;
    line-height: 1.28;
  }

  .history-event-card :deep(.v-card-text) {
    font-size: 0.88rem;
  }
}
</style>

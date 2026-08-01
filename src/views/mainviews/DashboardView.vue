<template>
  <LayoutDefault layout>
    <div class="dashboard-shell">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Inicio
            </p>
            <h1 class="text-h4 font-weight-bold">Bienvenido, {{ username }}</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Revisa tu proceso, próximas sesiones y avances recientes.
            </p>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-skeleton-loader
        v-if="!therapiesReady"
        class="card-backgoundcustom"
        type="heading, paragraph, actions"
      />

      <template v-else-if="activeTherapy">
        <v-card
          class="progress-summary-card pa-4 card-backgoundcustom"
          elevation="2"
          variant="text"
        >
          <v-card-title
            class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0"
          >
            <v-icon color="secondary" size="small">mdi-chart-line</v-icon>
            Tu progreso
          </v-card-title>
          <v-card-subtitle class="px-0 pb-1 text-body-2">
            Un resumen de la continuidad de tu proceso terapéutico.
          </v-card-subtitle>
          <v-card-text class="px-0 pb-0">
            <v-divider class="mb-2" />
            <v-row class="progress-summary-stats" align="stretch">
              <v-col cols="12" sm="4">
                <div class="progress-summary-stat">
                  <v-avatar color="secondary" variant="tonal" rounded="lg">
                    <v-icon>mdi-calendar-clock-outline</v-icon>
                  </v-avatar>
                  <div>
                    <p class="progress-summary-stat__value mb-0">
                      {{ upcomingSessionsCount }}
                    </p>
                    <p class="text-body-2 text-medium-emphasis mb-0">
                      Sesiones agendadas
                    </p>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" sm="4">
                <div class="progress-summary-stat">
                  <v-avatar color="warning" variant="tonal" rounded="lg">
                    <v-icon>mdi-tools</v-icon>
                  </v-avatar>
                  <div>
                    <p class="progress-summary-stat__value mb-0">
                      {{ learnedToolsCount }}
                    </p>
                    <p class="text-body-2 text-medium-emphasis mb-0">
                      Herramientas aprendidas
                    </p>
                  </div>
                </div>
              </v-col>

              <v-col cols="12" sm="4">
                <div class="progress-summary-stat">
                  <v-avatar color="success" variant="tonal" rounded="lg">
                    <v-icon>mdi-check-circle-outline</v-icon>
                  </v-avatar>
                  <div>
                    <p class="progress-summary-stat__value mb-0">
                      {{ completedSessionsCount }}
                    </p>
                    <p class="text-body-2 text-medium-emphasis mb-0">
                      Sesiones tomadas
                    </p>
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-divider />
            <v-card-actions class="px-0 pt-4 pb-0">
              <v-btn
                class="pf-btn-secondary"
                to="/progreso"
                append-icon="mdi-arrow-right"
              >
                Ver progreso
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>

        <v-card
          v-if="!nextAppointment"
          class="pa-2 my-5 card-backgoundcustom clickable-card"
          elevation="2"
          variant="text"
          @click="openScheduleDialog"
        >
          <v-card-title class="text-h5">
            Agenda una sesión <v-icon size="small">mdi-open-in-new</v-icon>
          </v-card-title>
          <v-card-text>
            <v-divider />
            <v-list-item class="pt-5 px-0">
              <v-list-item-title>
                {{
                  nextAppointment
                    ? `Ya tienes una terapia con ${nextAppointment.terapeutaNombre}`
                    : "No tienes una sesión agendada"
                }}
              </v-list-item-title>
              <v-list-item-subtitle>
                Haz click aquí para revisar la agenda de tu terapeuta y agendar
                una sesión
              </v-list-item-subtitle>
            </v-list-item>
          </v-card-text>
        </v-card>

        <NextAppointmentCard
          v-if="nextAppointment"
          class="my-5"
          :appointment="nextAppointment"
          :reschedulable="Boolean(editableAppointment)"
          @reschedule="openRescheduleDialog"
        />

        <ActiveTherapySummaryCard
          :therapy="activeTherapy"
          :therapist="activeTherapist"
          :main-reason="mainReason"
          :loading-therapist="loadingTherapist"
          :learned-tools-count="learnedToolsCount"
        />
      </template>

      <v-card
        v-else
        id="container"
        class="pa-6 card-backgoundcustom"
        elevation="2"
      >
        <v-card-item>
          <v-card-title class="text-h5">Aún no tienes una cita</v-card-title>
          <v-card-subtitle>
            Cuéntanos qué estás buscando para sugerirte psicólogos afines y
            agendar tu primera sesión.
          </v-card-subtitle>
        </v-card-item>
        <v-card-text class="pt-6">
          <v-btn
            color="secondary"
            size="large"
            to="/encuesta"
            class="pf-btn-secondary"
          >
            Encontrar terapeuta
          </v-btn>
        </v-card-text>
      </v-card>

      <CitaDialog
        v-model="dialog"
        :terapia-id="dialogAppointment?.terapiaId || activeTherapy?.id || ''"
        :terapeuta-id="dialogAppointment?.terapeutaId || activeTherapy?.terapeutaId || ''"
        :terapeuta-nombre="dialogAppointment?.terapeutaNombre || activeTherapy?.terapeutaNombre || ''"
        :cita-id="dialogAppointment?.citaId || ''"
        :initial-appointment="dialogAppointment || {}"
        :redirect-on-save="false"
        @saved="handleDialogSaved"
      />
    </div>
  </LayoutDefault>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import NextAppointmentCard from "@/components/Terapias/NextAppointmentCard.vue";
import ActiveTherapySummaryCard from "@/components/Terapias/ActiveTherapySummaryCard.vue";
import { useAuthStore } from "@/store/auth";
import { getProfileByUserId } from "@/services/userService";
import { getTherapistById } from "@/services/psicologoService";
import { getExercisesByPatient } from "@/services/exerciseService";
import { getTherapiesByPatient } from "@/services/terapiaService";

const authStore = useAuthStore();
const { currentUser, userName: username } = storeToRefs(authStore);
const therapiesReady = ref(false);
const activeTherapyData = ref(null);
const therapies = ref([]);
const exercises = ref([]);
const profile = ref(null);
const activeTherapist = ref(null);
const loadingTherapist = ref(false);
const dialog = ref(false);
const dialogAppointment = ref(null);

let therapistRequestId = 0;
let profileRequestId = 0;

const activeTherapy = computed(() => activeTherapyData.value);

const allAppointments = computed(() =>
  therapies.value.flatMap((therapy) =>
    (Array.isArray(therapy.citas) ? therapy.citas : []).map((appointment) => ({
      ...appointment,
      terapeutaNombre: therapy.terapeutaNombre,
    }))
  )
);

const completedAppointments = computed(() =>
  allAppointments.value.filter((appointment) => {
    const status = (appointment?.estado || "").toString().trim().toLowerCase();
    return status === "realizada" || status === "completada";
  })
);

const completedSessionsCount = computed(
  () => completedAppointments.value.length
);

const learnedToolsCount = computed(() =>
  exercises.value.filter(
    (exercise) =>
      exercise?.terapiaId === activeTherapy.value?.id &&
      (exercise?.status || "").toString().trim().toLowerCase() === "completed"
  ).length
);

const mainReason = computed(() => {
  const reason = profile.value?.motivoConsulta?.toString().trim();
  return reason || "En exploración";
});

function parseAppointmentDate(appointment) {
  if (!appointment?.fecha) return null;

  const rawDate = appointment.hora
    ? `${appointment.fecha}T${appointment.hora}`
    : `${appointment.fecha}T00:00`;

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const nextAppointment = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = therapies.value
    .flatMap((therapy) =>
      (Array.isArray(therapy.citas) ? therapy.citas : []).map((appointment) => ({
        ...appointment,
        terapiaId: therapy.id,
        terapeutaId: therapy.terapeutaId,
        terapeutaNombre: therapy.terapeutaNombre,
      }))
    )
    .filter((appointment) => {
      const status = (appointment?.estado || "")
        .toString()
        .trim()
        .toLowerCase();
      return (
        (status === "pendiente" || status === "confirmada") &&
        parseAppointmentDate(appointment) &&
        parseAppointmentDate(appointment) >= today
      );
    })
    .sort((a, b) => parseAppointmentDate(a) - parseAppointmentDate(b));

  return appointments[0] || null;
});

const editableAppointment = computed(() => {
  if (!nextAppointment.value) return null;

  return {
    citaId: nextAppointment.value.citaId || "",
    terapiaId: nextAppointment.value.terapiaId || "",
    terapeutaId: nextAppointment.value.terapeutaId || "",
    terapeutaNombre: nextAppointment.value.terapeutaNombre || "",
    fecha: nextAppointment.value.fecha || "",
    hora: nextAppointment.value.hora || "",
    notas: nextAppointment.value.notas || "",
    modalidad: nextAppointment.value.modalidad || "",
    ubicacion: nextAppointment.value.ubicacion || "",
    meetingProvider: nextAppointment.value.meetingProvider || "",
    meetingUrl: nextAppointment.value.meetingUrl || "",
  };
});

const upcomingSessionsCount = computed(
  () =>
    allAppointments.value.filter((appointment) => {
      const status = (appointment?.estado || "")
        .toString()
        .trim()
        .toLowerCase();
      return status === "pendiente" || status === "confirmada";
    }).length
);

function openScheduleDialog() {
  dialogAppointment.value = null;
  dialog.value = true;
}

function openRescheduleDialog() {
  if (!editableAppointment.value) return;
  dialogAppointment.value = { ...editableAppointment.value };
  dialog.value = true;
}

function handleDialogSaved() {
  dialogAppointment.value = null;
  loadActiveTherapy();
}

async function loadActiveTherapy() {
  const pacienteUid = currentUser.value?.uid;

  if (!pacienteUid) {
    activeTherapyData.value = null;
    therapies.value = [];
    exercises.value = [];
    therapiesReady.value = true;
    return;
  }

  try {
    const [patientTherapies, patientExercises] = await Promise.all([
      getTherapiesByPatient(pacienteUid),
      getExercisesByPatient(pacienteUid),
    ]);

    activeTherapyData.value = patientTherapies.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null;
    therapies.value = patientTherapies;
    exercises.value = patientExercises;
  } catch (error) {
    console.error("Error loading active therapy for dashboard:", error);
    activeTherapyData.value = null;
    therapies.value = [];
    exercises.value = [];
  } finally {
    therapiesReady.value = true;
  }
}

watch(
  () => currentUser.value?.uid,
  async (uid) => {
    const requestId = ++profileRequestId;
    profile.value = null;
    dialogAppointment.value = null;
    therapiesReady.value = false;
    loadActiveTherapy();

    if (uid) {
      try {
        const item = await getProfileByUserId(uid);
        if (requestId === profileRequestId) {
          profile.value = item;
        }
      } catch (error) {
        console.error("Error loading profile for dashboard:", error);
        if (requestId === profileRequestId) {
          profile.value = null;
        }
      }
    }
  },
  { immediate: true }
);

watch(
  () => activeTherapy.value?.terapeutaId,
  async (therapistId) => {
    const requestId = ++therapistRequestId;
    activeTherapist.value = null;

    if (!therapistId) {
      loadingTherapist.value = false;
      return;
    }

    loadingTherapist.value = true;

    try {
      const therapist = await getTherapistById(therapistId);

      if (requestId === therapistRequestId) {
        activeTherapist.value = therapist;
      }
    } catch (error) {
      console.error("Error loading therapist for dashboard:", error);

      if (requestId === therapistRequestId) {
        activeTherapist.value = null;
      }
    } finally {
      if (requestId === therapistRequestId) {
        loadingTherapist.value = false;
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  profileRequestId += 1;
  therapistRequestId += 1;
});
</script>

<style scoped>
.dashboard-shell {
  width: 100%;
}

.progress-summary-card {
  overflow: hidden;
}

.progress-summary-stats {
  padding-block: 12px;
}

.progress-summary-stat {
  align-items: center;
  display: flex;
  gap: 14px;
  min-height: 72px;
  padding: 4px 10px;
}

.progress-summary-stats .v-col + .v-col .progress-summary-stat {
  border-left: 1px solid rgba(var(--v-theme-border-subtle), 0.4);
}

.progress-summary-stat__value {
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.15;
}

@media (max-width: 599px) {
  .dashboard-shell {
    padding-inline: 0;
  }

  .dashboard-shell :deep(.v-card) {
    width: 100%;
  }

  .dashboard-shell :deep(.v-card-title) {
    white-space: normal;
  }

  .dashboard-shell :deep(.v-list-item) {
    padding-inline: 0;
  }

  .progress-summary-stats .v-col + .v-col .progress-summary-stat {
    border-left: 0;
    border-top: 1px solid rgba(var(--v-theme-border-subtle), 0.4);
  }
}
</style>

<template>
  <LayoutDefault layout>
    <div class="dashboard-shell">
      <h1 class="text-h4">Bienvenido, {{ username }}</h1>
      <v-divider class="my-5 mx-auto"></v-divider>

      <template v-if="activeTherapy">
        <v-card class="pa-2 card-backgoundcustom" elevation="2">
          <v-card-item>
            <v-card-title class="text-h5"> Tu progreso </v-card-title>
            <v-card-subtitle>
              Te felicitamos por seguir con tu terapia, aqui tienes algunos datos
              relevantes:
            </v-card-subtitle>
          </v-card-item>
          <v-card-text class="pb-0">
            <v-row class="text-center py-5">
              <v-col cols="12" sm="4">
                <div>
                  <h3 class="text-h4">{{ upcomingSessionsCount }}</h3>
                  <p>Sesiones agendadas</p>
                </div>
              </v-col>
              <v-col cols="12" sm="4">
                <div>
                  <h3 class="text-h4">{{ learnedToolsCount }}</h3>
                  <p>Herramientas aprendidas</p>
                </div>
              </v-col>
              <v-col cols="12" sm="4">
                <div>
                  <h3 class="text-h4">{{ completedSessionsCount }}</h3>
                  <p>Sesiones tomadas</p>
                </div>
              </v-col>
            </v-row>
            <v-divider></v-divider>
            <v-card-actions class="my-2">
              <v-btn color="" class="px-3" rounded="sm" variant="text"
                >Mas infromación</v-btn
              >
            </v-card-actions>
          </v-card-text>
        </v-card>

        <v-card
          v-if="!hasScheduledAppointments && activeTherapy"
          class="pa-2 my-5 card-backgoundcustom clickable-card"
          elevation="2"
          variant="text"
          @click="dialog = true"
        >
          <v-card-title class="text-h5">
            Agenda una sesión <v-icon size="small">mdi-open-in-new</v-icon>
          </v-card-title>
          <v-card-text>
            <v-divider></v-divider>
            <v-list-item class="pt-5 px-0">
              <v-list-item-title>
                {{
                  nextAppointment
                    ? `Ya tienes una terapia con ${nextAppointment.terapeutaNombre}`
                    : "No tienes una sesión agendada"
                }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{
                  nextAppointment
                    ? "Haz click aquí para revisar la agenda de tu terapeuta y agendar una sesión"
                    : "Haz click aquí para revisar la agenda de tu terapeuta y agendar una sesión"
                }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-card-text>
        </v-card>

        <v-row v-if="hasScheduledAppointments" align="stretch">
          <v-col cols="12" md="4" class="d-flex">
            <v-card
              class="pa-2 my-5 card-backgoundcustom flex-grow-1 d-flex flex-column"
              elevation="2"
              variant="text"
            >
              <v-card-title class="text-h5"> <v-icon size="small">mdi-calendar-clock</v-icon> Proxima sesión </v-card-title>
              <v-card-text>
                <v-divider></v-divider>
                <v-list-item class="dashboard-list-item mx-auto pt-5">
                  <template v-slot:prepend>
                    <h4 class="appointment-day">{{ nextAppointmentDay }}</h4>
                  </template>
                  <v-list-item-title class="pl-5">{{ nextAppointmentMonth }}</v-list-item-title>
                  <v-list-item-subtitle class="pl-5"
                    >{{ nextAppointmentYear }}{{ nextAppointment?.hora ? ` • ${nextAppointment.hora}` : "" }}</v-list-item-subtitle
                  >
                </v-list-item>
                <v-alert
                  v-if="isNextAppointmentRemote"
                  class="mt-4"
                  :color="nextAppointmentMeetingUrl ? 'secondary' : 'warning'"
                  variant="tonal"
                  density="compact"
                  icon="mdi-video-outline"
                >
                  {{
                    nextAppointmentMeetingUrl
                      ? "El enlace de tu sesión ya está disponible."
                      : "El psicólogo agregará aquí el enlace de la sesión."
                  }}
                  <div v-if="nextAppointmentMeetingUrl" class="mt-2">
                    <v-btn
                      :href="nextAppointmentMeetingUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      color="secondary"
                      variant="flat"
                      size="small"
                      prepend-icon="mdi-open-in-new"
                    >
                      Entrar
                    </v-btn>
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="8" class="d-flex">
            <v-card
              class="pa-2 my-5 card-backgoundcustom flex-grow-1 d-flex flex-column"
              elevation="2"
              variant="text"
            >
              <v-card-title class="text-h5">
                Tu terapeuta <v-icon size="small">mdi-open-in-new</v-icon>
              </v-card-title>
              <v-card-text>
                <v-divider></v-divider>
                <v-list-item class="dashboard-list-item pt-5">
                  <template v-slot:prepend>
                    <v-avatar
                      color="white"
                      image="https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortCurly&accessoriesType=Prescription02&hairColor=Black&facialHairType=Blank&clotheType=Hoodie&clotheColor=White&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Default&skinColor=Light"
                    ></v-avatar>
                  </template>
                  <v-list-item-title>{{ activeTherapy.terapeutaNombre || "Terapeuta asignado" }}</v-list-item-title>
                  <v-list-item-subtitle
                    >Tu terapia se encuentra activa.</v-list-item-subtitle
                  >
                </v-list-item>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <v-card
        v-else
        class="pa-6 card-backgoundcustom"
        id="container"
        elevation="2"
      >
        <v-card-item>
          <v-card-title class="text-h5">Aun no tienes una cita</v-card-title>
          <v-card-subtitle>
            Encuentra un terapeuta para iniciar tu proceso y agendar tu primera sesion.
          </v-card-subtitle>
        </v-card-item>
        <v-card-text class="pt-6">
          <v-btn color="secondary" size="large" to="/encuesta">
            Encontrar terapeuta
          </v-btn>
        </v-card-text>
      </v-card>

      <CitaDialog
        v-model="dialog"
        :terapia-id="activeTherapy?.id || ''"
        :terapeuta-id="activeTherapy?.terapeutaId || ''"
        :terapeuta-nombre="activeTherapy?.terapeutaNombre || ''"
        :redirect-on-save="false"
        @saved="loadActiveTherapy"
      />
    </div>
  </LayoutDefault>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { useAuthStore } from "@/store/auth";
import { getActiveTherapyByPatient, getTherapiesByPatient } from "@/services/terapiaService";

const authStore = useAuthStore();
const { currentUser, userName: username } = storeToRefs(authStore);
const therapiesReady = ref(false);
const activeTherapyData = ref(null);
const therapies = ref([]);
const dialog = ref(false);

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

const completedSessionsCount = computed(() => completedAppointments.value.length);

const learnedToolsCount = computed(() => {
  // Mientras no exista un campo estructurado de herramientas, usamos las notas
  // registradas en sesiones realizadas como aproximacion.
  const tools = new Set();

  completedAppointments.value.forEach((appointment) => {
    const note = (appointment?.notas || "").toString().trim();

    if (!note) {
      return;
    }

    note
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .forEach((item) => tools.add(item));
  });

  return tools.size;
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
  const appointments = therapies.value
    .flatMap((therapy) =>
      (Array.isArray(therapy.citas) ? therapy.citas : []).map((appointment) => ({
        ...appointment,
        terapeutaNombre: therapy.terapeutaNombre,
      }))
    )
    .filter((appointment) => {
      const status = (appointment?.estado || "").toString().trim().toLowerCase();
      return (status === "pendiente" || status === "confirmada") && parseAppointmentDate(appointment);
    })
    .sort((a, b) => parseAppointmentDate(a) - parseAppointmentDate(b));

  return appointments[0] || null;
});

const nextAppointmentDay = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date ? String(date.getDate()).padStart(2, "0") : "--";
});

const nextAppointmentMonth = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date
    ? date.toLocaleDateString("es-PE", { month: "long" })
    : "Sin fecha";
});

const nextAppointmentYear = computed(() => {
  const date = parseAppointmentDate(nextAppointment.value);
  return date ? date.getFullYear() : "";
});

const isNextAppointmentRemote = computed(() => {
  const mode = (nextAppointment.value?.modalidad || "")
    .toString()
    .trim()
    .toLowerCase();

  return ["remoto", "online", "remota"].includes(mode);
});

const nextAppointmentMeetingUrl = computed(
  () => nextAppointment.value?.meetingUrl || ""
);

const hasScheduledAppointments = computed(() =>
  therapies.value.some((therapy) =>
    (Array.isArray(therapy.citas) ? therapy.citas : []).some((appointment) => {
      const status = (appointment?.estado || "")
        .toString()
        .trim()
        .toLowerCase();
      return status === "pendiente" || status === "confirmada";
    })
  )
);

const upcomingSessionsCount = computed(() =>
  allAppointments.value.filter((appointment) => {
    const status = (appointment?.estado || "").toString().trim().toLowerCase();
    return status === "pendiente" || status === "confirmada";
  }).length
);

async function loadActiveTherapy() {
  const pacienteUid = currentUser.value?.uid;

  if (!pacienteUid) {
    activeTherapyData.value = null;
    therapies.value = [];
    therapiesReady.value = true;
    return;
  }

  try {
    const [activeTherapy, patientTherapies] = await Promise.all([
      getActiveTherapyByPatient(pacienteUid),
      getTherapiesByPatient(pacienteUid),
    ]);

    activeTherapyData.value = activeTherapy;
    therapies.value = patientTherapies;
  } catch (error) {
    console.error("Error loading active therapy for dashboard:", error);
    activeTherapyData.value = null;
    therapies.value = [];
  } finally {
    therapiesReady.value = true;
  }
}

watch(
  () => currentUser.value?.uid,
  () => {
    therapiesReady.value = false;
    loadActiveTherapy();
  },
  { immediate: true }
);
</script>

<style scoped>
.dashboard-shell {
  width: 100%;
}

.dashboard-list-item {
  max-width: 100%;
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
}
</style>

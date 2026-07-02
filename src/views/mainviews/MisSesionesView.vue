<template>
  <LayoutDefault layout>
    <v-container class="pa-0">
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4 mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold">Mis sesiones</h1>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
            Revisa tu próxima cita, modalidad y acciones disponibles.
          </p>
        </div>
        <v-btn
          v-if="activeTherapy"
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-calendar-plus-outline"
          class="align-self-start"
          @click="dialog = true"
        >
          Agendar
        </v-btn>
      </div>

      <v-card
        v-if="!hasScheduledAppointments && activeTherapy"
        class="pa-4 mb-5 card-backgoundcustom session-card"
        elevation="2"
        variant="text"
        @click="dialog = true"
      >
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
          <v-icon color="secondary">mdi-calendar-plus-outline</v-icon>
          Agenda una sesión
        </v-card-title>
        <v-card-text>
          <v-list-item class="px-0">
            <v-list-item-title>
              {{
                nextAppointment
                  ? `Ya tienes una terapia con ${nextAppointment.terapeutaNombre}`
                  : "No tienes una sesión agendada"
              }}
            </v-list-item-title>
            <v-list-item-subtitle>
              Revisa la agenda de tu terapeuta y elige un horario disponible.
            </v-list-item-subtitle>
            <template #append>
              <v-icon color="secondary">mdi-arrow-right</v-icon>
            </template>
          </v-list-item>
        </v-card-text>
      </v-card>

      <v-row v-if="hasScheduledAppointments" align="stretch" class="mb-5">
        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 d-flex flex-column session-card"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
              <v-icon color="secondary">mdi-calendar-clock</v-icon>
              Próxima sesión
            </v-card-title>
            <v-card-text class="pt-2">
              <v-list-item class="session-date px-0">
                <template #prepend>
                  <div class="session-day">
                    {{ nextAppointmentDay }}
                  </div>
                </template>
                <v-list-item-title class="font-weight-bold text-capitalize">
                  {{ nextAppointmentMonth }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ nextAppointmentYear }}
                  {{ nextAppointment?.hora ? `• ${nextAppointment.hora}` : "" }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 d-flex flex-column session-card"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
              <v-icon color="secondary">mdi-map-marker-radius</v-icon>
              Ubicación
            </v-card-title>
            <v-card-text class="pt-2">
              <v-list-item class="px-0">
                <v-list-item-title>{{
                  nextAppointmentLocation
                }}</v-list-item-title>
                <v-list-item-subtitle>{{
                  nextAppointmentMode
                }}</v-list-item-subtitle>
              </v-list-item>

              <v-alert
                v-if="isNextAppointmentRemote"
                class="mt-4"
                :color="nextAppointmentMeetingUrl ? 'secondary' : 'warning'"
                variant="tonal"
                icon="mdi-video-outline"
              >
                <div class="d-flex flex-column ga-2">
                  <span>
                    {{
                      nextAppointmentMeetingUrl
                        ? "Tu enlace de sesión ya está disponible."
                        : "Tu psicólogo agregará aquí el enlace de Zoom, Google Meet u otra herramienta."
                    }}
                  </span>
                  <v-btn
                    v-if="nextAppointmentMeetingUrl"
                    :href="nextAppointmentMeetingUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-open-in-new"
                    class="align-self-start"
                  >
                    Entrar a la sesión
                  </v-btn>
                </div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card
        class="pa-4 mb-5 card-backgoundcustom clickable-card session-card"
        :class="{ 'clickable-card--disabled': !editableAppointment }"
        elevation="2"
        variant="text"
        @click="openRescheduleDialog"
      >
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
          <v-icon color="secondary">mdi-calendar-edit-outline</v-icon>
          ¿Cambio de planes?
        </v-card-title>
        <v-card-text>
          <v-list-item class="px-0">
            <v-list-item-title>Reprograma tu sesión</v-list-item-title>
            <v-list-item-subtitle>
              {{
                editableAppointment
                  ? "Puedes cambiar el horario de tu cita pendiente o confirmada."
                  : "Aún no tienes una cita pendiente o confirmada para reprogramar."
              }}
            </v-list-item-subtitle>
            <template #append>
              <v-chip
                :color="editableAppointment ? 'secondary' : 'grey'"
                size="small"
                variant="tonal"
              >
                {{ editableAppointment ? "Disponible" : "No disponible" }}
              </v-chip>
            </template>
          </v-list-item>
        </v-card-text>
      </v-card>

      <v-row align="stretch">
        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 d-flex flex-column session-card"
            elevation="2"
            variant="text"
            to="/historial"
          >
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
              <v-icon color="secondary">mdi-file-document-multiple</v-icon>
              Historial de sesiones
            </v-card-title>
            <v-card-text>
              <v-list-item class="px-0">
                <v-list-item-title
                  >Revisa tus sesiones anteriores</v-list-item-title
                >
                <v-list-item-subtitle>
                  Consulta notas y herramientas aprendidas.
                </v-list-item-subtitle>
                <template #append>
                  <v-icon color="secondary">mdi-arrow-right</v-icon>
                </template>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 d-flex flex-column clickable-card session-card"
            :class="{ 'clickable-card--disabled': !activeTherapy?.id }"
            elevation="2"
            variant="text"
            @click="openActiveTherapy"
          >
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
              <v-icon color="secondary">mdi-archive-edit</v-icon>
              Ver tu proceso
            </v-card-title>
            <v-card-text>
              <v-list-item class="px-0">
                <v-list-item-title
                  >Consulta tu terapia activa</v-list-item-title
                >
                <v-list-item-subtitle>
                  Revisa objetivos, sesiones y seguimiento asociado.
                </v-list-item-subtitle>
                <template #append>
                  <v-icon :color="activeTherapy?.id ? 'secondary' : 'grey'">
                    mdi-arrow-right
                  </v-icon>
                </template>
              </v-list-item>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

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
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { useAuthStore } from "@/store/auth";
import { getTherapiesByPatient } from "@/services/terapiaService";

const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapies = ref([]);
const dialog = ref(false);
const dialogAppointment = ref(null);

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
      (Array.isArray(therapy.citas) ? therapy.citas : []).map(
        (appointment) => ({
          ...appointment,
          terapiaId: therapy.id,
          terapeutaId: therapy.terapeutaId,
          terapeutaNombre: therapy.terapeutaNombre,
        })
      )
    )
    .filter((appointment) => {
      const status = (appointment?.estado || "").toString().trim().toLowerCase();
      return (status === "pendiente" || status === "confirmada") && parseAppointmentDate(appointment);
    })
    .sort((a, b) => parseAppointmentDate(a) - parseAppointmentDate(b));

  return appointments[0] || null;
});

const editableAppointment = computed(() => {
  if (!nextAppointment.value) {
    return null;
  }

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

const activeTherapy = computed(
  () =>
    therapies.value.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null
);

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

const nextAppointmentLocation = computed(() => {
  if (!nextAppointment.value) return "Sin ubicación definida";
  return nextAppointment.value.ubicacion || "Sin ubicación definida";
});

const nextAppointmentMode = computed(() => {
  if (!nextAppointment.value) return "Aún no tienes una modalidad definida";
  return nextAppointment.value.modalidad || "Aún no tienes una modalidad definida";
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

function openRescheduleDialog() {
  if (!editableAppointment.value) {
    return;
  }

  dialogAppointment.value = { ...editableAppointment.value };
  dialog.value = true;
}

function handleDialogSaved() {
  dialogAppointment.value = null;
  loadTherapies();
}

function openActiveTherapy() {
  if (!activeTherapy.value?.id) {
    return;
  }

  router.push({
    path: "/terapiadetail",
    query: { id: activeTherapy.value.id },
  });
}

async function loadTherapies() {
  const pacienteUid = currentUser.value?.uid;

  if (!pacienteUid) {
    therapies.value = [];
    return;
  }

  try {
    therapies.value = await getTherapiesByPatient(pacienteUid);
  } catch (error) {
    console.error("Error loading therapies for sessions:", error);
    therapies.value = [];
  }
}

watch(
  () => currentUser.value?.uid,
  () => {
    dialogAppointment.value = null;
    loadTherapies();
  },
  { immediate: true }
);
</script>

<style scoped>
.session-card {
  min-height: 100%;
}

.session-day {
  align-items: center;
  border: 1px solid rgba(var(--v-theme-secondary), 0.34);
  border-radius: 8px;
  color: rgb(var(--v-theme-on-secondary));
  display: inline-flex;
  font-size: 2.4rem;
  font-weight: 700;
  height: 72px;
  justify-content: center;
  line-height: 1;
  margin-right: 14px;
  min-width: 72px;
  background: rgba(var(--v-theme-secondary), 0.24);
}

.clickable-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.clickable-card:hover {
  transform: translateY(-2px);
}

.clickable-card--disabled {
  cursor: default;
  opacity: 0.7;
}

.clickable-card--disabled:hover {
  transform: none;
}

@media (max-width: 599px) {
  .session-card {
    padding: 14px !important;
  }

  .session-card :deep(.v-card-title) {
    font-size: 1rem !important;
    line-height: 1.25;
  }

  .session-day {
    font-size: 2rem;
    height: 60px;
    min-width: 60px;
  }

  .session-card :deep(.v-list-item__append) {
    align-self: center;
    margin-inline-start: 10px;
  }
}
</style>

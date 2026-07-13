<template>
  <LayoutDefault layout>
    <v-container class="pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Agenda terapéutica
            </p>
          <h1 class="text-h4 font-weight-bold">Mis sesiones</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Revisa tu próxima cita, modalidad y acciones disponibles.
          </p>
          </div>
          <div class="page-header__actions">
            <v-btn
              v-if="activeTherapy"
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-calendar-plus-outline"
              class="pf-btn-secondary"
              @click="openScheduleDialog"
            >
              Agendar
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-card
        v-if="!nextAppointment && activeTherapy"
        class="pa-4 mb-5 card-backgoundcustom session-card"
        elevation="2"
        variant="text"
        @click="openScheduleDialog"
      >
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2">
          <v-icon color="secondary">mdi-calendar-plus-outline</v-icon>
          Agendar próxima sesión
        </v-card-title>
        <v-card-text>
          <v-list-item class="px-0">
            <v-list-item-title>No tienes una próxima sesión agendada</v-list-item-title>
            <v-list-item-subtitle>
              Revisa la agenda de tu terapeuta y elige un horario disponible.
            </v-list-item-subtitle>
            <template #append>
              <v-icon color="secondary">mdi-arrow-right</v-icon>
            </template>
          </v-list-item>
        </v-card-text>
      </v-card>

      <NextAppointmentCard
        v-if="nextAppointment"
        class="mb-5"
        :appointment="nextAppointment"
        :reschedulable="Boolean(editableAppointment)"
        @reschedule="openRescheduleDialog"
      />

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
            :class="{ 'clickable-card--disabled pf-card--disabled': !activeTherapy?.id }"
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

      <v-card
        v-if="activeTherapy"
        class="pa-4 mt-5 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-card-title
          class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0"
        >
          <v-icon color="secondary" size="small">
            mdi-calendar-check-outline
          </v-icon>
          Citas de mi terapia actual
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <TherapyAppointmentsTable
            :appointments="activeTherapy.citas || []"
          />
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
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import NextAppointmentCard from "@/components/Terapias/NextAppointmentCard.vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
      const appointmentDate = parseAppointmentDate(appointment);

      return (
        (status === "pendiente" || status === "confirmada") &&
        appointmentDate &&
        appointmentDate >= today
      );
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

const activeTherapy = computed(
  () =>
    therapies.value.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null
);

function openRescheduleDialog() {
  if (!editableAppointment.value) {
    return;
  }

  dialogAppointment.value = { ...editableAppointment.value };
  dialog.value = true;
}

function openScheduleDialog() {
  dialogAppointment.value = null;
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

.clickable-card {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.clickable-card:hover {
  transform: none;
}

.clickable-card--disabled {
  cursor: default;
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

  .session-card :deep(.v-list-item__append) {
    align-self: center;
    margin-inline-start: 10px;
  }
}
</style>

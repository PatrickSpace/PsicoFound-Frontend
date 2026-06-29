<template>
  <LayoutDefault layout>
    <v-container>
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4">
        <div>
          <h1 class="text-h4">Agenda del psicólogo</h1>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
            Gestiona tus citas, confirma sesiones y agrega el enlace externo de videollamada.
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadTherapistSchedule"
        >
          Actualizar
        </v-btn>
      </div>

      <v-divider class="my-5 mx-auto"></v-divider>

      <v-alert
        v-if="errorMessage"
        class="mb-5"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ errorMessage }}
      </v-alert>

      <v-card
        v-if="!loading && !therapist"
        class="pa-4 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-card-title class="text-h5">Perfil de psicólogo no encontrado</v-card-title>
        <v-card-text>
          Tu usuario aún no está vinculado a un perfil de psicólogo activo. Un administrador debe asignar tu UID al registro del profesional.
        </v-card-text>
      </v-card>

      <template v-else>
        <v-row class="mb-4" align="stretch">
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
              <v-card-title class="text-h6">Citas próximas</v-card-title>
              <v-card-text>
                <div class="text-h4">{{ upcomingAppointments.length }}</div>
                <div class="text-body-2 text-medium-emphasis">Pendientes o confirmadas</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
              <v-card-title class="text-h6">Pacientes activos</v-card-title>
              <v-card-text>
                <div class="text-h4">{{ activePatientsCount }}</div>
                <div class="text-body-2 text-medium-emphasis">Con terapia registrada</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
              <v-card-title class="text-h6">Enlaces pendientes</v-card-title>
              <v-card-text>
                <div class="text-h4">{{ missingMeetingLinksCount }}</div>
                <div class="text-body-2 text-medium-emphasis">Citas remotas sin URL</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h5">
            <v-icon size="small">mdi-calendar-clock</v-icon>
            Sesiones asignadas
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4"></v-divider>

            <v-text-field
              v-model="search"
              clearable
              prepend-inner-icon="mdi-magnify"
              label="Buscar por paciente, estado o fecha"
              class="mb-4"
            />

            <v-data-table
              :headers="headers"
              :items="filteredAppointments"
              :items-per-page="10"
              :loading="loading"
              :sort-by="[{ key: 'fechaOrden', order: 'asc' }]"
              class="card-backgoundcustom"
            >
              <template #no-data>
                <v-empty-state
                  headline="No tienes sesiones asignadas"
                  text="Las citas de tus pacientes aparecerán aquí cuando exista una terapia activa con sesiones agendadas."
                  icon="mdi-calendar-search"
                ></v-empty-state>
              </template>

              <template #item.estado="{ value }">
                <v-chip :color="statusColor(value)" size="small" variant="tonal">
                  {{ value || "pendiente" }}
                </v-chip>
              </template>

              <template #item.meetingUrl="{ item }">
                <v-btn
                  v-if="item.meetingUrl"
                  :href="item.meetingUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-video-outline"
                >
                  Abrir
                </v-btn>
                <v-chip v-else size="small" variant="tonal" color="warning">
                  Pendiente
                </v-chip>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex ga-1">
                  <v-btn
                    icon
                    variant="text"
                    color="blue"
                    :disabled="item.estado === 'realizada'"
                    @click="openEditDialog(item)"
                  >
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="green"
                    :disabled="item.estado === 'confirmada' || item.estado === 'realizada'"
                    @click="handleConfirmAppointment(item)"
                  >
                    <v-icon>mdi-check-circle</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="deep-purple"
                    :disabled="item.estado === 'realizada'"
                    @click="handleCompleteAppointment(item)"
                  >
                    <v-icon>mdi-calendar-check</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="warning"
                    :disabled="item.estado === 'pendiente'"
                    @click="handleResetAppointment(item)"
                  >
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </template>

      <CitaDialog
        v-model="dialog"
        :terapia-id="editingAppointment?.terapiaId || ''"
        :terapeuta-id="therapist?.id || ''"
        :terapeuta-nombre="therapist?.nombre || editingAppointment?.terapeutaNombre || ''"
        :cita-id="editingAppointment?.citaId || ''"
        :initial-appointment="editingAppointment || {}"
        :redirect-on-save="false"
        @saved="handleDialogSaved"
      />

      <v-dialog v-model="completeDialog" max-width="640">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h5">Cerrar sesión</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ completingAppointment?.pacienteNombre || "Paciente" }} ·
              {{ completingAppointment?.fecha || "sin fecha" }}
              {{ completingAppointment?.hora || "" }}
            </p>
            <v-textarea
              v-model="sessionSummary"
              label="Resumen compartido de la sesión"
              rows="5"
              variant="outlined"
              hint="Este resumen queda asociado al proceso y puede enriquecer el historial longitudinal."
              persistent-hint
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="completeDialog = false">
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="flat"
              :loading="savingCompletion"
              prepend-icon="mdi-calendar-check"
              @click="saveAppointmentCompletion"
            >
              Marcar realizada
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import { useAuthStore } from "@/store/auth";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getTherapiesByTherapist } from "@/services/terapiaService";
import {
  confirmAppointment,
  markAppointmentAsCompleted,
  resetAppointmentToPending,
} from "@/services/citaService";

const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapist = ref(null);
const therapies = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const search = ref("");
const dialog = ref(false);
const editingAppointment = ref(null);
const completeDialog = ref(false);
const completingAppointment = ref(null);
const sessionSummary = ref("");
const savingCompletion = ref(false);

const headers = [
  { title: "Fecha", value: "fechaOrden" },
  { title: "Hora", value: "hora" },
  { title: "Estado", value: "estado" },
  { title: "Paciente", value: "pacienteNombre" },
  { title: "Modalidad", value: "modalidad" },
  { title: "Sesión online", value: "meetingUrl", sortable: false },
  { title: "Acciones", key: "actions", sortable: false },
];

const appointments = computed(() =>
  therapies.value.flatMap((therapy) =>
    (Array.isArray(therapy.citas) ? therapy.citas : []).map((appointment) => ({
      id: appointment.citaId || `${therapy.id}-${appointment.fecha}-${appointment.hora}`,
      citaId: appointment.citaId || "",
      terapiaId: therapy.id,
      pacienteUid: therapy.pacienteUid || appointment.usuarioId || "",
      pacienteNombre: therapy.pacienteNombre || "Paciente",
      terapeutaId: therapy.terapeutaId || therapist.value?.id || "",
      terapeutaNombre: therapy.terapeutaNombre || therapist.value?.nombre || "",
      fecha: appointment.fecha || "",
      fechaOrden: buildSortableDate(appointment.fecha, appointment.hora),
      hora: appointment.hora || "Sin hora",
      estado: appointment.estado || "pendiente",
      notas: appointment.notas || "",
      modalidad: appointment.modalidad || therapy.modalidad || "",
      ubicacion: appointment.ubicacion || "",
      meetingProvider: appointment.meetingProvider || "",
      meetingUrl: appointment.meetingUrl || "",
      sessionSummary: appointment.sessionSummary || "",
    }))
  )
);

const filteredAppointments = computed(() => {
  const query = search.value.toString().trim().toLowerCase();

  if (!query) {
    return appointments.value;
  }

  return appointments.value.filter((appointment) =>
    [
      appointment.fecha,
      appointment.hora,
      appointment.estado,
      appointment.pacienteNombre,
      appointment.modalidad,
      appointment.meetingProvider,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
});

const upcomingAppointments = computed(() =>
  appointments.value.filter((appointment) =>
    ["pendiente", "confirmada"].includes(normalizeStatus(appointment.estado))
  )
);

const activePatientsCount = computed(
  () => new Set(therapies.value.map((therapy) => therapy.pacienteUid).filter(Boolean)).size
);

const missingMeetingLinksCount = computed(() =>
  upcomingAppointments.value.filter(
    (appointment) => isRemote(appointment.modalidad) && !appointment.meetingUrl
  ).length
);

watch(
  () => currentUser.value?.uid,
  () => {
    loadTherapistSchedule();
  },
  { immediate: true }
);

function buildSortableDate(fecha, hora) {
  if (!fecha) return "";
  return `${fecha}T${hora || "00:00"}`;
}

function normalizeStatus(status) {
  return (status || "").toString().trim().toLowerCase();
}

function isRemote(modalidad) {
  return ["remoto", "online", "remota"].includes(
    (modalidad || "").toString().trim().toLowerCase()
  );
}

function statusColor(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "confirmada") return "green";
  if (normalized === "cancelada") return "red";
  if (normalized === "realizada" || normalized === "completada") return "primary";
  return "orange";
}

async function loadTherapistSchedule() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    therapist.value = null;
    therapies.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    therapist.value = await getTherapistByUserUid(uid);
    therapies.value = therapist.value?.id
      ? await getTherapiesByTherapist(therapist.value.id)
      : [];
  } catch (error) {
    console.error("Error loading therapist schedule:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar la agenda del psicólogo.";
    therapist.value = null;
    therapies.value = [];
  } finally {
    loading.value = false;
  }
}

function openEditDialog(item) {
  editingAppointment.value = {
    citaId: item.citaId,
    terapiaId: item.terapiaId,
    terapeutaId: item.terapeutaId,
    terapeutaNombre: item.terapeutaNombre,
    fecha: item.fecha,
    hora: item.hora,
    notas: item.notas,
    modalidad: item.modalidad,
    ubicacion: item.ubicacion,
    meetingProvider: item.meetingProvider,
    meetingUrl: item.meetingUrl,
    sessionSummary: item.sessionSummary,
  };
  dialog.value = true;
}

async function handleConfirmAppointment(item) {
  await runAppointmentAction(
    () => confirmAppointment({ citaId: item.citaId, terapiaId: item.terapiaId }),
    "Cita confirmada",
    "La cita fue confirmada correctamente."
  );
}

function handleCompleteAppointment(item) {
  completingAppointment.value = item;
  sessionSummary.value = item.sessionSummary || "";
  completeDialog.value = true;
}

async function saveAppointmentCompletion() {
  if (!completingAppointment.value || savingCompletion.value) {
    return;
  }

  savingCompletion.value = true;

  await runAppointmentAction(
    () =>
      markAppointmentAsCompleted({
        citaId: completingAppointment.value.citaId,
        terapiaId: completingAppointment.value.terapiaId,
        sessionSummary: sessionSummary.value.trim(),
      }),
    "Sesión realizada",
    "La sesión fue marcada como realizada."
  );

  completeDialog.value = false;
  completingAppointment.value = null;
  sessionSummary.value = "";
  savingCompletion.value = false;
}

async function handleResetAppointment(item) {
  await runAppointmentAction(
    () => resetAppointmentToPending({ citaId: item.citaId, terapiaId: item.terapiaId }),
    "Cita actualizada",
    "La cita volvió al estado pendiente."
  );
}

async function runAppointmentAction(action, title, message) {
  try {
    await action();
    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: { title, message },
      })
    );
    await loadTherapistSchedule();
  } catch (error) {
    console.error("Error updating therapist appointment:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo actualizar la cita.",
        },
      })
    );
  }
}

function handleDialogSaved() {
  editingAppointment.value = null;
  loadTherapistSchedule();
}
</script>

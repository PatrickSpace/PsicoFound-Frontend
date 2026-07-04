<template>
  <LayoutDefault layout>
    <v-container class="schedule-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Gestión de sesiones</p>
          <h1 class="text-h4 font-weight-bold">Agenda del psicólogo</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Gestiona tus citas, confirma sesiones y agrega el enlace externo de videollamada.
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          class="align-self-start align-self-md-center"
          @click="loadTherapistSchedule"
        >
          Actualizar
        </v-btn>
      </div>

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
        <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
          Perfil de psicólogo no encontrado
        </v-card-title>
        <v-card-text>
          Tu usuario aún no está vinculado a un perfil de psicólogo activo. Un administrador debe asignar tu UID al registro del profesional.
        </v-card-text>
      </v-card>

      <template v-else>
        <v-row class="mb-4" align="stretch">
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1 schedule-stat-card" elevation="2" variant="text">
              <div class="d-flex align-center justify-space-between ga-3">
                <div>
                  <div class="text-body-2 text-medium-emphasis">Citas próximas</div>
                  <div class="text-h4 font-weight-bold mt-1">{{ upcomingAppointments.length }}</div>
                  <div class="text-caption text-medium-emphasis">Pendientes o confirmadas</div>
                </div>
                <v-avatar color="secondary" variant="tonal" rounded="lg">
                  <v-icon>mdi-calendar-clock</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1 schedule-stat-card" elevation="2" variant="text">
              <div class="d-flex align-center justify-space-between ga-3">
                <div>
                  <div class="text-body-2 text-medium-emphasis">Pacientes activos</div>
                  <div class="text-h4 font-weight-bold mt-1">{{ activePatientsCount }}</div>
                  <div class="text-caption text-medium-emphasis">Con terapia registrada</div>
                </div>
                <v-avatar color="success" variant="tonal" rounded="lg">
                  <v-icon>mdi-account-heart-outline</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" md="4" class="d-flex">
            <v-card class="pa-4 card-backgoundcustom flex-grow-1 schedule-stat-card" elevation="2" variant="text">
              <div class="d-flex align-center justify-space-between ga-3">
                <div>
                  <div class="text-body-2 text-medium-emphasis">Enlaces pendientes</div>
                  <div class="text-h4 font-weight-bold mt-1">{{ missingMeetingLinksCount }}</div>
                  <div class="text-caption text-medium-emphasis">Citas remotas sin URL</div>
                </div>
                <v-avatar color="warning" variant="tonal" rounded="lg">
                  <v-icon>mdi-link-variant-off</v-icon>
                </v-avatar>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="pa-4 mb-5 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
            <v-icon color="secondary" size="small">mdi-calendar-plus-outline</v-icon>
            Abrir horarios disponibles
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4"></v-divider>
            <v-row align="start">
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="availabilityForm.date"
                  label="Fecha"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="availabilityForm.startTime"
                  label="Hora de inicio"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  hint="Duración fija: 1 hora"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="availabilityForm.modality"
                  :items="modalityOptions"
                  label="Modalidad"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="availabilityForm.location"
                  label="Ubicación"
                  variant="outlined"
                  density="comfortable"
                  :disabled="isAvailabilityRemote"
                  :hint="isAvailabilityRemote ? 'Se registrará como Terapia Online' : 'Dirección o sede'"
                  persistent-hint
                />
              </v-col>
            </v-row>
            <div class="d-flex flex-column flex-md-row justify-space-between ga-3 mt-2">
              <div class="text-body-2 text-medium-emphasis">
                Cada bloque dura 1 hora. Los pacientes solo podrán elegir horarios abiertos y, al reservarse, el bloque quedará ocupado.
              </div>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-calendar-plus"
                :loading="savingAvailability"
                :disabled="!availabilityForm.date || !availabilityForm.startTime"
                @click="saveAvailabilitySlot"
              >
                Abrir bloque
              </v-btn>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="availability-slot-list">
              <v-chip
                v-for="slot in upcomingAvailabilitySlots"
                :key="slot.id"
                :color="slot.status === 'available' ? 'secondary' : 'grey'"
                variant="tonal"
                class="availability-chip"
              >
                <v-icon start size="small">
                  {{ slot.status === "available" ? "mdi-calendar-clock" : "mdi-lock-outline" }}
                </v-icon>
                {{ formatAvailabilitySlot(slot) }}
                <v-btn
                  v-if="slot.status === 'available'"
                  icon="mdi-close"
                  variant="text"
                  size="x-small"
                  class="ml-1"
                  aria-label="Cerrar bloque disponible"
                  :loading="availabilityActionId === slot.id"
                  :disabled="Boolean(availabilityActionId)"
                  @click.stop="handleCloseAvailabilitySlot(slot)"
                />
              </v-chip>
              <span
                v-if="!loadingAvailability && upcomingAvailabilitySlots.length === 0"
                class="text-body-2 text-medium-emphasis"
              >
                Aún no tienes horarios abiertos.
              </span>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
            <v-icon color="secondary" size="small">mdi-calendar-clock</v-icon>
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
              variant="outlined"
              density="comfortable"
            />

            <v-data-table
              :headers="headers"
              :items="filteredAppointments"
              :items-per-page="10"
              :loading="loading"
              :sort-by="[{ key: 'fechaOrden', order: 'asc' }]"
              class="card-backgoundcustom schedule-table"
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
                <div class="meeting-actions">
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
                  <v-btn
                    size="small"
                    :color="item.meetingUrl ? 'secondary' : 'warning'"
                    variant="text"
                    :prepend-icon="item.meetingUrl ? 'mdi-link-edit' : 'mdi-link-plus'"
                    :disabled="item.estado === 'realizada'"
                    @click="openMeetingLinkDialog(item)"
                  >
                    {{ item.meetingUrl ? "Editar link" : "Agregar link" }}
                  </v-btn>
                </div>
              </template>

              <template #item.actions="{ item }">
                <div class="d-flex ga-1">
                  <v-tooltip text="Editar fecha, modalidad o enlace">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon
                        variant="text"
                        color="secondary"
                        aria-label="Editar cita"
                        :disabled="item.estado === 'realizada'"
                        @click="openEditDialog(item)"
                      >
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Confirmar cita">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon
                        variant="text"
                        color="success"
                        aria-label="Confirmar cita"
                        :loading="isAppointmentActionLoading(item, 'confirm')"
                        :disabled="isAppointmentBusy(item) || item.estado === 'confirmada' || item.estado === 'realizada'"
                        @click="handleConfirmAppointment(item)"
                      >
                        <v-icon>mdi-check-circle</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Marcar sesión como realizada">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon
                        variant="text"
                        color="primary"
                        aria-label="Marcar como realizada"
                        :loading="isAppointmentActionLoading(item, 'complete')"
                        :disabled="isAppointmentBusy(item) || item.estado === 'realizada'"
                        @click="handleCompleteAppointment(item)"
                      >
                        <v-icon>mdi-calendar-check</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Regresar cita a pendiente">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon
                        variant="text"
                        color="warning"
                        aria-label="Regresar a pendiente"
                        :loading="isAppointmentActionLoading(item, 'reset')"
                        :disabled="isAppointmentBusy(item) || item.estado === 'pendiente'"
                        @click="handleResetAppointment(item)"
                      >
                        <v-icon>mdi-refresh</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
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
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">Cerrar sesión</v-card-title>
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
              density="comfortable"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="completeDialog = false">
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
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
import {
  closeAvailabilitySlot,
  createAvailabilitySlot,
  getAvailabilityByTherapist,
} from "@/services/availabilityService";

const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapist = ref(null);
const therapies = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const search = ref("");
const dialog = ref(false);
const editingAppointment = ref(null);
const availabilitySlots = ref([]);
const loadingAvailability = ref(false);
const savingAvailability = ref(false);
const availabilityActionId = ref("");
const appointmentAction = ref({ id: "", type: "" });
const availabilityForm = ref({
  date: "",
  startTime: "",
  modality: "Remoto",
  location: "",
});
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
const modalityOptions = ["Remoto", "Presencial", "Híbrido"];

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
const isAvailabilityRemote = computed(() => isRemote(availabilityForm.value.modality));
const upcomingAvailabilitySlots = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return availabilitySlots.value
    .filter((slot) => {
      const parsed = parseDateOnly(slot.date);
      return parsed && parsed >= today && slot.status !== "closed";
    })
    .slice(0, 18);
});

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
    if (therapist.value?.id) {
      loadingAvailability.value = true;
      const [therapistTherapies, therapistAvailability] = await Promise.all([
        getTherapiesByTherapist(therapist.value.id),
        getAvailabilityByTherapist(therapist.value.id),
      ]);
      therapies.value = therapistTherapies;
      availabilitySlots.value = therapistAvailability;
    } else {
      therapies.value = [];
      availabilitySlots.value = [];
    }
  } catch (error) {
    console.error("Error loading therapist schedule:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar la agenda del psicólogo.";
    therapist.value = null;
    therapies.value = [];
    availabilitySlots.value = [];
  } finally {
    loading.value = false;
    loadingAvailability.value = false;
  }
}

async function saveAvailabilitySlot() {
  if (!therapist.value?.id || savingAvailability.value) {
    return;
  }

  savingAvailability.value = true;

  try {
    await createAvailabilitySlot({
      therapistId: therapist.value.id,
      date: availabilityForm.value.date,
      startTime: availabilityForm.value.startTime,
      modality: availabilityForm.value.modality,
      location: availabilityForm.value.location,
    });
    availabilityForm.value.startTime = "";
    availabilityForm.value.location = "";
    await loadTherapistSchedule();
    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Horario abierto",
          message: "El bloque ya está disponible para tus pacientes.",
        },
      })
    );
  } catch (error) {
    console.error("Error creating availability slot:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo abrir el horario.",
        },
      })
    );
  } finally {
    savingAvailability.value = false;
  }
}

async function handleCloseAvailabilitySlot(slot) {
  if (availabilityActionId.value) {
    return;
  }

  availabilityActionId.value = slot.id;

  try {
    await closeAvailabilitySlot(slot.id);
    await loadTherapistSchedule();
  } catch (error) {
    console.error("Error closing availability slot:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo cerrar el bloque.",
        },
      })
    );
  } finally {
    availabilityActionId.value = "";
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

function openMeetingLinkDialog(item) {
  openEditDialog(item);
}

async function handleConfirmAppointment(item) {
  if (isAppointmentBusy(item)) return;
  setAppointmentAction(item, "confirm");

  await runAppointmentAction(
    () => confirmAppointment({ citaId: item.citaId, terapiaId: item.terapiaId }),
    "Cita confirmada",
    "La cita fue confirmada correctamente."
  );
}

function handleCompleteAppointment(item) {
  if (isAppointmentBusy(item)) return;

  completingAppointment.value = item;
  sessionSummary.value = item.sessionSummary || "";
  completeDialog.value = true;
}

async function saveAppointmentCompletion() {
  if (!completingAppointment.value || savingCompletion.value) {
    return;
  }

  savingCompletion.value = true;
  setAppointmentAction(completingAppointment.value, "complete");

  try {
    const completed = await runAppointmentAction(
      () =>
        markAppointmentAsCompleted({
          citaId: completingAppointment.value.citaId,
          terapiaId: completingAppointment.value.terapiaId,
          sessionSummary: sessionSummary.value.trim(),
        }),
      "Sesión realizada",
      "La sesión fue marcada como realizada."
    );

    if (completed) {
      completeDialog.value = false;
      completingAppointment.value = null;
      sessionSummary.value = "";
    }
  } finally {
    savingCompletion.value = false;
    clearAppointmentAction();
  }
}

async function handleResetAppointment(item) {
  if (isAppointmentBusy(item)) return;
  setAppointmentAction(item, "reset");

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
    return true;
  } catch (error) {
    console.error("Error updating therapist appointment:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo actualizar la cita.",
        },
      })
    );
    return false;
  } finally {
    if (!savingCompletion.value) {
      clearAppointmentAction();
    }
  }
}

function handleDialogSaved() {
  editingAppointment.value = null;
  loadTherapistSchedule();
}

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAvailabilitySlot(slot) {
  const parsed = parseDateOnly(slot.date);
  const date = parsed
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }).format(parsed)
    : slot.date;

  return `${date} · ${slot.startTime}-${slot.endTime} · ${slot.modality}`;
}

function appointmentRowId(item) {
  return item?.citaId || item?.id || "";
}

function isAppointmentActionLoading(item, type) {
  return (
    appointmentAction.value.id === appointmentRowId(item) &&
    appointmentAction.value.type === type
  );
}

function isAppointmentBusy(item) {
  return appointmentAction.value.id === appointmentRowId(item);
}

function setAppointmentAction(item, type) {
  appointmentAction.value = {
    id: appointmentRowId(item),
    type,
  };
}

function clearAppointmentAction() {
  appointmentAction.value = { id: "", type: "" };
}
</script>

<style scoped>
.schedule-view {
  max-width: 1180px;
}

.schedule-stat-card {
  min-height: 124px;
}

.schedule-table {
  border-radius: 8px;
}

.meeting-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.availability-slot-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.availability-chip {
  min-height: 34px;
}

@media (max-width: 600px) {
  .schedule-view {
    padding-inline: 16px;
  }

  .schedule-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

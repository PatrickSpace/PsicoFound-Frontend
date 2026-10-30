<template>
  <LayoutDefault layout>
    <v-container class="schedule-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Gestión de sesiones
            </p>
            <h1 class="text-h4 font-weight-bold">Agenda del psicólogo</h1>
            <p class="text-caption mt-2">{{ AGENDA_NOTICE }}</p>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Gestiona tus citas, confirma sesiones y agrega el enlace externo de videollamada.
            </p>
          </div>
          <div class="page-header__actions">
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="loading"
              class="pf-btn-secondary"
              @click="loadTherapistSchedule"
            >
              Actualizar
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <ProfessionalSetupCard v-if="appContext.hasPsychologistAccess && appContext.activeMode === 'psychologist'" agenda-page @open-availability="availabilityDialog = true" />

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
          Tu perfil profesional no está habilitado o no está vinculado a tu cuenta. Contacta con administración para revisarlo. Esta habilitación es distinta de pausar nuevas reservas.
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
          <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
            <div>
              <div class="d-flex align-center ga-2 mb-1">
                <v-icon color="secondary" size="small">mdi-calendar-plus-outline</v-icon>
                <h2 class="text-h6 font-weight-bold mb-0">Abrir horarios disponibles</h2>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-0">
                Cada bloque dura 1 hora y queda visible para pacientes con terapia activa.
              </p>
            </div>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-calendar-plus"
              @click="availabilityDialog = true"
              class="pf-btn-secondary align-self-start align-self-md-center"
            >
              Abrir bloque
            </v-btn>
          </div>
          <v-card-text>
            <v-divider class="mb-4"></v-divider>
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
                  class="ml-1 pf-btn-icon"
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

        class="pf-btn-secondary">
                    Abrir
                  </v-btn>
                  <v-btn
                    size="small"
                    :color="item.meetingUrl ? 'secondary' : 'warning'"
                    variant="text"
                    :prepend-icon="item.meetingUrl ? 'mdi-link-edit' : 'mdi-link-plus'"
                    :disabled="isAppointmentBusy(item) || !['pendiente', 'confirmada'].includes(item.estado)"
                    @click="openMeetingLinkDialog(item)"

        class="pf-btn-ghost">
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
                        :disabled="isAppointmentBusy(item) || !['pendiente', 'confirmada'].includes(item.estado)"
                        @click="openEditDialog(item)"

        class="pf-btn-icon">
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
                        :disabled="isAppointmentBusy(item) || item.estado !== 'pendiente'"
                        @click="handleConfirmAppointment(item)"

        class="pf-btn-patient">
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
                        :disabled="isAppointmentBusy(item) || item.estado !== 'confirmada' || !canRecordAttendance(item)"
                        @click="handleCompleteAppointment(item)"

        class="pf-btn-icon">
                        <v-icon>mdi-calendar-check</v-icon>
                      </v-btn>
                    </template>
                  </v-tooltip>
                  <v-btn v-if="item.estado === 'realizada'" icon variant="text" class="pf-btn-icon"
                    aria-label="Corregir atención" :disabled="isAppointmentBusy(item)" @click="openAttendanceDialog(item, 'correct')">
                    <v-icon>mdi-file-document-edit-outline</v-icon>
                  </v-btn>
                  <v-btn v-if="item.estado === 'realizada'" icon variant="text" class="pf-btn-icon"
                    aria-label="Deshacer realización" :disabled="isAppointmentBusy(item)" @click="openAttendanceDialog(item, 'undo')">
                    <v-icon>mdi-undo</v-icon>
                  </v-btn>
                  <v-tooltip text="Rechazar cita y solicitar otro horario">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon
                        variant="text"
                        color="warning"
                        aria-label="Rechazar cita"
                        :loading="isAppointmentActionLoading(item, 'reject')"
                        :disabled="isAppointmentBusy(item) || !['pendiente', 'confirmada'].includes(item.estado)"
                        @click="openRejectionDialog(item)"

        class="pf-btn-hope">
                        <v-icon>mdi-calendar-remove</v-icon>
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

      <v-dialog v-model="availabilityDialog" class="bg-transparent" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Abrir bloque disponible
          </v-card-title>
          <v-card-text>
            <v-row align="start">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="availabilityForm.date"
                  label="Fecha (hora de Lima)"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="availabilityForm.startTime"
                  label="Hora de inicio (Lima)"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  hint="Duración fija: 1 hora"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="availabilityForm.modality"
                  :items="modalityOptions"
                  label="Modalidad"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
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
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="savingAvailability"
              @click="availabilityDialog = false"
              class="pf-btn-ghost"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-calendar-plus"
              :loading="savingAvailability"
              :disabled="!availabilityForm.date || !availabilityForm.startTime"
              @click="saveAvailabilitySlot"
              class="pf-btn-secondary"
            >
              Abrir bloque
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="rejectionDialog" :persistent="rejectingAppointment" max-width="640">
        <v-card class="pa-4 card-backgoundcustom">
          <v-card-title class="text-h6 text-wrap">Solicitar un nuevo horario</v-card-title>
          <v-card-text>
            <p class="mb-4">{{ rejectingSelection?.pacienteNombre }} · {{ rejectingSelection?.fecha }} {{ rejectingSelection?.hora }} · hora de Lima</p>
            <v-alert type="warning" variant="tonal" class="mb-4">
              Se cancelará esta cita y se cerrará su bloque. El paciente recibirá tu motivo
              y una solicitud para elegir otro horario. Un pago confirmado quedará en revisión
              de devolución; no se transfiere a la nueva reserva automáticamente.
            </v-alert>
            <v-textarea v-model="rejectionReason" label="Motivo para el paciente" maxlength="500" counter
              rows="3" :disabled="rejectingAppointment" hint="Explica el percance sin incluir información sensible." persistent-hint />
            <v-alert v-if="rejectionError" type="error" class="mt-4">{{ rejectionError }}</v-alert>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-spacer />
            <v-btn class="pf-btn-ghost" :disabled="rejectingAppointment" @click="rejectionDialog = false">Volver</v-btn>
            <v-btn class="pf-btn-destructive" color="error" :loading="rejectingAppointment"
              :disabled="!rejectionReason.trim() || rejectingAppointment" @click="saveRejection">Rechazar y avisar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="completeDialog" :persistent="savingCompletion" class="bg-transparent" max-width="640">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">{{ attendanceTitle }}</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ completingAppointment?.pacienteNombre || "Paciente" }} ·
              {{ completingAppointment?.fecha || "sin fecha" }}
              {{ completingAppointment?.hora || "" }}
            </p>
            <v-alert v-if="attendanceAction === 'undo'" type="warning" variant="tonal" class="mb-4">
              Usa esta acción solo si la sesión no ocurrió y se registró por error.
              Volverá a confirmada. El registro anterior quedará en el historial y se avisará al paciente.
              No se modificarán pagos ni transferencias.
            </v-alert>
            <template v-else>
              <p v-if="completingAppointment?.completedAt" class="mb-3">Registro original: {{ formatAgendaInstant(completingAppointment.completedAt) }}</p>
              <v-row>
                <v-col cols="12" sm="6"><v-text-field v-model="attendanceDate" type="date" label="Fecha de atención (Lima)" :max="agendaDate(agendaNow)" :disabled="savingCompletion" /></v-col>
                <v-col cols="12" sm="6"><v-text-field v-model="attendanceTime" type="time" label="Hora de atención (Lima)" :disabled="savingCompletion" /></v-col>
              </v-row>
            <v-textarea
              v-model="sessionSummary"
              label="Resumen compartido de la sesión"
              rows="5"
              maxlength="2000"
              :disabled="savingCompletion"
              variant="outlined"
              hint="Este resumen queda asociado al proceso y puede enriquecer el historial longitudinal."
              persistent-hint
              density="comfortable"
            />
            </template>
            <v-textarea v-model="attendanceReason" :label="attendanceAction === 'complete' ? 'Motivo si la atención fue en otro horario' : 'Motivo de la corrección'"
              maxlength="500" counter rows="2" :disabled="savingCompletion" />
            <v-checkbox v-if="attendanceAction === 'undo'" v-model="confirmNotAttended" :disabled="savingCompletion"
              label="Confirmo que la sesión no ocurrió y se marcó realizada por error" />
            <v-alert v-if="attendanceError" type="error" class="mt-3">{{ attendanceError }}</v-alert>
          </v-card-text>
          <v-card-actions class="flex-wrap">
            <v-spacer />
            <v-btn variant="text" :disabled="savingCompletion" @click="completeDialog = false"
        class="pf-btn-ghost">
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              :loading="savingCompletion"
              :disabled="!canSaveAttendance || savingCompletion"
              prepend-icon="mdi-calendar-check"
              @click="saveAppointmentCompletion"

        class="pf-btn-secondary">
              {{ attendanceAction === 'complete' ? 'Marcar realizada' : attendanceAction === 'correct' ? 'Guardar corrección' : 'Deshacer realización' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { useRoute as useNotificationRoute, useRouter } from "vue-router";
const notificationRoute = useNotificationRoute();
const setupRouter = useRouter();
import { useAgendaClock } from "@/composables/useAgendaClock";
const agendaNow = useAgendaClock();
import { AGENDA_NOTICE, agendaDate, isFutureAppointment, resolveSchedule, wallParts, zonedDateTimeToDate, formatAgendaInstant } from "@/utils/dateTime";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import ProfessionalSetupCard from "@/components/onboarding/ProfessionalSetupCard.vue";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getTherapiesByTherapist } from "@/services/terapiaService";
import {
  confirmAppointment,
  markAppointmentAsCompleted,
  correctAppointmentAttendance,
  undoAppointmentCompletion,
  rejectAppointment,
  createOperationId,
} from "@/services/citaService";
import {
  closeAvailabilitySlot,
  createAvailabilitySlot,
  getAvailabilityByTherapist,
} from "@/services/availabilityService";

const authStore = useAuthStore();
const appContext = useAppContextStore();
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
const availabilityDialog = ref(false);
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
const attendanceAction = ref("complete");
const attendanceDate = ref("");
const attendanceTime = ref("");
const attendanceReason = ref("");
const attendanceError = ref("");
const confirmNotAttended = ref(false);
let attendanceRequest = null;
const attendanceTitle = computed(() => ({complete: "Registrar atención", correct: "Corregir datos de atención", undo: "Deshacer realización"})[attendanceAction.value]);
const actualAttendance = computed(() => zonedDateTimeToDate(attendanceDate.value, attendanceTime.value, "America/Lima"));
const canSaveAttendance = computed(() => attendanceAction.value === "undo"
  ? Boolean(attendanceReason.value.trim() && confirmNotAttended.value)
  : Boolean(actualAttendance.value && actualAttendance.value <= agendaNow.value &&
    (attendanceAction.value === "complete" || attendanceReason.value.trim())));
const rejectionDialog = ref(false);
const rejectingSelection = ref(null);
const rejectionReason = ref("");
const rejectionError = ref("");
const rejectingAppointment = ref(false);
let rejectionRequest = null;
let contextGeneration = 0;
let scheduleLoad = 0;
onBeforeUnmount(() => { contextGeneration++; scheduleLoad++; });
watch(() => [currentUser.value?.uid, appContext.activeMode], () => {
  contextGeneration++;
  rejectionDialog.value = false;
  rejectingSelection.value = null;
  rejectionReason.value = "";
  rejectionError.value = "";
  rejectingAppointment.value = false;
  rejectionRequest = null;
  completeDialog.value = false;
  completingAppointment.value = null;
  savingCompletion.value = false;
  attendanceError.value = "";
  attendanceRequest = null;
  dialog.value = false;
  editingAppointment.value = null;
  clearAppointmentAction();
}, { flush: "sync" });

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
      timeZone: appointment.timeZone,
      startAtIso: appointment.startAtIso,
      fecha: appointment.fecha || "",
      fechaOrden: buildSortableDate(appointment.fecha, appointment.hora),
      hora: appointment.hora || "Sin hora",
      estado: appointment.estado || "pendiente",
      version: Number(appointment.version || 1),
      notas: appointment.notas || "",
      modalidad: appointment.modalidad || therapy.modalidad || "",
      ubicacion: appointment.ubicacion || "",
      meetingProvider: appointment.meetingProvider || "",
      meetingUrl: appointment.meetingUrl || "",
      sessionSummary: appointment.sessionSummary || "",
      attendedAt: appointment.attendedAt || null,
      completedAt: appointment.completedAt || null,
      completedBy: appointment.completedBy || "",
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
    ["pendiente", "confirmada"].includes(normalizeStatus(appointment.estado)) && isFutureAppointment(appointment, agendaNow.value)
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
  const today = agendaDate(agendaNow.value);

  return availabilitySlots.value
    .filter((slot) => {
      return slot.status !== "closed" && (slot.scheduleStatus === "unresolved" || (slot.date >= today && isFutureAppointment(slot, agendaNow.value)));
    })
    .slice(0, 18);
});

watch(() => notificationRoute.query.openedAt, () => loadTherapistSchedule());
watch(() => [notificationRoute.query.abrirHorario, appContext.hasPsychologistAccess], async ([open, allowed]) => {
  if (open === '1' && allowed && appContext.activeMode === 'psychologist') {
    availabilityDialog.value = true;
    const query = { ...notificationRoute.query }; delete query.abrirHorario;
    await setupRouter.replace({ path: notificationRoute.path, query });
  }
}, { immediate: true });

watch(
  () => [currentUser.value?.uid, appContext.activeMode],
  () => {
    loadTherapistSchedule();
  },
  { immediate: true, flush: "sync" }
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
  const ticket = ++scheduleLoad;
  const uid = currentUser.value?.uid;

  if (!uid || appContext.activeMode !== "psychologist") {
    therapist.value = null;
    therapies.value = [];
    availabilitySlots.value = [];
    loading.value = false;
    loadingAvailability.value = false;
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const loadedTherapist = await getTherapistByUserUid(uid);
    if (ticket !== scheduleLoad) return;
    therapist.value = loadedTherapist;
    if (therapist.value?.id) {
      loadingAvailability.value = true;
      const [therapistTherapies, therapistAvailability] = await Promise.all([
        getTherapiesByTherapist(therapist.value.id),
        getAvailabilityByTherapist(therapist.value.id),
      ]);
      if (ticket !== scheduleLoad) return;
      therapies.value = therapistTherapies;
      availabilitySlots.value = therapistAvailability;
    } else {
      therapies.value = [];
      availabilitySlots.value = [];
    }
  } catch (error) {
    if (ticket !== scheduleLoad) return;
    console.error("Error loading therapist schedule:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar la agenda del psicólogo.";
    therapist.value = null;
    therapies.value = [];
    availabilitySlots.value = [];
  } finally {
    if (ticket === scheduleLoad) {
      loading.value = false;
      loadingAvailability.value = false;
    }
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
    availabilityDialog.value = false;
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
    await closeAvailabilitySlot(slot.id, slot.therapistId);
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
    timeZone: item.timeZone,
    startAtIso: item.startAtIso,
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
  if (isAppointmentBusy(item) || item.estado !== "pendiente") return;
  setAppointmentAction(item, "confirm");

  await runAppointmentAction(
    () => confirmAppointment({ citaId: item.citaId, terapiaId: item.terapiaId }),
    "Cita confirmada",
    "La cita fue confirmada correctamente."
  );
}

function canRecordAttendance(item) {
  const start = resolveSchedule(item).start;
  return Boolean(start && start <= agendaNow.value);
}
function handleCompleteAppointment(item) {
  if (isAppointmentBusy(item) || item.estado !== "confirmada" || !canRecordAttendance(item)) return;
  openAttendanceDialog(item, "complete");
}
function openAttendanceDialog(item, action) {
  if (isAppointmentBusy(item)) return;
  if (action !== "complete" && item.estado !== "realizada") return;
  completingAppointment.value = { ...item };
  attendanceAction.value = action;
  const actual = item.attendedAt ? new Date(item.attendedAt) : resolveSchedule(item).start;
  const parts = actual && Number.isFinite(actual.getTime()) ? wallParts(actual) : {date: "", time: ""};
  attendanceDate.value = parts.date;
  attendanceTime.value = parts.time;
  attendanceReason.value = "";
  attendanceError.value = "";
  confirmNotAttended.value = false;
  attendanceRequest = null;
  sessionSummary.value = item.sessionSummary || "";
  completeDialog.value = true;
}
async function saveAppointmentCompletion() {
  const selection = completingAppointment.value;
  if (!selection?.citaId || savingCompletion.value || !canSaveAttendance.value) return;
  const generation = contextGeneration;
  const data = {citaId: selection.citaId, expectedVersion: selection.version,
    sessionSummary: sessionSummary.value.trim(), attendedAt: actualAttendance.value?.toISOString(),
    reason: attendanceReason.value.trim(), confirmNotAttended: confirmNotAttended.value};
  const signature = JSON.stringify({action: attendanceAction.value, ...data});
  if (!attendanceRequest || attendanceRequest.signature !== signature) attendanceRequest = {signature, id: createOperationId("attendance")};
  data.requestId = attendanceRequest.id;
  const action = attendanceAction.value;
  savingCompletion.value = true;
  setAppointmentAction(selection, "complete");
  attendanceError.value = "";
  try {
    const save = {complete: markAppointmentAsCompleted, correct: correctAppointmentAttendance, undo: undoAppointmentCompletion}[action];
    await save(data);
    if (generation !== contextGeneration) return;
    completeDialog.value = false;
    completingAppointment.value = null;
    window.dispatchEvent(new CustomEvent("ui-success", {detail: {
      title: action === "complete" ? "Sesión realizada" : "Registro de atención actualizado",
      message: "Se guardó el registro y se avisó al paciente.",
    }}));
    await loadTherapistSchedule();
  } catch (error) {
    if (generation === contextGeneration) attendanceError.value = error?.message || "No se pudo guardar la atención. Reintenta.";
  } finally {
    if (generation === contextGeneration) {savingCompletion.value = false; clearAppointmentAction();}
  }
}

function openRejectionDialog(item) {
  if (isAppointmentBusy(item) || !["pendiente", "confirmada"].includes(item.estado)) return;
  rejectingSelection.value = { ...item };
  rejectionReason.value = "";
  rejectionError.value = "";
  rejectionRequest = null;
  rejectionDialog.value = true;
}

async function saveRejection() {
  const selection = rejectingSelection.value;
  const reason = rejectionReason.value.trim();
  if (!selection?.citaId || !reason || rejectingAppointment.value) return;
  const generation = contextGeneration;
  if (!rejectionRequest || rejectionRequest.reason !== reason) {
    rejectionRequest = { reason, id: createOperationId("professional_rejection") };
  }
  rejectingAppointment.value = true;
  rejectionError.value = "";
  setAppointmentAction(selection, "reject");
  try {
    await rejectAppointment({ citaId: selection.citaId, reason, expectedVersion: selection.version, requestId: rejectionRequest.id });
    if (generation !== contextGeneration) return;
    rejectionDialog.value = false;
    rejectingSelection.value = null;
    window.dispatchEvent(new CustomEvent("ui-success", { detail: {
      title: "Solicitud enviada", message: "La cita se canceló y el paciente recibió la solicitud de elegir otro horario.",
    } }));
    await loadTherapistSchedule();
  } catch (error) {
    if (generation === contextGeneration) rejectionError.value = error?.message || "No se pudo rechazar la cita. Reintenta.";
  } finally {
    if (generation === contextGeneration) {
      rejectingAppointment.value = false;
      clearAppointmentAction();
    }
  }
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

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAvailabilitySlot(slot) {
  const parsed = parseDateOnly(slot.date);
  const date = parsed
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "UTC",
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }).format(parsed)
    : slot.date;

  return slot.scheduleStatus === "unresolved" ? slot.scheduleLabel : `${date} · ${slot.startTime}-${slot.endTime} · hora de Lima · ${slot.modality}`;
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
  .schedule-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

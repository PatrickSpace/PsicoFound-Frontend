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
              :disabled="activeTherapyHasOpenAppointment"
              @click="openScheduleDialog"
            >
              Agendar
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-card
        v-if="loadError"
        class="pa-4 mb-5 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-alert color="error" variant="tonal" icon="mdi-alert-outline">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3">
            <span>{{ loadError }}</span>
            <v-btn class="pf-btn-secondary" @click="startWatchingTherapies">
              Reintentar
            </v-btn>
          </div>
        </v-alert>
      </v-card>

      <v-alert v-if="rejectedAppointment" type="warning" variant="tonal" class="mb-5" role="status">
        <p class="font-weight-bold">Tu profesional solicita un nuevo horario</p>
        <p>{{ rejectedAppointment.cancellationReason }}</p>
        <p>La cita anterior se canceló. Elige otro horario disponible con Agendar.
          Si ya pagaste, el pago requiere revisión y no se aplica automáticamente a la nueva reserva.</p>
      </v-alert>

      <v-card
        v-if="!nextAppointment && activeTherapy && !activeTherapyHasOpenAppointment"
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
        :reschedulable="Boolean(nextAppointment.citaId)"
        cancellable
        @reschedule="openRescheduleDialog(nextAppointment)"
        @cancel="openCancelDialog(nextAppointment)"
      />

      <section v-if="unresolvedAppointments.length" class="mb-5" aria-label="Citas pendientes de resolver">
        <h2 class="text-h6 mb-3">Citas pendientes de resolver</h2>
        <v-alert type="warning" variant="tonal" class="mb-4">
          Estas citas tienen un horario pasado o por revisar y siguen abiertas.
          Reprográmalas o cancélalas explícitamente antes de reservar otra cita
          en el mismo proceso o cambiar el estado de la terapia.
          Si la sesión sí ocurrió, contacta a tu profesional para que la registre.
        </v-alert>
        <NextAppointmentCard
          v-for="appointment in unresolvedAppointments"
          :key="appointment.citaId"
          class="mb-4"
          title="Cita pendiente de resolver"
          :appointment="appointment"
          :reschedulable="Boolean(appointment.citaId)"
          :cancellable="Boolean(appointment.citaId)"
          @reschedule="openRescheduleDialog(appointment)"
          @cancel="openCancelDialog(appointment)"
        />
      </section>

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

      <PatientPaymentsCard :patient-uid="currentUser?.uid || ''" />

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

      <v-dialog v-model="cancelDialog" max-width="560">
        <v-card class="pa-4 card-backgoundcustom" elevation="2">
          <v-card-title class="text-h6 font-weight-bold">
            Cancelar esta cita
          </v-card-title>
          <v-card-text>
            <v-alert class="mb-4" color="warning" variant="tonal">
              Se liberará el horario y se avisará al profesional. Esta acción
              no acredita ni confirma una devolución de pago.
            </v-alert>
            <v-textarea
              v-model="cancellationReason"
              label="Motivo (opcional)"
              variant="outlined"
              maxlength="500"
              counter
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn class="pf-btn-ghost" @click="cancelDialog = false">
              Volver
            </v-btn>
            <v-btn
              class="pf-btn-destructive"
              color="error"
              variant="tonal"
              :loading="cancellingAppointment"
              @click="confirmCancellation"
            >
              Confirmar cancelación
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { useRoute as useNotificationRoute } from "vue-router";
const notificationRoute = useNotificationRoute();
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import NextAppointmentCard from "@/components/Terapias/NextAppointmentCard.vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
import PatientPaymentsCard from "@/components/Payments/PatientPaymentsCard.vue";
import { useAuthStore } from "@/store/auth";
import {
  cancelAppointment,
  createOperationId,
} from "@/services/citaService";
import { watchTherapiesByPatient } from "@/services/terapiaService";
import { appointmentStart } from "@/utils/dateTime";

const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapies = ref([]);
const dialog = ref(false);
const dialogAppointment = ref(null);
const loadError = ref("");
const cancelDialog = ref(false);
const cancellationReason = ref("");
const cancellingAppointment = ref(false);
const cancellationRequestId = ref("");
const cancellationAppointment = ref(null);
const now = ref(new Date());
const clockTimer = setInterval(() => { now.value = new Date(); }, 30_000);
let unsubscribeTherapies = null;

const openAppointments = computed(() => therapies.value
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
      return status === "pendiente" || status === "confirmada";
    })
    .sort((a, b) => appointmentStart(a) - appointmentStart(b)));
const nextAppointment = computed(() => openAppointments.value.find(
  (appointment) => appointmentStart(appointment) > now.value
) || null);
const unresolvedAppointments = computed(() => openAppointments.value.filter(
  (appointment) => !appointmentStart(appointment) || appointmentStart(appointment) <= now.value
));
const activeTherapyHasOpenAppointment = computed(() => openAppointments.value.some(
  (appointment) => appointment.terapiaId === activeTherapy.value?.id
));

const activeTherapy = computed(
  () =>
    therapies.value.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null
);

const rejectedAppointment = computed(() => {
  if (activeTherapyHasOpenAppointment.value) return null;
  const latest = (activeTherapy.value?.citas || []).at(-1);
  return latest?.estado === "cancelada" && latest.rescheduleRequested ? latest : null;
});

function openRescheduleDialog(appointment) {
  if (!appointment?.citaId) {
    return;
  }

  dialogAppointment.value = { ...appointment };
  dialog.value = true;
}

function openCancelDialog(appointment) {
  if (!appointment?.citaId) return;
  cancellationAppointment.value = { ...appointment };
  cancellationReason.value = "";
  cancellationRequestId.value = createOperationId("appointment_cancel");
  cancelDialog.value = true;
}

async function confirmCancellation() {
  if (!cancellationAppointment.value?.citaId || cancellingAppointment.value) return;
  cancellingAppointment.value = true;
  try {
    await cancelAppointment({
      citaId: cancellationAppointment.value.citaId,
      reason: cancellationReason.value,
      requestId: cancellationRequestId.value,
    });
    cancelDialog.value = false;
    cancellationRequestId.value = "";
    window.dispatchEvent(new CustomEvent("ui-success", {
      detail: {
        title: "Cita cancelada",
        message: "El horario fue liberado y el profesional recibirá un aviso.",
      },
    }));
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    window.dispatchEvent(new CustomEvent("api-error", {
      detail: {
        message: error?.message || "No pudimos cancelar la cita.",
      },
    }));
  } finally {
    cancellingAppointment.value = false;
  }
}

function openScheduleDialog() {
  if (activeTherapyHasOpenAppointment.value) return;
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
  startWatchingTherapies();
}

function startWatchingTherapies() {
  if (unsubscribeTherapies) unsubscribeTherapies();
  unsubscribeTherapies = null;
  loadError.value = "";
  const pacienteUid = currentUser.value?.uid;
  if (!pacienteUid) {
    therapies.value = [];
    return;
  }
  unsubscribeTherapies = watchTherapiesByPatient(
    pacienteUid,
    (items) => {
      if (currentUser.value?.uid !== pacienteUid) return;
      therapies.value = items;
      loadError.value = "";
    },
    (error) => {
      console.error("Error watching therapies for sessions:", error);
      if (currentUser.value?.uid !== pacienteUid) return;
      loadError.value =
        "No pudimos actualizar tus sesiones. Revisa tu conexión e intenta nuevamente.";
    }
  );
}

watch(() => notificationRoute.query.openedAt, () => loadTherapies());

watch(
  () => currentUser.value?.uid,
  () => {
    dialogAppointment.value = null;
    cancellationAppointment.value = null;
    dialog.value = false;
    cancelDialog.value = false;
    therapies.value = [];
    loadTherapies();
  },
  { immediate: true }
);

onBeforeUnmount(() => { unsubscribeTherapies?.(); clearInterval(clockTimer); });
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

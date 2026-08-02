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

      <v-alert
        v-for="booking in visiblePaymentBookings"
        :key="booking.id"
        class="mb-4"
        :color="paymentStatusColor(booking.paymentStatus)"
        variant="tonal"
        :icon="paymentStatusIcon(booking.paymentStatus)"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <div>
            <strong>{{ paymentStatusLabel(booking.paymentStatus) }}</strong>
            <div class="text-body-2">
              {{ booking.date }} · {{ booking.startTime }} · {{ formatMoney(booking.priceAmount) }}
            </div>
          </div>
          <v-chip size="small" variant="tonal">
            {{ booking.modality === "virtual" ? "Online" : "Presencial" }}
          </v-chip>
          <v-btn
            v-if="canRetryPayment(booking)"
            color="secondary"
            variant="outlined"
            class="pf-btn-secondary"
            prepend-icon="mdi-credit-card-refresh-outline"
            @click="checkoutBooking = booking"
          >
            Reintentar pago
          </v-btn>
        </div>
      </v-alert>

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
        :reschedulable="Boolean(editableAppointment) && !isPaidAppointment"
        :cancellable="isPaidAppointment"
        @reschedule="openRescheduleDialog"
        @cancel="cancelDialog = true"
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

      <v-dialog v-model="checkoutDialog" class="bg-transparent" max-width="720">
        <v-card v-if="checkoutBooking" class="card-backgoundcustom pa-5">
          <v-card-title class="d-flex align-center justify-space-between ga-3">
            Completar pago
            <v-btn icon="mdi-close" variant="text" @click="checkoutBooking = null" />
          </v-card-title>
          <v-card-text>
            <BookingPaymentPanel
              :booking="checkoutBooking"
              :therapist-name="checkoutBooking.psychologistName"
              :payer-email="currentUser?.email || ''"
              @completed="handlePaymentCompleted"
            />
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog v-model="cancelDialog" class="bg-transparent" max-width="520">
        <v-card class="card-backgoundcustom pa-5">
          <v-card-title>Cancelar cita</v-card-title>
          <v-card-text>
            La política de cancelación se evaluará en el backend. El reembolso solo se mostrará como completado cuando el proveedor lo confirme.
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="cancelDialog = false">Volver</v-btn>
            <v-btn
              color="error"
              class="pf-btn-destructive"
              :loading="cancelling"
              @click="confirmCancellation"
            >
              Cancelar cita
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
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import NextAppointmentCard from "@/components/Terapias/NextAppointmentCard.vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
import BookingPaymentPanel from "@/components/Payments/BookingPaymentPanel.vue";
import { useAuthStore } from "@/store/auth";
import { getTherapiesByPatient } from "@/services/terapiaService";
import {
  cancelPaidBooking,
  getMyPaymentBookings,
  paymentErrorMessage,
} from "@/services/paymentService";

const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const therapies = ref([]);
const dialog = ref(false);
const dialogAppointment = ref(null);
const paymentBookings = ref([]);
const checkoutBooking = ref(null);
const cancelDialog = ref(false);
const cancelling = ref(false);

const checkoutDialog = computed({
  get: () => Boolean(checkoutBooking.value),
  set: (value) => {
    if (!value) checkoutBooking.value = null;
  },
});

const visiblePaymentBookings = computed(() => paymentBookings.value.filter(
  (booking) => !["confirmed", "expired", "cancelled_by_patient",
    "cancelled_by_psychologist", "cancelled_by_platform", "refunded"]
    .includes(booking.status)
));

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

const isPaidAppointment = computed(() =>
  nextAppointment.value?.paymentStatus === "approved"
);

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
  loadPaymentBookings();
}

function handlePaymentCompleted() {
  checkoutBooking.value = null;
  loadTherapies();
  loadPaymentBookings();
}

function canRetryPayment(booking) {
  return ["created", "rejected", "provider_error"].includes(booking.paymentStatus) &&
    booking.status !== "expired";
}

async function confirmCancellation() {
  if (!nextAppointment.value?.citaId || cancelling.value) return;
  cancelling.value = true;
  try {
    const result = await cancelPaidBooking(nextAppointment.value.citaId);
    cancelDialog.value = false;
    window.dispatchEvent(new CustomEvent("ui-success", { detail: {
      title: "Cita cancelada",
      message: result.status === "refunded" ?
        "La cita se canceló y el reembolso fue procesado." :
        "La cita se canceló. Revisa el estado del pago en esta vista.",
    }}));
    await Promise.all([loadTherapies(), loadPaymentBookings()]);
  } catch (error) {
    window.dispatchEvent(new CustomEvent("api-error", { detail: {
      message: paymentErrorMessage(error),
    }}));
  } finally {
    cancelling.value = false;
  }
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

async function loadPaymentBookings() {
  if (!currentUser.value?.uid) {
    paymentBookings.value = [];
    return;
  }
  try {
    const result = await getMyPaymentBookings();
    paymentBookings.value = result.bookings || [];
  } catch (error) {
    console.error("Error loading payment bookings:", error);
    paymentBookings.value = [];
  }
}

function paymentStatusLabel(status) {
  return ({
    created: "Pago pendiente",
    pending: "Estamos confirmando tu pago",
    processing: "Pago en proceso",
    rejected: "Pago rechazado",
    provider_error: "Servicio de pagos no disponible",
    refund_pending: "Reembolso en proceso",
    manual_review: "Pago en revisión",
  })[status] || "Reserva pendiente";
}

function paymentStatusColor(status) {
  if (["rejected", "provider_error"].includes(status)) return "error";
  if (["manual_review", "refund_pending"].includes(status)) return "warning";
  return "info";
}

function paymentStatusIcon(status) {
  if (["rejected", "provider_error"].includes(status)) return "mdi-alert-outline";
  if (status === "refund_pending") return "mdi-cash-refund";
  return "mdi-clock-outline";
}

function formatMoney(cents) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })
    .format(Number(cents || 0) / 100);
}

watch(
  () => currentUser.value?.uid,
  () => {
    dialogAppointment.value = null;
    loadTherapies();
    loadPaymentBookings();
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

<template>
  <div class="booking-payment-panel">
    <div v-if="!completed" class="booking-summary">
      <div>
        <p class="text-overline text-secondary mb-1">Resumen de la cita</p>
        <h3 class="text-h6 font-weight-bold mb-1">{{ therapistName }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ booking.date }} · {{ booking.startTime }}-{{ booking.endTime }} · {{ modalityLabel }}
        </p>
        <p class="text-caption text-medium-emphasis mb-0">Zona horaria: {{ booking.timezone }}</p>
      </div>
      <strong class="text-h5">{{ formattedPrice }}</strong>
    </div>

    <v-alert
      v-if="errorMessage"
      class="mb-4"
      color="error"
      variant="tonal"
      icon="mdi-alert-outline"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <template v-if="completed">
      <v-empty-state
        icon="mdi-calendar-check-outline"
        headline="Cita confirmada"
        text="El pago fue aprobado y el horario quedó reservado para ti."
      >
        <template #actions>
          <v-btn color="secondary" class="pf-btn-primary" @click="emit('completed', status)">
            Ver mis sesiones
          </v-btn>
        </template>
      </v-empty-state>
    </template>

    <template v-else>
      <v-alert
        v-if="paymentClientConfig.useFakeProvider"
        class="mb-4"
        color="warning"
        variant="tonal"
        icon="mdi-flask-outline"
      >
        Pago simulado para desarrollo. No se realizará ningún cobro real.
      </v-alert>

      <div v-if="processing" class="payment-processing" aria-live="polite">
        <v-progress-circular indeterminate color="secondary" />
        <div>
          <strong>Estamos confirmando tu pago</strong>
          <p class="text-body-2 text-medium-emphasis mb-0">
            No cierres esta ventana mientras validamos la operación.
          </p>
        </div>
      </div>

      <v-alert
        v-else-if="isPending"
        color="info"
        variant="tonal"
        icon="mdi-clock-outline"
      >
        <div class="d-flex flex-wrap align-center justify-space-between ga-3">
          <span>Estamos confirmando tu pago.</span>
          <v-btn
            v-if="paymentClientConfig.useFakeProvider && isDevelopment"
            variant="outlined"
            class="pf-btn-secondary"
            @click="completeDelayedFakeWebhook"
          >
            Simular webhook aprobado
          </v-btn>
        </div>
      </v-alert>

      <template v-else>
        <v-checkbox
          v-model="acceptedTerms"
          color="secondary"
          label="Acepto los términos de pago y la política de cancelación."
          hide-details
          class="mb-3"
        />
        <p class="text-caption text-medium-emphasis mb-4">
          Cancelaciones con más de 24 horas pueden recibir reembolso completo. La confirmación depende de la validación del backend.
        </p>

        <div v-if="paymentClientConfig.useFakeProvider" class="d-flex flex-column ga-3">
          <v-select
            v-if="isDevelopment"
            v-model="fakeScenario"
            label="Escenario de prueba"
            :items="fakeScenarios"
            variant="outlined"
            density="comfortable"
          />
          <v-btn
            color="secondary"
            class="pf-btn-primary"
            block
            :disabled="!acceptedTerms"
            @click="submitFakePayment"
          >
            Confirmar pago simulado
          </v-btn>
        </div>

        <div v-else>
          <div :id="brickContainerId" class="payment-brick-container" />
          <v-alert
            v-if="loadingBrick"
            color="info"
            variant="tonal"
            icon="mdi-credit-card-clock-outline"
          >
            Preparando el formulario seguro de Mercado Pago...
          </v-alert>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { paymentClientConfig, assertPaymentClientConfig } from "@/config/paymentClientConfig";
import {
  createBookingPayment,
  getBookingPaymentStatus,
  paymentErrorMessage,
  simulatePaymentEvent,
} from "@/services/paymentService";

const props = defineProps({
  booking: { type: Object, required: true },
  therapistName: { type: String, default: "Psicólogo" },
  payerEmail: { type: String, default: "" },
});
const emit = defineEmits(["completed"]);
const acceptedTerms = ref(false);
const processing = ref(false);
const loadingBrick = ref(false);
const errorMessage = ref("");
const status = ref(null);
const fakeScenario = ref("approved");
const brickController = ref(null);
const brickContainerId = `payment-brick-${props.booking.id}`;
const isDevelopment = import.meta.env.DEV;
const fakeScenarios = [
  { title: "Aprobado", value: "approved" },
  { title: "Pendiente", value: "pending" },
  { title: "Rechazado", value: "rejected" },
  { title: "Proveedor no disponible", value: "provider_error" },
  { title: "Webhook duplicado", value: "duplicate_webhook" },
  { title: "Webhook retrasado", value: "delayed_webhook" },
];

const completed = computed(() => status.value?.payment?.status === "approved");
const isPending = computed(() => status.value?.payment?.status === "pending");
const formattedPrice = computed(() => new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: props.booking.currency || "PEN",
}).format(Number(props.booking.priceAmount || 0) / 100));
const modalityLabel = computed(() => props.booking.modality === "virtual" ?
  "Online" : "Presencial");

onMounted(async () => {
  if (!paymentClientConfig.useFakeProvider) await initializePaymentBrick();
});

onBeforeUnmount(async () => {
  await brickController.value?.unmount?.();
});

async function initializePaymentBrick() {
  loadingBrick.value = true;
  try {
    const config = assertPaymentClientConfig();
    await loadMercadoPagoSdk();
    await nextTick();
    const mercadoPago = new window.MercadoPago(config.publicKey, { locale: "es-PE" });
    const bricks = mercadoPago.bricks();
    brickController.value = await bricks.create("payment", brickContainerId, {
      initialization: {
        amount: Number(props.booking.priceAmount || 0) / 100,
        payer: { email: props.payerEmail },
        marketplace: true,
      },
      customization: {
        paymentMethods: { creditCard: "all", debitCard: "all" },
        visual: { style: { theme: "default" } },
      },
      callbacks: {
        onReady: () => { loadingBrick.value = false; },
        onSubmit: async ({ formData }) => {
          if (!acceptedTerms.value) {
            errorMessage.value = "Acepta los términos para continuar.";
            throw new Error(errorMessage.value);
          }
          return submitPayment({
            paymentToken: formData.token,
            paymentMethodId: formData.payment_method_id,
            installments: formData.installments,
            payer: {
              email: formData.payer?.email,
              identificationType: formData.payer?.identification?.type,
              identificationNumber: formData.payer?.identification?.number,
            },
          });
        },
        onError: () => {
          errorMessage.value = "No pudimos cargar el formulario de pago seguro.";
        },
      },
    });
  } catch (error) {
    loadingBrick.value = false;
    errorMessage.value = paymentErrorMessage(error);
  }
}

async function submitFakePayment() {
  await submitPayment({
    paymentToken: "fake-card-token",
    paymentMethodId: "fake_card",
    installments: 1,
    payer: { email: props.payerEmail },
    fakeScenario: fakeScenario.value,
  });
}

async function submitPayment(paymentData) {
  if (processing.value) return;
  processing.value = true;
  errorMessage.value = "";
  try {
    status.value = await createBookingPayment({
      bookingId: props.booking.id,
      ...paymentData,
    });
    if (status.value?.payment?.status === "pending") {
      errorMessage.value = "Estamos confirmando tu pago. Puedes revisar el estado en Mis sesiones.";
    }
    if (["rejected", "provider_error"].includes(status.value?.payment?.status)) {
      errorMessage.value = "No pudimos procesar el pago. Verifica los datos o intenta nuevamente.";
    }
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
    try {
      status.value = await getBookingPaymentStatus(props.booking.id);
    } catch {
      // Conserva el error original; no se registra información de pago sensible.
    }
  } finally {
    processing.value = false;
  }
}

async function completeDelayedFakeWebhook() {
  if (processing.value) return;
  processing.value = true;
  errorMessage.value = "";
  try {
    await simulatePaymentEvent(props.booking.id, "approved");
    status.value = await getBookingPaymentStatus(props.booking.id);
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    processing.value = false;
  }
}

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-lurems-mercado-pago]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.luremsMercadoPago = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
</script>

<style scoped>
.booking-payment-panel {
  padding: 8px 0;
}

.booking-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: rgba(var(--v-theme-secondary), 0.08);
}

.payment-processing {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 180px;
  justify-content: center;
}

@media (max-width: 600px) {
  .booking-summary {
    flex-direction: column;
  }
}
</style>

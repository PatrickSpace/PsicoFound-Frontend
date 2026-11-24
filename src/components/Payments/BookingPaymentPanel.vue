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
      v-if="!completed && remainingSeconds > 0"
      class="mb-4"
      color="info"
      variant="tonal"
      icon="mdi-timer-sand"
    >
      Conservaremos este horario durante <strong>{{ remainingLabel }}</strong>.
    </v-alert>

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

      <v-alert
        v-else-if="holdExpired"
        color="warning"
        variant="tonal"
        icon="mdi-calendar-remove-outline"
      >
        La reserva temporal venció. Vuelve a elegir el horario antes de pagar.
      </v-alert>

      <template v-else>
        <v-checkbox v-model="acceptedTerms" color="secondary" hide-details class="mb-3">
          <template #label>
            <span>
              Acepto los <RouterLink to="/terminos" target="_blank">términos de pago</RouterLink>
              y la política de cancelación.
            </span>
          </template>
        </v-checkbox>
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

        <div v-else-if="paymentClientConfig.provider === 'culqi'" class="d-flex flex-column ga-3">
          <template v-if="savedCards.length">
            <p class="text-body-2 font-weight-bold mb-0">Tus tarjetas guardadas</p>
            <v-radio-group v-model="selectedCardId" hide-details>
              <v-radio
                v-for="card in savedCards"
                :key="card.id"
                :label="`${card.brand} terminada en ${card.lastFour}`"
                :value="card.id"
              />
            </v-radio-group>
            <div class="d-flex flex-wrap ga-2">
              <v-btn
                color="secondary"
                class="pf-btn-primary"
                :disabled="!acceptedTerms || !selectedCardId || processing"
                @click="paySavedCard"
              >Pagar {{ formattedPrice }} con esta tarjeta</v-btn>
              <v-btn
                variant="text"
                color="error"
                :disabled="!selectedCardId || processing"
                @click="removeSelectedCard"
              >Eliminar tarjeta</v-btn>
            </div>
          </template>

          <v-btn
            v-if="savedCards.length"
            variant="text"
            color="secondary"
            @click="showNewCard = !showNewCard"
          >{{ showNewCard ? 'Ocultar nueva tarjeta' : 'Añadir otra tarjeta' }}</v-btn>

          <template v-if="showNewCard || !savedCards.length">
            <p class="text-body-2 font-weight-bold mb-0">Añadir tarjeta</p>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field v-model="billing.firstName" label="Nombre del titular" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="billing.lastName" label="Apellido del titular" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="billing.phoneNumber" label="Celular" variant="outlined" density="comfortable" inputmode="tel" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="billing.addressCity" label="Ciudad" variant="outlined" density="comfortable" />
              </v-col>
              <v-col cols="12">
                <v-text-field v-model="billing.address" label="Dirección de facturación" variant="outlined" density="comfortable" />
              </v-col>
            </v-row>
            <v-checkbox v-model="cardStorageConsent" color="secondary" hide-details>
              <template #label>
                <span>Autorizo guardar esta tarjeta en Culqi para mis próximos pagos en Lurems.</span>
              </template>
            </v-checkbox>
            <v-btn
              color="secondary"
              class="pf-btn-primary"
              :disabled="!acceptedTerms || !cardStorageConsent || !validBilling || processing || openingCheckout"
              :loading="openingCheckout || savingCard"
              @click="openCulqiCheckout"
            >Añadir tarjeta y pagar {{ formattedPrice }}</v-btn>
            <p class="text-caption text-medium-emphasis mb-0">
              Los datos de la tarjeta se ingresan en Culqi. Lurems solo conserva su identificador y los últimos cuatro dígitos.
            </p>
          </template>
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
import { RouterLink } from "vue-router";
import { paymentClientConfig, assertPaymentClientConfig } from "@/config/paymentClientConfig";
import {
  createBookingPayment,
  completeCulqiCard3DS,
  completeCulqiPayment3DS,
  getBookingPaymentStatus,
  listCulqiCards,
  paymentErrorMessage,
  removeCulqiCard,
  saveCulqiCard,
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
const openingCheckout = ref(false);
const savingCard = ref(false);
const errorMessage = ref("");
const status = ref(null);
const fakeScenario = ref("approved");
const brickController = ref(null);
const savedCards = ref([]);
const selectedCardId = ref("");
const showNewCard = ref(false);
const cardStorageConsent = ref(false);
const billing = ref({ firstName: "", lastName: "", phoneNumber: "", address: "", addressCity: "" });
const brickContainerId = `payment-brick-${props.booking.id}`;
const isDevelopment = import.meta.env.DEV;
const nowMs = ref(Date.now());
let clockTimer = null;
let statusTimer = null;
const PAYMENT_CONSENT_VERSION = "2026-08-24";
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
const holdExpiresAtMs = computed(() => Date.parse(props.booking.holdExpiresAt || "") || 0);
const remainingSeconds = computed(() => Math.max(
  0,
  Math.ceil((holdExpiresAtMs.value - nowMs.value) / 1000)
));
const remainingLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
});
const holdExpired = computed(() => holdExpiresAtMs.value > 0 && remainingSeconds.value === 0);
const validBilling = computed(() => billing.value.firstName.trim().length >= 2 &&
  billing.value.lastName.trim().length >= 2 &&
  /^\+?\d{9,15}$/.test(billing.value.phoneNumber.replace(/\s/g, "")) &&
  billing.value.address.trim().length >= 5 && billing.value.addressCity.trim().length >= 2);

onMounted(async () => {
  clockTimer = window.setInterval(() => { nowMs.value = Date.now(); }, 1000);
  await refreshPaymentStatus();
  if (paymentClientConfig.provider === "culqi" && !paymentClientConfig.useFakeProvider) {
    await refreshCards();
  }
  if (!paymentClientConfig.useFakeProvider && !holdExpired.value &&
    paymentClientConfig.provider === "mercado_pago") {
    await initializePaymentBrick();
  }
});

onBeforeUnmount(async () => {
  window.clearInterval(clockTimer);
  window.clearTimeout(statusTimer);
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
  if (paymentClientConfig.provider === "culqi") {
    try {
      const cardResult = await saveCulqiCard({
        tokenId: "fake-card-token",
        deviceId: crypto.randomUUID(),
        billing: {firstName: "Paciente", lastName: "Prueba", phoneNumber: "999999999",
          address: "Av. Prueba 123", addressCity: "Lima"},
        cardStorageConsent: true,
        paymentConsentVersion: PAYMENT_CONSENT_VERSION,
      });
      await submitPayment({cardId: cardResult.card.id, deviceId: crypto.randomUUID(),
        fakeScenario: fakeScenario.value});
    } catch (error) {
      errorMessage.value = paymentErrorMessage(error);
    }
    return;
  }
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
    let result = await createBookingPayment({
      bookingId: props.booking.id,
      paymentTermsAccepted: acceptedTerms.value,
      paymentConsentVersion: PAYMENT_CONSENT_VERSION,
      ...paymentData,
    });
    if (result?.requires3DS) {
      const authentication3DS = await authenticate3DS(result.tokenId);
      result = await completeCulqiPayment3DS({
        bookingId: props.booking.id,
        challengeId: result.challengeId,
        authentication3DS,
      });
    }
    status.value = result;
    if (status.value?.payment?.status === "pending") {
      errorMessage.value = "Estamos confirmando tu pago. Puedes revisar el estado en Mis sesiones.";
      statusTimer = window.setTimeout(refreshPaymentStatus, 5000);
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

async function refreshCards() {
  try {
    const result = await listCulqiCards();
    savedCards.value = result.cards || [];
    selectedCardId.value = savedCards.value[0]?.id || "";
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  }
}

async function removeSelectedCard() {
  try {
    await removeCulqiCard(selectedCardId.value);
    await refreshCards();
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  }
}

async function paySavedCard() {
  if (!acceptedTerms.value || !selectedCardId.value) return;
  try {
    const deviceId = await prepareCulqi3DS();
    await submitPayment({cardId: selectedCardId.value, deviceId});
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    window.Culqi3DS?.reset?.();
  }
}

async function openCulqiCheckout() {
  if (!acceptedTerms.value || !cardStorageConsent.value || !validBilling.value) return;
  openingCheckout.value = true;
  errorMessage.value = "";
  try {
    const config = assertPaymentClientConfig();
    const deviceId = await prepareCulqi3DS();
    await loadScript("https://js.culqi.com/checkout-js", "luremsCulqiCheckout");
    const checkout = new window.CulqiCheckout(config.publicKey, {
      settings: {title: "Lurems", currency: "PEN", amount: Number(props.booking.priceAmount || 0)},
      client: {email: props.payerEmail},
      options: {lang: "es", modal: true, installments: false,
        paymentMethods: {tarjeta: true, yape: false, billetera: false,
          bancaMovil: false, agente: false, cuotealo: false}},
    });
    checkout.culqi = () => {
      if (checkout.token?.id) {
        const tokenId = checkout.token.id;
        checkout.close();
        openingCheckout.value = false;
        void saveNewCardAndPay(tokenId, deviceId);
      } else if (checkout.error) {
        checkout.close();
        openingCheckout.value = false;
        errorMessage.value = "No se pudo validar la tarjeta. Revisa los datos e inténtalo otra vez.";
      }
    };
    checkout.open();
    openingCheckout.value = false;
  } catch (error) {
    openingCheckout.value = false;
    errorMessage.value = paymentErrorMessage(error);
  }
}

async function saveNewCardAndPay(tokenId, deviceId) {
  savingCard.value = true;
  try {
    let result = await saveCulqiCard({
      tokenId, deviceId, billing: billing.value,
      cardStorageConsent: cardStorageConsent.value,
      paymentConsentVersion: PAYMENT_CONSENT_VERSION,
    });
    if (result.requires3DS) {
      const authentication3DS = await authenticate3DS(result.tokenId);
      result = await completeCulqiCard3DS({challengeId: result.challengeId, authentication3DS});
    }
    await refreshCards();
    selectedCardId.value = result.card.id;
    showNewCard.value = false;
    await submitPayment({cardId: result.card.id, deviceId});
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    savingCard.value = false;
    window.Culqi3DS?.reset?.();
  }
}

async function prepareCulqi3DS() {
  const config = assertPaymentClientConfig();
  await loadScript("https://3ds.culqi.com", "luremsCulqi3ds");
  const library = window.Culqi3DS;
  library.publicKey = config.publicKey;
  library.settings = {
    charge: {totalAmount: Number(props.booking.priceAmount || 0), currency: "PEN",
      returnUrl: window.location.href},
    card: {email: props.payerEmail},
  };
  return library.generateDevice();
}

function authenticate3DS(tokenId) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error("Tiempo de autenticación agotado.")), 120000);
    function finish(error, parameters) {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (error) reject(error);
      else resolve(parameters);
    }
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.parameters3DS) finish(null, event.data.parameters3DS);
      else if (event.data?.error) finish(new Error("No se pudo autenticar la tarjeta."));
    }
    window.addEventListener("message", onMessage);
    Promise.resolve(window.Culqi3DS.initAuthentication(tokenId)).catch(finish);
  });
}

function loadScript(src, datasetKey) {
  if (datasetKey === "luremsCulqiCheckout" && window.CulqiCheckout) return Promise.resolve();
  if (datasetKey === "luremsCulqi3ds" && window.Culqi3DS) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector(`script[data-${datasetKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`);
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset[datasetKey] = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", resolve, {once: true});
    script.addEventListener("error", reject, {once: true});
  });
}

async function refreshPaymentStatus() {
  try {
    status.value = await getBookingPaymentStatus(props.booking.id);
    if (status.value?.payment?.status === "approved") return;
    if (
      ["pending", "processing"].includes(status.value?.payment?.status) &&
      remainingSeconds.value > 0
    ) {
      statusTimer = window.setTimeout(refreshPaymentStatus, 5000);
    }
  } catch {
    // La vista puede continuar y reintentar después de enviar el pago.
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

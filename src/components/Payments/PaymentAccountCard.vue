<template>
  <v-card class="pa-4 card-backgoundcustom h-100" elevation="2" variant="text">
    <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
      <v-icon color="secondary" size="small">mdi-cash-multiple</v-icon>
      Configuración de cobros
    </v-card-title>
    <v-card-text>
      <v-divider class="mb-4" />
      <v-skeleton-loader v-if="loading" type="list-item-two-line, actions" />
      <template v-else>
        <v-alert
          v-if="errorMessage"
          class="mb-4"
          color="error"
          variant="tonal"
          icon="mdi-alert-outline"
        >
          {{ errorMessage }}
        </v-alert>

        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <v-chip :color="statusColor" variant="tonal" :prepend-icon="statusIcon">
            {{ statusLabel }}
          </v-chip>
          <v-chip v-if="account.isFake" color="warning" variant="tonal">
            Cuenta simulada para desarrollo
          </v-chip>
          <v-chip v-else-if="account.environment === 'sandbox'" color="info" variant="tonal">
            Sandbox
          </v-chip>
        </div>

        <p class="text-body-2 text-medium-emphasis mb-4">
          Conecta Mercado Pago para recibir reservas pagadas. Lurems nunca muestra ni almacena tus credenciales en el navegador.
        </p>

        <v-text-field
          v-model.number="priceSoles"
          label="Precio por sesión"
          prefix="S/"
          type="number"
          min="1"
          step="0.01"
          variant="outlined"
          density="comfortable"
          :disabled="saving"
          @blur="savePrice"
        />

        <div v-if="priceAmount > 0" class="payment-allocation mb-4">
          <div><span>Precio de sesión</span><strong>{{ formatMoney(priceAmount) }}</strong></div>
          <div><span>Recibes ({{ account.psychologistPercentage }}%)</span><strong>{{ formatMoney(psychologistAmount) }}</strong></div>
          <div><span>Comisión Lurems ({{ account.platformPercentage }}%)</span><strong>{{ formatMoney(platformAmount) }}</strong></div>
        </div>

        <v-alert
          v-if="account.restrictions?.length"
          class="mb-4"
          color="warning"
          variant="tonal"
          icon="mdi-alert-outline"
        >
          La cuenta necesita revisión antes de aceptar nuevas reservas.
        </v-alert>

        <div class="d-flex flex-wrap ga-2">
          <v-btn
            v-if="account.status !== 'connected'"
            color="secondary"
            class="pf-btn-primary"
            prepend-icon="mdi-link-variant"
            :loading="connecting"
            @click="connect"
          >
            Conectar Mercado Pago
          </v-btn>
          <v-btn
            v-else
            color="secondary"
            variant="outlined"
            class="pf-btn-secondary"
            prepend-icon="mdi-refresh"
            :loading="connecting"
            @click="connect"
          >
            Reconectar
          </v-btn>
          <v-btn
            v-if="account.status === 'connected'"
            color="error"
            variant="text"
            class="pf-btn-ghost"
            :loading="disconnecting"
            @click="disconnect"
          >
            Desconectar
          </v-btn>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import {
  connectPaymentAccount,
  createPaymentAuthorizationUrl,
  disconnectPaymentAccount,
  getPaymentAccountStatus,
  paymentErrorMessage,
  savePaymentSettings,
} from "@/services/paymentService";
import { paymentClientConfig } from "@/config/paymentClientConfig";

const loading = ref(true);
const saving = ref(false);
const connecting = ref(false);
const disconnecting = ref(false);
const errorMessage = ref("");
const priceSoles = ref(0);
const account = ref({
  status: "not_started",
  isFake: false,
  environment: "sandbox",
  platformPercentage: 30,
  psychologistPercentage: 70,
  restrictions: [],
});

const priceAmount = computed(() => Math.round(Number(priceSoles.value || 0) * 100));
const psychologistAmount = computed(() =>
  Math.floor(priceAmount.value * account.value.psychologistPercentage / 100)
);
const platformAmount = computed(() => priceAmount.value - psychologistAmount.value);
const statusLabel = computed(() => ({
  connected: "Cuenta conectada",
  restricted: "Cuenta restringida",
  disconnected: "Cuenta desconectada",
  expired: "Conexión vencida",
  error: "Error de conexión",
}[account.value.status] || "Cuenta no conectada"));
const statusColor = computed(() => account.value.status === "connected" ? "success" :
  account.value.status === "restricted" ? "warning" : "secondary");
const statusIcon = computed(() => account.value.status === "connected" ?
  "mdi-check-circle-outline" : "mdi-link-variant-off");

onMounted(loadAccount);

async function loadAccount() {
  loading.value = true;
  errorMessage.value = "";
  try {
    account.value = await getPaymentAccountStatus();
    priceSoles.value = Number(account.value.sessionPriceAmount || 0) / 100;
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function connect() {
  connecting.value = true;
  errorMessage.value = "";
  try {
    if (paymentClientConfig.useFakeProvider) {
      await connectPaymentAccount();
      await loadAccount();
      return;
    }
    const result = await createPaymentAuthorizationUrl();
    window.location.assign(result.authorizationUrl);
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    connecting.value = false;
  }
}

async function disconnect() {
  disconnecting.value = true;
  try {
    await disconnectPaymentAccount();
    await loadAccount();
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    disconnecting.value = false;
  }
}

async function savePrice() {
  if (priceAmount.value < 100 || saving.value) return;
  saving.value = true;
  try {
    await savePaymentSettings(priceAmount.value);
  } catch (error) {
    errorMessage.value = paymentErrorMessage(error);
  } finally {
    saving.value = false;
  }
}

function formatMoney(cents) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })
    .format(cents / 100);
}
</script>

<style scoped>
.payment-allocation {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(var(--v-theme-secondary), 0.08);
}

.payment-allocation div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
</style>

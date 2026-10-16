<template>
  <v-card
    v-if="operations.length || loadError"
    class="pa-4 mt-5 card-backgoundcustom"
    elevation="2"
    variant="text"
  >
    <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
      <v-icon color="secondary" size="small">mdi-receipt-text-clock-outline</v-icon>
      Pagos de mis sesiones
    </v-card-title>
    <v-card-text>
      <v-divider class="mb-4" />
      <v-alert v-if="loadError" color="error" variant="tonal" class="mb-4">
        <div class="d-flex flex-wrap align-center justify-space-between ga-2">
          <span>{{ loadError }}</span>
          <v-btn size="small" variant="text" @click="startWatching">
            Reintentar
          </v-btn>
        </div>
      </v-alert>
      <v-list v-if="operations.length" class="bg-transparent">
        <v-list-item
          v-for="operation in operations"
          :key="operation.id"
          class="payment-operation mb-3"
        >
          <template #title>
            <div class="d-flex flex-wrap align-center justify-space-between ga-2">
              <span class="font-weight-bold">
                {{ formatPaymentAmount(operation.amountMinor) }}
              </span>
              <v-chip
                :color="operation.status === 'pending' && !canPay(operation) ? 'warning' : statusColor(operation.status)"
                variant="tonal"
                size="small"
              >
                {{ paymentStatusLabel(operation) }}
              </v-chip>
            </div>
          </template>
          <template #subtitle>
            <div class="mt-2">
              <div>Referencia Lurems: {{ operation.reference }}</div>
              <div>
                Tarifa: {{ operation.rateSnapshot?.name || "Sesión" }} ·
                versión {{ operation.rateSnapshot?.rateVersion || "-" }}
              </div>
              <div class="mt-2">{{ deadlineLabel(operation) }}</div>
              <p v-if="operation.status === 'pending' && !canPay(operation)" role="status" class="mt-2 payment-notice">
                {{ paymentWindow(operation, now) === 'elapsed'
                  ? 'El plazo de pago terminó. No realices un nuevo pago. El cierre de la reserva requiere revisión administrativa.'
                  : 'No podemos verificar el plazo de esta operación. No realices un pago hasta que soporte la revise.' }}
                Si ya pagaste, solicita revisión con la referencia de esta operación.
              </p>
              <p v-if="operation.status === 'submitted'" class="mt-2 payment-notice">
                Tu aviso está en verificación. No vuelvas a pagar.
                {{ operation.rateSnapshot?.commercialPolicy?.submittedExpiration === 'preserve_for_review'
                  ? 'La política de esta reserva conserva el aviso para revisión al terminar el plazo.'
                  : operation.rateSnapshot?.commercialPolicy?.submittedExpiration === 'expire'
                    ? 'La política de esta reserva permite su vencimiento mediante revisión administrativa.'
                    : 'La política de esta reserva requiere revisión administrativa.' }}
              </p>
              <div class="text-caption mt-1">
                La confirmación es administrativa. El comprobante del proveedor
                no es un documento fiscal emitido por Lurems.
              </div>
              <div class="d-flex flex-wrap ga-2 mt-3">
                <v-btn
                  v-if="canPay(operation)"
                  :href="operation.paymentUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  color="secondary"
                  variant="tonal"
                  size="small"
                  append-icon="mdi-open-in-new"
                  @click="guardPaymentLink($event, operation)"
                >
                  Abrir Mercado Pago
                </v-btn>
                <v-btn
                  v-if="canPay(operation)"
                  color="secondary"
                  variant="text"
                  size="small"
                  :loading="busyId === operation.id"
                  @click="submitPayment(operation)"
                >
                  Ya realicé el pago
                </v-btn>
                <v-btn
                  v-if="(operation.status === 'pending' && !canPay(operation)) || ['expired', 'cancelled', 'rejected'].includes(operation.status)"
                  color="secondary" variant="tonal" size="small"
                  @click="openPaymentSupport(operation)"
                >
                  Ya pagué: solicitar revisión
                </v-btn>
                <v-btn
                  v-if="operation.status === 'confirmed'"
                  color="warning"
                  variant="text"
                  size="small"
                  @click="openRefundDialog(operation)"
                >
                  Solicitar revisión de devolución
                </v-btn>
              </div>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-dialog v-model="refundDialog" max-width="560">
      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
          Solicitar revisión de devolución
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <v-alert color="warning" variant="tonal" class="mb-4">
            La solicitud no garantiza una devolución. Administración debe
            revisarla según la política comercial que se apruebe.
          </v-alert>
          <v-textarea
            v-model="refundReason"
            label="Motivo"
            variant="outlined"
            maxlength="600"
            counter
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="refundDialog = false">Cancelar</v-btn>
          <v-btn
            color="warning"
            variant="tonal"
            :loading="busyId === selectedOperation?.id"
            :disabled="!refundReason.trim()"
            @click="submitRefundReview"
          >
            Enviar a revisión
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <FeedbackDialog
      v-model="supportDialog"
      :payment-operation-id="supportOperation?.id || ''"
      :payment-reference="supportOperation?.reference || ''"
    />
  </v-card>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import FeedbackDialog from "@/components/Navigation/FeedbackDialog.vue";
import { formatAgendaInstant } from "@/utils/dateTime";
import { paymentDeadlineMillis, paymentWindow } from "@/utils/paymentDeadline";
import {
  markPaymentSubmitted,
  requestPaymentRefundReview,
  watchPatientPaymentOperations,
} from "@/services/paymentService";
import { formatPaymentAmount } from "@/utils/paymentRates";

const props = defineProps({
  patientUid: { type: String, default: "" },
});
const operations = ref([]);
const loadError = ref("");
const busyId = ref("");
const refundDialog = ref(false);
const refundReason = ref("");
const selectedOperation = ref(null);
const supportDialog = ref(false);
const supportOperation = ref(null);
const now = ref(Date.now());
let deadlineTimer;
let generation = 0;
let unsubscribe = null;

watch(() => props.patientUid, startWatching, { immediate: true });
watch(operations, refreshClock);
onMounted(() => {
  window.addEventListener("focus", refreshClock);
  document.addEventListener("visibilitychange", refreshClock);
});
onBeforeUnmount(() => {
  generation++;
  unsubscribe?.();
  clearTimeout(deadlineTimer);
  window.removeEventListener("focus", refreshClock);
  document.removeEventListener("visibilitychange", refreshClock);
});

function refreshClock() {
  clearTimeout(deadlineTimer);
  now.value = Date.now();
  const deadlines = operations.value.filter(item => item.status === "pending")
    .map(paymentDeadlineMillis).filter(value => value !== null && value > now.value);
  if (deadlines.length) deadlineTimer = setTimeout(refreshClock, Math.min(Math.min(...deadlines) - now.value, 2147483647));
}

function canPay(operation) {
  return operation.status === "pending" && paymentWindow(operation, now.value) === "open";
}

function guardPaymentLink(event, operation) {
  refreshClock();
  if (!canPay(operation)) event.preventDefault();
}

function deadlineLabel(operation) {
  const deadline = paymentDeadlineMillis(operation);
  return deadline === null ? "Plazo de pago no verificable: requiere revisión."
    : `Plazo de pago de esta reserva: ${formatAgendaInstant(new Date(deadline))}, Perú.`;
}

function paymentStatusLabel(operation) {
  if (operation.status === "pending" && !canPay(operation)) {
    return paymentWindow(operation, now.value) === "elapsed" ? "Plazo de pago terminado" : "Plazo por revisar";
  }
  return statusLabel(operation.status);
}

function openPaymentSupport(operation) {
  supportOperation.value = operation;
  supportDialog.value = true;
}

function startWatching() {
  const current = ++generation;
  unsubscribe?.();
  unsubscribe = null;
  operations.value = [];
  refundDialog.value = false;
  supportDialog.value = false;
  selectedOperation.value = null;
  supportOperation.value = null;
  busyId.value = "";
  loadError.value = "";
  const uid = props.patientUid;
  if (!uid) {
    operations.value = [];
    return;
  }
  unsubscribe = watchPatientPaymentOperations(
    uid,
    (items) => {
      if (current !== generation || props.patientUid !== uid) return;
      operations.value = items;
      loadError.value = "";
    },
    () => {
      if (current !== generation || props.patientUid !== uid) return;
      operations.value = [];
      loadError.value = "No pudimos actualizar tus operaciones de pago.";
    }
  );
}

async function submitPayment(operation) {
  refreshClock();
  if (!canPay(operation)) return openPaymentSupport(operation);
  if (busyId.value) return;
  const current = generation;
  busyId.value = operation.id;
  try {
    await markPaymentSubmitted(operation.id);
    if (current !== generation) return;
    notifySuccess(
      "Pago enviado a verificación",
      "Administración debe conciliarlo con el proveedor antes de confirmarlo."
    );
  } catch (error) {
    if (current !== generation) return;
    notifyError(error?.message || "No pudimos actualizar la operación.");
  } finally {
    if (current === generation) busyId.value = "";
  }
}

function openRefundDialog(operation) {
  selectedOperation.value = operation;
  refundReason.value = "";
  refundDialog.value = true;
}

async function submitRefundReview() {
  if (!selectedOperation.value || !refundReason.value.trim() || busyId.value) return;
  busyId.value = selectedOperation.value.id;
  const current = generation;
  try {
    await requestPaymentRefundReview(
      selectedOperation.value.id,
      refundReason.value.trim()
    );
    if (current !== generation) return;
    refundDialog.value = false;
    notifySuccess(
      "Solicitud registrada",
      "La devolución quedó pendiente de revisión administrativa."
    );
  } catch (error) {
    if (current !== generation) return;
    notifyError(error?.message || "No pudimos registrar la solicitud.");
  } finally {
    if (current === generation) busyId.value = "";
  }
}

function statusLabel(status) {
  return {
    pending: "Pendiente de pago",
    submitted: "En verificación",
    confirmed: "Pago confirmado",
    rejected: "Pago rechazado",
    expired: "Operación vencida",
    cancelled: "Operación cancelada",
    refund_review: "Devolución en revisión",
    refunded: "Devolución registrada",
  }[status] || status;
}

function statusColor(status) {
  if (["confirmed", "refunded"].includes(status)) return "success";
  if (["rejected", "expired", "cancelled"].includes(status)) return "error";
  if (["submitted", "refund_review"].includes(status)) return "warning";
  return "info";
}

function notifySuccess(title, message) {
  window.dispatchEvent(new CustomEvent("ui-success", { detail: { title, message } }));
}

function notifyError(message) {
  window.dispatchEvent(new CustomEvent("api-error", { detail: { message } }));
}
</script>

<style scoped>
.payment-operation {
  border: 1px solid rgb(var(--v-theme-border-subtle));
  border-radius: 8px;
}
.payment-operation :deep(.v-list-item-subtitle) {
  -webkit-line-clamp: unset;
  opacity: 1;
}
.payment-notice {
  white-space: normal;
}
.payment-operation :deep(.v-btn) {
  max-width: 100%;
  height: auto;
  min-height: 32px;
  padding-block: 8px;
}
.payment-operation :deep(.v-btn__content) {
  white-space: normal;
}
</style>

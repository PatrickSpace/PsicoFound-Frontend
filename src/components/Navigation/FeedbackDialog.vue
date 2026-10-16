<template>
  <v-dialog
    :model-value="modelValue"
    class="bg-transparent"
    max-width="560px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="ma-4 card-backgoundcustom" elevation="2" variant="text">
      <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold">
        <v-icon color="secondary" size="small">mdi-message-alert-outline</v-icon>
        {{ paymentOperationId ? "Revisar pago de sesión" : "Dejar feedback" }}
      </v-card-title>
      <v-divider class="mx-4"></v-divider>

      <v-tabs v-model="activeTab" color="secondary" class="px-4">
        <v-tab value="new">Nueva solicitud</v-tab>
        <v-tab value="history">Mis solicitudes</v-tab>
      </v-tabs>

      <v-card-text class="pt-6">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ errorMessage }}
        </v-alert>

        <template v-if="activeTab === 'new'">
          <v-alert color="info" variant="tonal" class="mb-4">
            Este canal es para soporte de la plataforma. No es una conversación
            terapéutica ni un canal de emergencia.
          </v-alert>
          <p v-if="paymentOperationId" class="mb-4">Operación vinculada: {{ paymentReference || paymentOperationId }}</p>
          <v-select
            v-model="form.categoria"
            label="Tipo"
            variant="outlined"
            :items="categoryOptions"
            item-title="label"
            item-value="value"
            class="mb-4"
            density="comfortable"
          ></v-select>

          <v-textarea
            v-model="form.observacion"
            label="Observación"
            variant="outlined"
            rows="5"
            counter="1200"
            density="comfortable"
          ></v-textarea>
        </template>
        <template v-else>
          <v-list v-if="requests.length" class="bg-transparent">
            <v-list-item
              v-for="request in requests"
              :key="request.id"
              class="support-request mb-2"
            >
              <template #title>
                <div class="d-flex align-center justify-space-between ga-2">
                  <span>{{ categoryLabel(request.category) }}</span>
                  <v-chip
                    :color="statusColor(request.status)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ statusLabel(request.status) }}
                  </v-chip>
                </div>
              </template>
              <template #subtitle>
                <p class="text-body-2 mt-2 mb-2">{{ request.message }}</p>
                <p v-if="request.paymentOperationId">Referencia de pago: {{ request.paymentReference || request.paymentOperationId }}</p>
                <div
                  v-for="(response, index) in request.responses || []"
                  :key="`${request.id}-response-${index}`"
                  class="support-response"
                >
                  <strong>Respuesta de soporte:</strong> {{ response.message }}
                </div>
              </template>
            </v-list-item>
          </v-list>
          <v-empty-state
            v-else
            headline="Aún no tienes solicitudes"
            text="Aquí podrás revisar su estado y las respuestas de soporte."
            icon="mdi-message-check-outline"
          />
        </template>
      </v-card-text>

      <v-card-actions class="px-6 pb-5 feedback-actions">
        <v-spacer></v-spacer>
        <v-btn variant="text" :disabled="saving" @click="closeDialog"
        class="pf-btn-ghost">Cerrar</v-btn>
        <v-btn
          v-if="activeTab === 'new'"
          color="secondary" variant="tonal" :loading="saving" @click="submitFeedback"
        class="pf-btn-secondary">
          Enviar solicitud
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import {
  createFeedback,
  watchOwnSupportRequests,
} from "@/services/feedbackService";

const props = defineProps({
  paymentOperationId: { type: String, default: "" },
  paymentReference: { type: String, default: "" },
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const authStore = useAuthStore();
const { currentUser, userName } = storeToRefs(authStore);

const saving = ref(false);
const errorMessage = ref("");
const activeTab = ref("new");
const requests = ref([]);
let requestId = createRequestId();
let unsubscribeRequests = null;
let contextGeneration = 0;
const categoryOptions = [
  { label: "Error", value: "error" },
  { label: "Sugerencia", value: "sugerencia" },
  { label: "Comentario", value: "comentario" },
];

const form = reactive({
  categoria: "comentario",
  observacion: "",
});

watch(
  () => [currentUser.value?.uid, props.modelValue, props.paymentOperationId],
  ([uid, isOpen], previous = []) => {
    const generation = ++contextGeneration;
    unsubscribeRequests?.();
    requests.value = [];
    saving.value = false;
    resetForm();
    requestId = createRequestId();
    activeTab.value = "new";
    if (previous[0] && previous[0] !== uid) {
      emit("update:modelValue", false);
      return;
    }
    if (!uid || !isOpen) return;
    if (props.paymentOperationId) {
      form.categoria = "error";
      form.observacion = "Ya realicé el pago de esta sesión y solicito revisar su conciliación.";
    }
    unsubscribeRequests = watchOwnSupportRequests(uid, (items) => {
      if (generation === contextGeneration) requests.value = items;
    }, () => {
      if (generation === contextGeneration) errorMessage.value = "No pudimos cargar tus solicitudes.";
    });
  },
  { immediate: true }
);

onBeforeUnmount(() => { contextGeneration++; unsubscribeRequests?.(); });

function resetForm() {
  form.categoria = "comentario";
  form.observacion = "";
  errorMessage.value = "";
}

function closeDialog() {
  emit("update:modelValue", false);
}

async function submitFeedback() {
  if (saving.value) return;
  const generation = contextGeneration;
  errorMessage.value = "";

  if (!form.observacion.trim()) {
    errorMessage.value = "Escribe una observación para enviar el feedback.";
    return;
  }

  if (!currentUser.value?.uid) {
    errorMessage.value = "Necesitas iniciar sesión para enviar feedback.";
    return;
  }

  saving.value = true;

  try {
    await createFeedback({
      nombreUsuario: userName.value,
      userId: currentUser.value.uid,
      correoUsuario: currentUser.value.email || "",
      mensajeObservacion: form.observacion.trim(),
      categoria: form.categoria,
      requestId,
      paymentOperationId: props.paymentOperationId,
    });

    if (generation !== contextGeneration) return;
    emit("saved");
    resetForm();
    requestId = createRequestId();
    activeTab.value = "history";
  } catch (error) {
    if (generation !== contextGeneration) return;
    errorMessage.value = "No pudimos guardar tu feedback. Intentalo nuevamente.";

  } finally {
    if (generation === contextGeneration) saving.value = false;
  }
}

function createRequestId() {
  return `support_${globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random().toString(36).slice(2)}`}`.replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
}

function categoryLabel(value) {
  return categoryOptions.find((item) => item.value === value)?.label || "Comentario";
}

function statusLabel(value) {
  return {
    open: "Recibida",
    in_progress: "En revisión",
    resolved: "Resuelta",
  }[value] || value;
}

function statusColor(value) {
  return { open: "info", in_progress: "warning", resolved: "success" }[value] || "secondary";
}
</script>

<style scoped>
@media (max-width: 600px) {
  .feedback-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

.feedback-actions :deep(.v-btn) {
    flex: 1 1 100%;
  }
}

.support-request {
  border: 1px solid rgb(var(--v-theme-border-subtle));
  border-radius: 8px;
}

.support-response {
  background: rgb(var(--v-theme-surface));
  border-left: 3px solid rgb(var(--v-theme-secondary));
  margin-top: 8px;
  padding: 8px 10px;
}
</style>

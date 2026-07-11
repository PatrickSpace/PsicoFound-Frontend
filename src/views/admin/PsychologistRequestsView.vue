<template>
  <LayoutDefault layout>
    <v-container class="psychologist-requests-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Aprobación profesional</p>
          <h1 class="text-h4 font-weight-bold">Solicitudes de psicólogos</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Revisa solicitudes, habilita perfiles profesionales y permite que el usuario alterne a la vista de psicólogo.
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          class="align-self-start align-self-md-center pf-btn-secondary"
          @click="loadRequests"
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

      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-account-clock-outline</v-icon>
          Revisión de solicitudes
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <v-data-table
            :headers="headers"
            :items="requests"
            :loading="loading"
            :items-per-page="10"
            class="card-backgoundcustom requests-table"
          >
            <template #no-data>
              <v-empty-state
                headline="No hay solicitudes"
                text="Las solicitudes profesionales aparecerán aquí cuando un usuario las envíe desde Configuración."
                icon="mdi-account-search-outline"
              />
            </template>

            <template #item.status="{ value }">
              <v-chip :color="statusColor(value)" size="small" variant="tonal">
                {{ statusLabel(value) }}
              </v-chip>
            </template>

            <template #item.specialties="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="specialty in item.specialties || []"
                  :key="`${item.id}-${specialty}`"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ specialty }}
                </v-chip>
              </div>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-btn
                  size="small"
                  color="success"
                  variant="tonal"
                  prepend-icon="mdi-check-circle-outline"
                  :loading="processingId === item.id && processingAction === 'approve'"
                  :disabled="item.status === 'approved' || Boolean(processingId)"
                  @click="approveRequest(item)"

        class="pf-btn-patient">
                  Aprobar
                </v-btn>
                <v-btn
                  size="small"
                  color="warning"
                  variant="text"
                  prepend-icon="mdi-close-circle-outline"
                  :disabled="item.status === 'approved' || Boolean(processingId)"
                  @click="openRejectDialog(item)"

        class="pf-btn-hope">
                  Rechazar
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <v-dialog v-model="rejectDialog" class="bg-transparent" max-width="560">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Rechazar solicitud
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ selectedRequest?.professionalName || selectedRequest?.userName || "Solicitante" }}
            </p>
            <v-textarea
              v-model="rejectionReason"
              label="Motivo"
              rows="4"
              variant="outlined"
              density="comfortable"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="text"
              :disabled="Boolean(processingId)"
              @click="rejectDialog = false"

        class="pf-btn-ghost">
              Cancelar
            </v-btn>
            <v-btn
              color="warning"
              variant="tonal"
              prepend-icon="mdi-close-circle-outline"
              :loading="processingId === selectedRequest?.id && processingAction === 'reject'"
              :disabled="!selectedRequest || Boolean(processingId)"
              @click="rejectSelectedRequest"

        class="pf-btn-hope">
              Rechazar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { ref, watch } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import {
  approvePsychologistRequest,
  getPsychologistRequests,
  rejectPsychologistRequest,
} from "@/services/psychologistRequestService";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const requests = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const processingId = ref("");
const processingAction = ref("");
const rejectDialog = ref(false);
const selectedRequest = ref(null);
const rejectionReason = ref("");

const headers = [
  { title: "Estado", value: "status" },
  { title: "Nombre", value: "professionalName" },
  { title: "Correo", value: "userEmail" },
  { title: "Colegiatura", value: "licenseNumber" },
  { title: "Especialidades", value: "specialties", sortable: false },
  { title: "Modalidades", value: "modalities" },
  { title: "Acciones", key: "actions", sortable: false },
];

watch(
  () => appContext.activeMode,
  () => {
    loadRequests();
  },
  { immediate: true }
);

async function loadRequests() {
  if (appContext.activeMode !== "admin") {
    requests.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    requests.value = await getPsychologistRequests();
  } catch (error) {
    console.error("Error loading psychologist requests:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar las solicitudes profesionales.";
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

async function approveRequest(item) {
  await runRequestAction(
    item,
    "approve",
    () => approvePsychologistRequest(item),
    "Solicitud aprobada",
    "El perfil profesional fue creado y el usuario ya puede alternar a psicólogo."
  );
}

function openRejectDialog(item) {
  selectedRequest.value = item;
  rejectionReason.value = "";
  rejectDialog.value = true;
}

async function rejectSelectedRequest() {
  if (!selectedRequest.value) {
    return;
  }

  await runRequestAction(
    selectedRequest.value,
    "reject",
    () => rejectPsychologistRequest(selectedRequest.value.id, rejectionReason.value),
    "Solicitud rechazada",
    "El usuario podrá enviar una nueva solicitud con información actualizada."
  );
  rejectDialog.value = false;
  selectedRequest.value = null;
  rejectionReason.value = "";
}

async function runRequestAction(item, action, callback, title, message) {
  processingId.value = item.id;
  processingAction.value = action;
  errorMessage.value = "";

  try {
    await callback();
    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: { title, message },
      })
    );
    await loadRequests();
  } catch (error) {
    console.error("Error updating psychologist request:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo actualizar la solicitud.",
        },
      })
    );
  } finally {
    processingId.value = "";
    processingAction.value = "";
  }
}

function statusColor(status = "") {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "success";
  if (normalized === "rejected") return "warning";
  return "info";
}

function statusLabel(status = "") {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "Aprobada";
  if (normalized === "rejected") return "Rechazada";
  return "Pendiente";
}

function normalizeStatus(status = "") {
  return status.toString().trim().toLowerCase();
}
</script>

<style scoped>
.psychologist-requests-view {
  max-width: 1180px;
}

.requests-table {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .psychologist-requests-view {
    padding-inline: 16px;
  }
}
</style>

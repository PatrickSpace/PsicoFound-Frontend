<template>
  <LayoutDefault layout>
    <v-container v-if="workspace.active.value" class="pa-0 operational-alerts">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">Administración</p>
            <h1 class="text-h4 font-weight-bold">Alertas operativas</h1>
            <p class="text-body-1 text-medium-emphasis mt-2">
              Incidencias técnicas sin contenido clínico ni mensajes de pacientes.
            </p>
          </div>
          <v-btn variant="text" :loading="loading" @click="workspace.reload">Actualizar</v-btn>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-alert color="info" variant="tonal" class="mb-5">
        Los avisos por correo se dirigen a <strong>jplosta01@gmail.com</strong> mediante el canal operativo configurado.
      </v-alert>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
      <div class="d-flex flex-wrap ga-3 align-center mb-5">
        <v-select v-model="filter" :items="['Abiertas', 'Todas']" label="Estado" variant="outlined" hide-details max-width="220" />
        <v-chip color="error" variant="tonal">{{ openCount }} abiertas</v-chip>
      </div>

      <v-progress-linear v-if="loading" indeterminate />
      <v-empty-state v-else-if="!filtered.length" icon="mdi-shield-check-outline"
        headline="No hay alertas en este filtro" text="Las nuevas incidencias operativas aparecerán aquí." />
      <v-card v-for="alert in filtered" :key="alert.id" class="pa-5 mb-4" variant="outlined">
        <div class="d-flex flex-wrap justify-space-between align-start ga-3">
          <div>
            <div class="d-flex flex-wrap ga-2 align-center mb-2">
              <v-chip :color="alert.severity === 'critical' ? 'error' : 'warning'" size="small" variant="tonal">
                {{ alert.severity === 'critical' ? 'Crítica' : 'Advertencia' }}
              </v-chip>
              <v-chip :color="alert.status === 'acknowledged' ? 'success' : 'error'" size="small" variant="tonal">
                {{ statusLabel(alert.status) }}
              </v-chip>
            </div>
            <h2 class="text-h6">{{ alert.operation || 'Operación desconocida' }}</h2>
            <p class="text-body-2 mt-1">Código: {{ alert.code || 'sin código' }} · {{ alert.occurrenceCount || 1 }} ocurrencia(s)</p>
            <p class="text-caption mt-2">Último evento: {{ adminDate(alert.lastOccurredAt) }}</p>
            <p class="text-caption">Correlación: {{ alert.lastCorrelationId || 'no disponible' }}</p>
          </div>
          <v-btn v-if="alert.status !== 'acknowledged'" color="secondary" variant="outlined" @click="openAcknowledge(alert)">
            Marcar revisada
          </v-btn>
        </div>
        <p v-if="alert.acknowledgementNote" class="text-body-2 mt-4">Nota: {{ alert.acknowledgementNote }}</p>
      </v-card>

      <v-dialog v-model="dialog" max-width="540" :persistent="saving">
        <v-card title="Marcar alerta como revisada">
          <v-card-text>
            <p class="mb-4">La alerta seguirá en el historial y se reabrirá si la incidencia vuelve a ocurrir.</p>
            <v-textarea v-model="note" label="Nota de revisión (opcional)" maxlength="500" counter variant="outlined" />
            <v-alert v-if="actionError" type="error" variant="tonal">{{ actionError }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn :disabled="saving" @click="dialog = false">Cancelar</v-btn>
            <v-btn color="secondary" :loading="saving" @click="acknowledge">Confirmar revisión</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAdminWorkspace } from "@/composables/useAdminWorkspace";
import { adminCall, adminDate, watchAdminCollection } from "@/services/adminService";

const alerts = ref([]);
const loading = ref(true);
const error = ref("");
const filter = ref("Abiertas");
const dialog = ref(false);
const selected = ref(null);
const note = ref("");
const saving = ref(false);
const actionError = ref("");

const openCount = computed(() => alerts.value.filter((item) => item.status !== "acknowledged").length);
const filtered = computed(() => alerts.value
  .filter((item) => filter.value === "Todas" || item.status !== "acknowledged")
  .sort((left, right) => (right.lastOccurredAt?.seconds || 0) - (left.lastOccurredAt?.seconds || 0)));

const workspace = useAdminWorkspace(() => {
  alerts.value = [];
  loading.value = true;
  error.value = "";
  dialog.value = false;
  selected.value = null;
  note.value = "";
  saving.value = false;
  actionError.value = "";
}, current => watchAdminCollection("operational_alerts", values => {
  if (current()) {
    alerts.value = values;
    loading.value = false;
  }
}, () => {
  if (current()) {
    error.value = "No pudimos cargar las alertas operativas.";
    loading.value = false;
  }
}));

function statusLabel(status) {
  if (status === "acknowledged") return "Revisada";
  if (status === "reopened") return "Reabierta";
  return "Abierta";
}

function openAcknowledge(alert) {
  selected.value = alert;
  note.value = "";
  actionError.value = "";
  dialog.value = true;
}

async function acknowledge() {
  if (!selected.value || saving.value) return;
  const current = workspace.capture();
  saving.value = true;
  actionError.value = "";
  try {
    await adminCall("acknowledgeOperationalAlert", {
      alertId: selected.value.id,
      note: note.value,
    });
    if (current()) dialog.value = false;
  } catch (cause) {
    if (current()) actionError.value = cause.message || "No pudimos actualizar la alerta.";
  } finally {
    if (current()) saving.value = false;
  }
}
</script>

<style scoped>
.operational-alerts { max-width: 1200px; }
</style>

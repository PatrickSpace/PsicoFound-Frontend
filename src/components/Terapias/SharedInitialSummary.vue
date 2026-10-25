<template>
  <v-card class="card-backgoundcustom pa-4 mb-5">
    <h2 class="text-h6 mb-3">Resumen inicial compartido</h2>
    <v-progress-linear v-if="loading" indeterminate />
    <v-alert v-else-if="error" type="warning">{{ error }}</v-alert>
    <p v-else-if="summary?.status === 'absent'">Resumen no disponible: no hay motivo ni temas registrados.</p>
    <div v-else-if="summary">
      <p><strong>Motivo:</strong> {{ summary.reason || 'No registrado' }}</p>
      <p><strong>Temas:</strong> {{ summary.topics.join(', ') || 'No registrados' }}</p>
      <p v-if="summary.preferences?.soloConversar"><strong>Tipo de apoyo:</strong> Solo conversar</p>
      <p v-if="summary.preferences?.modalidad"><strong>Modalidad:</strong> {{ summary.preferences.modalidad }}</p>
      <p v-if="summary.preferences?.genero"><strong>Género:</strong> {{ summary.preferences.genero }}</p>
      <p v-if="summary.preferences?.edad"><strong>Edad:</strong> {{ summary.preferences.edad }}</p>
      <p v-if="summary.preferences?.enfoque"><strong>Enfoque:</strong> {{ summary.preferences.enfoque }}</p>
      <p class="text-caption mt-2">{{ summary.source }}<span v-if="summary.recordedAt"> · {{ formatTherapyDate(summary.recordedAt) }}</span></p>
      <v-btn v-if="mode === 'psychologist' && summary.historyAvailable"
        class="pf-btn-secondary mt-3" color="secondary" variant="tonal"
        prepend-icon="mdi-message-text-outline" @click="openHistory">
        Ver historial completo
      </v-btn>
    </div>
    <v-btn v-if="error" class="pf-btn-secondary mt-3" @click="load">Reintentar resumen</v-btn>
  </v-card>

  <v-dialog v-model="historyDialog" max-width="760">
    <v-card class="pa-4 card-backgoundcustom">
      <v-card-title class="text-h6 font-weight-bold px-0 pt-0">Historial compartido por el paciente</v-card-title>
      <v-card-text>
        <v-alert color="info" variant="tonal" class="mb-4" density="compact">
          Este historial fue compartido para preparar el acompañamiento. No constituye un diagnóstico.
        </v-alert>
        <v-progress-linear v-if="historyLoading && !historyItems.length" indeterminate />
        <v-alert v-if="historyError" color="warning" variant="tonal" class="mb-3">{{ historyError }}</v-alert>
        <div class="d-flex flex-column ga-3">
          <div v-for="item in historyItems" :key="item.id" class="pa-3 rounded border-sm">
            <div class="text-caption text-medium-emphasis">{{ item.role === 'assistant' ? 'Lurems' : 'Paciente' }}</div>
            <p class="text-body-2 mb-0" style="white-space: pre-wrap">{{ item.text }}</p>
          </div>
        </div>
        <v-btn v-if="historyCursor" class="mt-4" variant="text" :loading="historyLoading" @click="loadHistory">
          Cargar más
        </v-btn>
      </v-card-text>
      <v-card-actions><v-spacer /><v-btn variant="text" @click="historyDialog = false">Cerrar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { getTherapySharedHistory, getTherapySharedSummary } from "@/services/followupService";
import { createRequestGate, formatTherapyDate } from "@/utils/therapyContext";
const props = defineProps({ therapyId: { type: String, required: true }, mode: { type: String, required: true } });
const summary = ref(null);
const error = ref("");
const loading = ref(false);
const historyDialog = ref(false);
const historyItems = ref([]);
const historyCursor = ref("");
const historyLoading = ref(false);
const historyError = ref("");
const gate = createRequestGate();
async function load() {
  const ticket = gate.next();
  summary.value = null;
  error.value = "";
  loading.value = true;
  try {
    const data = await getTherapySharedSummary(props.therapyId, props.mode);
    if (gate.isCurrent(ticket)) summary.value = data;
  } catch (cause) {
    if (gate.isCurrent(ticket)) error.value = cause.code?.includes("permission-denied")
      ? "Acceso restringido al resumen inicial." : "Error de carga del resumen. Puedes reintentar.";
  } finally {
    if (gate.isCurrent(ticket)) loading.value = false;
  }
}
async function openHistory() {
  historyItems.value = [];
  historyCursor.value = "";
  historyError.value = "";
  historyDialog.value = true;
  await loadHistory();
}
async function loadHistory() {
  if (historyLoading.value) return;
  historyLoading.value = true;
  historyError.value = "";
  try {
    const data = await getTherapySharedHistory(props.therapyId, historyCursor.value);
    historyItems.value.push(...(data.items || []));
    historyCursor.value = data.nextCursor || "";
  } catch (cause) {
    historyError.value = cause.code?.includes("permission-denied")
      ? "El acceso ya no está disponible. Verifica que el pago de la primera cita esté aprobado y que esa cita no haya sido cancelada."
      : "No pudimos cargar el historial compartido.";
  } finally {
    historyLoading.value = false;
  }
}
watch(() => [props.therapyId, props.mode], load, { immediate: true, flush: "sync" });
onBeforeUnmount(() => gate.next());
</script>

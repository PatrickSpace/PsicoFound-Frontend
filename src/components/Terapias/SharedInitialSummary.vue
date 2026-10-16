<template>
  <v-card class="card-backgoundcustom pa-4 mb-5">
    <h2 class="text-h6 mb-3">Resumen inicial compartido</h2>
    <v-progress-linear v-if="loading" indeterminate />
    <v-alert v-else-if="error" type="warning">{{ error }}</v-alert>
    <p v-else-if="summary?.status === 'absent'">Resumen no disponible: no hay motivo ni temas registrados.</p>
    <div v-else-if="summary">
      <p><strong>Motivo:</strong> {{ summary.reason || 'No registrado' }}</p>
      <p><strong>Temas:</strong> {{ summary.topics.join(', ') || 'No registrados' }}</p>
      <p class="text-caption mt-2">{{ summary.source }}<span v-if="summary.recordedAt"> · {{ formatTherapyDate(summary.recordedAt) }}</span></p>
    </div>
    <v-btn v-if="error" class="pf-btn-secondary mt-3" @click="load">Reintentar resumen</v-btn>
  </v-card>
</template>
<script setup>
import { onBeforeUnmount, ref, watch } from "vue";
import { getTherapySharedSummary } from "@/services/followupService";
import { createRequestGate, formatTherapyDate } from "@/utils/therapyContext";
const props = defineProps({ therapyId: { type: String, required: true }, mode: { type: String, required: true } });
const summary = ref(null);
const error = ref("");
const loading = ref(false);
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
watch(() => [props.therapyId, props.mode], load, { immediate: true, flush: "sync" });
onBeforeUnmount(() => gate.next());
</script>

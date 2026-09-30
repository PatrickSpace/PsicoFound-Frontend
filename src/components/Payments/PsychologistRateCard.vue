<template>
  <v-card class="psychologist-rate-card pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
    <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
      <v-icon color="secondary" size="small">mdi-cash-multiple</v-icon>
      Mi tarifa
    </v-card-title>
    <v-card-text>
      <v-divider class="mb-4" />
      <v-progress-linear v-if="loading" indeterminate color="secondary" aria-label="Cargando tarifa" class="mb-4" />
      <v-alert v-if="loadError || errorMessage" color="error" variant="tonal" class="mb-4" role="alert">{{ loadError || errorMessage }}</v-alert>
      <p v-if="!loading" class="text-body-2 mb-4">
        Tarifa actual: <strong>{{ currentRate ? formatPaymentAmount(currentRate.amountMinor) : 'Sin configurar' }}</strong>
      </p>
      <v-alert v-if="currentUnavailable" color="warning" variant="tonal" class="mb-4">
        Tu tarifa anterior ya no está activa. Elige otra para tus próximas reservas.
      </v-alert>
      <p v-if="!loading && !activeRates.length && !loadError" class="text-body-2 text-medium-emphasis mb-4">
        No hay tarifas activas. El administrador debe habilitar una opción.
      </p>
      <v-select :model-value="selectedId" :items="options" item-title="title" item-value="value"
        label="Tarifa por sesión" variant="outlined" density="comfortable"
        :disabled="saving || loading || Boolean(loadError) || !activeRates.length || therapist?.activo === false"
        @update:model-value="chooseRate" />
      <template v-if="selectedRate">
        <dl class="professional-rate-split">
          <div><dt>Precio al paciente</dt><dd>{{ formatPaymentAmount(selectedRate.amountMinor) }}</dd></div>
          <div><dt>Para ti · 70%</dt><dd class="professional-rate-share">{{ formatPaymentAmount(selectedRate.psychologistAmountMinor) }}</dd></div>
          <div><dt>Comisión Lurems · 30%</dt><dd>{{ formatPaymentAmount(selectedRate.platformAmountMinor) }}</dd></div>
        </dl>
        <p class="text-caption text-medium-emphasis mt-3">La comisión de Mercado Pago está incluida en la parte de Lurems.</p>
        <v-chip v-if="selectedRate.isTest" class="mt-3" color="warning" variant="tonal" size="small">Tarifa de prueba</v-chip>
      </template>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-4">Los cambios aplican a nuevas reservas. Las citas ya agendadas conservarán su importe.</p>
      <v-btn class="pf-btn-secondary" color="secondary" variant="tonal" prepend-icon="mdi-content-save-outline"
        :disabled="!canSave" :loading="saving" @click="save">Guardar tarifa</v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useAppContextStore } from "@/store/appContext";
import { setPsychologistPaymentRate, watchPaymentRates, watchTherapistRate } from "@/services/paymentService";
import { getCallableErrorMessage } from "@/services/onboardingService";
import { formatPaymentAmount } from "@/utils/paymentRates";

const props = defineProps({ therapistId: { type: String, required: true } });
const appContext = useAppContextStore();
const rates = ref([]);
const therapist = ref(null);
const ratesLoading = ref(true);
const therapistLoading = ref(true);
const loading = computed(() => ratesLoading.value || therapistLoading.value);
const loadError = ref("");
const errorMessage = ref("");
const saving = ref(false);
const selectedId = ref(null);
const selectedVersion = ref(0);
const selectionVersion = ref(0);
const currentRate = computed(() => rates.value.find((rate) => rate.id === therapist.value?.paymentRateId) || null);
const selectedRate = computed(() => rates.value.find((rate) => rate.id === selectedId.value) || null);
const currentUnavailable = computed(() => !loading.value && therapist.value?.paymentRateId && !currentRate.value?.active);
const activeRates = computed(() => rates.value.filter((rate) => rate.active));
const options = computed(() => rates.value.filter((rate) => rate.active || rate.id === selectedId.value).map((rate) => ({
  value: rate.id,
  title: `${formatPaymentAmount(rate.amountMinor)} · ${rate.name}${rate.isTest ? ' · Prueba' : ''}${!rate.active ? ' · Inactiva' : ''}`,
  props: { disabled: !rate.active },
})));
const canSave = computed(() => !saving.value && !loading.value && !loadError.value &&
  therapist.value?.activo !== false && selectedRate.value?.active && selectedId.value !== therapist.value?.paymentRateId);
let stopRates;
let stopTherapist;

watch(() => props.therapistId, (id) => {
  stopRates?.();
  stopTherapist?.();
  rates.value = [];
  therapist.value = null;
  selectedId.value = null;
  loadError.value = "";
  errorMessage.value = "";
  ratesLoading.value = true;
  therapistLoading.value = true;
  stopRates = watchPaymentRates((items) => {
    rates.value = items;
    ratesLoading.value = false;
  }, () => {
    ratesLoading.value = false;
    loadError.value = "No pudimos cargar las tarifas. Vuelve a entrar en Configuración.";
  });
  stopTherapist = watchTherapistRate(id, (profile) => {
    const wasUnchanged = selectedId.value === (therapist.value?.paymentRateId || null);
    therapist.value = profile;
    therapistLoading.value = false;
    if (!profile) {
      loadError.value = "No encontramos tu perfil profesional.";
      return;
    }
    appContext.therapistProfile = profile;
    if (wasUnchanged) {
      selectedId.value = profile.paymentRateId || null;
      selectionVersion.value = profile.paymentRateSelectionVersion || 0;
    }
  }, () => {
    therapistLoading.value = false;
    loadError.value = "No pudimos cargar tu tarifa actual. Vuelve a entrar en Configuración.";
  });
}, { immediate: true });

onBeforeUnmount(() => { stopRates?.(); stopTherapist?.(); });

function chooseRate(id) {
  selectedId.value = id;
  selectedVersion.value = rates.value.find((rate) => rate.id === id)?.version || 0;
  selectionVersion.value = therapist.value?.paymentRateSelectionVersion || 0;
  errorMessage.value = "";
}

async function save() {
  if (!canSave.value) return;
  saving.value = true;
  errorMessage.value = "";
  try {
    const result = await setPsychologistPaymentRate({
      therapistId: props.therapistId,
      rateId: selectedId.value,
      expectedRateVersion: selectedVersion.value,
      expectedSelectionVersion: selectionVersion.value,
    });
    selectionVersion.value = result.selectionVersion;
    therapist.value = { ...therapist.value, paymentRateId: result.rateId, paymentRateSelectionVersion: result.selectionVersion };
    appContext.therapistProfile = therapist.value;
    window.dispatchEvent(new CustomEvent("ui-success", { detail: { title: "Tarifa actualizada", message: "Tu tarifa para nuevas reservas quedó guardada." } }));
  } catch (error) {
    errorMessage.value = getCallableErrorMessage(error, "No pudimos guardar tu tarifa.");
    // Require a fresh choice after a concurrent catalog or profile change.
    selectedId.value = therapist.value?.paymentRateId || null;
    selectionVersion.value = therapist.value?.paymentRateSelectionVersion || 0;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.psychologist-rate-card { min-width: 0; }
.professional-rate-split { display: grid; gap: 12px; font-size: 0.9375rem; }
.professional-rate-split > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.professional-rate-split dd { margin: 0; font-weight: 600; }
.professional-rate-share { color: rgb(var(--v-theme-secondary)); }
.psychologist-rate-card :deep(.v-select__selection-text) { white-space: normal; overflow-wrap: anywhere; }
@media (max-width: 599px) {
  .psychologist-rate-card .v-btn { width: 100%; }
}
</style>

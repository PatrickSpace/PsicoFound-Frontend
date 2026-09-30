<template>
  <LayoutDefault layout>
    <v-container class="payment-rates-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">Administración</p>
            <h1 class="text-h4 font-weight-bold">Cobros y tarifas</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">Tarifas disponibles para los profesionales de Lurems.</p>
          </div>
          <div class="page-header__actions">
            <v-btn class="pf-btn-primary" color="secondary" prepend-icon="mdi-plus" @click="openCreate">Nueva tarifa</v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-alert v-if="errorMessage" color="error" variant="tonal" class="mb-4" role="alert">{{ errorMessage }}</v-alert>
      <div class="rates-toolbar">
        <span class="text-body-2 text-medium-emphasis">{{ rates.length }} tarifas · Lurems 30% · Profesional 70%</span>
        <v-select v-model="filter" :items="filterOptions" label="Estado" variant="outlined" density="comfortable" hide-details />
      </div>
      <div v-if="loading" class="py-10 text-center" role="status">
        <v-progress-circular indeterminate color="secondary" aria-label="Cargando tarifas" />
      </div>
      <v-empty-state v-else-if="!filteredRates.length && !errorMessage" icon="mdi-cash-multiple"
        :headline="rates.length ? 'No hay tarifas en este estado' : 'Aún no hay tarifas'"
        :text="rates.length ? 'Puedes consultar otro estado.' : 'Crea la primera tarifa con su importe y enlace de Mercado Pago.'" />
      <v-row v-else align="stretch">
        <v-col v-for="rate in filteredRates" :key="rate.id" cols="12" md="6" class="d-flex">
          <v-card class="rate-card card-backgoundcustom pa-5" elevation="2" variant="text">
            <div class="rate-card__heading">
              <h2 class="text-h6 font-weight-bold">{{ rate.name }}</h2>
              <v-chip v-if="rate.isTest" color="warning" size="small" variant="tonal">Prueba</v-chip>
            </div>
            <p class="rate-card__amount">{{ formatPaymentAmount(rate.amountMinor) }} <span>por sesión</span></p>
            <dl class="rate-split">
              <div><dt>Profesional · 70%</dt><dd>{{ formatPaymentAmount(rate.psychologistAmountMinor) }}</dd></div>
              <div><dt>Lurems · 30%</dt><dd>{{ formatPaymentAmount(rate.platformAmountMinor) }}</dd></div>
            </dl>
            <a class="rate-link" :href="rate.paymentUrl" target="_blank" rel="noopener noreferrer">
              <v-icon size="18">mdi-open-in-new</v-icon><span>{{ rate.paymentUrl }}</span>
            </a>
            <v-divider class="my-4" />
            <div class="rate-card__actions">
              <v-switch :model-value="rate.active" :label="rate.active ? 'Activa' : 'Inactiva'" color="secondary"
                density="compact" hide-details inset :loading="busyId === rate.id" :disabled="Boolean(busyId)"
                :aria-label="`Activar tarifa ${rate.name}`" @update:model-value="setActive(rate, $event)" />
              <div class="d-flex ga-1">
                <v-btn icon="mdi-history" variant="text" class="pf-btn-icon" aria-label="Ver historial de tarifa"
                  v-tooltip="'Ver historial'" @click="openHistory(rate)" />
                <v-btn icon="mdi-pencil-outline" variant="text" class="pf-btn-icon" aria-label="Editar tarifa"
                  v-tooltip="'Editar tarifa'" :disabled="Boolean(busyId)" @click="openEdit(rate)" />
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog v-model="editDialog" max-width="620" :persistent="saving" scrollable>
        <v-card class="card-backgoundcustom pa-4" elevation="2">
          <v-card-title class="text-h6 font-weight-bold rate-dialog-title">{{ editing ? 'Editar tarifa' : 'Nueva tarifa' }}</v-card-title>
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="save">
              <v-alert v-if="formError" color="error" variant="tonal" class="mb-5" role="alert">{{ formError }}</v-alert>
              <v-text-field v-model="form.name" label="Nombre de la tarifa" variant="outlined" maxlength="80"
                :disabled="saving" :rules="[required]" class="mb-3" />
              <v-text-field v-model="form.amount" label="Importe por sesión" prefix="S/" inputmode="decimal"
                variant="outlined" :readonly="editing" :disabled="saving" :rules="[validAmount]" class="mb-3"
                :hint="editing ? 'Para cambiar el importe, crea una nueva tarifa.' : 'Por ejemplo: 110, 120 o 1.10.'" persistent-hint />
              <v-text-field v-model="form.paymentUrl" label="Link de Mercado Pago" type="url" variant="outlined"
                :disabled="saving" :rules="[validLink]" hint="El importe del enlace debe coincidir con esta tarifa."
                persistent-hint class="mb-3" />
              <dl v-if="splitPreview" class="rate-split rate-split--preview">
                <div><dt>Profesional · 70%</dt><dd>{{ formatPaymentAmount(splitPreview.psychologistAmountMinor) }}</dd></div>
                <div><dt>Lurems · 30%</dt><dd>{{ formatPaymentAmount(splitPreview.platformAmountMinor) }}</dd></div>
              </dl>
              <p class="text-caption text-medium-emphasis mt-2 mb-3">La comisión de Mercado Pago se descuenta de la parte de Lurems.</p>
              <v-switch v-model="form.active" label="Tarifa activa" color="secondary" inset hide-details :disabled="saving" />
              <v-checkbox v-model="form.isTest" label="Identificar como tarifa de prueba" color="secondary"
                hide-details :disabled="saving" />
              <p v-if="form.isTest" class="text-caption text-medium-emphasis mt-2">Un enlace de producción realiza un cobro real, aunque la tarifa sea de prueba.</p>
              <button type="submit" hidden aria-hidden="true" tabindex="-1" />
            </v-form>
          </v-card-text>
          <v-card-actions class="rate-dialog-actions">
            <v-btn variant="text" class="pf-btn-ghost" :disabled="saving" @click="editDialog = false">Cancelar</v-btn>
            <v-btn color="secondary" class="pf-btn-primary" prepend-icon="mdi-content-save-outline"
              :loading="saving" :disabled="saving || !canSave" @click="save">Guardar tarifa</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="historyDialog" max-width="620" scrollable>
        <v-card class="card-backgoundcustom pa-4">
          <v-card-title class="text-h6 font-weight-bold rate-dialog-title">Historial de {{ historyName }}</v-card-title>
          <v-card-text>
            <v-progress-linear v-if="historyLoading" indeterminate color="secondary" aria-label="Cargando historial" />
            <v-alert v-if="historyError" color="error" variant="tonal" role="alert">{{ historyError }}</v-alert>
            <p class="text-caption text-medium-emphasis mb-3">Últimas 20 versiones</p>
            <section v-for="version in history" :key="version.id" class="rate-history-entry">
              <div class="d-flex flex-wrap ga-2 align-center justify-space-between">
                <strong>Versión {{ version.version }} · {{ version.active ? 'Activa' : 'Inactiva' }}</strong>
                <span>{{ formatDate(version.changedAt) }}</span>
              </div>
              <p>{{ version.name }} · {{ formatPaymentAmount(version.amountMinor) }}{{ version.isTest ? ' · Prueba' : '' }}</p>
              <a class="rate-link" :href="version.paymentUrl" target="_blank" rel="noopener noreferrer">{{ version.paymentUrl }}</a>
              <p class="text-caption text-medium-emphasis mt-2">Responsable: {{ version.changedBy }}</p>
            </section>
          </v-card-text>
          <v-card-actions><v-btn class="pf-btn-ghost" variant="text" @click="historyDialog = false">Cerrar</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { getPaymentRateHistory, newPaymentRateId, savePaymentRate, watchPaymentRates } from "@/services/paymentService";
import { getCallableErrorMessage } from "@/services/onboardingService";
import { formatPaymentAmount, isMercadoPagoLink, parseAmountMinor, previewPaymentSplit } from "@/utils/paymentRates";

const rates = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const busyId = ref("");
const filter = ref("all");
const filterOptions = [{ title: "Todas", value: "all" }, { title: "Activas", value: "active" }, { title: "Inactivas", value: "inactive" }];
const filteredRates = computed(() => rates.value.filter((rate) => filter.value === "all" || rate.active === (filter.value === "active")));
const editDialog = ref(false);
const editing = ref(false);
const formRef = ref(null);
const saving = ref(false);
const formError = ref("");
const form = reactive({ rateId: "", expectedVersion: 0, name: "", amount: "", paymentUrl: "", active: true, isTest: false });
const splitPreview = computed(() => previewPaymentSplit(parseAmountMinor(form.amount)));
const required = (value) => Boolean(value?.trim()) || "Ingresa un nombre.";
const validAmount = (value) => parseAmountMinor(value) !== null || "Ingresa de S/0.01 a S/100,000.00, con hasta dos decimales.";
const validLink = (value) => isMercadoPagoLink(value) || "Usa un link HTTPS de mpago.la o mercadopago.com.pe.";
const canSave = computed(() => required(form.name) === true && form.name.trim().length <= 80 && validAmount(form.amount) === true && validLink(form.paymentUrl) === true);
const historyDialog = ref(false);
const historyName = ref("");
const history = ref([]);
const historyLoading = ref(false);
const historyError = ref("");
let unsubscribe;
let historyRequest = 0;

onMounted(() => {
  unsubscribe = watchPaymentRates((value) => {
    rates.value = value;
    loading.value = false;
    errorMessage.value = "";
  }, () => {
    loading.value = false;
    errorMessage.value = "No pudimos cargar las tarifas. Comprueba tu acceso de administrador y vuelve a entrar.";
  });
});
onBeforeUnmount(() => { unsubscribe?.(); historyRequest++; });

function openCreate() {
  editing.value = false;
  formError.value = "";
  Object.assign(form, { rateId: newPaymentRateId(), expectedVersion: 0, name: "", amount: "", paymentUrl: "", active: true, isTest: false });
  formRef.value?.resetValidation();
  editDialog.value = true;
}

function openEdit(rate) {
  editing.value = true;
  formError.value = "";
  Object.assign(form, { rateId: rate.id, expectedVersion: rate.version, name: rate.name, amount: (rate.amountMinor / 100).toFixed(2), paymentUrl: rate.paymentUrl, active: rate.active, isTest: rate.isTest });
  formRef.value?.resetValidation();
  editDialog.value = true;
}

async function save() {
  if (saving.value || !canSave.value) return;
  if (!(await formRef.value.validate()).valid) return;
  saving.value = true;
  formError.value = "";
  try {
    await savePaymentRate({ ...form, amountMinor: parseAmountMinor(form.amount) });
    editDialog.value = false;
    window.dispatchEvent(new CustomEvent("ui-success", { detail: { title: "Tarifa guardada", message: "El catálogo de cobros fue actualizado." } }));
  } catch (error) {
    formError.value = getCallableErrorMessage(error, "No pudimos guardar la tarifa.");
  } finally {
    saving.value = false;
  }
}

async function setActive(rate, active) {
  if (busyId.value) return;
  busyId.value = rate.id;
  errorMessage.value = "";
  try {
    await savePaymentRate({ rateId: rate.id, expectedVersion: rate.version, name: rate.name, amountMinor: rate.amountMinor, paymentUrl: rate.paymentUrl, isTest: rate.isTest, active: Boolean(active) });
  } catch (error) {
    errorMessage.value = getCallableErrorMessage(error, "No pudimos cambiar el estado de la tarifa.");
  } finally {
    busyId.value = "";
  }
}

async function openHistory(rate) {
  const request = ++historyRequest;
  historyName.value = rate.name;
  history.value = [];
  historyError.value = "";
  historyLoading.value = true;
  historyDialog.value = true;
  try {
    const versions = await getPaymentRateHistory(rate.id);
    if (request === historyRequest) history.value = versions;
  } catch {
    if (request === historyRequest) historyError.value = "No pudimos cargar el historial.";
  } finally {
    if (request === historyRequest) historyLoading.value = false;
  }
}

function formatDate(timestamp) {
  return timestamp?.toDate ? new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short" }).format(timestamp.toDate()) : "Guardando…";
}
</script>

<style scoped>
.rates-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.rates-toolbar .v-input { flex: 0 1 200px; min-width: 160px; }
.rate-card { display: flex; flex-direction: column; width: 100%; min-width: 0; }
.rate-card__heading { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
.rate-card__heading h2 { overflow-wrap: anywhere; }
.rate-card__amount { margin-block: 16px; font-size: 1.75rem; font-weight: 700; }
.rate-card__amount span { font-size: 0.875rem; font-weight: 400; white-space: nowrap; }
.rate-split { display: grid; gap: 12px; margin-bottom: 20px; font-size: 0.9375rem; }
.rate-split > div { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.rate-split dd { margin: 0; font-weight: 600; }
.rate-split--preview { margin-top: 12px; }
.rate-link { display: flex; align-items: start; gap: 8px; color: rgb(var(--v-theme-secondary)); overflow-wrap: anywhere; font-size: 0.875rem; }
.rate-link span { min-width: 0; }
.rate-card > .rate-link { margin-top: auto; }
.rate-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rate-card__actions .v-input { flex: 1; min-width: 0; }
.rate-dialog-title { white-space: normal; overflow-wrap: anywhere; }
.rate-dialog-actions { flex-wrap: wrap; justify-content: flex-end; }
.rate-history-entry { padding-block: 16px; border-bottom: 1px solid rgba(var(--v-theme-border-subtle), 0.35); overflow-wrap: anywhere; }
@media (max-width: 599px) {
  .rates-toolbar .v-input { flex-basis: 100%; }
  .rate-card__amount { font-size: 1.5rem; }
  .rate-dialog-actions .v-btn { flex: 1 1 100%; margin-inline: 0; }
}
</style>

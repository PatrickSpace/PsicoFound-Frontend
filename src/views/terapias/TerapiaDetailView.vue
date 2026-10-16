<template>
  <LayoutDefault layout>
    <v-container class="therapy-detail-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Proceso terapéutico
            </p>
            <h1 class="text-h4 font-weight-bold">Detalle de terapia</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              {{ isPsychologistMode ? "Consulta las terapias vinculadas a tu atención y continúa el seguimiento." : "Revisa el estado del proceso y consulta sesiones asociadas." }}
            </p>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-progress-linear v-if="loading" indeterminate class="mb-4" />
      <v-alert v-if="loadError" type="error" class="mb-4">{{ loadError }}</v-alert>
      <TherapySelect v-if="isPsychologistMode && therapy" :model-value="therapy.id" :items="therapyOptions"
        label="Terapia del paciente" variant="outlined" @update:model-value="selectTherapy" />
      <SharedInitialSummary v-if="isPsychologistMode && therapy" :therapy-id="therapy.id" :mode="appContext.activeMode" />
      <v-row v-if="therapy" align="stretch">
        <v-col cols="12" md="8" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-account-heart-outline</v-icon>
              {{ therapy.terapeutaNombre || "Terapia activa" }}
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <div class="d-flex flex-wrap align-center ga-3 mb-4">
                <v-chip size="small" variant="tonal" :color="statusColor(therapy.estado)">
                  {{ therapy.estado || "activo" }}
                </v-chip>
                <span class="text-body-2 text-medium-emphasis">
                  Creada el {{ formattedCreationDate }}
                </span>
              </div>
              <v-list density="compact" class="bg-transparent pa-0">
                <v-list-item
                  prepend-icon="mdi-account-outline"
                  title="Paciente"
                  :subtitle="therapy.pacienteNombre || 'Usuario demo'"
                />
                <v-list-item
                  prepend-icon="mdi-calendar-month-outline"
                  title="Citas registradas"
                  :subtitle="`${Array.isArray(therapy.citas) ? therapy.citas.length : 0} sesiones asociadas`"
                />
                <v-list-item
                  prepend-icon="mdi-heart-pulse"
                  title="Estado del proceso"
                  :subtitle="therapy.estado || 'activo'"
                />
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-lightning-bolt-outline</v-icon>
              Acciones
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <div v-if="!isAdminMode" class="d-flex flex-column ga-3 mb-4">
                <v-btn class="pf-btn-secondary" :to="followupRoute('/progreso')">Objetivos de esta terapia</v-btn>
                <v-btn class="pf-btn-secondary" :to="followupRoute('/herramientas')">Ejercicios de esta terapia</v-btn>
                <v-btn class="pf-btn-secondary" :to="followupRoute('/historial')">Historial terapéutico</v-btn>
              </div>
              <v-btn
                v-if="canCreateAppointment"
                block
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-calendar-plus"
                :disabled="normalizedTherapyStatus !== 'activo'"
                @click="dialog = true"

        class="pf-btn-secondary">
                Agendar cita
              </v-btn>
              <div class="text-caption text-medium-emphasis mt-3">
                {{ appointmentActionHint }}
              </div>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-4 pf-btn-hope"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-pause-circle"
                :loading="changingStatus === 'pausa'"
                :disabled="normalizedTherapyStatus !== 'activo' || Boolean(changingStatus)"
                @click="changeTherapyStatus('pausa')"
              >
                Poner en pausa
              </v-btn>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-3 pf-btn-patient"
                color="success"
                variant="tonal"
                prepend-icon="mdi-play-circle"
                :loading="changingStatus === 'activo'"
                :disabled="!['pausa', 'cancelada'].includes(normalizedTherapyStatus) || Boolean(changingStatus)"
                @click="changeTherapyStatus('activo')"
              >
                Reactivar terapia
              </v-btn>
              <v-btn
                v-if="canChangeTherapyStatus"
                block
                class="mt-3 pf-btn-destructive"
                color="error"
                variant="tonal"
                prepend-icon="mdi-cancel"
                :loading="changingStatus === 'cancelada'"
                :disabled="normalizedTherapyStatus === 'cancelada' || Boolean(changingStatus)"
                @click="changeTherapyStatus('cancelada')"
              >
                Cancelar terapia
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card v-else-if="!loading && !loadError" class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-text>
          No se encontró la terapia seleccionada.
        </v-card-text>
      </v-card>

      <v-card
        v-if="therapy"
        class="pa-4 mt-6 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <v-card-title
          class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0"
        >
          <v-icon color="secondary" size="small">
            mdi-calendar-check-outline
          </v-icon>
          Citas asociadas
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />
          <TherapyAppointmentsTable :appointments="therapy.citas || []" />
        </v-card-text>
      </v-card>

      <CitaDialog
        v-model="dialog"
        :terapia-id="therapy?.id || ''"
        :terapeuta-id="therapy?.terapeutaId || ''"
        :terapeuta-nombre="therapy?.terapeutaNombre || ''"
        :paciente-uid="therapy?.pacienteUid || ''"
        :paciente-nombre="therapy?.pacienteNombre || ''"
        :paciente-email="therapy?.pacienteEmail || ''"
        @saved="loadTherapy"
      />
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import SharedInitialSummary from "@/components/Terapias/SharedInitialSummary.vue";
import { createRequestGate, formatTherapyDate, therapyLabel } from "@/utils/therapyContext";
import TherapySelect from "@/components/Terapias/TherapySelect.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import {
  getActiveTherapyByPatient,
  getTherapiesByTherapist,
  getTherapyById,
  getTherapyByIdForPatient,
  updateTherapyStatus,
} from "@/services/terapiaService";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const therapy = ref(null);
const dialog = ref(false);
const changingStatus = ref("");
const loading = ref(false);
const loadError = ref("");
const siblingTherapies = ref([]);
const therapyOptions = computed(() => siblingTherapies.value.map((t) => ({ title: therapyLabel(t), value: t.id })));
const gate = createRequestGate();
onBeforeUnmount(() => gate.next());
function selectTherapy(id) {
  if (id) router.replace({ path: "/terapiadetail", query: { id, contextMode: appContext.activeMode } });
}
function followupRoute(path) {
  return { path, query: { contextMode: appContext.activeMode, patientUid: therapy.value.pacienteUid, therapyId: therapy.value.id } };
}

const formattedCreationDate = computed(() => formatTherapyDate(therapy.value?.fechaCreacion, { dateOnly: true }));

const normalizedTherapyStatus = computed(() =>
  (therapy.value?.estado || "").toString().trim().toLowerCase()
);

const isPatientMode = computed(() => appContext.activeMode === "patient");
const isPsychologistMode = computed(() => appContext.activeMode === "psychologist");
const isAdminMode = computed(() => appContext.activeMode === "admin");
const canCreateAppointment = computed(
  () => isPatientMode.value && normalizedTherapyStatus.value === "activo"
);
const canChangeTherapyStatus = computed(
  () => isPatientMode.value && Boolean(therapy.value?.id)
);
const appointmentActionHint = computed(() =>
  canCreateAppointment.value
    ? "Solo puedes agendar nuevas citas cuando la terapia está en estado activo."
    : "La agenda de nuevas citas está disponible desde la vista del paciente."
);

function statusColor(status) {
  const normalized = (status || "").toString().trim().toLowerCase();
  if (normalized === "realizada" || normalized === "completada") return "primary";
  if (normalized === "activo") return "success";
  if (normalized === "pausa") return "warning";
  if (normalized === "cancelada") return "error";
  if (normalized === "finalizado") return "error";
  return "secondary";
}

async function loadTherapy() {
  if (route.path !== "/terapiadetail") {
    gate.next();
    return;
  }
  const ticket = gate.next();
  const selectedMode = appContext.activeMode;
  therapy.value = null;
  siblingTherapies.value = [];
  dialog.value = false;
  loadError.value = "";
  loading.value = true;
  const uid = currentUser.value?.uid;
  let therapyId = route.query.id?.toString() || "";

  if (!uid) {
    therapy.value = null;
    return;
  }

  try {
    if (!therapyId) {
      if (!isPatientMode.value) {
        router.replace("/pacientes");
        return;
      }

      const activeTherapy = await getActiveTherapyByPatient(uid);

      if (!activeTherapy?.id) {
        router.replace("/sesiones");
        return;
      }

      therapyId = activeTherapy.id;
      await router.replace({ path: "/terapiadetail", query: { id: therapyId } });
    }

    const loaded = await loadTherapyForActiveMode(therapyId, uid, selectedMode);
    if (!gate.isCurrent(ticket)) return;
    if (!loaded) throw new Error("Acceso restringido o terapia no disponible.");
    let siblings = [];
    if (selectedMode === "psychologist") {
      siblings = (await getTherapiesByTherapist(loaded.terapeutaId)).filter((t) => t.pacienteUid === loaded.pacienteUid);
    }
    if (!gate.isCurrent(ticket)) return;
    therapy.value = loaded;
    siblingTherapies.value = siblings;
  } catch (error) {
    if (gate.isCurrent(ticket)) {
      therapy.value = null;
      loadError.value = error.code?.includes("permission-denied") ? "Acceso restringido a esta terapia." : error.message || "Error al cargar la terapia.";
    }
  } finally {
    if (gate.isCurrent(ticket)) loading.value = false;
  }
}

async function loadTherapyForActiveMode(therapyId, uid, selectedMode) {
  if (selectedMode === "patient") {
    return getTherapyByIdForPatient(therapyId, uid);
  }

  const selectedTherapy = await getTherapyById(therapyId);

  if (!selectedTherapy) {
    return null;
  }

  if (selectedMode === "admin") {
    return selectedTherapy;
  }

  if (selectedMode === "psychologist") {
    const therapist = await getTherapistByUserUid(uid);
    return therapist?.id && selectedTherapy.terapeutaId === therapist.id
      ? selectedTherapy
      : null;
  }

  return null;
}

async function changeTherapyStatus(estado) {
  if (!canChangeTherapyStatus.value || !therapy.value?.id || changingStatus.value) {
    return;
  }

  changingStatus.value = estado;

  try {
    await updateTherapyStatus(therapy.value.id, estado);
    await loadTherapy();

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Terapia actualizada",
          message: `La terapia fue marcada como ${estado}.`,
        },
      })
    );
  } catch (error) {
    console.error("Error updating therapy status:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message:
            error?.message || "No se pudo actualizar el estado de la terapia.",
        },
      })
    );
  } finally {
    changingStatus.value = "";
  }
}

watch(
  [() => route.query.id, () => currentUser.value?.uid, () => appContext.activeMode],
  () => {
    loadTherapy();
  },
  { immediate: true, flush: "sync" }
);
</script>

<style scoped>
.therapy-detail-view {
  max-width: 1180px;
}

.therapy-appointments-table {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .therapy-detail-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

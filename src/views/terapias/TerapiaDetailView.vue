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
              Revisa el estado del proceso, agenda nuevas citas y consulta sesiones asociadas.
            </p>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

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

      <v-card v-else class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-text>
          No se encontró la terapia seleccionada.
        </v-card-text>
      </v-card>

      <v-row v-if="therapy" class="mt-2" align="stretch">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-clipboard-text-clock-outline</v-icon>
              Información inicial
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4" />
              <p class="text-body-2 text-medium-emphasis mb-4">
                Información recopilada al iniciar esta terapia. Reiniciar la encuesta no modifica estos datos.
              </p>
              <v-list v-if="intakeEntries.length" density="compact" class="bg-transparent pa-0">
                <v-list-item
                  v-for="entry in intakeEntries"
                  :key="entry.label"
                  :title="entry.label"
                  :subtitle="entry.value"
                  class="px-0"
                />
              </v-list>
              <p v-else class="text-body-2 text-medium-emphasis mb-0">
                Esta terapia fue creada antes de incorporar el snapshot de la encuesta.
              </p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-notebook-edit-outline</v-icon>
              Información de la terapia
              <v-spacer />
              <v-btn
                v-if="canEditClinicalInfo && !editingClinicalInfo"
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                aria-label="Editar información de la terapia"
                @click="editingClinicalInfo = true"
              />
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4" />
              <template v-if="editingClinicalInfo">
                <v-textarea
                  v-model="clinicalForm.motivoTerapia"
                  label="Motivo de la terapia"
                  rows="2"
                  auto-grow
                  counter="2000"
                />
                <v-textarea
                  v-model="clinicalForm.detalleTerapia"
                  label="Detalles del proceso"
                  rows="4"
                  auto-grow
                  counter="6000"
                  class="mt-3"
                />
                <v-textarea
                  v-model="clinicalForm.objetivosInicialesText"
                  label="Objetivos iniciales"
                  hint="Escribe un objetivo por línea."
                  persistent-hint
                  rows="3"
                  auto-grow
                  class="mt-3"
                />
                <div class="d-flex justify-end ga-2 mt-5">
                  <v-btn
                    variant="text"
                    :disabled="savingClinicalInfo"
                    @click="cancelClinicalEdit"
                  >
                    Cancelar
                  </v-btn>
                  <v-btn
                    class="pf-btn-primary"
                    color="primary"
                    :loading="savingClinicalInfo"
                    @click="saveClinicalInfo"
                  >
                    Guardar
                  </v-btn>
                </div>
              </template>
              <v-list v-else density="compact" class="bg-transparent pa-0">
                <v-list-item
                  class="px-0"
                  title="Motivo de la terapia"
                  :subtitle="therapy.motivoTerapia || 'Aún no definido'"
                />
                <v-list-item
                  class="px-0"
                  title="Detalles del proceso"
                  :subtitle="therapy.detalleTerapia || 'Aún no registrados'"
                />
                <v-list-item class="px-0" title="Objetivos iniciales">
                  <template #subtitle>
                    <ul v-if="initialGoals.length" class="therapy-goals-list mt-1">
                      <li v-for="goal in initialGoals" :key="goal">{{ goal }}</li>
                    </ul>
                    <span v-else>Aún no registrados</span>
                  </template>
                </v-list-item>
              </v-list>
              <p v-if="!canEditClinicalInfo" class="text-caption text-medium-emphasis mt-4 mb-0">
                Esta información la actualiza tu psicólogo durante el proceso.
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

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
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";
import TherapyAppointmentsTable from "@/components/Terapias/TherapyAppointmentsTable.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import {
  getActiveTherapyByPatient,
  getTherapyById,
  getTherapyByIdForPatient,
  updateTherapyClinicalInfo,
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
const editingClinicalInfo = ref(false);
const savingClinicalInfo = ref(false);
const clinicalForm = ref(emptyClinicalForm());

const formattedCreationDate = computed(() => {
  if (!therapy.value?.fechaCreacion) return "No definida";
  const parsed = new Date(therapy.value.fechaCreacion);
  if (Number.isNaN(parsed.getTime())) return "No definida";
  return parsed.toLocaleDateString("es-PE");
});

const normalizedTherapyStatus = computed(() =>
  (therapy.value?.estado || "").toString().trim().toLowerCase()
);

const isPatientMode = computed(() => appContext.activeMode === "patient");
const isPsychologistMode = computed(() => appContext.activeMode === "psychologist");
const isAdminMode = computed(() => appContext.activeMode === "admin");
const canEditClinicalInfo = computed(
  () => (isPsychologistMode.value || isAdminMode.value) && Boolean(therapy.value?.id)
);
const initialGoals = computed(() =>
  Array.isArray(therapy.value?.objetivosIniciales)
    ? therapy.value.objetivosIniciales.filter(Boolean)
    : []
);
const intakeEntries = computed(() => {
  const snapshot = therapy.value?.intakeSnapshot;
  if (!snapshot || typeof snapshot !== "object") return [];

  return [
    ["Motivo de consulta", snapshot.motivoConsulta],
    ["Temas", formatList(snapshot.temas)],
    ["Modalidad", snapshot.modalidad],
    ["Preferencia de género", snapshot.preferenciaGenero],
    ["Preferencia de edad", snapshot.preferenciaEdad],
    ["Enfoque", snapshot.enfoque],
    ["Nivel de malestar", snapshot.nivelMalestar],
    ["Urgencia", snapshot.urgencia],
    ["Solo conversar", snapshot.soloConversar ? "Sí" : "No"],
    ["Riesgo reportado", snapshot.riesgoSuicida ? "Sí" : "No"],
    ["Observaciones", snapshot.observaciones],
    ["Capturado", formatTimestamp(snapshot.capturedAt)],
  ]
    .filter(([, value]) => value !== "" && value != null)
    .map(([label, value]) => ({ label, value: String(value) }));
});
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

    therapy.value = await loadTherapyForActiveMode(therapyId, uid);

    if (!therapy.value) {
      router.replace(defaultRouteForMode(appContext.activeMode));
      return;
    }

    syncClinicalForm();
  } catch (error) {
    console.error("Error loading therapy detail:", error);
    therapy.value = null;
  }
}

function syncClinicalForm() {
  clinicalForm.value = {
    motivoTerapia: therapy.value?.motivoTerapia || "",
    detalleTerapia: therapy.value?.detalleTerapia || "",
    objetivosInicialesText: initialGoals.value.join("\n"),
  };
}

function cancelClinicalEdit() {
  syncClinicalForm();
  editingClinicalInfo.value = false;
}

async function saveClinicalInfo() {
  if (!therapy.value?.id || savingClinicalInfo.value) return;

  savingClinicalInfo.value = true;
  try {
    await updateTherapyClinicalInfo(therapy.value.id, {
      motivoTerapia: clinicalForm.value.motivoTerapia,
      detalleTerapia: clinicalForm.value.detalleTerapia,
      objetivosIniciales: clinicalForm.value.objetivosInicialesText.split("\n"),
    });
    editingClinicalInfo.value = false;
    await loadTherapy();
    window.dispatchEvent(new CustomEvent("ui-success", {
      detail: {
        title: "Información actualizada",
        message: "Los datos de la terapia se guardaron correctamente.",
      },
    }));
  } catch (error) {
    console.error("Error updating therapy clinical information:", error);
    window.dispatchEvent(new CustomEvent("api-error", {
      detail: {
        message: error?.message || "No se pudo actualizar la información de la terapia.",
      },
    }));
  } finally {
    savingClinicalInfo.value = false;
  }
}

function emptyClinicalForm() {
  return {
    motivoTerapia: "",
    detalleTerapia: "",
    objetivosInicialesText: "",
  };
}

function formatList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
}

function formatTimestamp(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("es-PE")
    : "";
}

async function loadTherapyForActiveMode(therapyId, uid) {
  if (isPatientMode.value) {
    return getTherapyByIdForPatient(therapyId, uid);
  }

  const selectedTherapy = await getTherapyById(therapyId);

  if (!selectedTherapy) {
    return null;
  }

  if (isAdminMode.value) {
    return selectedTherapy;
  }

  if (isPsychologistMode.value) {
    const therapist = await getTherapistByUserUid(uid);
    return therapist?.id && selectedTherapy.terapeutaId === therapist.id
      ? selectedTherapy
      : null;
  }

  return null;
}

function defaultRouteForMode(mode) {
  if (mode === "psychologist" || mode === "admin") {
    return "/pacientes";
  }

  return "/dashboard";
}

async function changeTherapyStatus(estado) {
  if (!therapy.value?.id || changingStatus.value) {
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
  { immediate: true }
);
</script>

<style scoped>
.therapy-detail-view {
  max-width: 1180px;
}

.therapy-appointments-table {
  border-radius: 8px;
}

.therapy-goals-list {
  padding-inline-start: 20px;
}

@media (max-width: 600px) {
  .therapy-detail-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

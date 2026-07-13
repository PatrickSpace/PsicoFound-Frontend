<template>
  <LayoutDefault layout>
    <v-container class="progress-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Seguimiento terapéutico
            </p>
            <h1 class="text-h4 font-weight-bold">Progreso</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Tu perfil inicial y tus sesiones ayudan a construir continuidad en tu proceso.
            </p>
          </div>
          <div class="page-header__actions">
            <v-chip
              :color="isProfileReady ? 'success' : 'warning'"
              variant="tonal"
              :prepend-icon="isProfileReady ? 'mdi-account-check-outline' : 'mdi-clock-outline'"
            >
              {{ isProfileReady ? "Perfil listo" : "Perfil en progreso" }}
            </v-chip>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-alert
        v-if="profileError"
        class="mb-5"
        color="warning"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ profileError }}
      </v-alert>

      <ActiveTherapySummaryCard
        v-if="isPatientMode && activeTherapy"
        :therapy="activeTherapy"
        :therapist="activeTherapyTherapist"
        :main-reason="mainReason"
        :loading-therapist="loadingActiveTherapist"
        :learned-tools-count="learnedToolsCount"
      />

      <v-card class="pa-4 mb-6 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-bullseye-arrow</v-icon>
          Objetivos terapéuticos
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <v-alert
            v-if="goalsError"
            class="mb-4"
            color="warning"
            variant="tonal"
            icon="mdi-alert-outline"
          >
            {{ goalsError }}
          </v-alert>

          <v-row class="mb-4" align="stretch">
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Registrados</div>
                    <div class="text-h4 font-weight-bold mt-1">{{ goals.length }}</div>
                    <div class="text-caption text-medium-emphasis">Objetivos totales</div>
                  </div>
                  <v-avatar color="secondary" variant="tonal" rounded="lg">
                    <v-icon>mdi-flag-outline</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">En progreso</div>
                    <div class="text-h4 font-weight-bold mt-1">{{ activeGoalsCount }}</div>
                    <div class="text-caption text-medium-emphasis">Seguimiento activo</div>
                  </div>
                  <v-avatar color="warning" variant="tonal" rounded="lg">
                    <v-icon>mdi-chart-timeline-variant</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Alcanzados</div>
                    <div class="text-h4 font-weight-bold mt-1">{{ achievedGoalsCount }}</div>
                    <div class="text-caption text-medium-emphasis">Metas completadas</div>
                  </div>
                  <v-avatar color="success" variant="tonal" rounded="lg">
                    <v-icon>mdi-check-decagram-outline</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <v-empty-state
            v-if="!loadingGoals && goals.length === 0"
            headline="Aún no hay objetivos terapéuticos"
            text="Registra metas de trabajo para seguir avances entre sesiones."
            icon="mdi-flag-outline"
          ></v-empty-state>

          <v-row v-else align="stretch" class="mb-4">
            <v-col
              v-for="goal in goals"
              :key="goal.id"
              cols="12"
              md="6"
              class="d-flex"
            >
              <v-card class="goal-card card-backgoundcustom flex-grow-1 pa-4" elevation="2" variant="text">
                <div class="d-flex flex-column flex-sm-row justify-space-between ga-3 mb-3">
                  <div>
                    <h2 class="text-subtitle-1 font-weight-bold mb-1">
                      {{ goal.title }}
                    </h2>
                    <div class="text-caption text-medium-emphasis">
                      {{ goal.category || "Proceso terapéutico" }}
                      <span v-if="goal.targetDate">• meta {{ goal.targetDate }}</span>
                    </div>
                  </div>
                  <v-chip
                    :color="goal.status === 'achieved' ? 'success' : 'warning'"
                    size="small"
                    variant="tonal"
                    class="align-self-start"
                  >
                    {{ goal.status === "achieved" ? "Alcanzado" : "Activo" }}
                  </v-chip>
                </div>
                <v-card-text class="pa-0">
                  <p class="mb-4 text-body-2">{{ goal.description || "Sin descripción." }}</p>
                  <v-progress-linear
                    :model-value="Number(goal.progress || 0)"
                    color="secondary"
                    height="10"
                    rounded
                  />
                  <div class="d-flex justify-space-between mt-2">
                    <span class="text-caption">{{ Number(goal.progress || 0) }}%</span>
                    <span class="text-caption text-medium-emphasis">avance registrado</span>
                  </div>
                  <p v-if="goal.lastNote" class="text-caption text-medium-emphasis mt-3">
                    Última nota: {{ goal.lastNote }}
                  </p>
                </v-card-text>
                <v-card-actions class="px-0 pb-0 pt-4">
                  <v-btn
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-chart-line"
                    @click="openGoalProgressDialog(goal)"

        class="pf-btn-secondary">
                    Actualizar avance
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>

          <v-card class="pa-4 mt-4 card-backgoundcustom" elevation="2" variant="text">
            <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">Crear objetivo</h3>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Registra una meta de seguimiento para medir el avance terapéutico.
                </p>
              </div>
              <v-btn
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-plus"
                :disabled="!canOpenGoalDialog"
                @click="goalDialog = true"
                class="pf-btn-secondary align-self-start align-self-md-center"
              >
                Crear objetivo
              </v-btn>
            </div>
            <v-alert
              v-if="!therapist && !activeTherapy"
              class="mt-4 mb-0"
              color="warning"
              variant="tonal"
              icon="mdi-information-outline"
            >
              Necesitas una terapia activa para crear objetivos de seguimiento.
            </v-alert>
          </v-card>
        </v-card-text>
      </v-card>

      <v-dialog v-model="goalDialog" class="bg-transparent" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Crear objetivo
          </v-card-title>
          <v-card-text>
              <v-alert
                v-if="!therapist && !activeTherapy"
                class="mb-4"
                color="warning"
                variant="tonal"
                icon="mdi-information-outline"
              >
                Necesitas una terapia activa para crear objetivos de seguimiento.
              </v-alert>
              <v-row>
                <v-col v-if="therapist" cols="12" md="6">
                  <v-select
                    v-model="goalForm.therapyId"
                    :items="therapistTherapyOptions"
                    item-title="title"
                    item-value="value"
                    label="Paciente / terapia"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" :md="therapist ? 6 : 12">
                  <v-text-field
                    v-model="goalForm.title"
                    label="Objetivo"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="goalForm.category"
                    label="Categoría"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="goalForm.targetDate"
                    label="Fecha objetivo"
                    type="date"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="goalForm.description"
                    label="Descripción"
                    rows="3"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
              </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="savingGoal"
              @click="goalDialog = false"
              class="pf-btn-ghost"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-plus"
              :loading="savingGoal"
              :disabled="!canCreateGoal"
              @click="saveGoal"
              class="pf-btn-secondary"
            >
              Crear objetivo
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="goalProgressDialog" class="bg-transparent" max-width="620">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">Actualizar objetivo</v-card-title>
          <v-card-text>
            <p class="mb-4 text-body-2 text-medium-emphasis">{{ selectedGoal?.title }}</p>
            <v-slider
              v-model="goalProgressForm.progress"
              label="Avance"
              color="secondary"
              min="0"
              max="100"
              step="5"
              thumb-label
            />
            <v-textarea
              v-model="goalProgressForm.note"
              label="Nota de avance"
              rows="3"
              variant="outlined"
              density="comfortable"
            />
            <v-checkbox
              v-model="goalProgressForm.achieved"
              label="Marcar como objetivo alcanzado"
              color="secondary"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="goalProgressDialog = false"
        class="pf-btn-ghost">
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              :loading="savingGoalProgress"
              @click="saveGoalProgress"

        class="pf-btn-secondary">
              Guardar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </LayoutDefault>
</template>
<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import ActiveTherapySummaryCard from "@/components/Terapias/ActiveTherapySummaryCard.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { watchProfile } from "@/services/conversationService";
import {
  getTherapistById,
  getTherapistByUserUid,
} from "@/services/psicologoService";
import {
  getActiveTherapyByPatient,
  getTherapiesByTherapist,
} from "@/services/terapiaService";
import { getExercisesByPatient } from "@/services/exerciseService";
import {
  createTherapyGoal,
  getGoalsByPatient,
  getGoalsByTherapist,
  updateTherapyGoalProgress,
} from "@/services/therapyGoalService";
import {
  getPermissionAwareMessage,
  isPermissionDeniedError,
} from "@/utils/firebaseErrors";
import { isProfileReadyForRecommendations } from "@/services/matchingService";

const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const profile = ref(null);
const profileError = ref("");
const loadingGoals = ref(false);
const goalsError = ref("");
const goals = ref([]);
const activeTherapy = ref(null);
const activeTherapyTherapist = ref(null);
const loadingActiveTherapist = ref(false);
const learnedTools = ref([]);
const therapist = ref(null);
const therapistTherapies = ref([]);
const savingGoal = ref(false);
const savingGoalProgress = ref(false);
const goalDialog = ref(false);
const goalProgressDialog = ref(false);
const selectedGoal = ref(null);
let unsubscribeProfile = null;
let activeTherapistRequestId = 0;
let learnedToolsRequestId = 0;

const goalForm = reactive({
  therapyId: "",
  title: "",
  description: "",
  category: "Proceso terapéutico",
  targetDate: "",
});

const goalProgressForm = reactive({
  progress: 0,
  note: "",
  achieved: false,
});

const mainReason = computed(() => {
  const reason = profile.value?.motivoConsulta?.toString().trim();
  return reason || "En exploración";
});

const learnedToolsCount = computed(() => {
  const therapyId = activeTherapy.value?.id;

  if (!therapyId) return 0;

  return learnedTools.value.filter((exercise) => {
    const status = (exercise?.status || "").toString().trim().toLowerCase();
    return exercise?.terapiaId === therapyId && status === "completed";
  }).length;
});

const isProfileReady = computed(() =>
  isProfileReadyForRecommendations(profile.value)
);

const activeGoalsCount = computed(
  () => goals.value.filter((goal) => goal.status !== "achieved").length
);

const achievedGoalsCount = computed(
  () => goals.value.filter((goal) => goal.status === "achieved").length
);

const therapistTherapyOptions = computed(() =>
  therapistTherapies.value.map((therapy) => ({
    title: `${therapy.pacienteNombre || "Paciente"} • ${therapy.estado || "activo"}`,
    value: therapy.id,
  }))
);

const canCreateGoal = computed(() => {
  const hasTherapy = therapist.value
    ? Boolean(goalForm.therapyId)
    : Boolean(activeTherapy.value?.id);

  return hasTherapy && goalForm.title.trim().length > 0;
});

const canOpenGoalDialog = computed(() =>
  therapist.value ? therapistTherapies.value.length > 0 : Boolean(activeTherapy.value?.id)
);

const isPsychologistMode = computed(
  () => appContext.activeMode === "psychologist"
);

const isPatientMode = computed(() => appContext.activeMode === "patient");

watch(
  () => currentUser.value?.uid,
  (uid) => {
    unsubscribeProfile?.();
    profile.value = null;
    profileError.value = "";
    loadLearnedTools();

    if (!uid) {
      resetGoalState();
      return;
    }

    unsubscribeProfile = watchProfile(
      uid,
      (item) => {
        profile.value = item;
      },
      (error) => {
        console.error("Error loading profile progress:", error);
        profileError.value =
          "No pudimos cargar tu perfil inicial. Intenta nuevamente.";
      }
    );
    loadGoals();
  },
  { immediate: true }
);

watch(
  () => appContext.activeMode,
  () => {
    loadGoals();
    loadLearnedTools();
  }
);

watch(
  [
    () => activeTherapy.value?.terapeutaId,
    () => isPatientMode.value,
  ],
  async ([therapistId, patientMode]) => {
    const requestId = ++activeTherapistRequestId;
    activeTherapyTherapist.value = null;

    if (!therapistId || !patientMode) {
      loadingActiveTherapist.value = false;
      return;
    }

    loadingActiveTherapist.value = true;

    try {
      const publicTherapist = await getTherapistById(therapistId);

      if (requestId === activeTherapistRequestId) {
        activeTherapyTherapist.value = publicTherapist;
      }
    } catch (error) {
      console.error("Error loading therapist public profile:", error);

      if (requestId === activeTherapistRequestId) {
        activeTherapyTherapist.value = null;
      }
    } finally {
      if (requestId === activeTherapistRequestId) {
        loadingActiveTherapist.value = false;
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  unsubscribeProfile?.();
  activeTherapistRequestId += 1;
  learnedToolsRequestId += 1;
});

async function loadLearnedTools() {
  const requestId = ++learnedToolsRequestId;
  const uid = currentUser.value?.uid;

  if (!uid || !isPatientMode.value) {
    learnedTools.value = [];
    return;
  }

  try {
    const exercises = await getExercisesByPatient(uid);

    if (requestId === learnedToolsRequestId) {
      learnedTools.value = exercises;
    }
  } catch (error) {
    console.error("Error loading learned tools for therapy summary:", error);

    if (requestId === learnedToolsRequestId) {
      learnedTools.value = [];
    }
  }
}

async function loadGoals() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    resetGoalState();
    return;
  }

  loadingGoals.value = true;
  goalsError.value = "";

  try {
    const [patientTherapy, therapistProfile] = await Promise.all([
      getActiveTherapyByPatient(uid),
      getTherapistByUserUid(uid),
    ]);

    activeTherapy.value = patientTherapy;
    therapist.value = isPsychologistMode.value ? therapistProfile : null;

    const patientGoals = await getGoalsByPatient(uid);
    let therapistGoals = [];

    if (isPsychologistMode.value && therapistProfile?.id) {
      therapistTherapies.value = await getTherapiesByTherapist(
        therapistProfile.id
      );
      therapistGoals = await getGoalsByTherapist(therapistProfile.id);
    } else {
      therapistTherapies.value = [];
    }

    goals.value = mergeGoals(patientGoals, therapistGoals);
  } catch (error) {
    console.error("Error loading therapy goals:", error);
    goalsError.value = getPermissionAwareMessage(
      error,
      "No pudimos cargar los objetivos."
    );

    if (isPermissionDeniedError(error)) {
      goals.value = [];
    } else {
      resetGoalState();
    }
  } finally {
    loadingGoals.value = false;
  }
}

function mergeGoals(patientGoals, therapistGoals) {
  const byId = new Map();
  [...patientGoals, ...therapistGoals].forEach((goal) => {
    byId.set(goal.id, goal);
  });
  return Array.from(byId.values());
}

function resetGoalState() {
  activeTherapy.value = null;
  therapist.value = null;
  therapistTherapies.value = [];
  goals.value = [];
}

async function saveGoal() {
  if (!canCreateGoal.value || savingGoal.value) {
    return;
  }

  const therapy = resolveSelectedTherapy();

  if (!therapy) {
    goalsError.value = "Necesitas una terapia activa para crear objetivos.";
    return;
  }

  savingGoal.value = true;

  try {
    await createTherapyGoal({
      pacienteUid: therapy.pacienteUid,
      pacienteNombre: therapy.pacienteNombre,
      terapeutaId: therapy.terapeutaId,
      terapeutaNombre: therapy.terapeutaNombre,
      terapiaId: therapy.id,
      title: goalForm.title.trim(),
      description: goalForm.description.trim(),
      category: goalForm.category.trim() || "Proceso terapéutico",
      targetDate: goalForm.targetDate,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Objetivo creado",
          message: "El objetivo terapéutico fue registrado.",
        },
      })
    );

    resetGoalForm();
    goalDialog.value = false;
    await loadGoals();
  } catch (error) {
    console.error("Error creating therapy goal:", error);
    goalsError.value = getPermissionAwareMessage(
      error,
      "No se pudo crear el objetivo."
    );
  } finally {
    savingGoal.value = false;
  }
}

function resolveSelectedTherapy() {
  if (therapist.value) {
    return (
      therapistTherapies.value.find(
        (therapy) => therapy.id === goalForm.therapyId
      ) || null
    );
  }

  return activeTherapy.value;
}

function resetGoalForm() {
  goalForm.therapyId = "";
  goalForm.title = "";
  goalForm.description = "";
  goalForm.category = "Proceso terapéutico";
  goalForm.targetDate = "";
}

function openGoalProgressDialog(goal) {
  selectedGoal.value = goal;
  goalProgressForm.progress = Number(goal.progress || 0);
  goalProgressForm.note = goal.lastNote || "";
  goalProgressForm.achieved = goal.status === "achieved";
  goalProgressDialog.value = true;
}

async function saveGoalProgress() {
  if (!selectedGoal.value?.id || savingGoalProgress.value) {
    return;
  }

  savingGoalProgress.value = true;

  try {
    await updateTherapyGoalProgress({
      goal: selectedGoal.value,
      progress: goalProgressForm.achieved ? 100 : goalProgressForm.progress,
      status: goalProgressForm.achieved ? "achieved" : "active",
      note: goalProgressForm.note.trim(),
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Objetivo actualizado",
          message: "El avance fue registrado en el historial.",
        },
      })
    );

    goalProgressDialog.value = false;
    selectedGoal.value = null;
    await loadGoals();
  } catch (error) {
    console.error("Error updating therapy goal:", error);
    goalsError.value = getPermissionAwareMessage(
      error,
      "No se pudo actualizar el objetivo."
    );
  } finally {
    savingGoalProgress.value = false;
  }
}
</script>

<style scoped>
.progress-view {
  max-width: 1180px;
}

.progress-stat-card {
  min-height: 124px;
}

.goal-card {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .progress-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

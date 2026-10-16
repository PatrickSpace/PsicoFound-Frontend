<template>
  <LayoutDefault layout>
    <v-container class="progress-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Seguimiento terapéutico
            </p>
            <h1 class="text-h4 font-weight-bold">{{ isPsychologistMode ? "Seguimiento de pacientes" : "Mis objetivos terapéuticos" }}</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              {{ isPsychologistMode ? "Consulta objetivos por paciente y terapia; registra avances en procesos activos." : "Consulta y actualiza los objetivos de tu propio proceso." }}
            </p>
          </div>
          <div class="page-header__actions">
            <v-chip
              v-if="isPatientMode"
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

          <TherapyContextFilters :therapies="therapies" :professional="isPsychologistMode"
            v-model:patient="patientFilter" v-model:therapy="therapyFilter" v-model:status="statusFilter"
            :statuses="[{ title: 'Activos', value: 'active' }, { title: 'Alcanzados', value: 'achieved' }]" />
          <v-btn class="pf-btn-secondary mb-4" :loading="loadingGoals" @click="workspace.refresh">Actualizar</v-btn>
          <v-progress-linear v-if="loadingGoals" indeterminate class="mb-4" />
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
            v-if="!loadingGoals && !goalsError && goals.length === 0"
            headline="Aún no hay objetivos terapéuticos"
            text="Registra metas de trabajo para seguir avances entre sesiones."
            icon="mdi-flag-outline"
          ></v-empty-state>

          <v-row v-else align="stretch" class="mb-4">
            <v-col
              v-for="goal in goals" data-testid="goal-card"
              :key="goal.id"
              cols="12"
              md="6"
              class="d-flex"
            >
              <v-card class="goal-card card-backgoundcustom flex-grow-1 pa-4" elevation="2" variant="text">
                <div class="d-flex flex-column flex-sm-row justify-space-between ga-3 mb-3">
                  <div>
                    <p v-if="isPsychologistMode" class="text-subtitle-2 mb-1">{{ goal.pacienteNombre || 'Paciente' }}</p>
                    <p class="text-caption mb-2">Terapia: {{ goal.terapiaId }}</p>
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
                  <p v-if="goal.legacyNote || (goal.lastNote && !goal.progressHistory?.length)" class="text-caption text-medium-emphasis mt-3">
                    Nota anterior conservada (sin fecha ni autor registrados): {{ goal.legacyNote || goal.lastNote }}
                  </p>
                <v-expansion-panels v-if="goal.progressHistory?.length" class="mt-4">
                    <v-expansion-panel title="Historial de avances">
                      <v-expansion-panel-text>
                        <div v-for="entry in goal.progressHistory" :key="entry.id" class="mb-3" data-testid="goal-progress-entry">
                          <strong>{{ entry.progress }}% · {{ entry.kind === 'reopened' ? 'Reapertura' : entry.kind === 'correction' ? 'Corrección' : 'Avance' }}</strong>
                          <p>{{ entry.note || 'Sin nota' }}</p>
                          <p class="text-caption">{{ entry.authorName || entry.authorUid }} · {{ formatTherapyDate(entry.createdAt) }}</p>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-text>
                <v-card-actions class="px-0 pb-0 pt-4">
                  <v-btn
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-chart-line"
                    :disabled="!canUpdate(goal)" @click="openGoalProgressDialog(goal)"

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
                @click="openGoalDialog"
                class="pf-btn-secondary align-self-start align-self-md-center"
              >
                Crear objetivo
              </v-btn>
            </div>
            <v-alert
              v-if="!activeTherapies.length"
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
              <v-alert v-if="actionError" type="error" class="mb-3">{{ actionError }}</v-alert>
              <v-alert
                v-if="!activeTherapies.length"
                class="mb-4"
                color="warning"
                variant="tonal"
                icon="mdi-information-outline"
              >
                Necesitas una terapia activa para crear objetivos de seguimiento.
              </v-alert>
              <v-row>
                <v-col cols="12" md="6">
                  <TherapySelect
                    v-model="goalForm.therapyId"
                    :items="therapistTherapyOptions"
                    item-title="title"
                    item-value="value"
                    :label="isPsychologistMode ? 'Paciente / terapia' : 'Mi terapia'"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="6">
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
            <v-alert v-if="actionError" type="error" class="mb-3">{{ actionError }}</v-alert>
            <p class="mb-4 text-body-2 text-medium-emphasis">{{ selectedGoal?.title }}</p>
            <v-text-field v-model.number="goalProgressForm.progress" label="Avance (%)" type="number" min="0" max="100" variant="outlined" />
            <v-textarea
              v-model="goalProgressForm.note"
              label="Nota de avance"
              rows="3"
              variant="outlined"
              density="comfortable"
            />
            <p class="text-body-2">{{ Number(goalProgressForm.progress) === 100 ? 'Alcanzado (100%)' : 'Activo' }}. Al reducir el avance o reabrir, explica el motivo en la nota.</p>
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
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import ActiveTherapySummaryCard from "@/components/Terapias/ActiveTherapySummaryCard.vue";
import TherapyContextFilters from "@/components/Terapias/TherapyContextFilters.vue";
import TherapySelect from "@/components/Terapias/TherapySelect.vue";
import { useTherapyWorkspace } from "@/composables/useTherapyWorkspace";
import { watchProfile } from "@/services/conversationService";
import { getTherapistById } from "@/services/psicologoService";
import { getExercisesByPatient } from "@/services/exerciseService";
import { createTherapyGoal, getGoalsForTherapies, updateTherapyGoalProgress } from "@/services/therapyGoalService";
import { isProfileReadyForRecommendations } from "@/services/matchingService";
import { formatTherapyDate, isActiveTherapy, therapyLabel } from "@/utils/therapyContext";

const workspace = useTherapyWorkspace(getGoalsForTherapies);
const { therapies, professional: isPsychologistMode, visibleItems: goals, loading: loadingGoals,
  patientFilter, therapyFilter, statusFilter, activeTherapies, selectionKey, mode, uid } = workspace;
const isPatientMode = computed(() => mode.value === "patient");
const profile = ref(null);
const profileError = ref("");
const actionError = ref("");
const goalsError = computed(() => workspace.error.value || actionError.value);
const activeTherapy = computed(() => isPatientMode.value ? therapies.value.find(isActiveTherapy) : null);
const activeTherapyTherapist = ref(null);
const loadingActiveTherapist = ref(false);
const learnedTools = ref([]);
let unsubscribeProfile;
let personalGeneration = 0;
const mainReason = computed(() => profile.value?.motivoConsulta || "En exploración");
const isProfileReady = computed(() => isProfileReadyForRecommendations(profile.value));
const learnedToolsCount = computed(() => learnedTools.value.filter((e) =>
  e.terapiaId === activeTherapy.value?.id && e.status === "completed").length);
const activeGoalsCount = computed(() => goals.value.filter((g) => g.status !== "achieved").length);
const achievedGoalsCount = computed(() => goals.value.filter((g) => g.status === "achieved").length);
const therapistTherapyOptions = computed(() => activeTherapies.value.map((t) => ({ title: therapyLabel(t), value: t.id })));
const goalDialog = ref(false);
const goalProgressDialog = ref(false);
const selectedGoal = ref(null);
const savingGoal = ref(false);
const savingGoalProgress = ref(false);
const goalForm = reactive({ therapyId: "", title: "", description: "", category: "Proceso terapéutico", targetDate: "" });
const goalProgressForm = reactive({ progress: 0, note: "", achieved: false });
const selectedTherapy = computed(() => activeTherapies.value.find((t) => t.id === goalForm.therapyId));
const canCreateGoal = computed(() => Boolean(selectedTherapy.value && goalForm.title.trim() && !loadingGoals.value));
const canOpenGoalDialog = computed(() => activeTherapies.value.length > 0 && !loadingGoals.value);
let formTicket = "";
function canUpdate(goal) {
  return !loadingGoals.value && (!isPsychologistMode.value ||
    therapies.value.some((t) => t.id === goal.terapiaId && isActiveTherapy(t)));
}
function openGoalDialog() {
  formTicket = workspace.capture();
  goalForm.therapyId = activeTherapies.value[0]?.id || "";
  goalDialog.value = true;
}
function resetForms() {
  goalDialog.value = false;
  goalProgressDialog.value = false;
  selectedGoal.value = null;
  Object.assign(goalForm, { therapyId: "", title: "", description: "", category: "Proceso terapéutico", targetDate: "" });
  Object.assign(goalProgressForm, { progress: 0, note: "", achieved: false });
  actionError.value = "";
  savingGoal.value = false;
  savingGoalProgress.value = false;
}
watch(selectionKey, resetForms, { flush: "sync" });
watch([uid, isPatientMode], ([userId, patientMode]) => {
  const generation = ++personalGeneration;
  unsubscribeProfile?.();
  profile.value = null;
  learnedTools.value = [];
  profileError.value = "";
  if (!userId || !patientMode) return;
  unsubscribeProfile = watchProfile(userId, (value) => {
    if (generation === personalGeneration) profile.value = value;
  }, () => {
    if (generation === personalGeneration) profileError.value = "No pudimos cargar tu perfil inicial.";
  });
  getExercisesByPatient(userId).then((items) => {
    if (generation === personalGeneration) learnedTools.value = items;
  }).catch(() => {
    if (generation === personalGeneration) profileError.value = "No pudimos cargar el resumen de herramientas.";
  });
}, { immediate: true, flush: "sync" });
watch(() => activeTherapy.value?.terapeutaId, async (id, _, onCleanup) => {
  let current = true;
  onCleanup(() => { current = false; });
  activeTherapyTherapist.value = null;
  loadingActiveTherapist.value = Boolean(id);
  if (!id) return;
  try {
    const value = await getTherapistById(id);
    if (current) activeTherapyTherapist.value = value;
  } catch {
    if (current) profileError.value = "No pudimos cargar los datos de tu profesional.";
  } finally {
    if (current) loadingActiveTherapist.value = false;
  }
});
onBeforeUnmount(() => { personalGeneration++; unsubscribeProfile?.(); });
async function saveGoal() {
  if (!canCreateGoal.value || savingGoal.value || !workspace.isCurrent(formTicket)) return;
  const ticket = formTicket;
  savingGoal.value = true;
  try {
    await createTherapyGoal({ ...goalForm, terapiaId: selectedTherapy.value.id, mode: mode.value });
    if (workspace.isCurrent(ticket)) await workspace.refresh();
  } catch (error) {
    if (workspace.isCurrent(ticket)) actionError.value = error.message || "No se pudo crear el objetivo.";
  } finally {
    if (workspace.isCurrent(ticket)) savingGoal.value = false;
  }
}
function openGoalProgressDialog(goal) {
  if (!canUpdate(goal)) return;
  formTicket = workspace.capture();
  selectedGoal.value = goal;
  Object.assign(goalProgressForm, { progress: Number(goal.progress || 0), note: "", achieved: goal.status === "achieved" });
  goalProgressDialog.value = true;
}
async function saveGoalProgress() {
  if (!selectedGoal.value || !canUpdate(selectedGoal.value) || savingGoalProgress.value || !workspace.isCurrent(formTicket)) return;
  const ticket = formTicket;
  savingGoalProgress.value = true;
  try {
    await updateTherapyGoalProgress({ goal: selectedGoal.value, progress: Number(goalProgressForm.progress),
      note: goalProgressForm.note.trim(), mode: mode.value });
    if (workspace.isCurrent(ticket)) await workspace.refresh();
  } catch (error) {
    if (workspace.isCurrent(ticket)) actionError.value = error.message || "No se pudo guardar el avance.";
  } finally {
    if (workspace.isCurrent(ticket)) savingGoalProgress.value = false;
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

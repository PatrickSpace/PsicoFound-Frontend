<template>
  <LayoutDefault layout>
    <v-container class="tools-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Recursos entre sesiones
            </p>
            <h1 class="text-h4 font-weight-bold">{{ therapist ? "Ejercicios asignados a pacientes" : "Mis herramientas terapéuticas" }}</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              {{ therapist ? "Asigna ejercicios y consulta los resultados compartidos por tus pacientes." : "Consulta los ejercicios recibidos y registra tu realización y observaciones." }}
            </p>
          </div>
          <div class="page-header__actions">
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="loading"
              class="pf-btn-secondary"
              @click="loadTools"
            >
              Actualizar
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
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

      <TherapyContextFilters :therapies="therapies" :professional="therapist"
        v-model:patient="patientFilter" v-model:therapy="therapyFilter" v-model:status="statusFilter"
        :statuses="[{ title: 'Pendientes', value: 'assigned' }, { title: 'Completados', value: 'completed' }]" />
      <v-progress-linear v-if="loading" indeterminate class="mb-4" />
      <v-row class="mb-4" align="stretch">
        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 tool-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Asignados</div>
                <div class="text-h4 font-weight-bold mt-1">{{ patientExercises.length }}</div>
                <div class="text-caption text-medium-emphasis">Ejercicios totales</div>
              </div>
              <v-avatar color="secondary" variant="tonal" rounded="lg">
                <v-icon>mdi-format-list-checks</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 tool-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Pendientes</div>
                <div class="text-h4 font-weight-bold mt-1">{{ pendingPatientExercises.length }}</div>
                <div class="text-caption text-medium-emphasis">Por completar</div>
              </div>
              <v-avatar color="warning" variant="tonal" rounded="lg">
                <v-icon>mdi-timer-sand</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 tool-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Completados</div>
                <div class="text-h4 font-weight-bold mt-1">{{ completedPatientExercises.length }}</div>
                <div class="text-caption text-medium-emphasis">Registrados en historial</div>
              </div>
              <v-avatar color="success" variant="tonal" rounded="lg">
                <v-icon>mdi-check-circle-outline</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="pa-4 mb-6 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-toolbox-outline</v-icon>
          Herramientas asignadas
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <v-empty-state
            v-if="!loading && !errorMessage && patientExercises.length === 0"
             :headline="therapist ? 'No hay ejercicios asignados en esta selección' : 'Aún no tienes herramientas asignadas'"
            :text="therapist ? 'Selecciona una terapia activa para asignar un ejercicio.' : 'Cuando tu psicólogo te asigne ejercicios, aparecerán aquí.'"
            icon="mdi-lightbulb-on-outline"
          ></v-empty-state>

          <v-row v-else align="stretch">
            <v-col
              v-for="exercise in patientExercises" data-testid="exercise-card"
              :key="exercise.id"
              cols="12"
              md="6"
              class="d-flex"
            >
              <v-card
                class="exercise-card card-backgoundcustom flex-grow-1 pa-4"
                elevation="2"
                variant="text"
              >
                <div class="d-flex flex-column flex-sm-row justify-space-between ga-3 mb-3">
                  <div>
                    <p v-if="therapist" class="text-subtitle-2 mb-1">{{ exercise.pacienteNombre || 'Paciente' }}</p>
                    <p class="text-caption mb-2">Terapia: {{ exercise.terapiaId }}</p>
                    <h2 class="text-subtitle-1 font-weight-bold mb-1">
                      {{ exercise.title }}
                    </h2>
                    <div class="text-caption text-medium-emphasis">
                      {{ exercise.category || "Seguimiento" }}
                      <span v-if="exercise.dueDate">• hasta {{ exercise.dueDate }}</span>
                    </div>
                  </div>
                  <v-chip
                    :color="exercise.status === 'completed' ? 'success' : 'warning'"
                    size="small"
                    variant="tonal"
                    class="align-self-start"
                  >
                    {{ exercise.status === "completed" ? "Completado" : "Pendiente" }}
                  </v-chip>
                </div>
                <v-card-text class="pa-0">
                  <p class="mb-3 text-body-2">{{ exercise.instructions }}</p>
                  <p class="text-body-2">Frecuencia: {{ exercise.frequency || 'No indicada' }}</p>
                  <p class="text-caption">Asignación: {{ formatTherapyDate(exercise.assignedAt) }} · {{ exercise.authorName || exercise.terapeutaNombre || exercise.createdBy }}</p>
                  <p v-if="exercise.status === 'completed'" class="text-body-2 mt-2">Realizado: {{ formatTherapyDate(exercise.completedAt) }}</p>
                  <p v-if="exercise.patientNotes" class="text-caption text-medium-emphasis mt-3">
                    Observación compartida: {{ exercise.patientNotes }}
                  </p>
                </v-card-text>
                <v-card-actions class="px-0 pb-0 pt-4">
                  <v-btn
                    v-if="!therapist && exercise.status !== 'completed'"
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-check"
                    @click="openCompleteDialog(exercise)"

        class="pf-btn-secondary">
                    Completar
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card
        v-if="therapist"
        class="pa-4 card-backgoundcustom"
        elevation="2"
        variant="text"
      >
        <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
          <div>
            <div class="d-flex align-center ga-2 mb-1">
              <v-icon color="secondary" size="small">mdi-clipboard-plus-outline</v-icon>
              <h2 class="text-h6 font-weight-bold mb-0">Asignar ejercicio</h2>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Envía una herramienta terapéutica a un paciente con terapia activa.
            </p>
          </div>
          <v-btn
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-send"
            :disabled="therapistTherapies.length === 0"
            @click="openAssignmentDialog"
            class="pf-btn-secondary align-self-start align-self-md-center"
          >
            Asignar ejercicio
          </v-btn>
        </div>
      </v-card>

      <v-dialog v-model="assignmentDialog" class="bg-transparent" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Asignar ejercicio
          </v-card-title>
          <v-card-text>
          <v-alert v-if="actionError" type="error" class="mb-3">{{ actionError }}</v-alert>
          <v-row>
            <v-col cols="12" md="6">
              <TherapySelect
                v-model="assignment.therapyId"
                :items="therapistTherapyOptions"
                item-title="title"
                item-value="value"
                label="Paciente / terapia"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="assignment.title"
                label="Título del ejercicio"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="assignment.category"
                :items="categoryOptions"
                label="Categoría"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="assignment.frequency"
                label="Frecuencia sugerida"
                variant="outlined"
                placeholder="Ej. 3 veces por semana"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="assignment.dueDate"
                label="Fecha límite"
                type="date"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="assignment.instructions"
                label="Instrucciones"
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
              :disabled="savingAssignment"
              @click="assignmentDialog = false"
              class="pf-btn-ghost"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-send"
              :loading="savingAssignment"
              :disabled="!canAssignExercise"
              @click="assignExercise"
              class="pf-btn-secondary"
            >
              Asignar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="completeDialog" class="bg-transparent" max-width="640">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">Completar ejercicio</v-card-title>
          <v-card-text>
            <v-alert v-if="actionError" type="error" class="mb-3">{{ actionError }}</v-alert>
            <p class="mb-4 text-body-2 text-medium-emphasis">
              {{ selectedExercise?.title }}
            </p>
            <v-textarea
              v-model="completionNotes"
              label="¿Qué observaste o aprendiste?"
              rows="3"
              variant="outlined"
              density="comfortable"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="completeDialog = false"
        class="pf-btn-ghost">
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              :loading="savingCompletion"
              @click="completeSelectedExercise"

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
import { computed, reactive, ref, watch } from "vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import TherapyContextFilters from "@/components/Terapias/TherapyContextFilters.vue";
import TherapySelect from "@/components/Terapias/TherapySelect.vue";
import { useTherapyWorkspace } from "@/composables/useTherapyWorkspace";
import { completeExercise, createExercise, getExercisesForTherapies } from "@/services/exerciseService";
import { therapyLabel, formatTherapyDate } from "@/utils/therapyContext";

const workspace = useTherapyWorkspace((therapies, ctx) => getExercisesForTherapies(therapies).then((items) =>
  ctx.mode === "psychologist" ? items.filter((e) => e.createdBy === ctx.uid) : items));
const { therapies, professional: therapist, visibleItems: patientExercises, loading, mode,
  patientFilter, therapyFilter, statusFilter, activeTherapies, selectionKey } = workspace;
const actionError = ref("");
const errorMessage = computed(() => workspace.error.value || actionError.value);
const therapistTherapies = activeTherapies;
const pendingPatientExercises = computed(() => patientExercises.value.filter((e) => e.status !== "completed"));
const completedPatientExercises = computed(() => patientExercises.value.filter((e) => e.status === "completed"));
const therapistTherapyOptions = computed(() => activeTherapies.value.map((t) => ({ title: therapyLabel(t), value: t.id })));
const savingAssignment = ref(false);
const savingCompletion = ref(false);
const assignmentDialog = ref(false);
const completeDialog = ref(false);
const selectedExercise = ref(null);
const completionNotes = ref("");
const categoryOptions = ["Reflexión", "Respiración", "Registro emocional", "Hábitos", "Seguimiento"];
const assignment = reactive({ therapyId: "", title: "", category: "Seguimiento", frequency: "", dueDate: "", instructions: "" });
const canAssignExercise = computed(() => therapist.value && !loading.value && assignment.title.trim() &&
  assignment.instructions.trim() && activeTherapies.value.some((t) => t.id === assignment.therapyId));
let formTicket = "";
watch(selectionKey, () => {
  assignmentDialog.value = false;
  completeDialog.value = false;
  selectedExercise.value = null;
  completionNotes.value = "";
  Object.assign(assignment, { therapyId: "", title: "", category: "Seguimiento", frequency: "", dueDate: "", instructions: "" });
  savingAssignment.value = false;
  savingCompletion.value = false;
  actionError.value = "";
}, { flush: "sync" });
function openAssignmentDialog() {
  if (!therapist.value) return;
  formTicket = workspace.capture();
  assignment.therapyId = activeTherapies.value[0]?.id || "";
  assignmentDialog.value = true;
}
const loadTools = workspace.refresh;
async function assignExercise() {
  if (!canAssignExercise.value || savingAssignment.value || !workspace.isCurrent(formTicket)) return;
  const ticket = formTicket;
  savingAssignment.value = true;
  try {
    await createExercise({ ...assignment, terapiaId: assignment.therapyId, mode: mode.value });
    if (workspace.isCurrent(ticket)) await workspace.refresh();
  } catch (error) {
    if (workspace.isCurrent(ticket)) actionError.value = error.message || "No se pudo asignar el ejercicio.";
  } finally {
    if (workspace.isCurrent(ticket)) savingAssignment.value = false;
  }
}
function openCompleteDialog(exercise) {
  if (mode.value !== "patient" || exercise.pacienteUid !== workspace.uid.value) return;
  formTicket = workspace.capture();
  selectedExercise.value = exercise;
  completionNotes.value = "";
  completeDialog.value = true;
}
async function completeSelectedExercise() {
  if (mode.value !== "patient" || !selectedExercise.value || savingCompletion.value || !workspace.isCurrent(formTicket)) return;
  const ticket = formTicket;
  savingCompletion.value = true;
  try {
    await completeExercise({ exerciseId: selectedExercise.value.id, patientNotes: completionNotes.value.trim(), mode: mode.value });
    if (workspace.isCurrent(ticket)) await workspace.refresh();
  } catch (error) {
    if (workspace.isCurrent(ticket)) actionError.value = error.message || "No se pudo completar el ejercicio.";
  } finally {
    if (workspace.isCurrent(ticket)) savingCompletion.value = false;
  }
}
</script>

<style scoped>
.tools-view {
  max-width: 1180px;
}

.tool-stat-card {
  min-height: 124px;
}

.exercise-card {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .tools-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

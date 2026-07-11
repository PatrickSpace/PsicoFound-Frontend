<template>
  <LayoutDefault layout>
    <v-container class="tools-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Recursos entre sesiones</p>
          <h1 class="text-h4 font-weight-bold">Herramientas terapéuticas</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Ejercicios y recursos entre sesiones para sostener continuidad terapéutica.
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          class="align-self-start align-self-md-center pf-btn-secondary"
          @click="loadTools"
        >
          Actualizar
        </v-btn>
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
            v-if="!loading && patientExercises.length === 0"
            headline="Aún no tienes herramientas asignadas"
            text="Cuando tu psicólogo te asigne ejercicios entre sesiones, aparecerán aquí."
            icon="mdi-lightbulb-on-outline"
          ></v-empty-state>

          <v-row v-else align="stretch">
            <v-col
              v-for="exercise in patientExercises"
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
                  <p v-if="exercise.patientNotes" class="text-caption text-medium-emphasis mt-3">
                    Nota: {{ exercise.patientNotes }}
                  </p>
                </v-card-text>
                <v-card-actions class="px-0 pb-0 pt-4">
                  <v-btn
                    v-if="exercise.status !== 'completed'"
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
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-clipboard-plus-outline</v-icon>
          Asignar ejercicio
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
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
            color="secondary"
            variant="tonal"
            prepend-icon="mdi-send"
            :loading="savingAssignment"
            :disabled="!canAssignExercise"
            @click="assignExercise"

        class="pf-btn-secondary">
            Asignar
          </v-btn>
        </v-card-actions>
      </v-card>

      <v-dialog v-model="completeDialog" max-width="640">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">Completar ejercicio</v-card-title>
          <v-card-text>
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
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getActiveTherapyByPatient, getTherapiesByTherapist } from "@/services/terapiaService";
import {
  appendExerciseCompletedEvent,
  completeExercise,
  createExercise,
  getExercisesByPatient,
  getExercisesByTherapist,
} from "@/services/exerciseService";

const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const loading = ref(false);
const errorMessage = ref("");
const therapist = ref(null);
const activeTherapy = ref(null);
const therapistTherapies = ref([]);
const patientExercises = ref([]);
const therapistExercises = ref([]);
const savingAssignment = ref(false);
const savingCompletion = ref(false);
const completeDialog = ref(false);
const selectedExercise = ref(null);
const completionNotes = ref("");
const categoryOptions = ["Reflexión", "Respiración", "Registro emocional", "Hábitos", "Seguimiento"];

const assignment = reactive({
  therapyId: "",
  title: "",
  category: "Seguimiento",
  frequency: "",
  dueDate: "",
  instructions: "",
});

const pendingPatientExercises = computed(() =>
  patientExercises.value.filter((exercise) => exercise.status !== "completed")
);

const completedPatientExercises = computed(() =>
  patientExercises.value.filter((exercise) => exercise.status === "completed")
);

const therapistTherapyOptions = computed(() =>
  therapistTherapies.value.map((therapy) => ({
    title: `${therapy.pacienteNombre || "Paciente"} • ${therapy.estado || "activo"}`,
    value: therapy.id,
  }))
);

const canAssignExercise = computed(
  () =>
    assignment.therapyId &&
    assignment.title.trim() &&
    assignment.instructions.trim()
);

const isPsychologistMode = computed(
  () => appContext.activeMode === "psychologist"
);

watch(
  () => currentUser.value?.uid,
  () => {
    loadTools();
  },
  { immediate: true }
);

watch(
  () => appContext.activeMode,
  () => {
    loadTools();
  }
);

async function loadTools() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    resetState();
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const [patientTherapy, patientExerciseItems, therapistProfile] = await Promise.all([
      getActiveTherapyByPatient(uid),
      getExercisesByPatient(uid),
      getTherapistByUserUid(uid),
    ]);

    activeTherapy.value = patientTherapy;
    patientExercises.value = patientExerciseItems;
    therapist.value = isPsychologistMode.value ? therapistProfile : null;

    if (isPsychologistMode.value && therapistProfile?.id) {
      therapistTherapies.value = await getTherapiesByTherapist(therapistProfile.id);
      therapistExercises.value = await getExercisesByTherapist(therapistProfile.id);
    } else {
      therapistTherapies.value = [];
      therapistExercises.value = [];
    }
  } catch (error) {
    console.error("Error loading therapeutic tools:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar las herramientas terapéuticas.";
    resetState();
  } finally {
    loading.value = false;
  }
}

function resetState() {
  therapist.value = null;
  activeTherapy.value = null;
  therapistTherapies.value = [];
  patientExercises.value = [];
  therapistExercises.value = [];
}

async function assignExercise() {
  const therapy = therapistTherapies.value.find(
    (item) => item.id === assignment.therapyId
  );

  if (!therapy || !therapist.value?.id || savingAssignment.value) {
    return;
  }

  savingAssignment.value = true;

  try {
    await createExercise({
      terapiaId: therapy.id,
      pacienteUid: therapy.pacienteUid,
      pacienteNombre: therapy.pacienteNombre,
      terapeutaId: therapist.value.id,
      terapeutaNombre: therapist.value.nombre,
      title: assignment.title.trim(),
      instructions: assignment.instructions.trim(),
      category: assignment.category,
      frequency: assignment.frequency.trim(),
      dueDate: assignment.dueDate,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Ejercicio asignado",
          message: "La herramienta fue enviada al paciente.",
        },
      })
    );

    resetAssignment();
    await loadTools();
  } catch (error) {
    console.error("Error assigning exercise:", error);
    notifyError(error?.message || "No se pudo asignar el ejercicio.");
  } finally {
    savingAssignment.value = false;
  }
}

function resetAssignment() {
  assignment.therapyId = "";
  assignment.title = "";
  assignment.category = "Seguimiento";
  assignment.frequency = "";
  assignment.dueDate = "";
  assignment.instructions = "";
}

function openCompleteDialog(exercise) {
  selectedExercise.value = exercise;
  completionNotes.value = exercise.patientNotes || "";
  completeDialog.value = true;
}

async function completeSelectedExercise() {
  if (!selectedExercise.value?.id || savingCompletion.value) {
    return;
  }

  savingCompletion.value = true;

  try {
    const result = await completeExercise({
      exerciseId: selectedExercise.value.id,
      patientNotes: completionNotes.value.trim(),
    });
    await appendExerciseCompletedEvent({
      ...selectedExercise.value,
      ...result,
      patientNotes: completionNotes.value.trim(),
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Ejercicio completado",
          message: "Tu avance fue registrado en el historial.",
        },
      })
    );

    completeDialog.value = false;
    selectedExercise.value = null;
    await loadTools();
  } catch (error) {
    console.error("Error completing exercise:", error);
    notifyError(error?.message || "No se pudo completar el ejercicio.");
  } finally {
    savingCompletion.value = false;
  }
}

function notifyError(message) {
  window.dispatchEvent(
    new CustomEvent("api-error", {
      detail: { message },
    })
  );
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
  .tools-view {
    padding-inline: 16px;
  }

  .tools-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

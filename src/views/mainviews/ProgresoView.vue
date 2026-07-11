<template>
  <LayoutDefault layout>
    <v-container class="progress-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Seguimiento terapéutico</p>
          <h1 class="text-h4 font-weight-bold">Progreso</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Tu perfil inicial y tus sesiones ayudan a construir continuidad en tu proceso.
          </p>
        </div>
        <v-chip
          :color="isProfileReady ? 'success' : 'warning'"
          variant="tonal"
          :prepend-icon="isProfileReady ? 'mdi-account-check-outline' : 'mdi-clock-outline'"
          class="align-self-start"
        >
          {{ isProfileReady ? "Perfil listo" : "Perfil en progreso" }}
        </v-chip>
      </div>

      <v-alert
        v-if="profileError"
        class="mb-5"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ profileError }}
      </v-alert>

      <v-card class="pa-4 mb-6 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-clipboard-account-outline</v-icon>
          Perfil psicológico inicial
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <div v-if="loadingProfile" class="py-8 d-flex justify-center">
            <v-progress-circular indeterminate color="secondary" />
          </div>

          <v-empty-state
            v-else-if="!profile"
            headline="Aún no tienes perfil inicial"
            text="Completa la entrevista conversacional para generar una primera orientación no diagnóstica."
              icon="mdi-message-question-outline"
          >
            <template #actions>
              <v-btn
                color="secondary"
                variant="tonal"
                to="/encuesta"
                prepend-icon="mdi-chat-outline"

        class="pf-btn-secondary">
                Completar entrevista
              </v-btn>
            </template>
          </v-empty-state>

          <v-row v-else>
            <v-col cols="12" md="7">
              <div class="text-subtitle-1 font-weight-medium mb-2">
                Motivo y temas principales
              </div>
              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ profile.motivoConsulta || "Aún no se registró un motivo principal." }}
              </p>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="topic in profileTopics"
                  :key="topic"
                  color="secondary"
                  variant="tonal"
                  size="small"
                >
                  {{ topic }}
                </v-chip>
                <v-chip
                  v-if="profileTopics.length === 0"
                  color="secondary"
                  variant="tonal"
                  size="small"
                >
                  Sin temas registrados
                </v-chip>
              </div>
            </v-col>

            <v-col cols="12" md="5">
              <v-list density="compact" class="bg-transparent">
                <v-list-item title="Modalidad" :subtitle="displayValue(profile.modalidad)" />
                <v-list-item title="Preferencia de género" :subtitle="displayValue(profile.preferenciaGenero)" />
                <v-list-item title="Preferencia de edad" :subtitle="displayValue(profile.preferenciaEdad)" />
                <v-list-item title="Enfoque" :subtitle="displayValue(profile.enfoque)" />
                <v-list-item title="Urgencia" :subtitle="displayValue(profile.urgencia)" />
              </v-list>
            </v-col>

            <v-col cols="12">
              <v-alert
                color="info"
                variant="tonal"
                icon="mdi-information-outline"
              >
                Este perfil organiza información para orientar el proceso. No constituye diagnóstico clínico.
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

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
            color="error"
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
            <v-card-title class="text-subtitle-1 font-weight-bold px-0 pt-0">
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
                color="secondary"
                variant="tonal"
                prepend-icon="mdi-plus"
                :loading="savingGoal"
                :disabled="!canCreateGoal"
                @click="saveGoal"

        class="pf-btn-secondary">
                Crear objetivo
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-card-text>
      </v-card>

      <v-card class="pa-4 mb-6 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-emoticon-outline</v-icon>
          Registro emocional
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <v-alert
            v-if="checkinsError"
            class="mb-4"
            color="error"
            variant="tonal"
            icon="mdi-alert-outline"
          >
            {{ checkinsError }}
          </v-alert>

          <v-row class="mb-4" align="stretch">
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Registros</div>
                    <div class="text-h4 font-weight-bold mt-1">{{ checkins.length }}</div>
                    <div class="text-caption text-medium-emphasis">Check-ins emocionales</div>
                  </div>
                  <v-avatar color="secondary" variant="tonal" rounded="lg">
                    <v-icon>mdi-note-text-outline</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Intensidad</div>
                    <div class="text-h4 font-weight-bold mt-1">{{ averageIntensity }}</div>
                    <div class="text-caption text-medium-emphasis">Promedio registrado</div>
                  </div>
                  <v-avatar color="warning" variant="tonal" rounded="lg">
                    <v-icon>mdi-pulse</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4" class="d-flex">
              <v-card class="pa-4 card-backgoundcustom flex-grow-1 progress-stat-card" elevation="2" variant="text">
                <div class="d-flex align-center justify-space-between ga-3">
                  <div>
                    <div class="text-body-2 text-medium-emphasis">Último estado</div>
                    <div class="text-h5 font-weight-bold mt-1">{{ latestMood }}</div>
                    <div class="text-caption text-medium-emphasis">Registro reciente</div>
                  </div>
                  <v-avatar color="success" variant="tonal" rounded="lg">
                    <v-icon>mdi-emoticon-outline</v-icon>
                  </v-avatar>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <v-card
            v-if="!therapist"
            class="pa-4 mb-4 card-backgoundcustom"
            elevation="2"
            variant="text"
          >
            <v-card-title class="text-subtitle-1 font-weight-bold px-0 pt-0">
              Agregar registro
            </v-card-title>
            <v-card-text>
              <v-alert
                v-if="!activeTherapy"
                class="mb-4"
                color="warning"
                variant="tonal"
                icon="mdi-information-outline"
              >
                Cuando tengas una terapia activa podrás registrar check-ins emocionales asociados a tu proceso.
              </v-alert>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="checkinForm.mood"
                    :items="moodOptions"
                    label="Estado principal"
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-combobox
                    v-model="checkinForm.tags"
                    :items="tagSuggestions"
                    label="Temas del día"
                    multiple
                    chips
                    closable-chips
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-slider
                    v-model="checkinForm.intensity"
                    color="secondary"
                    label="Intensidad"
                    min="1"
                    max="10"
                    step="1"
                    thumb-label
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-slider
                    v-model="checkinForm.energy"
                    color="secondary"
                    label="Energía"
                    min="1"
                    max="10"
                    step="1"
                    thumb-label
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-slider
                    v-model="checkinForm.sleepQuality"
                    color="secondary"
                    label="Sueño"
                    min="1"
                    max="10"
                    step="1"
                    thumb-label
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="checkinForm.note"
                    label="Nota personal"
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
                prepend-icon="mdi-content-save-outline"
                :loading="savingCheckin"
                :disabled="!canCreateCheckin"
                @click="saveCheckin"

        class="pf-btn-secondary">
                Guardar registro
              </v-btn>
            </v-card-actions>
          </v-card>

          <div v-if="loadingCheckins" class="py-8 d-flex justify-center">
            <v-progress-circular indeterminate color="secondary" />
          </div>

          <v-empty-state
            v-else-if="checkins.length === 0"
            headline="Aún no hay registros emocionales"
            text="Los check-ins ayudan a observar continuidad entre sesiones sin reemplazar la evaluación clínica."
            icon="mdi-emoticon-neutral-outline"
          ></v-empty-state>

          <v-list v-else class="bg-transparent" lines="three">
            <v-list-item
              v-for="checkin in recentCheckins"
              :key="checkin.id"
              class="checkin-item mb-2"
            >
              <template #prepend>
                <v-avatar color="secondary" variant="tonal">
                  <v-icon>mdi-emoticon-outline</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>
                {{ checkin.mood }} · intensidad {{ checkin.intensity }}/10
              </v-list-item-title>
              <v-list-item-subtitle>
                Energía {{ checkin.energy }}/10 · Sueño {{ checkin.sleepQuality }}/10
                <span v-if="checkin.pacienteNombre"> · {{ checkin.pacienteNombre }}</span>
              </v-list-item-subtitle>
              <p v-if="checkin.note" class="text-body-2 mt-2 mb-1">
                {{ checkin.note }}
              </p>
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="tag in checkin.tags || []"
                  :key="`${checkin.id}-${tag}`"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-calendar-check-outline</v-icon>
          Sesiones y citas
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>
          <CitasDatatable />
        </v-card-text>
      </v-card>

      <v-dialog v-model="goalProgressDialog" max-width="620">
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
import CitasDatatable from "@/components/Terapias/CitasDatatable.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { watchProfile } from "@/services/conversationService";
import { getTherapistByUserUid } from "@/services/psicologoService";
import {
  getActiveTherapyByPatient,
  getTherapiesByTherapist,
} from "@/services/terapiaService";
import {
  createTherapyGoal,
  getGoalsByPatient,
  getGoalsByTherapist,
  updateTherapyGoalProgress,
} from "@/services/therapyGoalService";
import {
  createEmotionalCheckin,
  getCheckinsByPatient,
  getCheckinsByTherapist,
} from "@/services/emotionalCheckinService";
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
const loadingProfile = ref(false);
const loadingGoals = ref(false);
const loadingCheckins = ref(false);
const goalsError = ref("");
const checkinsError = ref("");
const goals = ref([]);
const checkins = ref([]);
const activeTherapy = ref(null);
const therapist = ref(null);
const therapistTherapies = ref([]);
const savingGoal = ref(false);
const savingCheckin = ref(false);
const savingGoalProgress = ref(false);
const goalProgressDialog = ref(false);
const selectedGoal = ref(null);
let unsubscribeProfile = null;

const moodOptions = [
  "Tranquilo/a",
  "Ansioso/a",
  "Triste",
  "Motivado/a",
  "Irritable",
  "Cansado/a",
  "Confundido/a",
  "Esperanzado/a",
];

const tagSuggestions = [
  "Trabajo",
  "Familia",
  "Pareja",
  "Sueño",
  "Estudio",
  "Salud",
  "Relaciones",
  "Autocuidado",
];

const goalForm = reactive({
  therapyId: "",
  title: "",
  description: "",
  category: "Proceso terapéutico",
  targetDate: "",
});

const checkinForm = reactive({
  mood: "",
  intensity: 5,
  energy: 5,
  sleepQuality: 5,
  note: "",
  tags: [],
});

const goalProgressForm = reactive({
  progress: 0,
  note: "",
  achieved: false,
});

const profileTopics = computed(() =>
  Array.isArray(profile.value?.temas) ? profile.value.temas : []
);

const isProfileReady = computed(() =>
  isProfileReadyForRecommendations(profile.value)
);

const activeGoalsCount = computed(
  () => goals.value.filter((goal) => goal.status !== "achieved").length
);

const achievedGoalsCount = computed(
  () => goals.value.filter((goal) => goal.status === "achieved").length
);

const recentCheckins = computed(() => checkins.value.slice(0, 6));

const averageIntensity = computed(() => {
  if (checkins.value.length === 0) {
    return "-";
  }

  const total = checkins.value.reduce(
    (sum, checkin) => sum + Number(checkin.intensity || 0),
    0
  );

  return (total / checkins.value.length).toFixed(1);
});

const latestMood = computed(() => checkins.value[0]?.mood || "-");

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

const canCreateCheckin = computed(
  () => Boolean(activeTherapy.value?.id) && checkinForm.mood.trim().length > 0
);

const isPsychologistMode = computed(
  () => appContext.activeMode === "psychologist"
);

watch(
  () => currentUser.value?.uid,
  (uid) => {
    unsubscribeProfile?.();
    profile.value = null;
    profileError.value = "";

    if (!uid) {
      loadingProfile.value = false;
      resetGoalState();
      resetCheckinState();
      return;
    }

    loadingProfile.value = true;
    unsubscribeProfile = watchProfile(
      uid,
      (item) => {
        profile.value = item;
        loadingProfile.value = false;
      },
      (error) => {
        console.error("Error loading profile progress:", error);
        profileError.value =
          "No pudimos cargar tu perfil inicial. Intenta nuevamente.";
        loadingProfile.value = false;
      }
    );
    loadGoals();
    loadCheckins();
  },
  { immediate: true }
);

watch(
  () => appContext.activeMode,
  () => {
    loadGoals();
    loadCheckins();
  }
);

onBeforeUnmount(() => {
  unsubscribeProfile?.();
});

function displayValue(value) {
  return (value || "").toString().trim() || "No definido";
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

async function loadCheckins() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    resetCheckinState();
    return;
  }

  loadingCheckins.value = true;
  checkinsError.value = "";

  try {
    const therapistProfile = isPsychologistMode.value
      ? therapist.value || (await getTherapistByUserUid(uid))
      : null;
    let patientCheckins = [];
    let therapistCheckins = [];

    if (!therapistProfile?.id) {
      patientCheckins = await getCheckinsByPatient(uid);
    } else {
      therapistCheckins = await getCheckinsByTherapist(therapistProfile.id);
    }

    checkins.value = mergeCheckins(patientCheckins, therapistCheckins);
  } catch (error) {
    console.error("Error loading emotional checkins:", error);
    checkinsError.value = getPermissionAwareMessage(
      error,
      "No pudimos cargar los registros emocionales."
    );
    checkins.value = [];
  } finally {
    loadingCheckins.value = false;
  }
}

function mergeGoals(patientGoals, therapistGoals) {
  const byId = new Map();
  [...patientGoals, ...therapistGoals].forEach((goal) => {
    byId.set(goal.id, goal);
  });
  return Array.from(byId.values());
}

function mergeCheckins(patientCheckins, therapistCheckins) {
  const byId = new Map();
  [...patientCheckins, ...therapistCheckins].forEach((checkin) => {
    byId.set(checkin.id, checkin);
  });
  return Array.from(byId.values()).sort(
    (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
  );
}

function toTimestamp(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function resetGoalState() {
  activeTherapy.value = null;
  therapist.value = null;
  therapistTherapies.value = [];
  goals.value = [];
}

function resetCheckinState() {
  checkins.value = [];
  checkinsError.value = "";
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

async function saveCheckin() {
  if (!canCreateCheckin.value || savingCheckin.value) {
    return;
  }

  savingCheckin.value = true;

  try {
    await createEmotionalCheckin({
      pacienteUid: activeTherapy.value.pacienteUid,
      pacienteNombre: activeTherapy.value.pacienteNombre,
      terapeutaId: activeTherapy.value.terapeutaId,
      terapeutaNombre: activeTherapy.value.terapeutaNombre,
      terapiaId: activeTherapy.value.id,
      mood: checkinForm.mood.trim(),
      intensity: checkinForm.intensity,
      energy: checkinForm.energy,
      sleepQuality: checkinForm.sleepQuality,
      note: checkinForm.note.trim(),
      tags: checkinForm.tags,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Registro guardado",
          message: "El check-in emocional fue agregado al proceso.",
        },
      })
    );

    resetCheckinForm();
    await loadCheckins();
  } catch (error) {
    console.error("Error creating emotional checkin:", error);
    checkinsError.value = getPermissionAwareMessage(
      error,
      "No se pudo guardar el registro emocional."
    );
  } finally {
    savingCheckin.value = false;
  }
}

function resetCheckinForm() {
  checkinForm.mood = "";
  checkinForm.intensity = 5;
  checkinForm.energy = 5;
  checkinForm.sleepQuality = 5;
  checkinForm.note = "";
  checkinForm.tags = [];
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

.checkin-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

@media (max-width: 600px) {
  .progress-view {
    padding-inline: 16px;
  }

  .progress-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

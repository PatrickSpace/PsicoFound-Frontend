<template>
  <LayoutDefault layout>
    <v-container class="emotional-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Seguimiento personal
            </p>
            <h1 class="text-h4 font-weight-bold">Registro emocional</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Observa cómo cambia tu estado emocional entre sesiones y registra lo
              que estás viviendo.
            </p>
          </div>
          <div class="page-header__actions">
            <v-btn
              v-if="!isPsychologistMode"
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-plus"
              class="pf-btn-secondary"
              :disabled="!activeTherapy"
              @click="checkinDialog = true"
            >
              Agregar registro
            </v-btn>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-alert
        v-if="errorMessage"
        class="mb-5"
        color="warning"
        variant="tonal"
        icon="mdi-alert-outline"
      >
        {{ errorMessage }}
      </v-alert>

      <v-alert
        v-if="!isPsychologistMode && !activeTherapy && !loading"
        class="mb-5"
        color="warning"
        variant="tonal"
        icon="mdi-information-outline"
      >
        Cuando tengas una terapia activa podrás registrar estados emocionales
        asociados a tu proceso.
      </v-alert>

      <v-row class="mb-4" align="stretch">
        <v-col cols="12" md="4" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 emotional-stat-card"
            elevation="2"
            variant="text"
          >
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Registros</div>
                <div class="text-h4 font-weight-bold mt-1">{{ checkins.length }}</div>
                <div class="text-caption text-medium-emphasis">
                  Estados emocionales
                </div>
              </div>
              <v-avatar color="secondary" variant="tonal" rounded="lg">
                <v-icon>mdi-note-text-outline</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 emotional-stat-card"
            elevation="2"
            variant="text"
          >
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Intensidad</div>
                <div class="text-h4 font-weight-bold mt-1">
                  {{ averageIntensity }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  Promedio registrado
                </div>
              </div>
              <v-avatar color="warning" variant="tonal" rounded="lg">
                <v-icon>mdi-pulse</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="4" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1 emotional-stat-card"
            elevation="2"
            variant="text"
          >
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Último estado</div>
                <div class="text-h5 font-weight-bold mt-1">{{ latestMood }}</div>
                <div class="text-caption text-medium-emphasis">
                  Registro reciente
                </div>
              </div>
              <v-avatar color="success" variant="tonal" rounded="lg">
                <v-icon>mdi-emoticon-outline</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title
          class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0"
        >
          <v-icon color="secondary" size="small">mdi-emoticon-outline</v-icon>
          Historial emocional
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4" />

          <div v-if="loading" class="py-8 d-flex justify-center">
            <v-progress-circular indeterminate color="secondary" />
          </div>

          <v-empty-state
            v-else-if="checkins.length === 0"
            headline="Aún no hay registros emocionales"
            text="Los registros ayudan a observar continuidad entre sesiones sin reemplazar la evaluación clínica."
            icon="mdi-emoticon-neutral-outline"
          />

          <v-list v-else class="bg-transparent" lines="three">
            <v-list-item
              v-for="checkin in checkins"
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
                Energía {{ checkin.energy }}/10 · Sueño
                {{ checkin.sleepQuality }}/10
                <span v-if="isPsychologistMode && checkin.pacienteNombre">
                  · {{ checkin.pacienteNombre }}
                </span>
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

      <v-dialog v-model="checkinDialog" class="bg-transparent" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Agregar registro emocional
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="!activeTherapy"
              class="mb-4"
              color="warning"
              variant="tonal"
              icon="mdi-information-outline"
            >
              Cuando tengas una terapia activa podrás registrar estados
              emocionales asociados a tu proceso.
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.mood"
                  :items="moodOptions"
                  label="Estado principal"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="form.tags"
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
                  v-model="form.intensity"
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
                  v-model="form.energy"
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
                  v-model="form.sleepQuality"
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
                  v-model="form.note"
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
              class="pf-btn-ghost"
              variant="text"
              :disabled="saving"
              @click="checkinDialog = false"
            >
              Cancelar
            </v-btn>
            <v-btn
              class="pf-btn-secondary"
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-content-save-outline"
              :loading="saving"
              :disabled="!canSave"
              @click="saveCheckin"
            >
              Guardar registro
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
import { getActiveTherapyByPatient } from "@/services/terapiaService";
import {
  createEmotionalCheckin,
  getCheckinsByPatient,
  getCheckinsByTherapist,
} from "@/services/emotionalCheckinService";
import { getPermissionAwareMessage } from "@/utils/firebaseErrors";

const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);

const activeTherapy = ref(null);
const checkins = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const checkinDialog = ref(false);
let loadRequestId = 0;

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

const form = reactive({
  mood: "",
  intensity: 5,
  energy: 5,
  sleepQuality: 5,
  note: "",
  tags: [],
});

const isPsychologistMode = computed(
  () => appContext.activeMode === "psychologist"
);

const averageIntensity = computed(() => {
  if (!checkins.value.length) return "-";

  const total = checkins.value.reduce(
    (sum, checkin) => sum + Number(checkin.intensity || 0),
    0
  );
  return (total / checkins.value.length).toFixed(1);
});

const latestMood = computed(() => checkins.value[0]?.mood || "-");

const canSave = computed(
  () => Boolean(activeTherapy.value?.id) && form.mood.trim().length > 0
);

watch(
  [() => currentUser.value?.uid, () => appContext.activeMode],
  loadCheckins,
  { immediate: true }
);

async function loadCheckins() {
  const requestId = ++loadRequestId;
  const uid = currentUser.value?.uid;

  if (!uid) {
    activeTherapy.value = null;
    checkins.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    let items = [];

    if (isPsychologistMode.value) {
      const therapist = await getTherapistByUserUid(uid);
      activeTherapy.value = null;
      items = therapist?.id
        ? await getCheckinsByTherapist(therapist.id)
        : [];
    } else {
      const [therapy, patientCheckins] = await Promise.all([
        getActiveTherapyByPatient(uid),
        getCheckinsByPatient(uid),
      ]);
      activeTherapy.value = therapy;
      items = patientCheckins;
    }

    if (requestId === loadRequestId) {
      checkins.value = items;
    }
  } catch (error) {
    console.error("Error loading emotional checkins:", error);

    if (requestId === loadRequestId) {
      checkins.value = [];
      errorMessage.value = getPermissionAwareMessage(
        error,
        "No pudimos cargar los registros emocionales."
      );
    }
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

async function saveCheckin() {
  if (!canSave.value || saving.value) return;

  saving.value = true;

  try {
    await createEmotionalCheckin({
      pacienteUid: activeTherapy.value.pacienteUid,
      pacienteNombre: activeTherapy.value.pacienteNombre,
      terapeutaId: activeTherapy.value.terapeutaId,
      terapeutaNombre: activeTherapy.value.terapeutaNombre,
      terapiaId: activeTherapy.value.id,
      mood: form.mood.trim(),
      intensity: form.intensity,
      energy: form.energy,
      sleepQuality: form.sleepQuality,
      note: form.note.trim(),
      tags: form.tags,
    });

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Registro guardado",
          message: "El registro emocional fue agregado al proceso.",
        },
      })
    );

    resetForm();
    checkinDialog.value = false;
    await loadCheckins();
  } catch (error) {
    console.error("Error creating emotional checkin:", error);
    errorMessage.value = getPermissionAwareMessage(
      error,
      "No se pudo guardar el registro emocional."
    );
  } finally {
    saving.value = false;
  }
}

function resetForm() {
  form.mood = "";
  form.intensity = 5;
  form.energy = 5;
  form.sleepQuality = 5;
  form.note = "";
  form.tags = [];
}
</script>

<style scoped>
.emotional-view {
  max-width: 1180px;
}

.emotional-stat-card {
  min-height: 124px;
}

.checkin-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

@media (max-width: 600px) {
  .emotional-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

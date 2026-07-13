<template>
  <v-card class="pa-4 mb-6 card-backgoundcustom" elevation="2" variant="text">
    <v-card-title
      class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0"
    >
      <v-icon color="secondary" size="small">mdi-heart-pulse</v-icon>
      Resumen de mi terapia actual
    </v-card-title>
    <v-card-text>
      <v-divider class="mb-4" />

      <v-row align="stretch">
        <v-col cols="12" md="4">
          <div class="therapist-summary h-100">
            <v-avatar size="72" rounded="xl" color="secondary" variant="tonal">
              <v-img
                v-if="therapist?.avatar"
                :src="therapist.avatar"
                :alt="therapistName"
                cover
              />
              <v-icon v-else size="38">mdi-account-heart-outline</v-icon>
            </v-avatar>

            <div class="min-width-0">
              <p class="text-caption text-medium-emphasis mb-1">
                Tu psicólogo
              </p>
              <p class="text-subtitle-1 font-weight-bold mb-2">
                {{ therapistName }}
              </p>
              <v-btn
                class="pf-btn-ghost px-0"
                color="secondary"
                variant="text"
                size="small"
                append-icon="mdi-open-in-new"
                :loading="loadingTherapist"
                :disabled="!therapist"
                @click="profileDialog = true"
              >
                Ver perfil completo
              </v-btn>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="8">
          <div class="therapy-summary-grid h-100">
            <div class="therapy-summary-item therapy-summary-item--wide">
              <span>Motivo principal de consulta</span>
              <strong>{{ mainReason }}</strong>
            </div>

            <div class="therapy-summary-item therapy-summary-item--wide">
              <span>Tipo de terapia</span>
              <div v-if="therapyApproaches.length" class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="approach in therapyApproaches"
                  :key="approach"
                  size="small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ approach }}
                </v-chip>
              </div>
              <strong v-else>Por definir</strong>
            </div>

            <div class="therapy-summary-item">
              <span>Modalidad</span>
              <strong>{{ therapyMode }}</strong>
            </div>

            <div class="therapy-summary-item">
              <span>Inicio del proceso</span>
              <strong>{{ formattedStartDate }}</strong>
            </div>

            <div class="therapy-summary-item">
              <span>Citas registradas</span>
              <strong>{{ appointmentCount }}</strong>
            </div>

            <div class="therapy-summary-item">
              <span>Herramientas aprendidas</span>
              <strong>{{ learnedToolsCount }}</strong>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <v-dialog v-model="profileDialog" max-width="720" class="bg-transparent">
    <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
      <v-card-title class="profile-dialog-title px-0 pt-0">
        <div class="d-flex align-center ga-3 min-width-0">
          <v-avatar size="56" rounded="xl" color="secondary" variant="tonal">
            <v-img
              v-if="therapist?.avatar"
              :src="therapist.avatar"
              :alt="therapistName"
              cover
            />
            <v-icon v-else size="30">mdi-account-heart-outline</v-icon>
          </v-avatar>
          <div class="min-width-0">
            <p class="text-caption text-medium-emphasis mb-0">
              Perfil público del psicólogo
            </p>
            <p class="text-h6 font-weight-bold text-truncate mb-0">
              {{ therapistName }}
            </p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          class="pf-btn-icon"
          aria-label="Cerrar perfil"
          @click="profileDialog = false"
        />
      </v-card-title>

      <v-card-text class="px-0">
        <v-divider class="mb-4" />

        <p class="text-body-2 mb-4">
          {{
            therapist?.description ||
            therapist?.mensaje ||
            "Este profesional todavía no ha agregado una presentación pública."
          }}
        </p>

        <div v-if="therapist?.mensaje && therapist?.description" class="profile-message mb-5">
          {{ therapist.mensaje }}
        </div>

        <div class="profile-section">
          <p class="profile-section__title">Especialidades</p>
          <div v-if="publicSpecialties.length" class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="specialty in publicSpecialties"
              :key="specialty"
              size="small"
              color="secondary"
              variant="tonal"
            >
              {{ specialty }}
            </v-chip>
          </div>
          <p v-else class="text-body-2 text-medium-emphasis mb-0">
            No especificadas
          </p>
        </div>

        <div class="profile-section">
          <p class="profile-section__title">Tipos de terapia</p>
          <div v-if="publicApproaches.length" class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="approach in publicApproaches"
              :key="approach"
              size="small"
              color="secondary"
              variant="outlined"
            >
              {{ approach }}
            </v-chip>
          </div>
          <p v-else class="text-body-2 text-medium-emphasis mb-0">
            No especificados
          </p>
        </div>

        <div class="profile-section">
          <p class="profile-section__title">Modalidades de atención</p>
          <div v-if="publicModalities.length" class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="modality in publicModalities"
              :key="modality"
              size="small"
              color="secondary"
              variant="tonal"
            >
              {{ modality }}
            </v-chip>
          </div>
          <p v-else class="text-body-2 text-medium-emphasis mb-0">
            No especificadas
          </p>
        </div>

        <v-list
          v-if="therapist?.genero || therapist?.edad"
          density="compact"
          class="bg-transparent pa-0 mt-4"
        >
          <v-list-item
            v-if="therapist.genero"
            prepend-icon="mdi-account-outline"
            title="Género"
            :subtitle="therapist.genero"
          />
          <v-list-item
            v-if="therapist.edad"
            prepend-icon="mdi-calendar-account-outline"
            title="Edad"
            :subtitle="`${therapist.edad} años`"
          />
        </v-list>
      </v-card-text>

      <v-card-actions class="px-0 pb-0 justify-end">
        <v-btn
          class="pf-btn-secondary"
          color="secondary"
          variant="tonal"
          @click="profileDialog = false"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  therapy: {
    type: Object,
    required: true,
  },
  therapist: {
    type: Object,
    default: null,
  },
  mainReason: {
    type: String,
    default: "En exploración",
  },
  loadingTherapist: {
    type: Boolean,
    default: false,
  },
  learnedToolsCount: {
    type: Number,
    default: 0,
  },
});

const profileDialog = ref(false);

const therapistName = computed(
  () => props.therapist?.nombre || props.therapy?.terapeutaNombre || "Psicólogo asignado"
);

const publicSpecialties = computed(() =>
  normalizeValues(props.therapist?.especialidades)
);

const publicApproaches = computed(() =>
  normalizeValues(props.therapist?.enfoques || props.therapist?.enfoque)
);

const therapyApproaches = computed(() => {
  const therapyValues = normalizeValues(
    props.therapy?.enfoquesTerapeuticos || props.therapy?.enfoqueTerapeutico
  );

  return therapyValues.length ? therapyValues : publicApproaches.value;
});

const publicModalities = computed(() =>
  normalizeValues(props.therapist?.modalidades || props.therapist?.modalidad)
);

const therapyMode = computed(() => {
  if (props.therapy?.modalidad) return props.therapy.modalidad;

  const appointmentMode = (props.therapy?.citas || []).find(
    (appointment) => appointment?.modalidad
  )?.modalidad;

  return appointmentMode || publicModalities.value.join(", ") || "Por definir";
});

const appointmentCount = computed(() =>
  Array.isArray(props.therapy?.citas) ? props.therapy.citas.length : 0
);

const formattedStartDate = computed(() => {
  const value = props.therapy?.fechaCreacion || props.therapy?.fechaInicio;
  if (!value) return "No definida";

  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime())
    ? "No definida"
    : date.toLocaleDateString("es-PE");
});

function normalizeValues(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item?.toString().trim()).filter(Boolean);
  }

  const normalized = value?.toString().trim();
  return normalized ? [normalized] : [];
}
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.therapist-summary {
  align-items: center;
  border: 1px solid rgba(var(--v-theme-border-subtle), 0.32);
  border-radius: 16px;
  display: flex;
  gap: 16px;
  padding: 16px;
}

.therapy-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.therapy-summary-item {
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 12px 14px;
}

.therapy-summary-item--wide {
  grid-column: 1 / -1;
}

.therapy-summary-item > span,
.profile-section__title {
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0;
}

.therapy-summary-item > strong {
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.9rem;
}

.profile-dialog-title {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.profile-message {
  background: rgba(var(--v-theme-surface-hover), 0.42);
  border-left: 3px solid rgb(var(--v-theme-secondary));
  border-radius: 8px;
  color: rgb(var(--v-theme-text-primary));
  font-size: 0.875rem;
  padding: 10px 12px;
}

.profile-section + .profile-section {
  margin-top: 18px;
}

.profile-section__title {
  margin-bottom: 8px;
}

@media (max-width: 599px) {
  .therapist-summary {
    align-items: flex-start;
    padding: 12px;
  }

  .therapy-summary-grid {
    grid-template-columns: 1fr;
  }

  .therapy-summary-item--wide {
    grid-column: auto;
  }
}
</style>

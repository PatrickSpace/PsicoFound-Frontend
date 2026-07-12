<template>
  <v-container fluid class="therapist-list-container">
    <v-row justify="center">
      <v-col cols="12" lg="8" xl="7" class="mx-auto">
        <div class="d-flex flex-column ga-4">
          <v-card
            v-for="therapist in topTherapists"
            :key="therapist.id"
            rounded="lg"
            elevation="2"
            class="therapist-card card-backgoundcustom"
            variant="text"
          >
            <v-card-text class="pa-0">
              <v-row align="stretch" class="ma-0">
                <v-col
                  cols="12"
                  md="3"
                  lg="2"
                  xl="2"
                  class="therapist-media w-100 d-flex align-center justify-center px-4 py-6"
                >
                  <div
                    class="d-flex flex-column flex-md-row align-center justify-center ga-3 w-100"
                  >
                    <v-avatar class="therapist-avatar" size="112" rounded="xl">
                      <v-img
                        v-if="therapist.avatar"
                        :src="therapist.avatar"
                        :alt="therapist.nombre"
                        cover
                      />
                      <v-icon v-else size="64">
                        {{ avatarFallbackIcon(therapist.genero) }}
                      </v-icon>
                    </v-avatar>

                    <div class="d-md-none therapist-mobile-heading">
                      <div class="text-subtitle-1 font-weight-bold">
                        {{ therapist.nombre }}
                      </div>
                      <div
                        class="text-caption text-medium-emphasis text-capitalize"
                      >
                        {{ therapist.genero || "No especificado" }}
                        <span v-if="therapist.edad"
                          >• {{ therapist.edad }} años</span
                        >
                      </div>
                      <v-chip
                        class="mt-2"
                        size="x-small"
                        color="warning"
                        variant="tonal"
                        prepend-icon="mdi-star-circle"
                      >
                        Recomendado
                      </v-chip>
                    </div>
                  </div>
                </v-col>

                <v-col cols="12" md="6" lg="7" xl="6" class="pa-4">
                  <div class="d-none d-md-flex align-center ga-3 mb-2">
                    <div class="text-h6">
                      <span class="font-weight-bold">
                        {{ therapist.nombre }}
                      </span>
                      ,
                      {{
                        therapist.edad
                          ? `${therapist.edad} años`
                          : "Edad no especificada"
                      }}
                      - {{ modalidadesTexto(therapist) }}
                    </div>
                    <v-chip
                      size="small"
                      color="warning"
                      variant="tonal"
                      prepend-icon="mdi-star-circle"
                    >
                      Recomendado
                    </v-chip>
                  </div>

                  <div class="text-body-2 text-medium-emphasis mb-3 therapist-description">
                    {{ therapist.description }}
                  </div>

                  <div class="d-flex flex-wrap ga-2 mb-2">
                    <v-chip
                      v-for="especialidad in therapist.especialidades || []"
                      :key="`${therapist.id}-esp-${especialidad}`"
                      size="small"
                      color="secondary"
                      variant="tonal"
                    >
                      {{ especialidad }}
                    </v-chip>
                  </div>

                  <div class="d-flex flex-wrap ga-2">
                    <v-chip
                      v-for="enfoque in therapist.enfoques || []"
                      :key="`${therapist.id}-enf-${enfoque}`"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    >
                      {{ enfoque }}
                    </v-chip>
                  </div>
                </v-col>

                <v-col cols="12" md="3" xl="4" class="pa-4">
                  <div class="d-flex flex-column ga-3">
                    <v-alert
                      density="compact"
                      variant="tonal"
                      color="info"
                      icon="mdi-chat-processing-outline"
                      rounded="lg"
                    >
                      {{
                        therapist.mensaje ||
                        "Disponible para acompanarte en tu proceso."
                      }}
                    </v-alert>


                    <div class="d-flex flex-column ga-2">
                      <!--
                        <v-btn
                        block
                        variant="text"
                        color="secondary"
                        prepend-icon="mdi-account-search"
                        to="/psicologos"

        class="pf-btn-ghost">
                        Ver perfil
                      </v-btn>
                      -->
                      <v-btn
                        block
                        color="secondary"
                        rounded="lg"
                        variant="tonal"
                        append-icon="mdi-arrow-right"
                        @click="openAppointmentDialog(therapist)"

        class="pf-btn-secondary">
                        Agendar cita
                      </v-btn>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-empty-state
            v-if="topTherapists.length === 0"
            headline="No hay horarios disponibles"
            text="Por ahora no encontramos psicólogos afines con bloques abiertos para agendar. Puedes revisar nuevamente más tarde."
            icon="mdi-calendar-clock-outline"
          ></v-empty-state>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <CitaDialog
    v-model="dialog"
    :terapeuta-id="selectedTherapist?.id"
    :terapeuta-nombre="selectedTherapist?.nombre"
  />
</template>

<script setup>
import { computed, ref } from "vue";
import CitaDialog from "@/components/Terapias/CitaDialog.vue";

const props = defineProps({
  terapeutas: {
    type: Array,
    default: () => [],
  },
});

const topTherapists = computed(() =>
  Array.isArray(props.terapeutas) ? props.terapeutas.slice(0, 5) : []
);
const dialog = ref(false);
const selectedTherapist = ref(null);

function modalidadesTexto(therapist) {
  if (
    Array.isArray(therapist.modalidades) &&
    therapist.modalidades.length > 0
  ) {
    return therapist.modalidades.join(", ");
  }

  if (therapist.modalidad) {
    return therapist.modalidad;
  }

  return "No especificada";
}

function avatarFallbackIcon(genero) {
  const normalized = (genero || "").toString().trim().toLowerCase();

  if (normalized === "femenino" || normalized === "mujer") {
    return "mdi-face-woman";
  }

  if (normalized === "masculino" || normalized === "hombre") {
    return "mdi-face-man";
  }

  return "mdi-account";
}

function openAppointmentDialog(therapist) {
  selectedTherapist.value = therapist;
  dialog.value = true;
}
</script>

<style scoped>
.therapist-media {
  background:
    radial-gradient(circle at 80% 12%, rgba(var(--v-theme-brand-accent), 0.36), transparent 36%),
    linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
}

.therapist-list-container {
  padding-block: 24px;
}

.therapist-card {
  overflow: hidden;
}

.therapist-media {
  min-height: 180px;
}

.therapist-description {
  line-height: 1.55;
}

@media (max-width: 600px) {
  .therapist-list-container {
    padding: 12px;
  }

  .therapist-avatar {
    width: 88px !important;
    height: 88px !important;
  }

  .therapist-card :deep(.v-col) {
    padding: 14px !important;
  }

  .therapist-media {
    min-height: 148px;
  }

  .therapist-card :deep(.v-alert) {
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .therapist-card :deep(.v-chip) {
    max-width: 100%;
  }
}
</style>

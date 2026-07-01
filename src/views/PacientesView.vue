<template>
  <LayoutDefault layout>
    <v-container class="patients-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Seguimiento operativo</p>
          <h1 class="text-h4 font-weight-bold">Pacientes</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Vista operativa de pacientes, perfil inicial y estado del proceso.
          </p>
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          class="align-self-start align-self-md-center"
          @click="loadPatients"
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
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 patients-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Pacientes</div>
                <div class="text-h4 font-weight-bold mt-1">{{ patients.length }}</div>
                <div class="text-caption text-medium-emphasis">Registrados</div>
              </div>
              <v-avatar color="secondary" variant="tonal" rounded="lg">
                <v-icon>mdi-account-group-outline</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 patients-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Perfiles listos</div>
                <div class="text-h4 font-weight-bold mt-1">{{ completedProfilesCount }}</div>
                <div class="text-caption text-medium-emphasis">Con entrevista suficiente</div>
              </div>
              <v-avatar color="success" variant="tonal" rounded="lg">
                <v-icon>mdi-account-check-outline</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" md="4" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1 patients-stat-card" elevation="2" variant="text">
            <div class="d-flex align-center justify-space-between ga-3">
              <div>
                <div class="text-body-2 text-medium-emphasis">Terapias activas</div>
                <div class="text-h4 font-weight-bold mt-1">{{ activeTherapiesCount }}</div>
                <div class="text-caption text-medium-emphasis">Procesos en curso</div>
              </div>
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-icon>mdi-heart-pulse</v-icon>
              </v-avatar>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
        <v-card-title class="d-flex align-center ga-2 text-h6 font-weight-bold px-0 pt-0">
          <v-icon color="secondary" size="small">mdi-account-group-outline</v-icon>
          Seguimiento operativo
        </v-card-title>
        <v-card-text>
          <v-divider class="mb-4"></v-divider>

          <v-text-field
            v-model="search"
            clearable
            prepend-inner-icon="mdi-magnify"
            label="Buscar paciente, correo, terapeuta o tema"
            class="mb-4"
            variant="outlined"
            density="comfortable"
          />

          <v-data-table
            :headers="headers"
            :items="filteredPatients"
            :items-per-page="10"
            :loading="loading"
            class="card-backgoundcustom patients-table"
          >
            <template #no-data>
              <v-empty-state
                headline="No hay pacientes para mostrar"
                text="Cuando existan terapias asignadas o pacientes registrados, aparecerán aquí."
                icon="mdi-account-search-outline"
              ></v-empty-state>
            </template>

            <template #item.profileStatus="{ item }">
              <v-chip
                :color="isProfileReady(item.profile) ? 'success' : 'warning'"
                size="small"
                variant="tonal"
              >
                {{ isProfileReady(item.profile) ? "Listo" : "En progreso" }}
              </v-chip>
            </template>

            <template #item.activeTherapy="{ item }">
              <div v-if="item.activeTherapy">
                <div>{{ item.activeTherapy.terapeutaNombre || "Terapeuta asignado" }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.activeTherapy.estado || "activo" }}
                </div>
              </div>
              <v-chip v-else size="small" color="secondary" variant="tonal">
                Sin terapia
              </v-chip>
            </template>

            <template #item.topics="{ item }">
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="topic in item.topics.slice(0, 3)"
                  :key="`${item.uid}-${topic}`"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ topic }}
                </v-chip>
                <span v-if="item.topics.length === 0" class="text-caption">
                  Sin temas
                </span>
              </div>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                icon
                variant="text"
                color="secondary"
                aria-label="Abrir detalle de terapia"
                :disabled="!item.activeTherapy?.id"
                @click="openTherapy(item)"
              >
                <v-icon>mdi-open-in-new</v-icon>
              </v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-container>
  </LayoutDefault>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { useAuthStore } from "@/store/auth";
import { useAppContextStore } from "@/store/appContext";
import { getTherapistByUserUid } from "@/services/psicologoService";
import { getPatientUsers, getProfileByUserId } from "@/services/userService";
import {
  getTherapiesByPatient,
  getTherapiesByTherapist,
} from "@/services/terapiaService";
import { isProfileReadyForRecommendations } from "@/services/matchingService";

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser } = storeToRefs(authStore);
const loading = ref(false);
const errorMessage = ref("");
const search = ref("");
const patients = ref([]);

const headers = [
  { title: "Paciente", value: "nombre" },
  { title: "Correo", value: "email" },
  { title: "Perfil", key: "profileStatus", sortable: false },
  { title: "Temas", key: "topics", sortable: false },
  { title: "Terapia activa", key: "activeTherapy", sortable: false },
  { title: "Citas", value: "appointmentsCount" },
  { title: "Detalle", key: "actions", sortable: false },
];

const filteredPatients = computed(() => {
  const q = search.value.toString().trim().toLowerCase();

  if (!q) {
    return patients.value;
  }

  return patients.value.filter((patient) =>
    [
      patient.nombre,
      patient.email,
      patient.activeTherapy?.terapeutaNombre,
      patient.topics.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
});

const completedProfilesCount = computed(
  () => patients.value.filter((patient) => isProfileReady(patient.profile)).length
);

const activeTherapiesCount = computed(
  () => patients.value.filter((patient) => patient.activeTherapy).length
);

watch(
  () => [currentUser.value?.uid, appContext.activeMode],
  () => {
    loadPatients();
  },
  { immediate: true }
);

async function loadPatients() {
  if (!currentUser.value?.uid) {
    patients.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    patients.value = appContext.activeMode === "admin"
      ? await loadAdminPatients()
      : await loadTherapistPatients(currentUser.value.uid);
  } catch (error) {
    console.error("Error loading patients:", error);
    errorMessage.value =
      error?.message || "No pudimos cargar la lista de pacientes.";
    patients.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadAdminPatients() {
  const users = await getPatientUsers();
  return Promise.all(users.map(buildPatientRow));
}

async function loadTherapistPatients(uid) {
  const therapist = await getTherapistByUserUid(uid);

  if (!therapist?.id) {
    return [];
  }

  const therapies = await getTherapiesByTherapist(therapist.id);
  const byPatient = new Map();

  therapies.forEach((therapy) => {
    const pacienteUid = therapy.pacienteUid || "";

    if (!pacienteUid) {
      return;
    }

    const current = byPatient.get(pacienteUid) || {
      uid: pacienteUid,
      nombre: therapy.pacienteNombre || "Paciente",
      email: therapy.pacienteEmail || "",
      profile: null,
      topics: [],
      therapies: [],
      activeTherapy: null,
      appointmentsCount: 0,
    };

    current.therapies.push(therapy);
    current.appointmentsCount += Array.isArray(therapy.citas)
      ? therapy.citas.length
      : 0;

    if (
      !current.activeTherapy &&
      (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) {
      current.activeTherapy = therapy;
    }

    byPatient.set(pacienteUid, current);
  });

  return Array.from(byPatient.values());
}

async function buildPatientRow(user) {
  const uid = user.id || user.uid;
  const [profile, therapies] = await Promise.all([
    getProfileByUserId(uid),
    getTherapiesByPatient(uid),
  ]);
  const activeTherapy =
    therapies.find(
      (therapy) =>
        (therapy.estado || "").toString().trim().toLowerCase() === "activo"
    ) || null;

  return {
    uid,
    nombre: user.nombre || user.displayName || user.email || "Paciente",
    email: user.email || "",
    profile,
    topics: Array.isArray(profile?.temas) ? profile.temas : [],
    therapies,
    activeTherapy,
    appointmentsCount: therapies.reduce(
      (count, therapy) =>
        count + (Array.isArray(therapy.citas) ? therapy.citas.length : 0),
      0
    ),
  };
}

function openTherapy(item) {
  if (!item.activeTherapy?.id) {
    return;
  }

  router.push({
    path: "/terapiadetail",
    query: { id: item.activeTherapy.id },
  });
}

function isProfileReady(profile) {
  return isProfileReadyForRecommendations(profile);
}
</script>

<style scoped>
.patients-view {
  max-width: 1180px;
}

.patients-stat-card {
  min-height: 124px;
}

.patients-table {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .patients-view {
    padding-inline: 16px;
  }

  .patients-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

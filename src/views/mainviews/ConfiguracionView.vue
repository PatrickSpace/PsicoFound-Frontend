<template>
  <LayoutDefault layout>
    <v-container class="settings-view">
      <div class="d-flex flex-column flex-md-row justify-space-between align-md-center ga-4 mb-6">
        <div>
          <p class="text-overline text-secondary mb-1">Cuenta y preferencias</p>
          <h1 class="text-h4 font-weight-bold">Configuración</h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Administra tu cuenta, preferencias y accesos dentro de PsicoFound.
          </p>
        </div>
        <v-chip
          v-if="activeMode"
          class="align-self-start"
          color="secondary"
          variant="tonal"
          :prepend-icon="activeMode.icon"
        >
          Vista {{ activeMode.label }}
        </v-chip>
      </div>

      <v-row align="stretch">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold d-flex align-center justify-space-between ga-3 px-0 pt-0">
              <span class="d-flex align-center ga-2">
                <v-icon color="secondary" size="small">mdi-account-circle-outline</v-icon>
                Perfil de usuario
              </span>
              <v-btn
                v-if="!isEditingProfile"
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                aria-label="Editar perfil de usuario"
                @click="startProfileEdit"
              />
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <v-alert
                v-if="profileError"
                class="mb-4"
                color="error"
                variant="tonal"
                icon="mdi-alert-outline"
              >
                {{ profileError }}
              </v-alert>
              <template v-if="!isEditingProfile">
                <v-list class="bg-transparent" density="compact">
                  <v-list-item
                    v-for="item in patientProfileDetails"
                    :key="item.title"
                    :title="item.title"
                    :subtitle="item.subtitle"
                  />
                </v-list>
              </template>
              <template v-else>
                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="profileForm.nombre"
                      label="Nombre"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      :model-value="currentUser?.email || ''"
                      label="Correo"
                      readonly
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.fechaNacimiento"
                      label="Fecha de nacimiento"
                      type="date"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.telefono"
                      label="Teléfono"
                      placeholder="Opcional"
                      variant="outlined"
                      density="comfortable"
                    />
                  </v-col>
                </v-row>
                <div class="d-flex justify-end ga-2">
                  <v-btn
                    color="secondary"
                    variant="text"
                    :disabled="savingProfile"
                    @click="cancelProfileEdit"
                  >
                    Cancelar
                  </v-btn>
                  <v-btn
                    color="secondary"
                    variant="tonal"
                    prepend-icon="mdi-content-save-outline"
                    :loading="savingProfile"
                    :disabled="!canSaveProfile"
                    @click="saveProfile"
                  >
                    Guardar cambios
                  </v-btn>
                </div>
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-swap-horizontal</v-icon>
              Vista y accesos
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <v-alert
                v-if="!appContext.canSwitchModes"
                color="info"
                variant="tonal"
                icon="mdi-information-outline"
              >
                Tu cuenta tiene una sola vista activa por ahora.
              </v-alert>
              <v-btn-toggle
                v-else
                :model-value="appContext.activeMode"
                class="mt-1 flex-wrap"
                color="secondary"
                mandatory
                variant="tonal"
                @update:model-value="switchMode"
              >
                <v-btn
                  v-for="mode in appContext.availableModes"
                  :key="mode.value"
                  :value="mode.value"
                >
                  <v-icon start>{{ mode.icon }}</v-icon>
                  {{ mode.label }}
                </v-btn>
              </v-btn-toggle>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-account-tie-outline</v-icon>
              Perfil profesional
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <template v-if="appContext.hasPsychologistAccess">
                <v-list class="bg-transparent" density="compact">
                  <v-list-item title="Nombre profesional" :subtitle="appContext.therapistProfile?.nombre || 'No definido'" />
                  <v-list-item title="Estado" :subtitle="appContext.therapistProfile?.activo === false ? 'Inactivo' : 'Activo'" />
                </v-list>
              </template>
              <template v-else>
                <v-alert
                  v-if="psychologistRequest"
                  class="mb-4"
                  :color="requestStatusColor"
                  variant="tonal"
                  :icon="requestStatusIcon"
                >
                  {{ requestStatusText }}
                </v-alert>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Puedes solicitar habilitar un perfil profesional para atender pacientes desde PsicoFound.
                </p>
                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-account-plus-outline"
                  :loading="loadingPsychologistRequest"
                  :disabled="requestBlocksNewSubmission"
                  @click="showPsychologistRequest"
                >
                  Registrarse como psicólogo
                </v-btn>
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-theme-light-dark</v-icon>
              Apariencia
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Elige cómo quieres ver PsicoFound en este dispositivo.
              </p>
              <v-btn-toggle
                v-model="appTheme"
                color="secondary"
                mandatory
                rounded="lg"
                variant="tonal"
              >
                <v-btn value="dark">
                  <v-icon start>mdi-weather-night</v-icon>
                  Oscuro
                </v-btn>
                <v-btn value="light">
                  <v-icon start>mdi-white-balance-sunny</v-icon>
                  Claro
                </v-btn>
              </v-btn-toggle>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
              <v-icon color="secondary" size="small">mdi-shield-lock-outline</v-icon>
              Seguridad
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Mantén el control de tu sesión y privacidad. La edición avanzada de datos estará disponible en una siguiente iteración.
              </p>
              <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-logout"
                :loading="loggingOut"
                :disabled="loggingOut"
                @click="logout"
              >
                Cerrar sesión
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <v-dialog v-model="psychologistRequestDialog" max-width="760">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0">
            <v-icon color="secondary" size="small">mdi-account-tie-outline</v-icon>
            Solicitud profesional
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4"></v-divider>
            <v-alert
              v-if="psychologistRequestError"
              class="mb-4"
              color="error"
              variant="tonal"
              icon="mdi-alert-outline"
            >
              {{ psychologistRequestError }}
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="psychologistRequestForm.professionalName"
                  label="Nombre profesional"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="psychologistRequestForm.licenseNumber"
                  label="Número de colegiatura"
                  placeholder="Opcional para revisión"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="psychologistRequestForm.specialties"
                  label="Especialidades"
                  :items="specialtyOptions"
                  chips
                  multiple
                  clearable
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="psychologistRequestForm.approaches"
                  label="Enfoques"
                  :items="approachOptions"
                  chips
                  multiple
                  clearable
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="psychologistRequestForm.modalities"
                  label="Modalidades"
                  :items="modalityOptions"
                  chips
                  multiple
                  clearable
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="psychologistRequestForm.gender"
                  label="Género"
                  :items="genderOptions"
                  clearable
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="psychologistRequestForm.professionalSummary"
                  label="Resumen profesional"
                  rows="3"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="psychologistRequestForm.motivation"
                  label="Mensaje para revisión"
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
              variant="text"
              :disabled="savingPsychologistRequest"
              @click="psychologistRequestDialog = false"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-send-outline"
              :loading="savingPsychologistRequest"
              :disabled="!canSubmitPsychologistRequest"
              @click="submitPsychologistRequest"
            >
              Enviar solicitud
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
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";
import { updateUserProfile } from "@/services/userService";
import {
  createPsychologistRequest,
  getLatestPsychologistRequestByUser,
} from "@/services/psychologistRequestService";
import { useAppTheme } from "@/composables/useAppTheme";

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser, userName } = storeToRefs(authStore);
const { appTheme } = useAppTheme();
const savingProfile = ref(false);
const profileError = ref("");
const isEditingProfile = ref(false);
const psychologistRequestDialog = ref(false);
const savingPsychologistRequest = ref(false);
const loadingPsychologistRequest = ref(false);
const loggingOut = ref(false);
const psychologistRequestError = ref("");
const psychologistRequest = ref(null);

const profileForm = reactive({
  nombre: "",
  fechaNacimiento: "",
  telefono: "",
});

const psychologistRequestForm = reactive({
  professionalName: "",
  licenseNumber: "",
  specialties: [],
  approaches: [],
  modalities: ["Remoto"],
  gender: "",
  professionalSummary: "",
  motivation: "",
});

const specialtyOptions = [
  "Ansiedad",
  "Depresión",
  "Trauma",
  "Autoestima",
  "Pareja",
  "Familia",
  "Estrés laboral",
];
const approachOptions = [
  "Cognitivo-Conductual",
  "Humanista",
  "Integrativo",
  "Psicoanálisis",
  "Terapia Familiar",
];
const modalityOptions = ["Remoto", "Presencial", "Híbrido"];
const genderOptions = ["femenino", "masculino", "no especificado"];

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);

const canSaveProfile = computed(
  () => Boolean(currentUser.value?.uid) && profileForm.nombre.trim().length > 0
);

const canSubmitPsychologistRequest = computed(
  () =>
    Boolean(currentUser.value?.uid) &&
    psychologistRequestForm.professionalName.trim().length > 0 &&
    psychologistRequestForm.professionalSummary.trim().length > 0 &&
    psychologistRequestForm.specialties.length > 0 &&
    psychologistRequestForm.modalities.length > 0
);

const requestStatus = computed(() =>
  (psychologistRequest.value?.status || "").toString().trim().toLowerCase()
);

const requestBlocksNewSubmission = computed(() =>
  ["pending", "approved"].includes(requestStatus.value)
);

const requestStatusColor = computed(() => {
  if (requestStatus.value === "approved") return "success";
  if (requestStatus.value === "rejected") return "warning";
  return "info";
});

const requestStatusIcon = computed(() => {
  if (requestStatus.value === "approved") return "mdi-check-circle-outline";
  if (requestStatus.value === "rejected") return "mdi-alert-circle-outline";
  return "mdi-clock-outline";
});

const requestStatusText = computed(() => {
  if (requestStatus.value === "approved") {
    return "Tu solicitud profesional fue aprobada. Ya puedes alternar a la vista de psicólogo.";
  }

  if (requestStatus.value === "rejected") {
    return psychologistRequest.value?.rejectionReason
      ? `Tu solicitud fue rechazada: ${psychologistRequest.value.rejectionReason}`
      : "Tu solicitud fue rechazada. Puedes enviar una nueva con información actualizada.";
  }

  return "Tu solicitud profesional está pendiente de revisión por un administrador.";
});

const patientProfileDetails = computed(() => [
  {
    title: "Nombre",
    subtitle: readableProfileValue(profileForm.nombre),
  },
  {
    title: "Correo",
    subtitle: currentUser.value?.email || "No disponible",
  },
  {
    title: "Fecha de nacimiento",
    subtitle: readableProfileValue(profileForm.fechaNacimiento),
  },
  {
    title: "Teléfono",
    subtitle: readableProfileValue(profileForm.telefono),
  },
]);

watch(
  () => appContext.userProfile,
  (profile) => {
    resetProfileForm(profile);
  },
  { immediate: true }
);

watch(
  () => currentUser.value?.uid,
  () => {
    loadPsychologistRequest();
  },
  { immediate: true }
);

function switchMode(mode) {
  appContext.setActiveMode(mode);
}

function showPsychologistRequest() {
  psychologistRequestError.value = "";
  resetPsychologistRequestForm();
  psychologistRequestDialog.value = true;
}

function readableProfileValue(value) {
  return value?.toString().trim() || "No definido";
}

function resetProfileForm(profile = appContext.userProfile) {
  profileForm.nombre =
    profile?.nombre ||
    currentUser.value?.displayName ||
    userName.value ||
    "";
  profileForm.fechaNacimiento = profile?.fechaNacimiento || "";
  profileForm.telefono = profile?.telefono || "";
}

function resetPsychologistRequestForm() {
  psychologistRequestForm.professionalName =
    appContext.userProfile?.nombre ||
    currentUser.value?.displayName ||
    userName.value ||
    "";
  psychologistRequestForm.licenseNumber = "";
  psychologistRequestForm.specialties = [];
  psychologistRequestForm.approaches = [];
  psychologistRequestForm.modalities = ["Remoto"];
  psychologistRequestForm.gender = "";
  psychologistRequestForm.professionalSummary = "";
  psychologistRequestForm.motivation = "";
}

async function loadPsychologistRequest() {
  const uid = currentUser.value?.uid;

  if (!uid) {
    psychologistRequest.value = null;
    return;
  }

  loadingPsychologistRequest.value = true;

  try {
    const latestRequest = await getLatestPsychologistRequestByUser(uid);
    psychologistRequest.value = latestRequest;

    if (
      latestRequest?.status?.toString().trim().toLowerCase() === "approved" &&
      !appContext.hasPsychologistAccess
    ) {
      await appContext.loadForUser(uid, { force: true });
    }
  } catch (error) {
    console.error("Error loading psychologist request:", error);
    psychologistRequest.value = null;
  } finally {
    loadingPsychologistRequest.value = false;
  }
}

async function submitPsychologistRequest() {
  if (!canSubmitPsychologistRequest.value || savingPsychologistRequest.value) {
    return;
  }

  savingPsychologistRequest.value = true;
  psychologistRequestError.value = "";

  try {
    psychologistRequest.value = await createPsychologistRequest({
      userUid: currentUser.value.uid,
      userName: appContext.userProfile?.nombre || userName.value || "",
      userEmail: currentUser.value?.email || "",
      professionalName: psychologistRequestForm.professionalName.trim(),
      licenseNumber: psychologistRequestForm.licenseNumber.trim(),
      professionalSummary: psychologistRequestForm.professionalSummary.trim(),
      motivation: psychologistRequestForm.motivation.trim(),
      specialties: psychologistRequestForm.specialties,
      approaches: psychologistRequestForm.approaches,
      modalities: psychologistRequestForm.modalities,
      gender: psychologistRequestForm.gender,
    });
    psychologistRequestDialog.value = false;

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Solicitud enviada",
          message: "Un administrador podrá revisar tu solicitud profesional.",
        },
      })
    );
  } catch (error) {
    console.error("Error creating psychologist request:", error);
    psychologistRequestError.value =
      error?.message || "No pudimos enviar tu solicitud.";
  } finally {
    savingPsychologistRequest.value = false;
  }
}

function startProfileEdit() {
  profileError.value = "";
  resetProfileForm();
  isEditingProfile.value = true;
}

function cancelProfileEdit() {
  profileError.value = "";
  resetProfileForm();
  isEditingProfile.value = false;
}

async function saveProfile() {
  if (!canSaveProfile.value || savingProfile.value) {
    return;
  }

  savingProfile.value = true;
  profileError.value = "";

  try {
    await updateUserProfile(currentUser.value.uid, {
      nombre: profileForm.nombre.trim(),
      fechaNacimiento: profileForm.fechaNacimiento,
      telefono: profileForm.telefono.trim(),
    });
    await appContext.loadForUser(currentUser.value.uid, { force: true });
    isEditingProfile.value = false;

    window.dispatchEvent(
      new CustomEvent("ui-success", {
        detail: {
          title: "Perfil actualizado",
          message: "Tus datos personales fueron guardados.",
        },
      })
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    profileError.value =
      error?.message || "No pudimos guardar tus datos personales.";
  } finally {
    savingProfile.value = false;
  }
}

async function logout() {
  if (loggingOut.value) {
    return;
  }

  loggingOut.value = true;

  try {
    await signOut(auth);
    await router.push("/login");
  } catch (error) {
    console.error("Error signing out:", error);
    window.dispatchEvent(
      new CustomEvent("api-error", {
        detail: {
          message: error?.message || "No se pudo cerrar la sesión.",
        },
      })
    );
  } finally {
    loggingOut.value = false;
  }
}
</script>

<style scoped>
.settings-view {
  max-width: 1180px;
}

@media (max-width: 600px) {
  .settings-view {
    padding-inline: 16px;
  }

  .settings-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

<template>
  <LayoutDefault layout>
    <v-container>
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4">
        <div>
          <h1 class="text-h4">Configuración</h1>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
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

      <v-divider class="my-5 mx-auto"></v-divider>

      <v-row align="stretch">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="pa-4 card-backgoundcustom flex-grow-1" elevation="2" variant="text">
            <v-card-title class="text-h5 d-flex align-center justify-space-between ga-3">
              <span class="d-flex align-center ga-2">
                <v-icon size="small">mdi-account-circle-outline</v-icon>
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
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      :model-value="currentUser?.email || ''"
                      label="Correo"
                      readonly
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.fechaNacimiento"
                      label="Fecha de nacimiento"
                      type="date"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="profileForm.telefono"
                      label="Teléfono"
                      placeholder="Opcional"
                      variant="outlined"
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
                    variant="flat"
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
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-swap-horizontal</v-icon>
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
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-account-tie-outline</v-icon>
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
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Puedes solicitar habilitar un perfil profesional para atender pacientes desde PsicoFound.
                </p>
                <v-btn
                  color="secondary"
                  variant="flat"
                  prepend-icon="mdi-account-plus-outline"
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
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-theme-light-dark</v-icon>
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
            <v-card-title class="text-h5">
              <v-icon size="small">mdi-shield-lock-outline</v-icon>
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
                @click="logout"
              >
                Cerrar sesión
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
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
import { useAppTheme } from "@/composables/useAppTheme";

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser, userName } = storeToRefs(authStore);
const { appTheme } = useAppTheme();
const savingProfile = ref(false);
const profileError = ref("");
const isEditingProfile = ref(false);

const profileForm = reactive({
  nombre: "",
  fechaNacimiento: "",
  telefono: "",
});

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);

const canSaveProfile = computed(
  () => Boolean(currentUser.value?.uid) && profileForm.nombre.trim().length > 0
);

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

function switchMode(mode) {
  appContext.setActiveMode(mode);
}

function showPsychologistRequest() {
  window.dispatchEvent(
    new CustomEvent("ui-success", {
      detail: {
        title: "Solicitud registrada",
        message: "Pronto configuraremos el flujo para registrar psicólogos.",
      },
    })
  );
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
  await signOut(auth);
  router.push("/login");
}
</script>

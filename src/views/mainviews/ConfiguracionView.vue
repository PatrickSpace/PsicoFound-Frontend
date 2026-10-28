<template>
  <LayoutDefault layout>
    <v-container class="settings-view pa-0">
      <div class="page-header">
        <div class="page-header__row">
          <div class="page-header__copy">
            <p class="page-header__eyebrow text-overline text-secondary mb-1">
              Cuenta y preferencias
            </p>
            <h1 class="text-h4 font-weight-bold">Configuración</h1>
            <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
              Administra tu cuenta, preferencias y accesos dentro de Lurems.
            </p>
          </div>
          <div class="page-header__actions">
            <v-chip
              v-if="activeMode"
              color="secondary"
              variant="tonal"
              :prepend-icon="activeMode.icon"
            >
              Vista {{ activeMode.label }}
            </v-chip>
          </div>
        </div>
        <v-divider class="page-header-divider" />
      </div>

      <v-row align="stretch">
        <v-col v-if="appContext.hasPsychologistAccess && appContext.activeMode === 'psychologist'" cols="12" md="6" class="d-flex">
          <PsychologistRateCard :therapist-id="appContext.therapistProfile.id" />
        </v-col>
        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center justify-space-between ga-3 px-0 pt-0"
            >
              <span class="d-flex align-center ga-2">
                <v-icon color="secondary" size="small"
                  >mdi-account-circle-outline</v-icon
                >
                Perfil de usuario
              </span>
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                aria-label="Editar perfil de usuario"
                @click="startProfileEdit"
                class="pf-btn-icon"
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
              <v-list class="bg-transparent" density="compact">
                <v-list-item
                  v-for="item in patientProfileDetails"
                  :key="item.title"
                  :title="item.title"
                  :subtitle="item.subtitle"
                />
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
            >
              <v-icon color="secondary" size="small"
                >mdi-swap-horizontal</v-icon
              >
              Vista y accesos
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <v-select
                :model-value="appContext.activeMode"
                :items="appContext.availableModes"
                item-title="label"
                item-value="value"
                label="Vista activa"
                variant="outlined"
                density="comfortable"
                color="secondary"
                :disabled="!appContext.canSwitchModes"
                persistent-hint
                :hint="
                  appContext.canSwitchModes
                    ? 'Selecciona cómo quieres usar Lurems en esta sesión.'
                    : 'Tu cuenta tiene una sola vista activa por ahora.'
                "
                @update:model-value="switchMode"
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center ga-2">
                    <v-icon size="small">{{ item.raw.icon }}</v-icon>
                    <span>{{ item.raw.label }}</span>
                  </div>
                </template>
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :prepend-icon="item.raw.icon"
                    :title="item.raw.label"
                  />
                </template>
              </v-select>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
            >
              <v-icon color="secondary" size="small"
                >mdi-account-tie-outline</v-icon
              >
              Perfil profesional
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <template v-if="appContext.hasPsychologistAccess">
                <v-list class="bg-transparent" density="compact">
                  <v-list-item
                    title="Nombre profesional"
                    :subtitle="
                      appContext.therapistProfile?.nombre || 'No definido'
                    "
                  />
                  <v-list-item
                    title="Estado"
                    :subtitle="
                      appContext.therapistProfile?.activo === false
                        ? 'Inactivo'
                        : 'Activo'
                    "
                  />
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
                  Puedes solicitar habilitar un perfil profesional para atender
                  pacientes desde Lurems.
                </p>
                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-account-plus-outline"
                  :loading="loadingPsychologistRequest"
                  :disabled="requestBlocksNewSubmission"
                  @click="showPsychologistRequest"
                  class="pf-btn-secondary"
                >
                  Registrarse como psicólogo
                </v-btn>
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
            >
              <v-icon color="secondary" size="small"
                >mdi-shield-lock-outline</v-icon
              >
              Seguridad
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Mantén actualizado el acceso a tu cuenta y revisa el estado de
                verificación de tu correo.
              </p>
              <div class="d-flex flex-wrap align-center ga-2 mb-4">
                <v-chip
                  :color="currentUser?.emailVerified ? 'success' : 'warning'"
                  variant="tonal"
                  size="small"
                  :prepend-icon="
                    currentUser?.emailVerified
                      ? 'mdi-email-check-outline'
                      : 'mdi-email-alert-outline'
                  "
                >
                  {{
                    currentUser?.emailVerified
                      ? "Correo verificado"
                      : "Correo por verificar"
                  }}
                </v-chip>
                <v-btn
                  v-if="!currentUser?.emailVerified"
                  size="small"
                  variant="text"
                  color="secondary"
                  :loading="sendingVerification"
                  @click="resendVerification"
                  class="pf-btn-ghost"
                >
                  Reenviar verificación
                </v-btn>
              </div>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-email-edit-outline"
                  @click="openEmailChange"
                  class="pf-btn-secondary"
                >
                  Cambiar correo
                </v-btn>
                <v-btn class="pf-btn-secondary" :loading="changingEmail" @click="refreshConfirmedEmail">Ya confirmé mi nuevo correo</v-btn>
              <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-logout"
                :loading="loggingOut"
                :disabled="loggingOut"
                @click="logout"
                class="pf-btn-destructive"
              >
                Cerrar sesión
              </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
            >
              <v-icon color="secondary" size="small"
                >mdi-database-lock-outline</v-icon
              >
              Mis datos y cuenta
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Descarga una copia de tus datos o suspende tu cuenta. Tu información se conserva.
              </p>
              <v-alert
                v-if="accountMessage"
                class="mb-4"
                :color="accountMessageColor"
                variant="tonal"
                icon="mdi-information-outline"
              >
                {{ accountMessage }}
              </v-alert>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-download-outline"
                  :loading="exportingData"
                  @click="downloadAccountData"
                  class="pf-btn-secondary"
                >
                  Descargar mis datos
                </v-btn>
                <v-btn
                  color="error"
                  variant="text"
                  prepend-icon="mdi-account-pause-outline"
                  @click="openSuspension"
                  class="pf-btn-destructive"
                >
                  Suspender cuenta
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" class="d-flex">
          <v-card
            class="pa-4 card-backgoundcustom flex-grow-1"
            elevation="2"
            variant="text"
          >
            <v-card-title
              class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
            >
              <v-icon color="secondary" size="small"
                >mdi-file-document-check-outline</v-icon
              >
              Documentos legales
            </v-card-title>
            <v-card-text>
              <v-divider class="mb-4"></v-divider>
              <template v-if="hasPublishedLegalDocuments">
                <p class="text-body-2 text-medium-emphasis mb-3">
                  Versión vigente: {{ legalConfig.version }}
                </p>
                <div class="d-flex flex-wrap ga-2">
                  <v-btn
                    :href="legalConfig.termsUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="secondary"
                    variant="text"
                    append-icon="mdi-open-in-new"
                    class="pf-btn-ghost"
                  >
                    Términos de uso
                  </v-btn>
                  <v-btn
                    :href="legalConfig.privacyUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="secondary"
                    variant="text"
                    append-icon="mdi-open-in-new"
                    class="pf-btn-ghost"
                  >
                    Política de privacidad
                  </v-btn>
                </div>
              </template>
              <v-alert
                v-else
                color="warning"
                variant="tonal"
                icon="mdi-file-alert-outline"
              >
                Los enlaces y la versión legal todavía no están configurados.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog
        v-model="isEditingProfile"
        max-width="680"
        class="bg-transparent"
      >
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title
            class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
          >
            <v-icon color="secondary" size="small"
              >mdi-account-circle-outline</v-icon
            >
            Editar perfil
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
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="profileForm.pais"
                  label="País de residencia"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <p class="text-body-2">Todos los horarios se muestran en hora de Lima, Perú (UTC−5). Tu país de residencia no modifica la agenda.</p>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="text"
              :disabled="savingProfile"
              @click="cancelProfileEdit"
              class="pf-btn-ghost"
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
              class="pf-btn-secondary"
            >
              Guardar cambios
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="emailDialog" max-width="560">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Cambiar correo
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <v-alert
              v-if="emailError"
              class="mb-4"
              color="error"
              variant="tonal"
            >
              {{ emailError }}
            </v-alert>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Por seguridad debes volver a autenticarte. El cambio se aplicará
              después de verificar el nuevo correo.
            </p>
            <v-text-field
              v-model="emailForm.email"
              label="Nuevo correo"
              type="email"
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-if="usesPasswordProvider"
              v-model="emailForm.password"
              label="Contraseña actual"
              type="password"
              variant="outlined"
              density="comfortable"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="emailDialog = false">Cancelar</v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              :loading="changingEmail"
              :disabled="!canChangeEmail"
              @click="requestEmailChange"
            >
              Verificar y cambiar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="suspensionDialog" max-width="680">
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title class="text-h6 font-weight-bold px-0 pt-0">
            Suspender cuenta
          </v-card-title>
          <v-card-text>
            <v-divider class="mb-4" />
            <v-alert v-if="appContext.isAdmin" type="info" variant="tonal" class="mb-4">
              Antes de suspender tu cuenta, transfiere tus responsabilidades y solicita que retiren tu rol de administrador.
            </v-alert>
            <v-alert color="warning" variant="tonal" class="mb-4">
              La suspensión bloquea el uso de tu cuenta y conserva toda tu información.
              Si eres psicólogo, tu perfil dejará de aceptar nuevas reservas.
              Las citas y pagos existentes no se cancelan: coordina los pendientes antes de continuar.
            </v-alert>
            <p class="text-body-2 mb-4">
              Podrás reactivar tu cuenta al iniciar sesión. Escribe
              <strong>SUSPENDER MI CUENTA</strong> para continuar.
            </p>
            <v-text-field
              v-model="suspensionConfirmation"
              label="Confirmación"
              variant="outlined"
              density="comfortable"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="suspensionDialog = false">
              Cancelar
            </v-btn>
            <v-btn
              color="error"
              variant="tonal"
              :loading="suspendingAccount"
              :disabled="appContext.isAdmin || suspensionConfirmation !== 'SUSPENDER MI CUENTA'"
              @click="submitSuspension"
            >
              Suspender cuenta
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog
        v-model="psychologistRequestDialog"
        max-width="760"
        class="bg-transparent"
      >
        <v-card class="pa-4 card-backgoundcustom" elevation="2" variant="text">
          <v-card-title
            class="text-h6 font-weight-bold d-flex align-center ga-2 px-0 pt-0"
          >
            <v-icon color="secondary" size="small"
              >mdi-account-tie-outline</v-icon
            >
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
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="psychologistRequestForm.country"
                  label="País o jurisdicción profesional"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="psychologistRequestForm.phone"
                  label="Teléfono"
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
              class="pf-btn-ghost"
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
              class="pf-btn-secondary"
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
import { sendVerificationEmail } from "@/services/emailVerificationService";
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { useRouter } from "vue-router";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import PsychologistRateCard from "@/components/Payments/PsychologistRateCard.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import { useAuthStore } from "@/store/auth";
import {
  syncOwnAuthEmail,
  exportOwnData,
  suspendOwnAccount,
  updateOwnProfile,
} from "@/services/accountService";
import {
  hasPublishedLegalDocuments,
  legalConfig,
} from "@/config/legal";
import {
  createPsychologistRequest,
  getLatestPsychologistRequestByUser,
} from "@/services/psychologistRequestService";
import {
  APPROACH_OPTIONS,
  GENDER_OPTIONS,
  MODALITY_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/constants/professionalProfile";

const router = useRouter();
const authStore = useAuthStore();
const appContext = useAppContextStore();
const { currentUser, userName } = storeToRefs(authStore);
const savingProfile = ref(false);
const profileError = ref("");
const isEditingProfile = ref(false);
const psychologistRequestDialog = ref(false);
const savingPsychologistRequest = ref(false);
const loadingPsychologistRequest = ref(false);
const loggingOut = ref(false);
const psychologistRequestError = ref("");
const psychologistRequest = ref(null);
const sendingVerification = ref(false);
const emailDialog = ref(false);
const changingEmail = ref(false);
const emailError = ref("");
const exportingData = ref(false);
const suspensionDialog = ref(false);
const suspendingAccount = ref(false);
const suspensionConfirmation = ref("");
const accountMessage = ref("");
const accountMessageColor = ref("info");

const profileForm = reactive({
  nombre: "",
  fechaNacimiento: "",
  telefono: "",
  pais: "",
  zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Lima",
});

const emailForm = reactive({
  email: "",
  password: "",
});

const psychologistRequestForm = reactive({
  professionalName: "",
  licenseNumber: "",
  country: "Perú",
  phone: "",
  specialties: [],
  approaches: [],
  modalities: ["Remoto"],
  gender: null,
  professionalSummary: "",
  motivation: "",
});

const specialtyOptions = SPECIALTY_OPTIONS;
const approachOptions = APPROACH_OPTIONS;
const modalityOptions = MODALITY_OPTIONS;
const genderOptions = GENDER_OPTIONS;

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);

const canSaveProfile = computed(
  () =>
    Boolean(currentUser.value?.uid) &&
    profileForm.nombre.trim().length > 0 &&
    profileForm.fechaNacimiento.length > 0 &&
    profileForm.pais.trim().length > 0 &&
    profileForm.zonaHoraria.trim().length > 0
);

const usesPasswordProvider = computed(() =>
  currentUser.value?.providerData?.some(
    (provider) => provider.providerId === "password"
  )
);

const canChangeEmail = computed(() => {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email.trim());
  return (
    validEmail &&
    emailForm.email.trim() !== currentUser.value?.email &&
    (!usesPasswordProvider.value || emailForm.password.length > 0)
  );
});


const canSubmitPsychologistRequest = computed(
  () =>
    Boolean(currentUser.value?.uid) &&
    psychologistRequestForm.professionalName.trim().length > 0 &&
    psychologistRequestForm.licenseNumber.trim().length > 0 &&
    psychologistRequestForm.country.trim().length > 0 &&
    psychologistRequestForm.professionalSummary.trim().length > 0 &&
    psychologistRequestForm.specialties.length > 0 &&
    psychologistRequestForm.approaches.length > 0 &&
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
  {
    title: "País",
    subtitle: readableProfileValue(profileForm.pais),
  },
  {
    title: "Horario de la agenda",
    subtitle: "Hora de Lima, Perú (UTC−5)",
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
    profile?.nombre || currentUser.value?.displayName || userName.value || "";
  profileForm.fechaNacimiento = profile?.fechaNacimiento || "";
  profileForm.telefono = profile?.telefono || "";
  profileForm.pais = profile?.pais || "";
  profileForm.zonaHoraria =
    profile?.zonaHoraria ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "America/Lima";
}

function resetPsychologistRequestForm() {
  psychologistRequestForm.professionalName =
    appContext.userProfile?.nombre ||
    currentUser.value?.displayName ||
    userName.value ||
    "";
  psychologistRequestForm.licenseNumber = "";
  psychologistRequestForm.country = "Perú";
  psychologistRequestForm.phone = appContext.userProfile?.telefono || "";
  psychologistRequestForm.specialties = [];
  psychologistRequestForm.approaches = [];
  psychologistRequestForm.modalities = ["Remoto"];
  psychologistRequestForm.gender = null;
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
      country: psychologistRequestForm.country.trim(),
      phone: psychologistRequestForm.phone.trim(),
      professionalSummary: psychologistRequestForm.professionalSummary.trim(),
      motivation: psychologistRequestForm.motivation.trim(),
      specialties: psychologistRequestForm.specialties,
      approaches: psychologistRequestForm.approaches,
      modalities: psychologistRequestForm.modalities,
      gender: psychologistRequestForm.gender || "",
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
    await updateOwnProfile({
      nombre: profileForm.nombre.trim(),
      fechaNacimiento: profileForm.fechaNacimiento,
      telefono: profileForm.telefono.trim(),
      pais: profileForm.pais.trim(),
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

async function resendVerification() {
  if (!currentUser.value || sendingVerification.value) return;
  sendingVerification.value = true;
  try {
    await sendVerificationEmail(currentUser.value);
    showSuccess(
      "Verificación enviada",
      "Revisa tu bandeja de entrada y la carpeta de correo no deseado."
    );
  } catch (error) {
    showAccountError(error, "No pudimos enviar la verificación.");
  } finally {
    sendingVerification.value = false;
  }
}

function openEmailChange() {
  emailForm.email = "";
  emailForm.password = "";
  emailError.value = "";
  emailDialog.value = true;
}

async function requestEmailChange() {
  if (!canChangeEmail.value || changingEmail.value || !currentUser.value) return;
  changingEmail.value = true;
  emailError.value = "";
  try {
    if (usesPasswordProvider.value) {
      const credential = EmailAuthProvider.credential(
        currentUser.value.email,
        emailForm.password
      );
      await reauthenticateWithCredential(currentUser.value, credential);
    } else {
      await reauthenticateWithPopup(currentUser.value, new GoogleAuthProvider());
    }
    await verifyBeforeUpdateEmail(currentUser.value, emailForm.email.trim());
    emailDialog.value = false;
    showSuccess(
      "Verifica tu nuevo correo",
      "El cambio se aplicará cuando abras el enlace de verificación enviado."
    );
  } catch (error) {
    emailError.value = authErrorMessage(error);
  } finally {
    changingEmail.value = false;
  }
}

async function refreshConfirmedEmail() {
  const user = currentUser.value;
  if (!user || changingEmail.value) return;
  changingEmail.value = true;
  try {
    await user.reload();
    await user.getIdToken(true);
    if (auth.currentUser?.uid !== user.uid) return;
    const result = await syncOwnAuthEmail();
    if (auth.currentUser?.uid !== user.uid) return;
    await appContext.loadForUser(user.uid, { force: true });
    accountMessageColor.value = "success";
    accountMessage.value = `Correo verificado y actualizado: ${result.email}`;
  } catch (error) {
    if (auth.currentUser?.uid === user.uid) showAccountError(error, "Vuelve a iniciar sesión con tu nuevo correo para actualizar la cuenta.");
  } finally { changingEmail.value = false; }
}

async function downloadAccountData() {
  if (exportingData.value) return;
  exportingData.value = true;
  accountMessage.value = "";
  try {
    const payload = await exportOwnData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lurems-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    accountMessageColor.value = "success";
    accountMessage.value =
      "La copia se descargó. El archivo indica claramente qué datos incluye y excluye.";
  } catch (error) {
    showAccountError(error, "No pudimos preparar la copia de tus datos.");
  } finally {
    exportingData.value = false;
  }
}

function openSuspension() {
  suspensionConfirmation.value = "";
  accountMessage.value = "";
  suspensionDialog.value = true;
}

async function submitSuspension() {
  if (
    suspensionConfirmation.value !== "SUSPENDER MI CUENTA" ||
    suspendingAccount.value
  ) {
    return;
  }
  suspendingAccount.value = true;
  try {
    await suspendOwnAccount(suspensionConfirmation.value);
    suspensionDialog.value = false;
    await router.replace("/cuenta-suspendida");
  } catch (error) {
    showAccountError(error, "No pudimos suspender tu cuenta.");
  } finally {
    suspendingAccount.value = false;
  }
}

function showSuccess(title, message) {
  window.dispatchEvent(new CustomEvent("ui-success", { detail: { title, message } }));
}

function showAccountError(error, fallback) {
  accountMessageColor.value = "error";
  accountMessage.value = error?.message || fallback;
}

function authErrorMessage(error) {
  const messages = {
    "auth/wrong-password": "La contraseña actual no es correcta.",
    "auth/invalid-credential": "No pudimos validar tus credenciales.",
    "auth/email-already-in-use": "Ese correo ya pertenece a otra cuenta.",
    "auth/invalid-email": "Ingresa un correo válido.",
    "auth/requires-recent-login": "Vuelve a iniciar sesión e inténtalo nuevamente.",
    "auth/popup-closed-by-user": "La autenticación se cerró antes de terminar.",
  };
  return messages[error?.code] || error?.message || "No pudimos cambiar el correo.";
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
  .settings-view :deep(.v-card-title) {
    line-height: 1.25;
  }
}
</style>

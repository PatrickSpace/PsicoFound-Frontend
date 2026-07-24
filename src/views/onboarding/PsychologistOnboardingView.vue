<template>
  <OnboardingShell
    eyebrow="Perfil profesional"
    title="Completa tu solicitud profesional"
    subtitle="Revisaremos estos datos antes de habilitar las funciones para atender pacientes."
    step="Paso 2 de 2"
    :progress="100"
  >
    <v-alert
      v-if="rejectionReason"
      class="mb-5"
      color="warning"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      Tu solicitud anterior necesita cambios: {{ rejectionReason }}
    </v-alert>
    <v-alert
      v-if="errorMessage"
      class="mb-5"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <v-form v-model="valid" @submit.prevent="submit">
      <v-row>
        <v-col cols="12" md="7">
          <v-text-field
            v-model="form.professionalName"
            label="Nombre profesional"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="5">
          <v-text-field
            v-model="form.phone"
            label="Teléfono"
            autocomplete="tel"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.licenseNumber"
            label="Número de colegiatura"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.country"
            label="País o jurisdicción profesional"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-combobox
            v-model="form.specialties"
            label="Especialidades"
            :items="specialtyOptions"
            :rules="[rules.requiredList]"
            chips
            multiple
            clearable
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-combobox
            v-model="form.approaches"
            label="Enfoques"
            :items="approachOptions"
            :rules="[rules.requiredList]"
            chips
            multiple
            clearable
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-combobox
            v-model="form.modalities"
            label="Modalidades"
            :items="modalityOptions"
            :rules="[rules.requiredList]"
            chips
            multiple
            clearable
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field
            v-model.number="form.yearsExperience"
            label="Años de experiencia"
            type="number"
            min="0"
            max="80"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="form.gender"
            label="Género"
            :items="genderOptions"
            clearable
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="form.practiceLocation"
            label="Ubicación de consulta presencial"
            placeholder="Opcional si solo atiendes online"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.professionalSummary"
            label="Resumen profesional"
            hint="Describe tu experiencia y la forma en que acompañas a tus pacientes."
            persistent-hint
            rows="4"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12">
          <v-textarea
            v-model="form.motivation"
            label="Mensaje para revisión"
            placeholder="Opcional"
            rows="3"
          />
        </v-col>
      </v-row>
      <v-checkbox
        v-model="declarationAccepted"
        color="primary"
        density="compact"
        hide-details
      >
        <template #label>
          <span class="text-caption">
            Declaro que la información profesional proporcionada es veraz.
          </span>
        </template>
      </v-checkbox>
      <div class="d-flex justify-end mt-5">
        <v-btn
          class="pf-btn-primary"
          size="large"
          type="submit"
          append-icon="mdi-send-outline"
          :disabled="!canSubmit"
          :loading="saving"
        >
          Enviar solicitud
        </v-btn>
      </div>
    </v-form>
  </OnboardingShell>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import OnboardingShell from "@/components/onboarding/OnboardingShell.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import {
  APPROACH_OPTIONS,
  GENDER_OPTIONS,
  MODALITY_OPTIONS,
  SPECIALTY_OPTIONS,
} from "@/constants/professionalProfile";
import {
  getCallableErrorMessage,
  submitPsychologistApplication,
} from "@/services/onboardingService";
import { getLatestPsychologistRequestByUser } from "@/services/psychologistRequestService";
import { getUserById } from "@/services/userService";

const router = useRouter();
const appContext = useAppContextStore();
const specialtyOptions = SPECIALTY_OPTIONS;
const approachOptions = APPROACH_OPTIONS;
const modalityOptions = MODALITY_OPTIONS;
const genderOptions = GENDER_OPTIONS;
const valid = ref(false);
const saving = ref(false);
const declarationAccepted = ref(false);
const errorMessage = ref("");
const rejectionReason = ref("");
const form = reactive({
  professionalName: "",
  licenseNumber: "",
  country: "Perú",
  phone: "",
  yearsExperience: 0,
  specialties: [],
  approaches: [],
  modalities: ["Remoto"],
  gender: "",
  practiceLocation: "",
  professionalSummary: "",
  motivation: "",
});

const rules = {
  required: (value) => Boolean(value?.toString().trim()) || "Requerido",
  requiredList: (value) =>
    (Array.isArray(value) && value.length > 0) || "Selecciona al menos una opción",
};

const canSubmit = computed(
  () =>
    valid.value &&
    declarationAccepted.value &&
    !saving.value
);

onMounted(async () => {
  const uid = auth.currentUser?.uid;
  const [profile, request] = await Promise.all([
    getUserById(uid),
    getLatestPsychologistRequestByUser(uid),
  ]);

  if (request?.status === "pending") {
    await router.replace("/onboarding/psicologo/pendiente");
    return;
  }

  if (request?.status === "approved") {
    await appContext.loadForUser(uid, { force: true });
    appContext.setActiveMode("psychologist");
    await router.replace("/psicologo/sesiones");
    return;
  }

  form.professionalName =
    request?.professionalName ||
    profile?.nombre ||
    auth.currentUser?.displayName ||
    "";
  form.licenseNumber = request?.licenseNumber || "";
  form.country = request?.country || profile?.pais || form.country;
  form.phone = request?.phone || profile?.telefono || "";
  form.yearsExperience = request?.yearsExperience || 0;
  form.specialties = request?.specialties || [];
  form.approaches = request?.approaches || [];
  form.modalities = request?.modalities?.length
    ? request.modalities
    : ["Remoto"];
  form.gender = request?.gender || "";
  form.practiceLocation = request?.practiceLocation || "";
  form.professionalSummary = request?.professionalSummary || "";
  form.motivation = request?.motivation || "";
  rejectionReason.value = request?.rejectionReason || "";
});

async function submit() {
  if (!canSubmit.value) return;

  saving.value = true;
  errorMessage.value = "";

  try {
    const result = await submitPsychologistApplication({ ...form });
    await appContext.loadForUser(auth.currentUser.uid, { force: true });
    await router.replace(
      result.nextRoute || "/onboarding/psicologo/pendiente"
    );
  } catch (error) {
    console.error("Psychologist onboarding error:", error);
    errorMessage.value = getCallableErrorMessage(
      error,
      "No pudimos enviar tu solicitud. Revisa los datos e intenta nuevamente."
    );
  } finally {
    saving.value = false;
  }
}
</script>

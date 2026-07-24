<template>
  <OnboardingShell
    eyebrow="Perfil de paciente"
    title="Cuéntanos lo esencial sobre ti"
    subtitle="Estos datos nos permiten personalizar tu cuenta. La información sobre cómo te sientes se recopilará después, en una conversación separada."
    step="Paso 2 de 2"
    :progress="100"
  >
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
        <v-col cols="12">
          <v-text-field
            v-model="form.nombre"
            label="Nombre completo"
            autocomplete="name"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.fechaNacimiento"
            label="Fecha de nacimiento"
            type="date"
            :max="today"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.telefono"
            label="Teléfono"
            placeholder="Opcional"
            autocomplete="tel"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.pais"
            label="País"
            autocomplete="country-name"
            :rules="[rules.required]"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="form.zonaHoraria"
            label="Zona horaria"
            readonly
            hint="La detectamos desde este dispositivo."
            persistent-hint
          />
        </v-col>
      </v-row>
      <div class="d-flex justify-end mt-5">
        <v-btn
          class="pf-btn-primary"
          size="large"
          type="submit"
          append-icon="mdi-arrow-right"
          :disabled="!valid || saving"
          :loading="saving"
        >
          Continuar
        </v-btn>
      </div>
    </v-form>
  </OnboardingShell>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import OnboardingShell from "@/components/onboarding/OnboardingShell.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import {
  completePatientOnboarding,
  getCallableErrorMessage,
} from "@/services/onboardingService";
import { getUserById } from "@/services/userService";

const router = useRouter();
const appContext = useAppContextStore();
const valid = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const today = new Date().toISOString().slice(0, 10);
const form = reactive({
  nombre: "",
  fechaNacimiento: "",
  telefono: "",
  pais: "Perú",
  zonaHoraria:
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Lima",
});

const rules = {
  required: (value) => Boolean(value?.toString().trim()) || "Requerido",
};

onMounted(async () => {
  const profile = await getUserById(auth.currentUser?.uid);
  form.nombre =
    profile?.nombre ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "";
  form.fechaNacimiento = profile?.fechaNacimiento || "";
  form.telefono = profile?.telefono || "";
  form.pais = profile?.pais || form.pais;
  form.zonaHoraria = profile?.zonaHoraria || form.zonaHoraria;
});

async function submit() {
  if (!valid.value || saving.value) return;

  saving.value = true;
  errorMessage.value = "";

  try {
    const result = await completePatientOnboarding({ ...form });
    await appContext.loadForUser(auth.currentUser.uid, { force: true });
    await router.replace(result.nextRoute || "/encuesta");
  } catch (error) {
    console.error("Patient onboarding error:", error);
    errorMessage.value = getCallableErrorMessage(
      error,
      "No pudimos guardar tus datos. Intenta nuevamente."
    );
  } finally {
    saving.value = false;
  }
}
</script>

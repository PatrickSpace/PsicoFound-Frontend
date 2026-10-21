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

    <v-form :disabled="initializing" v-model="valid" @submit.prevent="submit">
      <p class="text-body-2 mb-4">{{ eligibility ? `La política vigente requiere ${eligibility.minimumAge} años o más. Declara tu fecha de nacimiento correctamente.` : "La política de elegibilidad está pendiente; no se puede completar el acceso a la encuesta." }}</p>
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
            :rules="[rules.required, rules.adult]"
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
          <p class="text-body-2">Todos los horarios se muestran en hora de Lima, Perú (UTC−5). El país de residencia no modifica la agenda.</p>
        </v-col>
      </v-row>
      <div class="d-flex justify-end mt-5">
        <v-btn
          class="pf-btn-primary"
          size="large"
          type="submit"
          append-icon="mdi-arrow-right"
          :disabled="!valid || saving || !eligibility"
          :loading="saving"
        >
          Continuar
        </v-btn>
      </div>
    </v-form>
  </OnboardingShell>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref } from "vue";
import { onAuthStateChanged } from "firebase/auth";
import { useRoute, useRouter } from "vue-router";
import { safeReturnPath } from "@/utils/returnPath";
import OnboardingShell from "@/components/onboarding/OnboardingShell.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import {
  completePatientOnboarding,
  getCallableErrorMessage,
} from "@/services/onboardingService";
import { getUserById } from "@/services/userService";
import { getAccountAccessStatus } from "@/services/accountService";
import { ageOnDate } from "@/utils/accountPolicy";
import { agendaDate } from "@/utils/dateTime";

const router = useRouter();
const route = useRoute();
const appContext = useAppContextStore();
const valid = ref(false);
const initializing = ref(true);
let generation = 0;
const eligibility = ref(null);
const saving = ref(false);
const errorMessage = ref("");
const today = agendaDate(new Date());
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
  adult: (value) => {
    const age = ageOnDate(value);
    if (age === null) return "Ingresa una fecha de nacimiento válida.";
    if (!eligibility.value) return true;
    return age >= eligibility.value.minimumAge ||
      `Debes tener ${eligibility.value.minimumAge} años o más para continuar.`;
  },
};

const stopAuth = onAuthStateChanged(auth, async (user) => {
  const current = ++generation;
  initializing.value = true;
  saving.value = false;
  eligibility.value = null;
  Object.assign(form, {nombre: "", fechaNacimiento: "", telefono: "", pais: "Perú"});
  if (!user) return;
  try {
    const [access, profile] = await Promise.all([getAccountAccessStatus(), getUserById(user.uid)]);
    if (current !== generation || auth.currentUser?.uid !== user.uid) return;
    eligibility.value = access.eligibility;
    form.nombre = profile?.nombre || user.displayName || user.email?.split("@")[0] || "";
    form.fechaNacimiento = profile?.fechaNacimiento || "";
    form.telefono = profile?.telefono || "";
    form.pais = profile?.pais || "Perú";
    form.zonaHoraria = profile?.zonaHoraria || form.zonaHoraria;
  } catch {
    if (current === generation) errorMessage.value = "No pudimos cargar tu cuenta. Recarga para intentar nuevamente.";
  } finally {
    if (current === generation) initializing.value = false;
  }
});
onBeforeUnmount(() => { generation++; stopAuth(); });

async function submit() {
  if (initializing.value || !valid.value || saving.value) return;
  const uid = auth.currentUser?.uid;
  const current = generation;

  saving.value = true;
  errorMessage.value = "";

  try {
    const result = await completePatientOnboarding({ ...form });
    if (current !== generation || auth.currentUser?.uid !== uid) return;
    await appContext.loadForUser(uid, { force: true });
    if (current !== generation || auth.currentUser?.uid !== uid) return;
    const target = safeReturnPath(route.query.redirect, result.nextRoute || "/encuesta");
    await router.replace(target.startsWith("/onboarding") ? result.nextRoute || "/encuesta" : target);
  } catch (error) {
    if (current !== generation) return;
    console.error("Patient onboarding error:", error);
    errorMessage.value = getCallableErrorMessage(
      error,
      "No pudimos guardar tus datos. Intenta nuevamente."
    );
  } finally {
    if (current !== generation) return;
    saving.value = false;
  }
}
</script>

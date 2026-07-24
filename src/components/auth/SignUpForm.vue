<template>
  <div class="signup-flow">
    <v-select
      v-model="registrationIntent"
      :items="registrationOptions"
      item-title="label"
      item-value="value"
      label="Quiero usar Lurems como"
      color="primary"
    />

    <v-alert
      v-if="errorMessage"
      class="mt-5"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <v-checkbox
      v-model="termsAccepted"
      class="signup-terms mt-3"
      color="primary"
      density="compact"
      hide-details
    >
      <template #label>
        <span class="text-caption">
          Acepto los términos de uso y la política de privacidad.
        </span>
      </template>
    </v-checkbox>

    <v-btn
      block
      class="my-5 pf-btn-google"
      size="large"
      :loading="loadingGoogle"
      :disabled="loadingEmail"
      @click="registerWithGoogle"
    >
      Continuar con Google
      <template #prepend>
        <v-icon>mdi-google</v-icon>
      </template>
    </v-btn>

    <div class="signup-divider" aria-hidden="true">
      <v-divider />
      <span>o continúa con correo</span>
      <v-divider />
    </div>

    <v-form v-model="valid" @submit.prevent="registerWithEmail">
      <v-container class="px-0 pb-0">
        <v-text-field
          v-model="form.email"
          class="mb-2"
          label="Correo"
          placeholder="tu@email.com"
          autocomplete="email"
          :rules="[rules.required, rules.email]"
          required
          clearable
        />
        <v-text-field
          v-model="form.password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
          :rules="[rules.required, rules.min]"
          required
          clearable
        />
        <v-btn
          block
          class="mt-5 pf-btn-primary"
          size="large"
          type="submit"
          :disabled="!canSubmitEmail"
          :loading="loadingEmail"
        >
          Crear cuenta
          <template #append>
            <v-icon>mdi-arrow-right</v-icon>
          </template>
        </v-btn>
      </v-container>
    </v-form>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "vue-router";
import { auth } from "@/plugins/Firebase/firebase";
import { useAppContextStore } from "@/store/appContext";
import {
  finalizeRegistration,
  getCallableErrorMessage,
  REGISTRATION_INTENT_STORAGE_KEY,
  REGISTRATION_INTENTS,
  REGISTRATION_OPTIONS,
} from "@/services/onboardingService";

const router = useRouter();
const appContext = useAppContextStore();
const registrationOptions = REGISTRATION_OPTIONS;
const registrationIntent = ref(REGISTRATION_INTENTS.PATIENT);
const form = reactive({ email: "", password: "" });
const valid = ref(false);
const termsAccepted = ref(false);
const loadingEmail = ref(false);
const loadingGoogle = ref(false);
const errorMessage = ref("");

const rules = {
  required: (value) => Boolean(value) || "Requerido",
  email: (value) => /.+@.+\..+/.test(value) || "Correo electrónico inválido",
  min: (value) => value?.length >= 6 || "Mínimo 6 caracteres",
};

const canSubmitEmail = computed(
  () =>
    valid.value &&
    termsAccepted.value &&
    !loadingEmail.value &&
    !loadingGoogle.value
);

async function registerWithEmail() {
  if (!canSubmitEmail.value) return;

  rememberRegistrationIntent();
  loadingEmail.value = true;
  errorMessage.value = "";

  try {
    if (auth.currentUser) {
      await finishRegistration(auth.currentUser);
    } else {
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      await finishRegistration(credential.user);
    }
  } catch (error) {
    console.error("Email registration error:", error);
    errorMessage.value = getRegistrationErrorMessage(error);
  } finally {
    loadingEmail.value = false;
  }
}

async function registerWithGoogle() {
  if (loadingGoogle.value || loadingEmail.value) return;

  if (!termsAccepted.value) {
    errorMessage.value =
      "Acepta los términos de uso y la política de privacidad para continuar.";
    return;
  }

  rememberRegistrationIntent();
  loadingGoogle.value = true;
  errorMessage.value = "";

  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await finishRegistration(result.user);
  } catch (error) {
    console.error("Google registration error:", error);
    errorMessage.value = getRegistrationErrorMessage(error);
  } finally {
    loadingGoogle.value = false;
  }
}

async function finishRegistration(user) {
  const result = await finalizeRegistration({
    intent: registrationIntent.value,
    displayName: user.displayName || "",
  });
  sessionStorage.removeItem(REGISTRATION_INTENT_STORAGE_KEY);
  await appContext.loadForUser(user.uid, { force: true });
  await router.replace(result.nextRoute);
}

function rememberRegistrationIntent() {
  sessionStorage.setItem(
    REGISTRATION_INTENT_STORAGE_KEY,
    registrationIntent.value
  );
}

function getRegistrationErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("email-already-in-use")) {
    return "Este correo ya tiene una cuenta. Inicia sesión para continuar.";
  }

  if (code.includes("popup-closed-by-user")) {
    return "Se cerró la ventana de Google antes de completar el registro.";
  }

  return getCallableErrorMessage(
    error,
    "No pudimos crear tu cuenta. Intenta nuevamente."
  );
}
</script>

<style scoped>
.signup-flow {
  width: 100%;
}

.signup-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  color: rgb(var(--v-theme-text-secondary));
  font-size: 0.75rem;
}

.signup-terms :deep(.v-label) {
  opacity: 1;
}
</style>

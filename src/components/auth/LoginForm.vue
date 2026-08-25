<template>
  <div>
    <v-alert
      v-if="errorMessage"
      color="error"
      variant="tonal"
      icon="mdi-alert-circle-outline"
      closable
      class="mb-4"
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>
    <v-form v-model="valid" @submit.prevent="LogIn()">
      <v-container class="px-0">
        <v-text-field
        class="bg-transparent"
          v-model="form.usuario"
          label="Correo"
          placeholder="Correo electronico"
          :rules="[r.required, r.email]"
          required
          clearable
        />
        <div class="d-flex justify-end mt-n2">
          <v-btn variant="text" size="small" class="pf-btn-ghost" @click="openResetDialog">
            Olvidé mi contraseña
          </v-btn>
        </div>
        <v-text-field
        class="bg-transparent"
          v-model="form.password"
          label="Contraseña"
          type="password"
          :rules="[r.required, r.min]"
          required
          clearable
        />
        <v-btn
          block
          class="my-5 pf-btn-primary"
          elevation="4"
          size="large"
          type="submit"
          :disabled="!valid || loading"
          :loading="loading"
        >
          Iniciar Sesión
          <template #append>
            <v-icon>mdi-arrow-right</v-icon>
          </template>
        </v-btn>
      </v-container>
    </v-form>
    <v-divider></v-divider>
    <v-btn
      block
      class="my-5 text-left pf-btn-google"
      id="google-login-button"
      elevation="4"
      size="large"
      @click="LoginGoogle()"
      :loading="loadingGoogle"
    >
      Iniciar sesión con Google
      <template #prepend>
        <v-icon>mdi-google</v-icon>
      </template>
    </v-btn>

    <v-dialog v-model="resetDialog" class="bg-transparent" max-width="480">
      <v-card class="card-backgoundcustom pa-4">
        <v-card-title class="text-h6 font-weight-bold">Recuperar contraseña</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Te enviaremos un enlace para crear una nueva contraseña.
          </p>
          <v-text-field v-model="resetEmail" label="Correo" autocomplete="email" />
          <v-alert v-if="resetMessage" color="info" variant="tonal" class="mt-3">
            {{ resetMessage }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="pf-btn-ghost" @click="resetDialog = false">Cerrar</v-btn>
          <v-btn
            color="secondary"
            class="pf-btn-primary"
            :loading="resettingPassword"
            :disabled="!/.+@.+\..+/.test(resetEmail)"
            @click="requestPasswordReset"
          >
            Enviar enlace
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<style scoped>
#google-login-button{
  background-color: #d82518 !important;
  color: white;
}
</style>
<script setup>
import { reactive, ref } from "vue";
import { auth } from "@/plugins/Firebase/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "vue-router";
import { useAppContextStore } from "@/store/appContext";
import { getUserById } from "@/services/userService";
import {
  getPostAuthenticationRoute,
} from "@/services/onboardingService";

const router = useRouter();
const appContext = useAppContextStore();

const form = reactive({ usuario: "", password: "" });
const valid = ref(false);
const loading = ref(false);
const loadingGoogle = ref(false);
const errorMessage = ref("");
const resetDialog = ref(false);
const resetEmail = ref("");
const resetMessage = ref("");
const resettingPassword = ref(false);

const r = {
  required: (v) => !!v || "Requerido",
  email: (v) => /.+@.+\..+/.test(v) || "Email inválido",
  min: (v) => v?.length >= 6 || "Mínimo 6 caracteres",
};

async function LogIn() {
  if (!valid.value || loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const userlogged = await signInWithEmailAndPassword(
      auth,
      form.usuario,
      form.password
    );
    await routeAfterLogin(userlogged.user);
  } catch (e) {
    console.error("Login error:", e);
    errorMessage.value = loginErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function LoginGoogle() {
  if (loadingGoogle.value) return;

  try {
    loadingGoogle.value = true;
    errorMessage.value = "";
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userlogged = result.user;
    await routeAfterLogin(userlogged);
  } catch (error) {
    console.error("Google login error:", error);
    errorMessage.value = loginErrorMessage(error);
  } finally {
    loadingGoogle.value = false;
  }
}

async function routeAfterLogin(user) {
  let profile = await getUserById(user.uid);

  if (!profile) {
    await router.replace({path: "/registro", query: {complete: "1"}});
    return;
  }

  await appContext.loadForUser(user.uid, { force: true });
  const onboardingRoute = getPostAuthenticationRoute(profile);
  const requestedRoute = router.currentRoute.value.query.redirect;
  const target =
    onboardingRoute === "/dashboard" && typeof requestedRoute === "string"
      ? requestedRoute
      : onboardingRoute;

  if (
    target.startsWith("/psicologo/") &&
    appContext.hasPsychologistAccess
  ) {
    appContext.setActiveMode("psychologist");
  }

  await router.replace(target);
}

function loginErrorMessage(error) {
  const code = (error?.code || "").toString();
  if (code.includes("invalid-credential") || code.includes("wrong-password") ||
      code.includes("user-not-found")) {
    return "El correo o la contraseña no son correctos.";
  }
  if (code.includes("user-disabled")) {
    return "Esta cuenta está desactivada. Comunícate con soporte de Lurems.";
  }
  if (code.includes("too-many-requests")) {
    return "Se realizaron demasiados intentos. Espera unos minutos.";
  }
  if (code.includes("popup-closed-by-user")) {
    return "Se cerró la ventana de Google antes de completar el acceso.";
  }
  return "No pudimos iniciar sesión. Revisa tu conexión e intenta nuevamente.";
}

function openResetDialog() {
  resetEmail.value = form.usuario || "";
  resetMessage.value = "";
  resetDialog.value = true;
}

async function requestPasswordReset() {
  if (resettingPassword.value || !/.+@.+\..+/.test(resetEmail.value)) return;
  resettingPassword.value = true;
  resetMessage.value = "";
  try {
    await sendPasswordResetEmail(auth, resetEmail.value.trim());
    resetMessage.value = "Si existe una cuenta con ese correo, recibirás las instrucciones en unos minutos.";
  } catch (error) {
    console.error("Password reset error:", error);
    resetMessage.value = "No pudimos enviar el enlace. Intenta nuevamente más tarde.";
  } finally {
    resettingPassword.value = false;
  }
}
</script>

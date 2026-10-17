<template>
  <div>
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
      class="mt-3 pf-btn-ghost"
      variant="text"
      :disabled="loading || loadingGoogle"
      @click="openPasswordReset"
    >
      ¿Olvidaste tu contraseña?
    </v-btn>
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
    <v-alert v-if="message" class="mt-4" :color="messageColor" variant="tonal">
      {{ message }}
    </v-alert>
    <v-dialog v-model="resetDialog" max-width="480">
      <v-card class="pa-4 card-backgoundcustom">
        <v-card-title class="text-h6 font-weight-bold">
          Recuperar contraseña
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Te enviaremos un enlace si el correo corresponde a una cuenta.
          </p>
          <v-text-field
            v-model="resetEmail"
            label="Correo"
            type="email"
            autocomplete="email"
            :rules="[r.required, r.email]"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn class="pf-btn-ghost" @click="resetDialog = false">
            Cancelar
          </v-btn>
          <v-btn
            class="pf-btn-primary"
            :loading="resettingPassword"
            :disabled="r.email(resetEmail) !== true"
            @click="resetPassword"
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
  GoogleAuthProvider,
  sendPasswordResetEmail,
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
const resetDialog = ref(false);
const resetEmail = ref("");
const resettingPassword = ref(false);
const message = ref("");
const messageColor = ref("info");

const r = {
  required: (v) => !!v || "Requerido",
  email: (v) => /.+@.+\..+/.test(v) || "Email inválido",
  min: (v) => v?.length >= 6 || "Mínimo 6 caracteres",
};

async function LogIn() {
  if (!valid.value || loading.value) return;
  loading.value = true;
  try {
    const userlogged = await signInWithEmailAndPassword(
      auth,
      form.usuario,
      form.password
    );
    await routeAfterLogin(userlogged.user);
  } catch (e) {
    console.error("Login error:", e);
    messageColor.value = "error";
    message.value = loginErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function LoginGoogle() {
  if (loadingGoogle.value) return;

  try {
    loadingGoogle.value = true;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userlogged = result.user;
    await routeAfterLogin(userlogged);
  } catch (error) {
    console.error("Google login error:", error);
    messageColor.value = "error";
    message.value = loginErrorMessage(error);
  } finally {
    loadingGoogle.value = false;
  }
}

async function routeAfterLogin(user) {
  const usesPassword = user.providerData.some(
    (provider) => provider.providerId === "password"
  );
  if (usesPassword && !user.emailVerified) {
    await router.replace({
      path: "/verificar-correo",
      query: {
        redirect:
          typeof router.currentRoute.value.query.redirect === "string"
            ? router.currentRoute.value.query.redirect
            : "/onboarding",
      },
    });
    return;
  }
  let profile = await getUserById(user.uid);

  if (!profile) {
    await router.replace("/onboarding");
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

function openPasswordReset() {
  resetEmail.value = form.usuario.trim();
  resetDialog.value = true;
}

async function resetPassword() {
  if (r.email(resetEmail.value) !== true || resettingPassword.value) return;
  resettingPassword.value = true;
  try {
    await sendPasswordResetEmail(auth, resetEmail.value.trim());
    resetDialog.value = false;
    messageColor.value = "success";
    message.value =
      "Si el correo corresponde a una cuenta, recibirás un enlace para restablecer la contraseña.";
  } catch (error) {
    console.error("Password reset error:", error);
    resetDialog.value = false;
    messageColor.value = "success";
    message.value =
      "Si el correo corresponde a una cuenta, recibirás un enlace para restablecer la contraseña.";
  } finally {
    resettingPassword.value = false;
  }
}

function loginErrorMessage(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "El correo o la contraseña no son correctos.";
  }
  if (code.includes("too-many-requests")) {
    return "Se realizaron demasiados intentos. Espera un momento o recupera tu contraseña.";
  }
  if (code.includes("popup-closed")) {
    return "La ventana de Google se cerró antes de completar el acceso.";
  }
  return "No pudimos iniciar sesión. Revisa tu conexión e intenta nuevamente.";
}
</script>

<template>
  <section class="brand-system-scope auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true" />
    <main class="auth-content safe-bottom-mobile">
      <v-card class="auth-form-shell pa-6 card-backgoundcustom" elevation="2">
        <MainLogo class="auth-logo" compact />
        <h1 class="text-h5 font-weight-bold">Verifica tu correo</h1>
        <p class="text-body-1 mt-3">
          Enviamos un enlace a <strong>{{ currentUser?.email }}</strong>.
          Ábrelo y vuelve aquí para continuar.
        </p>
        <v-alert v-if="message" class="my-4" :color="messageColor" variant="tonal">
          {{ message }}
        </v-alert>
        <div class="d-flex flex-column ga-3 mt-5">
          <v-btn
            class="pf-btn-primary"
            :loading="checking"
            @click="checkVerification"
          >
            Ya verifiqué mi correo
          </v-btn>
          <v-btn
            class="pf-btn-secondary"
            variant="tonal"
            :loading="sending"
            @click="resend"
          >
            Reenviar enlace
          </v-btn>
          <v-btn class="pf-btn-ghost" variant="text" @click="logout">
            Usar otra cuenta
          </v-btn>
        </div>
      </v-card>
    </main>
  </section>
</template>

<script setup>
import { computed, ref } from "vue";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useRoute, useRouter } from "vue-router";
import MainLogo from "@/components/Common/MainLogo.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { getUserById } from "@/services/userService";

const route = useRoute();
const router = useRouter();
const currentUser = computed(() => auth.currentUser);
const checking = ref(false);
const sending = ref(false);
const message = ref("");
const messageColor = ref("info");

async function checkVerification() {
  if (!auth.currentUser || checking.value) return;
  checking.value = true;
  try {
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      const uid = auth.currentUser.uid;
      await auth.currentUser.getIdToken(true);
      const profile = await getUserById(uid);
      if (auth.currentUser?.uid !== uid) return;
      await router.replace(
        profile && typeof route.query.redirect === "string"
          ? route.query.redirect
          : "/onboarding"
      );
      return;
    }
    messageColor.value = "warning";
    message.value = "El correo aún no figura como verificado.";
  } catch {
    messageColor.value = "error";
    message.value = "No pudimos comprobarlo. Revisa tu conexión e intenta nuevamente.";
  } finally {
    checking.value = false;
  }
}

async function resend() {
  if (!auth.currentUser || sending.value) return;
  sending.value = true;
  try {
    await sendEmailVerification(auth.currentUser);
    messageColor.value = "success";
    message.value = "Enviamos un nuevo enlace de verificación.";
  } catch {
    messageColor.value = "error";
    message.value = "No pudimos reenviar el enlace. Espera un momento e intenta nuevamente.";
  } finally {
    sending.value = false;
  }
}

async function logout() {
  await signOut(auth);
  await router.replace("/login");
}
</script>

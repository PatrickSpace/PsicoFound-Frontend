<template>
  <section class="brand-system-scope auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true" />
    <main class="auth-content safe-bottom-mobile">
      <v-card class="auth-form-shell pa-6 card-backgoundcustom" elevation="2">
        <MainLogo class="auth-logo" compact />
        <h1 class="text-h5 font-weight-bold">Verifica tu correo</h1>
        <p class="text-body-1 mt-3">
          Confirma la dirección <strong>{{ currentUser?.email }}</strong> para continuar.
          Revisa tu bandeja de entrada y la carpeta de correo no deseado.
          Abre el enlace de Firebase y vuelve a Lurems.
        </p>
        <v-alert v-if="message" class="my-4" :color="messageColor" variant="tonal">
          {{ message }}
        </v-alert>
        <div class="d-flex flex-column ga-3 mt-5">
          <v-btn
            class="pf-btn-primary"
            :loading="checking"
            :disabled="sending"
            @click="checkVerification()"
          >
            Ya verifiqué mi correo
          </v-btn>
          <v-btn
            class="pf-btn-secondary"
            variant="tonal"
            :loading="sending"
            :disabled="cooldownSeconds > 0 || checking"
            @click="resend"
          >
            Reenviar enlace
          </v-btn>
          <p v-if="cooldownSeconds > 0" class="text-caption" role="status">Podrás solicitar otro enlace en {{ cooldownSeconds }} s.</p>
          <p class="text-caption">Al volver a esta ventana comprobaremos la confirmación automáticamente.</p>
          <v-btn class="pf-btn-ghost" variant="text" @click="logout">
            Usar otra cuenta
          </v-btn>
        </div>
      </v-card>
    </main>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/auth";
import { sendVerificationEmail, verificationDelivery, verificationLastAttempt, verificationSendError } from "@/services/emailVerificationService";
import { verificationResendSeconds } from "@/utils/emailVerification";
import { useRoute, useRouter } from "vue-router";
import MainLogo from "@/components/Common/MainLogo.vue";
import { auth } from "@/plugins/Firebase/firebase";
import { getUserById } from "@/services/userService";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const currentUser = computed(() => authStore.currentUser);
const checking = ref(false);
const sending = ref(false);
const message = ref(route.query.delivery === "failed" ? "Tu cuenta está creada, pero no pudimos enviar el enlace. Puedes solicitarlo nuevamente cuando termine la espera." : verificationDelivery.uid === auth.currentUser?.uid && verificationDelivery.sentAt ? "Enviamos el enlace de confirmación a tu correo." : "");
const messageColor = ref(route.query.delivery === "failed" ? "warning" : "info");
const now = ref(Date.now());
const cooldownSeconds = computed(() => verificationResendSeconds(verificationLastAttempt(currentUser.value?.uid), now.value));
let timer;
let alive = true;
const onFocus = () => checkVerification(true);
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 1000);
  window.addEventListener("focus", onFocus);
  checkVerification(true);
});
onBeforeUnmount(() => { alive = false; clearInterval(timer); window.removeEventListener("focus", onFocus); });

async function checkVerification(silent = false) {
  if (!auth.currentUser || checking.value || sending.value) return;
  const user = auth.currentUser;
  const active = () => alive && auth.currentUser?.uid === user.uid;
  checking.value = true;
  try {
    await user.reload();
    if (!active()) return;
    if (user.emailVerified) {
      const uid = user.uid;
      await user.getIdToken(true);
      const profile = await getUserById(uid);
      if (!active()) return;
      await router.replace(
        profile && typeof route.query.redirect === "string"
          ? route.query.redirect
          : "/onboarding"
      );
      return;
    }
    if (!silent) {
      messageColor.value = "warning";
      message.value = "El correo aún no figura como verificado.";
    }
  } catch {
    if (!active() || silent) return;
    messageColor.value = "error";
    message.value = "No pudimos comprobarlo. Revisa tu conexión e intenta nuevamente.";
  } finally {
    if (active()) checking.value = false;
  }
}

async function resend() {
  if (!auth.currentUser || sending.value || checking.value || cooldownSeconds.value > 0) return;
  const uid = auth.currentUser.uid;
  const active = () => alive && auth.currentUser?.uid === uid;
  sending.value = true;
  try {
    await sendVerificationEmail(auth.currentUser);
    if (!active()) return;
    messageColor.value = "success";
    message.value = "Enviamos un nuevo enlace de verificación.";
  } catch (error) {
    if (!active()) return;
    messageColor.value = "error";
    message.value = verificationSendError(error);
  } finally {
    if (active()) { sending.value = false; now.value = Date.now(); }
  }
}

async function logout() {
  await signOut(auth);
  await router.replace("/login");
}
</script>

<template>
  <OnboardingEntryView v-if="needsRecovery" />
  <section v-else class="brand-system-scope auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true"></div>

    <main class="auth-content safe-bottom-mobile">
      <div class="auth-form-shell auth-form-shell--signup">
        <MainLogo class="auth-logo" :compact="smAndDown" />
        <h1 class="responsive-title-lg font-weight-medium theme-contrast-text">
          {{ authStore.currentUser ? "Completa tu registro" : "Registrarse" }}
        </h1>
        <template v-if="authStore.currentUser">
          <p class="text-body-1 mb-4">Revisa y acepta los documentos vigentes para continuar donde estabas.</p>
          <AccountAccessCard @status="handleAccessStatus" />
        </template>
        <SignUpForm v-else />
      </div>

      <v-btn
        v-if="!authStore.currentUser"
        append-icon="mdi-arrow-top-right"
        class="auth-link theme-contrast-text text-body-1 pf-btn-ghost"
        variant="text"
        size="large"
        to="/login"
      >
        Iniciar Sesión
      </v-btn>
    </main>
  </section>
</template>
<script setup>
import { ref } from "vue";
import OnboardingEntryView from "@/views/onboarding/OnboardingEntryView.vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import AccountAccessCard from "@/components/auth/AccountAccessCard.vue";
import { safeReturnPath } from "@/utils/returnPath";
import { getUserById } from "@/services/userService";
import SignUpForm from "@/components/auth/SignUpForm.vue";
import MainLogo from "@/components/Common/MainLogo.vue";
import { useDisplay } from "vuetify";

const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const needsRecovery = ref(false);
const route = useRoute(), router = useRouter();
async function handleAccessStatus(status) {
  const uid = authStore.currentUser?.uid;
  if (!uid || !status) return;
  const target = safeReturnPath(route.query.redirect);
  if (status.allowed || ["onboarding_required", "eligibility_required"].includes(status.reason)) {
    await router.replace(target); return;
  }
  if (status.reason === "consent_required") {
    const profile = await getUserById(uid);
    if (authStore.currentUser?.uid !== uid) return;
    if (!profile) needsRecovery.value = true;
  }
}
</script>

<style scoped>
.auth-form-shell--signup {
  width: min(100%, 560px);
}
</style>

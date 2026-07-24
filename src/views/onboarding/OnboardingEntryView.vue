<template>
  <div class="brand-system-scope onboarding-resolver min-dvh-page">
    <template v-if="!errorMessage">
      <v-progress-circular color="primary" indeterminate size="44" />
      <p class="text-body-2 text-medium-emphasis">Preparando tu cuenta…</p>
    </template>
    <template v-else>
      <v-icon color="error" size="44">mdi-alert-circle-outline</v-icon>
      <p class="text-body-2 text-center">{{ errorMessage }}</p>
      <v-btn class="pf-btn-primary" @click="resolveOnboarding">
        Intentar nuevamente
      </v-btn>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { auth } from "@/plugins/Firebase/firebase";
import { getUserById } from "@/services/userService";
import {
  finalizeRegistration,
  getPostAuthenticationRoute,
  REGISTRATION_INTENT_STORAGE_KEY,
  REGISTRATION_INTENTS,
} from "@/services/onboardingService";

const router = useRouter();
const errorMessage = ref("");

onMounted(resolveOnboarding);

async function resolveOnboarding() {
  errorMessage.value = "";
  const uid = auth.currentUser?.uid;

  if (!uid) {
    await router.replace("/login");
    return;
  }

  try {
    let profile = await getUserById(uid);

    if (!profile) {
      const storedIntent = sessionStorage.getItem(
        REGISTRATION_INTENT_STORAGE_KEY
      );
      const intent = Object.values(REGISTRATION_INTENTS).includes(storedIntent)
        ? storedIntent
        : REGISTRATION_INTENTS.PATIENT;
      const result = await finalizeRegistration({
        intent,
        displayName: auth.currentUser?.displayName || "",
      });
      profile = result.profile;
      sessionStorage.removeItem(REGISTRATION_INTENT_STORAGE_KEY);
    }

    await router.replace(getPostAuthenticationRoute(profile));
  } catch (error) {
    console.error("Onboarding resolution error:", error);
    errorMessage.value =
      "No pudimos preparar tu cuenta. Revisa tu conexión e inténtalo nuevamente.";
  }
}
</script>

<style scoped>
.onboarding-resolver {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  background: var(--pf-auth-gradient);
}
</style>

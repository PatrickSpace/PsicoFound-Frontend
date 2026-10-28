<template>
  <v-main>
    <v-container class="py-12" style="max-width: 640px">
      <v-card class="pa-6" rounded="xl">
        <h1 class="text-h4 mb-4">Tu cuenta está suspendida</h1>
        <p class="mb-4">Tu información, encuesta, citas y pagos se conservan. La suspensión no cancela citas ni devuelve pagos.</p>
        <p v-if="appContext.userProfile?.suspensionType === 'involuntary'" class="mb-4">La cuenta se suspendió automáticamente tras tres meses sin actividad registrada.</p>
        <p class="mb-6">Puedes reactivar tu cuenta aquí. Para resolver citas pendientes, contacta con soporte.</p>
        <v-btn color="primary" class="mr-2 mb-2" :loading="reactivating" :disabled="leaving" @click="reactivate">Reactivar mi cuenta</v-btn>
        <v-btn href="mailto:jplosta01@gmail.com" variant="tonal" class="mr-2 mb-2">Contactar con soporte</v-btn>
        <v-btn variant="text" :loading="leaving" :disabled="reactivating" @click="leave">Cerrar sesión</v-btn>
        <p v-if="error" role="alert" class="mt-4">{{ error }}</p>
      </v-card>
    </v-container>
  </v-main>
</template>

<script setup>
import { ref } from "vue";
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import { auth } from "@/plugins/Firebase/firebase";
import { reactivateOwnAccount } from "@/services/accountService";
import { useAppContextStore } from "@/store/appContext";
const appContext = useAppContextStore();
const router = useRouter();
const reactivating = ref(false);
const leaving = ref(false);
const error = ref("");
async function reactivate() {
  if (reactivating.value) return;
  reactivating.value = true;
  error.value = "";
  try {
    await reactivateOwnAccount();
    await appContext.loadForUser(auth.currentUser.uid, {force: true});
    await router.replace("/configuracion");
  } catch (err) {
    error.value = err?.message || "No pudimos reactivar tu cuenta. Inténtalo de nuevo.";
  } finally {
    reactivating.value = false;
  }
}
async function leave() {
  leaving.value = true;
  try {
    await signOut(auth);
    await router.replace("/login");
  } catch {
    error.value = "No pudimos cerrar la sesión. Inténtalo de nuevo.";
  } finally {
    leaving.value = false;
  }
}
</script>

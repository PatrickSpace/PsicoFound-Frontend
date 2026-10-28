<template>
  <Analytics v-if="analyticsEnabled" />
  <v-app :data-user-role="appContext.activeMode" data-theme="light">
    <!-- Contenido principal -->
    <RouterView />

    <!-- Snackbar global para errores de API -->
    <v-snackbar
      v-model="snack.open"
      :timeout="snack.timeout"
      location="top right"
      color="red-darken-2"
    >
      <div class="d-flex flex-column">
        <span class="text-subtitle-2">{{ snack.title }}</span>
        <span>{{ snack.message }}</span>
        <span v-if="snack.extra" class="text-caption">{{ snack.extra }}</span>
      </div>
      <template #actions>
        <v-btn variant="text" class="pf-btn-snackbar" @click="snack.open = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <!-- Snackbar global para mensajes de éxito -->
    <v-snackbar
      v-model="snackOk.open"
      :timeout="snackOk.timeout"
      location="top right"
      color="green-darken-2"
    >
      <div class="d-flex flex-column">
        <span class="text-subtitle-2">{{ snackOk.title }}</span>
        <span>{{ snackOk.message }}</span>
      </div>
      <template #actions>
        <v-btn variant="text" class="pf-btn-snackbar" @click="snackOk.open = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { RouterView, useRouter, useRoute } from "vue-router";
import { Analytics } from "@vercel/analytics/vue";
import { useAppTheme } from "@/composables/useAppTheme";
import { auth } from "@/plugins/Firebase/firebase";
import { getAccountAccessStatus } from "@/services/accountService";
import { useAppContextStore } from "@/store/appContext";

import { watchPublishedLegalDocuments } from "@/config/legal";
let stopLegalDocuments;

const { initializeAppTheme } = useAppTheme();
const appContext = useAppContextStore();
const router = useRouter();
const route = useRoute();
watch(() => appContext.userProfile?.accountStatus, (status) => {
  if (status === "suspended" && !route.meta.legalDocument && route.name !== "suspended-account") {
    router.replace("/cuenta-suspendida");
  }
});
const analyticsEnabled = import.meta.env.VITE_VERCEL_ANALYTICS_ENABLED === "true";
initializeAppTheme();

// Estado del snackbar global
const snack = ref({
  open: false,
  timeout: 4000,
  title: "",
  message: "",
  extra: "", // método y URL
});

const snackOk = ref({
  open: false,
  timeout: 4000,
  title: "",
  message: "",
});

// Los servicios y formularios comparten este canal de notificaciones.
const onApiError = (e) => {
  const err = e?.detail ?? {};
  snack.value.title = err.status ? `Error ${err.status}` : "Error";
  snack.value.message = err.message || "Ha ocurrido un error";
  snack.value.extra = err.method && err.url ? `${err.method} ${err.url}` : "";
  snack.value.open = true;
};

const onUiSuccess = (e) => {
  const detail = e?.detail ?? {};
  snackOk.value.title = detail.title || "";
  snackOk.value.message = detail.message || "";
  snackOk.value.open = true;
};

function recordVisibleVisit() {
  if (document.visibilityState === "visible" && auth.currentUser) {
    getAccountAccessStatus().catch(() => {});
  }
}
onMounted(() => {
  stopLegalDocuments = watchPublishedLegalDocuments();
  document.addEventListener("visibilitychange", recordVisibleVisit);
  window.addEventListener("api-error", onApiError);
  window.addEventListener("ui-success", onUiSuccess);
});
onBeforeUnmount(() => {
  stopLegalDocuments?.();
  document.removeEventListener("visibilitychange", recordVisibleVisit);
  window.removeEventListener("api-error", onApiError);
  window.removeEventListener("ui-success", onUiSuccess);
});
</script>

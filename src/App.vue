<template>
  <Analytics v-if="analyticsEnabled" />
  <v-app :data-user-role="appContext.activeMode" data-theme="light">
    <!-- Contenido principal -->
    <RouterView />
    <NavigationFeedback />

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
import { useAppContextStore } from "@/store/appContext";
import NavigationFeedback from "@/components/Common/NavigationFeedback.vue";

import { legalConfig, hasPublishedLegalDocuments, watchPublishedLegalDocuments } from "@/config/legal";
import { useAuthStore } from "@/store/auth";
let stopLegalDocuments;


const { initializeAppTheme } = useAppTheme();
const appContext = useAppContextStore();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
watch(() => Boolean(authStore.currentUser) || ["/registro", "/onboarding", "/configuracion", "/admin/documentos-legales", "/terminos", "/privacidad"].includes(route.path), needed => {
  stopLegalDocuments?.();
  stopLegalDocuments = needed ? watchPublishedLegalDocuments() : null;
}, { immediate: true });
// Keep an open protected screen in sync with a newly published consent version.
// The subscription still starts lazily, after authentication or on legal pages.
watch(() => [legalConfig.version, legalConfig.termsUrl, legalConfig.privacyUrl], (current, previous) => {
  // Navigation has its own server gate. React only to a live publication;
  // reacting to profile/navigation changes can race consent acceptance.
  if (!previous?.[0] || current.every((value, index) => value === previous[index])) return;
  if (!authStore.currentUser || !hasPublishedLegalDocuments.value ||
      !appContext.userProfile || route.meta.public || route.meta.emailVerification ||
      route.path.startsWith("/admin") || appContext.userProfile.accountStatus === "suspended") return;
  const accepted = appContext.userProfile.legalAcceptance;
  if (!accepted?.acceptedAt || ["version", "termsUrl", "privacyUrl"].some(key => accepted[key] !== legalConfig[key])) {
    router.replace({path: "/registro", query: {redirect: route.fullPath}});
  }
});
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

let lastVisibleVisit = 0;
async function recordVisibleVisit() {
  if (document.visibilityState !== "visible" || !useAuthStore().currentUser || Date.now() - lastVisibleVisit < 60_000) return;
  lastVisibleVisit = Date.now();
  const { getAccountAccessStatus } = await import("@/services/accountService");
  getAccountAccessStatus().catch(() => {});
}
onMounted(() => {
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

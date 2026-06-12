<template>
  <Analytics />
  <v-app>
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
        <v-btn variant="text" @click="snack.open = false">Cerrar</v-btn>
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
        <v-btn variant="text" @click="snackOk.open = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { RouterView } from "vue-router";
import { Analytics } from "@vercel/analytics/vue";

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

// Listener del evento global emitido por axios.js: `window.dispatchEvent(new CustomEvent('api-error', { detail }))`
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

onMounted(() => {
  window.addEventListener("api-error", onApiError);
  window.addEventListener("ui-success", onUiSuccess);
});
onBeforeUnmount(() => {
  window.removeEventListener("api-error", onApiError);
  window.removeEventListener("ui-success", onUiSuccess);
});
</script>

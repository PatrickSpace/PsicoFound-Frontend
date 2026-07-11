<template>
  <v-app class="screen min-dvh-page">
    <v-app-bar
      app
      class="responsive-app-bar"
      color="transparent"
      :elevation="0"
    >
      <v-app-bar-title class="theme-contrast-text">
        <MainLogo :compact="true" />
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <!--
      <v-btn to="/encuesta" append-icon="mdi-arrow-left" class="theme-contrast-text text-body-1 my-5 pf-btn-ghost" variant="text" size="large">
        Reiniciar busqueda
      </v-btn>
      <v-btn append-icon="mdi-refresh" class="theme-contrast-text text-body-1 my-5 pf-btn-ghost" variant="text" size="large">
        Explorar otras opciones
      </v-btn>
      <v-btn append-icon="mdi-arrow-top-right" class="theme-contrast-text text-body-1 my-5 pf-btn-ghost" variant="text" size="large"
        to="psicologos">
        Buscar terapeuta por nombre
      </v-btn>
      -->
    </v-app-bar>
    <v-main class="therapist-match-main safe-bottom-mobile">
      <v-alert
        v-if="isCrisisMode"
        class="mx-auto mt-6 therapist-match-alert"
        color="error"
        variant="tonal"
        icon="mdi-alert-circle-outline"
        title="Ayuda urgente disponible"
      >
        Si estás en Perú y necesitas apoyo urgente en salud mental, llama gratis
        a la Línea 113 Salud, opción 5, disponible las 24 horas. Si estás en
        peligro inmediato, contacta emergencias o acude al establecimiento de
        salud más cercano.
      </v-alert>
      <v-alert
        v-if="errorMessage"
        class="mx-auto mt-6 therapist-match-alert"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
        title="No pudimos cargar las recomendaciones"
      >
        {{ errorMessage }}
      </v-alert>
      <v-container class="therapist-match-header">
        <div>
          <h1 class="text-h4 font-weight-bold theme-contrast-text">
            Psicólogos afines a tu perfil
          </h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            Revisa las opciones sugeridas y agenda una primera cita cuando
            encuentres una buena conexión.
          </p>
        </div>
      </v-container>
      <div v-if="loading" class="pa-6 d-flex justify-center">
        <v-card
          class="pa-6 card-backgoundcustom therapist-loading-card"
          elevation="2"
          variant="text"
        >
          <v-progress-circular indeterminate color="secondary" />
          <span class="text-body-2 text-medium-emphasis"
            >Buscando psicólogos compatibles...</span
          >
        </v-card>
      </div>
      <TerapeutaLista v-else :terapeutas="therapists" />
    </v-main>
  </v-app>
</template>

<script setup>
import MainLogo from "@/components/Common/MainLogo.vue";
import TerapeutaLista from "@/components/encuesta/TerapeutaLista.vue";
import { useTerapiaStore } from "@/store/terapiaStore";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getRecommendedTherapists } from "@/services/matchingService";
const terapiaStore = useTerapiaStore();
const route = useRoute();
const therapists = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const isCrisisMode = computed(() => route.query.crisis === "1");

async function buscarTerapeutas() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { therapists: results } = await getRecommendedTherapists();
    terapiaStore.setTopTerapeutas(results);
    therapists.value = results;
  } catch (error) {
    console.error("Error buscando terapeutas:", error);
    errorMessage.value =
      error?.message ||
      "Ocurrió un error al obtener los psicólogos recomendados.";
    therapists.value = [];
    terapiaStore.setTopTerapeutas([]);
  } finally {
    loading.value = false;
  }
}

async function buscarnuevosterapeutas() {
  terapiaStore.resetCriterios();
  await buscarTerapeutas();
}

onMounted(() => {
  buscarTerapeutas();
});
</script>

<style scoped>
.therapist-match-main {
  padding-top: 24px;
}

.therapist-match-alert,
.therapist-match-header {
  max-width: 1120px;
}

.therapist-loading-card {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: center;
  max-width: 520px;
  width: 100%;
}

@media (max-width: 600px) {
  .therapist-match-main {
    padding-top: 12px;
  }

  .therapist-match-header {
    padding-inline: 16px;
    padding-top: 52px;
  }
}
</style>

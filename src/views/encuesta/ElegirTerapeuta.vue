<template>
  <v-app class="brand-system-scope screen min-dvh-page">
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
      <v-btn
        class="restart-survey-button pf-btn-secondary"
        color="secondary"
        variant="tonal"
        prepend-icon="mdi-refresh"
        :loading="resetting"
        :disabled="resetting"
        @click="handleRestartSurvey"
      >
        <span class="restart-survey-button__desktop">Reiniciar encuesta</span>
        <span class="restart-survey-button__mobile">Reiniciar</span>
      </v-btn>
      <!--
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
      <div
        v-if="isCrisisMode"
        :class="[
          'crisis-support-stage',
          { 'crisis-support-stage--centered': !loading && therapists.length === 0 },
        ]"
      >
        <v-alert
          class="crisis-support-alert"
          color="primary"
          variant="tonal"
          icon="mdi-heart-outline"
          title="No tienes que atravesar esto a solas"
        >
          <p class="mb-4">
            Lo más importante ahora es que recibas apoyo inmediato. En Perú puedes
            llamar gratis a la Línea 113 Salud, opción 5, donde profesionales de
            salud mental están disponibles las 24 horas.
          </p>
          <p class="mb-4">
            Si estás en peligro inmediato, acude al establecimiento de salud más
            cercano o pide a una persona de confianza que te acompañe.
          </p>
          <div class="crisis-support-actions">
            <v-btn
              href="tel:113"
              class="pf-btn-primary"
              color="primary"
              variant="flat"
              prepend-icon="mdi-phone"
            >
              Llamar al 113
            </v-btn>
            <v-btn
              href="https://wa.me/51955557000"
              target="_blank"
              rel="noopener noreferrer"
              class="pf-btn-secondary"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-whatsapp"
            >
              Escribir por WhatsApp
            </v-btn>
            <v-btn
              href="https://www.gob.pe/saludmental"
              target="_blank"
              rel="noopener noreferrer"
              class="pf-btn-ghost"
              color="secondary"
              variant="text"
              append-icon="mdi-open-in-new"
            >
              Buscar un centro de salud
            </v-btn>
          </div>
        </v-alert>
      </div>
      <v-alert
        v-if="errorMessage && !isCrisisMode"
        class="mx-auto mt-6 therapist-match-alert"
        color="error"
        variant="tonal"
        icon="mdi-alert-outline"
        title="No pudimos cargar las recomendaciones"
      >
        {{ errorMessage }}
      </v-alert>
      <v-container
        v-if="!isCrisisMode || therapists.length > 0"
        class="therapist-match-header"
      >
        <div>
          <h1 class="text-h4 font-weight-bold theme-contrast-text">
            {{
              isCrisisMode
                ? "Profesionales disponibles para apoyarte"
                : "Psicólogos afines a tu perfil"
            }}
          </h1>
          <p class="text-body-1 text-medium-emphasis mt-2 mb-0">
            {{
              isCrisisMode
                ? "Puedes revisar estas opciones, pero si el riesgo es inmediato prioriza la Línea 113 o el establecimiento de salud más cercano."
                : "Revisa las opciones sugeridas y agenda una primera cita cuando encuentres una buena conexión."
            }}
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
      <TerapeutaLista
        v-else-if="!isCrisisMode || therapists.length > 0"
        :terapeutas="therapists"
        :resetting="resetting"
        @restart-survey="handleRestartSurvey"
      />
    </v-main>
  </v-app>
</template>

<script setup>
import MainLogo from "@/components/Common/MainLogo.vue";
import TerapeutaLista from "@/components/encuesta/TerapeutaLista.vue";
import { useTerapiaStore } from "@/store/terapiaStore";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { resetProfileChatConversation } from "@/services/conversationService";
import { getRecommendedTherapists } from "@/services/matchingService";
const terapiaStore = useTerapiaStore();
const route = useRoute();
const router = useRouter();
const therapists = ref([]);
const loading = ref(false);
const resetting = ref(false);
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

async function handleRestartSurvey() {
  if (resetting.value) return;

  resetting.value = true;
  errorMessage.value = "";

  try {
    await resetProfileChatConversation();
    terapiaStore.resetCriterios();
    terapiaStore.setTopTerapeutas([]);
    therapists.value = [];
    await router.replace({ path: "/encuesta" });
  } catch (error) {
    console.error("Error reiniciando la encuesta:", error);
    errorMessage.value =
      error?.message ||
      "No pudimos reiniciar la encuesta. Inténtalo nuevamente.";
  } finally {
    resetting.value = false;
  }
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

.crisis-support-stage {
  display: flex;
  justify-content: center;
  padding: 24px;
}

.crisis-support-stage--centered {
  align-items: center;
  min-height: calc(100dvh - 88px);
}

.crisis-support-alert {
  font-size: 1rem;
  line-height: 1.55;
  max-width: 920px;
  padding: 24px;
  width: 100%;
}

.crisis-support-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.therapist-loading-card {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: center;
  max-width: 520px;
  width: 100%;
}

.restart-survey-button__mobile {
  display: none;
}

@media (max-width: 600px) {
  .therapist-match-main {
    padding-top: 12px;
  }

  .therapist-match-header {
    padding-inline: 16px;
    padding-top: 52px;
  }

  .restart-survey-button {
    min-width: 0;
    padding-inline: 12px;
  }

  .restart-survey-button__desktop {
    display: none;
  }

  .restart-survey-button__mobile {
    display: inline;
  }

  .crisis-support-alert {
    padding: 18px;
  }

  .crisis-support-stage {
    padding: 16px;
  }

  .crisis-support-stage--centered {
    min-height: calc(100dvh - 76px);
  }

  .crisis-support-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .crisis-support-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>

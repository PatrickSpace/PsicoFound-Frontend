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
        <v-card
          role="alert"
          aria-live="assertive"
          aria-labelledby="crisis-support-title"
          class="crisis-support-alert"
          elevation="0"
        >
          <div class="crisis-support-icon" aria-hidden="true">
            <v-icon icon="mdi-heart-outline" size="32" />
          </div>
          <h1 id="crisis-support-title" class="crisis-support-title">
            Estamos contigo en este momento
          </h1>
          <p class="crisis-support-intro">
            Lo más importante ahora es que puedas recibir apoyo inmediato de una
            persona preparada para escucharte.
          </p>

          <div class="crisis-support-line">
            <span>Ayuda gratuita en Perú, disponible las 24 horas</span>
            <strong>Línea 113 Salud, opción 5</strong>
          </div>

          <p class="crisis-support-immediate">
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
          </div>
          <v-btn
            href="https://www.gob.pe/saludmental"
            target="_blank"
            rel="noopener noreferrer"
            class="pf-btn-ghost crisis-support-link"
            color="secondary"
            variant="text"
            append-icon="mdi-open-in-new"
          >
            Buscar un centro de salud cercano
          </v-btn>
        </v-card>
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
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { resetProfileChatConversation } from "@/services/conversationService";
import { getRecommendedTherapists } from "@/services/matchingService";
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
    therapists.value = results;
  } catch (error) {
    console.error("Error buscando terapeutas:", error);
    errorMessage.value =
      error?.message ||
      "Ocurrió un error al obtener los psicólogos recomendados.";
    therapists.value = [];
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
  align-items: center;
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid color-mix(in srgb, var(--color-brand-primary) 42%, white);
  border-radius: 8px;
  box-shadow: 0 20px 54px rgba(26, 58, 56, 0.11);
  display: flex;
  flex-direction: column;
  max-width: 720px;
  padding: 48px 52px 40px;
  text-align: center;
  width: 100%;
}

.crisis-support-icon {
  align-items: center;
  background: var(--pf-btn-secondary-bg);
  border: 1px solid var(--pf-btn-secondary-border);
  border-radius: 50%;
  color: var(--color-brand-primary);
  display: flex;
  height: 64px;
  justify-content: center;
  margin-bottom: 22px;
  width: 64px;
}

.crisis-support-title {
  color: var(--pf-field-text);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 14px;
}

.crisis-support-intro,
.crisis-support-immediate {
  color: var(--pf-field-helper);
  font-size: 1rem;
  line-height: 1.65;
  margin: 0;
  max-width: 590px;
}

.crisis-support-line {
  background: var(--pf-btn-secondary-bg);
  border: 1px solid var(--pf-btn-secondary-border);
  border-radius: 8px;
  color: var(--pf-btn-secondary-text);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 26px 0 20px;
  padding: 18px 22px;
  width: 100%;
}

.crisis-support-line span {
  font-size: 0.88rem;
  font-weight: 600;
}

.crisis-support-line strong {
  font-size: 1.2rem;
  font-weight: 800;
}

.crisis-support-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 28px;
}

.crisis-support-link {
  margin-top: 12px;
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
    padding: 32px 22px 26px;
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
    margin-top: 24px;
    width: 100%;
  }

  .crisis-support-icon {
    height: 56px;
    margin-bottom: 18px;
    width: 56px;
  }

  .crisis-support-title {
    font-size: 1.4rem;
  }

  .crisis-support-intro,
  .crisis-support-immediate {
    font-size: 0.94rem;
  }

  .crisis-support-line {
    margin-block: 22px 18px;
    padding: 16px;
  }

  .crisis-support-line strong {
    font-size: 1.08rem;
  }

  .crisis-support-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>

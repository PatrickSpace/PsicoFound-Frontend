<template>
    <v-app class="survey-page bg-diagonal min-dvh-page">
      <v-app-bar app class="responsive-app-bar" color="transparent" :elevation="0">
        <v-app-bar-title class="theme-contrast-text">
          <MainLogo />
        </v-app-bar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon
          variant="text"
          class="theme-contrast-text"
          :aria-label="isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          @click="toggleAppTheme"
        >
          <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
      </v-app-bar>
      <v-main>
        <v-container class="survey-container" fluid>
          <ConversationalSurvey />
        </v-container>
      </v-main>
    </v-app>
  </template>

  <script setup>
  import MainLogo from "@/components/Common/MainLogo.vue";
  import ConversationalSurvey from "@/components/encuesta/ConversationalSurvey.vue";
  import { useAppTheme } from "@/composables/useAppTheme";

  const { isDarkTheme, toggleAppTheme } = useAppTheme();
  </script>

  <style scoped>
  .survey-container {
    height: calc(100dvh - var(--v-layout-top, 64px));
    max-width: 960px;
    display: flex;
    padding-top: 16px;
    padding-bottom: 16px;
  }
  .survey-page { background: rgba(18, 39, 42, 0.82) !important; }
  :global(.v-theme--light) .survey-page { background: rgba(248, 251, 249, 0.92) !important; }
  @media (max-width: 720px) {
    .survey-container {
      height: calc(100dvh - var(--v-layout-top, 64px));
      padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
    }
  }
  </style>
  
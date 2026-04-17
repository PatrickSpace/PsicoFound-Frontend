<template>
  <v-app class="bg-diagonal h-screen">
    <v-app-bar app class="px-15" color="transparent" dark :elevation="0">
      <v-app-bar-title class="text-white">
        <MainLogo />
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <v-btn append-icon="mdi-arrow-top-right" class="text-white text-body-1 my-5" variant="text" size="large"
        to="psicologos">
        Buscar terapeuta por nombre
      </v-btn>
    </v-app-bar>
    <v-main class="survey-main">
      <v-container class="survey-container" fluid>
        <ConversationalSurvey />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import MainLogo from "@/components/Common/MainLogo.vue";
import ConversationalSurvey from "@/components/encuesta/ConversationalSurvey.vue";
</script>

<style scoped>
.bg-diagonal {
  background: linear-gradient(to left bottom, #4a9ba7, #0d1c1e);
}

.survey-main {
  min-height: 0;
}

.survey-container {
  height: calc(100dvh - var(--v-layout-top, 64px));
  max-width: 960px;
  display: flex;
  padding-top: 16px;
  padding-bottom: 16px;
}

a {
  text-decoration: none;
  color: white;
  transition: color 0.3s;
  background-color: transparent;
}
</style>

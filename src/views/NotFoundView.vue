<template>
  <v-main class="not-found d-flex align-center">
    <v-container class="text-center py-12">
      <v-icon color="secondary" size="64">mdi-map-marker-question-outline</v-icon>
      <h1 class="text-h3 font-weight-bold mt-5">Esta página no existe</h1>
      <p class="text-body-1 text-medium-emphasis mt-3 mb-7">
        Revisa la dirección o vuelve al inicio de Lurems.
      </p>
      <v-btn to="/" color="secondary" class="pf-btn-primary" prepend-icon="mdi-home-outline">
        Ir al inicio
      </v-btn>
    </v-container>
  </v-main>
</template>

<style scoped>
.not-found { min-height: 100dvh; background: rgb(var(--v-theme-background)); }
</style>

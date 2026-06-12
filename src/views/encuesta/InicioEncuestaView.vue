<template>
  <v-app class="bg-diagonal min-dvh-page">
    <v-app-bar
      app
      class="responsive-app-bar"
      color="transparent"
      dark
      :elevation="0"
    >
      <v-app-bar-title class="text-white">PsicoFound</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn text class="text-white" to="/login" rounded="0" variant="tonal">
        Iniciar sesión
      </v-btn>
      <v-btn text class="text-white" to="/registro">Registrarse</v-btn>
    </v-app-bar>

    <v-main class="min-dvh-page safe-bottom-mobile">
      <v-container class="intro-container text-center">
        <div class="intro-copy">
          <h1 class="responsive-title-lg text-white font-weight-bold">
            Cuentanos mas sobre tí
          </h1>
          <p class="intro-description text-white">
            Te ayudaremos a elegir a un terapeuta a través de una breve
            encuesta.
          </p>
          <v-btn
            to="encuesta"
            rounded="0"
            class="text-white text-subtitle-1"
            variant="tonal"
            append-icon="mdi-arrow-right"
            size="large"
          >
            Iniciar encuesta
          </v-btn>
        </div>

        <p class="intro-footnote text-white">
          Si ya elegiste a un terapeuta registrado en PsicoFound puedes
          realizar una búsqueda desde tu cuenta.
        </p>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: "InicioEncuestaView",
  // Métodos y lógica de la vista
};
</script>

<style scoped>
.intro-container {
  display: flex;
  min-height: calc(100dvh - var(--v-layout-top, 64px));
  flex-direction: column;
  justify-content: center;
  gap: 48px;
  padding-block: 56px 24px;
}

.intro-copy {
  max-width: 620px;
  margin-inline: auto;
}

.intro-description {
  margin: 18px auto 32px;
  max-width: 520px;
  line-height: 1.6;
}

.intro-footnote {
  max-width: 620px;
  margin-inline: auto;
  font-size: 0.95rem;
  line-height: 1.55;
  opacity: 0.86;
}
</style>

<template>
  <v-app class="brand-system-scope bg-diagonal min-dvh-page">
    <v-app-bar
      app
      class="responsive-app-bar"
      color="transparent"
      :elevation="0"
    >
      <v-app-bar-title>
        <img
          src="/brand/lurems-isotipo-transparent.png"
          alt="Lurems"
          class="intro-logo"
        />
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn class="theme-contrast-text pf-btn-secondary" to="/login" variant="tonal">
        Iniciar sesión
      </v-btn>
      <v-btn class="theme-contrast-text pf-btn-ghost" to="/registro" variant="text">
        Registrarse
      </v-btn>
    </v-app-bar>

    <v-main class="min-dvh-page safe-bottom-mobile">
      <v-container class="intro-container text-center">
        <div class="intro-copy">
          <v-avatar
            color="secondary"
            variant="tonal"
            rounded="lg"
            size="64"
            class="mb-5"
          >
            <v-icon size="32">mdi-chat-question-outline</v-icon>
          </v-avatar>
          <h1 class="responsive-title-lg theme-contrast-text font-weight-bold">
            Cuéntanos más sobre ti
          </h1>
          <p class="intro-description theme-contrast-text">
            Te ayudaremos a encontrar psicólogos afines con una conversación breve y clara.
          </p>
          <v-btn
            to="encuesta"
            color="secondary"
            class="text-subtitle-1 pf-btn-secondary"
            variant="tonal"
            append-icon="mdi-arrow-right"
            size="large"
          >
            Iniciar encuesta
          </v-btn>
        </div>

        <p class="intro-footnote theme-contrast-text">
          Si ya elegiste a un terapeuta registrado en Lurems puedes
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

.intro-logo {
  display: block;
  height: 40px;
  object-fit: contain;
  object-position: left center;
  width: 54px;
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

@media (max-width: 600px) {
  .intro-container {
    gap: 36px;
    padding-block: 44px 20px;
  }

  .intro-description {
    margin-bottom: 24px;
  }

  .intro-footnote {
    font-size: 0.88rem;
    padding-inline: 8px;
  }
}
</style>

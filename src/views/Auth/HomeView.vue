<template>
    <div class="home-page min-dvh-page">
      <div class="home-grid">
        <div
          class="bg-image d-none d-md-block"
          :style="{ backgroundImage: `url(${bgHomeImage})` }"
          aria-hidden="true"
        ></div>
        <div class="bg-diagonal home-content-col">
          <div class="home-inner">
            <header class="home-toolbar">
              <span class="home-brand theme-contrast-text">PsicoFound</span>
              <div class="home-toolbar-actions">
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  class="theme-contrast-text"
                  :aria-label="isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
                  @click="toggleAppTheme"
                >
                  <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
                </v-btn>
                <v-btn to="/login" class="theme-contrast-text" variant="tonal" rounded="0" size="small">
                  Iniciar sesión
                </v-btn>
                <v-btn to="/registro" class="theme-contrast-text" variant="text" size="small">
                  Registrarse
                </v-btn>
              </div>
            </header>
            <main class="home-hero">
              <h5 class="text-h5 theme-contrast-text mb-4 font-weight-black text-decoration-underline">
                PsicoFound
              </h5>
              <p class="home-hero-title font-weight-medium theme-contrast-text">
                Estar bien no es negociable
              </p>
              <p class="text-body-1 theme-contrast-text mt-5 mb-10">
                Cuéntanos tu problema y nosotros te ayudaremos a encontrar el
                mejor terapeuta para ti
              </p>
              <v-btn
                class="theme-contrast-text"
                rounded="0"
                variant="text"
                append-icon="mdi-arrow-right"
                size="large"
                to="/iniciarencuesta"
              >
                Encuentra a tu terapeuta
              </v-btn>
            </main>
            <footer class="home-footer safe-bottom-mobile">
              <v-btn
                append-icon="mdi-arrow-top-right"
                class="theme-contrast-text text-body-1"
                variant="text"
                size="large"
              >
                Ya cuento con un terapeuta
              </v-btn>
            </footer>
          </div>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import bgHomeImage from "@/assets/img/bg-home.jpg";
  import { useAppTheme } from "@/composables/useAppTheme";

  const { isDarkTheme, toggleAppTheme } = useAppTheme();
  </script>

  <style scoped>
  .home-page { overflow-x: hidden; }
  .home-grid {
    display: grid;
    grid-template-columns: 1fr;
    min-height: 100dvh;
    min-height: 100svh;
  }
  .bg-image {
    background-size: cover;
    background-repeat: no-repeat;
    background-position-y: bottom;
    min-height: 100dvh;
  }
  .home-content-col {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    min-height: 100svh;
  }
  .home-inner {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 100dvh;
    min-height: 100svh;
    padding-inline: 24px;
    padding-block: 16px;
  }
  .home-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding-block: 8px;
    flex-shrink: 0;
  }
  .home-brand {
    display: none;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin-right: auto;
  }
  .home-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .home-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-block: 32px;
  }
  .home-hero-title {
    font-size: clamp(2rem, 6vw, 3.5rem);
    line-height: 1.08;
    letter-spacing: -0.02em;
  }
  .home-footer {
    flex-shrink: 0;
    padding-block: 16px;
  }
  @media (max-width: 599px) {
    .home-inner { padding-inline: 20px; }
    .home-brand { display: block; }
    .home-hero-title { font-size: 2rem; }
  }
  @media (min-width: 960px) {
    .home-grid { grid-template-columns: 1fr 1fr; }
    .home-inner { padding-inline: 48px; }
  }
  </style>
  
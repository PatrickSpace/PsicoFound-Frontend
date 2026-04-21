<template>
  <section class="home-page min-dvh-page">
    <div
      class="home-image"
      :style="{ backgroundImage: `url(${bgHomeImage})` }"
      aria-hidden="true"
    ></div>

    <main class="home-content safe-bottom-mobile">
      <nav class="home-actions" aria-label="Acceso">
        <v-btn to="/login" class="text-white" variant="tonal" rounded="0">
          Iniciar sesion
        </v-btn>
        <v-btn to="/registro" class="text-white" variant="text">
          Registrarse
        </v-btn>
      </nav>

      <div class="home-copy">
        <h5 class="brand-mark text-white font-weight-black">
          PsicoFound
        </h5>
        <h1 class="responsive-title-xl font-weight-medium text-white">
          Estar bien no es negociable
        </h1>
        <p class="home-description text-white">
          Cuentanos tu problema y nosotros te ayudaremos a encontrar el mejor
          terapeuta para ti.
        </p>
        <v-btn
          class="home-cta text-white"
          rounded="0"
          variant="text"
          append-icon="mdi-arrow-right"
          to="/iniciarencuesta"
        >
          Encuentra a tu terapeuta
        </v-btn>
      </div>
    </main>
  </section>
</template>
<script setup>
import bgHomeImage from "@/assets/img/bg-home.jpg";
</script>
<style scoped>
.home-page {
  display: grid;
  grid-template-columns: 1fr;
  background: linear-gradient(to left bottom, #4a9ba7, #0d1c1e);
}

.home-image {
  display: none;
  background-size: cover;
  background-repeat: no-repeat;
  background-position-y: bottom;
}

.home-content {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 20px 40px;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.home-copy {
  width: min(100%, 560px);
  padding-block: 56px 24px;
}

.brand-mark {
  display: inline-block;
  margin-bottom: 28px;
  font-size: 1.25rem;
  line-height: 1.2;
  text-decoration: underline;
}

.home-description {
  max-width: 520px;
  margin-top: 18px;
  margin-bottom: 32px;
  font-size: 1rem;
  line-height: 1.6;
}

.home-cta {
  min-height: 44px;
}

@media (min-width: 960px) {
  .home-page {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .home-image {
    display: block;
  }

  .home-content {
    padding: 24px 64px 72px;
  }

  .home-copy {
    padding-block: 80px 40px;
  }
}
</style>

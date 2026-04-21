<script setup>
import Loginform from "@/components/auth/LoginForm.vue";
import MainLogo from "@/components/Common/MainLogo.vue";
</script>
<template>
  <section class="auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true"></div>

    <main class="auth-content safe-bottom-mobile">
      <div class="auth-form-shell">
        <MainLogo />
        <h1 class="responsive-title-lg font-weight-medium text-white">
          Iniciar sesion
        </h1>
        <Loginform />
      </div>

      <v-btn
        to="/registro"
        append-icon="mdi-arrow-top-right"
        class="auth-link text-white text-body-1"
        variant="text"
        size="large"
      >
        Registrarse
      </v-btn>
    </main>
  </section>
</template>
<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: 1fr;
  background: linear-gradient(200deg, #4a9ba7, #000000);
}

.auth-image {
  display: none;
  background-image: url("@/assets/img/bg-home.jpg");
  background-size: cover;
  background-repeat: no-repeat;
  background-position-y: bottom;
}

.auth-content {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  padding: 24px 20px;
}

.auth-form-shell {
  width: min(100%, 440px);
  margin-inline: auto;
}

.auth-form-shell h1 {
  margin: 18px 0 12px;
}

.auth-link {
  align-self: center;
}

@media (min-width: 960px) {
  .auth-page {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .auth-image {
    display: block;
  }

  .auth-content {
    padding-inline: 56px;
  }
}
</style>

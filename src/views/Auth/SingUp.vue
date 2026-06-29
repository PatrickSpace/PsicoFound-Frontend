<template>
  <section class="auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true"></div>

    <main class="auth-content safe-bottom-mobile">
      <div class="auth-form-shell">
        <MainLogo />
        <h1 class="responsive-title-lg font-weight-medium theme-contrast-text">
          Registrarse
        </h1>
        <SignUpForm />
      </div>

      <v-btn
        append-icon="mdi-arrow-top-right"
        class="auth-link theme-contrast-text text-body-1"
        variant="text"
        size="large"
        to="/login"
      >
        Iniciar Sesión
      </v-btn>
    </main>
  </section>
</template>
<script setup>
import SignUpForm from "@/components/auth/SignUpForm.vue";
import MainLogo from "@/components/Common/MainLogo.vue";
</script>

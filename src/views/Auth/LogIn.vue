<script setup>
import Loginform from "@/components/auth/LoginForm.vue";
import MainLogo from "@/components/Common/MainLogo.vue";
import { useDisplay } from "vuetify";

const { smAndDown } = useDisplay();
</script>
<template>
  <section class="auth-page min-dvh-page">
    <div class="auth-image" aria-hidden="true"></div>

    <main class="auth-content safe-bottom-mobile">
      <div class="auth-form-shell">
        <MainLogo class="auth-logo" :compact="smAndDown" />
        <h1 class="responsive-title-lg font-weight-medium theme-contrast-text">
          Iniciar sesion
        </h1>
        <Loginform />
      </div>

      <v-btn
        to="/registro"
        append-icon="mdi-arrow-top-right"
        class="auth-link theme-contrast-text text-body-1 pf-btn-ghost"
        variant="text"
        size="large"
      >
        Registrarse
      </v-btn>
    </main>
  </section>
</template>

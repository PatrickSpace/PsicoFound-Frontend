<script setup>
  import Loginform from "@/components/auth/LoginForm.vue";
  import MainLogo from "@/components/Common/MainLogo.vue";
  import { useAppTheme } from "@/composables/useAppTheme";

  const { isDarkTheme, toggleAppTheme } = useAppTheme();
  </script>
  <template>
    <section class="auth-page min-dvh-page">
      <div class="auth-image" aria-hidden="true"></div>
      <main class="auth-content safe-bottom-mobile">
        <div class="auth-form-shell">
          <div class="auth-header">
            <MainLogo />
            <v-btn
              icon
              variant="text"
              size="small"
              class="auth-theme-btn theme-contrast-text"
              :aria-label="isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
              @click="toggleAppTheme"
            >
              <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
            </v-btn>
          </div>
          <h1 class="responsive-title-lg font-weight-medium theme-contrast-text">
            Iniciar sesión
          </h1>
          <Loginform />
        </div>
        <v-btn
          to="/registro"
          append-icon="mdi-arrow-top-right"
          class="auth-link theme-contrast-text text-body-1"
          variant="text"
          size="large"
        >
          Registrarse
        </v-btn>
      </main>
    </section>
  </template>
  
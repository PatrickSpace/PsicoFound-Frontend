<template>
  <div class="navigation-feedback" role="status" aria-live="polite" aria-atomic="true">
    <template v-if="navigation.pending">
      <v-progress-linear
        indeterminate
        color="primary"
        height="4"
        class="navigation-feedback__bar"
        aria-hidden="true"
      />
      <div class="navigation-feedback__notice">
        <v-progress-circular indeterminate color="primary" size="24" width="3" aria-hidden="true" />
        <div>
          <p class="navigation-feedback__title">Cargando…</p>
          <p class="navigation-feedback__description">
            {{ navigation.slow
              ? "Está tardando un poco más de lo habitual. Seguimos preparando tu acceso."
              : "Estamos preparando la siguiente pantalla." }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useNavigationFeedback } from "@/composables/useNavigationFeedback";

const navigation = useNavigationFeedback();
</script>

<style scoped>
.navigation-feedback {
  position: fixed;
  inset: 0;
  z-index: 2500;
  pointer-events: none;
}

.navigation-feedback__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.navigation-feedback__notice {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  width: max-content;
  max-width: min(460px, calc(100% - 32px));
  padding: 16px 20px;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 8px 28px rgba(26, 58, 56, 0.16);
}

.navigation-feedback__notice > .v-progress-circular {
  flex-shrink: 0;
}

.navigation-feedback__title {
  font-weight: 700;
}

.navigation-feedback__description {
  margin-top: 2px;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>

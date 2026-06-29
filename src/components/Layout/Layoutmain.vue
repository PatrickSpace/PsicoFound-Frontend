<template>
  <div class="screen layout-shell">
    <NavBar />
    <NavDrawer />
    <v-progress-linear
      v-if="appContext.loading"
      class="context-progress"
      color="secondary"
      indeterminate
    />
    <v-main class="layout-main-content">
      <v-container class="layout-container">
        <slot name="default"></slot>
      </v-container>
    </v-main>
    <BottomNav />
  </div>
</template>

<script setup>
import NavDrawer from "@/components/Navigation/NavDrawer.vue";
import NavBar from "@/components/Navigation/NavBar.vue";
import BottomNav from "@/components/Navigation/BottomNav.vue";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
</script>
<style>
.context-progress {
  left: 0;
  position: fixed;
  right: 0;
  top: var(--v-layout-top, 64px);
  z-index: 1006;
}

.layout-main-content {
  min-height: 100dvh;
  min-height: 100svh;
  padding-top: calc(64px + env(safe-area-inset-top));
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
  overflow: visible;
}

.layout-shell {
  min-height: 100dvh;
  min-height: 100svh;
  overflow: visible;
  width: 100%;
}

.layout-container {
  width: min(100%, 1120px);
  padding-inline: 16px;
}

@media (max-width: 599px) {
  .layout-main-content {
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-top: calc(56px + env(safe-area-inset-top));
    padding-bottom: calc(92px + env(safe-area-inset-bottom));
  }

  .layout-container {
    max-width: none !important;
    padding-inline: 12px;
    width: 100%;
  }
}

@media (min-width: 1280px) {
  .layout-main-content {
    padding-bottom: 24px;
  }

  .layout-container {
    padding-inline: 24px;
  }
}
</style>

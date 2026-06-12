<template>
  <v-app class="screen" full-height>
    <NavBar />
    <NavDrawer />
    <v-main class="layout-main-content">
      <v-container class="layout-container">
        <slot name="default"></slot>
      </v-container>
    </v-main>
    <BottomNav />
  </v-app>
</template>

<script setup>
import NavDrawer from "@/components/Navigation/NavDrawer.vue";
import NavBar from "@/components/Navigation/NavBar.vue";
import BottomNav from "@/components/Navigation/BottomNav.vue";
</script>
<style>
.layout-main-content {
  min-height: 100dvh;
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

.layout-container {
  width: min(100%, 1120px);
  padding-inline: 16px;
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

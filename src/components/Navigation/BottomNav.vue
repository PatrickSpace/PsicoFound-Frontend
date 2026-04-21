<template>
  <v-bottom-navigation class="bottom-nav-mobile bg-transparent d-lg-none" grow>
    <v-btn
      v-for="(item, i) in items"
      :key="i"
      :value="item.name"
      :to="item.link"
      class="p-5"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span>{{ item.name }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>
    <script setup>
const items = [
  { name: "Inicio", icon: "mdi-home", link: "/dashboard" },
  { name: "Sesiones", icon: "mdi-calendar-month", link: "/sesiones" },
  { name: "Progreso", icon: "mdi-finance", link: "/progreso" },
  {
    name: "Historial",
    icon: "mdi-book-open-page-variant",
    link: "/historial",
  },
  { name: "Herramientas", icon: "mdi-tools", link: "/herramientas" },
];
</script>
<style scoped>
.bottom-nav-mobile {
  min-height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav-mobile :deep(.v-btn) {
  min-width: 0;
  padding-inline: 4px;
}

.bottom-nav-mobile :deep(.v-btn__content) {
  gap: 2px;
}

.bottom-nav-mobile :deep(span) {
  max-width: 64px;
  overflow: hidden;
  font-size: 0.68rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

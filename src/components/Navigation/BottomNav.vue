<template>
  <v-bottom-navigation
    class="bottom-nav-mobile bg-transparent d-lg-none"
    grow
  >
    <v-btn
      v-for="(item, i) in primaryItems"
      :key="i"
      :value="item.name"
      :to="item.link"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span>{{ item.name }}</span>
    </v-btn>
    <v-menu
      v-if="overflowItems.length"
      location="top end"
      offset="10"
    >
      <template #activator="{ props }">
        <v-btn v-bind="props" value="more">
          <v-icon>mdi-dots-horizontal</v-icon>
          <span>Más</span>
        </v-btn>
      </template>
      <v-list class="bottom-nav-menu" density="compact">
        <v-list-item
          v-for="item in overflowItems"
          :key="item.link"
          :prepend-icon="item.icon"
          :title="item.name"
          :to="item.link"
        />
      </v-list>
    </v-menu>
  </v-bottom-navigation>
</template>
<script setup>
import { computed } from "vue";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();

const navigationByMode = {
  patient: [
    { name: "Inicio", icon: "mdi-home", link: "/dashboard" },
    { name: "Sesiones", icon: "mdi-calendar-month", link: "/sesiones" },
    { name: "Progreso", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Historial",
      icon: "mdi-book-open-page-variant",
      link: "/historial",
    },
    { name: "Herram.", icon: "mdi-tools", link: "/herramientas" },
  ],
  psychologist: [
    { name: "Agenda", icon: "mdi-account-tie", link: "/psicologo/sesiones" },
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Seguim.", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Historial",
      icon: "mdi-book-open-page-variant",
      link: "/historial",
    },
    { name: "Herram.", icon: "mdi-tools", link: "/herramientas" },
  ],
  admin: [
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Psicólogos", icon: "mdi-account-heart", link: "/psicologos" },
  ],
};

const items = computed(
  () => navigationByMode[appContext.activeMode] || navigationByMode.patient
);

const primaryItems = computed(() => items.value.slice(0, 3));
const overflowItems = computed(() => items.value.slice(3));
</script>
<style scoped>
.bottom-nav-mobile {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  min-height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  width: 100%;
}

.bottom-nav-mobile :deep(.v-btn) {
  min-width: 0;
  padding-inline: 2px;
}

.bottom-nav-mobile :deep(.v-btn__content) {
  gap: 2px;
}

.bottom-nav-mobile :deep(span) {
  max-width: 74px;
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-nav-menu {
  background-color: rgba(18, 44, 47, 0.98) !important;
  color: white;
}
</style>

<template>
  <v-bottom-navigation
    class="bottom-nav-mobile bg-transparent d-lg-none"
    grow
    :style="{ '--bottom-nav-count': navItemCount }"
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
    { name: "Inicio", icon: "mdi-view-dashboard-outline", link: "/dashboard" },
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
const navItemCount = computed(() =>
  String(primaryItems.value.length + (overflowItems.value.length ? 1 : 0))
);
</script>
<style scoped>
.bottom-nav-mobile {
  backdrop-filter: blur(16px);
  background:
    linear-gradient(
      0deg,
      rgba(3, 7, 7, 0.78) 0%,
      rgba(3, 7, 7, 0.48) 78%,
      rgba(3, 7, 7, 0) 100%
    ) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  height: calc(72px + env(safe-area-inset-bottom)) !important;
  left: 0 !important;
  max-width: 100vw;
  min-height: calc(72px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  right: 0 !important;
  width: 100vw !important;
}

:global(.v-theme--light) .bottom-nav-mobile {
  background: rgba(248, 251, 249, 0.92) !important;
  border-top-color: rgba(18, 58, 53, 0.14);
  box-shadow: 0 -12px 32px rgba(18, 58, 53, 0.1);
}

.bottom-nav-mobile :deep(.v-bottom-navigation__content) {
  display: grid;
  grid-template-columns: repeat(var(--bottom-nav-count), minmax(0, 1fr));
  height: 72px;
  width: 100%;
}

.bottom-nav-mobile :deep(.v-btn) {
  background: transparent !important;
  height: 72px;
  min-width: 0;
  width: 100%;
  padding-inline: 2px;
}

.bottom-nav-mobile :deep(.v-btn::before),
.bottom-nav-mobile :deep(.v-btn__overlay) {
  display: none;
}

.bottom-nav-mobile :deep(.v-btn--selected) {
  color: rgb(var(--v-theme-secondary));
}

.bottom-nav-mobile :deep(.v-btn__content) {
  align-items: center;
  display: flex;
  gap: 3px;
  justify-content: center;
  min-width: 0;
  width: 100%;
}

.bottom-nav-mobile :deep(span) {
  max-width: min(78px, 21vw);
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-nav-menu {
  background-color: rgba(18, 44, 47, 0.98) !important;
}

:global(.v-theme--light) .bottom-nav-menu {
  background-color: rgba(248, 251, 250, 0.98) !important;
}

@media (max-width: 380px) {
  .bottom-nav-mobile :deep(span) {
    font-size: 0.66rem;
    max-width: 19vw;
  }
}
</style>

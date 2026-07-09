<template>
  <v-bottom-navigation
    class="bottom-nav-mobile bg-transparent d-lg-none"
    :class="`bottom-nav-mobile--${navItemCount}`"
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
    {
      name: "Solic.",
      icon: "mdi-account-clock-outline",
      link: "/admin/solicitudes-psicologos",
    },
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
  background: rgba(var(--v-theme-surface), 0.98) !important;
  border-top: 1px solid rgb(var(--v-theme-border-subtle));
  box-shadow: 0 -4px 16px rgba(26, 58, 56, 0.06);
  height: calc(72px + env(safe-area-inset-bottom)) !important;
  left: 0 !important;
  max-width: 100vw;
  min-height: calc(72px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  right: 0 !important;
  width: 100vw !important;
}

:global(.v-theme--light) .bottom-nav-mobile {
  background: rgba(var(--v-theme-surface), 0.98) !important;
  border-top-color: rgb(var(--v-theme-border-subtle));
}

.bottom-nav-mobile :deep(.v-bottom-navigation__content) {
  display: grid;
  height: 72px;
  width: 100%;
}

.bottom-nav-mobile--1 :deep(.v-bottom-navigation__content) {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.bottom-nav-mobile--2 :deep(.v-bottom-navigation__content) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bottom-nav-mobile--3 :deep(.v-bottom-navigation__content) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.bottom-nav-mobile--4 :deep(.v-bottom-navigation__content) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.bottom-nav-mobile--5 :deep(.v-bottom-navigation__content) {
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
  color: var(--color-primary-dark);
  background: var(--color-primary-soft) !important;
}

.bottom-nav-mobile :deep(.v-btn__content) {
  align-items: center;
  display: flex;
  gap: 3px;
  justify-content: center;
  min-width: 0;
  width: 100%;
  color: rgb(var(--v-theme-text-secondary));
  opacity: 0.9;
}

.bottom-nav-mobile :deep(.v-btn--selected .v-btn__content) {
  color: var(--color-primary-dark);
  opacity: 1;
}

.bottom-nav-mobile :deep(.v-btn--selected .v-icon) {
  color: var(--color-primary-dark);
  opacity: 1;
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
  background-color: rgba(var(--v-theme-surface-elevated), 0.98) !important;
}

:global(.v-theme--light) .bottom-nav-menu {
  background-color: rgb(var(--v-theme-surface)) !important;
}

@media (max-width: 380px) {
  .bottom-nav-mobile :deep(span) {
    font-size: 0.66rem;
    max-width: 19vw;
  }
}
</style>

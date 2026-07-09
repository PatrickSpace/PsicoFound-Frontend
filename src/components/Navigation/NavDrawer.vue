<template>
  <v-navigation-drawer
    v-if="lgAndUp"
    floating
    class="bg-transparent"
    width="320"
    app
  >
    <div class="nav-drawer-content fill-height d-flex flex-column">
      <div class="mode-summary">
        <v-chip
          v-if="activeMode"
          color="secondary"
          variant="tonal"
          :prepend-icon="activeMode.icon"
        >
          {{ activeMode.label }}
        </v-chip>
      </div>
      <v-list
        class="nav-list d-inline-flex w-100 flex-column justify-center"
        nav
        variant="text"
      >
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          class="py-4 pl-5 my-1"
          :prepend-icon="item.icon"
          :to="item.link"
          rounded="lg"
        >
          <p>{{ item.name }}</p>
        </v-list-item>
      </v-list>
    </div>
  </v-navigation-drawer>
</template>
<script setup>
import { computed } from "vue";
import { useDisplay } from "vuetify";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const { lgAndUp } = useDisplay();

const navigationByMode = {
  patient: [
    { name: "Home", icon: "mdi-view-dashboard-outline", link: "/dashboard" },
    { name: "Mis sesiones", icon: "mdi-calendar-month", link: "/sesiones" },
    { name: "Progreso en terapia", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Historial de terapias",
      icon: "mdi-book-open-page-variant",
      link: "/historial",
    },
    {
      name: "Herramientas aprendidas",
      icon: "mdi-tools",
      link: "/herramientas",
    },
  ],
  psychologist: [
    { name: "Agenda", icon: "mdi-account-tie", link: "/psicologo/sesiones" },
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Seguimiento", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Historial clínico",
      icon: "mdi-book-open-page-variant",
      link: "/historial",
    },
    {
      name: "Herramientas",
      icon: "mdi-tools",
      link: "/herramientas",
    },
  ],
  admin: [
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Psicólogos", icon: "mdi-account-heart", link: "/psicologos" },
    {
      name: "Solicitudes",
      icon: "mdi-account-clock-outline",
      link: "/admin/solicitudes-psicologos",
    },
  ],
};

const items = computed(
  () => navigationByMode[appContext.activeMode] || navigationByMode.patient
);

const activeMode = computed(
  () =>
    appContext.availableModes.find(
      (mode) => mode.value === appContext.activeMode
    ) || null
);
</script>

<style scoped>
.nav-drawer-content {
  justify-content: center;
  padding-inline: 40px 32px;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgb(var(--v-theme-border-subtle));
}

:global(.v-theme--light) .nav-drawer-content {
  background: rgb(var(--v-theme-surface));
  border-right-color: rgb(var(--v-theme-border-subtle));
  box-shadow: none;
}

.mode-summary {
  margin-bottom: 16px;
  padding-left: 8px;
}

.nav-list {
  padding-left: 0;
}

.nav-list :deep(.v-list-item--active) {
  background-color: var(--color-primary-soft) !important;
  color: var(--color-primary-dark) !important;
}

:global(.v-theme--light) .nav-list :deep(.v-list-item--active) {
  background-color: var(--color-primary-soft) !important;
  color: var(--color-primary-dark) !important;
}

:global(.v-theme--light) .nav-list :deep(.v-list-item) {
  color: rgb(var(--v-theme-text-secondary));
}

.nav-list :deep(.v-list-item .v-icon),
.nav-list :deep(.v-list-item p) {
  color: currentColor !important;
  opacity: 1;
}

.nav-list :deep(.v-list-item--active .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>

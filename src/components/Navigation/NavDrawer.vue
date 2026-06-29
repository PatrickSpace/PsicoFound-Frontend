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
    { name: "Home", icon: "mdi-home", link: "/dashboard" },
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
}

:global(.v-theme--light) .nav-drawer-content {
  background:
    linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.72) 0%,
      rgba(255, 255, 255, 0.52) 74%,
      rgba(255, 255, 255, 0) 100%
    );
  border-right: 1px solid rgba(23, 63, 58, 0.08);
  box-shadow: 16px 0 42px rgba(23, 63, 58, 0.06);
}

.mode-summary {
  margin-bottom: 16px;
  padding-left: 8px;
}

.nav-list {
  padding-left: 0;
}

.nav-list :deep(.v-list-item--active) {
  background-color: rgba(255, 255, 255, 0.12);
}

:global(.v-theme--light) .nav-list :deep(.v-list-item--active) {
  background-color: rgba(55, 111, 101, 0.12);
  color: rgb(var(--v-theme-primary));
}

:global(.v-theme--light) .nav-list :deep(.v-list-item) {
  color: rgba(23, 38, 34, 0.78);
}
</style>

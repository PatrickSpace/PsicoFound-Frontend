<template>
  <v-navigation-drawer
    v-if="lgAndUp"
    floating
    class="app-nav-drawer bg-transparent"
    width="320"
    app
  >
    <div class="nav-drawer-content fill-height d-flex flex-column">
      <RouterLink class="drawer-brand" to="/dashboard" aria-label="Ir al inicio de Lurems">
        <img
          src="/brand/lurems-logo-principal-transparent.png"
          alt="Lurems"
          class="drawer-brand__image"
        />
      </RouterLink>
      <v-list
        class="nav-list d-inline-flex w-100 flex-column justify-center"
        nav
        variant="text"
      >
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          class="nav-list-item my-2"
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
import { RouterLink } from "vue-router";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const { lgAndUp } = useDisplay();

const adminRequestsItem = {
  name: "Solicitudes",
  icon: "mdi-account-clock-outline",
  link: "/admin/solicitudes-psicologos",
};

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
    adminRequestsItem,
  ],
};

const items = computed(() => {
  const baseItems =
    navigationByMode[appContext.activeMode] || navigationByMode.patient;

  if (
    !appContext.isAdmin ||
    baseItems.some((item) => item.link === adminRequestsItem.link)
  ) {
    return baseItems;
  }

  return [...baseItems, adminRequestsItem];
});

</script>

<style scoped>
.app-nav-drawer {
  z-index: 1200 !important;
}

.nav-drawer-content {
  background: rgb(var(--v-theme-surface));
  border-right: 0;
  justify-content: flex-start;
  padding: 32px 32px 40px 40px;
}

:global(.v-theme--light) .nav-drawer-content {
  background: rgb(var(--v-theme-surface));
  box-shadow: none;
}

.drawer-brand {
  align-items: center;
  display: flex;
  margin-bottom: 34px;
  min-height: 76px;
  padding-left: 4px;
}

.drawer-brand__image {
  display: block;
  height: auto;
  max-width: 210px;
  object-fit: contain;
  object-position: left center;
  width: 100%;
}

.nav-list {
  flex: 1 1 auto;
  gap: 18px;
  justify-content: center;
  padding-left: 0;
}

.nav-list-item {
  border-radius: 14px !important;
  color: rgb(var(--v-theme-text-secondary)) !important;
  font-size: 1.05rem;
  font-weight: 800;
  min-height: 74px;
  padding: 12px 20px !important;
}

.nav-list :deep(.v-list-item--active) {
  background-color: var(--color-primary) !important;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-primary) 26%, transparent);
  color: #ffffff !important;
}

:global(.v-theme--light) .nav-list :deep(.v-list-item--active) {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
}

:global(.v-theme--light) .nav-list :deep(.v-list-item) {
  color: rgb(var(--v-theme-text-secondary));
}

.nav-list :deep(.v-list-item__prepend) {
  align-items: center;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 12px;
  display: inline-flex;
  height: 48px;
  justify-content: center;
  margin-right: 20px;
  min-width: 48px;
  width: 48px;
}

.nav-list :deep(.v-list-item__prepend > .v-icon) {
  margin-inline-end: 0;
}

.nav-list :deep(.v-list-item__spacer) {
  display: none;
}

.nav-list :deep(.v-list-item--active .v-list-item__prepend) {
  background: rgba(255, 255, 255, 0.16);
}

.nav-list :deep(.v-list-item .v-icon),
.nav-list :deep(.v-list-item p) {
  color: currentColor !important;
  opacity: 1;
}

.nav-list :deep(.v-list-item p) {
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: 0;
}

.nav-list :deep(.v-list-item--active .v-list-item__overlay) {
  background: transparent !important;
  opacity: 0 !important;
}
</style>

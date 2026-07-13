<template>
  <v-navigation-drawer
    v-if="lgAndUp"
    floating
    class="app-nav-drawer bg-transparent"
    :class="{ 'app-nav-drawer--collapsed': isCollapsed }"
    :width="drawerWidth"
    app
  >
    <div class="nav-drawer-content fill-height d-flex flex-column">
      <div class="drawer-header">
        <RouterLink
          class="drawer-brand"
          :class="{ 'drawer-brand--compact': isCollapsed }"
          to="/dashboard"
          aria-label="Ir al inicio de Lurems"
        >
          <img
            :src="drawerLogoSrc"
            alt="Lurems"
            class="drawer-brand__image"
          />
        </RouterLink>
        <v-btn
          class="drawer-collapse-btn"
          icon
          variant="text"
          size="small"
          :aria-label="drawerToggleLabel"
          :title="drawerToggleLabel"
          @click="toggleCollapsed"
        >
          <v-icon :icon="isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'" />
        </v-btn>
      </div>
      <v-container class="nav-list-viewport d-flex pa-0" fluid>
        <v-list
          class="nav-list d-flex w-100 flex-column"
          nav
          variant="text"
        >
          <v-tooltip
            v-for="(item, i) in items"
            :key="item.link || i"
            :disabled="!isCollapsed"
            location="right"
          >
            <template #activator="{ props }">
              <v-list-item
                v-bind="props"
                class="nav-list-item"
                :prepend-icon="item.icon"
                :to="item.link"
                :aria-label="item.name"
                rounded="lg"
              >
                <p class="nav-list-item__label">{{ item.name }}</p>
              </v-list-item>
            </template>
            <span>{{ item.name }}</span>
          </v-tooltip>
        </v-list>
      </v-container>
    </div>
  </v-navigation-drawer>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { RouterLink } from "vue-router";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const { lgAndUp } = useDisplay();
const DRAWER_STORAGE_KEY = "lurems-nav-drawer-collapsed";
const EXPANDED_DRAWER_WIDTH = 320;
const COLLAPSED_DRAWER_WIDTH = 96;

const readStoredCollapsedState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DRAWER_STORAGE_KEY) === "true";
};

const isCollapsed = ref(readStoredCollapsedState());
const drawerWidth = computed(() =>
  isCollapsed.value ? COLLAPSED_DRAWER_WIDTH : EXPANDED_DRAWER_WIDTH
);
const drawerLogoSrc = computed(() =>
  isCollapsed.value
    ? "/brand/lurems-isotipo-transparent.png"
    : "/brand/lurems-logo-principal-transparent.png"
);
const drawerToggleLabel = computed(() =>
  isCollapsed.value ? "Expandir navegación" : "Contraer navegación"
);

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};

watch(
  drawerWidth,
  (width) => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--app-drawer-width", `${width}px`);
  },
  { immediate: true }
);

watch(isCollapsed, (value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAWER_STORAGE_KEY, String(value));
});

const adminRequestsItem = {
  name: "Solicitudes",
  icon: "mdi-account-clock-outline",
  link: "/admin/solicitudes-psicologos",
};

const adminUsersItem = {
  name: "Usuarios",
  icon: "mdi-account-cog-outline",
  link: "/admin/usuarios",
};

const navigationByMode = {
  patient: [
    { name: "Home", icon: "mdi-view-dashboard-outline", link: "/dashboard" },
    { name: "Mis sesiones", icon: "mdi-calendar-month", link: "/sesiones" },
    {
      name: "Registro emocional",
      icon: "mdi-emoticon-outline",
      link: "/registro-emocional",
    },
    { name: "Progreso en terapia", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Herramientas aprendidas",
      icon: "mdi-tools",
      link: "/herramientas",
    },
    {
      name: "Historial de terapias",
      icon: "mdi-book-open-page-variant",
      link: "/historial",
    },
  ],
  psychologist: [
    { name: "Agenda", icon: "mdi-account-tie", link: "/psicologo/sesiones" },
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Seguimiento", icon: "mdi-finance", link: "/progreso" },
    {
      name: "Registros emocionales",
      icon: "mdi-emoticon-outline",
      link: "/registro-emocional",
    },
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
    adminRequestsItem,
    adminUsersItem,
    { name: "Pacientes", icon: "mdi-account-group", link: "/pacientes" },
    { name: "Psicólogos", icon: "mdi-account-heart", link: "/psicologos" },
  ],
};

const items = computed(
  () => navigationByMode[appContext.activeMode] || navigationByMode.patient
);
</script>

<style scoped>
.app-nav-drawer {
  transition: width 180ms ease;
  z-index: 1200 !important;
}

.nav-drawer-content {
  background: rgb(var(--v-theme-surface));
  border-right: 0;
  justify-content: flex-start;
  min-height: 0;
  overflow: hidden;
  padding: 32px 32px 40px 40px;
  transition: padding 180ms ease;
}

:global(.v-theme--light .nav-drawer-content) {
  background: rgb(var(--v-theme-surface));
  box-shadow: none;
}

.drawer-header {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 34px;
  min-height: 76px;
}

.drawer-brand {
  align-items: center;
  display: flex;
  padding-left: 4px;
  transition: width 180ms ease, padding 180ms ease;
}

.drawer-brand__image {
  display: block;
  height: auto;
  max-width: 210px;
  object-fit: contain;
  object-position: left center;
  transition: max-width 180ms ease, width 180ms ease;
  width: 100%;
}

.drawer-collapse-btn {
  color: rgb(var(--v-theme-text-secondary)) !important;
  flex: 0 0 auto;
}

.nav-list-viewport {
  flex: 1 1 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 6px !important;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
}

.nav-list {
  align-content: flex-start;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-start;
  margin-block: auto;
  padding: 2px 0;
}

.nav-list-item {
  border-radius: 14px !important;
  color: rgb(var(--v-theme-text-secondary)) !important;
  font-size: 1.05rem;
  font-weight: 800;
  flex: 0 0 auto;
  min-height: 60px;
  padding: 8px 16px !important;
  transition:
    min-height 180ms ease,
    padding 180ms ease,
    width 180ms ease;
}

.nav-list-item__label {
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 120ms ease, width 180ms ease;
  white-space: nowrap;
}

.nav-list :deep(.v-list-item--active) {
  background-color: var(--color-primary) !important;
  box-shadow: none !important;
  color: #ffffff !important;
}

:global(.v-theme--light .nav-list .v-list-item--active) {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
}

:global(.v-theme--light .nav-list .v-list-item) {
  color: rgb(var(--v-theme-text-secondary));
}

.nav-list :deep(.v-list-item__prepend) {
  align-items: center;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-radius: 12px;
  display: inline-flex;
  height: 42px;
  justify-content: center;
  margin-right: 16px;
  min-width: 42px;
  width: 42px;
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

.nav-list-viewport::-webkit-scrollbar {
  width: 6px;
}

.nav-list-viewport::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-primary) 32%, transparent);
  border-radius: 999px;
}

.app-nav-drawer--collapsed .nav-drawer-content {
  align-items: center;
  padding: 24px 16px 32px;
}

.app-nav-drawer--collapsed .drawer-header {
  flex-direction: column;
  gap: 14px;
  justify-content: flex-start;
  margin-bottom: 28px;
  min-height: 106px;
}

.app-nav-drawer--collapsed .drawer-brand {
  justify-content: center;
  padding-left: 0;
  width: 56px;
}

.app-nav-drawer--collapsed .drawer-brand__image {
  max-width: 46px;
  object-position: center;
  width: 46px;
}

.app-nav-drawer--collapsed .nav-list-viewport {
  padding-right: 0 !important;
}

.app-nav-drawer--collapsed .nav-list {
  align-items: center;
  gap: 14px;
}

.app-nav-drawer--collapsed .nav-list-item {
  align-items: center;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent) !important;
  border-radius: 18px !important;
  display: flex;
  justify-content: center;
  min-height: 64px;
  padding: 0 !important;
  width: 64px;
}

.app-nav-drawer--collapsed .nav-list :deep(.v-list-item__prepend) {
  align-items: center;
  background: transparent;
  border-radius: 0;
  display: flex;
  height: auto;
  justify-content: center;
  margin-inline: 0;
  min-width: 0;
  width: auto;
}

.app-nav-drawer--collapsed .nav-list :deep(.v-list-item__content) {
  display: none;
}

.app-nav-drawer--collapsed .nav-list :deep(.v-list-item__prepend > .v-icon) {
  font-size: 1.75rem;
}

.app-nav-drawer--collapsed .nav-list :deep(.v-list-item--active) {
  background: var(--color-primary) !important;
}

.app-nav-drawer--collapsed .nav-list :deep(.v-list-item--active .v-list-item__prepend) {
  background: transparent;
}

.app-nav-drawer--collapsed .nav-list-item__label {
  opacity: 0;
  width: 0;
}

@media (max-height: 850px) and (min-width: 1280px) {
  .nav-drawer-content {
    padding-bottom: 24px;
    padding-top: 20px;
  }

  .drawer-header {
    margin-bottom: 18px;
    min-height: 60px;
  }

  .drawer-brand__image {
    max-width: 180px;
  }

  .nav-list {
    gap: 6px;
  }

  .nav-list-item {
    font-size: 1rem;
    min-height: 56px;
    padding-block: 6px !important;
  }

  .app-nav-drawer--collapsed .drawer-header {
    min-height: 96px;
  }
}
</style>

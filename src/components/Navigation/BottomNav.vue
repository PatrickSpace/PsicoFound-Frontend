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
    <v-btn
      v-if="overflowItems.length"
      class="bottom-nav-more"
      :class="{ 'bottom-nav-more--active': isOverflowActive || isOverflowOpen }"
      value="more"
      @click.stop.prevent="toggleOverflow"
    >
      <v-icon>mdi-dots-horizontal</v-icon>
      <span>Más</span>
    </v-btn>
    <Teleport to="body">
      <div
        v-if="isOverflowOpen"
        class="bottom-nav-popover"
        @click.stop
      >
        <v-list-item
          v-for="item in overflowItems"
          :key="item.link"
          class="bottom-nav-popover__item"
          :prepend-icon="item.icon"
          :title="item.name"
          :to="item.link"
          @click="closeOverflow"
        />
      </div>
    </Teleport>
  </v-bottom-navigation>
</template>
<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();
const route = useRoute();
const isOverflowOpen = ref(false);

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
const isOverflowActive = computed(() =>
  overflowItems.value.some((item) => item.link === route.path)
);

function closeOverflow() {
  isOverflowOpen.value = false;
}

function toggleOverflow() {
  isOverflowOpen.value = !isOverflowOpen.value;
}

function handleOutsidePointerDown(event) {
  if (!isOverflowOpen.value) return;

  const target = event.target;
  if (
    target?.closest?.(".bottom-nav-popover") ||
    target?.closest?.(".bottom-nav-more")
  ) {
    return;
  }

  closeOverflow();
}

watch(isOverflowOpen, (isOpen) => {
  const action = isOpen ? "addEventListener" : "removeEventListener";
  document[action]("pointerdown", handleOutsidePointerDown, true);
});

watch(() => route.fullPath, closeOverflow);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
});
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

.bottom-nav-more--active :deep(.v-btn__content) {
  color: var(--color-primary-dark);
  opacity: 1;
}

:global(.bottom-nav-popover) {
  position: fixed;
  right: max(14px, env(safe-area-inset-right));
  bottom: calc(82px + env(safe-area-inset-bottom));
  z-index: 2400;
  min-width: 152px;
  padding: 10px;
  border: 1px solid rgba(69, 169, 154, 0.2);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.48);
  box-shadow: 0 16px 38px rgba(26, 58, 56, 0.14);
  backdrop-filter: blur(8px) saturate(1.06);
  -webkit-backdrop-filter: blur(8px) saturate(1.06);
}

:global(.v-theme--dark) :global(.bottom-nav-popover) {
  border-color: rgba(160, 224, 216, 0.22);
  background: rgba(26, 58, 56, 0.62);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
}

:global(.bottom-nav-popover__item) {
  min-height: 46px !important;
  border-radius: 14px !important;
  color: rgb(var(--v-theme-text-primary)) !important;
}

:global(.bottom-nav-popover__item:hover),
:global(.bottom-nav-popover__item.v-list-item--active) {
  background: rgba(var(--v-theme-surface-hover), 0.18) !important;
}

@media (max-width: 380px) {
  .bottom-nav-mobile :deep(span) {
    font-size: 0.66rem;
    max-width: 19vw;
  }
}
</style>

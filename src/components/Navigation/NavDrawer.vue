<template>
  <v-navigation-drawer
    floating
    theme="dark"
    class="d-none d-lg-flex bg-transparent"
    width="320"
    app
  >
    <div class="my-auto fill-height d-flex ml-10">
      <v-list
        class="pl-10 d-inline-flex w-100 flex-column justify-center"
        nav
        variant="text"
      >
        <v-list-item
        v-for="(item, i) in items"
          :key="i"
          class="py-5 pl-5 my-2"
          :prepend-icon="item.icon"
          :to="item.link"
        >
          <p class="">{{ item.name }}</p>
        </v-list-item>
      </v-list>
    </div>
  </v-navigation-drawer>
</template>
<script setup>
import { computed } from "vue";
import { useAppContextStore } from "@/store/appContext";

const appContext = useAppContextStore();

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
</script>

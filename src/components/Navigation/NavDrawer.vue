<script setup>
</script>
<template>
  <v-navigation-drawer
    floating
    id="navd"
    theme="dark"
    class="d-none d-lg-flex"
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
<style>
#navd {
  background: transparent;
  /*linear-gradient(to left bottom, #4a9ba7, #0d1c1e);*/
}
</style>
<script setup>
const items = [
  { name: "Home", icon: "mdi-home", link: "/dashboard" },
  { name: "Mis sesiones", icon: "mdi-calendar-month", link: "/sesiones" },
  { name: "Progreso en terapia", icon: "mdi-finance", link: "/progreso" },
  {
    name: "Historial de terapias",
    icon: "mdi-book-open-page-variant",
    link: "/historial",
  },
  { name: "Herramientas aprendidas", icon: "mdi-tools", link: "/herramientas" },
];
</script>

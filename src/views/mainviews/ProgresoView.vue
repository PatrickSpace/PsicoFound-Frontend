<template>
  <LayoutDefault layout>
    <v-container>
      <h1 class="text-h4">Progreso</h1>
      <v-divider class="my-5 mx-auto"></v-divider>

      <CitasDatatable />
    </v-container>
  </LayoutDefault>
</template>
<script setup>
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
import CitasDatatable from "@/components/Terapias/CitasDatatable.vue";
</script>

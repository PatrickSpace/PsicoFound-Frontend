<template>
  <v-app class="screen h-screen">
    <v-app-bar app class="px-15" color="transparent" dark :elevation="0">
      <v-app-bar-title class="text-white">
        <MainLogo />
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <!--
      <v-btn to="/encuesta" append-icon="mdi-arrow-left" class="text-white text-body-1 my-5" variant="text" size="large">
        Reiniciar busqueda
      </v-btn>
      <v-btn append-icon="mdi-refresh" class="text-white text-body-1 my-5" variant="text" size="large">
        Explorar otras opciones
      </v-btn>
      <v-btn append-icon="mdi-arrow-top-right" class="text-white text-body-1 my-5" variant="text" size="large"
        to="psicologos">
        Buscar terapeuta por nombre
      </v-btn>
      -->
    </v-app-bar>
    <v-main>
      <v-alert
        v-if="isCrisisMode"
        class="ma-6"
        color="error"
        variant="tonal"
        icon="mdi-alert-circle-outline"
        title="Ayuda urgente disponible"
      >
        Si estás en Perú y necesitas apoyo urgente en salud mental, llama gratis
        a la Línea 113 Salud, opción 5, disponible las 24 horas. Si estás en
        peligro inmediato, contacta emergencias o acude al establecimiento de
        salud más cercano.
      </v-alert>
      <TerapeutaLista :terapeutas="therapists" />
    </v-main>
  </v-app>
</template>

<script setup>
import MainLogo from "@/components/Common/MainLogo.vue";
import TerapeutaLista from "@/components/encuesta/TerapeutaLista.vue";
import { useTerapiaStore } from "@/store/terapiaStore";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getTherapists } from "@/services/psicologoService";
const terapiaStore = useTerapiaStore();
const route = useRoute();
const therapists = ref([]);
const isCrisisMode = computed(() => route.query.crisis === "1");

async function buscarTerapeutas() {
  try {
    const therapistsFromDb = await getTherapists();
    const activeTherapists = therapistsFromDb.filter(
      (therapist) => therapist.activo !== false
    );
    const results = terapiaStore.buscarterapeutas(activeTherapists);
    terapiaStore.setTopTerapeutas(results);
    therapists.value = terapiaStore.getTopTerapeutas();
  } catch (error) {
    console.error("Error buscando terapeutas:", error);
    therapists.value = [];
    terapiaStore.setTopTerapeutas([]);
  }
}

async function buscarnuevosterapeutas() {
  terapiaStore.resetCriterios();
  await buscarTerapeutas();
}

onMounted(() => {
  buscarTerapeutas();
});

</script>
<style></style>

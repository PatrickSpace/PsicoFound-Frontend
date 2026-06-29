<template>
  <LayoutDefault layout>
    <v-theme-provider theme="dark">
      <v-container>
        <h1>Psicologos</h1>
        <v-divider></v-divider>
        <v-form v-model="valid" class="my-5">
          <v-row>
            <v-col class="d-flex">
              <v-combobox class="mx-2" color="secondary" variant="outlined" label="especialidad" clearable chips
                multiple :items="[
                  'Abuso de sustancias',
                  'Ansiedad',
                  'Depresión',
                  'Trauma infatil',
                  'Ansiedad social',
                ]"></v-combobox>
              <v-combobox class="mx-2" color="secondary" variant="outlined" label="enfoque" clearable
                :items="['Humanista', 'Cognitivo-Conductual', 'Psicoanalisis']"></v-combobox>
              <v-combobox class="mx-2" color="secondary" variant="outlined" label="genero" clearable
                :items="['Hombre', 'Mujer', 'Me es indiferente']"></v-combobox>
              <v-combobox class="mx-2" color="secondary" variant="outlined" clearable label="Modalidad"
                :items="['Online', 'Presencial', 'Hiibrido']"></v-combobox>
              <v-combobox class="mx-2" color="secondary" variant="outlined" clearable label="edad"
                :items="['18-25', '25-35', '35-45', '+ 45']"></v-combobox>
            </v-col>
          </v-row>
        </v-form>
        <DataTablePsicologos />
      </v-container>
    </v-theme-provider>
  </LayoutDefault>
</template>
<script setup>
import { ref } from 'vue'
const valid = ref(false);
import DataTablePsicologos from "@/components/Psicologos/DataTablePsicologos.vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
</script>

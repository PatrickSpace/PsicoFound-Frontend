<template>
  <LayoutDefault layout>
    <v-container class="pa-0">
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4 mb-5">
        <div>
          <h1 class="text-h4 font-weight-bold">Psicólogos</h1>
          <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
            Gestiona el directorio profesional, disponibilidad y criterios de búsqueda.
          </p>
        </div>
      </div>

      <v-card class="pa-4 mb-5 card-backgoundcustom" elevation="2" variant="text">
        <div class="d-flex align-center ga-2 mb-4">
          <v-icon color="secondary">mdi-filter-variant</v-icon>
          <h2 class="text-h6 font-weight-bold">Filtros</h2>
        </div>

        <v-form v-model="valid">
          <v-row dense>
            <v-col cols="12" md="6" lg="3">
              <v-combobox
                color="secondary"
                variant="outlined"
                density="comfortable"
                label="Especialidad"
                clearable
                chips
                multiple
                :items="[
                'Abuso de sustancias',
                'Ansiedad',
                'Depresión',
                'Trauma infatil',
                'Ansiedad social',
              ]"
              />
            </v-col>

            <v-col cols="12" md="6" lg="3">
              <v-combobox
                color="secondary"
                variant="outlined"
                density="comfortable"
                label="Enfoque"
                clearable
                :items="['Humanista', 'Cognitivo-Conductual', 'Psicoanálisis']"
              />
            </v-col>

            <v-col cols="12" md="6" lg="2">
              <v-combobox
                color="secondary"
                variant="outlined"
                density="comfortable"
                label="Género"
                clearable
                :items="['Hombre', 'Mujer', 'Me es indiferente']"
              />
            </v-col>

            <v-col cols="12" md="6" lg="2">
              <v-combobox
                color="secondary"
                variant="outlined"
                density="comfortable"
                label="Modalidad"
                clearable
                :items="['Online', 'Presencial', 'Híbrido']"
              />
            </v-col>

            <v-col cols="12" md="6" lg="2">
              <v-combobox
                color="secondary"
                variant="outlined"
                density="comfortable"
                label="Edad"
                clearable
                :items="['25-35', '35-45', '+ 45']"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card>

      <DataTablePsicologos />
    </v-container>
  </LayoutDefault>
</template>
<script setup>
import { ref } from "vue";
const valid = ref(false);
import DataTablePsicologos from "@/components/Psicologos/DataTablePsicologos.vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
</script>

<template>
  <LayoutDefault layout>
    <v-theme-provider theme="light">
      <v-container>
        <h1>Psicologos</h1>
        <v-divider></v-divider>
        <v-form v-model="valid" class="my-5">
          <v-row>
            <v-col class="d-flex">
              <v-combobox class="mx-2" color="cyan-darken-3" variant="outlined" label="especialidad" clearable chips
                multiple :items="[
                  'Abuso de sustancias',
                  'Ansiedad',
                  'Depresión',
                  'Trauma infatil',
                  'Ansiedad social',
                ]"></v-combobox>
              <v-combobox class="mx-2" color="cyan-darken-3" variant="outlined" label="enfoque" clearable
                :items="['Humanista', 'Cognitivo-Conductual', 'Psicoanalisis']"></v-combobox>
              <v-combobox class="mx-2" color="cyan-darken-3" variant="outlined" label="genero" clearable
                :items="['Hombre', 'Mujer', 'Me es indiferente']"></v-combobox>
              <v-combobox class="mx-2" color="cyan-darken-3" variant="outlined" clearable label="Modalidad"
                :items="['Online', 'Presencial', 'Hiibrido']"></v-combobox>
              <v-combobox class="mx-2" color="cyan-darken-3" variant="outlined" clearable label="edad"
                :items="['18-25', '25-35', '35-45', '+ 45']"></v-combobox>
            </v-col>
          </v-row>
        </v-form>
        <DataTablePsicologos :data="incialDataPs" />
      </v-container>
    </v-theme-provider>
  </LayoutDefault>
</template>
<script setup>
import { ref } from 'vue'
const valid = ref(false);
import DataTablePsicologos from "@/components/Psicologos/DataTablePsicologos.vue";
import LayoutDefault from "@/components/Layout/Layoutmain.vue";
const incialDataPs = [
  {
    nombre: "Alejandra",
    enfoque: ["Cognitivo conductual", "Humanista"],
    especialidad: ["Ansiedad", "Depresión", "Ansiedad social"],
    edad: 24,
    color: "rojo",
  },
  {
    nombre: "Rodrigo",
    enfoque: ["Cognitivo conductual", "Humanista"],
    especialidad: ["Ansiedad", "Depresión", "Trauma infatil"],
    edad: 24,
    color: "azul",
  },
  {
    nombre: "Arturo",
    enfoque: ["Cognitivo conductual", "Humanista"],
    especialidad: ["Ansiedad", "Depresión", "Abuso de sustancias"],
    edad: 24,
    color: "azul",
  },
  {
    nombre: "Lucia",
    enfoque: ["Psicoanalisis", "Humanista"],
    especialidad: ["Trauma infatil", "Ansiedad social", "Ansiedad"],
    edad: 30,
    color: "verde",
  },
  {
    nombre: "Carlos",
    enfoque: ["Cognitivo conductual"],
    especialidad: ["Abuso de sustancias", "Ansiedad", "Depresión"],
    edad: 40,
    color: "amarillo",
  },
  {
    nombre: "Mariana",
    enfoque: ["Humanista"],
    especialidad: ["Depresión", "Ansiedad", "Trauma infatil"],
    edad: 28,
    color: "naranja",
  },
  {
    nombre: "Fernando",
    enfoque: ["Psicoanalisis"],
    especialidad: ["Ansiedad", "Trauma infatil", "Ansiedad social"],
    edad: 35,
    color: "morado",
  },
  {
    nombre: "Sofia",
    enfoque: ["Cognitivo conductual", "Humanista"],
    especialidad: ["Ansiedad social", "Ansiedad", "Depresión"],
    edad: 27,
    color: "rosa",
  },
  {
    nombre: "Javier",
    enfoque: ["Humanista"],
    especialidad: ["Depresión", "Ansiedad", "Trauma infatil"],
    edad: 32,
    color: "gris",
  },
  {
    nombre: "Laura",
    enfoque: ["Psicoanalisis", "Cognitivo conductual"],
    especialidad: ["Abuso de sustancias", "Ansiedad social", "Ansiedad"],
    edad: 29,
    color: "azul",
  },
  {
    nombre: "Miguel",
    enfoque: ["Humanista"],
    especialidad: ["Trauma infatil", "Ansiedad", "Depresión"],
    edad: 45,
    color: "rojo",
  },
  {
    nombre: "Ana",
    enfoque: ["Cognitivo conductual"],
    especialidad: ["Ansiedad", "Depresión", "Ansiedad social"],
    edad: 26,
    color: "verde",
  },
  {
    nombre: "Luis",
    enfoque: ["Psicoanalisis"],
    especialidad: ["Ansiedad social", "Ansiedad", "Depresión"],
    edad: 38,
    color: "amarillo",
  },
  {
    nombre: "Elena",
    enfoque: ["Humanista", "Cognitivo conductual"],
    especialidad: ["Abuso de sustancias", "Depresión", "Ansiedad"],
    edad: 31,
    color: "naranja",
  },
  {
    nombre: "Pablo",
    enfoque: ["Cognitivo conductual"],
    especialidad: ["Ansiedad", "Trauma infatil", "Depresión"],
    edad: 34,
    color: "morado",
  },
  {
    nombre: "Claudia",
    enfoque: ["Psicoanalisis"],
    especialidad: ["Ansiedad social", "Depresión", "Ansiedad"],
    edad: 29,
    color: "rosa",
  },
  {
    nombre: "Diego",
    enfoque: ["Humanista"],
    especialidad: ["Abuso de sustancias", "Ansiedad", "Depresión"],
    edad: 36,
    color: "gris",
  },
  {
    nombre: "Valeria",
    enfoque: ["Cognitivo conductual", "Humanista"],
    especialidad: ["Depresión", "Trauma infatil", "Ansiedad"],
    edad: 33,
    color: "azul",
  },
  {
    nombre: "Andres",
    enfoque: ["Psicoanalisis"],
    especialidad: ["Ansiedad social", "Abuso de sustancias", "Ansiedad"],
    edad: 37,
    color: "rojo",
  },
  {
    nombre: "Gabriela",
    enfoque: ["Humanista"],
    especialidad: ["Ansiedad", "Depresión", "Trauma infatil"],
    edad: 28,
    color: "verde",
  },
  {
    nombre: "Ricardo",
    enfoque: ["Cognitivo conductual"],
    especialidad: ["Trauma infatil", "Ansiedad social", "Ansiedad"],
    edad: 41,
    color: "amarillo",
  },
  {
    nombre: "Isabel",
    enfoque: ["Psicoanalisis", "Humanista"],
    especialidad: ["Abuso de sustancias", "Depresión", "Ansiedad"],
    edad: 30,
    color: "naranja",
  },
];
</script>
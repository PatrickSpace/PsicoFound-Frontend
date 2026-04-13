<template>
  <div>
    <v-stepper v-model="e1" class="bg-transparent elevation-0" non-linear>
      <template v-slot:default="{ prev, next }">
        <v-stepper-header class="elevation-0" color="white">
          <template v-for="paso in pasos" :key="paso.key">
            <v-stepper-item
              :title="paso.value"
              :complete="e1 > paso.n"
              :step="`Step {{ paso.n }}`"
              :value="paso.n"
              color="white"
              editable
            ></v-stepper-item>
            <v-divider v-if="paso.n !== steps" :key="paso.n"></v-divider>
          </template>
        </v-stepper-header>
        <v-stepper-window>
          <v-stepper-window-item :value="1">
            <v-card class="bg-transparent w-100">
              <h1 class="text-h5 text-center">¿Que probema deseas resolver?</h1>
              <v-container class="mx-auto w-50 mt-5 text-center">
                <v-combobox
                  v-model="especialidad"
                  chips
                  multiple
                  :items="especialidades"
                ></v-combobox>
                <v-btn to="/elegirterapeuta" @click="conversarConAlguien" variant="text"
                  >Solo quiero conversar con alguien</v-btn
                >
              </v-container>
            </v-card>
          </v-stepper-window-item>

          <v-stepper-window-item :value="2">
            <v-card class="bg-transparent w-100">
              <h1 class="text-h5 text-center">
                ¿Como te gustaria llevar tu terapia?
              </h1>
              <v-container class="mx-auto w-50 mt-5">
                <v-combobox
                  v-model="enfoque"
                  :items="[
                    'Humanista',
                    'Cognitivo-Conductual',
                    'Psicoanalisis',
                  ]"
                ></v-combobox>
              </v-container>
            </v-card>
          </v-stepper-window-item>

          <v-stepper-window-item :value="3">
            <v-card class="bg-transparent w-100">
              <h1 class="text-h5 text-center">
                ¿Con que genero de terapeuta te sientes más comodo?
              </h1>
              <v-container class="mx-auto w-50 mt-5">
                <v-combobox
                  v-model="genero"
                  :items="['Hombre', 'Mujer', 'Me es indiferente']"
                ></v-combobox>
              </v-container>
            </v-card>
          </v-stepper-window-item>

          <v-stepper-window-item :value="4">
            <v-card class="bg-transparent w-100">
              <h1 class="text-h5 text-center">
                ¿Que modalidad te gustaria seguir?
              </h1>
              <v-container class="mx-auto w-50 mt-5">
                <v-combobox
                  v-model="modalidad"
                  :items="['Remoto', 'Presencial', 'Hibrido', 'Me es indiferente']"
                ></v-combobox>
              </v-container>
            </v-card>
          </v-stepper-window-item>

          <v-stepper-window-item :value="5">
            <v-card class="bg-transparent w-100">
              <h1 class="text-h5 text-center">
                ¿Que edad te gustaria que tenga tu terapeuta
              </h1>
              <v-container class="mx-auto w-50 mt-5 text-center">
                <v-combobox
                  v-model="edad"
                  :items="['18-25', '25-35', '35-45', '+ 45']"
                ></v-combobox>
                <v-btn
                  class="mx-auto text-center"
                  variant="tonal"
                  size="large"
                  @click="buscarTerapeuta"
                >
                  Buscar terapeuta</v-btn
                >
              </v-container>
            </v-card>
          </v-stepper-window-item>
        </v-stepper-window>
        <v-stepper-actions
          :disabled="disabled"
          next-text="Siguiente"
          prev-text="Anterior"
          @click:next="next"
          @click:prev="prev"
        ></v-stepper-actions>
      </template>
    </v-stepper>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useTerapiaStore } from "@/store/terapiaStore";
const e1 = ref(1);
const steps = ref(5);
const terapiaStore = useTerapiaStore();
const router = useRouter();

const pasos = ref([
  { n: 1, key: 1, value: "Especialidad" },
  { n: 2, key: 2, value: "Enfoque terapeutico" },
  { n: 3, key: 3, value: "Genero del terapeuta" },
  { n: 4, key: 4, value: "Modalidad" },
  { n: 5, key: 5, value: "Edad" },
]);

const especialidades = ref([
  "Abuso de sustancias",
  "Ansiedad",
  "Depresión",
  "Trauma infantil",
  "Ansiedad social",
  "Problemas de pareja",
  "Problemas familiares",
  "Problemas laborales",
  "Problemas de autoestima",
  "Problemas de identidad",
  "Procrastinación",
  "Otros",
]);

const especialidad = ref([]);
const enfoque = ref("");
const genero = ref("");
const modalidad = ref("");
const edad = ref("");

function guardarCriteriosBusqueda() {
  const payload = {
    especialidades: especialidad.value,
    enfoque: enfoque.value,
    genero: genero.value,
    modalidad: modalidad.value,
    edad: edad.value,
  };

  if (typeof terapiaStore.setCriteriosBusqueda === "function") {
    terapiaStore.setCriteriosBusqueda(payload);
    return;
  }

  terapiaStore.especialidades = Array.isArray(especialidad.value)
    ? [...especialidad.value]
    : [];
  terapiaStore.enfoque = enfoque.value || "";
  terapiaStore.genero =
    genero.value === "Hombre"
      ? "masculino"
      : genero.value === "Mujer"
        ? "femenino"
        : "";
  terapiaStore.modalidad =
    modalidad.value === "Remoto"
      ? "remoto"
      : modalidad.value === "Presencial"
        ? "presencial"
        : modalidad.value === "Hibrido"
          ? "hibrido"
          : "";
  terapiaStore.preferencia_edad_min = 0;
  terapiaStore.preferencia_edad_max = 0;

  if (edad.value === "18-25") {
    terapiaStore.preferencia_edad_min = 18;
    terapiaStore.preferencia_edad_max = 25;
  } else if (edad.value === "25-35") {
    terapiaStore.preferencia_edad_min = 25;
    terapiaStore.preferencia_edad_max = 35;
  } else if (edad.value === "35-45") {
    terapiaStore.preferencia_edad_min = 35;
    terapiaStore.preferencia_edad_max = 45;
  } else if (edad.value === "+ 45") {
    terapiaStore.preferencia_edad_min = 45;
  }
}

function buscarTerapeuta() {
  guardarCriteriosBusqueda();
  router.push("/elegirterapeuta");
}

function conversarConAlguien() {
  if (typeof terapiaStore.resetCriterios === "function") {
    terapiaStore.resetCriterios();
  }
}

const disabled = computed(() => {
  if (e1.value === 1) return "prev";
  if (e1.value === steps.value) return "next";
  return undefined;
});
</script>

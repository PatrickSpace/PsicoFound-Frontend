<template>
  <v-container class="search-view-container">
    <h1 class="text-h5 text-sm-h4">Busqueda de psicologos</h1>
    <v-divider></v-divider>
    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <h2 class="text-h6 text-sm-h5">Ingresa tus datos</h2>
        <v-form class="search-form">
          <v-text-field variant="underlined" label="Nombre"> </v-text-field>
          <v-combobox
            label="Enfoque"
            :items="[
              'Humanista',
              'Congnitivo',
              'Conducutal',
              'Enfoque4',
              'Enfoque5',
              'Enfoque6',
            ]"
            variant="underlined"
          ></v-combobox>
          <v-combobox
            label="Especialidad"
            :items="[
              'Ansiedad',
              'Depresion',
              'Abuso',
              'Terapia de Pareja',
              'Autosabotaje',
            ]"
            variant="underlined"
          ></v-combobox>
          <v-combobox
            label="Preferencia del genero del Psicologo"
            :items="['Hombre', 'Mujer']"
            variant="underlined"
          ></v-combobox>
          <v-combobox
            label="Color favorito"
            :items="['Rojo', 'Azul', 'Morado', 'Verde', 'Amarillo']"
            variant="underlined"
          ></v-combobox>
          <!-- <v-btn class="mt-2" color="teal" block>Buscar</v-btn> -->
        </v-form>
      </v-col>
      <v-col cols="12" md="6">
        <h2 class="text-h6 text-sm-h5">Resultados</h2>
        <v-card :title="psicologo.nombre" subtitle="Hombre">
          <template v-slot:prepend>
            <v-icon size="x-large" color="primary" icon="mdi-account"></v-icon>
          </template>
          <template v-slot:append>
            <v-icon color="success" size="large" icon="mdi-palette"></v-icon>
            <v-icon
              size="large"
              class="ml-5"
              :icon="show ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="show = !show"
            ></v-icon>
          </template>
          <v-divider></v-divider>
          <v-car-text>
            <v-container class="d-flex align-center ml-5 py-2">
              <v-label class="mx-2 text-body-2">Enfoque: </v-label>
              <v-chip size="small"> default </v-chip>
            </v-container>
            <v-container class="d-flex align-center ml-5 py-2">
              <v-label class="mx-2 text-body-2">Especialidad: </v-label>
              <v-chip size="small"> default </v-chip>
            </v-container>
          </v-car-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  data() {
    return {
      psicologo: { nombre: "Paul" },
      show: false,
    };
  },
};
</script>

<style scoped>
.search-view-container {
  padding-inline: 16px;
}

.search-form {
  margin-inline: 0;
}

@media (min-width: 960px) {
  .search-form {
    margin-inline: 40px;
  }
}
</style>

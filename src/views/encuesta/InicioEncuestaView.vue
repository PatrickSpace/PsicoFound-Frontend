<template>
  <v-app class="bg-diagonal h-screen">
    <v-row class="ma-0">
      <v-col cols="12" align-self="start">
        <v-app-bar app class="px-15" color="transparent" dark :elevation="0">
          <v-app-bar-title class="text-white">PsicoFound</v-app-bar-title>
          <v-spacer></v-spacer>
          <v-btn text class="text-white" to="/login" rounded="0" variant="tonal"
            >Iniciar sesión</v-btn
          >
          <v-btn text class="text-white">Registrarse</v-btn>
        </v-app-bar>
      </v-col>

      <v-col cols="12" align-self="center">
        <v-container class="text-center">
          <h4 class="text-white font-weight-bold text-h3 pb-5">
            Cuentanos mas sobre tí
          </h4>
          <p class="text-white text-body-1">
            Te ayudaremos a elegir a un terapeuta a través de una breve
            encuesta.
          </p>
          <v-btn
            to="encuesta"
            rounded="0"
            class="text-white mt-15 text-subtitle-1"
            variant="tonal"
            append-icon="mdi-arrow-right"
            size="x-large"
          >
            Iniciar encuesta
          </v-btn>
        </v-container>
      </v-col>
      <v-col cols="12" class="pa-0" align-self="end">
        <v-container class="text-center">
          <h1 class="text-white text-body-1">
            Si ya elegiste a un terapeuta registrado en PsicoFound puedes
            realizar una búsqueda aquí:
          </h1>
          <!--
          <v-btn
            append-icon="mdi-arrow-top-right"
            class="text-white text-body-1 my-5"
            variant="text"
            size="large"
          >
            Buscar terapeuta por nombre
          </v-btn>
          -->
        </v-container>
      </v-col>
    </v-row>
  </v-app>
</template>

<script>
export default {
  name: "InicioEncuestaView",
  // Métodos y lógica de la vista
};
</script>

<style scoped>
.bg-diagonal {
  background: linear-gradient(to left bottom, #4a9ba7, #0d1c1e);
}
</style>

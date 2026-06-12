<template>

  <div>
    <v-row class="h-screen ma-0">
      <v-col class="bg-image d-md-flex d-sm-none d-none" cols="6"
        :style="{ backgroundImage: `url(${bgHomeImage})` }"></v-col>
      <v-col class="bg-diagonal h-auto">
        <v-row>
          <v-col cols="1" xs="1"></v-col>
          <v-col cols="10">
            <v-row class="h-screen" justify="center">
              <v-col cols="12" class="d-flex" align-self="start">
                <v-toolbar color="transparent">
                  <v-spacer></v-spacer>
                  <v-btn to="/login" class="text-white" variant="tonal" rounded="0">
                    Iniciar sesion
                  </v-btn>
                  <v-btn to="/registro" class="text-white" variant="text">
                    Registrarse
                  </v-btn>
                </v-toolbar>
              </v-col>

              <v-col cols="12" class="">
                <h5 class="text-h5 text-white mb-10 font-weight-black text-decoration-underline">
                  PsicoFound
                </h5>
                <p class="text-h2 font-weight-medium text-white">
                  Estar bien no es negociable
                </p>
                <p class="text-body-1 text-white mt-5 mb-15">
                  Cuentanos tu problema y nosotros te ayudaremos a encontrar el
                  mejor terapeuta para ti
                </p>
                <v-btn class="text-white mb-15 text-black" rounded="0" variant="text" append-icon="mdi-arrow-right"
                  to="/iniciarencuesta">
                  Encuentra a tu terapeuta
                </v-btn>
              </v-col>
              <v-col cols="12" class="d-flex my-5" align-self="end">
                <v-btn append-icon="mdi-arrow-top-right" class="text-white text-body-1 d-flex" variant="text"
                  size="large">
                  Ya cuento con un terapeuta
                </v-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>

</template>
<script setup>
import bgHomeImage from "@/assets/img/bg-home.jpg";
</script>
<style scoped>
.bg-image {
  background-size: cover;
  background-repeat: no-repeat;
  background-position-y: bottom;
}
</style>

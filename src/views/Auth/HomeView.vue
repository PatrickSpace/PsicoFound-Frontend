<template>
  <div>
    <v-row class="h-screen ma-0">
      <v-col class="bg-image d-md-flex d-sm-none d-none" cols="6"></v-col>
      <v-col class="bg-diagonal h-auto">
        <v-row>
          <v-col cols="1" xs="1"></v-col>
          <v-col cols="10">
            <v-row class="h-screen" justify="center">
              <v-col cols="12" class="d-flex" align-self="start">
                <v-toolbar color="transparent">
                  <v-spacer></v-spacer>
                  <v-btn
                    to="/login"
                    class="theme-contrast-text"
                    variant="tonal"
                    rounded="0"
                  >
                    Iniciar sesion
                  </v-btn>
                  <v-btn
                    to="/registro"
                    class="theme-contrast-text"
                    variant="text"
                  >
                    Registrarse
                  </v-btn>
                </v-toolbar>
              </v-col>

              <v-col cols="12" class="">
                <img
                  src="/brand/lurems-logo-principal-transparent.png"
                  alt="Lurems"
                  class="home-logo mb-5"
                />
                <p
                  class="responsive-title-xl font-weight-bold theme-contrast-text"
                >
                  Estar bien no es negociable
                </p>
                <p class="text-body-1 theme-contrast-text mt-5 mb-15">
                  Cuéntanos qué necesitas y te acompañaremos a encontrar un
                  profesional afín a ti.
                </p>
                <v-btn
                  class="theme-contrast-text mb-15"
                  rounded="0"
                  variant="text"
                  append-icon="mdi-arrow-right"
                  to="/iniciarencuesta"
                >
                  Encuentra a tu terapeuta
                </v-btn>
              </v-col>
              <v-col cols="12" class="d-flex my-5" align-self="end">
                <v-btn
                  append-icon="mdi-arrow-top-right"
                  class="theme-contrast-text text-body-1 d-flex"
                  variant="text"
                  size="large"
                >
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
import MainLogo from "@/components/Common/MainLogo.vue";
</script>
<style scoped>
.bg-image {
  background-image: url("@/assets/img/bg-home.jpg");
  background-size: cover;
  background-repeat: no-repeat;
  background-position-y: bottom;
}

.home-logo {
  display: block;
  height: auto;
  width: 280px;
}
</style>

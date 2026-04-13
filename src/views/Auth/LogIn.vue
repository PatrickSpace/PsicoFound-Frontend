<script setup>
import Loginform from "@/components/auth/LoginForm.vue";
import MainLogo from "@/components/Common/MainLogo.vue";
</script>
<template>
  <div>
    <v-row class="ma-0 h-screen">
      <v-col class="bg-image d-sm-none d-none d-md-flex" md="6"></v-col>
      <v-col class="bg-diagonal">
        <v-row class="h-screen">
          <v-col cols="12" class="d-flex" align-self="start"> </v-col>

          <v-col sm="2" xs="1" class="d-sm-flex"></v-col>
          <v-col md="8" lg="6" sm="9" xs="12" class="">
            <MainLogo />
            <p class="text-h4 font-weight-medium text-white w-75">
              Iniciar sesion
            </p>
            <Loginform />
          </v-col>
          <v-col md="2" lg="4" sm="1" class="d-sm-flex"></v-col>

          <v-col cols="2"></v-col>
          <v-col cols="10" class="d-flex my-5" align-self="end">
            <v-btn
              to="/registro"
              append-icon="mdi-arrow-top-right"
              class="text-white text-body-1"
              variant="text"
              size="large"
            >
              Registrarse
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>
<style>
.bg-image {
  background-image: url("@/assets/img/bg-home.jpg");
  background-size: cover;
  background-repeat: no-repeat;
  background-position-y: bottom;
}

.bg-diagonal {
  background: linear-gradient(200deg, #4a9ba7, #000000);
}
</style>

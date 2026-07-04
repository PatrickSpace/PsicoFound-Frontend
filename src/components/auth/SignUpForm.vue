<template>
  <v-form v-model="valid" @submit.prevent="registrarse()">
    <v-container class="px-0">
      <v-text-field
        class="mb-2"
        v-model="form.usuario"
        label="Correo"
        placeholder="Correo electrónico"
        :rules="[r.required, r.email]"
        required
        clearable
      />
      <v-text-field
        v-model="form.password"
        label="Contraseña"
        type="password"
        :rules="[r.required, r.min]"
        required
        clearable
      />
      <v-btn
        block
        class="my-5 bg-transparent"
        elevation="4"
        variant="tonal"
        size="large"
        type="submit"
        :disabled="!valid || loading"
        :loading="loading"
      >
        Registrarse
        <template #append>
          <v-icon>mdi-arrow-right</v-icon>
        </template>
      </v-btn>
    </v-container>
  </v-form>
  <v-divider></v-divider>

  <v-btn
    block
    class="my-5 bg-google text-left"
    elevation="4"
    variant="tonal"
    size="large"
    jutify-start
    @click="registerWithGoogle"
    :loading="loadingGoogle"
  >
    Iniciar sesion con Google
    <template v-slot:prepend>
      <v-icon>mdi-google</v-icon>
    </template>
  </v-btn>
</template>
<script setup>
import { reactive, ref } from "vue";
import { auth } from "@/plugins/Firebase/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { createUserInFirestore } from "@/plugins/Firebase/firestore";
import { useRouter } from "vue-router";

const router = useRouter();
const form = reactive({ usuario: "", password: "" });
const valid = ref(false);
const loading = ref(false);
const loadingGoogle = ref(false);

const r = {
  required: (v) => !!v || "Requerido",
  email: (v) => /.+@.+\..+/.test(v) || "Email inválido",
  min: (v) => v?.length >= 6 || "Mínimo 6 caracteres",
};

async function registrarse() {
  if (!valid.value || loading.value) return;

  try {
    loading.value = true;
    const usersignup = await createUserWithEmailAndPassword(
      auth,
      form.usuario,
      form.password
    );
    console.log(usersignup);
    await createUserInFirestore({
      id: usersignup.user.uid,
      email: usersignup.user.email,
      nombre: usersignup.user.email?.split("@")[0] || "Usuario",
      rol: "paciente",
    });
    await router.push("/encuesta");
  } catch (error) {
    console.error(error);
    alert("Error al registrarse: " + error.message);
  } finally {
    loading.value = false;
  }
}

async function registerWithGoogle() {
  if (loadingGoogle.value) return;

  try {
    loadingGoogle.value = true;
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const user = result.user;

    await createUserInFirestore({
      id: user.uid,
      email: user.email,
      nombre: user.displayName || user.email?.split("@")[0] || "Usuario",
      rol: "paciente",
    });

    await router.push("/encuesta");
  } catch (error) {
    console.error(error);
    alert("Error al registrarse con Google: " + error.message);
  } finally {
    loadingGoogle.value = false;
  }
}
</script>

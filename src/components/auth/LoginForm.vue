<template>
  <div>
    <v-form v-model="valid" @submit.prevent="LogIn()">
      <v-container class="px-0">
        <v-text-field
        class="bg-transparent"
          v-model="form.usuario"
          label="Correo"
          placeholder="Correo electronico"
          :rules="[r.required, r.email]"
          required
          clearable
        />
        <v-text-field
        class="bg-transparent"
          v-model="form.password"
          label="Contraseña"
          type="password"
          :rules="[r.required, r.min]"
          required
          clearable
        />
        <v-btn
          block
          class="my-5 pf-btn-primary"
          elevation="4"
          size="large"
          type="submit"
          :disabled="!valid || loading"
          :loading="loading"
        >
          Iniciar Sesión
          <template #append>
            <v-icon>mdi-arrow-right</v-icon>
          </template>
        </v-btn>
      </v-container>
    </v-form>
    <v-divider></v-divider>
    <v-btn
      block
      class="my-5 text-left pf-btn-google"
      id="google-login-button"
      elevation="4"
      size="large"
      @click="LoginGoogle()"
      :loading="loadingGoogle"
    >
      Iniciar sesión con Google
      <template #prepend>
        <v-icon>mdi-google</v-icon>
      </template>
    </v-btn>
  </div>
</template>
<style scoped>
#google-login-button{
  background-color: #d82518 !important;
  color: white;
}
</style>
<script setup>
import { reactive, ref } from "vue";
import { auth } from "@/plugins/Firebase/firebase";
import { createUserInFirestore } from "@/plugins/Firebase/firestore";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
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

async function LogIn() {
  if (!valid.value || loading.value) return;
  loading.value = true;
  try {
    const userlogged = await signInWithEmailAndPassword(
      auth,
      form.usuario,
      form.password
    );
    console.log(userlogged.user);
    router.push("/dashboard");
  } catch (e) {
    console.error("Login error:", e);
    alert("Error al iniciar sesión: " + e.message);
  } finally {
    loading.value = false;
  }
}

async function LoginGoogle() {
  if (loadingGoogle.value) return;

  try {
    loadingGoogle.value = true;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userlogged = result.user;
    console.log("Google user:", userlogged);
    const newUser = {
      id: userlogged.uid,
      email: userlogged.email,
      nombre: userlogged.displayName || "Usuario",
      rol: "paciente",
      roles: ["patient"],
    };
    console.log("Google user:", newUser);
    await createUserInFirestore(newUser);
    await router.push("/dashboard");
  } catch (error) {
    console.error("Google login error:", error);
    alert("Error al iniciar sesión con Google: " + error.message);
  } finally {
    loadingGoogle.value = false;
  }
}
</script>

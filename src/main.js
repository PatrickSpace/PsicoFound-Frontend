import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import apiClient from "./plugins/axios";
import vuetify from "./plugins/vuetify";
import { createPinia } from "pinia";
import "./plugins/Firebase/firebase";
import { useAuthStore } from "@/store/auth";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(vuetify);

// Configuracion global disponible antes del mount.
app.config.globalProperties.$axios = apiClient;

const authStore = useAuthStore(pinia);
authStore.initAuth();

app.mount("#app");

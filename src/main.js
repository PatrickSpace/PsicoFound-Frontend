import "./assets/main.css";
import "./assets/forms.css";
import "./assets/cards.css";
import "./assets/buttons.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import apiClient from "./plugins/axios";
import vuetify, { applyDesignTokenCssVars } from "./plugins/vuetify";
import { createPinia } from "pinia";
import "./plugins/Firebase/firebase";
import { useAuthStore } from "@/store/auth";

const app = createApp(App);
const pinia = createPinia();

applyDesignTokenCssVars();

app.use(pinia);
app.use(router);
app.use(vuetify);

// Configuracion global disponible antes del mount.
app.config.globalProperties.$axios = apiClient;

const authStore = useAuthStore(pinia);
authStore.initAuth();

app.mount("#app");

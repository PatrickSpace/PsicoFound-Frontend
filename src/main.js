import "./assets/main.css";
import "./assets/cover.css";
import "./assets/forms.css";
import "./assets/cards.css";
import "./assets/buttons.css";
import "./assets/overlays.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify, { applyDesignTokenCssVars } from "./plugins/vuetify";
import { createPinia } from "pinia";

const app = createApp(App);
const pinia = createPinia();

applyDesignTokenCssVars();

app.use(pinia);
app.use(router);
app.use(vuetify);

app.mount("#app");

// Vuetify
import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
const vuetify = createVuetify({
  components,
  theme: {
    defaultTheme: "dark",
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: "#1f4146",
          secondary: "#5f807b",
          accent: "#9ec6bd",
          surface: "#172b2d",
          background: "#030707",
          info: "#4f7773",
          success: "#6e927b",
          warning: "#b49a66",
          error: "#c36f7f",
        },
      },
    },
  },
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
});

export default vuetify;

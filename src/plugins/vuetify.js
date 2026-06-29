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
      light: {
        dark: false,
        colors: {
          primary: "#416966",
          secondary: "#6f8f88",
          accent: "#3f6f6c",
          surface: "#f5faf8",
          background: "#eef6f3",
          info: "#527f7a",
          success: "#5f806c",
          warning: "#9d7c3f",
          error: "#b65d6d",
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

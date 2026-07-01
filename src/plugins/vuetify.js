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
          primary: "#123a35",
          secondary: "#2f665f",
          accent: "#5f9187",
          surface: "#ffffff",
          background: "#eef4f1",
          info: "#356a64",
          success: "#426f52",
          warning: "#8a6a32",
          error: "#a64255",
          "on-background": "#12211e",
          "on-surface": "#1d2b28",
          "on-primary": "#ffffff",
          "on-secondary": "#ffffff",
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

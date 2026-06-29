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
          primary: "#173f3a",
          secondary: "#376f65",
          accent: "#6e9e94",
          surface: "#ffffff",
          background: "#f5f8f6",
          info: "#426f69",
          success: "#4f765e",
          warning: "#97783e",
          error: "#af5264",
          "on-background": "#172622",
          "on-surface": "#223330",
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

import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import { darkTheme } from "./dark";
import { lightTheme } from "./light";
import {
  defaultTherapistGradient,
  defaultTherapistGradientStops,
  designTokenCssVars,
  designTokens,
  therapistGradients,
} from "./tokens";

export function applyDesignTokenCssVars(target = document.documentElement) {
  Object.entries(designTokenCssVars).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}

const vuetify = createVuetify({
  components,
  theme: {
    defaultTheme: "dark",
    themes: {
      dark: darkTheme,
      light: lightTheme,
    },
  },
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
});

export {
  defaultTherapistGradient,
  defaultTherapistGradientStops,
  designTokens,
  therapistGradients,
};
export default vuetify;

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
  tokenGroups,
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
    defaultTheme: "light",
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
  defaults: {
    VCard: {
      rounded: "lg",
      elevation: 0,
    },
    VTextField: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
    VTextarea: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
    VSelect: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
    VAutocomplete: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
    VCombobox: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
    VFileInput: {
      variant: "solo-filled",
      density: "comfortable",
      flat: true,
    },
  },
});

export {
  defaultTherapistGradient,
  defaultTherapistGradientStops,
  designTokens,
  tokenGroups,
  therapistGradients,
};
export default vuetify;

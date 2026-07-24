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
      variant: "outlined",
      density: "comfortable",
    },
    VTextarea: {
      variant: "outlined",
      density: "comfortable",
    },
    VSelect: {
      variant: "outlined",
      density: "comfortable",
    },
    VAutocomplete: {
      variant: "outlined",
      density: "comfortable",
    },
    VCombobox: {
      variant: "outlined",
      density: "comfortable",
    },
    VFileInput: {
      variant: "outlined",
      density: "comfortable",
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

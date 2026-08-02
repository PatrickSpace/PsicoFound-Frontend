import "vuetify/styles";
import "@/assets/mdi-subset.css";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import { es } from "vuetify/locale";
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
  theme: {
    defaultTheme: "light",
    themes: {
      dark: darkTheme,
      light: lightTheme,
    },
  },
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  locale: {
    locale: "es",
    fallback: "en",
    messages: { es },
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
    VDateInput: {
      variant: "outlined",
      density: "comfortable",
      color: "primary",
      prependIcon: null,
      prependInnerIcon: "mdi-calendar-outline",
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

import { useTheme } from "vuetify";

const LIGHT_THEME = "light";

function syncDocumentTheme(themeName) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = themeName;
  document.documentElement.style.colorScheme = "light";
}

export function useAppTheme() {
  const theme = useTheme();

  function initializeAppTheme() {
    theme.change(LIGHT_THEME);
    syncDocumentTheme(LIGHT_THEME);
  }

  return {
    initializeAppTheme,
  };
}

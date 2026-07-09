import { computed } from "vue";
import { useTheme } from "vuetify";

const LIGHT_THEME = "light";

function resolveStoredTheme() {
  return LIGHT_THEME;
}

function syncDocumentTheme(themeName) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = themeName;
  document.documentElement.style.colorScheme = "light";
}

export function useAppTheme() {
  const theme = useTheme();

  function setAppTheme(themeName) {
    const nextTheme = LIGHT_THEME;
    theme.change(nextTheme);

    syncDocumentTheme(nextTheme);
  }

  function initializeAppTheme() {
    setAppTheme(resolveStoredTheme());
  }

  function toggleAppTheme() {
    setAppTheme(LIGHT_THEME);
  }

  const appTheme = computed({
    get: () => theme.global.name.value,
    set: setAppTheme,
  });

  const isDarkTheme = computed(() => false);

  return {
    appTheme,
    isDarkTheme,
    initializeAppTheme,
    setAppTheme,
    toggleAppTheme,
  };
}

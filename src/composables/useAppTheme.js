import { computed } from "vue";
import { useTheme } from "vuetify";

const THEME_STORAGE_KEY = "psicofound-theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

function resolveStoredTheme() {
  if (typeof window === "undefined") {
    return DARK_THEME;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if ([DARK_THEME, LIGHT_THEME].includes(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? LIGHT_THEME
    : DARK_THEME;
}

function syncDocumentTheme(themeName) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.appTheme = themeName;
  document.documentElement.style.colorScheme =
    themeName === LIGHT_THEME ? "light" : "dark";
}

export function useAppTheme() {
  const theme = useTheme();

  function setAppTheme(themeName) {
    const nextTheme = themeName === LIGHT_THEME ? LIGHT_THEME : DARK_THEME;
    theme.global.name.value = nextTheme;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    syncDocumentTheme(nextTheme);
  }

  function initializeAppTheme() {
    setAppTheme(resolveStoredTheme());
  }

  function toggleAppTheme() {
    setAppTheme(theme.global.name.value === DARK_THEME ? LIGHT_THEME : DARK_THEME);
  }

  const appTheme = computed({
    get: () => theme.global.name.value,
    set: setAppTheme,
  });

  const isDarkTheme = computed(() => appTheme.value === DARK_THEME);

  return {
    appTheme,
    isDarkTheme,
    initializeAppTheme,
    setAppTheme,
    toggleAppTheme,
  };
}

// composables/useTheme.ts
import { ref, watchEffect } from "vue";

type Theme = "dark" | "light";

const STORAGE_KEY = "iprices-theme";

/**
 * Singleton theme state — shared across all callers in the same app instance.
 * Reads the user's saved preference first, then falls back to OS preference.
 */
const stored = (
  typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
) as Theme | null;
const osDark =
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

const theme = ref<Theme>(stored ?? (osDark ? "dark" : "light"));

// Sync the DOM attribute and persist whenever theme changes
watchEffect(() => {
  document.documentElement.setAttribute("data-theme", theme.value);
  localStorage.setItem(STORAGE_KEY, theme.value);
});

export function useTheme() {
  const toggle = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
  };

  return { theme, toggle };
}

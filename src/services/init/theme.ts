/**
 * =============================================================================
 * SERVICE D'INITIALISATION - THEME
 * =============================================================================
 *
 * PERFORMANCE: L'initialisation du thème peut être différée après le
 * premier render car le CSS gère un thème par défaut.
 */

export type ThemeMode = "light" | "dark" | "auto";

/**
 * Détecte le thème préféré de l'utilisateur
 */
export function detectTheme(): ThemeMode {
  const savedTheme = localStorage.getItem("app-theme") as ThemeMode;
  if (savedTheme) return savedTheme;

  // Préférence système par défaut
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applique le thème au document
 */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;

  if (theme === "auto") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", systemDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", theme);
  }

  localStorage.setItem("app-theme", theme);
}

/**
 * Écoute les changements de préférence système
 */
export function watchSystemTheme(): () => void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handler = () => {
    const currentTheme = localStorage.getItem("app-theme");
    if (currentTheme === "auto" || !currentTheme) {
      applyTheme("auto");
    }
  };

  mediaQuery.addEventListener("change", handler);

  // Retourne fonction de cleanup
  return () => mediaQuery.removeEventListener("change", handler);
}

/**
 * Initialise le thème (à appeler dans useEffect)
 */
export function initTheme(): () => void {
  applyTheme(detectTheme());
  return watchSystemTheme();
}

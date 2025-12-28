/**
 * =============================================================================
 * COMPOSANT LanguageSelector - SÉLECTEUR DE LANGUE
 * =============================================================================
 *
 * Composant dropdown pour changer la langue de l'interface.
 * Deux variantes: "compact" (header) et "full" (menu mobile).
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage, type LanguageMode } from "../hooks/useLanguage";
import { cn } from "../lib/utils";

export interface LanguageSelectorProps {
  /** Mode de l'application (admin: 2 langues, provider: 9 langues) */
  mode: LanguageMode;
  /** Variante d'affichage */
  variant?: "compact" | "full";
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Sélecteur de langue avec dropdown
 *
 * @example
 * ```tsx
 * // Dans le header admin (2 langues, compact)
 * <LanguageSelector mode="admin" variant="compact" />
 *
 * // Dans le menu mobile provider (9 langues, grille)
 * <LanguageSelector mode="provider" variant="full" />
 * ```
 */
export function LanguageSelector({
  mode,
  variant = "compact",
  className = "",
}: LanguageSelectorProps) {
  const { t } = useTranslation("common");
  const {
    currentLanguage,
    currentLanguageInfo,
    changeLanguage,
    availableLanguagesInfo,
  } = useLanguage({ mode });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer le dropdown avec Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSelect = async (langCode: string) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  // Variante compacte (dropdown dans le header)
  if (variant === "compact") {
    return (
      <div ref={dropdownRef} className={cn("relative", className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            "border border-gray-200 dark:border-gray-700",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            "transition-colors text-sm font-medium",
            "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          )}
          aria-label={t("language.change")}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-base" role="img" aria-label={currentLanguageInfo.name}>
            {currentLanguageInfo.flag}
          </span>
          <span className="hidden sm:inline text-gray-700 dark:text-gray-200">
            {currentLanguage.toUpperCase()}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute top-full mt-2 w-48 py-1",
              "bg-white dark:bg-gray-900 rounded-lg shadow-lg",
              "border border-gray-200 dark:border-gray-700",
              "language-selector-dropdown",
              // Position selon RTL
              "ltr:right-0 rtl:left-0"
            )}
            role="listbox"
            aria-label={t("language.available")}
          >
            {availableLanguagesInfo.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={cn(
                  "language-selector-item",
                  currentLanguage === lang.code && "active"
                )}
                role="option"
                aria-selected={currentLanguage === lang.code}
              >
                <span className="text-lg" role="img" aria-label={lang.name}>
                  {lang.flag}
                </span>
                <span className="flex-1 text-gray-700 dark:text-gray-200">
                  {lang.name}
                </span>
                {currentLanguage === lang.code && (
                  <Check className="w-4 h-4 text-red-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Variante complète (grille pour menu mobile)
  return (
    <div className={cn("space-y-3", className)}>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <Globe className="w-4 h-4" />
        {t("language.select")}
      </label>
      <div
        className={cn(
          "grid gap-2",
          // Adapter la grille selon le nombre de langues
          availableLanguagesInfo.length <= 4
            ? "grid-cols-2"
            : "grid-cols-3"
        )}
        role="listbox"
        aria-label={t("language.available")}
      >
        {availableLanguagesInfo.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-3 rounded-lg",
              "border transition-all",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
              currentLanguage === lang.code
                ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
            role="option"
            aria-selected={currentLanguage === lang.code}
          >
            <span className="text-2xl" role="img" aria-label={lang.name}>
              {lang.flag}
            </span>
            <span className="text-xs font-medium">
              {lang.code.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;

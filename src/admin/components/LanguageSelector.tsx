/**
 * =============================================================================
 * LANGUAGE SELECTOR - Sélecteur de langue pour la console admin
 * =============================================================================
 */

import { useState, memo } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { Globe, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  collapsed?: boolean;
}

export default memo(function LanguageSelector({ collapsed }: LanguageSelectorProps) {
  const {
    currentLanguageInfo,
    availableLanguagesInfo,
    changeLanguage,
  } = useLanguage({ mode: "admin" });
  const [isOpen, setIsOpen] = useState(false);

  if (collapsed) {
    // Collapsed mode - just show flag
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors"
          title="Changer la langue"
        >
          <Globe className="w-5 h-5" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-full ml-2 bottom-0 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 py-1 min-w-[120px]">
              {availableLanguagesInfo.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors",
                    currentLanguageInfo.code === lang.code
                      ? "text-red-400"
                      : "text-slate-300"
                  )}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {currentLanguageInfo.code === lang.code && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Expanded mode
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
          "text-slate-300 hover:text-white hover:bg-slate-700/50",
          isOpen && "bg-slate-700/50"
        )}
      >
        <Globe className="w-5 h-5" />
        <span className="flex-1 text-left flex items-center gap-2">
          <span className="text-base">{currentLanguageInfo.flag}</span>
          <span>{currentLanguageInfo.name}</span>
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 bottom-full mb-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 py-1">
            {availableLanguagesInfo.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors",
                  currentLanguageInfo.code === lang.code
                    ? "text-red-400"
                    : "text-slate-300"
                )}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
                {currentLanguageInfo.code === lang.code && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

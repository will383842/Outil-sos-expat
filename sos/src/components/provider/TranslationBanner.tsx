// src/components/provider/TranslationBanner.tsx
// Design moderne 2026 - UX Premium avec micro-interactions
import React, { useState } from 'react';
import { Globe, Loader2, Check, Eye, Sparkles } from 'lucide-react';
import { FormattedMessage } from 'react-intl';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
} from '../../services/providerTranslationService';

interface TranslationBannerProps {
  providerId?: string;
  currentLanguage?: SupportedLanguage;
  availableLanguages: SupportedLanguage[];
  onTranslationComplete: (language: SupportedLanguage, translation: any) => void;
  onTranslate: (language: SupportedLanguage) => Promise<any>;
  onViewTranslation?: (language: SupportedLanguage) => void;
  showOriginal?: boolean;
  onToggleOriginal?: () => void;
  viewingLanguage?: SupportedLanguage | null;
}

// Drapeaux emoji pour chaque langue
const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  pt: '🇵🇹',
  ru: '🇷🇺',
  zh: '🇨🇳',
  ch: '🇨🇳', // Chinese (alternate code)
  ar: '🇸🇦',
  hi: '🇮🇳',
};

export const TranslationBanner: React.FC<TranslationBannerProps> = ({
  availableLanguages,
  onTranslationComplete,
  onTranslate,
  onViewTranslation,
  showOriginal = false,
  onToggleOriginal,
  viewingLanguage,
}) => {
  const [isTranslating, setIsTranslating] = useState<SupportedLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justTranslated, setJustTranslated] = useState<SupportedLanguage | null>(null);

  const allLanguages = SUPPORTED_LANGUAGES;

  const missingLanguages = allLanguages.filter(
    lang => !availableLanguages.includes(lang)
  );
  const availableOtherLanguages = allLanguages.filter(
    lang => availableLanguages.includes(lang)
  );

  const handleTranslate = async (targetLanguage: SupportedLanguage) => {
    setIsTranslating(targetLanguage);
    setError(null);

    try {
      const translation = await onTranslate(targetLanguage);
      if (translation) {
        setJustTranslated(targetLanguage);
        onTranslationComplete(targetLanguage, translation);
        // Animation de succès
        setTimeout(() => setJustTranslated(null), 2000);
      } else {
        setError('Translation returned no data');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTimeout(() => {
        setIsTranslating(null);
      }, 500);
    }
  };

  const handleViewTranslation = (targetLanguage: SupportedLanguage) => {
    if (onViewTranslation) {
      onViewTranslation(targetLanguage);
    } else {
      onTranslationComplete(targetLanguage, null);
    }
  };

  const isCurrentlyViewing = (lang: SupportedLanguage) =>
    viewingLanguage === lang && !showOriginal;

  return (
    <div
      className="mb-6 space-y-4"
      role="region"
      aria-label="Translation options"
    >
      {/* Header moderne avec gradient */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
            <Globe className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              <FormattedMessage
                id="providerTranslation.viewIn"
                defaultMessage="View in:"
              />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <FormattedMessage
                id="providerTranslation.selectLanguage"
                defaultMessage="Select a language to view this profile"
              />
            </p>
          </div>
        </div>

        {/* Badge compteur de langues */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
            {availableLanguages.length} <FormattedMessage id="providerTranslation.available" defaultMessage="available" />
          </span>
        </div>
      </div>

      {/* Grille de boutons de langues */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Available languages"
      >
        {/* Langues déjà traduites (vertes avec check) */}
        {availableOtherLanguages.map(lang => {
          const isViewing = isCurrentlyViewing(lang);
          const wasJustTranslated = justTranslated === lang;

          return (
            <button
              key={lang}
              onClick={() => handleViewTranslation(lang)}
              disabled={isTranslating !== null}
              aria-pressed={isViewing}
              aria-label={`View in ${LANGUAGE_NAMES[lang]}`}
              className={`
                group relative px-4 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 ease-out
                flex items-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                ${isViewing
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900'
                  : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:shadow-md hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 hover:-translate-y-0.5'
                }
                ${wasJustTranslated ? 'animate-pulse ring-2 ring-emerald-400' : ''}
              `}
            >
              <span className="text-base" aria-hidden="true">{LANGUAGE_FLAGS[lang]}</span>
              <span>{LANGUAGE_NAMES[lang]}</span>
              {!isViewing && (
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
              )}
              {/* Badge "viewing" */}
              {isViewing && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </span>
              )}
            </button>
          );
        })}

        {/* Langues non traduites (outline avec option de traduire) */}
        {missingLanguages.map(lang => {
          const isLoading = isTranslating === lang;

          return (
            <button
              key={lang}
              onClick={() => handleTranslate(lang)}
              disabled={isTranslating !== null}
              aria-busy={isLoading}
              aria-label={`Translate to ${LANGUAGE_NAMES[lang]}`}
              className={`
                group px-4 py-2.5 rounded-xl text-sm font-medium
                border-2 border-dashed border-gray-300 dark:border-gray-600
                text-gray-600 dark:text-gray-400
                bg-white/50 dark:bg-gray-800/50
                hover:border-blue-400 dark:hover:border-blue-500
                hover:bg-blue-50 dark:hover:bg-blue-900/20
                hover:text-blue-600 dark:hover:text-blue-400
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                transition-all duration-200 ease-out
                flex items-center gap-2
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" aria-hidden="true" />
                  <span>
                    <FormattedMessage
                      id="providerTranslation.translating"
                      defaultMessage="Translating..."
                    />
                  </span>
                </>
              ) : (
                <>
                  <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                    {LANGUAGE_FLAGS[lang]}
                  </span>
                  <span>{LANGUAGE_NAMES[lang]}</span>
                  <Sparkles className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" aria-hidden="true" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bouton View Original / View Translated */}
      {onToggleOriginal && availableLanguages.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onToggleOriginal}
            className={`
              px-5 py-2.5 text-sm font-medium uppercase tracking-wide
              rounded-xl
              flex items-center gap-2
              transition-all duration-200 ease-out
              active:scale-95
              ${showOriginal
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:shadow-xl'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
            aria-pressed={showOriginal}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            {showOriginal ? (
              <FormattedMessage
                id="providerTranslation.viewTranslated"
                defaultMessage="View translated"
              />
            ) : (
              <FormattedMessage
                id="providerTranslation.viewOriginal"
                defaultMessage="View original"
              />
            )}
          </button>
        </div>
      )}

      {/* Message d'erreur accessible */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Info coût de traduction (subtil) */}
      {missingLanguages.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          <FormattedMessage
            id="providerTranslation.oneTimeCost"
            defaultMessage="Translation is a one-time cost (~€0.15). Future visits are free."
          />
        </p>
      )}
    </div>
  );
};

export default TranslationBanner;

// src/components/provider/TranslationBanner.tsx
import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { FormattedMessage, useIntl } from 'react-intl';
// Removed useNavigate and useLocation imports - no longer needed for login redirect
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
} from '../../services/providerTranslationService';
interface TranslationBannerProps {
  providerId: string;
  currentLanguage: SupportedLanguage;
  availableLanguages: SupportedLanguage[];
  onTranslationComplete: (language: SupportedLanguage, translation: any) => void;
  onTranslate: (language: SupportedLanguage) => Promise<any>;
  onViewTranslation?: (language: SupportedLanguage) => void;
}

export const TranslationBanner: React.FC<TranslationBannerProps> = ({
  providerId,
  currentLanguage,
  availableLanguages,
  onTranslationComplete,
  onTranslate,
  onViewTranslation,
}) => {
  const intl = useIntl();
  const [isTranslating, setIsTranslating] = useState<SupportedLanguage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Show ALL languages - don't filter by currentLanguage or availableLanguages
  // Missing languages = not yet translated (will trigger translation)
  // Available languages = already translated (will view existing translation)
  const allLanguages = SUPPORTED_LANGUAGES; // Show all supported languages
  
  const missingLanguages = allLanguages.filter(
    lang => !availableLanguages.includes(lang)
  );
  const availableOtherLanguages = allLanguages.filter(
    lang => availableLanguages.includes(lang)
  );

  // Always show the banner - show all language buttons

  const handleTranslate = async (targetLanguage: SupportedLanguage) => {
    setIsTranslating(targetLanguage);
    setError(null);

    try {
      console.log('Translating to', targetLanguage);
      const translation = await onTranslate(targetLanguage);
      if (translation) {
        onTranslationComplete(targetLanguage, translation);
      } else {
        setError('Translation returned no data');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      // Keep loading state for a bit to show completion
      setTimeout(() => {
        setIsTranslating(null);
      }, 500);
    }
  };

  const handleViewTranslation = (targetLanguage: SupportedLanguage) => {
    // If translation already exists, just switch to viewing it
    if (onViewTranslation) {
      onViewTranslation(targetLanguage);
    } else {
      // Fallback to onTranslationComplete if onViewTranslation not provided
      onTranslationComplete(targetLanguage, null);
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-blue-900 dark:text-blue-100">
          <FormattedMessage
            id="providerTranslation.viewIn"
            defaultMessage="View in:"
          />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Show ALL language buttons - missing languages (need translation) */}
        {missingLanguages.map(lang => (
          <button
            key={lang}
            onClick={() => handleTranslate(lang)}
            disabled={isTranslating === lang || isTranslating !== null}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isTranslating === lang ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <FormattedMessage
                  id="providerTranslation.translating"
                  defaultMessage="Translating..."
                />
              </>
            ) : (
              LANGUAGE_NAMES[lang]
            )}
          </button>
        ))}
        
        {/* Show ALL language buttons - available languages (already translated - can view) */}
        {availableOtherLanguages.map(lang => (
          <button
            key={lang}
            onClick={() => handleViewTranslation(lang)}
            disabled={isTranslating !== null}
            className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {LANGUAGE_NAMES[lang]}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
     
    </div>
  );
};


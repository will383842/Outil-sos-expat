// src/hooks/useProviderTranslation.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProviderTranslation,
  requestTranslation,
  type SupportedLanguage,
  type ProviderTranslation,
  type TranslatedContent,
  isRobot,
} from '../services/providerTranslationService';
import { useAuth } from '../contexts/AuthContext';
import { isProviderTranslationEnabled } from '../config/featureFlags';

// État vide retourné quand la fonctionnalité est désactivée
const DISABLED_STATE: ProviderTranslation = {
  translation: null,
  original: null,
  availableLanguages: [],
  isLoading: false,
  error: null,
};

export function useProviderTranslation(
  providerId: string | null,
  targetLanguage: SupportedLanguage | null
) {
  const { user } = useAuth();

  // Feature flag: si désactivé, retourner un état vide sans faire d'appels API
  const isEnabled = isProviderTranslationEnabled();

  const [state, setState] = useState<ProviderTranslation>(
    isEnabled
      ? {
          translation: null,
          original: null,
          availableLanguages: [],
          isLoading: true,
          error: null,
        }
      : DISABLED_STATE
  );

  // Ref to track if we're manually managing a translation (via translate() or reloadForLanguage())
  // This prevents automatic loadTranslation() from overwriting manual state updates
  const isManuallyManagingRef = useRef(false);
  const currentLanguageRef = useRef<SupportedLanguage | null>(null);

  // Si désactivé, retourner des fonctions no-op
  if (!isEnabled) {
    return {
      ...DISABLED_STATE,
      translate: async () => null,
      reload: () => {},
      reloadForLanguage: async () => {},
    };
  }

  const loadTranslation = useCallback(async () => {
    // Skip automatic loading if we're manually managing a translation
    if (isManuallyManagingRef.current) {
      return;
    }

    if (!providerId) {
      setState({
        translation: null,
        original: null,
        availableLanguages: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    // If we already have a translation for this language, don't reload
    if (currentLanguageRef.current === targetLanguage && state.translation) {
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getProviderTranslation(providerId, targetLanguage!);
      setState(result);
      currentLanguageRef.current = targetLanguage; // Track which language we loaded
    } catch (error) {
      console.error('[useProviderTranslation] Error in loadTranslation:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to load translation';

      setState({
        translation: null,
        original: null,
        availableLanguages: [],
        isLoading: false,
        error: errorMessage,
      });
    }
  }, [providerId, targetLanguage]); // Removed state.translation to prevent infinite loops

  const translate = useCallback(async (lang?: SupportedLanguage): Promise<TranslatedContent | null> => {
    if (!providerId) {
      return null;
    }

    // Use provided language or fallback to current targetLanguage
    const langToTranslate = lang || targetLanguage;
    if (!langToTranslate) {
      return null;
    }

    // Don't translate for robots
    if (isRobot()) {
      return null;
    }

    // Mark that we're manually managing this translation
    isManuallyManagingRef.current = true;
    currentLanguageRef.current = langToTranslate;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Translation no longer requires authentication - pass undefined if user not logged in
      const translation = await requestTranslation(
        providerId,
        langToTranslate,
        user?.uid || undefined
      );

      // Wait a bit for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload to get updated state - reload for the language that was just translated
      // This ensures we get the translation we just created
      const result = await getProviderTranslation(providerId, langToTranslate);

      // Only reload for current page language if it's different from the translated language
      // This prevents resetting the translation state
      let currentPageResult = result;
      if (targetLanguage && targetLanguage !== langToTranslate) {
        currentPageResult = await getProviderTranslation(providerId, targetLanguage);
      }

      // Use the translation we just created, or the one from Firestore
      // IMPORTANT: Always use the translation for the language we just translated, not targetLanguage
      const finalTranslation = translation || result.translation;

      setState({
        translation: finalTranslation, // Use the translation we just created (for langToTranslate)
        original: result.original || currentPageResult.original,
        availableLanguages: result.availableLanguages, // Use availableLanguages from the translated language result
        isLoading: false,
        error: null,
      });

      // Keep the manual management flag set - don't reset it yet
      // This prevents automatic loadTranslation from overwriting our state
      currentLanguageRef.current = langToTranslate;

      return translation;
    } catch (error) {
      console.error('[useProviderTranslation] Error in translate:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Translation failed';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Reset manual management flag on error
      isManuallyManagingRef.current = false;

      // Throw the error so the UI can display the actual message
      throw new Error(errorMessage);
    }
  }, [providerId, targetLanguage, user?.uid, loadTranslation]);

  useEffect(() => {
    // If targetLanguage is null, user wants to view original - reset manual management flag
    if (!targetLanguage) {
      isManuallyManagingRef.current = false;
      currentLanguageRef.current = null;
      return;
    }
    
    // Only load translation if targetLanguage is provided (not null)
    // This ensures we don't load translations on initial page load
    // Only reload if providerId exists and targetLanguage is set
    // IMPORTANT: Only reload if targetLanguage matches the one we're supposed to load
    // This prevents resetting state when viewing a specific translation
    if (targetLanguage && providerId) {
      // Only load if targetLanguage matches what we're supposed to load
      // If targetLanguage is null (meaning we're not viewing any translation), don't load
      loadTranslation();
    }
  }, [loadTranslation, targetLanguage, providerId]);

  // Function to reload translation for a specific language
  const reloadForLanguage = useCallback(async (lang: SupportedLanguage) => {
    if (!providerId) return;

    // Mark that we're manually managing this translation
    isManuallyManagingRef.current = true;
    currentLanguageRef.current = lang;

    const result = await getProviderTranslation(providerId, lang);
    setState({
      translation: result.translation,
      original: result.original,
      availableLanguages: result.availableLanguages,
      isLoading: false,
      error: result.error,
    });
  }, [providerId]);

  return {
    ...state,
    translate,
    reload: loadTranslation,
    reloadForLanguage,
  };
}


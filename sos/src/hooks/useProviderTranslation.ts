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

export function useProviderTranslation(
  providerId: string | null,
  targetLanguage: SupportedLanguage | null
) {
  const { user } = useAuth();
  const [state, setState] = useState<ProviderTranslation>({
    translation: null,
    original: null,
    availableLanguages: [],
    isLoading: true,
    error: null,
  });
  
  // Ref to track if we're manually managing a translation (via translate() or reloadForLanguage())
  // This prevents automatic loadTranslation() from overwriting manual state updates
  const isManuallyManagingRef = useRef(false);
  const currentLanguageRef = useRef<SupportedLanguage | null>(null);

  const loadTranslation = useCallback(async () => {
    console.log('[useProviderTranslation] ===== loadTranslation() CALLED =====');
    console.log('[useProviderTranslation] Parameters:', {
      providerId,
      targetLanguage,
      isManuallyManaging: isManuallyManagingRef.current,
      currentLanguage: currentLanguageRef.current,
    });

    // Skip automatic loading if we're manually managing a translation
    if (isManuallyManagingRef.current) {
      console.log('[useProviderTranslation] Skipping automatic loadTranslation - manually managing translation');
      return;
    }

    if (!providerId) {
      console.log('[useProviderTranslation] No providerId, setting empty state');
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
      console.log('[useProviderTranslation] Already have translation for this language, skipping reload');
      return;
    }

    console.log('[useProviderTranslation] Setting loading state...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[useProviderTranslation] Calling getProviderTranslation...');
      const result = await getProviderTranslation(providerId, targetLanguage);
      console.log('[useProviderTranslation] ✓ getProviderTranslation completed');
      console.log('[useProviderTranslation] Result:', {
        hasTranslation: !!result.translation,
        hasOriginal: !!result.original,
        availableLanguages: result.availableLanguages,
        isLoading: result.isLoading,
        error: result.error,
      });
      
      console.log('[useProviderTranslation] Setting state with result...');
      setState(result);
      currentLanguageRef.current = targetLanguage; // Track which language we loaded
      console.log('[useProviderTranslation] ✓ State updated');
      console.log('[useProviderTranslation] ===== loadTranslation() SUCCESS =====');
    } catch (error) {
      console.error('[useProviderTranslation] ===== loadTranslation() ERROR =====');
      console.error('[useProviderTranslation] Error in loadTranslation:', error);
      console.error('[useProviderTranslation] Error details:', {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load translation';
      console.error('[useProviderTranslation] Setting error state:', errorMessage);
      
      setState({
        translation: null,
        original: null,
        availableLanguages: [],
        isLoading: false,
        error: errorMessage,
      });
      console.error('[useProviderTranslation] ===== loadTranslation() ERROR HANDLED =====');
     
    }
  }, [providerId, targetLanguage, state.translation]);

  const translate = useCallback(async (lang?: SupportedLanguage): Promise<TranslatedContent | null> => {
    console.log('[useProviderTranslation] ===== translate() CALLED =====');
    console.log('[useProviderTranslation] Parameters:', {
      providerId,
      lang,
      targetLanguage,
      userId: user?.uid || 'none',
    });

    if (!providerId) {
      console.warn('[useProviderTranslation] No providerId provided');
      return null;
    }

    // Use provided language or fallback to current targetLanguage
    const langToTranslate = lang || targetLanguage;
    console.log('[useProviderTranslation] Language to translate:', langToTranslate);

    // Don't translate for robots
    if (isRobot()) {
      console.warn('[useProviderTranslation] Translation skipped: Robot detected');
      return null;
    }

    // Mark that we're manually managing this translation
    isManuallyManagingRef.current = true;
    currentLanguageRef.current = langToTranslate;

    console.log('[useProviderTranslation] Setting loading state...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[useProviderTranslation] Step 1: Calling requestTranslation...');
      console.log('[useProviderTranslation] Request parameters:', {
        providerId,
        langToTranslate,
        userId: user?.uid,
      });

      // Translation no longer requires authentication - pass undefined if user not logged in
      const translation = await requestTranslation(
        providerId,
        langToTranslate,
        user?.uid || undefined
      );

      console.log('[useProviderTranslation] ✓ Step 1: requestTranslation completed');
      console.log('[useProviderTranslation] Translation received:', {
        hasTranslation: !!translation,
        translationType: typeof translation,
        translationKeys: translation && typeof translation === 'object' ? Object.keys(translation) : [],
      });

      console.log('[useProviderTranslation] Step 2: Reloading translation state...');
      // Wait a bit for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload to get updated state - reload for the language that was just translated
      // This ensures we get the translation we just created
      const result = await getProviderTranslation(providerId, langToTranslate);
      console.log('[useProviderTranslation] ✓ Step 2: Translation state reloaded for language:', langToTranslate);
      console.log('[useProviderTranslation] Reload result:', {
        hasTranslation: !!result.translation,
        hasOriginal: !!result.original,
        availableLanguages: result.availableLanguages,
      });
      
      // Only reload for current page language if it's different from the translated language
      // This prevents resetting the translation state
      let currentPageResult = result;
      if (targetLanguage !== langToTranslate) {
        currentPageResult = await getProviderTranslation(providerId, targetLanguage);
        console.log('[useProviderTranslation] Current page language result:', {
          hasTranslation: !!currentPageResult.translation,
          availableLanguages: currentPageResult.availableLanguages,
        });
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

      console.log('[useProviderTranslation] ===== translate() SUCCESS =====');
      return translation;
    } catch (error) {
      console.error('[useProviderTranslation] ===== translate() ERROR =====');
      console.error('[useProviderTranslation] Error caught in translate():', error);
      console.error('[useProviderTranslation] Error details:', {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        details: (error as any)?.details,
        toString: String(error),
        type: typeof error,
        constructor: (error as any)?.constructor?.name,
        keys: error && typeof error === 'object' ? Object.keys(error) : [],
      });

      // Check for JSON decoding errors specifically
      if (error instanceof Error && (
        error.message.includes('cannot be decoded from JSON') ||
        error.message.includes('decode') ||
        error.message.includes('[object Object]')
      )) {
        console.error('[useProviderTranslation] ✗ JSON DECODING ERROR DETECTED');
        console.error('[useProviderTranslation] This error occurs when Firebase Functions cannot decode the response.');
        console.error('[useProviderTranslation] Possible causes:');
        console.error('[useProviderTranslation] 1. Backend returned non-serializable data');
        console.error('[useProviderTranslation] 2. Response contains circular references');
        console.error('[useProviderTranslation] 3. Response contains functions or other non-JSON types');
        console.error('[useProviderTranslation] 4. Response structure is malformed');
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Translation failed';
      
      console.error('[useProviderTranslation] Setting error state with message:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      // Reset manual management flag on error
      isManuallyManagingRef.current = false;
      
      console.error('[useProviderTranslation] ===== translate() ERROR HANDLED =====');
      // Throw the error so the UI can display the actual message
      throw new Error(errorMessage);
    }
  }, [providerId, targetLanguage, user?.uid, loadTranslation]);

  useEffect(() => {
    // If targetLanguage is null, user wants to view original - reset manual management flag
    if (!targetLanguage) {
      isManuallyManagingRef.current = false;
      currentLanguageRef.current = null;
      console.log('[useProviderTranslation] targetLanguage is null, resetting manual management flag');
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
    console.log('[useProviderTranslation] Reloading for specific language:', lang);
    
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
    
    // Keep the manual management flag set
    console.log('[useProviderTranslation] Reload complete, maintaining manual management for:', lang);
  }, [providerId]);

  return {
    ...state,
    translate,
    reload: loadTranslation,
    reloadForLanguage,
  };
}


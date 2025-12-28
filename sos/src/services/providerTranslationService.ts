// src/services/providerTranslationService.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'pt' | 'de' | 'ru' | 'ch' | 'hi' | 'ar' | "zh";

export interface TranslatedContent {
  title: string;
  summary: string;
  description: string;
  specialties: string[];
  cta: string;
  slug: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    h1: string;
    h2?: string;
    h3?: string;
    imageAltTexts: string[];
    jsonLd: Record<string, unknown>;
  };
  faq?: {
    questions: string[];
    answers: string[];
    jsonLd: Record<string, unknown>;
  };
}

export interface OriginalProfile {
  originalLanguage: string;
  title: string;
  summary: string;
  description: string;
  specialties: string[];
  cta: string;
  lastModified: Date | string;
}

export interface ProviderTranslation {
  translation: TranslatedContent | null;
  original: OriginalProfile | null;
  availableLanguages: SupportedLanguage[];
  isLoading: boolean;
  error: string | null;
}

export interface TranslationStatus {
  status: 'missing' | 'created' | 'outdated' | 'frozen';
  createdAt?: Date;
  updatedAt?: Date;
  cost: number;
  version: number;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'];

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
  ch: '中文',
  hi: 'हिन्दी',
  ar: 'العربية',
  zh: '中文',
};

/**
 * Get provider translation from Firestore
 */
export async function getProviderTranslation(
  providerId: string,
  language: SupportedLanguage
): Promise<ProviderTranslation> {
  try {
    const translationDoc = await getDoc(
      doc(db, 'providers_translations', providerId)
    );

    if (!translationDoc.exists()) {
      return {
        translation: null,
        original: null,
        availableLanguages: [],
        isLoading: false,
        error: null,
      };
    }

    const data = translationDoc.data();
    // Convertir 'ch' en 'zh' car Firebase stocke les traductions avec les clés ISO
    const dbLanguage = language === 'ch' ? 'zh' : language;
    const translation = data.translations?.[dbLanguage] || null;
    const original = data.original || null;
    const availableLanguages = data.metadata?.availableLanguages || [];

    return {
      translation,
      original,
      availableLanguages,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    return {
      translation: null,
      original: null,
      availableLanguages: [],
      isLoading: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Request translation for a provider
 */
export async function requestTranslation(
  providerId: string,
  targetLanguage: SupportedLanguage,
  userId?: string
): Promise<TranslatedContent> {
  console.log('[requestTranslation] ===== FUNCTION CALLED =====');
  console.log('[requestTranslation] Parameters:', {
    providerId,
    targetLanguage,
    userId: userId || 'none',
  });

  try {
    console.log('[requestTranslation] Step 1: Creating callable function reference...');
    const translateProvider = httpsCallable(functions, 'translateProvider');
    console.log('[requestTranslation] ✓ Callable function reference created');

    console.log('[requestTranslation] Step 2: Preparing request payload...');
    const requestPayload = {
      providerId,
      targetLanguage,
      userId,
    };
    console.log('[requestTranslation] Request payload:', JSON.stringify(requestPayload, null, 2));
    console.log('[requestTranslation] Request payload type check:', {
      isObject: typeof requestPayload === 'object',
      keys: Object.keys(requestPayload),
    });

    console.log('[requestTranslation] Step 3: Calling translateProvider function...');
    let result;
    try {
      result = await translateProvider(requestPayload);
      console.log('[requestTranslation] ✓ Function call completed');
    } catch (callError: any) {
      console.error('[requestTranslation] ✗ Error during function call:', callError);
      console.error('[requestTranslation] Call error details:', {
        name: callError?.name,
        message: callError?.message,
        code: callError?.code,
        details: callError?.details,
        stack: callError?.stack,
        toString: String(callError),
        type: typeof callError,
        constructor: callError?.constructor?.name,
        keys: callError && typeof callError === 'object' ? Object.keys(callError) : [],
      });
      throw callError;
    }

    console.log('[requestTranslation] Step 4: Processing function result...');
    console.log('[requestTranslation] Result object:', {
      hasResult: !!result,
      resultType: typeof result,
      resultIsNull: result === null,
      resultIsUndefined: result === undefined,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
      resultConstructor: result?.constructor?.name,
    });

    console.log('[requestTranslation] Step 5: Accessing result.data...');
    let data;
    try {
      console.log('[requestTranslation] Checking result.data existence...');
      console.log('[requestTranslation] result.data check:', {
        hasData: 'data' in (result || {}),
        dataType: typeof (result as any)?.data,
        dataIsNull: (result as any)?.data === null,
        dataIsUndefined: (result as any)?.data === undefined,
      });

      data = (result as any)?.data;
      console.log('[requestTranslation] ✓ result.data accessed successfully');
      console.log('[requestTranslation] Data type:', typeof data);
      console.log('[requestTranslation] Data is null:', data === null);
      console.log('[requestTranslation] Data is undefined:', data === undefined);
      console.log('[requestTranslation] Data is object:', typeof data === 'object');
      console.log('[requestTranslation] Data is array:', Array.isArray(data));

      if (data && typeof data === 'object') {
        console.log('[requestTranslation] Data keys:', Object.keys(data));
        console.log('[requestTranslation] Data stringified length:', JSON.stringify(data).length);
        try {
          const testStringify = JSON.stringify(data);
          console.log('[requestTranslation] ✓ Data is JSON-serializable, length:', testStringify.length);
        } catch (stringifyError) {
          console.error('[requestTranslation] ✗ Data is NOT JSON-serializable:', stringifyError);
          console.error('[requestTranslation] Stringify error:', {
            message: stringifyError instanceof Error ? stringifyError.message : String(stringifyError),
            stack: stringifyError instanceof Error ? stringifyError.stack : undefined,
          });
        }
      }
    } catch (dataAccessError: any) {
      console.error('[requestTranslation] ✗ Error accessing result.data:', dataAccessError);
      console.error('[requestTranslation] Data access error details:', {
        name: dataAccessError?.name,
        message: dataAccessError?.message,
        code: dataAccessError?.code,
        stack: dataAccessError?.stack,
        toString: String(dataAccessError),
        type: typeof dataAccessError,
      });
      throw dataAccessError;
    }

    console.log('[requestTranslation] Step 6: Validating response structure...');
    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('[requestTranslation] ✗ Invalid response structure:', {
        hasData: !!data,
        dataType: typeof data,
        dataValue: data,
      });
      throw new Error('Invalid response from translation service');
    }
    console.log('[requestTranslation] ✓ Response structure is valid');

    console.log('[requestTranslation] Step 7: Checking success flag...');
    // Check for success flag
    if (!data.success) {
      console.error('[requestTranslation] ✗ Request was not successful:', {
        success: data.success,
        error: data.error,
        message: data.message,
      });
      const errorMessage = data.error || data.message || 'Translation failed';
      throw new Error(errorMessage);
    }
    console.log('[requestTranslation] ✓ Success flag is true');

    console.log('[requestTranslation] Step 8: Checking robot flag...');
    // Check if robot (should not happen if frontend checks, but double-check)
    if (data.isRobot) {
      console.warn('[requestTranslation] Robot detected in response');
      throw new Error('Translation not available for robots');
    }
    console.log('[requestTranslation] ✓ Not a robot');

    console.log('[requestTranslation] Step 9: Validating translation exists...');
    // Validate translation exists
    if (!data.translation) {
      console.error('[requestTranslation] ✗ Translation is missing from response:', {
        hasTranslation: !!data.translation,
        translationType: typeof data.translation,
        translationValue: data.translation,
        responseKeys: Object.keys(data),
      });
      throw new Error('Translation service returned no translation data');
    }
    console.log('[requestTranslation] ✓ Translation exists in response');

    console.log('[requestTranslation] Step 10: Validating translation structure...');
    // Validate translation structure
    if (typeof data.translation !== 'object') {
      console.error('[requestTranslation] ✗ Invalid translation structure:', {
        translationType: typeof data.translation,
        translationValue: data.translation,
      });
      throw new Error('Invalid translation data format');
    }
    console.log('[requestTranslation] ✓ Translation structure is valid');
    console.log('[requestTranslation] Translation keys:', Object.keys(data.translation));

    console.log('[requestTranslation] ===== RETURNING TRANSLATION =====');
    return data.translation;
  } catch (error: any) {
    console.error('[requestTranslation] ===== ERROR CAUGHT =====');
    console.error('[requestTranslation] Error object:', error);
    console.error('[requestTranslation] Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack,
      toString: String(error),
      type: typeof error,
      constructor: error?.constructor?.name,
      keys: error && typeof error === 'object' ? Object.keys(error) : [],
    });

    // Check for specific JSON decoding errors
    if (error?.message?.includes('cannot be decoded from JSON') ||
      error?.message?.includes('decode') ||
      error?.message?.includes('[object Object]')) {
      console.error('[requestTranslation] ✗ JSON DECODING ERROR DETECTED');
      console.error('[requestTranslation] This error typically occurs when:');
      console.error('[requestTranslation] 1. The function returns non-serializable data');
      console.error('[requestTranslation] 2. The response contains circular references');
      console.error('[requestTranslation] 3. The response contains functions or other non-JSON types');
    }
    // Handle Firebase HttpsError specifically
    if (error?.code) {
      // Firebase Functions error codes
      const errorMessages: Record<string, string> = {
        'functions/not-found': 'Translation function not found. Please contact support.',
        'functions/permission-denied': 'You do not have permission to translate this profile.',
        'functions/unauthenticated': 'Authentication error occurred. Please try again.',
        'functions/invalid-argument': error.message || 'Invalid translation request.',
        'functions/deadline-exceeded': 'Translation request timed out. Please try again.',
        'functions/resource-exhausted': 'Translation service is temporarily unavailable. Please try again later.',
        'functions/failed-precondition': 'Translation service is not ready. Please try again.',
        'functions/aborted': 'Translation request was cancelled.',
        'functions/out-of-range': 'Translation request is out of range.',
        'functions/unimplemented': 'Translation feature is not yet implemented.',
        'functions/internal': 'An internal error occurred. Please try again later.',
        'functions/unavailable': 'Translation service is unavailable. Please try again later.',
        'functions/data-loss': 'Translation data was lost. Please try again.',
      };

      const message = errorMessages[error.code] || error.message || 'Translation failed';
      throw new Error(message);
    }

    // Handle network errors
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Re-throw if already an Error instance
    if (error instanceof Error) {
      throw error;
    }

    // Fallback for unknown errors
    throw new Error(error?.message || 'Translation failed. Please try again.');
  }
}

/**
 * Request update of existing translations when provider data changes
 * Updates the original profile and re-translates changed fields to all available languages
 */
export async function requestUpdateProviderTranslation(
  providerId: string,
  fieldsUpdated: string[]
): Promise<{ success: boolean; updatedLanguages: string[]; message: string }> {
  if (!fieldsUpdated || fieldsUpdated.length === 0) {
    console.log('[requestUpdateProviderTranslation] No fields to update, skipping');
    return {
      success: true,
      updatedLanguages: [],
      message: 'No fields to update',
    };
  }

  try {
    console.log('[requestUpdateProviderTranslation] Calling updateProviderTranslation function', {
      providerId,
      fieldsUpdated,
    });

    const updateTranslation = httpsCallable(functions, 'updateProviderTranslation');
    const result = await updateTranslation({
      providerId,
      fieldsUpdated,
    });

    const data = (result as any)?.data;

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from translation update service');
    }

    if (!data.success) {
      const errorMessage = data.error || data.message || 'Translation update failed';
      console.warn('[requestUpdateProviderTranslation] Update returned success=false:', errorMessage);
      return {
        success: false,
        updatedLanguages: [],
        message: errorMessage,
      };
    }

    console.log('[requestUpdateProviderTranslation] ✓ Translation update successful', {
      updatedLanguages: data.updatedLanguages,
      failedLanguages: data.failedLanguages,
    });

    return {
      success: true,
      updatedLanguages: data.updatedLanguages || [],
      message: data.message || 'Translations updated successfully',
    };
  } catch (error) {
    console.warn('[requestUpdateProviderTranslation] Error updating translations:', error);
    // Don't throw - translation updates are non-critical
    return {
      success: false,
      updatedLanguages: [],
      message: error instanceof Error ? error.message : 'Translation update failed',
    };
  }
}

/**
 * Check if user is a robot
 */
export function isRobot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  return /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
}

export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES };


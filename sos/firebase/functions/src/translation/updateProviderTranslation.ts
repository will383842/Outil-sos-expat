import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { db } from '../utils/firebase';
import { extractOriginalProfile, translateAllFields, type SupportedLanguage } from '../services/providerTranslationService';

/**
 * Serialize object to make it JSON-safe for Firebase Functions response
 */
function serializeForResponse(obj: any, seen: WeakSet<object> = new WeakSet(), depth: number = 0): any {
  const maxDepth = 10;
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof admin.firestore.Timestamp) {
    return obj.toDate().toISOString();
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (typeof obj === 'function') {
    return undefined;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (depth >= maxDepth) {
    return '[Max Depth Reached]';
  }
  
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  
  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map((item) => 
      serializeForResponse(item, seen, depth + 1)
    );
  }
  
  if (obj instanceof Map) {
    const result: any = {};
    seen.add(obj);
    obj.forEach((value, key) => {
      result[String(key)] = serializeForResponse(value, seen, depth + 1);
    });
    return result;
  }
  
  if (obj instanceof Set) {
    seen.add(obj);
    return Array.from(obj).map((item) => 
      serializeForResponse(item, seen, depth + 1)
    );
  }
  
  seen.add(obj);
  const serialized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        const value = serializeForResponse(obj[key], seen, depth + 1);
        if (value !== undefined) {
          serialized[key] = value;
        }
      } catch (error) {
        console.warn(`[updateProviderTranslation] Failed to serialize property ${key}:`, error);
      }
    }
  }
  return serialized;
}

/**
 * Final cleanup function that ensures response is 100% JSON-serializable
 */
function ensureJsonSerializable(obj: any): any {
  try {
    const serialized = serializeForResponse(obj);
    const jsonString = JSON.stringify(serialized);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[updateProviderTranslation] Error during final cleanup:', error);
    
    // Fallback response
    return {
      success: false,
      error: 'Serialization failed',
      updatedLanguages: [],
    };
  }
}

/**
 * Updates translations for a provider's changed fields
 * Only updates if the providers_translations document already exists
 * 
 * @param providerId - The provider's ID
 * @param fieldsUpdated - Array of field names that were updated
 * @returns Updated language list or empty array if document doesn't exist
 */
export const updateProviderTranslation = onCall(
  {
    region: 'europe-west1',
    cpu: 0.5,
    maxInstances: 5,
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    try {
      console.log('[updateProviderTranslation] ===== FUNCTION CALLED =====');
      console.log('[updateProviderTranslation] Request data:', {
        providerId: request.data?.providerId,
        fieldsUpdated: request.data?.fieldsUpdated,
      });

      const { providerId, fieldsUpdated } = request.data;

      // Step 1: Validate input
      console.log('[updateProviderTranslation] Step 1: Validating input parameters...');
      if (!providerId) {
        console.error('[updateProviderTranslation] Validation failed: Missing providerId');
        throw new HttpsError('invalid-argument', 'providerId is required');
      }

      if (!Array.isArray(fieldsUpdated) || fieldsUpdated.length === 0) {
        console.warn('[updateProviderTranslation] No fields to update, returning empty response');
        const response = {
          success: true,
          updatedLanguages: [],
          message: 'No fields to update',
        };
        return ensureJsonSerializable(response);
      }
      console.log('[updateProviderTranslation] ✓ Step 1: Input validation passed');

      // Step 2: Check if translation document exists
      console.log('[updateProviderTranslation] Step 2: Checking if translation document exists...');
      const translationRef = db.collection('providers_translations').doc(providerId);
      const translationDoc = await translationRef.get();

      if (!translationDoc.exists) {
        console.log('[updateProviderTranslation] ✗ Translation document does NOT exist for provider:', providerId);
        console.log('[updateProviderTranslation] Skipping translation update - document must be created by translateProvider first');
        
        const response = {
          success: true,
          updatedLanguages: [],
          message: 'No translation document found. Call translateProvider first to create translations.',
          translationDocExists: false,
        };
        return ensureJsonSerializable(response);
      }

      const translationData = translationDoc.data()!;
      console.log('[updateProviderTranslation] ✓ Step 2: Translation document exists');
      console.log('[updateProviderTranslation] Available languages:', translationData.metadata?.availableLanguages || []);

      // Step 3: Get available languages from metadata
      console.log('[updateProviderTranslation] Step 3: Extracting available languages...');
      const availableLanguages = translationData.metadata?.availableLanguages || [];

      if (availableLanguages.length === 0) {
        console.warn('[updateProviderTranslation] No languages found in translation metadata');
        const response = {
          success: true,
          updatedLanguages: [],
          message: 'No languages found in translation document',
        };
        return ensureJsonSerializable(response);
      }
      console.log('[updateProviderTranslation] ✓ Step 3: Found languages:', availableLanguages);

      // Step 4: Verify provider exists (needed for extractOriginalProfile)
      console.log('[updateProviderTranslation] Step 4: Verifying provider exists...');
      const providerRef = db.collection('sos_profiles').doc(providerId);
      const providerDoc = await providerRef.get();

      if (!providerDoc.exists) {
        console.error('[updateProviderTranslation] Provider not found in sos_profiles');
        throw new HttpsError('not-found', 'Provider not found in sos_profiles');
      }

      console.log('[updateProviderTranslation] ✓ Step 4: Provider verified');

      // Step 5: Extract original profile
      console.log('[updateProviderTranslation] Step 5: Extracting original profile...');
      let original;
      try {
        original = await extractOriginalProfile(providerId);
        if (!original) {
          throw new Error('Could not extract original profile');
        }
        console.log('[updateProviderTranslation] ✓ Step 5: Original profile extracted');
        console.log('[updateProviderTranslation] Original profile keys:', Object.keys(original || {}));
        const bioPreview = typeof original?.bio === 'string' 
          ? original.bio.substring(0, 100) 
          : original?.bio;
        const descriptionPreview = typeof original?.description === 'string'
          ? original.description.substring(0, 100)
          : original?.description;
        console.log('[updateProviderTranslation] Original bio/description:', {
          bio: bioPreview,
          description: descriptionPreview,
        });
      } catch (error) {
        console.error('[updateProviderTranslation] Error extracting original profile:', error);
        throw new HttpsError('internal', 'Failed to extract original profile');
      }

      // Step 6: Update the original profile in providers_translations
      console.log('[updateProviderTranslation] Step 6: Updating original profile...');
      const removeUndefinedValues = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (Array.isArray(obj)) return obj.map(item => removeUndefinedValues(item));
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
              cleaned[key] = removeUndefinedValues(obj[key]);
            }
          }
          return cleaned;
        }
        return obj;
      };
      
      await translationRef.update({
        original: removeUndefinedValues(original),
        'metadata.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('[updateProviderTranslation] ✓ Step 6: Original profile updated');

      // Step 7: Regenerate translations for all non-frozen languages
      console.log('[updateProviderTranslation] Step 7: Regenerating translations for all languages...');
      const updatePromises: Promise<void>[] = [];
      const updatedLanguages: string[] = [];
      const failedLanguages: string[] = [];
      const frozenLanguages = translationDoc.data()?.metadata?.frozenLanguages || [];

      for (const language of availableLanguages) {
        if (language === 'original') {
          console.log('[updateProviderTranslation] Skipping "original" language');
          continue;
        }

        try {
          // Check if this language is frozen - skip if frozen
          if (frozenLanguages.includes(language)) {
            console.log(`[updateProviderTranslation] ⚠️ Skipping ${language} - translation is frozen`);
            continue; // Skip frozen translations
          }

          // Get current status - only regenerate if translation exists (status is 'created' or 'outdated')
          const currentStatus = translationData.metadata?.translations?.[language]?.status || 'missing';
          
          // Only regenerate if translation exists (status is 'created' or already 'outdated')
          // If status is 'missing', leave it as 'missing' (no translation exists yet)
          if (currentStatus === 'missing') {
            console.log(`[updateProviderTranslation] ⚠️ Skipping ${language} - translation status is 'missing' (no translation exists yet)`);
            continue;
          }

          // Actually regenerate the translation for this language
          console.log(`[updateProviderTranslation] Regenerating translation for ${language}...`);
          const translated = await translateAllFields(original, language as SupportedLanguage);
          const cleanedTranslation = removeUndefinedValues(translated);

          console.log(`[updateProviderTranslation] Translation generated for ${language}, updating Firestore...`);
          console.log(`[updateProviderTranslation] Translation has keys:`, Object.keys(cleanedTranslation || {}));
          const transDescPreview = typeof cleanedTranslation?.description === 'string'
            ? cleanedTranslation.description.substring(0, 100)
            : cleanedTranslation?.description;
          const transBioPreview = typeof cleanedTranslation?.bio === 'string'
            ? cleanedTranslation.bio.substring(0, 100)
            : cleanedTranslation?.bio;
          console.log(`[updateProviderTranslation] Translation description:`, transDescPreview);
          console.log(`[updateProviderTranslation] Translation bio:`, transBioPreview);

          // Update both the translation content AND the status
          const updateObj: any = {
            [`translations.${language}`]: cleanedTranslation, // Update the actual translation content in root translations key
            [`metadata.translations.${language}.status`]: 'updated', // Mark as updated
            [`metadata.translations.${language}.updatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
            [`metadata.translations.${language}.lastFieldsUpdated`]: fieldsUpdated,
            [`metadata.lastUpdated`]: admin.firestore.FieldValue.serverTimestamp(),
          };

          console.log(`[updateProviderTranslation] Firestore update object keys:`, Object.keys(updateObj));
          console.log(`[updateProviderTranslation] Will update translations.${language} with new translated content`);

          updatePromises.push(
            translationRef.update(updateObj)
              .then(() => {
                console.log(`[updateProviderTranslation] ✓ Successfully updated translation for ${language} in Firestore`);
                console.log(`[updateProviderTranslation] ✓ Updated translations.${language} with new content`);
                console.log(`[updateProviderTranslation] ✓ Updated metadata.translations.${language}.status to 'updated'`);
                updatedLanguages.push(language);
              })
              .catch((updateError) => {
                console.error(`[updateProviderTranslation] ✗ Firestore update failed for ${language}:`, updateError);
                console.error(`[updateProviderTranslation] Update error details:`, {
                  message: updateError instanceof Error ? updateError.message : String(updateError),
                  code: (updateError as any)?.code,
                  stack: updateError instanceof Error ? updateError.stack : undefined,
                });
                failedLanguages.push(language);
                // Don't throw - resolve the promise so Promise.all doesn't fail
                // The error is already logged and added to failedLanguages
              })
          );
        } catch (error) {
          console.error(`[updateProviderTranslation] ✗ Error regenerating translation for ${language}:`, error);
          console.error(`[updateProviderTranslation] Error details:`, {
            message: error instanceof Error ? error.message : String(error),
            code: (error as any)?.code,
            stack: error instanceof Error ? error.stack : undefined,
          });
          failedLanguages.push(language);
          // Continue with other languages even if one fails
        }
      }

      // Wait for all update promises to complete
      await Promise.all(updatePromises);

      console.log('[updateProviderTranslation] ✓ Step 7: Translation status updates completed');
      console.log('[updateProviderTranslation] Update summary:', {
        updatedLanguages,
        failedLanguages,
        fieldsUpdated,
      });

      // Step 8: Return success response
      console.log('[updateProviderTranslation] Step 8: Returning success response...');
      const response = {
        success: true,
        updatedLanguages,
        failedLanguages: failedLanguages.length > 0 ? failedLanguages : undefined,
        fieldsUpdated,
        totalLanguagesUpdated: updatedLanguages.length,
        message: `Translations updated for ${updatedLanguages.length} language(s)`,
      };

      const cleanResponse = ensureJsonSerializable(response);
      console.log('[updateProviderTranslation] ===== RETURNING SUCCESS RESPONSE =====');
      return cleanResponse;

    } catch (topLevelError) {
      console.error('[updateProviderTranslation] ===== TOP-LEVEL ERROR CAUGHT =====');
      console.error('[updateProviderTranslation] Error:', topLevelError);

      if (topLevelError instanceof HttpsError) {
        throw topLevelError;
      }

      throw new HttpsError(
        'internal',
        `Internal server error: ${topLevelError instanceof Error ? topLevelError.message : String(topLevelError)}`
      );
    }
  }
);
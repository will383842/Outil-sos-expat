// firebase/functions/src/translation/translateProvider.ts
import { onCall } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import {
  getTranslation,
  extractOriginalProfile,
  translateAllFields,
  SUPPORTED_LANGUAGES,
} from '../services/providerTranslationService';
import { db } from '../utils/firebase';

/**
 * Remove undefined values from an object recursively
 * Firestore doesn't accept undefined values
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefinedValues(value);
        }
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Final cleanup function that ensures response is 100% JSON-serializable
 * Uses JSON.parse(JSON.stringify()) to create a completely clean object
 */
function ensureJsonSerializable(obj: any, depth: number = 0): any {
  const maxDepth = 5; // Prevent infinite recursion
  
  if (depth >= maxDepth) {
    console.warn('[ensureJsonSerializable] Max depth reached, returning safe fallback');
    return null;
  }
  
  try {
    // First, serialize using our custom function to handle Timestamps, etc.
    const serialized = serializeForResponse(obj);
    
    // Then use JSON.parse(JSON.stringify()) to create a completely clean object
    // This removes any remaining non-serializable properties
    const jsonString = JSON.stringify(serialized);
    const cleaned = JSON.parse(jsonString);
    
    return cleaned;
  } catch (error) {
    console.error('[ensureJsonSerializable] Error during final cleanup:', error);
    console.error('[ensureJsonSerializable] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      objType: typeof obj,
      objKeys: obj && typeof obj === 'object' ? Object.keys(obj).slice(0, 10) : [],
    });
    
    // If JSON.parse(JSON.stringify()) fails, try to create a minimal safe response
    try {
      // Fallback: create a minimal response structure without recursion
      if (obj && typeof obj === 'object' && 'success' in obj) {
        // Try to safely extract translation without recursion
        let safeTranslation = null;
        if (obj.translation && typeof obj.translation === 'object') {
          try {
            safeTranslation = JSON.parse(JSON.stringify(serializeForResponse(obj.translation)));
          } catch (e) {
            console.warn('[ensureJsonSerializable] Could not serialize translation, setting to null');
            safeTranslation = null;
          }
        }
        
        return {
          success: obj.success || false,
          translation: safeTranslation,
          cached: obj.cached || false,
          cost: typeof obj.cost === 'number' ? obj.cost : 0,
          error: obj.error || 'Serialization failed',
        };
      }
      // Last resort: return a safe error response
      return {
        success: false,
        error: 'Failed to serialize response',
        translation: null,
      };
    } catch (fallbackError) {
      console.error('[ensureJsonSerializable] Fallback also failed:', fallbackError);
      // Absolute last resort
      return {
        success: false,
        error: 'Critical serialization error',
      };
    }
  }
}

/**
 * Serialize object to make it JSON-safe for Firebase Functions response
 * Converts Firestore Timestamps to ISO strings and handles nested objects
 * Prevents circular references and handles all edge cases
 */
function serializeForResponse(obj: any, seen: WeakSet<object> = new WeakSet(), depth: number = 0, path: string = 'root'): any {
  const maxDepth = 10; // Prevent infinite recursion
  const logDepth = depth <= 3; // Only log first 3 levels to avoid spam
  
  if (logDepth) {
    console.log(`[serializeForResponse] ${path}: Processing, depth=${depth}, type=${typeof obj}`);
  }

  if (obj === null || obj === undefined) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Returning null/undefined`);
    return obj;
  }
  
  // Handle Firestore Timestamp
  if (obj instanceof admin.firestore.Timestamp) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Converting Firestore Timestamp to ISO string`);
    return obj.toDate().toISOString();
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Converting Date to ISO string`);
    return obj.toISOString();
  }
  
  // Handle functions (can't serialize)
  if (typeof obj === 'function') {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Skipping function`);
    return undefined; // Skip functions
  }
  
  // Handle primitives
  if (typeof obj !== 'object') {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Returning primitive value`);
    return obj;
  }
  
  // Prevent infinite recursion
  if (depth >= maxDepth) {
    console.warn(`[serializeForResponse] ${path}: Max depth reached, returning placeholder`);
    return '[Max Depth Reached]';
  }
  
  // Handle circular references
  if (seen.has(obj)) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Circular reference detected`);
    return '[Circular Reference]';
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Processing array with ${obj.length} items`);
    seen.add(obj);
    try {
      const result = obj.map((item, index) => 
        serializeForResponse(item, seen, depth + 1, `${path}[${index}]`)
      );
      if (logDepth) console.log(`[serializeForResponse] ${path}: Array serialized successfully`);
      return result;
    } catch (error) {
      console.error(`[serializeForResponse] ${path}: Error serializing array:`, error);
      throw error;
    }
  }
  
  // Handle Map
  if (obj instanceof Map) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Processing Map with ${obj.size} entries`);
    const result: any = {};
    seen.add(obj);
    try {
      obj.forEach((value, key) => {
        const keyStr = String(key);
        result[keyStr] = serializeForResponse(value, seen, depth + 1, `${path}.${keyStr}`);
      });
      if (logDepth) console.log(`[serializeForResponse] ${path}: Map serialized successfully`);
      return result;
    } catch (error) {
      console.error(`[serializeForResponse] ${path}: Error serializing Map:`, error);
      throw error;
    }
  }
  
  // Handle Set
  if (obj instanceof Set) {
    if (logDepth) console.log(`[serializeForResponse] ${path}: Processing Set with ${obj.size} items`);
    seen.add(obj);
    try {
      const result = Array.from(obj).map((item, index) => 
        serializeForResponse(item, seen, depth + 1, `${path}[${index}]`)
      );
      if (logDepth) console.log(`[serializeForResponse] ${path}: Set serialized successfully`);
      return result;
    } catch (error) {
      console.error(`[serializeForResponse] ${path}: Error serializing Set:`, error);
      throw error;
    }
  }
  
  // Handle plain objects
  if (logDepth) {
    const keys = Object.keys(obj);
    console.log(`[serializeForResponse] ${path}: Processing object with ${keys.length} properties:`, keys.slice(0, 10));
  }
  
  seen.add(obj);
  try {
    const serialized: any = {};
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const key in obj) {
      // Only include own properties, not inherited ones
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        try {
          const value = serializeForResponse(obj[key], seen, depth + 1, `${path}.${key}`);
          // Only include if value is not undefined (functions become undefined)
          if (value !== undefined) {
            serialized[key] = value;
            processedCount++;
          } else {
            skippedCount++;
            if (logDepth) console.log(`[serializeForResponse] ${path}.${key}: Skipped (undefined)`);
          }
        } catch (error) {
          // If serialization fails for a property, skip it
          console.warn(`[serializeForResponse] ${path}.${key}: Failed to serialize property:`, error);
          skippedCount++;
        }
      }
    }
    
    if (logDepth || processedCount > 0 || skippedCount > 0) {
      console.log(`[serializeForResponse] ${path}: Object serialized - processed: ${processedCount}, skipped: ${skippedCount}`);
    }
    
    return serialized;
  } catch (error) {
    console.error(`[serializeForResponse] ${path}: Error serializing object:`, error);
    throw error;
  }
}

export const translateProvider = onCall(
  {
    region: 'europe-west1',
    cpu: 0.5,
    maxInstances: 10,
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    try {
      console.log('[translateProvider] ===== FUNCTION CALLED =====');
    console.log('[translateProvider] Request data:', {
      providerId: request.data?.providerId,
      targetLanguage: request.data?.targetLanguage,
      userId: request.data?.userId,
      hasRawRequest: !!request.rawRequest,
    });

    const { providerId, targetLanguage } = request.data;

    // Step 1: Validate input parameters
    console.log('[translateProvider] Step 1: Validating input parameters...');
    if (!providerId || !targetLanguage) {
      console.error('[translateProvider] Validation failed: Missing required parameters', {
        hasProviderId: !!providerId,
        hasTargetLanguage: !!targetLanguage,
      });
      throw new HttpsError(
        'invalid-argument',
        'providerId and targetLanguage are required'
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      console.error('[translateProvider] Validation failed: Unsupported language', {
        targetLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
      });
      throw new HttpsError(
        'invalid-argument',
        `Unsupported target language: ${targetLanguage}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
      );
    }
    console.log('[translateProvider] ✓ Step 1: Input validation passed');

    // Step 2: Check if translation already exists and its status
    // Possible states: 'missing', 'created', 'outdated', 'frozen'
    console.log('[translateProvider] Step 2: Checking for existing translation and status...');
    let existing;
    let isOutdated = false;
    let translationStatus: 'missing' | 'created' | 'outdated' | 'frozen' | null = null;
    
    // First check the translation document to see if translation exists and its status
    const translationRef = db.collection('providers_translations').doc(providerId);
    const translationDoc = await translationRef.get();
    
    if (translationDoc.exists) {
      const docData = translationDoc.data();
      translationStatus = docData?.metadata?.translations?.[targetLanguage]?.status || 'missing';
      isOutdated = translationStatus === 'outdated';
      console.log('[translateProvider] Translation status check:', {
        status: translationStatus,
        isOutdated,
        isFrozen: docData?.metadata?.frozenLanguages?.includes(targetLanguage),
        possibleStates: ['missing', 'created', 'outdated', 'frozen'],
      });
    } else {
      // Document doesn't exist, so translation is 'missing'
      translationStatus = 'missing';
      console.log('[translateProvider] Translation document does not exist - status: missing');
    }
    
    try {
      existing = await getTranslation(providerId, targetLanguage);
      // If translation doesn't exist but document does, status should be 'missing'
      if (!existing && translationDoc.exists && translationStatus !== 'missing') {
        translationStatus = 'missing';
      }
      console.log('[translateProvider] Existing translation check result:', {
        exists: !!existing,
        hasTranslation: existing ? Object.keys(existing).length : 0,
        status: translationStatus,
        isOutdated,
      });
    } catch (error) {
      console.error('[translateProvider] Error checking existing translation:', error);
      throw error;
    }

    // If translation exists but is outdated, regenerate it instead of returning cached
    if (existing && !isOutdated) {
      console.log('[translateProvider] Step 2a: Translation exists and is up-to-date, serializing cached response...');
      try {
        console.log('[translateProvider] Serializing existing translation object...');
        const serializedTranslation = serializeForResponse(existing);
        console.log('[translateProvider] Serialization successful, keys:', Object.keys(serializedTranslation || {}));
        
        const response = {
          success: true,
          translation: serializedTranslation,
          cached: true,
          cost: 0,
        };
        
        console.log('[translateProvider] Testing JSON serialization of response...');
        const jsonString = JSON.stringify(response);
        console.log('[translateProvider] ✓ JSON serialization test passed, response size:', jsonString.length, 'bytes');
        
        // Use ensureJsonSerializable for final cleanup
        const cleanResponse = ensureJsonSerializable(response);
        console.log('[translateProvider] ✓ Response cleaned and verified');
        console.log('[translateProvider] Final response keys:', Object.keys(cleanResponse || {}));
        
        // Final verification: ensure it can be stringified one more time
        try {
          const finalTest = JSON.stringify(cleanResponse);
          console.log('[translateProvider] ✓ Final JSON.stringify test passed, size:', finalTest.length);
        } catch (finalError) {
          console.error('[translateProvider] ✗ Final JSON.stringify test failed:', finalError);
          throw new HttpsError('internal', 'Response serialization verification failed');
        }
        
        console.log('[translateProvider] ===== RETURNING CACHED TRANSLATION =====');
        return cleanResponse;
      } catch (error) {
        console.error('[translateProvider] ✗ Error serializing cached translation:', error);
        console.error('[translateProvider] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          existingKeys: existing ? Object.keys(existing) : [],
        });
        throw new HttpsError(
          'internal',
          'Failed to serialize translation data: ' + (error instanceof Error ? error.message : String(error))
        );
      }
    }
    // Log status-based action
    if (translationStatus === 'missing') {
      console.log('[translateProvider] ✓ Step 2: Translation status is "missing" - creating new translation');
    } else if (translationStatus === 'outdated') {
      console.log('[translateProvider] ⚠️ Translation status is "outdated" - will REGENERATE and COMPLETELY REPLACE old translation with new one from updated original');
      console.log('[translateProvider] The old translation will be completely overwritten with fresh translation based on latest original profile');
    } else if (translationStatus === 'created') {
      console.log('[translateProvider] ✓ Step 2: Translation status is "created" - translation is up-to-date');
    } else if (translationStatus === 'frozen') {
      console.log('[translateProvider] ⚠️ Translation status is "frozen" - will be handled in Step 6 (frozen check)');
    } else {
      console.log('[translateProvider] ✓ Step 2: Proceeding with translation');
    }

    // Step 3: Get provider data
    console.log('[translateProvider] Step 3: Fetching provider data from Firestore...');
    let providerDoc;
    try {
      providerDoc = await db.collection('sos_profiles').doc(providerId).get();
      console.log('[translateProvider] Provider document fetch result:', {
        exists: providerDoc.exists,
        hasData: providerDoc.exists ? !!providerDoc.data() : false,
      });
    } catch (error) {
      console.error('[translateProvider] Error fetching provider document:', error);
      throw error;
    }

    if (!providerDoc.exists) {
      console.error('[translateProvider] Provider not found in Firestore');
      throw new HttpsError(
        'not-found',
        'Provider not found'
      );
    }
    const providerData = providerDoc.data()!;
    console.log('[translateProvider] ✓ Step 3: Provider data retrieved, keys:', Object.keys(providerData || {}));

    // Step 4: Extract original profile - just get all data from sos_profiles
    console.log('[translateProvider] Step 4: Extracting original profile...');
    let original;
    try {
      original = await extractOriginalProfile(providerId);
      if (!original) {
        throw new HttpsError('not-found', 'Provider not found');
      }
      console.log('[translateProvider] ✓ Step 4: Original profile extracted');
    } catch (error) {
      console.error('[translateProvider] Error extracting original profile:', error);
      throw error;
    }

    // Step 5: Check if robot
    console.log('[translateProvider] Step 5: Checking if request is from robot...');
    const userAgent = request.rawRequest?.headers?.['user-agent'] || '';
    const isRobot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver/i.test(userAgent);
    console.log('[translateProvider] Robot check result:', {
      userAgent: userAgent.substring(0, 100), // Log first 100 chars
      isRobot,
    });
    
    if (isRobot) {
      console.log('[translateProvider] Robot detected, skipping translation');
      const robotResponse = {
        success: true,
        translation: null,
        cached: false,
        cost: 0,
        isRobot: true,
        message: 'Translation skipped for robot',
      };
      // Use ensureJsonSerializable for final cleanup
      const cleanRobotResponse = ensureJsonSerializable(robotResponse);
      console.log('[translateProvider] ===== RETURNING ROBOT RESPONSE =====');
      return cleanRobotResponse;
    }
    console.log('[translateProvider] ✓ Step 5: Not a robot, proceeding with translation');

    // Step 6: Check if translation is frozen BEFORE translating (to save resources)
    // Note: translationRef and doc were already fetched in Step 2, reuse them
    console.log('[translateProvider] Step 6: Checking if translation is frozen...');
    const doc = translationDoc; // Reuse the doc from Step 2
    
    // Check if translation is frozen - if frozen, return existing translation instead of generating new one
    if (doc.exists) {
      const existing = doc.data();
      const frozenLanguages = existing?.metadata?.frozenLanguages || [];
      if (frozenLanguages.includes(targetLanguage)) {
        console.log(`[translateProvider] ⚠️ Translation for ${targetLanguage} is frozen - returning existing translation`);
        
        // Return the existing frozen translation instead of generating a new one
        const existingTranslation = existing?.translations?.[targetLanguage];
        if (existingTranslation) {
          const serializedExisting = serializeForResponse(existingTranslation);
          const cleanExisting = ensureJsonSerializable({
            success: true,
            translation: serializedExisting,
            cached: true,
            cost: 0,
            isFrozen: true,
            message: 'Translation is frozen - returning existing translation',
          });
          console.log('[translateProvider] ===== RETURNING FROZEN TRANSLATION =====');
          return cleanExisting;
        } else {
          // Frozen but no translation exists - return error
          return {
            success: false,
            message: `Translation for ${targetLanguage} is frozen but no translation exists.`,
            translation: null,
          };
        }
      }
    }
    console.log('[translateProvider] ✓ Step 6: Translation is not frozen, proceeding with translation');

    // Step 7: Translate all fields
    console.log('[translateProvider] Step 7: Translating all fields...');
    let translated;
    try {
      translated = await translateAllFields(original, targetLanguage);
      console.log('[translateProvider] ✓ Step 7: Translation completed');
    } catch (error) {
      console.error('[translateProvider] ✗ Error during translation:', error);
      throw error;
    }

    // Step 8: Save original and translated data to providers_translations
    console.log('[translateProvider] Step 8: Saving to providers_translations...');
    try {
      
      // Remove undefined values before saving (Firestore doesn't accept undefined)
      const cleanedTranslation = removeUndefinedValues(translated);
      
      // IMPORTANT: When updating with dot notation like translations.${targetLanguage},
      // Firestore COMPLETELY REPLACES the nested object, so old frozen translation data is fully overwritten
      const updateData: any = {
        [`translations.${targetLanguage}`]: cleanedTranslation, // This COMPLETELY REPLACES the old translation object
        [`metadata.availableLanguages`]: admin.firestore.FieldValue.arrayUnion(targetLanguage),
        [`metadata.lastUpdated`]: admin.firestore.FieldValue.serverTimestamp(),
        [`metadata.translations.${targetLanguage}.status`]: 'created', // Reset from 'outdated' to 'created'
        [`metadata.translations.${targetLanguage}.updatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // If this was a regeneration (outdated), also update the original profile to latest
      if (isOutdated && doc.exists) {
        updateData.original = removeUndefinedValues(original);
        console.log('[translateProvider] ✓ REGENERATING outdated translation:');
        console.log('[translateProvider]   - Old frozen translation will be COMPLETELY REPLACED');
        console.log('[translateProvider]   - New translation generated from updated original profile');
        console.log('[translateProvider]   - Status changed from "outdated" to "created"');
      }
      
      if (!doc.exists) {
        // First time: save original profile (remove undefined values)
        updateData.original = removeUndefinedValues(original);
        // Initialize metadata with all supported languages as 'missing' status
        // Only the target language will be set to 'created'
        const allLanguages = SUPPORTED_LANGUAGES;
        const initialTranslations: any = {};
        allLanguages.forEach(lang => {
          initialTranslations[lang] = {
            status: lang === targetLanguage ? 'created' : 'missing',
            createdAt: lang === targetLanguage ? admin.firestore.FieldValue.serverTimestamp() : null,
            updatedAt: lang === targetLanguage ? admin.firestore.FieldValue.serverTimestamp() : null,
          };
        });
        
        updateData.metadata = {
          availableLanguages: [targetLanguage],
          translationCosts: {},
          totalCost: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          frozenLanguages: [],
          translations: initialTranslations,
        };
        await translationRef.set(updateData);
        console.log('[translateProvider] ✓ Step 8: Original and translation saved');
      } else {
        // Update existing - this will completely replace the translation object for this language
        // Using update() with dot notation completely replaces the nested object
        await translationRef.update(updateData);
        console.log('[translateProvider] ✓ Step 8: Translation saved (old translation completely replaced)');
      }
    } catch (error) {
      console.error('[translateProvider] ✗ Error saving translation:', error);
      throw error;
    }

    // Step 9: Return success response
    console.log('[translateProvider] Step 9: Returning success response...');
    const serializedTranslation = serializeForResponse(translated);
    const response = {
      success: true,
      translation: serializedTranslation,
      cached: false,
      cost: 0,
    };
    
    const cleanResponse = ensureJsonSerializable(response);
    console.log('[translateProvider] ===== RETURNING SUCCESS RESPONSE =====');
    return cleanResponse;
    } catch (topLevelError) {
      // Catch any unhandled errors in the entire function
      console.error('[translateProvider] ===== TOP-LEVEL ERROR CAUGHT =====');
      console.error('[translateProvider] Unhandled error:', topLevelError);
      console.error('[translateProvider] Error details:', {
        name: topLevelError instanceof Error ? topLevelError.name : typeof topLevelError,
        message: topLevelError instanceof Error ? topLevelError.message : String(topLevelError),
        stack: topLevelError instanceof Error ? topLevelError.stack : undefined,
        errorType: topLevelError?.constructor?.name,
        errorKeys: topLevelError && typeof topLevelError === 'object' ? Object.keys(topLevelError) : [],
      });
      
      // If it's already an HttpsError, re-throw it
      if (topLevelError instanceof HttpsError) {
        throw topLevelError;
      }
      
      // Otherwise, wrap it in an HttpsError
      throw new HttpsError(
        'internal',
        `Internal server error: ${topLevelError instanceof Error ? topLevelError.message : String(topLevelError)}`
      );
    }
  }
);


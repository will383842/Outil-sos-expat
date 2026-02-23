// firebase/functions/src/translation/initializeProviderTranslation.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { extractOriginalProfile } from '../services/providerTranslationService';
import { db, FieldValue } from '../utils/firebase';

/**
 * Initialize translation document when a new provider is created
 */
export const initializeProviderTranslation = onDocumentCreated(
  {
    document: 'sos_profiles/{providerId}',
    region: 'europe-west3',
    cpu: 0.083,
  },
  async (event) => {
    const providerId = event.params.providerId;
    const providerData = event.data?.data();

    if (!providerData) {
      console.warn(`No data found for provider ${providerId}`);
      return;
    }

    try {
      // Extract original profile
      const original = await extractOriginalProfile(providerId);
      
      if (!original) {
        console.warn(`Could not extract original profile for provider ${providerId}`);
        return;
      }

      // Check if translation document already exists
      const translationRef = db.collection('providers_translations').doc(providerId);
      const existingDoc = await translationRef.get();

      if (existingDoc.exists) {
        // Update original if it exists but is outdated
        // Ensure translations object exists if it doesn't
        const existingData = existingDoc.data();
        const updateData: any = {
          'original': original,
          'metadata.lastUpdated': FieldValue.serverTimestamp(),
        };
        
        // Ensure translations object exists
        if (!existingData?.translations || typeof existingData.translations !== 'object' || Array.isArray(existingData.translations)) {
          updateData.translations = {};
        }
        
        await translationRef.update(updateData);
        console.log(`Updated original profile for provider ${providerId}`);
      } else {
        // Create new translation document
        await translationRef.set({
          original,
          translations: {},
          metadata: {
            availableLanguages: [],
            translationCosts: {},
            totalCost: 0,
            createdAt: FieldValue.serverTimestamp(),
            lastUpdated: FieldValue.serverTimestamp(),
            frozenLanguages: [],
            translations: {},
          },
        });
        console.log(`Initialized translation document for provider ${providerId}`);
      }
    } catch (error) {
      console.error(`Error initializing translation for provider ${providerId}:`, error);
      // Don't throw - this is a non-critical operation
    }
  }
);


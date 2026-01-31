// src/config/featureFlags.ts
// Configuration centralisée des fonctionnalités activables/désactivables
//
// Pour réactiver une fonctionnalité, changez simplement la valeur de false à true

/**
 * Feature Flags - Fonctionnalités activables/désactivables
 *
 * PROVIDER_TRANSLATION: Système de traduction des pages prestataires
 * - Permet aux utilisateurs de demander la traduction d'une page prestataire
 * - Affiche le TranslationBanner sur les pages prestataires
 * - Active les Cloud Functions translateProvider et updateProviderTranslation
 *
 * Pour réactiver: mettre PROVIDER_TRANSLATION à true
 */

// Type explicite pour permettre true ou false
interface FeatureFlagsConfig {
  PROVIDER_TRANSLATION: boolean;
  // Autres feature flags potentiels (exemples pour le futur)
  // CHAT_SUPPORT: boolean;
  // AI_ASSISTANT: boolean;
  // DARK_MODE: boolean;
}

export const FEATURE_FLAGS: FeatureFlagsConfig = {
  /**
   * Système de traduction des pages prestataires
   *
   * Quand activé (true):
   * - TranslationBanner s'affiche sur les pages prestataires
   * - useProviderTranslation effectue les appels API
   * - Les Cloud Functions de traduction sont appelées
   *
   * Quand désactivé (false):
   * - TranslationBanner retourne null (rien ne s'affiche)
   * - useProviderTranslation retourne un état vide sans appels API
   * - Les données existantes en Firestore sont préservées
   */
  PROVIDER_TRANSLATION: false, // ← Mettre à true pour réactiver
};

// Type helper pour les flags
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// Helper function pour vérifier si une fonctionnalité est activée
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}

// Helper spécifique pour la traduction (pour faciliter l'utilisation)
export function isProviderTranslationEnabled(): boolean {
  return FEATURE_FLAGS.PROVIDER_TRANSLATION;
}

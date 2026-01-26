/**
 * ============================================================================
 * HOOK - useHapticFeedback
 * ============================================================================
 *
 * Fournit un feedback tactile sur les appareils mobiles qui le supportent.
 * Améliore l'UX mobile avec des vibrations subtiles sur les interactions.
 */

import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/** Patterns de vibration en ms pour chaque type de feedback */
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10], // Double tap léger
  warning: [20, 30, 20], // Pattern d'alerte
  error: [30, 50, 30, 50, 30], // Triple tap fort
};

/**
 * Hook pour déclencher un feedback haptique
 *
 * @returns Objet avec les méthodes de feedback
 *
 * @example
 * ```tsx
 * const { trigger, onTap, onSuccess, onError } = useHapticFeedback();
 *
 * const handleClick = () => {
 *   onTap(); // Vibration légère
 *   submitForm();
 * };
 *
 * const handleSuccess = () => {
 *   onSuccess(); // Pattern de succès
 * };
 * ```
 */
export function useHapticFeedback() {
  /**
   * Vérifie si l'API Vibration est disponible
   */
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /**
   * Déclenche une vibration avec le pattern spécifié
   */
  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration not allowed
    }
  }, [isSupported]);

  /**
   * Feedback léger pour les taps/clics
   */
  const onTap = useCallback(() => {
    trigger('light');
  }, [trigger]);

  /**
   * Feedback medium pour les actions importantes
   */
  const onPress = useCallback(() => {
    trigger('medium');
  }, [trigger]);

  /**
   * Feedback pour les actions réussies
   */
  const onSuccess = useCallback(() => {
    trigger('success');
  }, [trigger]);

  /**
   * Feedback pour les avertissements
   */
  const onWarning = useCallback(() => {
    trigger('warning');
  }, [trigger]);

  /**
   * Feedback pour les erreurs
   */
  const onError = useCallback(() => {
    trigger('error');
  }, [trigger]);

  /**
   * Annule toute vibration en cours
   */
  const cancel = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate(0);
  }, [isSupported]);

  return {
    /** API Vibration disponible */
    isSupported,
    /** Déclencher un pattern personnalisé */
    trigger,
    /** Feedback léger (tap/clic) */
    onTap,
    /** Feedback medium (action importante) */
    onPress,
    /** Feedback succès */
    onSuccess,
    /** Feedback avertissement */
    onWarning,
    /** Feedback erreur */
    onError,
    /** Annuler la vibration */
    cancel,
  };
}

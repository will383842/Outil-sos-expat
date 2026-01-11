// src/notificationsonline/playAvailabilityReminder.ts

import { NotificationPreferences } from '../notifications/notificationsDashboardProviders/preferencesProviders';
import voiceMessagesRaw from './voiceTranslateMessages';

// --- Typages stricts pour les données importées --------------------------------

type VoiceMessagesMap = Record<string, string>;
const voiceMessages: VoiceMessagesMap = voiceMessagesRaw as unknown as VoiceMessagesMap;

// --- Constantes ----------------------------------------------------------------

const DEFAULT_PREFS: NotificationPreferences = {
  enableSound: true,
  enableVoice: false,
  enableModal: true,
};

// --- Helpers sûrs pour l'environnement navigateur ------------------------------

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

const getSpeechLocale = (langCode: string): string => {
  // mapping simple, extensible si besoin
  switch (langCode) {
    case 'fr':
      return 'fr-FR';
    case 'en':
      return 'en-US';
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-PT';
    case 'de':
      return 'de-DE';
    case 'it':
      return 'it-IT';
    case 'ru':
      return 'ru-RU';
    case 'ar':
      return 'ar-SA';
    case 'hi':
      return 'hi-IN';
    case 'ch':
    case 'zh':
      return 'zh-CN';
    default:
      // si on reçoit un code déjà localisé (ex: 'nl-NL'), on le renvoie tel quel
      return langCode;
  }
};

// --- API publique ---------------------------------------------------------------

/**
 * Joue une notification sonore OU vocale selon le type demandé.
 * La gestion des intervalles est faite par useProviderReminderSystem.
 *
 * @param type  'sound' pour jouer le son, 'voice' pour le message vocal
 * @param prefs Préférences de notification
 * @param langCode Code ISO langue (ex: 'fr', 'en') - utilisé pour la voix
 */
export const playAvailabilityReminder = (
  type: 'sound' | 'voice',
  prefs: NotificationPreferences = DEFAULT_PREFS,
  langCode: string = 'fr'
): void => {
  if (!isBrowser()) return;

  // --- 🔊 Son ---
  if (type === 'sound' && prefs.enableSound) {
    try {
      const audio = new Audio('/sounds/notification-online.wav');
      audio.volume = 0.4;
      void audio.play().catch((err: unknown) => {
        console.warn('[Reminder] Erreur lecture audio (autoplay policy?):', err);
      });
    } catch (err) {
      console.warn('[Reminder] Audio non supporté:', err);
    }
  }

  // --- 🗣️ Voix ---
  if (type === 'voice' && prefs.enableVoice) {
    const messageToRead: string | undefined =
      voiceMessages[langCode] ?? voiceMessages[getSpeechLocale(langCode)] ?? voiceMessages['en'];

    if (
      typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined' &&
      messageToRead
    ) {
      const utterance = new SpeechSynthesisUtterance(messageToRead);
      utterance.lang = getSpeechLocale(langCode);
      utterance.volume = 0.5;
      utterance.rate = 0.95;

      // Petite latence pour laisser le moteur TTS s'initialiser
      window.setTimeout((): void => {
        try {
          // Cancel any ongoing speech first
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('[Reminder] Erreur synthèse vocale:', err);
        }
      }, 300);
    } else {
      console.warn('[Reminder] SpeechSynthesis non disponible ou message manquant');
    }
  }
};

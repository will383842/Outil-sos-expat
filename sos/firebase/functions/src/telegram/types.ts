/**
 * Types pour le systeme de notifications Telegram SOS Expat
 *
 * Ce module definit tous les types TypeScript pour:
 * - Configuration admin des notifications Telegram
 * - Templates de messages personnalisables
 * - Logs des notifications envoyees
 * - Variables de templates par type d'evenement
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// TYPES DE BASE
// ============================================================================

/**
 * Types d'evenements supportes pour les notifications Telegram
 */
export type TelegramEventType =
  | 'new_registration'
  | 'call_completed'
  | 'payment_received'
  | 'daily_report'
  | 'new_provider'
  | 'new_contact_message'
  | 'negative_review'
  | 'security_alert'
  | 'withdrawal_request';

/**
 * Roles utilisateur supportes dans le systeme
 */
export type UserRole =
  | 'lawyer'
  | 'expat'
  | 'client'
  | 'chatter'
  | 'influencer'
  | 'blogger'
  | 'groupAdmin';

/**
 * Traductions francaises des roles utilisateur
 * Utilise pour l'affichage dans les notifications Telegram
 */
export const ROLE_TRANSLATIONS_FR: Record<UserRole, string> = {
  lawyer: 'Avocat',
  expat: 'Expatrie',
  client: 'Client',
  chatter: 'Chatter',
  influencer: 'Influenceur',
  blogger: 'Blogueur',
  groupAdmin: 'Admin de Groupe',
};

/**
 * Fonction utilitaire pour obtenir la traduction francaise d'un role
 * @param role - Le role en anglais
 * @returns La traduction francaise ou le role original si non trouve
 */
export function getRoleFrench(role: string): string {
  return ROLE_TRANSLATIONS_FR[role as UserRole] || role;
}

// ============================================================================
// CONFIGURATION ADMIN
// ============================================================================

/**
 * Parametres de notification par type d'evenement
 */
export interface NotificationSettings {
  /** Notifier lors d'une nouvelle inscription */
  newRegistration: boolean;
  /** Notifier lors d'un appel termine */
  callCompleted: boolean;
  /** Notifier lors d'un paiement recu */
  paymentReceived: boolean;
  /** Envoyer le rapport quotidien */
  dailyReport: boolean;
  /** Notifier lors d'un nouveau prestataire */
  newProvider: boolean;
  /** Notifier lors d'un nouveau message de contact */
  newContactMessage: boolean;
  /** Notifier lors d'un avis negatif */
  negativeReview: boolean;
  /** Notifier lors d'une alerte de securite */
  securityAlert: boolean;
  /** Notifier lors d'une demande de retrait */
  withdrawalRequest: boolean;
}

/**
 * Configuration admin pour les notifications Telegram
 * Document Firestore: admin_config/telegram_notifications
 */
export interface TelegramAdminConfig {
  /** Numero de telephone de l'admin destinataire (format international +33...) */
  recipientPhoneNumber: string;

  /**
   * Chat ID Telegram du destinataire
   * Rempli automatiquement lorsque l'admin initie une conversation avec le bot
   * null tant que l'admin n'a pas demarre le bot
   */
  recipientChatId: string | null;

  /** Parametres de notification par type d'evenement */
  notifications: NotificationSettings;

  /** Date/heure de la derniere mise a jour */
  updatedAt: Timestamp;

  /** UID de l'admin qui a effectue la derniere mise a jour */
  updatedBy: string;
}

// ============================================================================
// TEMPLATES DE MESSAGES
// ============================================================================

/**
 * Template de notification Telegram personnalisable
 * Collection Firestore: admin_config/telegram_notifications/templates/{eventId}
 */
export interface TelegramAdminTemplate {
  /** Type d'evenement associe a ce template */
  eventId: TelegramEventType;

  /** Activer/desactiver ce type de notification */
  enabled: boolean;

  /**
   * Template du message avec placeholders Mustache
   * Exemple: "Nouveau client: {{EMAIL}} depuis {{COUNTRY}}"
   */
  template: string;

  /**
   * Liste des variables disponibles pour ce template
   * Exemple: ['EMAIL', 'PHONE', 'COUNTRY', 'DATE', 'TIME']
   */
  variables: string[];

  /** Date/heure de la derniere mise a jour */
  updatedAt: Timestamp;
}

// ============================================================================
// LOGS DE NOTIFICATIONS
// ============================================================================

/**
 * Statut d'envoi d'une notification
 */
export type NotificationLogStatus = 'sent' | 'failed' | 'pending';

/**
 * Log d'une notification Telegram envoyee
 * Collection Firestore: admin_config/telegram_notifications/logs/{logId}
 */
export interface TelegramAdminLog {
  /** ID unique du log */
  id: string;

  /** Type d'evenement qui a declenche la notification */
  eventType: TelegramEventType;

  /** Chat ID du destinataire */
  recipientChatId: string;

  /** Message envoye (template avec variables remplacees) */
  message: string;

  /** Statut de l'envoi */
  status: NotificationLogStatus;

  /** Message d'erreur en cas d'echec */
  errorMessage?: string;

  /** Code d'erreur Telegram API en cas d'echec */
  errorCode?: number;

  /** ID du message Telegram retourne par l'API (si succes) */
  telegramMessageId?: number;

  /** Date/heure de l'envoi */
  sentAt: Timestamp;

  /** Donnees contextuelles de l'evenement (pour debug) */
  eventData?: Record<string, unknown>;
}

// ============================================================================
// VARIABLES DE TEMPLATES PAR TYPE D'EVENEMENT
// ============================================================================

/**
 * Variables disponibles pour le template new_registration
 */
export interface NewRegistrationVars {
  /** Role (i18n key) */
  ROLE?: string;
  /** Role (backward compat) */
  ROLE_FR: string;
  EMAIL: string;
  PHONE: string;
  COUNTRY: string;
  DATE: string;
  TIME: string;
}

/**
 * Variables disponibles pour le template call_completed
 */
export interface CallCompletedVars {
  CLIENT_NAME: string;
  PROVIDER_NAME: string;
  /** Provider type (i18n key) */
  PROVIDER_TYPE?: string;
  /** Provider type (backward compat) */
  PROVIDER_TYPE_FR: string;
  DURATION_MINUTES: string;
  DATE: string;
  TIME: string;
}

/**
 * Variables disponibles pour le template payment_received
 */
export interface PaymentReceivedVars {
  /** Montant total du paiement en euros */
  TOTAL_AMOUNT: string;
  /** Commission SOS Expat en euros */
  COMMISSION_AMOUNT: string;
  /** Date du paiement (format DD/MM/YYYY) */
  DATE: string;
  /** Heure du paiement (format HH:MM) */
  TIME: string;
}

/**
 * Variables disponibles pour le template daily_report
 */
export interface DailyReportVars {
  /** Date du rapport (format DD/MM/YYYY) */
  DATE: string;
  /** Chiffre d'affaires total du jour en euros */
  DAILY_CA: string;
  /** Commission SOS Expat du jour en euros */
  DAILY_COMMISSION: string;
  /** Nombre de nouvelles inscriptions du jour */
  REGISTRATION_COUNT: string;
  /** Nombre d'appels termines du jour */
  CALL_COUNT: string;
  /** Heure de generation du rapport (format HH:MM) */
  TIME: string;
}

/**
 * Variables disponibles pour le template new_provider
 * Nouveau prestataire a valider
 */
export interface NewProviderVars {
  PROVIDER_NAME: string;
  PROVIDER_TYPE?: string;
  PROVIDER_TYPE_FR: string;
  EMAIL: string;
  PHONE: string;
  COUNTRY: string;
  DATE: string;
  TIME: string;
}

/**
 * Variables disponibles pour le template new_contact_message
 * Nouveau message de contact
 */
export interface NewContactMessageVars {
  /** Nom de l'expediteur */
  SENDER_NAME: string;
  /** Email de l'expediteur */
  SENDER_EMAIL: string;
  /** Sujet du message */
  SUBJECT: string;
  /** Apercu du message (tronque) */
  MESSAGE_PREVIEW: string;
  /** Date du message (format DD/MM/YYYY) */
  DATE: string;
  /** Heure du message (format HH:MM) */
  TIME: string;
}

/**
 * Variables disponibles pour le template negative_review
 * Avis negatif (1-2 etoiles)
 */
export interface NegativeReviewVars {
  /** Nom du client qui a laisse l'avis */
  CLIENT_NAME: string;
  /** Nom du prestataire concerne */
  PROVIDER_NAME: string;
  /** Note (1 ou 2 etoiles) */
  RATING: string;
  /** Apercu du commentaire (tronque) */
  COMMENT_PREVIEW: string;
  /** Date de l'avis (format DD/MM/YYYY) */
  DATE: string;
  /** Heure de l'avis (format HH:MM) */
  TIME: string;
}

/**
 * Variables disponibles pour le template security_alert
 * Alerte de securite
 */
export interface SecurityAlertVars {
  ALERT_TYPE?: string;
  ALERT_TYPE_FR: string;
  USER_EMAIL: string;
  IP_ADDRESS: string;
  COUNTRY: string;
  DETAILS: string;
  DATE: string;
  TIME: string;
}

/**
 * Variables disponibles pour le template withdrawal_request
 * Demande de retrait affilie
 */
export interface WithdrawalRequestVars {
  USER_NAME: string;
  USER_TYPE?: string;
  USER_TYPE_FR: string;
  AMOUNT: string;
  PAYMENT_METHOD: string;
  DATE: string;
  TIME: string;
}

/**
 * Union type de toutes les variables de templates
 */
export type TemplateVariables =
  | NewRegistrationVars
  | CallCompletedVars
  | PaymentReceivedVars
  | DailyReportVars
  | NewProviderVars
  | NewContactMessageVars
  | NegativeReviewVars
  | SecurityAlertVars
  | WithdrawalRequestVars;

/**
 * Mapping des types d'evenements vers leurs interfaces de variables
 */
export interface TemplateVariablesMap {
  new_registration: NewRegistrationVars;
  call_completed: CallCompletedVars;
  payment_received: PaymentReceivedVars;
  daily_report: DailyReportVars;
  new_provider: NewProviderVars;
  new_contact_message: NewContactMessageVars;
  negative_review: NegativeReviewVars;
  security_alert: SecurityAlertVars;
  withdrawal_request: WithdrawalRequestVars;
}

// ============================================================================
// TYPES UTILITAIRES
// ============================================================================

/**
 * Payload pour envoyer une notification Telegram
 */
export interface SendTelegramNotificationPayload<T extends TelegramEventType> {
  /** Type d'evenement */
  eventType: T;
  /** Variables a injecter dans le template */
  variables: TemplateVariablesMap[T];
  /** Chat ID optionnel (sinon utilise celui de la config) */
  overrideChatId?: string;
}

/**
 * Reponse de l'API Telegram pour sendMessage
 */
export interface TelegramApiResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text: string;
  };
  error_code?: number;
  description?: string;
}

/**
 * Configuration du bot Telegram
 */
export interface TelegramBotConfig {
  /** Token du bot (depuis Secret Manager) */
  botToken: string;
  /** URL de base de l'API Telegram */
  apiBaseUrl: string;
}

/**
 * Constantes pour les chemins Firestore
 */
export const TELEGRAM_FIRESTORE_PATHS = {
  /** Document de configuration principal */
  CONFIG: 'admin_config/telegram_notifications',
  /** Collection des templates */
  TEMPLATES: 'admin_config/telegram_notifications/templates',
  /** Collection des logs */
  LOGS: 'admin_config/telegram_notifications/logs',
} as const;

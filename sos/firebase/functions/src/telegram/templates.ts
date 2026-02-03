/**
 * Telegram Notification Templates
 *
 * This module defines all default templates for Telegram notifications.
 * Templates use Mustache-style placeholders ({{VARIABLE}}) that are
 * replaced with actual values when sending notifications.
 *
 * All templates are in French as the primary user base is francophone.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported notification event types
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
 * Template structure for a single notification type
 */
export interface NotificationTemplate {
  /** The message template with {{PLACEHOLDERS}} */
  template: string;
  /** Human-readable description of this template */
  description: string;
}

/**
 * Configuration for Telegram notifications
 */
export interface TelegramNotificationConfig {
  /** Whether notifications are enabled globally */
  enabled: boolean;
  /** Telegram Bot token (stored in secrets, not here) */
  botTokenSecretName: string;
  /** Default chat ID for notifications */
  defaultChatId: string;
  /** Whether to enable new registration notifications */
  notifyNewRegistration: boolean;
  /** Whether to enable call completed notifications */
  notifyCallCompleted: boolean;
  /** Whether to enable payment received notifications */
  notifyPaymentReceived: boolean;
  /** Whether to enable daily report notifications */
  notifyDailyReport: boolean;
  /** Hour (0-23) to send daily report (Paris timezone) */
  dailyReportHour: number;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
  /** Admin ID who last updated */
  updatedBy: string;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

/**
 * Default notification templates for each event type
 *
 * Templates use Markdown formatting for Telegram:
 * - *bold* for emphasis
 * - Emojis for visual distinction
 * - {{PLACEHOLDER}} for dynamic values
 */
export const DEFAULT_TEMPLATES: Record<TelegramEventType, NotificationTemplate> = {
  /**
   * Template for new user registrations
   * Sent when a new user (client or provider) creates an account
   */
  new_registration: {
    template: `\u{1F195} *Nouvelle inscription*

\u{1F464} R\u00F4le: {{ROLE_FR}}
\u{1F4E7} Email: {{EMAIL}}
\u{1F4F1} T\u00E9l\u00E9phone: {{PHONE}}
\u{1F30D} Pays: {{COUNTRY}}
\u{1F4C5} {{DATE}} \u00E0 {{TIME}}`,
    description: 'Notification envoy\u00E9e lors d\'une nouvelle inscription utilisateur',
  },

  /**
   * Template for completed calls
   * Sent when a call session between client and provider ends
   */
  call_completed: {
    template: `\u{1F4DE} *Appel termin\u00E9*

\u{1F464} Client: {{CLIENT_NAME}}
\u{1F3AF} Prestataire: {{PROVIDER_NAME}} ({{PROVIDER_TYPE_FR}})
\u{23F1}\u{FE0F} Dur\u00E9e: {{DURATION_MINUTES}} min
\u{1F4C5} {{DATE}} \u00E0 {{TIME}}`,
    description: 'Notification envoy\u00E9e lorsqu\'un appel est termin\u00E9',
  },

  /**
   * Template for received payments
   * Sent when a payment is successfully processed
   */
  payment_received: {
    template: `\u{1F4B0} *Paiement re\u00E7u*

\u{1F4B5} CA Total: {{TOTAL_AMOUNT}}\u20AC
\u{1F3E2} Commission SOS Expat: {{COMMISSION_AMOUNT}}\u20AC
\u{1F4C5} {{DATE}} \u00E0 {{TIME}}`,
    description: 'Notification envoy\u00E9e lors de la r\u00E9ception d\'un paiement',
  },

  /**
   * Template for daily activity reports
   * Sent once per day with aggregated statistics
   */
  daily_report: {
    template: `\u{1F4CA} *Rapport quotidien - {{DATE}}*

\u{1F4B0} *Chiffre d'affaires*
   CA Total: {{DAILY_CA}}\u20AC
   Commission SOS Expat: {{DAILY_COMMISSION}}\u20AC

\u{1F4C8} *Activit\u00E9 du jour*
   \u{1F4DD} Inscriptions: {{REGISTRATION_COUNT}}
   \u{1F4DE} Appels: {{CALL_COUNT}}

\u{1F550} G\u00E9n\u00E9r\u00E9 \u00E0 {{TIME}} (Paris)`,
    description: 'Rapport quotidien envoy\u00E9 chaque jour avec les statistiques',
  },

  /**
   * Template for new provider registrations
   * Sent when a new provider signs up and awaits validation
   */
  new_provider: {
    template: `👨‍⚖️ *Nouveau prestataire*

👤 {{PROVIDER_NAME}}
🎯 Type: {{PROVIDER_TYPE_FR}}
📧 {{EMAIL}}
📱 {{PHONE}}
🌍 {{COUNTRY}}

⏳ En attente de validation
📅 {{DATE}} à {{TIME}}`,
    description: 'Notification envoyée lors de l\'inscription d\'un nouveau prestataire',
  },

  /**
   * Template for new contact form messages
   * Sent when someone submits the contact form
   */
  new_contact_message: {
    template: `📩 *Nouveau message contact*

👤 De: {{SENDER_NAME}}
📧 {{SENDER_EMAIL}}
📝 Sujet: {{SUBJECT}}

💬 {{MESSAGE_PREVIEW}}

📅 {{DATE}} à {{TIME}}`,
    description: 'Notification envoyée lors de la réception d\'un message via le formulaire de contact',
  },

  /**
   * Template for negative reviews
   * Sent when a provider receives a low rating
   */
  negative_review: {
    template: `⚠️ *Avis négatif reçu*

⭐ Note: {{RATING}}/5
👤 Client: {{CLIENT_NAME}}
🎯 Prestataire: {{PROVIDER_NAME}}

💬 {{COMMENT_PREVIEW}}

📅 {{DATE}} à {{TIME}}`,
    description: 'Notification envoyée lorsqu\'un prestataire reçoit un avis négatif',
  },

  /**
   * Template for security alerts
   * Sent when suspicious activity is detected
   */
  security_alert: {
    template: `🔐 *Alerte sécurité*

🚨 Type: {{ALERT_TYPE_FR}}
👤 Compte: {{USER_EMAIL}}
🌍 Localisation: {{COUNTRY}}
🔗 IP: {{IP_ADDRESS}}

📋 {{DETAILS}}

📅 {{DATE}} à {{TIME}}`,
    description: 'Notification envoyée lors de la détection d\'une activité suspecte',
  },

  /**
   * Template for withdrawal requests
   * Sent when a user requests a payout
   */
  withdrawal_request: {
    template: `💳 *Demande de retrait*

👤 {{USER_NAME}} ({{USER_TYPE_FR}})
💰 Montant: {{AMOUNT}}€
🏦 Via: {{PAYMENT_METHOD}}

📅 {{DATE}} à {{TIME}}`,
    description: 'Notification envoyée lors d\'une demande de retrait de fonds',
  },
};

// ============================================================================
// TEMPLATE VARIABLES
// ============================================================================

/**
 * Documentation of all available variables for each template type
 *
 * This object serves as a reference for developers and can be used
 * for validation when processing templates.
 */
export const TEMPLATE_VARIABLES: Record<TelegramEventType, string[]> = {
  /**
   * Variables available for new_registration template:
   * - ROLE_FR: User role in French (e.g., "Client", "Avocat", "Comptable")
   * - EMAIL: User's email address
   * - PHONE: User's phone number
   * - COUNTRY: User's country
   * - DATE: Registration date (DD/MM/YYYY format)
   * - TIME: Registration time (HH:MM format)
   */
  new_registration: [
    'ROLE_FR',
    'EMAIL',
    'PHONE',
    'COUNTRY',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for call_completed template:
   * - CLIENT_NAME: Name of the client who made the call
   * - PROVIDER_NAME: Name of the provider who received the call
   * - PROVIDER_TYPE_FR: Provider type in French (e.g., "Avocat", "Comptable")
   * - DURATION_MINUTES: Call duration in minutes
   * - DATE: Call date (DD/MM/YYYY format)
   * - TIME: Call end time (HH:MM format)
   */
  call_completed: [
    'CLIENT_NAME',
    'PROVIDER_NAME',
    'PROVIDER_TYPE_FR',
    'DURATION_MINUTES',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for payment_received template:
   * - TOTAL_AMOUNT: Total payment amount in euros
   * - COMMISSION_AMOUNT: SOS Expat commission in euros
   * - DATE: Payment date (DD/MM/YYYY format)
   * - TIME: Payment time (HH:MM format)
   */
  payment_received: [
    'TOTAL_AMOUNT',
    'COMMISSION_AMOUNT',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for daily_report template:
   * - DATE: Report date (DD/MM/YYYY format)
   * - DAILY_CA: Total daily revenue in euros
   * - DAILY_COMMISSION: Daily SOS Expat commission in euros
   * - REGISTRATION_COUNT: Number of new registrations
   * - CALL_COUNT: Number of completed calls
   * - TIME: Report generation time (HH:MM format)
   */
  daily_report: [
    'DATE',
    'DAILY_CA',
    'DAILY_COMMISSION',
    'REGISTRATION_COUNT',
    'CALL_COUNT',
    'TIME',
  ],

  /**
   * Variables available for new_provider template:
   * - PROVIDER_NAME: Name of the provider
   * - PROVIDER_TYPE_FR: Provider type in French (e.g., "Avocat", "Expert")
   * - EMAIL: Provider's email address
   * - PHONE: Provider's phone number
   * - COUNTRY: Provider's country
   * - DATE: Registration date (DD/MM/YYYY format)
   * - TIME: Registration time (HH:MM format)
   */
  new_provider: [
    'PROVIDER_NAME',
    'PROVIDER_TYPE_FR',
    'EMAIL',
    'PHONE',
    'COUNTRY',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for new_contact_message template:
   * - SENDER_NAME: Name of the message sender
   * - SENDER_EMAIL: Sender's email address
   * - SUBJECT: Message subject
   * - MESSAGE_PREVIEW: Truncated preview of the message
   * - DATE: Message date (DD/MM/YYYY format)
   * - TIME: Message time (HH:MM format)
   */
  new_contact_message: [
    'SENDER_NAME',
    'SENDER_EMAIL',
    'SUBJECT',
    'MESSAGE_PREVIEW',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for negative_review template:
   * - CLIENT_NAME: Name of the client who left the review
   * - PROVIDER_NAME: Name of the provider being reviewed
   * - RATING: Rating given (1-2 stars)
   * - COMMENT_PREVIEW: Truncated preview of the comment
   * - DATE: Review date (DD/MM/YYYY format)
   * - TIME: Review time (HH:MM format)
   */
  negative_review: [
    'CLIENT_NAME',
    'PROVIDER_NAME',
    'RATING',
    'COMMENT_PREVIEW',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for security_alert template:
   * - ALERT_TYPE_FR: Alert type in French
   * - USER_EMAIL: Email of the affected user
   * - IP_ADDRESS: Source IP address
   * - COUNTRY: Country of origin
   * - DETAILS: Additional alert details
   * - DATE: Alert date (DD/MM/YYYY format)
   * - TIME: Alert time (HH:MM format)
   */
  security_alert: [
    'ALERT_TYPE_FR',
    'USER_EMAIL',
    'IP_ADDRESS',
    'COUNTRY',
    'DETAILS',
    'DATE',
    'TIME',
  ],

  /**
   * Variables available for withdrawal_request template:
   * - USER_NAME: Name of the requesting user
   * - USER_TYPE_FR: User type in French
   * - AMOUNT: Requested amount in euros
   * - PAYMENT_METHOD: Chosen payment method
   * - DATE: Request date (DD/MM/YYYY format)
   * - TIME: Request time (HH:MM format)
   */
  withdrawal_request: [
    'USER_NAME',
    'USER_TYPE_FR',
    'AMOUNT',
    'PAYMENT_METHOD',
    'DATE',
    'TIME',
  ],
};

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default configuration for Telegram notifications
 *
 * Note: The actual bot token should be stored in Firebase secrets,
 * not in this configuration. The botTokenSecretName references
 * the secret name in Secret Manager.
 */
export const DEFAULT_CONFIG: Omit<TelegramNotificationConfig, 'updatedAt' | 'updatedBy'> = {
  // Global toggle
  enabled: true,

  // Bot configuration
  botTokenSecretName: 'TELEGRAM_BOT_TOKEN',
  defaultChatId: '',

  // Event toggles
  notifyNewRegistration: true,
  notifyCallCompleted: true,
  notifyPaymentReceived: true,
  notifyDailyReport: true,

  // Daily report timing (21:00 Paris time)
  dailyReportHour: 21,
};

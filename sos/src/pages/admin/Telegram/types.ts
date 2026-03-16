/**
 * Telegram Groups & Bots - Types
 * Mirrors the WhatsApp groups pattern but adapted for Telegram Engine API.
 * Groups are stored in PostgreSQL (engine) instead of Firestore.
 */

/** Roles supported by the Telegram group system */
export type TelegramRole = 'chatter' | 'influencer' | 'blogger' | 'groupAdmin' | 'client' | 'lawyer' | 'expat';

/** Group type: continent-based or language-based fallback */
export type TelegramGroupType = 'continent' | 'language';

/** Manager assigned to a Telegram group */
export interface TelegramGroupManager {
  /** Firestore UID of the manager */
  uid: string;
  /** Display name */
  displayName: string;
  /** Email */
  email: string;
  /** Phone (optional) */
  phone?: string;
  /** Assignment date (ISO string from API) */
  assignedAt?: string;
  /** UID of the admin who assigned */
  assignedBy?: string;
}

/** A Telegram group (from PostgreSQL via Laravel API) */
export interface TelegramGroup {
  /** Auto-increment ID from PostgreSQL */
  id: number;
  /** Unique slug (e.g. "chatter_continent_AF", "chatter_lang_fr") */
  slug: string;
  /** Display name (e.g. "Chatters Afrique") */
  name: string;
  /** Telegram invite link */
  link: string;
  /** Language code (e.g. "fr", "en") */
  language: string;
  /** Target role */
  role: TelegramRole;
  /** Type: continent group or language fallback */
  type: TelegramGroupType;
  /** Continent code (only for type "continent", e.g. "AF", "EU") */
  continent_code?: string | null;
  /** Whether the group is active */
  enabled: boolean;
  /** Managers assigned to this group */
  managers: TelegramGroupManager[];
  /** ISO timestamp */
  created_at?: string;
  /** ISO timestamp */
  updated_at?: string;
}

/** A Telegram bot configuration */
export interface TelegramBot {
  /** Auto-increment ID from PostgreSQL */
  id: number;
  /** Unique slug (e.g. "main", "inbox", "withdrawals") */
  slug: string;
  /** Display name */
  name: string;
  /** Bot API token */
  token: string;
  /** Chat ID for notifications (null if not set) */
  recipient_chat_id: string | null;
  /** Notification toggles per event type */
  notifications: Record<string, boolean>;
  /** Whether the bot is active */
  is_active: boolean;
  /** ISO timestamp */
  created_at?: string;
  /** ISO timestamp */
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All continents with labels and emojis */
export const ALL_CONTINENTS = [
  { code: 'AF', name: 'Afrique', emoji: '🌍' },
  { code: 'AS', name: 'Asie', emoji: '🌏' },
  { code: 'EU', name: 'Europe', emoji: '🇪🇺' },
  { code: 'NA', name: 'Amérique du Nord', emoji: '🌎' },
  { code: 'SA', name: 'Amérique du Sud', emoji: '🌎' },
  { code: 'OC', name: 'Océanie', emoji: '🌏' },
  { code: 'ME', name: 'Moyen-Orient', emoji: '🕌' },
] as const;

/** Supported languages with flags */
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russkiy', flag: '🇷🇺' },
  { code: 'ar', name: 'Al-Arabiyya', flag: '🇸🇦' },
  { code: 'zh', name: 'Zhongwen', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
] as const;

/** Role labels (French) */
export const ROLE_LABELS: Record<TelegramRole, string> = {
  chatter: 'Chatters',
  influencer: 'Influenceurs',
  blogger: 'Blogueurs',
  groupAdmin: 'Group Admins',
  client: 'Clients',
  lawyer: 'Avocats',
  expat: 'Expatriés',
};

/** All event types handled by the Telegram engine */
export const EVENT_TYPES = [
  // Business — inscriptions, appels, prestataires
  'new_registration',
  'call_completed',
  'new_provider',
  // Paiements
  'payment_received',
  'paypal_payment',
  // Retraits
  'withdrawal_request',
  'withdrawal_status',
  // Inbox — messages, feedbacks, candidatures
  'new_contact_message',
  'user_feedback',
  'captain_application',
  'partner_application',
  // Monitoring — avis, sécurité, rapports
  'negative_review',
  'security_alert',
  'daily_report',
] as const;

/** Event type categories for grouped display in admin UI */
export type EventCategory = 'business' | 'payments' | 'withdrawals' | 'inbox' | 'monitoring';

export const EVENT_CATEGORIES: { key: EventCategory; label: string; emoji: string; events: string[] }[] = [
  {
    key: 'business',
    label: 'Business',
    emoji: '📊',
    events: ['new_registration', 'call_completed', 'new_provider'],
  },
  {
    key: 'payments',
    label: 'Paiements',
    emoji: '💳',
    events: ['payment_received', 'paypal_payment'],
  },
  {
    key: 'withdrawals',
    label: 'Retraits',
    emoji: '🏦',
    events: ['withdrawal_request', 'withdrawal_status'],
  },
  {
    key: 'inbox',
    label: 'Inbox & Candidatures',
    emoji: '📬',
    events: ['new_contact_message', 'user_feedback', 'captain_application', 'partner_application'],
  },
  {
    key: 'monitoring',
    label: 'Monitoring',
    emoji: '🔔',
    events: ['negative_review', 'security_alert', 'daily_report'],
  },
];

/** French labels for event types */
export const EVENT_LABELS: Record<string, string> = {
  new_registration: 'Nouvelle inscription',
  call_completed: 'Appel terminé',
  new_provider: 'Nouveau prestataire',
  payment_received: 'Paiement Stripe',
  paypal_payment: 'Paiement PayPal',
  withdrawal_request: 'Demande de retrait',
  withdrawal_status: 'Changement statut retrait',
  new_contact_message: 'Message contact',
  user_feedback: 'Feedback utilisateur',
  captain_application: 'Candidature Captain',
  partner_application: 'Candidature partenaire',
  negative_review: 'Avis négatif',
  security_alert: 'Alerte sécurité',
  daily_report: 'Rapport quotidien',
};

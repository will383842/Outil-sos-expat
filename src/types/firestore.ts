/**
 * =============================================================================
 * FIRESTORE DATA MODEL TYPES - SOS-Expat
 * =============================================================================
 *
 * Types TypeScript pour le modele de donnees Firestore.
 * Ces types sont utilises cote frontend (React) et peuvent etre partages
 * avec le backend (Cloud Functions) via un package commun.
 *
 * CONVENTION:
 * - Interfaces suffixees par "Document" = structure complete Firestore
 * - Interfaces suffixees par "Input" = donnees pour creation
 * - Interfaces suffixees par "Update" = donnees pour mise a jour partielle
 *
 * =============================================================================
 */

import type { Timestamp } from "firebase/firestore";

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type UserRole = "user" | "provider" | "admin" | "superadmin";

export type ProviderType = "lawyer" | "expat";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired"
  | "unpaid"
  | "paused";

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export type ConversationStatus = "active" | "archived" | "expired";

export type MessageRole = "user" | "assistant" | "system" | "provider";

export type MessageSource = "client" | "provider" | "ai" | "system";

export type LLMProvider = "claude" | "gpt" | "perplexity";

export type SubscriptionPlanType = "solo" | "multi" | "enterprise";

export type SubscriptionInterval = "month" | "year";

// =============================================================================
// USERS
// =============================================================================

export interface UserDocument {
  // Identification
  email: string;
  displayName: string;
  photoURL?: string;

  // Role & Permissions
  role: UserRole;
  permissions?: string[];

  // Abonnement (denormalise)
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionExpiresAt?: Timestamp;
  subscriptionId?: string;
  planName?: string;

  // Lien Providers (multi-provider)
  linkedProviderIds: string[];
  activeProviderId?: string;

  // Preferences
  language: "fr" | "en" | "es" | "pt";
  timezone?: string;
  notifications?: UserNotificationPreferences;

  // Tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  loginCount?: number;

  // Flags
  isActive: boolean;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface UserNotificationPreferences {
  email: boolean;
  push: boolean;
  newBooking: boolean;
  urgentOnly: boolean;
}

export interface UserInput {
  email: string;
  displayName: string;
  role?: UserRole;
  language?: "fr" | "en" | "es" | "pt";
}

export interface UserUpdate {
  displayName?: string;
  photoURL?: string;
  language?: "fr" | "en" | "es" | "pt";
  timezone?: string;
  notifications?: Partial<UserNotificationPreferences>;
}

// =============================================================================
// PROVIDERS
// =============================================================================

export interface ProviderDocument {
  // Identification
  email: string;
  name: string;
  type: ProviderType;

  // Profil professionnel
  phone?: string;
  whatsapp?: string;
  company?: string;
  bio?: string;
  photoURL?: string;

  // Localisation
  country: string;
  countries?: string[];
  city?: string;
  address?: string;

  // Competences
  languages: string[];
  specialties?: string[];
  barNumber?: string;
  certifications?: string[];

  // Tarification
  hourlyRate?: number;
  currency?: string;

  // Quotas IA
  aiQuota: number;
  aiCallsUsed: number;
  aiCallsUsedPreviousMonth?: number;
  aiQuotaResetAt?: Timestamp;

  // Statut
  active: boolean;
  verified: boolean;
  verifiedAt?: Timestamp;
  verifiedBy?: string;

  // Stats (denormalisees)
  stats?: ProviderStats;

  // Sync externe
  externalId?: string;
  source: "manual" | "sync" | "import";

  // Tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProviderStats {
  totalBookings: number;
  completedBookings: number;
  avgRating?: number;
  responseTimeAvg?: number;
}

export interface ProviderInput {
  email: string;
  name: string;
  type: ProviderType;
  country: string;
  languages: string[];
  phone?: string;
  specialties?: string[];
}

export interface ProviderUpdate {
  name?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  bio?: string;
  photoURL?: string;
  city?: string;
  languages?: string[];
  specialties?: string[];
  active?: boolean;
}

// =============================================================================
// BOOKINGS
// =============================================================================

export interface BookingDocument {
  // Client
  clientFirstName: string;
  clientLastName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry: string;
  clientNationality: string;
  clientLanguages: string[];

  // Demande
  title: string;
  description: string;
  serviceType?: string;
  category?: string;

  // Urgence & Priorite
  priority: Priority;
  urgency?: UrgencyLevel;

  // Provider assigne
  providerId: string;
  providerType: ProviderType;
  providerName?: string;
  providerCountry?: string;

  // Statut
  status: BookingStatus;
  statusHistory?: StatusChange[];

  // IA
  aiProcessed: boolean;
  aiProcessedAt?: Timestamp;
  conversationId?: string;

  // Completion
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelReason?: string;
  callDuration?: number;

  // Notes
  internalNotes?: string;
  externalNotes?: string;

  // Source & Tracking
  source: "webhook" | "manual" | "api";
  externalId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StatusChange {
  from: string;
  to: string;
  at: Timestamp;
  by?: string;
  source?: string;
}

export interface BookingInput {
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCurrentCountry: string;
  clientNationality: string;
  clientLanguages: string[];
  title: string;
  description: string;
  providerId: string;
  providerType: ProviderType;
  priority?: Priority;
  category?: string;
}

export interface BookingUpdate {
  status?: BookingStatus;
  priority?: Priority;
  internalNotes?: string;
  cancelReason?: string;
}

// =============================================================================
// CONVERSATIONS
// =============================================================================

export interface ConversationDocument {
  // Liens
  bookingId: string;
  providerId: string;
  providerType: ProviderType;
  userId?: string;

  // Contexte persistant
  bookingContext: BookingContext;

  // Resume
  conversationSummary?: string;
  summaryUpdatedAt?: Timestamp;

  // Stats
  messageCount: number;
  lastMessageAt?: Timestamp;
  lastMessageRole?: MessageRole;

  // Statut
  status: ConversationStatus;
  archivedAt?: Timestamp;
  archiveReason?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingContext {
  clientName: string;
  country: string;
  nationality: string;
  title: string;
  description: string;
  category?: string;
  urgency?: UrgencyLevel;
  specialties?: string[];
  languages?: string[];
}

export interface ConversationUpdate {
  status?: ConversationStatus;
  conversationSummary?: string;
  archiveReason?: string;
}

// =============================================================================
// MESSAGES
// =============================================================================

export interface MessageDocument {
  // Contenu
  role: MessageRole;
  source?: MessageSource;
  content: string;

  // Metadonnees IA
  model?: string;
  provider?: LLMProvider;
  citations?: string[];
  searchPerformed?: boolean;
  tokensUsed?: number;

  // Processing
  processed?: boolean;
  processedAt?: Timestamp;
  processingError?: string;

  // Refs
  providerId?: string;

  // Timestamps
  timestamp: Timestamp;
  createdAt: Timestamp;
}

export interface MessageInput {
  role: MessageRole;
  content: string;
  source?: MessageSource;
  providerId?: string;
}

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

export interface SubscriptionDocument {
  // Liens
  userId: string;
  providerId?: string;

  // Plan
  planId: string;
  planName: string;
  planType: SubscriptionPlanType;

  // Pricing
  priceAmount: number;
  priceCurrency: string;
  interval: SubscriptionInterval;

  // Statut
  status: SubscriptionStatus;

  // Periodes
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  trialEnd?: Timestamp;
  canceledAt?: Timestamp;
  cancelAtPeriodEnd: boolean;

  // Quotas/Features
  features: SubscriptionFeatures;

  // Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Sync externe
  externalId?: string;
  source: "stripe" | "manual" | "sync";

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubscriptionFeatures {
  maxProviders: number;
  aiCallsPerMonth: number;
  prioritySupport: boolean;
  customBranding?: boolean;
}

// =============================================================================
// SETTINGS
// =============================================================================

export interface AISettingsDocument {
  enabled: boolean;
  replyOnBookingCreated: boolean;
  replyOnUserMessage: boolean;
  model: string;
  perplexityModel: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  lawyerSystemPrompt?: string;
  expertSystemPrompt?: string;
  usePerplexityForFactual: boolean;
  perplexityTemperature: number;
  useClaudeForLawyers: boolean;
}

export interface SettingsDocument {
  ai: AISettingsDocument;
  quotas: QuotaSettings;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface QuotaSettings {
  defaultAiCallsPerMonth: number;
  maxBookingsPerDay: number;
  maxMessagesPerConversation: number;
}

// =============================================================================
// COUNTRY CONFIGS
// =============================================================================

export interface CountryConfigDocument {
  code: string;
  name: string;
  nameLocal: string;
  languages: string[];
  currency: string;
  timezone: string;
  legalDisclaimer?: string;
  requiresBarNumber?: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// AUDIT LOGS
// =============================================================================

export type AuditAction =
  | "booking_created"
  | "booking_status_updated"
  | "user_login"
  | "user_created"
  | "provider_created"
  | "provider_updated"
  | "subscription_created"
  | "subscription_updated"
  | "settings_updated"
  | "monthly_quota_reset"
  | "monthly_quota_reset_error";

export type AuditResourceType =
  | "booking"
  | "user"
  | "provider"
  | "conversation"
  | "subscription"
  | "settings"
  | "providers";

export interface AuditLogDocument {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;

  // Contexte
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;

  // Details
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>;
  error?: string;

  timestamp: Timestamp;
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export type NotificationType =
  | "new_booking"
  | "booking_completed"
  | "subscription_expiring"
  | "system"
  | "quota_warning";

export interface NotificationDocument {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;

  isRead: boolean;
  readAt?: Timestamp;

  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;

  priority: Priority;
  expiresAt?: Timestamp;

  createdAt: Timestamp;
}

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: Priority;
  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;
}

// =============================================================================
// HELPERS & UTILITIES
// =============================================================================

/**
 * Type pour un document Firestore avec ID
 */
export type WithId<T> = T & { id: string };

/**
 * Type pour convertir Timestamp en Date (pour usage cote client)
 */
export type WithDates<T> = {
  [K in keyof T]: T[K] extends Timestamp
    ? Date
    : T[K] extends Timestamp | undefined
      ? Date | undefined
      : T[K];
};

/**
 * Type pour les donnees avant ecriture (Timestamp optionnel)
 */
export type ForWrite<T> = Omit<T, "createdAt" | "updatedAt"> & {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

/**
 * Collection paths constants
 */
export const COLLECTIONS = {
  USERS: "users",
  PROVIDERS: "providers",
  BOOKINGS: "bookings",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages",
  SUBSCRIPTIONS: "subscriptions",
  SETTINGS: "settings",
  COUNTRY_CONFIGS: "countryConfigs",
  AUDIT_LOGS: "auditLogs",
  NOTIFICATIONS: "notifications",
} as const;

/**
 * Status actifs pour les abonnements
 */
export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

/**
 * Roles avec acces admin
 */
export const ADMIN_ROLES: UserRole[] = ["admin", "superadmin"];

/**
 * Roles avec acces provider
 */
export const PROVIDER_ROLES: UserRole[] = ["provider", "admin", "superadmin"];

/**
 * Verifie si un statut d'abonnement donne acces
 */
export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  return status !== null && ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

/**
 * Verifie si un role est admin
 */
export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Verifie si un role a acces provider
 */
export function hasProviderAccess(role: UserRole): boolean {
  return PROVIDER_ROLES.includes(role);
}

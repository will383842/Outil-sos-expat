// src/contexts/types.ts
import { Timestamp } from 'firebase/firestore';

// ===============================
// TYPES DE BASE POUR L'APPLICATION
// ===============================

// Langues supportées par l'application
export type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";

// Rôles d'utilisateur dans l'application
export type UserRole = "client" | "lawyer" | "expat" | "admin";

// Types de service disponibles
export type ServiceType = "lawyer_call" | "expat_call";

// Statuts de disponibilité
export type AvailabilityStatus = "available" | "busy" | "offline";

// ===============================
// INTERFACES UTILISATEUR
// ===============================

export interface User {
  // Identifiants
  id: string;
  uid?: string;
  email: string;
  emailLower?: string;

  // Informations personnelles
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  name?: string;

  // Profil
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  bio?: string;
  description?: string;

  // Rôle et permissions
  role: UserRole;
  type?: UserRole; // Alias pour compatibilité
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  rejectionReason?: string;
  isActive: boolean;
  isVerified?: boolean;
  isVerifiedEmail?: boolean;
  isBanned?: boolean;
  isVisible?: boolean;
  isOnline?: boolean;

  // Stripe KYC
  stripeAccountId?: string;
  kycStatus?:
    | "not_started"
    | "in_progress"
    | "incomplete"
    | "under_review"
    | "verified"
    | "disconnected";
  stripeOnboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  stripeAccountDisconnected?: boolean;

  // PayPal KYC (pour pays non supportés par Stripe)
  paymentGateway?: 'stripe' | 'paypal';
  paypalAccountStatus?: 'not_connected' | 'pending' | 'active' | 'connected' | 'restricted' | 'error';
  paypalEmail?: string; // Email PayPal pour recevoir les paiements
  paypalMerchantId?: string;
  paypalOnboardingComplete?: boolean;
  paypalPaymentsReceivable?: boolean;
  isPaymentAccountRequired?: boolean;

  // Contact
  phone?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;

  // Localisation
  country?: string;
  currentCountry?: string;
  currentPresenceCountry?: string;
  residenceCountry?: string;
  interventionCountry?: string;

  // Langues
  preferredLanguage?: SupportedLanguage;
  lang?: SupportedLanguage;
  languages?: string[];
  languagesSpoken?: string[];

  // Métriques
  rating?: number;
  averageRating?: number;
  reviewCount?: number;
  totalCalls?: number;
  totalEarnings?: number;
  points?: number;

  // Tarification (pour avocats/expatriés)
  hourlyRate?: number;
  price?: number;
  duration?: number;
  responseTime?: string;

  // Spécialités et compétences
  specialties?: string[];
  helpTypes?: string[];
  certifications?: string[];

  // Expérience professionnelle
  yearsOfExperience?: number;
  yearsAsExpat?: number;
  barNumber?: string;
  lawSchool?: string;
  graduationYear?: number;
  education?: string;

  // Pays d'intervention
  practiceCountries?: string[];
  interventionCountries?: string[];
  operatingCountries?: string[];
  previousCountries?: string[];

  // Statuts et disponibilité
  availability?: AvailabilityStatus;
  isSOS?: boolean;

  // Données techniques
  provider?: string;
  affiliateCode?: string;
  referralBy?: string;
  registrationIP?: string;
  userAgent?: string;
  deviceInfo?: {
    type?: string;
    os?: string;
    browser?: string;
    loginDevice?: string;
    registrationDevice?: string;
    lastActivity?: Date;
    lastActivityCheck?: Date;
    autoOfflineEnabled?: boolean;
    inactivityTimeoutMinutes?: number;
    lastStatusChange?: Date;
  };

  // Horodatage (une seule déclaration avec support Date et Timestamp)
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  approvedAt?: Date | Timestamp;
  reviewedAt?: Date | Timestamp;
  lastLoginAt?: Date | Timestamp;
  lastSeenAt?: Date | Timestamp;
  registrationDate?: string;

  // Motivation (pour expatriés)
  motivation?: string;
}

// ===============================
// INTERFACES DE SERVICE
// ===============================

export interface Service {
  id: string;
  type: ServiceType;
  name: string;
  price: number;
  duration: number;
  description: string;
  isActive: boolean;
}

// ===============================
// INTERFACES DE NOTIFICATION
// ===============================

export interface Notification {
  id: string;
  title?: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
}

// ===============================
// INTERFACES DE CONFIGURATION
// ===============================

export interface AppSettings {
  // Platform info
  platformName?: string;
  platformEmail?: string;

  // Pricing
  lawyerBasePrice?: number;
  expatBasePrice?: number;
  lawyerCallDuration?: number;
  expatCallDuration?: number;
  /** @deprecated Use admin_config/pricing via pricingService instead */
  commissionRate?: number;
  affiliateCommissionRate?: number;

  // Legacy format (for compatibility)
  servicesEnabled?: {
    lawyerCalls: boolean;
    expatCalls: boolean;
  };
  pricing?: {
    lawyerCall: number;
    expatCall: number;
  };
  /** @deprecated Use admin_config/pricing via pricingService instead */
  platformCommission?: number;
  maxCallDuration?: number;
  callTimeout?: number;
  supportedCountries?: string[];
  supportedLanguages?: SupportedLanguage[];
}

export interface EnhancedSettings {
  // Platform state
  maintenanceMode?: boolean;
  allowNewRegistrations?: boolean;
  requireEmailVerification?: boolean;
  defaultLanguage?: SupportedLanguage;
  supportedLanguages?: SupportedLanguage[];

  // Feature flags
  features?: {
    enableChat?: boolean;
    enableVideoCall?: boolean;
    enablePayments?: boolean;
    enableNotifications?: boolean;
    enableAnalytics?: boolean;
  };

  // Legacy format (for compatibility)
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy?: {
    profileVisibility: "public" | "private" | "contacts";
    allowContact: boolean;
    showOnMap: boolean;
  };
  language?: {
    primary: SupportedLanguage;
    secondary?: SupportedLanguage;
    preferredCommunication: SupportedLanguage;
  };
  rateLimit?: {
    apiCallsPerMinute: number;
    lastApiCall: Date;
    callCount: number;
  };
  audit?: {
    lastLogin: Date;
    lastProfileUpdate: Date;
    loginHistory: Array<{
      timestamp: Date;
      ip: string;
      userAgent: string;
    }>;
  };
}

// ===============================
// INTERFACES D'AUTHENTIFICATION
// ===============================

export interface AuthError {
  code: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  userMessage: string;
  helpText?: string;
}

export interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
}

export interface DeviceInfo {
  type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: "slow" | "medium" | "fast";
}

// ===============================
// INTERFACES DE PROVIDER/EXPERT
// ===============================

export interface Provider {
  // Identifiants de base
  id: string;
  uid?: string;

  // Informations personnelles
  name: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  // Type et rôle
  type: "lawyer" | "expat";
  role?: "lawyer" | "expat";

  // Contact
  phone?: string;
  phoneNumber?: string;

  // Localisation
  country: string;
  currentCountry?: string;
  residenceCountry?: string;

  // Profil
  avatar: string;
  profilePhoto?: string;
  description?: string;
  bio?: string;

  // Langues
  languages: string[];
  languagesSpoken?: string[];
  preferredLanguage?: SupportedLanguage;

  // Tarification
  price: number;
  duration: number;
  hourlyRate?: number;

  // Métriques
  rating: number;
  reviewCount: number;
  averageRating?: number;

  // Spécialités
  specialties: string[];
  helpTypes?: string[];

  // Expérience
  yearsOfExperience: number;
  yearsAsExpat?: number;

  // Statuts
  isActive: boolean;
  isApproved: boolean;
  isVisible: boolean;
  isBanned: boolean;
  isOnline: boolean;

  // Dates
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

// ===============================
// INTERFACES DE BOOKING/RÉSERVATION
// ===============================

export interface BookingRequest {
  id?: string;

  // Client
  clientId?: string;
  clientName: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string;
  clientPhone: string;
  clientNationality: string;
  clientCurrentCountry: string;
  clientLanguages: string[];
  clientLanguagesDetails: Array<{ code: string; name: string }>;

  // Provider
  providerId: string;
  providerName: string;
  providerType: "lawyer" | "expat";
  providerCountry: string;
  providerAvatar: string;
  providerEmail?: string;
  providerPhone?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];

  // Service
  title: string;
  description: string;
  price: number;
  duration: number;
  serviceType?: ServiceType;

  // Statut et dates
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: Date;
  updatedAt?: Date;

  // Métadonnées techniques
  ip: string;
  userAgent: string;
}

// ===============================
// INTERFACES DE PAIEMENT
// ===============================

export interface PaymentData {
  amount: number;
  currency: string;
  serviceType: ServiceType;
  providerId: string;
  clientId: string;
  description: string;
  commissionAmount: number;
  providerAmount: number;
}

export interface ServiceData {
  providerId: string;
  serviceType: ServiceType;
  providerRole: "lawyer" | "expat";
  amount: number;
  duration: number;
  clientPhone: string;
  commissionAmount: number;
  providerAmount: number;
}

// ===============================
// TYPES UTILITAIRES
// ===============================

// Type pour les options de sélection
export interface SelectOption {
  value: string;
  label: string;
}

// Type pour les langues avec détails
export interface LanguageOption {
  value: string;
  label: string;
  code?: string;
  name?: string;
}

// Type pour les erreurs de formulaire
export interface FormErrors {
  [key: string]: string;
}

// Type pour les états de chargement
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// ===============================
// TYPES D'ÉVÉNEMENTS
// ===============================

export interface LogEvent {
  type: string;
  category: string;
  data: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

// ===============================
// NOTE: Tous les types sont déjà exportés individuellement ci-dessus
// ===============================
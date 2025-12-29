// src/types/index.ts
// -----------------------------------------------------------------------------
// Central barrel for project types.
// - Pas de `any`: on utilise des interfaces concrètes, `unknown` ou Firebase
//   `DocumentData` lorsque nécessaire.
// - On N'exporte PAS tout depuis ../contexts/types pour éviter les collisions,
//   on ne ré-exporte que les types utiles (User, UserRole, Notification).
// - Le domaine "provider" est exporté depuis ./provider, et on fournit un alias
//   `ProviderDoc` si besoin d'éviter une collision de nom ailleurs.
// -----------------------------------------------------------------------------

import type { DocumentData } from 'firebase/firestore';

// -----------------------------------------------------------------------------
// Ré-export ciblé des types du contexte (évite les conflits de noms)
// -----------------------------------------------------------------------------
export type { User, UserRole, Notification } from '../contexts/types';

// -----------------------------------------------------------------------------
// Domaine Provider (fichier présent dans ce dossier)
// -----------------------------------------------------------------------------
export * from './provider';
export type { Provider as ProviderDoc } from './provider';

// -----------------------------------------------------------------------------
// Domaine Subscription (abonnements IA pour prestataires)
// Currency = 'EUR' | 'USD' (uppercase - display convention)
// -----------------------------------------------------------------------------
export type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionPlan,
  Subscription,
  AiUsage,
  AiCallLog,
  QuotaCheckResult,
  TrialConfig,
  Invoice as SubscriptionInvoice,
  Currency as SubscriptionCurrency,
  BillingPeriod,
  ProviderType as SubscriptionProviderType
} from './subscription';

// -----------------------------------------------------------------------------
// Domaine Pricing (tarification des services/appels)
// ServiceCurrency = 'eur' | 'usd' (lowercase - Stripe API convention)
// -----------------------------------------------------------------------------
export type {
  ServiceCurrency,
  Currency as PricingCurrency,
  ServiceKind,
  PricingNode,
  PricingOverrideNode,
  PricingDoc
} from './pricing';

// -----------------------------------------------------------------------------
// Currency Conversion Utilities
// Helpers to convert between uppercase (display) and lowercase (Stripe) formats
// -----------------------------------------------------------------------------
export type DisplayCurrency = 'EUR' | 'USD';
export type StripeCurrency = 'eur' | 'usd';

/** Convert Stripe currency (lowercase) to display format (uppercase) */
export const toDisplayCurrency = (currency: StripeCurrency): DisplayCurrency => {
  return currency.toUpperCase() as DisplayCurrency;
};

/** Convert display currency (uppercase) to Stripe format (lowercase) */
export const toStripeCurrency = (currency: DisplayCurrency): StripeCurrency => {
  return currency.toLowerCase() as StripeCurrency;
};

/** Normalize any currency string to Stripe format */
export const normalizeToStripeCurrency = (currency: string): StripeCurrency => {
  const lower = currency.toLowerCase();
  if (lower === 'eur' || lower === 'usd') return lower as StripeCurrency;
  return 'eur'; // Default fallback
};

/** Normalize any currency string to display format */
export const normalizeToDisplayCurrency = (currency: string): DisplayCurrency => {
  const upper = currency.toUpperCase();
  if (upper === 'EUR' || upper === 'USD') return upper as DisplayCurrency;
  return 'EUR'; // Default fallback
};

// -----------------------------------------------------------------------------
// Types de domaine transverses (reviews, reports, paiements, appels, etc.)
// Ces interfaces reflètent l'usage observé dans le code et évitent les `any`.
// -----------------------------------------------------------------------------

// Review utilisée dans utils/firestore.ts et AdminReviews.tsx
export interface Review {
  id: string;
  rating: number;
  comment?: string;

  // Dates: createdAt must be Date for sorting/display in Testimonials pages
  createdAt: Date;

  // Infos client / auteur
  clientId?: string;
  clientName?: string;
  clientCountry?: string;
  clientAvatar?: string;       // utilisé dans Testimonials.tsx et TestimonialDetail.tsx
  authorName?: string;
  authorId?: string;

  // Infos prestataire (provider)
  providerId?: string;
  providerName?: string;

  // Lien avec un service / appel
  serviceType?: 'lawyer_call' | 'expat_call';
  callId?: string;

  // Modération / statut (hidden utilisé dans AdminReviews, rejected dans testimonials)
  status?: 'pending' | 'published' | 'rejected' | 'hidden';
  isPublic?: boolean;          // utilisé dans utils/firestore.ts
  moderatorNotes?: string;     // utilisé dans AdminReviews.tsx
  reportedCount?: number;
  verified?: boolean;          // utilisé dans Testimonials.tsx et TestimonialDetail.tsx

  // Divers
  helpfulVotes?: number;

  // Champs additionnels pour les témoignages détaillés (TestimonialDetail.tsx)
  title?: string;
  fullcontent?: string;
  service_used?: string;
  duration?: string;
  help_type?: string[];
}

// Report utilisé dans AdminReports.tsx (statuts stricts)
export interface Report {
  id: string;
  type: 'contact' | 'user' | 'review' | 'call';
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'contact' | 'user' | 'review' | 'call';
  reason: string;
  details: Record<string, unknown>;
  status: 'pending' | 'dismissed' | 'resolved';
  createdAt: Date | number | { toDate(): Date };
  updatedAt: Date | number | { toDate(): Date };

  // Champs additionnels (présents dans certaines variantes de rapports)
  firstName?: string;
  lastName?: string;
  email?: string;
  subject?: string;
  category?: string;
  message?: string;

  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Testimonial {
  id: string;
  name: string;
  message: string;
  rating?: number;
  createdAt?: Date | number;
}

// Paiement (aligné sur les usages AdminPayments)
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status:
    | 'pending'
    | 'succeeded'
    | 'failed'
    | 'canceled'
    | 'authorized'
    | 'captured'
    | 'refunded';
  createdAt: Date | number;
  updatedAt?: Date | number;
  paidAt?: Date | number;
  capturedAt?: Date | number;
  canceledAt?: Date | number;
  refundedAt?: Date | number;

  // Parties
  clientId: string;
  providerId: string;
  clientName?: string;
  providerName?: string;
  clientEmail?: string;
  providerEmail?: string;

  // Détails de calcul
  platformFee: number;
  providerAmount: number;

  // Références Stripe
  stripePaymentIntentId?: string;
  stripeChargeId?: string;

  description?: string;
  refundReason?: string;

  // Factures
  platformInvoiceUrl?: string;
  providerInvoiceUrl?: string;

  // Lien avec l'appel
  callId?: string;
}

// Enregistrements d'appels (AdminCalls / finance éventuel)
export interface CallRecord {
  id: string;
  userId: string;
  providerId: string;
  startedAt: Date | number;
  endedAt?: Date | number;
  createdAt?: Date | number;
  updatedAt?: Date | number;

  // Durées (seconds et/ou minutes selon l'usage)
  durationSec?: number;
  duration?: number; // minutes

  status?:
    | 'missed'
    | 'completed'
    | 'canceled'
    | 'pending'
    | 'in_progress'
    | 'failed'
    | 'refunded';

  serviceType?: 'lawyer_call' | 'expat_call';
}

// Session d'appel (couplage Twilio/CallRecord)
export interface CallSession {
  id: string;
  twilioSid?: string;
  record?: CallRecord;
}

// Mini-profil pour payloads (analytics / after-payment messages)
export interface SosProfile {
  firstName: string;
  nationality?: string;
  country?: string;
  title?: string;
  description?: string;
  language?: string;
}

// Catégorie de provider (peut être affinée si enum disponible)
export type ProviderCategory = string;

// Slot de disponibilité (dashboard provider)
export interface AvailabilitySlot {
  /** 0=Sunday .. 6=Saturday (adapter si 1..7 dans l’app) */
  weekday: number;
  /** Heure de début 'HH:mm' */
  start: string;
  /** Heure de fin 'HH:mm' */
  end: string;
  /** Timezone IANA optionnelle */
  timezone?: string;
}

// -----------------------------------------------------------------------------
// Firestore document-like generic (sans `any`)
// -----------------------------------------------------------------------------
export type Document = DocumentData;

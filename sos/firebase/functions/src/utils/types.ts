import * as admin from 'firebase-admin';

export type FirestoreTimestamp = admin.firestore.Timestamp;
export type FieldValue = admin.firestore.FieldValue;

// Interface de base pour tous les logs
export interface BaseLogEntry {
  timestamp: FieldValue;
  createdAt: Date;
  environment: string;
}

// Interface pour les enregistrements d'appels
export interface CallRecordData extends BaseLogEntry {
  callId: string;
  status: string;
  retryCount: number;
  additionalData?: Record<string, any>;
  duration?: number;
  errorMessage?: string;
}

// Interface pour les logs de notification
export interface NotificationLogData extends BaseLogEntry {
  to: string;
  channel: 'whatsapp' | 'sms' | 'voice' | 'email' | 'push';
  type: 'notify' | 'success' | 'failure' | 'info' | 'warning';
  userId?: string;
  content: string;
  status: 'sent' | 'failed' | 'pending' | 'delivered';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Interface pour les factures
export interface InvoiceRecord extends BaseLogEntry {
  invoiceNumber: string;
  type: 'platform' | 'provider';
  callId: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency: string;
  downloadUrl: string;
  status: 'issued' | 'sent' | 'paid' | 'cancelled' | 'refunded';
  sentToAdmin: boolean;
  locale?: string;
  refundedAt?: admin.firestore.Timestamp | admin.firestore.FieldValue;
  refundReason?: string;
  refundId?: string;
  // P0 FIX: Ajout des noms client/prestataire pour affichage dans les factures
  clientName?: string;
  clientEmail?: string;
  providerName?: string;  // Format: "Prénom L." (première lettre du nom)
  providerEmail?: string;
  // m1 FIX: Champs remise pour conformité (facture doit mentionner la remise appliquée)
  originalAmount?: number;           // Prix avant remise
  discountAmount?: number;           // Montant de la remise
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;            // Valeur brute (ex: 20 pour 20% ou 5 pour 5€)
  promoCode?: string;                // Code promo appliqué
  affiliateDiscountType?: string;    // 'groupAdmin' | 'influencer' si applicable
  affiliateDiscountAmount?: number;  // Montant remise affilié
}

/**
 * Formate le nom du prestataire en "Prénom L." (première lettre du nom de famille)
 * @param firstName - Prénom du prestataire
 * @param lastName - Nom de famille du prestataire
 * @returns Nom formaté "Prénom L." ou prénom seul si pas de nom de famille
 */
export function formatProviderDisplayName(firstName?: string, lastName?: string): string {
  const trimmedFirst = firstName?.trim() || '';
  const trimmedLast = lastName?.trim() || '';

  if (!trimmedFirst && !trimmedLast) {
    return 'Prestataire';
  }

  if (!trimmedLast) {
    return trimmedFirst;
  }

  if (!trimmedFirst) {
    return `${trimmedLast.charAt(0).toUpperCase()}.`;
  }

  return `${trimmedFirst} ${trimmedLast.charAt(0).toUpperCase()}.`;
}

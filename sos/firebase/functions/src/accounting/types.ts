/**
 * Types Comptables - SOS-Expat OU
 *
 * Types TypeScript pour le systeme de generation automatique des ecritures comptables
 *
 * @module accounting/types
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED';

export type SourceDocumentType = 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'SUBSCRIPTION' | 'COMMISSION' | 'WITHDRAWAL' | 'PROVIDER_TRANSFER';

export type ServiceType = 'lawyer_call' | 'expat_call';

export type PaymentProcessor = 'stripe' | 'paypal' | 'wise' | 'bank';

export type CustomerType = 'B2C' | 'B2B';

// =============================================================================
// INTERFACES PRINCIPALES
// =============================================================================

/**
 * Ligne d'ecriture comptable
 */
export interface JournalLine {
  /** Code du compte (ex: "512100") */
  accountCode: string;
  /** Nom du compte (ex: "Stripe") */
  accountName: string;
  /** Montant au debit (en EUR, 2 decimales) */
  debit: number;
  /** Montant au credit (en EUR, 2 decimales) */
  credit: number;
  /** Devise de l'operation (toujours EUR pour la comptabilite) */
  currency: string;
  /** Description optionnelle de la ligne */
  description?: string;
  /** Code taxe applicable (ex: "FR20", "DE19") */
  taxCode?: string;
  /** Code pays ISO pour TVA OSS */
  countryCode?: string;
  /** Devise originale de la transaction (avant conversion EUR) */
  originalCurrency?: string;
  /** Montant original dans la devise source */
  originalAmount?: number;
  /** Taux de change ECB utilise (1 EUR = X devise) */
  exchangeRate?: number;
  /** Date du taux de change ECB utilise (YYYY-MM-DD) */
  exchangeRateDate?: string;
}

/**
 * Document source de l'ecriture
 */
export interface SourceDocument {
  /** Type du document source */
  type: SourceDocumentType;
  /** ID du document dans Firestore */
  id: string;
  /** Collection Firestore du document */
  collection?: string;
}

/**
 * Ecriture comptable complete
 */
export interface JournalEntry {
  /** ID unique de l'ecriture */
  id: string;
  /** Date de l'ecriture */
  date: Timestamp;
  /** Reference unique (ex: "PAY-2024-00001") */
  reference: string;
  /** Libelle de l'ecriture */
  description: string;
  /** Document source ayant genere l'ecriture */
  sourceDocument: SourceDocument;
  /** Lignes de l'ecriture */
  lines: JournalLine[];
  /** Periode comptable (ex: "2024-01") */
  period: string;
  /** Statut de l'ecriture */
  status: JournalEntryStatus;
  /** Total des debits (pour verification) */
  totalDebit: number;
  /** Total des credits (pour verification) */
  totalCredit: number;
  /** Date de creation */
  createdAt: Timestamp | FieldValue;
  /** Date de validation */
  postedAt?: Timestamp;
  /** Utilisateur ayant valide */
  postedBy?: string;
  /** Date d'annulation */
  reversedAt?: Timestamp;
  /** ID de l'ecriture d'extourne */
  reversalEntryId?: string;
  /** Metadonnees additionnelles */
  metadata?: Record<string, unknown>;
}

/**
 * Donnees de creation d'une ecriture comptable
 */
export interface JournalEntryCreateData {
  date: Date;
  description: string;
  sourceDocument: SourceDocument;
  lines: Omit<JournalLine, 'currency'>[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// INTERFACES PAIEMENT
// =============================================================================

/**
 * Informations TVA pour un paiement
 */
export interface VatInfo {
  /** Code pays ISO du client */
  countryCode: string;
  /** Taux de TVA applicable */
  rate: number;
  /** Code compte TVA */
  accountCode: string;
  /** Montant TVA calcule */
  amount: number;
  /** Type de regime (OSS, reverse-charge, exonere) */
  regime: 'OSS' | 'REVERSE_CHARGE' | 'EXEMPT' | 'DOMESTIC';
}

/**
 * Informations client pour calcul TVA
 */
export interface CustomerInfo {
  /** ID client */
  id: string;
  /** Code pays ISO */
  countryCode: string;
  /** Type de client (B2B ou B2C) */
  type: CustomerType;
  /** Numero TVA intracommunautaire (si B2B) */
  vatNumber?: string;
  /** Email */
  email?: string;
}

/**
 * Donnees d'un paiement pour generation d'ecriture
 */
export interface PaymentData {
  /** ID du paiement */
  paymentId: string;
  /** Montant total TTC en centimes */
  amountCents: number;
  /** Montant total TTC en EUR */
  amountEur: number;
  /** Devise originale */
  currency: string;
  /** Frais processeur en centimes */
  processorFeeCents: number;
  /** Frais processeur en EUR */
  processorFeeEur: number;
  /** Commission SOS-Expat en centimes */
  commissionCents: number;
  /** Commission SOS-Expat en EUR */
  commissionEur: number;
  /** Part prestataire en centimes */
  providerAmountCents: number;
  /** Part prestataire en EUR */
  providerAmountEur: number;
  /** Processeur de paiement utilise */
  processor: PaymentProcessor;
  /** Type de service */
  serviceType: ServiceType;
  /** Informations client */
  customer: CustomerInfo;
  /** ID du prestataire */
  providerId: string;
  /** ID de session d'appel */
  callSessionId?: string;
  /** Date du paiement */
  paymentDate: Date;
  /** Metadonnees Stripe/PayPal */
  processorMetadata?: Record<string, unknown>;
}

/**
 * Donnees d'un remboursement pour generation d'ecriture
 */
export interface RefundData {
  /** ID du remboursement */
  refundId: string;
  /** ID du paiement original */
  originalPaymentId: string;
  /** Montant rembourse en centimes */
  amountCents: number;
  /** Montant rembourse en EUR */
  amountEur: number;
  /** Devise */
  currency: string;
  /** Processeur de paiement */
  processor: PaymentProcessor;
  /** Raison du remboursement */
  reason: string;
  /** Type de service original */
  serviceType: ServiceType;
  /** Info TVA du paiement original (pour extourner) */
  originalVatInfo?: VatInfo;
  /** Date du remboursement */
  refundDate: Date;
}

/**
 * Donnees d'un reversement prestataire pour generation d'ecriture
 */
export interface PayoutData {
  /** ID du reversement */
  payoutId: string;
  /** ID du prestataire */
  providerId: string;
  /** Montant brut en centimes */
  grossAmountCents: number;
  /** Montant brut en EUR */
  grossAmountEur: number;
  /** Frais de transfert en centimes */
  transferFeeCents: number;
  /** Frais de transfert en EUR */
  transferFeeEur: number;
  /** Montant net en centimes */
  netAmountCents: number;
  /** Montant net en EUR */
  netAmountEur: number;
  /** Methode de paiement */
  paymentMethod: 'wise' | 'bank_transfer' | 'stripe_connect';
  /** Date du reversement */
  payoutDate: Date;
}

/**
 * Donnees d'un abonnement pour generation d'ecriture
 */
export interface SubscriptionData {
  /** ID de l'abonnement */
  subscriptionId: string;
  /** ID de l'utilisateur */
  userId: string;
  /** Montant TTC en centimes */
  amountCents: number;
  /** Montant TTC en EUR */
  amountEur: number;
  /** Devise */
  currency: string;
  /** Frais processeur en centimes */
  processorFeeCents: number;
  /** Frais processeur en EUR */
  processorFeeEur: number;
  /** Processeur de paiement */
  processor: PaymentProcessor;
  /** Informations client */
  customer: CustomerInfo;
  /** Plan d'abonnement */
  plan: string;
  /** Date du paiement */
  paymentDate: Date;
}

// =============================================================================
// INTERFACES COMMISSIONS & RETRAITS
// =============================================================================

/**
 * Type d'affilié pour les commissions
 */
export type AffiliateUserType = 'chatter' | 'influencer' | 'blogger' | 'group_admin' | 'affiliate';

/**
 * Donnees d'une commission pour generation d'ecriture
 */
export interface CommissionData {
  /** ID de la commission */
  commissionId: string;
  /** Type d'affilié */
  userType: AffiliateUserType;
  /** ID de l'affilié */
  userId: string;
  /** Montant en centimes USD */
  amountCents: number;
  /** Montant en EUR (converti via ECB) */
  amountEur: number;
  /** Devise originale */
  currency: string;
  /** Taux de change ECB utilise */
  exchangeRate: number;
  /** Date du taux ECB */
  exchangeRateDate: string;
  /** Date de la commission */
  commissionDate: Date;
  /** Source (ex: appel, recrutement) */
  source?: string;
}

/**
 * Donnees d'un retrait pour generation d'ecriture
 */
export interface WithdrawalData {
  /** ID du retrait */
  withdrawalId: string;
  /** Type d'affilié */
  userType: AffiliateUserType;
  /** ID de l'affilié */
  userId: string;
  /** Montant demande en centimes USD */
  amountCents: number;
  /** Montant en EUR */
  amountEur: number;
  /** Frais de retrait SOS en centimes USD */
  withdrawalFeeCents: number;
  /** Frais de retrait en EUR */
  withdrawalFeeEur: number;
  /** Devise originale */
  currency: string;
  /** Taux de change ECB */
  exchangeRate: number;
  /** Date du taux ECB */
  exchangeRateDate: string;
  /** Methode de paiement */
  paymentMethod: 'wise' | 'bank_transfer' | 'flutterwave' | 'mobile_money' | 'paypal' | 'stripe';
  /** Date du retrait */
  withdrawalDate: Date;
}

// =============================================================================
// INTERFACES REPORTING
// =============================================================================

/**
 * Balance des comptes pour une periode
 */
export interface AccountBalance {
  /** Code du compte */
  accountCode: string;
  /** Nom du compte */
  accountName: string;
  /** Solde debiteur de la periode */
  periodDebit: number;
  /** Solde crediteur de la periode */
  periodCredit: number;
  /** Solde net de la periode */
  periodBalance: number;
  /** Cumul debit depuis debut exercice */
  cumulativeDebit: number;
  /** Cumul credit depuis debut exercice */
  cumulativeCredit: number;
  /** Solde cumule */
  cumulativeBalance: number;
}

/**
 * Declaration TVA OSS pour une periode
 */
export interface OssVatDeclaration {
  /** Periode (trimestre, ex: "2024-Q1") */
  period: string;
  /** Date de debut */
  startDate: Date;
  /** Date de fin */
  endDate: Date;
  /** Details par pays */
  byCountry: OssCountryDetail[];
  /** Total TVA a declarer */
  totalVat: number;
}

/**
 * Detail TVA OSS par pays
 */
export interface OssCountryDetail {
  /** Code pays ISO */
  countryCode: string;
  /** Nom du pays */
  countryName: string;
  /** Taux de TVA */
  vatRate: number;
  /** Base taxable (commissions HT) */
  taxableBase: number;
  /** TVA collectee */
  vatAmount: number;
  /** Nombre de transactions */
  transactionCount: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration du module comptabilite
 */
export interface AccountingConfig {
  /** Devise de base */
  baseCurrency: string;
  /** Taux de commission standard */
  standardCommissionRate: number;
  /** Pays de siege */
  companyCountry: string;
  /** Taux TVA domestique */
  domesticVatRate: number;
  /** Tolerance pour equilibrage (en EUR) */
  balanceTolerance: number;
  /** Prefixe references */
  referencePrefix: {
    payment: string;
    refund: string;
    payout: string;
    subscription: string;
    commission: string;
    withdrawal: string;
    provider_transfer: string;
  };
}

export const DEFAULT_ACCOUNTING_CONFIG: AccountingConfig = {
  baseCurrency: 'EUR',
  standardCommissionRate: 0.15,
  companyCountry: 'EE',
  domesticVatRate: 0.22,
  balanceTolerance: 0.01,
  referencePrefix: {
    payment: 'PAY',
    refund: 'REF',
    payout: 'OUT',
    subscription: 'SUB',
    commission: 'COM',
    withdrawal: 'WDR',
    provider_transfer: 'TRF',
  },
};

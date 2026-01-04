/**
 * Module Comptabilite - SOS-Expat OU
 *
 * Systeme de generation automatique des ecritures comptables
 * conforme au plan comptable estonien et aux regles TVA OSS.
 *
 * @module accounting
 */

// Types
export * from './types';

// Generateurs d'ecritures
export {
  generatePaymentEntry,
  generateB2BPaymentEntry,
  generateRefundEntry,
  generatePayoutEntry,
  generateSubscriptionEntry,
  validateJournalEntry,
  calculateVatInfo,
} from './generateJournalEntry';

// Service Firestore
export { AccountingService, accountingService } from './accountingService';

// Triggers et fonctions Cloud
export {
  // Triggers automatiques
  onPaymentCompleted,
  onRefundCreated,
  onRefundCompleted,
  onPayoutCompleted,
  onSubscriptionPaymentReceived,

  // Fonctions callable (admin)
  postJournalEntry,
  reverseJournalEntry,
  regenerateJournalEntry,
  getAccountingStats,
  generateOssVatDeclaration,
  getAccountBalances,
} from './triggers';

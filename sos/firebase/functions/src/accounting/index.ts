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
  generateCommissionEntry,
  generateWithdrawalEntry,
  generateProviderTransferEntry,
  validateJournalEntry,
  calculateVatInfo,
} from './generateJournalEntry';

// Service Firestore
export { AccountingService, accountingService } from './accountingService';

// ECB Exchange Rates
export {
  getEurRate,
  convertToEur,
  convertCentsToEur,
  fetchAndStoreDailyRates,
  fetchAndStoreHistoricalRates,
} from './ecbExchangeRateService';

// Period Closing
export { closePeriod, reopenPeriod, generateClosingReport } from './periodClosing';

// Archiving
export { archivePeriod, verifyArchiveIntegrity } from './archiving';

// Scheduled
export { fetchDailyExchangeRates } from './scheduled/fetchDailyExchangeRates';

// Supporting Documents Types
export * from './supportingDocumentTypes';

// Supporting Documents Service
export { SupportingDocumentService, supportingDocumentService } from './supportingDocumentService';

// Supporting Documents Callables
export {
  createSupportingDocument,
  updateSupportingDocument,
  archiveSupportingDocument,
  listSupportingDocuments,
  getSupportingDocument,
  linkDocumentToJournalEntry,
  getDocumentUploadUrl,
  validateSupportingDocument,
  getDocumentStats,
  searchJournalEntries,
  exportSupportingDocuments,
} from './supportingDocumentCallables';

// Triggers et fonctions Cloud
export {
  // Triggers automatiques - Paiements
  onPaymentCompleted,
  onRefundCreated,
  onRefundCompleted,
  onPayoutCompleted,
  onSubscriptionPaymentReceived,

  // Triggers automatiques - Commissions
  onChatterCommissionCreated,
  onInfluencerCommissionCreated,
  onBloggerCommissionCreated,
  onGroupAdminCommissionCreated,
  onAffiliateCommissionCreated,

  // Triggers automatiques - Retraits & Transferts
  onWithdrawalCompleted,
  onProviderTransferCompleted,

  // Callables admin - Ecritures
  postJournalEntry,
  reverseJournalEntry,
  regenerateJournalEntry,
  getAccountingStats,
  generateOssVatDeclaration,
  getAccountBalances,

  // Callables admin - Cloture & Archivage
  closeAccountingPeriod,
  reopenAccountingPeriod,
  getClosingReport,
  archiveAccountingPeriod,
  verifyArchive,

  // Callables admin - Backfill
  backfillCommissions,
  backfillWithdrawals,

  // Callables admin - ECB rates
  triggerFetchExchangeRates,
  triggerFetchHistoricalRates,
} from './triggers';

/**
 * Types Pieces Justificatives - SOS-Expat OU
 *
 * Types TypeScript pour le module de gestion des pieces justificatives
 * (factures fournisseurs, recus, releves bancaires, contrats, etc.)
 *
 * @module accounting/supportingDocumentTypes
 */

import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// CONSTANTES DE VALIDATION
// =============================================================================

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/msword', // doc
  'text/csv',
] as const;

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_FILES_PER_DOCUMENT = 10;
export const DOCUMENT_NUMBER_PREFIX = 'DOC';

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type SupportingDocumentType =
  | 'supplier_invoice'    // Facture fournisseur
  | 'receipt'             // Recu
  | 'bank_statement'      // Releve bancaire
  | 'contract'            // Contrat
  | 'tax_document'        // Document fiscal
  | 'payroll'             // Bulletin de paie
  | 'expense_report'      // Note de frais
  | 'credit_note'         // Avoir
  | 'other';              // Autre

export type SupportingDocumentStatus =
  | 'pending'     // En attente de validation
  | 'validated'   // Valide par un admin
  | 'archived';   // Archive (soft delete)

// =============================================================================
// INTERFACES
// =============================================================================

export interface SupportingDocumentFile {
  /** Nom du fichier original */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** Taille en bytes */
  sizeBytes: number;
  /** Chemin dans Firebase Storage */
  storagePath: string;
}

export interface SupportingDocument {
  /** ID unique (Firestore doc ID) */
  id: string;
  /** Numero sequentiel immutable (DOC-YYYY-NNNNNN) */
  documentNumber: string;
  /** Type de document */
  type: SupportingDocumentType;
  /** Titre descriptif */
  title: string;
  /** Description optionnelle */
  description?: string;
  /** Nom du fournisseur / emetteur */
  supplierName?: string;
  /** Montant en centimes (devise originale) */
  amountCents?: number;
  /** Devise originale (ex: EUR, USD) */
  currency?: string;
  /** Montant en EUR (converti si necessaire) */
  amountEur?: number;
  /** Taux de change utilise pour la conversion EUR */
  exchangeRate?: number;
  /** Date du taux de change ECB utilise */
  exchangeRateDate?: string;
  /** Date du document (date sur la facture/recu) */
  documentDate: Timestamp;
  /** Periode comptable associee (YYYY-MM) */
  accountingPeriod: string;
  /** Statut */
  status: SupportingDocumentStatus;
  /** Fichiers attaches */
  files: SupportingDocumentFile[];
  /** ID de l'ecriture comptable liee (optionnel) */
  linkedJournalEntryId?: string;
  /** Reference de l'ecriture liee (ex: PAY-2024-00001) */
  linkedJournalEntryRef?: string;
  /** Notes internes */
  notes?: string;
  // Audit trail
  /** UID de l'admin qui a uploade */
  uploadedBy: string;
  /** Date de creation */
  createdAt: Timestamp;
  /** Date de derniere modification */
  updatedAt: Timestamp;
  /** UID de l'admin qui a valide */
  validatedBy?: string;
  /** Date de validation */
  validatedAt?: Timestamp;
}

// =============================================================================
// TYPES REQUEST / RESPONSE (Callables)
// =============================================================================

export interface CreateSupportingDocumentRequest {
  type: SupportingDocumentType;
  title: string;
  description?: string;
  supplierName?: string;
  amountCents?: number;
  currency?: string;
  documentDate: string; // ISO string
  accountingPeriod: string; // YYYY-MM
  notes?: string;
  files: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

export interface CreateSupportingDocumentResponse {
  success: boolean;
  documentId: string;
  documentNumber: string;
  uploadUrls: Array<{
    fileName: string;
    uploadUrl: string;
  }>;
}

export interface UpdateSupportingDocumentRequest {
  documentId: string;
  title?: string;
  description?: string;
  supplierName?: string;
  amountCents?: number;
  currency?: string;
  documentDate?: string;
  accountingPeriod?: string;
  notes?: string;
}

export interface ListSupportingDocumentsRequest {
  type?: SupportingDocumentType;
  status?: SupportingDocumentStatus;
  supplierName?: string;
  searchText?: string;
  periodFrom?: string; // YYYY-MM
  periodTo?: string;   // YYYY-MM
  limit?: number;
  startAfter?: string; // cursor (document ID)
}

export interface ListSupportingDocumentsResponse {
  documents: SupportingDocument[];
  hasMore: boolean;
  lastDocId?: string;
}

export interface GetDocumentUploadUrlRequest {
  documentId: string;
  files: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>;
}

export interface GetDocumentUploadUrlResponse {
  uploadUrls: Array<{
    fileName: string;
    uploadUrl: string;
  }>;
}

export interface LinkDocumentRequest {
  documentId: string;
  journalEntryId: string;
}

export interface DocumentStatsResponse {
  total: number;
  pending: number;
  validated: number;
  archived: number;
  thisMonth: number;
}

export interface SearchJournalEntriesRequest {
  query: string; // prefix search on reference
  limit?: number;
}

export interface SearchJournalEntriesResponse {
  entries: Array<{
    id: string;
    reference: string;
    description: string;
    period: string;
  }>;
}

export interface ExportDocumentsRequest {
  type?: SupportingDocumentType;
  status?: SupportingDocumentStatus;
  periodFrom?: string;
  periodTo?: string;
  supplierName?: string;
  fiscalYear?: number;
}

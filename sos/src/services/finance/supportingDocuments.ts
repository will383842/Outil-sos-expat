/**
 * Service Frontend - Pieces Justificatives
 *
 * Appels callables et upload fichiers via signed URLs.
 */

import { functionsWest3, safeCall } from '@/config/firebase';

// =============================================================================
// TYPES (mirror backend)
// =============================================================================

export type SupportingDocumentType =
  | 'supplier_invoice' | 'receipt' | 'bank_statement' | 'contract'
  | 'tax_document' | 'payroll' | 'expense_report' | 'credit_note' | 'other';

export type SupportingDocumentStatus = 'pending' | 'validated' | 'archived';

export interface SupportingDocumentFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface SupportingDocument {
  id: string;
  documentNumber: string;
  type: SupportingDocumentType;
  title: string;
  description?: string;
  supplierName?: string;
  amountCents?: number;
  currency?: string;
  amountEur?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
  documentDate: { _seconds: number; _nanoseconds: number };
  accountingPeriod: string;
  status: SupportingDocumentStatus;
  files: SupportingDocumentFile[];
  linkedJournalEntryId?: string;
  linkedJournalEntryRef?: string;
  notes?: string;
  uploadedBy: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  updatedAt: { _seconds: number; _nanoseconds: number };
  validatedBy?: string;
  validatedAt?: { _seconds: number; _nanoseconds: number };
  readUrls?: Array<{ fileName: string; readUrl: string }>;
}

export interface ListDocumentsResponse {
  documents: SupportingDocument[];
  hasMore: boolean;
  lastDocId?: string;
}

export interface CreateDocumentResponse {
  success: boolean;
  documentId: string;
  documentNumber: string;
  uploadUrls: Array<{ fileName: string; uploadUrl: string }>;
}

export interface DocumentStatsResponse {
  total: number;
  pending: number;
  validated: number;
  archived: number;
  thisMonth: number;
}

export interface JournalEntrySearchResult {
  id: string;
  reference: string;
  description: string;
  period: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

export const DOCUMENT_TYPES: { value: SupportingDocumentType; labelKey: string }[] = [
  { value: 'supplier_invoice', labelKey: 'supportingDocs.type.supplierInvoice' },
  { value: 'receipt', labelKey: 'supportingDocs.type.receipt' },
  { value: 'bank_statement', labelKey: 'supportingDocs.type.bankStatement' },
  { value: 'contract', labelKey: 'supportingDocs.type.contract' },
  { value: 'tax_document', labelKey: 'supportingDocs.type.taxDocument' },
  { value: 'payroll', labelKey: 'supportingDocs.type.payroll' },
  { value: 'expense_report', labelKey: 'supportingDocs.type.expenseReport' },
  { value: 'credit_note', labelKey: 'supportingDocs.type.creditNote' },
  { value: 'other', labelKey: 'supportingDocs.type.other' },
];

export const STATUS_OPTIONS: { value: SupportingDocumentStatus; labelKey: string }[] = [
  { value: 'pending', labelKey: 'supportingDocs.status.pending' },
  { value: 'validated', labelKey: 'supportingDocs.status.validated' },
  { value: 'archived', labelKey: 'supportingDocs.status.archived' },
];

/** All ECB-supported currencies for the currency selector */
export const ECB_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK',
  'PLN', 'CZK', 'HUF', 'RON', 'BGN',
  'JPY', 'AUD', 'CAD', 'NZD',
  'TRY', 'BRL', 'CNY', 'HKD', 'IDR', 'ILS', 'INR',
  'KRW', 'MXN', 'MYR', 'PHP', 'SGD', 'THB', 'ZAR',
];

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_DOCUMENT = 10;

// =============================================================================
// API CALLS
// =============================================================================

export async function createSupportingDocument(data: {
  type: SupportingDocumentType;
  title: string;
  description?: string;
  supplierName?: string;
  amountCents?: number;
  currency?: string;
  documentDate: string;
  accountingPeriod: string;
  notes?: string;
  files: Array<{ fileName: string; mimeType: string; sizeBytes: number }>;
}): Promise<CreateDocumentResponse> {
  return safeCall<CreateDocumentResponse>(functionsWest3, 'createSupportingDocument', data as unknown as Record<string, unknown>);
}

export async function updateSupportingDocument(data: {
  documentId: string;
  title?: string;
  description?: string;
  supplierName?: string;
  amountCents?: number;
  currency?: string;
  documentDate?: string;
  accountingPeriod?: string;
  notes?: string;
}): Promise<{ success: boolean }> {
  return safeCall(functionsWest3, 'updateSupportingDocument', data as unknown as Record<string, unknown>);
}

export async function archiveSupportingDocument(documentId: string): Promise<{ success: boolean }> {
  return safeCall(functionsWest3, 'archiveSupportingDocument', { documentId });
}

export async function listSupportingDocuments(filters: {
  type?: SupportingDocumentType;
  status?: SupportingDocumentStatus;
  supplierName?: string;
  searchText?: string;
  periodFrom?: string;
  periodTo?: string;
  limit?: number;
  startAfter?: string;
}): Promise<ListDocumentsResponse> {
  return safeCall<ListDocumentsResponse>(functionsWest3, 'listSupportingDocuments', filters as unknown as Record<string, unknown>);
}

export async function getSupportingDocument(documentId: string): Promise<SupportingDocument> {
  return safeCall<SupportingDocument>(functionsWest3, 'getSupportingDocument', { documentId });
}

export async function linkDocumentToJournalEntry(documentId: string, journalEntryId: string): Promise<{ success: boolean }> {
  return safeCall(functionsWest3, 'linkDocumentToJournalEntry', { documentId, journalEntryId });
}

export async function getDocumentUploadUrl(documentId: string, files: Array<{ fileName: string; mimeType: string; sizeBytes: number }>): Promise<{
  uploadUrls: Array<{ fileName: string; uploadUrl: string }>;
}> {
  return safeCall(functionsWest3, 'getDocumentUploadUrl', { documentId, files });
}

export async function validateSupportingDocument(documentId: string): Promise<{ success: boolean }> {
  return safeCall(functionsWest3, 'validateSupportingDocument', { documentId });
}

export async function getDocumentStatsApi(): Promise<DocumentStatsResponse> {
  return safeCall<DocumentStatsResponse>(functionsWest3, 'getDocumentStats', {});
}

export async function searchJournalEntriesApi(query: string): Promise<{ entries: JournalEntrySearchResult[] }> {
  return safeCall(functionsWest3, 'searchJournalEntries', { query });
}

export async function exportSupportingDocumentsApi(filters: {
  type?: SupportingDocumentType;
  status?: SupportingDocumentStatus;
  periodFrom?: string;
  periodTo?: string;
  supplierName?: string;
  fiscalYear?: number;
}): Promise<{ documents: SupportingDocument[] }> {
  return safeCall(functionsWest3, 'exportSupportingDocuments', filters as unknown as Record<string, unknown>);
}

// =============================================================================
// FILE UPLOAD VIA SIGNED URL
// =============================================================================

export async function uploadFileToSignedUrl(
  file: File,
  uploadUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(file);
  });
}

// =============================================================================
// HELPERS
// =============================================================================

export function timestampToDate(ts: { _seconds: number; _nanoseconds: number } | undefined): Date | null {
  if (!ts || !ts._seconds) return null;
  return new Date(ts._seconds * 1000);
}

export function formatAmount(amountCents: number | undefined, currency: string = 'EUR'): string {
  if (amountCents === undefined || amountCents === null) return '-';
  const amount = amountCents / 100;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

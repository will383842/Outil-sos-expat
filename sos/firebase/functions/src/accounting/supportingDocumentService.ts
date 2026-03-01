/**
 * Service Pieces Justificatives - SOS-Expat OU
 *
 * Gestion Firestore et Storage des pieces justificatives externes
 * (factures fournisseurs, recus, releves bancaires, contrats, etc.)
 *
 * Conformite legale estonienne: retention 7 ans, immutabilite documentNumber,
 * audit trail complet.
 *
 * @module accounting/supportingDocumentService
 */

import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  SupportingDocument,
  SupportingDocumentFile,
  SupportingDocumentStatus,
  SupportingDocumentType,
  CreateSupportingDocumentRequest,
  CreateSupportingDocumentResponse,
  UpdateSupportingDocumentRequest,
  ListSupportingDocumentsRequest,
  ListSupportingDocumentsResponse,
  GetDocumentUploadUrlRequest,
  GetDocumentUploadUrlResponse,
  DocumentStatsResponse,
  SearchJournalEntriesRequest,
  SearchJournalEntriesResponse,
  ExportDocumentsRequest,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_DOCUMENT,
  DOCUMENT_NUMBER_PREFIX,
} from './supportingDocumentTypes';
import { convertCentsToEur } from './ecbExchangeRateService';

// =============================================================================
// INITIALISATION
// =============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

function getBucket() {
  ensureInitialized();
  return admin.storage().bucket();
}

// =============================================================================
// COLLECTIONS
// =============================================================================

const COLLECTION = 'supporting_documents';
const COUNTER_COLLECTION = 'supporting_document_counters';

// =============================================================================
// VALIDATION
// =============================================================================

const VALID_DOCUMENT_TYPES: SupportingDocumentType[] = [
  'supplier_invoice', 'receipt', 'bank_statement', 'contract',
  'tax_document', 'payroll', 'expense_report', 'credit_note', 'other',
];

function validateDocumentType(type: string): type is SupportingDocumentType {
  return VALID_DOCUMENT_TYPES.includes(type as SupportingDocumentType);
}

function validateAccountingPeriod(period: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return false;
  const year = parseInt(period.split('-')[0]);
  return year >= 2020 && year <= 2099;
}

function validateDateString(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function validateFileInfo(file: { fileName: string; mimeType: string; sizeBytes: number }): string | null {
  if (!file.fileName || typeof file.fileName !== 'string') {
    return 'Nom de fichier invalide';
  }
  if (file.fileName.length > 255) {
    return 'Nom de fichier trop long (max 255 caracteres)';
  }
  if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return `Type de fichier non supporte: ${file.mimeType}`;
  }
  if (!file.sizeBytes || file.sizeBytes <= 0) {
    return 'Taille de fichier invalide';
  }
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `Fichier trop volumineux: ${(file.sizeBytes / 1024 / 1024).toFixed(1)}MB (max 15MB)`;
  }
  return null;
}

function validateAmountCents(amountCents: unknown): number | undefined {
  if (amountCents === undefined || amountCents === null) return undefined;
  const n = Number(amountCents);
  if (!Number.isInteger(n) || n < 0 || n > 100_000_000_00) {
    throw new Error('Montant invalide (entier positif en centimes requis, max 1 milliard)');
  }
  return n;
}

function validateStringLength(value: string | undefined, fieldName: string, maxLength: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName}: maximum ${maxLength} caracteres`);
  }
  return trimmed || undefined; // Convert empty string to undefined
}

// =============================================================================
// NUMERO SEQUENTIEL
// =============================================================================

/**
 * Genere un numero de document sequentiel atomique (DOC-YYYY-NNNNNN)
 */
async function generateDocumentNumber(year: number): Promise<string> {
  const db = getDb();
  const counterRef = db.collection(COUNTER_COLLECTION).doc(year.toString());

  const newNumber = await db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    let current = 0;
    if (counterDoc.exists) {
      current = counterDoc.data()?.lastNumber || 0;
    }
    const next = current + 1;
    tx.set(counterRef, { lastNumber: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return `${DOCUMENT_NUMBER_PREFIX}-${year}-${newNumber.toString().padStart(6, '0')}`;
}

// =============================================================================
// SIGNED URLs
// =============================================================================

/**
 * Genere des URLs d'upload signees. Utilise un index pour eviter les collisions
 * de noms de fichiers (au lieu de Date.now() seul).
 */
async function generateUploadUrls(
  documentId: string,
  year: string,
  month: string,
  files: Array<{ fileName: string; mimeType: string; sizeBytes: number }>
): Promise<Array<{ fileName: string; uploadUrl: string; storagePath: string }>> {
  const bucket = getBucket();
  const timestamp = Date.now();

  const results = await Promise.all(
    files.map(async (file, index) => {
      const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `supporting_documents/${year}/${month}/${documentId}/${timestamp}_${index}_${safeName}`;
      const fileRef = bucket.file(storagePath);

      const [url] = await fileRef.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        contentType: file.mimeType,
      });

      return { fileName: file.fileName, uploadUrl: url, storagePath };
    })
  );

  return results;
}

/**
 * Genere des URLs de lecture signees (24h). Parallelise pour performance.
 */
async function generateReadUrls(files: SupportingDocumentFile[]): Promise<Array<{ fileName: string; readUrl: string }>> {
  if (!files || files.length === 0) return [];
  const bucket = getBucket();

  return Promise.all(
    files.map(async (file) => {
      try {
        const fileRef = bucket.file(file.storagePath);
        const [exists] = await fileRef.exists();
        if (!exists) {
          logger.warn('generateReadUrls: File not found in Storage', { storagePath: file.storagePath });
          return { fileName: file.fileName, readUrl: '' };
        }
        const [url] = await fileRef.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });
        return { fileName: file.fileName, readUrl: url };
      } catch (error) {
        logger.warn('generateReadUrls: Failed to generate URL', { fileName: file.fileName, error });
        return { fileName: file.fileName, readUrl: '' };
      }
    })
  );
}

// =============================================================================
// SERVICE
// =============================================================================

export class SupportingDocumentService {

  /**
   * Creer un nouveau document avec signed URLs pour upload
   */
  async createDocument(data: CreateSupportingDocumentRequest, adminUid: string): Promise<CreateSupportingDocumentResponse> {
    const db = getDb();

    // Validation stricte
    const title = validateStringLength(data.title, 'Titre', 500);
    if (!title) throw new Error('Titre requis');

    if (!data.type || !validateDocumentType(data.type)) {
      throw new Error('Type de document invalide');
    }

    if (!data.documentDate) throw new Error('Date du document requise');
    const docDate = validateDateString(data.documentDate);
    if (!docDate) throw new Error('Date du document invalide');

    if (!data.accountingPeriod || !validateAccountingPeriod(data.accountingPeriod)) {
      throw new Error('Periode comptable invalide (format: YYYY-MM, mois 01-12)');
    }

    if (!data.files || data.files.length === 0) {
      throw new Error('Au moins un fichier requis');
    }
    if (data.files.length > MAX_FILES_PER_DOCUMENT) {
      throw new Error(`Maximum ${MAX_FILES_PER_DOCUMENT} fichiers par document`);
    }

    // Validate each file
    for (const file of data.files) {
      const error = validateFileInfo(file);
      if (error) throw new Error(error);
    }

    // Validate optional fields
    const description = validateStringLength(data.description, 'Description', 2000);
    const supplierName = validateStringLength(data.supplierName, 'Fournisseur', 500);
    const notes = validateStringLength(data.notes, 'Notes', 5000);
    const amountCents = validateAmountCents(data.amountCents);

    // Generate document number
    const year = docDate.getFullYear();
    const documentNumber = await generateDocumentNumber(year);

    // Convert amount to EUR if needed + store exchange rate for audit
    let amountEur: number | undefined;
    let exchangeRate: number | undefined;
    let exchangeRateDate: string | undefined;
    if (amountCents !== undefined && data.currency) {
      if (data.currency === 'EUR') {
        amountEur = amountCents / 100;
        exchangeRate = 1;
        exchangeRateDate = new Date().toISOString().split('T')[0];
      } else {
        try {
          const result = await convertCentsToEur(amountCents, data.currency);
          amountEur = result.amountEur;
          exchangeRate = result.exchangeRate;
          exchangeRateDate = result.exchangeRateDate;
        } catch {
          logger.warn('createDocument: EUR conversion failed, storing without EUR amount');
        }
      }
    }

    // Generate upload URLs
    const yearStr = year.toString();
    const monthStr = (docDate.getMonth() + 1).toString().padStart(2, '0');
    const docRef = db.collection(COLLECTION).doc();
    const docId = docRef.id;

    const uploadResults = await generateUploadUrls(docId, yearStr, monthStr, data.files);

    // Build file records
    const files: SupportingDocumentFile[] = uploadResults.map((r, i) => ({
      fileName: data.files[i].fileName,
      mimeType: data.files[i].mimeType,
      sizeBytes: data.files[i].sizeBytes,
      storagePath: r.storagePath,
    }));

    // Create Firestore document
    const now = Timestamp.now();
    const doc: Omit<SupportingDocument, 'id'> = {
      documentNumber,
      type: data.type,
      title,
      description,
      supplierName,
      amountCents,
      currency: data.currency,
      amountEur,
      exchangeRate,
      exchangeRateDate,
      documentDate: Timestamp.fromDate(docDate),
      accountingPeriod: data.accountingPeriod,
      status: 'pending' as SupportingDocumentStatus,
      files,
      notes,
      uploadedBy: adminUid,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(doc);

    logger.info('createDocument: Document created', { docId, documentNumber, type: data.type });

    return {
      success: true,
      documentId: docId,
      documentNumber,
      uploadUrls: uploadResults.map((r) => ({ fileName: r.fileName, uploadUrl: r.uploadUrl })),
    };
  }

  /**
   * Mettre a jour les metadonnees d'un document.
   * Refuse si archive ou valide (immutabilite comptable).
   * Utilise une transaction pour eviter les race conditions.
   */
  async updateDocument(documentId: string, data: UpdateSupportingDocumentRequest, adminUid: string): Promise<void> {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(documentId);

    await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(docRef);
      if (!docSnap.exists) {
        throw new Error('Document non trouve');
      }

      const existing = docSnap.data() as Omit<SupportingDocument, 'id'>;
      if (existing.status === 'archived') {
        throw new Error('Impossible de modifier un document archive');
      }
      if (existing.status === 'validated') {
        throw new Error('Impossible de modifier un document valide (immutabilite comptable)');
      }

      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.title !== undefined) {
        const title = validateStringLength(data.title, 'Titre', 500);
        if (!title) throw new Error('Titre ne peut pas etre vide');
        updates.title = title;
      }
      if (data.description !== undefined) updates.description = validateStringLength(data.description, 'Description', 2000);
      if (data.supplierName !== undefined) updates.supplierName = validateStringLength(data.supplierName, 'Fournisseur', 500);
      if (data.notes !== undefined) updates.notes = validateStringLength(data.notes, 'Notes', 5000);

      if (data.accountingPeriod !== undefined) {
        if (!validateAccountingPeriod(data.accountingPeriod)) {
          throw new Error('Periode comptable invalide (format: YYYY-MM, mois 01-12)');
        }
        updates.accountingPeriod = data.accountingPeriod;
      }
      if (data.documentDate !== undefined) {
        const docDate = validateDateString(data.documentDate);
        if (!docDate) throw new Error('Date du document invalide');
        updates.documentDate = Timestamp.fromDate(docDate);
      }
      if (data.amountCents !== undefined) {
        updates.amountCents = validateAmountCents(data.amountCents);
      }
      if (data.currency !== undefined) {
        updates.currency = data.currency;
      }

      tx.update(docRef, updates);
    });

    // EUR conversion only if amountCents or currency was actually changed
    if (data.amountCents !== undefined || data.currency !== undefined) {
      const finalDoc = await docRef.get();
      const finalData = finalDoc.data();
      if (finalData?.amountCents !== undefined && finalData?.currency) {
        const eurUpdate: Record<string, unknown> = {};
        if (finalData.currency === 'EUR') {
          eurUpdate.amountEur = finalData.amountCents / 100;
          eurUpdate.exchangeRate = 1;
          eurUpdate.exchangeRateDate = new Date().toISOString().split('T')[0];
        } else {
          try {
            const result = await convertCentsToEur(finalData.amountCents, finalData.currency);
            eurUpdate.amountEur = result.amountEur;
            eurUpdate.exchangeRate = result.exchangeRate;
            eurUpdate.exchangeRateDate = result.exchangeRateDate;
          } catch {
            logger.warn('updateDocument: EUR conversion failed');
          }
        }
        if (Object.keys(eurUpdate).length > 0) {
          await docRef.update(eurUpdate);
        }
      }
    }

    logger.info('updateDocument: Updated', { documentId, adminUid });
  }

  /**
   * Archiver un document (soft delete). Transaction pour eviter race conditions.
   */
  async archiveDocument(documentId: string, adminUid: string): Promise<void> {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(documentId);

    await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(docRef);
      if (!docSnap.exists) {
        throw new Error('Document non trouve');
      }

      const existing = docSnap.data() as Omit<SupportingDocument, 'id'>;
      if (existing.status === 'archived') {
        throw new Error('Document deja archive');
      }
      if (existing.status === 'validated') {
        throw new Error('Impossible d\'archiver un document valide. Seuls les documents en attente peuvent etre archives.');
      }

      tx.update(docRef, {
        status: 'archived',
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info('archiveDocument: Archived', { documentId, adminUid });
  }

  /**
   * Recuperer un document avec signed URLs de lecture
   */
  async getDocument(documentId: string): Promise<SupportingDocument & { readUrls: Array<{ fileName: string; readUrl: string }> }> {
    const db = getDb();
    const docSnap = await db.collection(COLLECTION).doc(documentId).get();

    if (!docSnap.exists) {
      throw new Error('Document non trouve');
    }

    const data = docSnap.data() as Omit<SupportingDocument, 'id'>;
    const readUrls = await generateReadUrls(data.files || []);

    return {
      ...data,
      id: docSnap.id,
      readUrls,
    };
  }

  /**
   * Lister les documents avec filtres et pagination cursor-based.
   *
   * IMPORTANT: Quand periodFrom/periodTo est utilise, on tri par accountingPeriod
   * (requis par Firestore pour les range queries). Sinon tri par createdAt.
   */
  async listDocuments(filters: ListSupportingDocumentsRequest): Promise<ListSupportingDocumentsResponse> {
    const db = getDb();
    const pageSize = Math.min(filters.limit || 25, 100);
    const hasPeriodRange = !!(filters.periodFrom || filters.periodTo);

    let query: FirebaseFirestore.Query = db.collection(COLLECTION);

    // Apply equality filters
    if (filters.type) {
      if (!validateDocumentType(filters.type)) {
        throw new Error('Type de document invalide');
      }
      query = query.where('type', '==', filters.type);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.supplierName) {
      query = query.where('supplierName', '==', filters.supplierName);
    }

    // Period range filters + orderBy
    // Firestore rule: range filters must be on the same field as the first orderBy
    if (hasPeriodRange) {
      if (filters.periodFrom) {
        query = query.where('accountingPeriod', '>=', filters.periodFrom);
      }
      if (filters.periodTo) {
        query = query.where('accountingPeriod', '<=', filters.periodTo);
      }
      query = query.orderBy('accountingPeriod', 'desc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    // Cursor-based pagination
    if (filters.startAfter) {
      const cursorDoc = await db.collection(COLLECTION).doc(filters.startAfter).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    query = query.limit(pageSize + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > pageSize;
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

    let documents: SupportingDocument[] = docs.map((d) => ({
      ...(d.data() as Omit<SupportingDocument, 'id'>),
      id: d.id,
    }));

    // Client-side text search (only on current page — best effort)
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.documentNumber.toLowerCase().includes(search) ||
          (d.supplierName && d.supplierName.toLowerCase().includes(search)) ||
          (d.description && d.description.toLowerCase().includes(search))
      );
    }

    return {
      documents,
      hasMore,
      lastDocId: docs.length > 0 ? docs[docs.length - 1].id : undefined,
    };
  }

  /**
   * Lier un document a une ecriture comptable
   */
  async linkToJournalEntry(documentId: string, journalEntryId: string, adminUid: string): Promise<void> {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(documentId);
    const entryRef = db.collection('journal_entries').doc(journalEntryId);

    // Atomic bidirectional link via WriteBatch
    const batch = db.batch();

    const [docSnap, entrySnap] = await Promise.all([docRef.get(), entryRef.get()]);

    if (!docSnap.exists) {
      throw new Error('Document non trouve');
    }
    if (!entrySnap.exists) {
      throw new Error('Ecriture comptable non trouvee');
    }

    const entryData = entrySnap.data();

    batch.update(docRef, {
      linkedJournalEntryId: journalEntryId,
      linkedJournalEntryRef: entryData?.reference || journalEntryId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    batch.update(entryRef, {
      supportingDocumentIds: FieldValue.arrayUnion(documentId),
    });

    await batch.commit();

    logger.info('linkToJournalEntry: Atomic bidirectional link created', { documentId, journalEntryId, adminUid });
  }

  /**
   * Valider un document (status -> validated). Transaction pour race conditions.
   */
  async validateDocument(documentId: string, adminUid: string): Promise<void> {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(documentId);

    await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(docRef);
      if (!docSnap.exists) {
        throw new Error('Document non trouve');
      }

      const existing = docSnap.data() as Omit<SupportingDocument, 'id'>;
      if (existing.status !== 'pending') {
        throw new Error(`Impossible de valider un document avec le statut: ${existing.status}`);
      }

      tx.update(docRef, {
        status: 'validated',
        validatedBy: adminUid,
        validatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    logger.info('validateDocument: Validated', { documentId, adminUid });
  }

  /**
   * Generer des URLs d'upload supplementaires pour un document existant
   */
  async getUploadUrls(data: GetDocumentUploadUrlRequest, adminUid: string): Promise<GetDocumentUploadUrlResponse> {
    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(data.documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Document non trouve');
    }

    const existing = docSnap.data() as Omit<SupportingDocument, 'id'>;
    if (existing.status === 'archived') {
      throw new Error('Impossible d\'ajouter des fichiers a un document archive');
    }
    if (existing.status === 'validated') {
      throw new Error('Impossible d\'ajouter des fichiers a un document valide (immutabilite comptable)');
    }

    const currentFileCount = existing.files?.length || 0;
    if (currentFileCount + data.files.length > MAX_FILES_PER_DOCUMENT) {
      throw new Error(`Maximum ${MAX_FILES_PER_DOCUMENT} fichiers par document (actuel: ${currentFileCount})`);
    }

    // Validate files
    for (const file of data.files) {
      const error = validateFileInfo(file);
      if (error) throw new Error(error);
    }

    // Extract year/month from document date
    const docDate = existing.documentDate.toDate();
    const yearStr = docDate.getFullYear().toString();
    const monthStr = (docDate.getMonth() + 1).toString().padStart(2, '0');

    const uploadResults = await generateUploadUrls(data.documentId, yearStr, monthStr, data.files);

    // Add new files: use set with merge to append to array safely
    const newFiles: SupportingDocumentFile[] = uploadResults.map((r, i) => ({
      fileName: data.files[i].fileName,
      mimeType: data.files[i].mimeType,
      sizeBytes: data.files[i].sizeBytes,
      storagePath: r.storagePath,
    }));

    const existingFiles = existing.files || [];
    await docRef.update({
      files: [...existingFiles, ...newFiles],
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('getUploadUrls: Generated upload URLs', { documentId: data.documentId, fileCount: data.files.length, adminUid });

    return {
      uploadUrls: uploadResults.map((r) => ({ fileName: r.fileName, uploadUrl: r.uploadUrl })),
    };
  }
  /**
   * Statistiques globales des documents (comptes Firestore)
   */
  async getDocumentStats(): Promise<DocumentStatsResponse> {
    const db = getDb();
    const col = db.collection(COLLECTION);
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    // Parallel count queries using Firestore count() aggregation
    const [totalSnap, pendingSnap, validatedSnap, archivedSnap, thisMonthSnap] = await Promise.all([
      col.count().get(),
      col.where('status', '==', 'pending').count().get(),
      col.where('status', '==', 'validated').count().get(),
      col.where('status', '==', 'archived').count().get(),
      col.where('accountingPeriod', '==', currentPeriod).count().get(),
    ]);

    return {
      total: totalSnap.data().count,
      pending: pendingSnap.data().count,
      validated: validatedSnap.data().count,
      archived: archivedSnap.data().count,
      thisMonth: thisMonthSnap.data().count,
    };
  }

  /**
   * Rechercher des ecritures comptables par reference (prefix search pour autocomplete)
   */
  async searchJournalEntries(data: SearchJournalEntriesRequest): Promise<SearchJournalEntriesResponse> {
    const db = getDb();
    const searchLimit = Math.min(data.limit || 10, 20);
    const queryStr = data.query.toUpperCase().trim();

    if (!queryStr || queryStr.length < 2) {
      return { entries: [] };
    }

    // Firestore range query for prefix search on 'reference'
    const endStr = queryStr.slice(0, -1) + String.fromCharCode(queryStr.charCodeAt(queryStr.length - 1) + 1);

    const snapshot = await db.collection('journal_entries')
      .where('reference', '>=', queryStr)
      .where('reference', '<', endStr)
      .orderBy('reference')
      .limit(searchLimit)
      .get();

    return {
      entries: snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          reference: data.reference || d.id,
          description: data.description || '',
          period: data.period || '',
        };
      }),
    };
  }

  /**
   * Exporter tous les documents matching les filtres (sans pagination, max 5000)
   */
  async exportDocuments(filters: ExportDocumentsRequest): Promise<SupportingDocument[]> {
    const db = getDb();
    let query: FirebaseFirestore.Query = db.collection(COLLECTION);

    if (filters.type) {
      if (!validateDocumentType(filters.type)) throw new Error('Type invalide');
      query = query.where('type', '==', filters.type);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.supplierName) {
      query = query.where('supplierName', '==', filters.supplierName);
    }

    // Fiscal year shortcut: sets periodFrom/periodTo
    let periodFrom = filters.periodFrom;
    let periodTo = filters.periodTo;
    if (filters.fiscalYear) {
      periodFrom = `${filters.fiscalYear}-01`;
      periodTo = `${filters.fiscalYear}-12`;
    }

    const hasPeriodRange = !!(periodFrom || periodTo);
    if (hasPeriodRange) {
      if (periodFrom) query = query.where('accountingPeriod', '>=', periodFrom);
      if (periodTo) query = query.where('accountingPeriod', '<=', periodTo);
      query = query.orderBy('accountingPeriod', 'desc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    query = query.limit(5000);

    const snapshot = await query.get();
    return snapshot.docs.map((d) => ({
      ...(d.data() as Omit<SupportingDocument, 'id'>),
      id: d.id,
    }));
  }
}

// Singleton
export const supportingDocumentService = new SupportingDocumentService();

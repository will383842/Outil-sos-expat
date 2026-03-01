/**
 * Callables Pieces Justificatives - SOS-Expat OU
 *
 * 11 Cloud Functions v2 callables pour la gestion des pieces justificatives.
 *
 * @module accounting/supportingDocumentCallables
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { supportingDocumentService } from './supportingDocumentService';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CALLABLE_CONFIG = {
  region: 'europe-west3',
  memory: '256MiB' as const,
  cpu: 0.083,
  timeoutSeconds: 60,
};

// =============================================================================
// AUTH HELPERS
// =============================================================================

function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } }): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise');
  }
  return request.auth.uid;
}

function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }): string {
  const uid = requireAuth(request);
  const isAdmin = request.auth!.token.admin === true || request.auth!.token.role === 'admin';
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Droits administrateur requis');
  }
  return uid;
}

function requireFinanceReader(request: { auth?: { uid: string; token: Record<string, unknown> } }): string {
  const uid = requireAuth(request);
  const isAdmin = request.auth!.token.admin === true || request.auth!.token.role === 'admin';
  const isAccountant = request.auth!.token.accountant === true;
  if (!isAdmin && !isAccountant) {
    throw new HttpsError('permission-denied', 'Droits administrateur ou comptable requis');
  }
  return uid;
}

// =============================================================================
// ERROR MAPPING
// =============================================================================

/**
 * Mappe les erreurs metier vers les bons codes HttpsError.
 */
function mapErrorToHttps(error: unknown): HttpsError {
  const msg = error instanceof Error ? error.message : 'Erreur interne';

  // Not found errors
  if (msg.includes('non trouve') || msg.includes('non trouvee')) {
    return new HttpsError('not-found', msg);
  }

  // Precondition errors (wrong status, immutability)
  if (msg.includes('Impossible') || msg.includes('deja archive') || msg.includes('immutabilite')) {
    return new HttpsError('failed-precondition', msg);
  }

  // Validation errors
  if (msg.includes('requis') || msg.includes('invalide') || msg.includes('Maximum') ||
      msg.includes('trop') || msg.includes('non supporte') || msg.includes('vide')) {
    return new HttpsError('invalid-argument', msg);
  }

  // Default: internal
  return new HttpsError('internal', msg);
}

// =============================================================================
// CALLABLES
// =============================================================================

/**
 * Creer un document justificatif avec signed URLs pour upload
 */
export const createSupportingDocument = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);

    try {
      return await supportingDocumentService.createDocument(request.data, adminUid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('createSupportingDocument: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Mettre a jour les metadonnees d'un document
 */
export const updateSupportingDocument = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);
    const { documentId, ...updateData } = request.data;

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }

    try {
      await supportingDocumentService.updateDocument(documentId, updateData, adminUid);
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('updateSupportingDocument: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Archiver un document (soft delete)
 */
export const archiveSupportingDocument = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);
    const { documentId } = request.data;

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }

    try {
      await supportingDocumentService.archiveDocument(documentId, adminUid);
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('archiveSupportingDocument: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Lister les documents avec filtres et pagination
 */
export const listSupportingDocuments = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    requireFinanceReader(request);

    try {
      return await supportingDocumentService.listDocuments(request.data || {});
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('listSupportingDocuments: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Recuperer un document avec signed URLs de lecture
 */
export const getSupportingDocument = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    requireFinanceReader(request);
    const { documentId } = request.data;

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }

    try {
      return await supportingDocumentService.getDocument(documentId);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('getSupportingDocument: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Lier un document a une ecriture comptable
 */
export const linkDocumentToJournalEntry = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);
    const { documentId, journalEntryId } = request.data;

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }
    if (!journalEntryId || typeof journalEntryId !== 'string') {
      throw new HttpsError('invalid-argument', 'journalEntryId requis');
    }

    try {
      await supportingDocumentService.linkToJournalEntry(documentId, journalEntryId, adminUid);
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('linkDocumentToJournalEntry: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Generer des URLs d'upload pour ajouter des fichiers a un document existant
 */
export const getDocumentUploadUrl = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);

    if (!request.data.documentId || typeof request.data.documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }
    if (!request.data.files || !Array.isArray(request.data.files) || request.data.files.length === 0) {
      throw new HttpsError('invalid-argument', 'files requis (tableau non vide)');
    }

    try {
      return await supportingDocumentService.getUploadUrls(request.data, adminUid);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('getDocumentUploadUrl: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Obtenir les statistiques globales des documents (counts Firestore)
 */
export const getDocumentStats = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    requireFinanceReader(request);

    try {
      return await supportingDocumentService.getDocumentStats();
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('getDocumentStats: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Rechercher des ecritures comptables par reference (autocomplete)
 */
export const searchJournalEntries = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    requireFinanceReader(request);

    const query = request.data?.query;
    if (!query || typeof query !== 'string') {
      throw new HttpsError('invalid-argument', 'query requis');
    }

    try {
      return await supportingDocumentService.searchJournalEntries(request.data);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('searchJournalEntries: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Exporter tous les documents matching les filtres (sans pagination, max 5000)
 */
export const exportSupportingDocuments = onCall(
  { ...CALLABLE_CONFIG, memory: '512MiB' as const, timeoutSeconds: 120 },
  async (request) => {
    requireFinanceReader(request);

    try {
      const documents = await supportingDocumentService.exportDocuments(request.data || {});
      return { documents };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('exportSupportingDocuments: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

/**
 * Valider un document (status -> validated)
 */
export const validateSupportingDocument = onCall(
  { ...CALLABLE_CONFIG },
  async (request) => {
    const adminUid = requireAdmin(request);
    const { documentId } = request.data;

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpsError('invalid-argument', 'documentId requis');
    }

    try {
      await supportingDocumentService.validateDocument(documentId, adminUid);
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('validateSupportingDocument: Error', { error: error instanceof Error ? error.message : error });
      throw mapErrorToHttps(error);
    }
  }
);

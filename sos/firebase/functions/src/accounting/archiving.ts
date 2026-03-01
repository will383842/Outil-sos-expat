/**
 * Archivage Comptable Legal - SOS-Expat OU
 *
 * Archive les ecritures comptables pour retention legale 7 ans.
 * Conformite: Loi estonienne + directive UE comptable.
 *
 * @module accounting/archiving
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import * as crypto from 'crypto';

// =============================================================================
// CONFIGURATION
// =============================================================================

const ARCHIVE_BUCKET_SUFFIX = '-accounting-archives';
const RETENTION_YEARS = 7;

// =============================================================================
// INITIALISATION
// =============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function getDb() {
  if (!IS_DEPLOYMENT_ANALYSIS && !admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

function getArchiveBucket() {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'sos-urgently-ac307';
  return admin.storage().bucket(`${projectId}${ARCHIVE_BUCKET_SUFFIX}`);
}

// =============================================================================
// ARCHIVAGE JOURNAL ENTRIES
// =============================================================================

/**
 * Archive les ecritures d'une periode en JSON dans Firebase Storage
 * Genere un hash SHA-256 pour l'integrite
 */
export async function archivePeriod(period: string, userId?: string): Promise<{
  success: boolean;
  archivePath?: string;
  archiveHash?: string;
  entryCount?: number;
  error?: string;
}> {
  const db = getDb();

  logger.info('archivePeriod: Starting', { period });

  // Verifier que la periode est cloturee
  const periodDoc = await db.collection('accounting_periods').doc(period).get();
  if (!periodDoc.exists || periodDoc.data()?.status !== 'CLOSED') {
    return { success: false, error: 'La periode doit etre cloturee avant archivage' };
  }

  // Deja archive ?
  if (periodDoc.data()?.archiveHash) {
    return {
      success: true,
      archivePath: periodDoc.data()?.archivePath,
      archiveHash: periodDoc.data()?.archiveHash,
      entryCount: periodDoc.data()?.entryCount,
    };
  }

  // Recuperer toutes les ecritures de la periode
  const entries = await db
    .collection('journal_entries')
    .where('period', '==', period)
    .orderBy('date', 'asc')
    .get();

  if (entries.empty) {
    return { success: false, error: 'Aucune ecriture pour cette periode' };
  }

  // Serialiser en JSON
  const archiveData = {
    period,
    exportedAt: new Date().toISOString(),
    retentionYears: RETENTION_YEARS,
    retentionExpiry: new Date(Date.now() + RETENTION_YEARS * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
    entryCount: entries.size,
    entries: entries.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        // Convertir Timestamps en ISO strings pour JSON
        date: data.date?.toDate?.()?.toISOString() || data.date,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        postedAt: data.postedAt?.toDate?.()?.toISOString() || data.postedAt,
        reversedAt: data.reversedAt?.toDate?.()?.toISOString() || data.reversedAt,
      };
    }),
  };

  const jsonContent = JSON.stringify(archiveData, null, 2);

  // Calculer le hash SHA-256
  const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');

  // Stocker dans Firebase Storage
  const archivePath = `archives/journal_entries/${period}.json`;

  try {
    const bucket = getArchiveBucket();
    const file = bucket.file(archivePath);

    await file.save(jsonContent, {
      contentType: 'application/json',
      metadata: {
        period,
        entryCount: String(entries.size),
        sha256: hash,
        retentionExpiry: archiveData.retentionExpiry,
      },
    });

    // Mettre a jour le document periode avec le hash
    await db.collection('accounting_periods').doc(period).update({
      archiveHash: hash,
      archivePath,
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await db.collection('finance_audit_logs').add({
      action: 'PERIOD_ARCHIVED',
      period,
      userId: userId || 'system',
      archivePath,
      archiveHash: hash,
      entryCount: entries.size,
      timestamp: FieldValue.serverTimestamp(),
    });

    logger.info('archivePeriod: Success', {
      period,
      archivePath,
      entryCount: entries.size,
      hash,
    });

    return {
      success: true,
      archivePath,
      archiveHash: hash,
      entryCount: entries.size,
    };
  } catch (error) {
    // Si le bucket n'existe pas, log l'erreur mais ne crash pas
    logger.error('archivePeriod: Storage error (bucket may not exist)', {
      period,
      error: error instanceof Error ? error.message : error,
    });

    // Stocker l'archive dans Firestore comme fallback
    // Stocker les donnees d'archive dans un sous-champ 'data' pour preserver l'integrite du hash
    await db.collection('accounting_archives').doc(period).set({
      data: archiveData,
      archiveHash: hash,
      storedIn: 'firestore_fallback',
    });

    await db.collection('accounting_periods').doc(period).update({
      archiveHash: hash,
      archivePath: `firestore:accounting_archives/${period}`,
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      archivePath: `firestore:accounting_archives/${period}`,
      archiveHash: hash,
      entryCount: entries.size,
    };
  }
}

/**
 * Verifier l'integrite d'une archive
 */
export async function verifyArchiveIntegrity(period: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const db = getDb();

  const periodDoc = await db.collection('accounting_periods').doc(period).get();
  if (!periodDoc.exists) {
    return { valid: false, error: 'Periode non trouvee' };
  }

  const storedHash = periodDoc.data()?.archiveHash;
  if (!storedHash) {
    return { valid: false, error: 'Periode non archivee' };
  }

  const archivePath = periodDoc.data()?.archivePath as string;

  // Firestore fallback
  if (archivePath?.startsWith('firestore:')) {
    const archiveDoc = await db.collection('accounting_archives').doc(period).get();
    if (!archiveDoc.exists) {
      return { valid: false, error: 'Archive Firestore non trouvee' };
    }
    // Le hash a ete calcule sur les donnees d'archive uniquement (sous-champ 'data')
    const archiveData = archiveDoc.data()?.data || archiveDoc.data();
    const content = JSON.stringify(archiveData, null, 2);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { valid: hash === storedHash, error: hash !== storedHash ? 'Hash mismatch' : undefined };
  }

  // Storage
  try {
    const bucket = getArchiveBucket();
    const [content] = await bucket.file(archivePath).download();
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { valid: hash === storedHash, error: hash !== storedHash ? 'Hash mismatch' : undefined };
  } catch (error) {
    return { valid: false, error: `Erreur lecture archive: ${error instanceof Error ? error.message : error}` };
  }
}

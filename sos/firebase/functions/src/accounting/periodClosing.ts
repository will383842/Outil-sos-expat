/**
 * Cloture de Periode Comptable - SOS-Expat OU
 *
 * Gestion de la cloture et reouverture des periodes comptables.
 * Conformite: Loi comptable estonienne (Raamatupidamise seadus)
 *
 * @module accounting/periodClosing
 */

import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { accountingService } from './accountingService';

// =============================================================================
// TYPES
// =============================================================================

export interface AccountingPeriod {
  period: string; // YYYY-MM
  status: 'OPEN' | 'CLOSED';
  closedAt?: Timestamp;
  closedBy?: string;
  reopenedAt?: Timestamp;
  reopenedBy?: string;
  reopenReason?: string;
  finalBalances?: Record<string, { debit: number; credit: number; balance: number }>;
  entryCount?: number;
  totalDebit?: number;
  totalCredit?: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface ClosingReport {
  period: string;
  trialBalance: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalRevenue: number;
  totalExpenses: number;
  netResult: number;
  entryCount: number;
  generatedAt: Timestamp;
}

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

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// =============================================================================
// CLOTURE DE PERIODE
// =============================================================================

/**
 * Cloturer une periode comptable
 * - Verifie qu'aucune ecriture DRAFT n'existe
 * - Calcule les balances finales
 * - Verrouille la periode
 */
export async function closePeriod(period: string, userId: string): Promise<{
  success: boolean;
  error?: string;
  report?: ClosingReport;
}> {
  const db = getDb();

  logger.info('closePeriod: Starting', { period, userId });

  const periodRef = db.collection('accounting_periods').doc(period);

  // Transaction atomique pour le verrouillage de la periode.
  // NOTE: Les queries where() ci-dessous ne sont PAS transactionnelles car
  // Firestore ne supporte transaction.get() que sur DocumentReference, pas sur Query.
  // Le risque theorique (DRAFT cree entre la query et le set) est mitige par :
  // 1. La verification du status CLOSED dans la transaction (idempotent)
  // 2. isPeriodClosed() qui bloque les ecritures des que le cache est invalide
  // 3. En pratique, la cloture est une action admin manuelle precedee d'une revue
  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Verifier que la periode n'est pas deja cloturee (transactionnel)
      const periodDoc = await transaction.get(periodRef);
      if (periodDoc.exists && periodDoc.data()?.status === 'CLOSED') {
        return { success: false as const, error: 'Periode deja cloturee' };
      }

      // 2. Verifier qu'il n'y a aucune ecriture DRAFT (non-transactionnel, voir NOTE)
      const draftEntries = await db
        .collection('journal_entries')
        .where('period', '==', period)
        .where('status', '==', 'DRAFT')
        .limit(10)
        .get();

      if (!draftEntries.empty) {
        return {
          success: false as const,
          error: `${draftEntries.size}+ ecriture(s) en brouillon. Postez ou supprimez-les avant de cloturer.`,
        };
      }

      // 3. Calculer les balances finales
      const postedEntries = await db
        .collection('journal_entries')
        .where('period', '==', period)
        .where('status', '==', 'POSTED')
        .get();

      const balances: Record<string, { debit: number; credit: number; balance: number; name: string }> = {};
      let totalDebit = 0;
      let totalCredit = 0;

      postedEntries.forEach(doc => {
        const entry = doc.data();
        if (entry.lines) {
          for (const line of entry.lines) {
            if (!balances[line.accountCode]) {
              balances[line.accountCode] = { debit: 0, credit: 0, balance: 0, name: line.accountName || '' };
            }
            balances[line.accountCode].debit = round2(balances[line.accountCode].debit + (line.debit || 0));
            balances[line.accountCode].credit = round2(balances[line.accountCode].credit + (line.credit || 0));
            balances[line.accountCode].balance = round2(balances[line.accountCode].debit - balances[line.accountCode].credit);
            totalDebit = round2(totalDebit + (line.debit || 0));
            totalCredit = round2(totalCredit + (line.credit || 0));
          }
        }
      });

      // 4. Generer le rapport de cloture
      const trialBalance = Object.entries(balances)
        .map(([code, b]) => ({
          accountCode: code,
          accountName: b.name,
          debit: b.debit,
          credit: b.credit,
          balance: b.balance,
        }))
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      // Revenue = comptes 7xxxxx (credits)
      const totalRevenue = round2(
        trialBalance
          .filter(b => b.accountCode.startsWith('7'))
          .reduce((sum, b) => sum + b.credit - b.debit, 0)
      );

      // Expenses = comptes 6xxxxx (debits)
      const totalExpenses = round2(
        trialBalance
          .filter(b => b.accountCode.startsWith('6'))
          .reduce((sum, b) => sum + b.debit - b.credit, 0)
      );

      const report: ClosingReport = {
        period,
        trialBalance,
        totalRevenue,
        totalExpenses,
        netResult: round2(totalRevenue - totalExpenses),
        entryCount: postedEntries.size,
        generatedAt: Timestamp.now(),
      };

      // 5. Ecrire la cloture (dans la transaction)
      const finalBalances: Record<string, { debit: number; credit: number; balance: number }> = {};
      for (const [code, b] of Object.entries(balances)) {
        finalBalances[code] = { debit: b.debit, credit: b.credit, balance: b.balance };
      }

      const periodData: AccountingPeriod = {
        period,
        status: 'CLOSED',
        closedAt: Timestamp.now(),
        closedBy: userId,
        finalBalances,
        entryCount: postedEntries.size,
        totalDebit,
        totalCredit,
        createdAt: periodDoc.exists ? periodDoc.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.set(periodRef, periodData, { merge: true });

      return { success: true as const, report, entryCount: postedEntries.size, totalDebit, totalCredit };
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Hors transaction : stocker le rapport + audit log (non-critique)
    await db.collection('accounting_closing_reports').doc(period).set(result.report);

    await db.collection('finance_audit_logs').add({
      action: 'PERIOD_CLOSED',
      period,
      userId,
      entryCount: result.entryCount,
      totalDebit: result.totalDebit,
      totalCredit: result.totalCredit,
      netResult: result.report.netResult,
      timestamp: FieldValue.serverTimestamp(),
    });

    logger.info('closePeriod: Success', {
      period,
      entries: result.entryCount,
      netResult: result.report.netResult,
    });

    // Invalider le cache pour que isPeriodClosed() retourne true immediatement
    accountingService.invalidatePeriodCache(period);

    return { success: true, report: result.report };
  } catch (error) {
    logger.error('closePeriod: Transaction failed', {
      period,
      error: error instanceof Error ? error.message : error,
    });
    return { success: false, error: `Erreur de transaction: ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
  }
}

// =============================================================================
// REOUVERTURE DE PERIODE
// =============================================================================

/**
 * Reouvrir une periode cloturee (admin uniquement)
 */
export async function reopenPeriod(period: string, userId: string, reason: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = getDb();

  logger.info('reopenPeriod: Starting', { period, userId, reason });

  const periodRef = db.collection('accounting_periods').doc(period);

  // Transaction atomique pour eviter les race conditions
  try {
    await db.runTransaction(async (transaction) => {
      const periodDoc = await transaction.get(periodRef);

      if (!periodDoc.exists || periodDoc.data()?.status !== 'CLOSED') {
        throw new Error('Periode non trouvee ou pas cloturee');
      }

      transaction.update(periodRef, {
        status: 'OPEN',
        reopenedAt: Timestamp.now(),
        reopenedBy: userId,
        reopenReason: reason,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.error('reopenPeriod: Transaction failed', { period, error: msg });
    return { success: false, error: msg };
  }

  // Invalider le cache pour que les triggers acceptent les ecritures immediatement
  accountingService.invalidatePeriodCache(period);

  // Audit log (hors transaction, non-critique)
  await db.collection('finance_audit_logs').add({
    action: 'PERIOD_REOPENED',
    period,
    userId,
    reason,
    timestamp: FieldValue.serverTimestamp(),
  });

  logger.info('reopenPeriod: Success', { period });

  return { success: true };
}

// =============================================================================
// RAPPORT DE CLOTURE
// =============================================================================

/**
 * Generer un rapport de cloture sans cloturer
 */
export async function generateClosingReport(period: string): Promise<ClosingReport> {
  const db = getDb();

  const entries = await db
    .collection('journal_entries')
    .where('period', '==', period)
    .where('status', '==', 'POSTED')
    .get();

  const balances: Record<string, { debit: number; credit: number; name: string }> = {};

  entries.forEach(doc => {
    const entry = doc.data();
    if (entry.lines) {
      for (const line of entry.lines) {
        if (!balances[line.accountCode]) {
          balances[line.accountCode] = { debit: 0, credit: 0, name: line.accountName || '' };
        }
        balances[line.accountCode].debit = round2(balances[line.accountCode].debit + (line.debit || 0));
        balances[line.accountCode].credit = round2(balances[line.accountCode].credit + (line.credit || 0));
      }
    }
  });

  const trialBalance = Object.entries(balances)
    .map(([code, b]) => ({
      accountCode: code,
      accountName: b.name,
      debit: b.debit,
      credit: b.credit,
      balance: round2(b.debit - b.credit),
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const totalRevenue = round2(
    trialBalance.filter(b => b.accountCode.startsWith('7')).reduce((sum, b) => sum + b.credit - b.debit, 0)
  );
  const totalExpenses = round2(
    trialBalance.filter(b => b.accountCode.startsWith('6')).reduce((sum, b) => sum + b.debit - b.credit, 0)
  );

  return {
    period,
    trialBalance,
    totalRevenue,
    totalExpenses,
    netResult: round2(totalRevenue - totalExpenses),
    entryCount: entries.size,
    generatedAt: Timestamp.now(),
  };
}

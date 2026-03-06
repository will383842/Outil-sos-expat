/**
 * Scheduled: releasePartnerPendingCommissions
 *
 * Runs every hour. Two-phase commission lifecycle:
 *
 * Phase 1 (pending -> validated):
 *   Find partner_commissions where status="pending" and
 *   createdAt + holdPeriodDays has passed. Set to "validated".
 *
 * Phase 2 (validated -> available):
 *   Find partner_commissions where status="validated" and
 *   validatedAt + releaseDelayHours has passed. Set to "available".
 *   Update partner balances and create notification.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import type { PartnerCommission, Partner } from "../types";
import { getPartnerConfig } from "../services/partnerConfigService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const MAX_RETRIES = 3;
const BATCH_SIZE = 200;

async function runWithRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      logger.error(`[${label}] Attempt ${attempt}/${MAX_RETRIES} failed`, { error, attempt });
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${label}: all retries exhausted`);
}

/**
 * Phase 1: Move pending commissions to validated after hold period
 */
async function validatePendingCommissions(): Promise<number> {
  const db = getFirestore();
  const config = await getPartnerConfig();
  const now = Timestamp.now();
  let validatedCount = 0;

  // Query all pending commissions
  const pendingSnap = await db
    .collection("partner_commissions")
    .where("status", "==", "pending")
    .limit(BATCH_SIZE)
    .get();

  if (pendingSnap.empty) {
    return 0;
  }

  for (const doc of pendingSnap.docs) {
    const commission = doc.data() as PartnerCommission;

    // Determine hold period for this commission's partner
    let holdPeriodDays = config.defaultHoldPeriodDays;

    // Try to get partner-specific hold period
    try {
      const partnerDoc = await db.collection("partners").doc(commission.partnerId).get();
      if (partnerDoc.exists) {
        const partner = partnerDoc.data() as Partner;
        if (partner.commissionConfig?.holdPeriodDays != null) {
          holdPeriodDays = partner.commissionConfig.holdPeriodDays;
        }
      }
    } catch (err) {
      logger.warn("[validatePendingCommissions] Could not read partner config, using default", {
        partnerId: commission.partnerId,
        error: err,
      });
    }

    // Check if hold period has elapsed
    const holdPeriodMs = holdPeriodDays * 24 * 60 * 60 * 1000;
    const createdAtMs = commission.createdAt.toMillis();
    const cutoffMs = createdAtMs + holdPeriodMs;

    if (now.toMillis() < cutoffMs) {
      continue; // Hold period not yet passed
    }

    // Transition: pending -> validated (atomic with balance update)
    try {
      const commissionRef = db.collection("partner_commissions").doc(doc.id);
      const partnerRef = db.collection("partners").doc(commission.partnerId);

      await db.runTransaction(async (txn) => {
        const freshDoc = await txn.get(commissionRef);
        if (!freshDoc.exists || freshDoc.data()?.status !== "pending") return;

        txn.update(commissionRef, {
          status: "validated",
          validatedAt: now,
          updatedAt: now,
        });

        txn.update(partnerRef, {
          pendingBalance: FieldValue.increment(-commission.amount),
          validatedBalance: FieldValue.increment(commission.amount),
          updatedAt: now,
        });
      });

      validatedCount++;
    } catch (error) {
      logger.error("[validatePendingCommissions] Failed to validate commission", {
        commissionId: doc.id,
        partnerId: commission.partnerId,
        error,
      });
    }
  }

  return validatedCount;
}

/**
 * Phase 2: Move validated commissions to available after release delay
 */
async function releaseValidatedCommissions(): Promise<number> {
  const db = getFirestore();
  const config = await getPartnerConfig();
  const now = Timestamp.now();
  let releasedCount = 0;

  // Query all validated commissions
  const validatedSnap = await db
    .collection("partner_commissions")
    .where("status", "==", "validated")
    .limit(BATCH_SIZE)
    .get();

  if (validatedSnap.empty) {
    return 0;
  }

  for (const doc of validatedSnap.docs) {
    const commission = doc.data() as PartnerCommission;

    if (!commission.validatedAt) {
      logger.warn("[releaseValidatedCommissions] Validated commission missing validatedAt", {
        commissionId: doc.id,
      });
      continue;
    }

    // Determine release delay for this commission's partner
    let releaseDelayHours = config.defaultReleaseDelayHours;

    try {
      const partnerDoc = await db.collection("partners").doc(commission.partnerId).get();
      if (partnerDoc.exists) {
        const partner = partnerDoc.data() as Partner;
        if (partner.commissionConfig?.releaseDelayHours != null) {
          releaseDelayHours = partner.commissionConfig.releaseDelayHours;
        }
      }
    } catch (err) {
      logger.warn("[releaseValidatedCommissions] Could not read partner config, using default", {
        partnerId: commission.partnerId,
        error: err,
      });
    }

    // Check if release delay has elapsed
    const releaseDelayMs = releaseDelayHours * 60 * 60 * 1000;
    const validatedAtMs = commission.validatedAt.toMillis();
    const cutoffMs = validatedAtMs + releaseDelayMs;

    if (now.toMillis() < cutoffMs) {
      continue; // Release delay not yet passed
    }

    // Transition: validated -> available (atomic with balance update)
    try {
      const commissionRef = db.collection("partner_commissions").doc(doc.id);
      const partnerRef = db.collection("partners").doc(commission.partnerId);

      await db.runTransaction(async (txn) => {
        const freshDoc = await txn.get(commissionRef);
        if (!freshDoc.exists || freshDoc.data()?.status !== "validated") return;

        txn.update(commissionRef, {
          status: "available",
          availableAt: now,
          updatedAt: now,
        });

        txn.update(partnerRef, {
          validatedBalance: FieldValue.increment(-commission.amount),
          availableBalance: FieldValue.increment(commission.amount),
          updatedAt: now,
        });
      });

      releasedCount++;

      // Create notification when commission becomes available
      const amountStr = (commission.amount / 100).toFixed(2);
      await db.collection("partner_notifications").add({
        partnerId: commission.partnerId,
        type: "commission_available",
        title: "Commission disponible !",
        titleTranslations: {
          fr: "Commission disponible !",
          en: "Commission available!",
          es: "Comision disponible!",
          de: "Provision verfugbar!",
          pt: "Comissao disponivel!",
          ru: "Комиссия доступна!",
          hi: "कमीशन उपलब्ध!",
          zh: "佣金可用！",
          ar: "العمولة متاحة!",
        },
        message: `$${amountStr} est maintenant disponible pour retrait.`,
        messageTranslations: {
          fr: `$${amountStr} est maintenant disponible pour retrait.`,
          en: `$${amountStr} is now available for withdrawal.`,
          es: `$${amountStr} esta ahora disponible para retiro.`,
          de: `$${amountStr} ist jetzt zur Auszahlung verfugbar.`,
          pt: `$${amountStr} esta agora disponivel para saque.`,
          ru: `$${amountStr} теперь доступно для вывода.`,
          hi: `$${amountStr} अब निकासी के लिए उपलब्ध है।`,
          zh: `$${amountStr} 现在可以提现。`,
          ar: `$${amountStr} متاح الآن للسحب.`,
        },
        isRead: false,
        data: {
          commissionId: doc.id,
          amount: commission.amount,
        },
        createdAt: now,
      });
    } catch (error) {
      logger.error("[releaseValidatedCommissions] Failed to release commission", {
        commissionId: doc.id,
        partnerId: commission.partnerId,
        error,
      });
    }
  }

  return releasedCount;
}

export const releasePartnerPendingCommissions = onSchedule(
  {
    schedule: "15 * * * *", // Every hour at minute 15
    timeZone: "UTC",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    logger.info("[releasePartnerPendingCommissions] Starting commission lifecycle run");

    try {
      // Phase 1: pending -> validated
      const validatedCount = await runWithRetry(
        validatePendingCommissions,
        "releasePartnerPendingCommissions:validate"
      );

      // Phase 2: validated -> available
      const releasedCount = await runWithRetry(
        releaseValidatedCommissions,
        "releasePartnerPendingCommissions:release"
      );

      logger.info("[releasePartnerPendingCommissions] Lifecycle run complete", {
        validatedCount,
        releasedCount,
      });
    } catch (error) {
      logger.error("[releasePartnerPendingCommissions] All retries failed", { error });
    }
  }
);

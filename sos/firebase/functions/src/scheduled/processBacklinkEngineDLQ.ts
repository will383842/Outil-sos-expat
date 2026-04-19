/**
 * Scheduled: processBacklinkEngineDLQ
 *
 * Retries failed notifyBacklinkEngine webhook calls stored in backlink_engine_dlq.
 * Runs every 30 minutes. Exponential backoff, max 5 attempts, then marks as "dead".
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { BACKLINK_ENGINE_WEBHOOK_SECRET as BACKLINK_SECRET } from "../lib/secrets";

const BACKLINK_ENGINE_WEBHOOK_URL =
  process.env.BACKLINK_ENGINE_WEBHOOK_URL ||
  "https://backlinks.life-expat.com/api/webhooks/sos-expat/user-registered";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 50;

interface DLQEntry {
  payload: Record<string, unknown>;
  reason: string;
  attempts: number;
  createdAt: Timestamp;
  nextRetryAt: Timestamp;
  status: "pending" | "dead" | "done";
}

export const processBacklinkEngineDLQ = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 180,
    secrets: [BACKLINK_SECRET],
  },
  async () => {
    if (!getApps().length) initializeApp();
    const db = getFirestore();

    const webhookSecret = BACKLINK_SECRET.value();
    if (!webhookSecret) {
      logger.warn("[processBacklinkEngineDLQ] No webhook secret configured, skipping");
      return;
    }

    const now = Timestamp.now();
    const snap = await db
      .collection("backlink_engine_dlq")
      .where("status", "==", "pending")
      .where("nextRetryAt", "<=", now)
      .orderBy("nextRetryAt", "asc")
      .limit(BATCH_LIMIT)
      .get();

    if (snap.empty) {
      logger.info("[processBacklinkEngineDLQ] No entries to retry");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let deadCount = 0;

    for (const doc of snap.docs) {
      const entry = doc.data() as DLQEntry;
      const newAttempts = (entry.attempts ?? 1) + 1;

      try {
        const response = await fetch(BACKLINK_ENGINE_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": webhookSecret,
          },
          body: JSON.stringify(entry.payload),
        });

        if (response.ok) {
          await doc.ref.update({
            status: "done",
            attempts: newAttempts,
            resolvedAt: Timestamp.now(),
          });
          successCount++;
          continue;
        }

        // HTTP error — decide retry vs dead
        const errorText = (await response.text()).substring(0, 500);
        if (newAttempts >= MAX_ATTEMPTS) {
          await doc.ref.update({
            status: "dead",
            attempts: newAttempts,
            lastError: `HTTP ${response.status}: ${errorText}`,
            deadAt: Timestamp.now(),
          });
          deadCount++;
        } else {
          // Exponential backoff: 15min × 2^(attempts-1) → 15, 30, 60, 120 min
          const delayMs = 15 * 60 * 1000 * Math.pow(2, newAttempts - 1);
          await doc.ref.update({
            attempts: newAttempts,
            lastError: `HTTP ${response.status}: ${errorText}`,
            nextRetryAt: Timestamp.fromMillis(Date.now() + delayMs),
          });
          failCount++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (newAttempts >= MAX_ATTEMPTS) {
          await doc.ref.update({
            status: "dead",
            attempts: newAttempts,
            lastError: msg,
            deadAt: Timestamp.now(),
          });
          deadCount++;
        } else {
          const delayMs = 15 * 60 * 1000 * Math.pow(2, newAttempts - 1);
          await doc.ref.update({
            attempts: newAttempts,
            lastError: msg,
            nextRetryAt: Timestamp.fromMillis(Date.now() + delayMs),
          });
          failCount++;
        }
      }
    }

    logger.info("[processBacklinkEngineDLQ] Batch processed", {
      total: snap.size,
      successCount,
      failCount,
      deadCount,
    });
  }
);

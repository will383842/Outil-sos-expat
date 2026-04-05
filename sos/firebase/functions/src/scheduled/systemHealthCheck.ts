/**
 * systemHealthCheck.ts
 *
 * Health check complet du système de réservation SOS Expat.
 * Exécuté 2x/jour (8h et 20h Paris) — envoie un rapport Telegram.
 *
 * Vérifie :
 * 1. Stripe API (balance retrieve)
 * 2. Twilio API (balance check)
 * 3. PayPal API (access token)
 * 4. Firestore (read/write test)
 * 5. Providers en ligne (nombre, disponibilité)
 * 6. Call sessions récentes (complétées, échouées, bloquées)
 * 7. Paiements bloqués (requires_capture > 1h)
 * 8. Pending transfers (KYC en attente > 7j)
 * 9. Commissions non distribuées
 * 10. Telegram Engine (ping)
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import {
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_SECRET_KEY_TEST,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_ENGINE_URL_SECRET,
  TELEGRAM_ENGINE_API_KEY_SECRET,
} from "../lib/secrets";
import { forwardEventToEngine } from "../telegram/forwardToEngine";

const db = admin.firestore();

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  details?: string;
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─────────────────────────────────────────────────────
// Individual Health Checks
// ─────────────────────────────────────────────────────

async function checkStripe(): Promise<CheckResult> {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { name: "Stripe", status: "error", message: "Clé API non configurée" };
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });

    const balance = await withTimeout(stripe.balance.retrieve(), 10000, "Stripe");
    const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);

    return {
      name: "Stripe",
      status: "ok",
      message: `Disponible: ${formatCurrency(available)} | En attente: ${formatCurrency(pending)}`,
    };
  } catch (error) {
    return {
      name: "Stripe",
      status: "error",
      message: `API inaccessible: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkTwilio(): Promise<CheckResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    if (!accountSid || !authToken) {
      return { name: "Twilio", status: "error", message: "Credentials non configurées" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
      }),
      10000,
      "Twilio"
    );

    if (!response.ok) {
      return { name: "Twilio", status: "error", message: `API erreur: HTTP ${response.status}` };
    }

    const data = (await response.json()) as { balance: string; currency: string };
    const balance = parseFloat(data.balance);

    if (balance < 10) {
      return { name: "Twilio", status: "warning", message: `Solde faible: $${balance.toFixed(2)}` };
    }

    return { name: "Twilio", status: "ok", message: `Solde: $${balance.toFixed(2)} ${data.currency}` };
  } catch (error) {
    return {
      name: "Twilio",
      status: "error",
      message: `API inaccessible: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkPayPal(): Promise<CheckResult> {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      return { name: "PayPal", status: "warning", message: "Credentials non configurées (skip)" };
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await withTimeout(
      fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      }),
      10000,
      "PayPal"
    );

    if (!response.ok) {
      return { name: "PayPal", status: "error", message: `Token erreur: HTTP ${response.status}` };
    }

    return { name: "PayPal", status: "ok", message: "Token OAuth OK" };
  } catch (error) {
    return {
      name: "PayPal",
      status: "error",
      message: `API inaccessible: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkFirestore(): Promise<CheckResult> {
  try {
    const testDoc = db.collection("_health_checks").doc("ping");
    const now = admin.firestore.Timestamp.now();
    await withTimeout(testDoc.set({ lastPing: now, source: "systemHealthCheck" }), 5000, "Firestore write");
    const snap = await withTimeout(testDoc.get(), 5000, "Firestore read");

    if (!snap.exists) {
      return { name: "Firestore", status: "error", message: "Read échoué après write" };
    }

    return { name: "Firestore", status: "ok", message: "Read/Write OK" };
  } catch (error) {
    return {
      name: "Firestore",
      status: "error",
      message: `Inaccessible: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkProviders(): Promise<CheckResult> {
  try {
    const onlineSnap = await db
      .collection("sos_profiles")
      .where("isOnline", "==", true)
      .where("isVisible", "==", true)
      .limit(500)
      .get();

    const online = onlineSnap.docs.filter((d) => {
      const data = d.data();
      return (data.type === "lawyer" || data.type === "expat") && !data.isAAA;
    });

    const available = online.filter((d) => d.data().availability === "available");
    const busy = online.filter((d) => d.data().availability === "busy");

    const totalSnap = await db
      .collection("sos_profiles")
      .where("isVisible", "==", true)
      .limit(1000)
      .get();

    const totalReal = totalSnap.docs.filter((d) => {
      const data = d.data();
      return (data.type === "lawyer" || data.type === "expat") && !data.isAAA;
    });

    if (online.length === 0) {
      return {
        name: "Prestataires",
        status: "warning",
        message: `0 en ligne sur ${totalReal.length} inscrits`,
      };
    }

    return {
      name: "Prestataires",
      status: "ok",
      message: `${available.length} dispo / ${busy.length} occupé / ${totalReal.length} total`,
    };
  } catch (error) {
    return {
      name: "Prestataires",
      status: "error",
      message: `Query échouée: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkCallSessions(): Promise<CheckResult> {
  try {
    const now = Date.now();
    const last24h = admin.firestore.Timestamp.fromMillis(now - 24 * 60 * 60 * 1000);

    // Appels des dernières 24h
    const recentCalls = await db
      .collection("call_sessions")
      .where("createdAt", ">=", last24h)
      .limit(200)
      .get();

    let completed = 0;
    let failed = 0;
    let stuck = 0;
    const stuckIds: string[] = [];

    for (const doc of recentCalls.docs) {
      const data = doc.data();
      if (data.status === "completed") completed++;
      else if (data.status === "failed" || data.status === "cancelled") failed++;
      else if (["pending", "provider_connecting", "both_connecting"].includes(data.status)) {
        // Session encore active après 30 min = bloquée
        const createdAt = data.createdAt?.toMillis?.() || 0;
        if (now - createdAt > 30 * 60 * 1000) {
          stuck++;
          stuckIds.push(doc.id.substring(0, 8));
        }
      }
    }

    const details = stuckIds.length > 0 ? `Bloqués: ${stuckIds.join(", ")}` : undefined;
    const total = recentCalls.size;

    if (stuck > 0) {
      return {
        name: "Appels (24h)",
        status: "warning",
        message: `${completed} OK / ${failed} échoué / ${stuck} bloqué sur ${total} total`,
        details,
      };
    }

    return {
      name: "Appels (24h)",
      status: "ok",
      message: `${completed} OK / ${failed} échoué sur ${total} total`,
    };
  } catch (error) {
    return {
      name: "Appels (24h)",
      status: "error",
      message: `Query échouée: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkStuckPayments(): Promise<CheckResult> {
  try {
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

    const stuckSnap = await db
      .collection("payments")
      .where("status", "==", "requires_capture")
      .where("createdAt", "<", oneHourAgo)
      .limit(20)
      .get();

    if (stuckSnap.empty) {
      return { name: "Paiements bloqués", status: "ok", message: "Aucun paiement en attente > 1h" };
    }

    const ids = stuckSnap.docs.map((d) => d.id.substring(0, 8));
    return {
      name: "Paiements bloqués",
      status: "warning",
      message: `${stuckSnap.size} paiement(s) en requires_capture > 1h`,
      details: `IDs: ${ids.join(", ")}`,
    };
  } catch (error) {
    return {
      name: "Paiements bloqués",
      status: "error",
      message: `Query échouée: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkPendingTransfers(): Promise<CheckResult> {
  try {
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pendingSnap = await db
      .collection("pending_transfers")
      .where("status", "==", "pending_kyc")
      .where("createdAt", "<", sevenDaysAgo)
      .limit(20)
      .get();

    if (pendingSnap.empty) {
      return { name: "Transferts KYC", status: "ok", message: "Aucun transfert en attente > 7j" };
    }

    let totalAmount = 0;
    for (const doc of pendingSnap.docs) {
      totalAmount += doc.data().providerAmount || 0;
    }

    return {
      name: "Transferts KYC",
      status: "warning",
      message: `${pendingSnap.size} transfert(s) en attente KYC > 7j (${formatCurrency(totalAmount)})`,
    };
  } catch (error) {
    return {
      name: "Transferts KYC",
      status: "error",
      message: `Query échouée: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

async function checkTelegramEngine(): Promise<CheckResult> {
  try {
    const engineUrl = process.env.TELEGRAM_ENGINE_URL;
    if (!engineUrl) {
      return { name: "Telegram Engine", status: "warning", message: "URL non configurée" };
    }

    const response = await withTimeout(
      fetch(`${engineUrl}/api/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      5000,
      "Telegram Engine"
    );

    if (response.ok) {
      return { name: "Telegram Engine", status: "ok", message: "API accessible" };
    }

    return {
      name: "Telegram Engine",
      status: "warning",
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name: "Telegram Engine",
      status: "error",
      message: `Inaccessible: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}

// ─────────────────────────────────────────────────────
// Format Telegram Message
// ─────────────────────────────────────────────────────

function formatTelegramReport(results: CheckResult[], executionMs: number): string {
  const errors = results.filter((r) => r.status === "error");
  const warnings = results.filter((r) => r.status === "warning");
  const oks = results.filter((r) => r.status === "ok");

  const statusIcon = errors.length > 0 ? "🔴" : warnings.length > 0 ? "🟡" : "🟢";
  const statusText =
    errors.length > 0
      ? "PROBLEME DETECTE"
      : warnings.length > 0
        ? "ATTENTION REQUISE"
        : "TOUT EST OK";

  const now = new Date();
  const parisTime = now.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

  let msg = `${statusIcon} *SOS Expat — Health Check*\n`;
  msg += `${parisTime}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*${statusText}*\n\n`;

  // Errors first
  if (errors.length > 0) {
    msg += `🔴 *ERREURS (${errors.length})*\n`;
    for (const r of errors) {
      msg += `  ❌ *${r.name}*: ${r.message}\n`;
      if (r.details) msg += `     ${r.details}\n`;
    }
    msg += `\n`;
  }

  // Warnings
  if (warnings.length > 0) {
    msg += `🟡 *ALERTES (${warnings.length})*\n`;
    for (const r of warnings) {
      msg += `  ⚠️ *${r.name}*: ${r.message}\n`;
      if (r.details) msg += `     ${r.details}\n`;
    }
    msg += `\n`;
  }

  // OKs
  if (oks.length > 0) {
    msg += `🟢 *OK (${oks.length})*\n`;
    for (const r of oks) {
      msg += `  ✅ ${r.name}: ${r.message}\n`;
    }
  }

  msg += `\n⏱ Exécution: ${executionMs}ms`;

  return msg;
}

// ─────────────────────────────────────────────────────
// Send via Telegram Bot API directly
// ─────────────────────────────────────────────────────

async function sendTelegramDirect(chatId: string, text: string): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      logger.error("[HealthCheck] TELEGRAM_BOT_TOKEN not available");
      return false;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error(`[HealthCheck] Telegram API error: ${response.status} ${body}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("[HealthCheck] Failed to send Telegram message:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────
// Main scheduled function — 2x/jour (8h + 20h Paris)
// ─────────────────────────────────────────────────────

export const systemHealthCheck = onSchedule(
  {
    // Cron: 8h et 20h heure de Paris
    schedule: "0 8,20 * * *",
    region: "europe-west3",
    timeZone: "Europe/Paris",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [
      STRIPE_SECRET_KEY_LIVE,
      STRIPE_SECRET_KEY_TEST,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TELEGRAM_BOT_TOKEN,
      TELEGRAM_ENGINE_URL_SECRET,
      TELEGRAM_ENGINE_API_KEY_SECRET,
    ],
  },
  async () => {
    const startTime = Date.now();
    logger.info("[HealthCheck] Starting system health check...");

    // Run all checks in parallel
    const results = await Promise.all([
      checkStripe(),
      checkTwilio(),
      checkPayPal(),
      checkFirestore(),
      checkProviders(),
      checkCallSessions(),
      checkStuckPayments(),
      checkPendingTransfers(),
      checkTelegramEngine(),
    ]);

    const executionMs = Date.now() - startTime;
    const errors = results.filter((r) => r.status === "error").length;
    const warnings = results.filter((r) => r.status === "warning").length;

    logger.info(`[HealthCheck] Completed: ${errors} errors, ${warnings} warnings, ${executionMs}ms`);

    // Format report
    const report = formatTelegramReport(results, executionMs);

    // Get admin chat ID
    try {
      const configDoc = await db.collection("telegram_admin_config").doc("settings").get();
      const recipientChatId = configDoc.exists ? configDoc.data()?.recipientChatId : null;

      if (recipientChatId) {
        await sendTelegramDirect(String(recipientChatId), report);
        logger.info(`[HealthCheck] Report sent to Telegram chat ${String(recipientChatId).substring(0, 4)}...`);
      } else {
        logger.warn("[HealthCheck] No recipientChatId configured in telegram_admin_config/settings");
      }
    } catch (error) {
      logger.error("[HealthCheck] Failed to send Telegram report:", error);
    }

    // Also forward to Telegram Engine for logging
    await forwardEventToEngine("system.health-check", undefined, {
      results: results.map((r) => ({ name: r.name, status: r.status, message: r.message })),
      errors,
      warnings,
      executionMs,
      timestamp: new Date().toISOString(),
    });

    // Store in Firestore for history
    try {
      await db.collection("_health_checks").doc("latest").set({
        results: results.map((r) => ({ name: r.name, status: r.status, message: r.message })),
        errors,
        warnings,
        executionMs,
        checkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      logger.warn("[HealthCheck] Failed to persist results to Firestore:", e);
    }
  }
);

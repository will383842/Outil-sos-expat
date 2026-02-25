/**
 * Telegram Onboarding System - Deep Link + Webhook Integration
 *
 * This module handles the complete Telegram onboarding flow:
 * 1. Generate unique deep links for chatters/influencers/bloggers/groupAdmins
 * 2. Receive webhook from Telegram bot when user clicks /start
 * 3. Link the telegram_id to the user account
 * 4. Credit the $50 bonus to the tirelire
 *
 * Collection: telegram_onboarding_links/{code}
 *
 * MIGRATION-READY: When the Telegram Marketing Tool is ready,
 * replace generateTelegramLink API call and telegramBotWebhook
 * with the tool's API. The Firestore structure remains compatible.
 */

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";
import { REFERRAL_CONFIG } from "../types";
import { handleWithdrawalCallback } from "../../telegram/withdrawalConfirmation";
import { TELEGRAM_SECRETS, getTelegramBotToken, getTelegramWebhookSecret } from "../../lib/secrets";
import { enqueueTelegramMessage } from "../../telegram/queue";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported roles for Telegram onboarding
 */
export type TelegramOnboardingRole = "chatter" | "influencer" | "blogger" | "groupAdmin" | "affiliate";

/**
 * Status of a Telegram onboarding link
 */
export type TelegramLinkStatus = "pending" | "linked" | "expired";

/**
 * Telegram Onboarding Link document
 * Collection: telegram_onboarding_links/{code}
 */
export interface TelegramOnboardingLink {
  /** Unique code (document ID) */
  code: string;

  /** Firebase UID of the user */
  userId: string;

  /** Role of the user */
  role: TelegramOnboardingRole;

  /** Current status */
  status: TelegramLinkStatus;

  /** Telegram chat_id when linked */
  telegramId: number | null;

  /** Telegram username (@username) */
  telegramUsername: string | null;

  /** Telegram first name */
  telegramFirstName: string | null;

  /** Telegram last name */
  telegramLastName: string | null;

  /** Deep link URL */
  deepLink: string;

  /** When the link was created */
  createdAt: Timestamp;

  /** When the link was used/linked */
  linkedAt: Timestamp | null;

  /** When the link expires (24h after creation) */
  expiresAt: Timestamp;
}

/**
 * Input for generateTelegramLink
 */
interface GenerateLinkInput {
  /** Role of the user (optional, defaults based on user doc) */
  role?: TelegramOnboardingRole;
}

/**
 * Output from generateTelegramLink
 */
interface GenerateLinkOutput {
  success: boolean;
  code: string;
  deepLink: string;
  qrCodeUrl: string;
  expiresAt: string;
  message: string;
}

/**
 * Output from checkTelegramLinkStatus
 */
interface CheckStatusOutput {
  success: boolean;
  status: TelegramLinkStatus;
  isLinked: boolean;
  telegramId: number | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Telegram Bot Configuration
 * NOTE: In production, these should come from environment variables/secrets
 */
const TELEGRAM_CONFIG = {
  // Bot username (without @)
  BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "SOSExpatChatterBot",
  // Link expiry in hours
  LINK_EXPIRY_HOURS: 24,
};

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique 12-character code
 */
function generateUniqueCode(): string {
  return crypto.randomBytes(6).toString("hex"); // 12 chars
}

/**
 * Build the deep link URL
 */
function buildDeepLink(code: string): string {
  return `https://t.me/${TELEGRAM_CONFIG.BOT_USERNAME}?start=${code}`;
}

/**
 * Build a QR code URL (using a public QR generator API)
 * In production, consider generating this server-side
 */
function buildQrCodeUrl(deepLink: string): string {
  const encoded = encodeURIComponent(deepLink);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&format=png`;
}

/**
 * Determine user role from their documents
 */
async function getUserRole(userId: string): Promise<TelegramOnboardingRole | null> {
  const db = getDb();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data();
  const role = userData?.role;

  // Map role to TelegramOnboardingRole
  switch (role) {
    case "chatter":
      return "chatter";
    case "influencer":
      return "influencer";
    case "blogger":
      return "blogger";
    case "groupAdmin":
      return "groupAdmin";
    default:
      // Any user with an affiliate code can use Telegram onboarding
      if (userData?.affiliateCode) {
        return "affiliate";
      }
      return null;
  }
}

/**
 * Get or create an active link for a user
 * Returns existing pending link if not expired, otherwise creates new one
 */
async function getOrCreateLink(
  userId: string,
  role: TelegramOnboardingRole
): Promise<TelegramOnboardingLink> {
  const db = getDb();
  const now = Timestamp.now();

  // Check for existing pending link
  // Note: This query requires a composite index on (userId, status, expiresAt)
  // If index doesn't exist, we fall back to a simpler query
  let existingDoc = null;

  try {
    const existingQuery = await db
      .collection("telegram_onboarding_links")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .where("expiresAt", ">", now)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      existingDoc = existingQuery.docs[0];
    }
  } catch (indexError) {
    // Fallback: simpler query without expiresAt comparison
    logger.warn("[getOrCreateLink] Index error, using fallback query", { indexError });
    const fallbackQuery = await db
      .collection("telegram_onboarding_links")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!fallbackQuery.empty) {
      const doc = fallbackQuery.docs[0];
      const data = doc.data() as TelegramOnboardingLink;
      // Manual expiry check
      if (data.expiresAt.toMillis() > now.toMillis()) {
        existingDoc = doc;
      }
    }
  }

  if (existingDoc) {
    logger.info("[getOrCreateLink] Returning existing link", {
      userId,
      code: existingDoc.id,
    });
    return existingDoc.data() as TelegramOnboardingLink;
  }

  // Create new link
  const code = generateUniqueCode();
  const deepLink = buildDeepLink(code);
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + TELEGRAM_CONFIG.LINK_EXPIRY_HOURS * 60 * 60 * 1000
  );

  const linkData: TelegramOnboardingLink = {
    code,
    userId,
    role,
    status: "pending",
    telegramId: null,
    telegramUsername: null,
    telegramFirstName: null,
    telegramLastName: null,
    deepLink,
    createdAt: now,
    linkedAt: null,
    expiresAt,
  };

  await db.collection("telegram_onboarding_links").doc(code).set(linkData);

  logger.info("[getOrCreateLink] Created new link", {
    userId,
    code,
    role,
    expiresAt: expiresAt.toDate().toISOString(),
  });

  return linkData;
}

/**
 * Send welcome message via Telegram Bot API
 */
async function sendTelegramMessage(
  chatId: number,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  const botToken = getTelegramBotToken();
  if (!botToken) {
    logger.warn("[sendTelegramMessage] Bot token not configured");
    return false;
  }

  // AbortController with 30s timeout to prevent hanging requests (C1 fix)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      logger.error("[sendTelegramMessage] Failed to send", { chatId, error });
      return false;
    }

    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[sendTelegramMessage] Request timeout after 30s", { chatId });
      return false;
    }
    logger.error("[sendTelegramMessage] Error", { chatId, error });
    return false;
  }
}

// ============================================================================
// CALLABLE: Generate Telegram Deep Link
// ============================================================================

/**
 * Generate a unique Telegram deep link for the authenticated user
 *
 * @returns Deep link URL, QR code URL, expiry time
 */
export const generateTelegramLink = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<GenerateLinkOutput> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const input = request.data as GenerateLinkInput;

    try {
      logger.info("[generateTelegramLink] Starting", { userId, inputRole: input?.role });

      // 2. Determine role
      let role: TelegramOnboardingRole | undefined = input?.role;
      if (!role) {
        logger.info("[generateTelegramLink] No role in input, detecting from user doc");
        const detectedRole = await getUserRole(userId);
        logger.info("[generateTelegramLink] Detected role", { userId, detectedRole });
        if (!detectedRole) {
          throw new HttpsError(
            "failed-precondition",
            "User role not found. Please ensure your account is set up correctly."
          );
        }
        role = detectedRole;
      }

      // 3. Check if user already has Telegram linked
      const db = getDb();
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (userData?.telegramId) {
        logger.info("[generateTelegramLink] User already has Telegram linked", {
          userId,
          telegramId: userData.telegramId,
        });
        return {
          success: true,
          code: "",
          deepLink: "",
          qrCodeUrl: "",
          expiresAt: "",
          message: "Telegram already linked to your account!",
        };
      }

      // 4. Get or create link
      const link = await getOrCreateLink(userId, role);
      const qrCodeUrl = buildQrCodeUrl(link.deepLink);

      logger.info("[generateTelegramLink] Link generated", {
        userId,
        code: link.code,
        role,
      });

      return {
        success: true,
        code: link.code,
        deepLink: link.deepLink,
        qrCodeUrl,
        expiresAt: link.expiresAt.toDate().toISOString(),
        message: "Open Telegram and click the link to connect your account!",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[generateTelegramLink] Error", { userId, errorMessage });

      // Check for index error
      if (errorMessage.includes("index") || errorMessage.includes("Index")) {
        throw new HttpsError(
          "failed-precondition",
          "Database index required. Please deploy Firestore indexes."
        );
      }

      throw new HttpsError("internal", `Failed to generate Telegram link: ${errorMessage}`);
    }
  }
);

// ============================================================================
// CALLABLE: Check Telegram Link Status
// ============================================================================

/**
 * Check if the user's Telegram account has been linked
 */
export const checkTelegramLinkStatus = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 15,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<CheckStatusOutput> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;

    try {
      const db = getDb();

      // Check user document first
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (userData?.telegramId) {
        return {
          success: true,
          status: "linked",
          isLinked: true,
          telegramId: userData.telegramId,
          telegramUsername: userData.telegramUsername || null,
          telegramFirstName: userData.telegramFirstName || null,
        };
      }

      // Check for pending link
      const linkQuery = await db
        .collection("telegram_onboarding_links")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (linkQuery.empty) {
        return {
          success: true,
          status: "pending",
          isLinked: false,
          telegramId: null,
          telegramUsername: null,
          telegramFirstName: null,
        };
      }

      const link = linkQuery.docs[0].data() as TelegramOnboardingLink;

      // Check if expired
      if (link.status === "pending" && link.expiresAt.toMillis() < Date.now()) {
        return {
          success: true,
          status: "expired",
          isLinked: false,
          telegramId: null,
          telegramUsername: null,
          telegramFirstName: null,
        };
      }

      return {
        success: true,
        status: link.status,
        isLinked: link.status === "linked",
        telegramId: link.telegramId,
        telegramUsername: link.telegramUsername,
        telegramFirstName: link.telegramFirstName,
      };
    } catch (error) {
      logger.error("[checkTelegramLinkStatus] Error", { userId, error });
      throw new HttpsError("internal", "Failed to check link status");
    }
  }
);

// ============================================================================
// HTTP: Telegram Bot Webhook
// ============================================================================

/**
 * Webhook endpoint for Telegram Bot updates
 * Receives /start commands with the unique code payload
 *
 * URL: https://europe-west1-{project}.cloudfunctions.net/telegramChatterBotWebhook
 */
export const telegramChatterBotWebhook = onRequest(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    // Allow unauthenticated access (Telegram servers need to call this)
    invoker: "public",
    secrets: [...TELEGRAM_SECRETS],
  },
  async (req, res) => {
    ensureInitialized();

    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      // SECURITY: Verify webhook secret to reject unauthorized calls
      const webhookSecret = getTelegramWebhookSecret();
      if (!webhookSecret) {
        logger.error("[telegramChatterBotWebhook] TELEGRAM_WEBHOOK_SECRET not configured");
        res.status(500).send("Webhook secret not configured");
        return;
      }
      const headerSecret = req.headers["x-telegram-bot-api-secret-token"] as string;
      // AUDIT-FIX a1: Use timing-safe comparison to prevent timing attacks on webhook secret
      if (!headerSecret || !crypto.timingSafeEqual(
        Buffer.from(headerSecret, "utf8"),
        Buffer.from(webhookSecret, "utf8")
      )) {
        logger.warn("[telegramChatterBotWebhook] Invalid or missing webhook secret token");
        res.status(403).send("Forbidden");
        return;
      }

      const update = req.body;

      // Log incoming update (C5 fix: no PII in production logs)
      logger.info("[telegramChatterBotWebhook] Received update", {
        updateId: update?.update_id,
        hasMessage: !!update?.message,
        hasCallbackQuery: !!update?.callback_query,
      });

      // Handle callback_query (inline keyboard responses) - withdrawal confirmations
      if (update?.callback_query) {
        const callbackData = update.callback_query.data || "";
        if (callbackData.startsWith("wc_")) {
          await handleWithdrawalCallback(update.callback_query);
        }
        res.status(200).send("OK");
        return;
      }

      // Only process messages
      if (!update?.message) {
        res.status(200).send("OK");
        return;
      }

      const message = update.message;
      const chatId = message.chat?.id;
      const text = message.text || "";
      const from = message.from;

      // Validate chatId exists
      if (!chatId) {
        logger.warn("[telegramChatterBotWebhook] Missing chatId in message");
        res.status(200).send("OK");
        return;
      }

      // Extract and validate telegram user info (accept number or numeric string)
      const rawTelegramId = from?.id;
      const telegramId = typeof rawTelegramId === "string" ? Number(rawTelegramId) : rawTelegramId;
      if (!telegramId || !Number.isFinite(telegramId) || telegramId <= 0) {
        logger.warn("[telegramChatterBotWebhook] Invalid or missing telegramId", { rawId: from?.id });
        res.status(200).send("OK");
        return;
      }
      const telegramUsername = from?.username || null;
      const telegramFirstName = from?.first_name || null;
      const telegramLastName = from?.last_name || null;

      // Check if it's a /start command with payload
      if (!text.startsWith("/start")) {
        // Not a start command, send help message
        await sendTelegramMessage(
          chatId,
          "👋 <b>Bienvenue sur SOS-Expat!</b>\n\n" +
            "Pour connecter votre compte, utilisez le lien fourni dans l'application SOS-Expat.\n\n" +
            "📱 <a href='https://sos-expat.com/chatter'>Devenir Chatter</a>"
        );
        res.status(200).send("OK");
        return;
      }

      // Extract the code from /start {code}
      const parts = text.split(" ");
      const code = parts[1]?.trim();

      // Validate code format (hex string, reasonable length, no special chars)
      if (code && !/^[a-f0-9]{6,64}$/.test(code)) {
        logger.warn("[telegramChatterBotWebhook] Invalid code format", { code: code.substring(0, 20) });
        await sendTelegramMessage(
          chatId,
          "❌ <b>Code invalide</b>\n\n" +
            "Le format du code n'est pas valide. Retournez dans l'application pour générer un nouveau lien."
        );
        res.status(200).send("OK");
        return;
      }

      if (!code) {
        // No code, send welcome without linking
        await sendTelegramMessage(
          chatId,
          "👋 <b>Bienvenue sur SOS-Expat!</b>\n\n" +
            "Pour connecter votre compte et recevoir votre <b>bonus de $50</b>, " +
            "utilisez le lien fourni dans l'application.\n\n" +
            "💰 Ce bonus sera débloqué dès que vous atteindrez $150 de commissions!"
        );
        res.status(200).send("OK");
        return;
      }

      // Find the link document
      const db = getDb();
      const linkRef = db.collection("telegram_onboarding_links").doc(code);
      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        logger.warn("[telegramChatterBotWebhook] Invalid code", { code, chatId });
        await sendTelegramMessage(
          chatId,
          "❌ <b>Lien invalide ou expiré</b>\n\n" +
            "Ce lien n'est plus valide. Retournez dans l'application pour générer un nouveau lien."
        );
        res.status(200).send("OK");
        return;
      }

      const link = linkDoc.data() as TelegramOnboardingLink;

      // Check if already linked
      if (link.status === "linked") {
        await sendTelegramMessage(
          chatId,
          "✅ <b>Compte déjà connecté!</b>\n\n" +
            `Votre compte Telegram est déjà lié à votre profil ${link.role}.`
        );
        res.status(200).send("OK");
        return;
      }

      // Check if expired
      if (link.expiresAt.toMillis() < Date.now()) {
        await sendTelegramMessage(
          chatId,
          "⏰ <b>Lien expiré</b>\n\n" +
            "Ce lien a expiré. Retournez dans l'application pour générer un nouveau lien."
        );
        res.status(200).send("OK");
        return;
      }

      // Check if this Telegram account is already linked to another user
      const existingUserQuery = await db
        .collection("users")
        .where("telegramId", "==", telegramId)
        .limit(1)
        .get();

      if (!existingUserQuery.empty) {
        const existingUserId = existingUserQuery.docs[0].id;
        if (existingUserId !== link.userId) {
          logger.warn("[telegramChatterBotWebhook] Telegram already linked to another account", {
            telegramId,
            attemptedUserId: link.userId,
            existingUserId,
          });
          await sendTelegramMessage(
            chatId,
            "⚠️ <b>Compte Telegram déjà utilisé</b>\n\n" +
              "Ce compte Telegram est déjà lié à un autre profil SOS-Expat. " +
              "Utilisez un autre compte Telegram ou contactez le support."
          );
          res.status(200).send("OK");
          return;
        }
      }

      // Success! Link the account using a transaction to prevent race conditions
      const now = Timestamp.now();
      const telegramBonusAmount = REFERRAL_CONFIG.TELEGRAM_BONUS?.AMOUNT || 5000;

      const roleCollections: Partial<Record<TelegramOnboardingRole, string>> = {
        chatter: "chatters",
        influencer: "influencers",
        blogger: "bloggers",
        groupAdmin: "group_admins",
        // affiliate: no separate collection (uses users/ doc directly)
      };

      try {
        await db.runTransaction(async (transaction) => {
          // Re-read the link document inside the transaction to prevent double-linking
          const linkSnap = await transaction.get(linkRef);
          if (!linkSnap.exists) {
            throw new Error("LINK_NOT_FOUND");
          }
          const linkData = linkSnap.data() as TelegramOnboardingLink;
          if (linkData.status === "linked") {
            throw new Error("ALREADY_LINKED");
          }
          if (linkData.expiresAt.toMillis() < Date.now()) {
            throw new Error("LINK_EXPIRED");
          }

          // Validate user role matches link role
          const userRef = db.collection("users").doc(linkData.userId);
          const userSnap = await transaction.get(userRef);
          if (userSnap.exists) {
            const userData = userSnap.data();
            const userRole = userData?.role;
            if (userRole && userRole !== linkData.role) {
              logger.warn("[telegramChatterBotWebhook] Role mismatch", {
                linkRole: linkData.role,
                userRole,
                userId: linkData.userId,
              });
            }
          }

          // Update link document
          transaction.update(linkRef, {
            status: "linked",
            telegramId,
            telegramUsername,
            telegramFirstName,
            telegramLastName,
            linkedAt: now,
          });

          // Update users document
          transaction.update(db.collection("users").doc(linkData.userId), {
            hasTelegram: true,
            telegramId,
            telegramUsername,
            telegramFirstName,
            telegramLastName,
            telegramLinkedAt: now,
            telegramOnboardingCompleted: true,
            telegramOnboardingAt: now,
            telegramBonusAmount,
            telegramBonusCredited: true,
            telegramBonusCreditedAt: now,
            telegramBonusPaid: false,
            // Tag with role for marketing campaign segmentation
            telegramTags: FieldValue.arrayUnion(linkData.role),
            updatedAt: now,
          });

          // Also update role-specific collection
          const roleCollection = roleCollections[linkData.role];
          if (roleCollection) {
            const roleRef = db.collection(roleCollection).doc(linkData.userId);
            const roleDoc = await transaction.get(roleRef);
            if (roleDoc.exists) {
              transaction.update(roleRef, {
                hasTelegram: true,
                telegramId,
                telegramUsername,
                telegramFirstName,
                telegramLastName,
                telegramLinkedAt: now,
                telegramOnboardingCompleted: true,
                telegramOnboardingAt: now,
                telegramBonusAmount,
                telegramBonusCredited: true,
                telegramBonusPaid: false,
                updatedAt: now,
              });
            }
          }
        });
      } catch (txError) {
        const errorMsg = txError instanceof Error ? txError.message : String(txError);
        if (errorMsg === "ALREADY_LINKED") {
          await sendTelegramMessage(
            chatId,
            "✅ <b>Compte déjà connecté!</b>\n\n" +
              `Votre compte Telegram est déjà lié à votre profil.`
          );
          res.status(200).send("OK");
          return;
        }
        if (errorMsg === "LINK_EXPIRED") {
          await sendTelegramMessage(
            chatId,
            "⏰ <b>Lien expiré</b>\n\nCe lien a expiré. Retournez dans l'application pour générer un nouveau lien."
          );
          res.status(200).send("OK");
          return;
        }
        logger.error("[telegramChatterBotWebhook] Transaction failed", { error: errorMsg, code, userId: link.userId });
        await sendTelegramMessage(
          chatId,
          "❌ <b>Erreur technique</b>\n\n" +
            "Une erreur est survenue lors de la connexion. Veuillez réessayer dans quelques instants."
        );
        res.status(200).send("OK");
        return;
      }

      logger.info("[telegramChatterBotWebhook] Successfully linked account", {
        code,
        userId: link.userId,
        telegramId,
        telegramUsername,
        role: link.role,
        bonusAmount: telegramBonusAmount,
      });

      // Send success message with bonus info
      const bonusFormatted = (telegramBonusAmount / 100).toFixed(0);
      const thresholdFormatted = ((REFERRAL_CONFIG.TELEGRAM_BONUS?.UNLOCK_THRESHOLD || 15000) / 100).toFixed(0);

      await sendTelegramMessage(
        chatId,
        `🎉 <b>Félicitations ${telegramFirstName || ""}!</b>\n\n` +
          `✅ Votre compte Telegram est maintenant connecté à SOS-Expat!\n\n` +
          `🎁 <b>Bonus de $${bonusFormatted} crédité à votre tirelire!</b>\n\n` +
          `💡 Ce bonus sera débloqué dès que vous atteindrez $${thresholdFormatted} de commissions d'affiliation.\n\n` +
          `📱 Retournez dans l'application pour accéder à votre dashboard.\n\n` +
          `🚀 Vous recevrez ici des notifications exclusives et des opportunités de bonus!`
      );

      // ═══════════════════════════════════════════════════════════════════
      // SEND DAY 0 DRIP MESSAGE IMMEDIATELY (motivation message)
      // ═══════════════════════════════════════════════════════════════════
      try {
        // Get user's language preference (default to 'fr')
        const userDoc = await db.collection("users").doc(link.userId).get();
        const userData = userDoc.data();
        const userLanguage = userData?.language || "fr";

        // Fetch day 0 message from Firestore
        const day0Doc = await db.collection("chatter_drip_messages").doc("day_0").get();

        if (day0Doc.exists) {
          const messageData = day0Doc.data();
          let welcomeMessage = messageData?.messages?.[userLanguage] || messageData?.messages?.fr || "";

          // Personalize with firstName
          const firstName = userData?.firstName || telegramFirstName || "Champion";
          welcomeMessage = welcomeMessage.replace(/\{\{firstName\}\}/g, firstName);

          // Enqueue the message with high priority (realtime)
          await enqueueTelegramMessage(
            telegramId.toString(),
            welcomeMessage,
            {
              parseMode: "HTML",
              priority: "realtime",
              sourceEventType: "drip_campaign_day_0",
            }
          );

          // Mark Day 0 as sent to prevent the daily cron from resending it
          if (link.role === "chatter") {
            await db.collection("chatters").doc(link.userId).update({
              lastDripMessageDay: 0,
              updatedAt: Timestamp.now(),
            });
          }

          logger.info("[telegramChatterBotWebhook] Day 0 drip message enqueued", {
            userId: link.userId,
            telegramId,
            language: userLanguage,
          });
        } else {
          logger.warn("[telegramChatterBotWebhook] Day 0 message not found in Firestore");
        }
      } catch (dripError) {
        // Don't fail the whole onboarding if drip message fails
        logger.error("[telegramChatterBotWebhook] Failed to send day 0 drip message", {
          error: dripError,
          userId: link.userId,
        });
      }

      res.status(200).send("OK");
    } catch (error) {
      logger.error("[telegramChatterBotWebhook] Error", { error });
      res.status(500).send("Internal error");
    }
  }
);

// ============================================================================
// CALLABLE: Skip Telegram Onboarding (continue without)
// ============================================================================

/**
 * Allow user to skip Telegram onboarding (discouraged but allowed)
 * They can add Telegram later from their dashboard
 */
export const skipTelegramOnboarding = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 15,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;

    try {
      const db = getDb();
      const now = Timestamp.now();
      const batch = db.batch();

      // Get user doc first to determine role
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const role = userDoc.data()?.role;

      // Update user document - mark as completed but without Telegram
      batch.update(userRef, {
        hasTelegram: false,
        telegramOnboardingCompleted: true,
        telegramOnboardingAt: now,
        telegramOnboardingSkipped: true,
        updatedAt: now,
      });

      // Also update chatters/influencers/etc if exists
      const roleCollections: Record<string, string> = {
        chatter: "chatters",
        influencer: "influencers",
        blogger: "bloggers",
        groupAdmin: "group_admins",
      };

      const roleCollection = roleCollections[role];
      if (roleCollection) {
        const roleRef = db.collection(roleCollection).doc(userId);
        const roleDoc = await roleRef.get();
        if (roleDoc.exists) {
          batch.update(roleRef, {
            hasTelegram: false,
            telegramOnboardingCompleted: true,
            telegramOnboardingSkipped: true,
            updatedAt: now,
          });
        }
      }

      // Commit all updates atomically
      await batch.commit();

      logger.info("[skipTelegramOnboarding] User skipped Telegram", { userId, role });

      return {
        success: true,
        message: "You can add Telegram later from your dashboard settings.",
      };
    } catch (error) {
      logger.error("[skipTelegramOnboarding] Error", { userId, error });
      throw new HttpsError("internal", "Failed to skip Telegram onboarding");
    }
  }
);

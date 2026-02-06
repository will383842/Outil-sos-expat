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
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import * as crypto from "crypto";
import { REFERRAL_CONFIG } from "../types";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported roles for Telegram onboarding
 */
export type TelegramOnboardingRole = "chatter" | "influencer" | "blogger" | "groupAdmin";

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
  // Bot token for API calls (set via Firebase secrets)
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  // Link expiry in hours
  LINK_EXPIRY_HOURS: 24,
  // Webhook secret for verification
  WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
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
  const existingQuery = await db
    .collection("telegram_onboarding_links")
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .where("expiresAt", ">", now)
    .limit(1)
    .get();

  if (!existingQuery.empty) {
    const existingDoc = existingQuery.docs[0];
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
  if (!TELEGRAM_CONFIG.BOT_TOKEN) {
    logger.warn("[sendTelegramMessage] Bot token not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error("[sendTelegramMessage] Failed to send", { chatId, error });
      return false;
    }

    return true;
  } catch (error) {
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
    region: "europe-west1",
    memory: "256MiB",
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
      // 2. Determine role
      let role: TelegramOnboardingRole | undefined = input?.role;
      if (!role) {
        const detectedRole = await getUserRole(userId);
        if (!detectedRole) {
          throw new HttpsError(
            "failed-precondition",
            "User role not found. Only chatters, influencers, bloggers, and group admins can use this."
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
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[generateTelegramLink] Error", { userId, error });
      throw new HttpsError("internal", "Failed to generate Telegram link");
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
    region: "europe-west1",
    memory: "256MiB",
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
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    // Allow unauthenticated access (Telegram servers need to call this)
    invoker: "public",
  },
  async (req, res) => {
    ensureInitialized();

    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      const update = req.body;

      // Log incoming update (remove in production for privacy)
      logger.info("[telegramChatterBotWebhook] Received update", {
        updateId: update?.update_id,
        messageText: update?.message?.text,
        chatId: update?.message?.chat?.id,
      });

      // Only process messages
      if (!update?.message) {
        res.status(200).send("OK");
        return;
      }

      const message = update.message;
      const chatId = message.chat?.id;
      const text = message.text || "";
      const from = message.from;

      // Extract telegram user info
      const telegramId = from?.id;
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

      // Success! Link the account
      const now = Timestamp.now();
      const batch = db.batch();

      // Update link document
      batch.update(linkRef, {
        status: "linked",
        telegramId,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        linkedAt: now,
      });

      // Get bonus amount
      const telegramBonusAmount = REFERRAL_CONFIG.TELEGRAM_BONUS?.AMOUNT || 5000;

      // Update users document
      const userRef = db.collection("users").doc(link.userId);
      batch.update(userRef, {
        hasTelegram: true,
        telegramId,
        telegramUsername,
        telegramFirstName,
        telegramLastName,
        telegramLinkedAt: now,
        telegramOnboardingCompleted: true,
        telegramOnboardingAt: now,
        // Credit the $50 bonus to tirelire (locked until threshold)
        telegramBonusAmount,
        telegramBonusCredited: true,
        telegramBonusCreditedAt: now,
        telegramBonusPaid: false, // Will be true when unlocked and paid
        updatedAt: now,
      });

      // Also update role-specific collection (chatters, influencers, etc.)
      const roleCollections: Record<TelegramOnboardingRole, string> = {
        chatter: "chatters",
        influencer: "influencers",
        blogger: "bloggers",
        groupAdmin: "group_admins",
      };

      const roleCollection = roleCollections[link.role];
      if (roleCollection) {
        const roleRef = db.collection(roleCollection).doc(link.userId);
        const roleDoc = await roleRef.get();
        if (roleDoc.exists) {
          batch.update(roleRef, {
            hasTelegram: true,
            telegramId,
            telegramUsername,
            telegramFirstName,
            telegramLinkedAt: now,
            telegramBonusAmount,
            telegramBonusCredited: true,
            telegramBonusPaid: false,
            updatedAt: now,
          });
        }
      }

      // Commit all updates
      await batch.commit();

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
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 15,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
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

      // Update user document - mark as completed but without Telegram
      await db.collection("users").doc(userId).update({
        hasTelegram: false,
        telegramOnboardingCompleted: true,
        telegramOnboardingAt: now,
        telegramOnboardingSkipped: true,
        updatedAt: now,
      });

      // Also update chatters/influencers/etc if exists
      const userDoc = await db.collection("users").doc(userId).get();
      const role = userDoc.data()?.role;

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
          await roleRef.update({
            hasTelegram: false,
            telegramOnboardingCompleted: true,
            telegramOnboardingSkipped: true,
            updatedAt: now,
          });
        }
      }

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

/**
 * onWithdrawalRequest.ts
 *
 * Telegram notification trigger for withdrawal requests.
 *
 * This trigger listens to the "payment_withdrawals/{withdrawalId}" collection
 * and sends a Telegram notification when a new withdrawal request is created.
 *
 * Features:
 * - Notifies admin of new withdrawal requests
 * - Translates user types to French
 * - Formats amount with 2 decimal places
 * - Paris timezone for date/time formatting
 * - Graceful error handling
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { WithdrawalRequestVars } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnWithdrawalRequest]";

/** Withdrawal collection path in Firestore */
const WITHDRAWAL_COLLECTION = "payment_withdrawals";

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

/**
 * User type translations to French
 * Maps English user types to their French equivalents
 */
const USER_TYPE_TRANSLATIONS_FR: Record<string, string> = {
  chatter: "Chatter",
  affiliate: "Affilié",
  influencer: "Influenceur",
  blogger: "Blogueur",
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Withdrawal document structure from Firestore
 * Based on WithdrawalRequest type from payment/types
 */
interface WithdrawalDocument {
  /** User ID who requested the withdrawal */
  userId?: string;
  /** Type of user (chatter, influencer, blogger, affiliate) */
  userType?: string;
  /** User's display name */
  userName?: string;
  /** User's email */
  userEmail?: string;
  /** Amount in cents (smallest currency unit) */
  amount?: number;
  /** Type of payment method (bank_transfer, mobile_money) */
  methodType?: string;
  /** Payment provider (wise, flutterwave) */
  provider?: string;
  /** Payment details snapshot */
  paymentDetails?: {
    type?: string;
    provider?: string;
    accountHolderName?: string;
    accountName?: string;
    bankName?: string;
    phoneNumber?: string;
  };
  /** Timestamp when the request was created */
  requestedAt?: string;
  /** Firestore timestamp */
  createdAt?: FirebaseFirestore.Timestamp;
}

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

/**
 * Ensure Firebase Admin is initialized
 */
function ensureInitialized(): void {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Translate user type to French
 * @param userType - User type in English (chatter, affiliate, influencer, blogger)
 * @returns French translation or original if not found
 */
function translateUserTypeFr(userType: string | undefined): string {
  if (!userType) {
    return "Utilisateur";
  }
  return USER_TYPE_TRANSLATIONS_FR[userType.toLowerCase()] || userType;
}

/**
 * Format date in Paris timezone (DD/MM/YYYY)
 */
function formatDateParis(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time in Paris timezone (HH:MM)
 */
function formatTimeParis(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format amount with 2 decimal places
 * Converts from cents to euros/dollars
 */
function formatAmount(amountInCents: number): string {
  return (amountInCents / 100).toFixed(2);
}

/**
 * Get human-readable payment method description
 * @param withdrawal - Withdrawal document data
 * @returns Payment method string for display
 */
function getPaymentMethodDescription(withdrawal: WithdrawalDocument): string {
  const methodType = withdrawal.methodType;
  const provider = withdrawal.provider;
  const details = withdrawal.paymentDetails;

  // Build description based on method type
  if (methodType === "mobile_money") {
    const mobileProvider = details?.provider || provider;
    const providerName = mobileProvider
      ? mobileProvider.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Mobile Money";
    return `${providerName}`;
  }

  if (methodType === "bank_transfer") {
    const bankName = details?.bankName;
    if (bankName) {
      return `Virement bancaire (${bankName})`;
    }
    return provider === "wise" ? "Wise (Virement)" : "Virement bancaire";
  }

  // Fallback
  if (provider) {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  return "Non spécifié";
}

/**
 * Fetch user name from users collection if not available in withdrawal
 * @param userId - User ID to fetch
 * @param userType - Type of user (to determine collection)
 * @returns User's display name or email
 */
async function fetchUserName(
  userId: string,
  userType: string | undefined
): Promise<string | null> {
  try {
    const db = getFirestore();

    // Try to find user in the appropriate collection
    const collectionsToTry = userType
      ? [`${userType}s`, "users"]
      : ["users", "chatters", "influencers", "bloggers", "affiliates"];

    for (const collection of collectionsToTry) {
      const userDoc = await db.collection(collection).doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return (
          userData?.displayName ||
          userData?.name ||
          userData?.fullName ||
          userData?.email ||
          null
        );
      }
    }

    return null;
  } catch (error) {
    logger.warn(`${LOG_PREFIX} Error fetching user name:`, error);
    return null;
  }
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Telegram notification trigger for withdrawal requests
 *
 * Listens to: payment_withdrawals/{withdrawalId}
 * Triggers on: Document creation (new withdrawal request)
 *
 * Notification template variables:
 * - USER_NAME: Name of the requesting user
 * - USER_TYPE_FR: User type in French (Chatter, Affilié, Influenceur, Blogueur)
 * - AMOUNT: Requested amount with 2 decimal places
 * - PAYMENT_METHOD: Chosen payment method description
 * - DATE: Request date (DD/MM/YYYY, Paris timezone)
 * - TIME: Request time (HH:MM, Paris timezone)
 */
export const telegramOnWithdrawalRequest = onDocumentCreated(
  {
    region: "europe-west3",
    document: `${WITHDRAWAL_COLLECTION}/{withdrawalId}`,
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    ensureInitialized();

    const withdrawalId = event.params.withdrawalId;
    const snapshot = event.data;

    logger.info(`${LOG_PREFIX} Processing withdrawal request: ${withdrawalId}`);

    // Check if document exists
    if (!snapshot) {
      logger.warn(`${LOG_PREFIX} No data in event for withdrawal ${withdrawalId}`);
      return;
    }

    const withdrawalData = snapshot.data() as WithdrawalDocument;

    try {
      // 1. Extract user information
      let userName = withdrawalData.userName;

      // If userName is not available, try to fetch from users collection
      if (!userName && withdrawalData.userId) {
        const fetchedName = await fetchUserName(
          withdrawalData.userId,
          withdrawalData.userType
        );
        userName = fetchedName || withdrawalData.userEmail || "Utilisateur";
      }

      // 2. Translate user type to French
      const userTypeFr = translateUserTypeFr(withdrawalData.userType);

      // 3. Format amount (convert from cents to euros with 2 decimals)
      const amount = withdrawalData.amount || 0;
      const formattedAmount = formatAmount(amount);

      // 4. Get payment method description
      const paymentMethod = getPaymentMethodDescription(withdrawalData);

      // 5. Get date/time in Paris timezone
      const requestDate = withdrawalData.requestedAt
        ? new Date(withdrawalData.requestedAt)
        : withdrawalData.createdAt?.toDate() || new Date();

      // 6. Build notification variables
      const variables: WithdrawalRequestVars = {
        USER_NAME: userName || "Utilisateur",
        USER_TYPE: userTypeFr,
        USER_TYPE_FR: userTypeFr, // backward compat
        AMOUNT: formattedAmount,
        PAYMENT_METHOD: paymentMethod,
        DATE: formatDateParis(requestDate),
        TIME: formatTimeParis(requestDate),
      };

      logger.info(`${LOG_PREFIX} Sending notification for withdrawal ${withdrawalId}`, {
        userName: variables.USER_NAME,
        userType: variables.USER_TYPE_FR,
        amount: variables.AMOUNT,
        paymentMethod: variables.PAYMENT_METHOD,
        date: variables.DATE,
        time: variables.TIME,
      });

      // 7. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "withdrawal_request",
        variables
      );

      if (success) {
        logger.info(
          `${LOG_PREFIX} Notification sent successfully for withdrawal ${withdrawalId}`
        );
      } else {
        logger.warn(
          `${LOG_PREFIX} Failed to send notification for withdrawal ${withdrawalId}`
        );
      }
    } catch (error) {
      // Log error but don't throw - we don't want to retry the trigger
      logger.error(`${LOG_PREFIX} Error processing withdrawal ${withdrawalId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
);

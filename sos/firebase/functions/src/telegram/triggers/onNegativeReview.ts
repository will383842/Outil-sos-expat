/**
 * onNegativeReview.ts
 *
 * Telegram notification trigger for negative reviews (1-2 stars).
 *
 * This trigger listens to the "reviews/{reviewId}" collection and sends
 * a Telegram notification when a negative review (rating <= 2) is received.
 *
 * Features:
 * - Filters for ratings of 1 or 2 stars only
 * - Fetches client and provider names from Firestore
 * - Truncates comment to 100 characters for preview
 * - Paris timezone for date/time formatting
 * - Graceful error handling
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { NegativeReviewVars } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnNegativeReview]";

/** Maximum rating that triggers a negative review notification */
const MAX_NEGATIVE_RATING = 2;

/** Maximum characters for comment preview */
const MAX_COMMENT_LENGTH = 100;

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Review document structure from Firestore
 */
interface ReviewDocument {
  rating?: number;
  clientId?: string;
  providerId?: string;
  comment?: string;
  callId?: string;
  createdAt?: FirebaseFirestore.Timestamp;
}

/**
 * User document structure from Firestore
 */
interface UserDocument {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

/**
 * Provider profile document structure from Firestore
 */
interface ProviderProfileDocument {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  businessName?: string;
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
 * Truncate comment to specified length with ellipsis
 */
function truncateComment(comment: string | undefined, maxLength: number): string {
  if (!comment) {
    return "(Pas de commentaire)";
  }

  const trimmed = comment.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return trimmed.substring(0, maxLength - 3) + "...";
}

/**
 * Get user display name from user document
 */
function getUserDisplayName(user: UserDocument | undefined): string {
  if (!user) {
    return "Client inconnu";
  }

  if (user.displayName) {
    return user.displayName;
  }

  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }

  if (user.name) {
    return user.name;
  }

  if (user.email) {
    // Return first part of email as fallback
    return user.email.split("@")[0];
  }

  return "Client inconnu";
}

/**
 * Get provider display name from provider profile document
 */
function getProviderDisplayName(provider: ProviderProfileDocument | undefined): string {
  if (!provider) {
    return "Prestataire inconnu";
  }

  if (provider.displayName) {
    return provider.displayName;
  }

  if (provider.businessName) {
    return provider.businessName;
  }

  if (provider.firstName || provider.lastName) {
    return [provider.firstName, provider.lastName].filter(Boolean).join(" ");
  }

  if (provider.name) {
    return provider.name;
  }

  return "Prestataire inconnu";
}

/**
 * Fetch client name from users collection
 */
async function fetchClientName(clientId: string | undefined): Promise<string> {
  if (!clientId) {
    return "Client inconnu";
  }

  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(clientId).get();

    if (!userDoc.exists) {
      logger.warn(`${LOG_PREFIX} Client not found: ${clientId}`);
      return "Client inconnu";
    }

    return getUserDisplayName(userDoc.data() as UserDocument);
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error fetching client:`, { clientId, error });
    return "Client inconnu";
  }
}

/**
 * Fetch provider name from sos_profiles collection
 */
async function fetchProviderName(providerId: string | undefined): Promise<string> {
  if (!providerId) {
    return "Prestataire inconnu";
  }

  try {
    const db = getFirestore();

    // Try sos_profiles collection first
    const profileDoc = await db.collection("sos_profiles").doc(providerId).get();

    if (profileDoc.exists) {
      return getProviderDisplayName(profileDoc.data() as ProviderProfileDocument);
    }

    // Fallback to users collection
    const userDoc = await db.collection("users").doc(providerId).get();

    if (userDoc.exists) {
      return getUserDisplayName(userDoc.data() as UserDocument);
    }

    logger.warn(`${LOG_PREFIX} Provider not found: ${providerId}`);
    return "Prestataire inconnu";
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error fetching provider:`, { providerId, error });
    return "Prestataire inconnu";
  }
}

// ============================================================================
// MAIN TRIGGER
// ============================================================================

/**
 * Telegram notification trigger for negative reviews
 *
 * Listens to: reviews/{reviewId}
 * Triggers on: Document creation with rating <= 2
 *
 * Notification template variables:
 * - CLIENT_NAME: Name of the client who left the review
 * - PROVIDER_NAME: Name of the provider who received the review
 * - RATING: Rating value (1 or 2)
 * - COMMENT_PREVIEW: First 100 characters of the comment
 * - DATE: Review date (DD/MM/YYYY, Paris timezone)
 * - TIME: Review time (HH:MM, Paris timezone)
 */
export const telegramOnNegativeReview = onDocumentCreated(
  {
    region: "europe-west3",
    document: "reviews/{reviewId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    ensureInitialized();

    const reviewId = event.params.reviewId;
    const snapshot = event.data;

    logger.info(`${LOG_PREFIX} Processing review: ${reviewId}`);

    // Check if document exists
    if (!snapshot) {
      logger.warn(`${LOG_PREFIX} No data in event for review ${reviewId}`);
      return;
    }

    const reviewData = snapshot.data() as ReviewDocument;

    try {
      // 1. Check if rating is negative (1 or 2 stars)
      const rating = reviewData.rating;

      if (rating === undefined || rating === null) {
        logger.info(`${LOG_PREFIX} Review ${reviewId} has no rating - skipping notification`);
        return;
      }

      if (rating > MAX_NEGATIVE_RATING) {
        logger.info(
          `${LOG_PREFIX} Review ${reviewId} rating is ${rating}, not negative - skipping notification`
        );
        return;
      }

      logger.info(`${LOG_PREFIX} Negative review detected: ${reviewId} with rating ${rating}`);

      // 2. Fetch client and provider names in parallel
      const [clientName, providerName] = await Promise.all([
        fetchClientName(reviewData.clientId),
        fetchProviderName(reviewData.providerId),
      ]);

      // 3. Get date/time in Paris timezone
      const reviewDate = reviewData.createdAt?.toDate() ?? new Date();

      // 4. Truncate comment for preview
      const commentPreview = truncateComment(reviewData.comment, MAX_COMMENT_LENGTH);

      // 5. Build notification variables
      const variables: NegativeReviewVars = {
        CLIENT_NAME: clientName,
        PROVIDER_NAME: providerName,
        RATING: rating.toString(),
        COMMENT_PREVIEW: commentPreview,
        DATE: formatDateParis(reviewDate),
        TIME: formatTimeParis(reviewDate),
      };

      logger.info(`${LOG_PREFIX} Sending notification for review ${reviewId}`, {
        clientName: variables.CLIENT_NAME,
        providerName: variables.PROVIDER_NAME,
        rating: variables.RATING,
        date: variables.DATE,
        time: variables.TIME,
      });

      // 6. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "negative_review",
        variables
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully for review ${reviewId}`);
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification for review ${reviewId}`);
      }
    } catch (error) {
      // Log error but don't throw - we don't want to retry the trigger
      logger.error(`${LOG_PREFIX} Error processing review ${reviewId}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
);

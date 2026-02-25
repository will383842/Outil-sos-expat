/**
 * Callable: updateBankDetails
 *
 * Updates the user's bank details for affiliate payouts.
 * - Validates bank details format
 * - Encrypts sensitive data
 * - Stores in user document
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { UpdateBankDetailsInput, BankDetails } from "../types";
import {
  encryptBankDetails,
  validateBankDetails,
} from "../utils/bankDetailsEncryption";
import { ENCRYPTION_KEY } from "../../lib/secrets";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const updateBankDetails = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
    secrets: [ENCRYPTION_KEY],
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const input = request.data as UpdateBankDetailsInput;

    logger.info("[updateBankDetails] Processing request", {
      userId,
      accountType: input.accountType,
      country: input.country,
    });

    const db = getFirestore();

    try {
      // 2. Get user document
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data()!;

      // 3. Check if user has affiliate code
      if (!userData.affiliateCode) {
        throw new HttpsError("failed-precondition", "User is not an affiliate");
      }

      // 4. Check if user has a pending payout
      if (userData.pendingPayoutId) {
        throw new HttpsError(
          "failed-precondition",
          "Cannot update bank details while a payout is pending"
        );
      }

      // 5. Validate input
      const validation = validateBankDetails(input);
      if (!validation.valid) {
        throw new HttpsError(
          "invalid-argument",
          `Invalid bank details: ${validation.errors.join(", ")}`
        );
      }

      // 6. Prepare bank details
      const bankDetails: BankDetails = {
        accountType: input.accountType,
        accountHolderName: input.accountHolderName,
        country: input.country,
        currency: input.currency,
        iban: input.iban,
        sortCode: input.sortCode,
        accountNumber: input.accountNumber,
        routingNumber: input.routingNumber,
        bic: input.bic,
        address: input.address,
        updatedAt: Timestamp.now(),
        isVerified: false, // Will be verified by admin or Wise
        wiseRecipientId: undefined, // Will be set when creating Wise recipient
      };

      // 7. Encrypt sensitive fields
      const encryptedBankDetails = encryptBankDetails(bankDetails);

      // 8. Update user document
      await db.collection("users").doc(userId).update({
        bankDetails: encryptedBankDetails,
        updatedAt: Timestamp.now(),
      });

      logger.info("[updateBankDetails] Bank details updated", {
        userId,
        accountType: input.accountType,
      });

      return {
        success: true,
        message: "Bank details updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateBankDetails] Error", { userId, error });
      throw new HttpsError("internal", "Failed to update bank details");
    }
  }
);

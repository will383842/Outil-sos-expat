/**
 * Wise Recipient Service
 *
 * Create and manage recipient accounts in Wise.
 */

import { logger } from "firebase-functions/v2";
import { wiseRequest, getProfileIdNumber, WiseApiError } from "./client";
import { WiseRecipient, WiseRecipientRequest, WiseRecipientDetails } from "./types";
import { BankDetails, BankAccountType } from "../types";

/**
 * Map our bank account type to Wise recipient type
 */
function mapAccountTypeToWiseType(accountType: BankAccountType): "iban" | "sort_code" | "aba" {
  switch (accountType) {
    case "iban":
      return "iban";
    case "sort_code":
      return "sort_code";
    case "aba":
      return "aba";
    default:
      // For other types, try to use IBAN if available
      return "iban";
  }
}

/**
 * Build Wise recipient details from our bank details
 */
function buildRecipientDetails(
  bankDetails: BankDetails,
  decryptedValues: {
    iban?: string;
    sortCode?: string;
    accountNumber?: string;
    routingNumber?: string;
  }
): WiseRecipientDetails {
  const details: WiseRecipientDetails = {
    legalType: "PRIVATE",
  };

  // Add address if required
  if (bankDetails.address) {
    details.address = {
      country: bankDetails.address.country,
      city: bankDetails.address.city,
      postCode: bankDetails.address.postalCode,
      firstLine: bankDetails.address.street,
    };
  }

  // Add account-specific details
  switch (bankDetails.accountType) {
    case "iban":
      details.iban = decryptedValues.iban;
      break;

    case "sort_code":
      details.sortCode = decryptedValues.sortCode?.replace(/-/g, "");
      details.accountNumber = decryptedValues.accountNumber;
      break;

    case "aba":
      details.abartn = decryptedValues.routingNumber;
      details.accountNumber = decryptedValues.accountNumber;
      details.accountType = "CHECKING";
      break;

    default:
      // Try IBAN as fallback
      if (decryptedValues.iban) {
        details.iban = decryptedValues.iban;
      }
      break;
  }

  return details;
}

/**
 * Create a recipient in Wise
 */
export async function createRecipient(
  bankDetails: BankDetails,
  decryptedValues: {
    accountHolderName: string;
    iban?: string;
    sortCode?: string;
    accountNumber?: string;
    routingNumber?: string;
  }
): Promise<WiseRecipient> {
  const profileId = getProfileIdNumber();

  const recipientRequest: WiseRecipientRequest = {
    currency: bankDetails.currency,
    type: mapAccountTypeToWiseType(bankDetails.accountType),
    profile: profileId,
    accountHolderName: decryptedValues.accountHolderName,
    ownedByCustomer: true,
    details: buildRecipientDetails(bankDetails, decryptedValues),
  };

  logger.info("[WiseRecipient] Creating recipient", {
    currency: bankDetails.currency,
    type: recipientRequest.type,
    country: bankDetails.country,
  });

  const recipient = await wiseRequest<WiseRecipient>(
    "POST",
    "/v1/accounts",
    recipientRequest
  );

  logger.info("[WiseRecipient] Recipient created", {
    recipientId: recipient.id,
    currency: recipient.currency,
  });

  return recipient;
}

/**
 * Get a recipient by ID
 */
export async function getRecipient(recipientId: number): Promise<WiseRecipient> {
  logger.info("[WiseRecipient] Getting recipient", { recipientId });

  const recipient = await wiseRequest<WiseRecipient>(
    "GET",
    `/v1/accounts/${recipientId}`
  );

  return recipient;
}

/**
 * Delete a recipient
 */
export async function deleteRecipient(recipientId: number): Promise<void> {
  logger.info("[WiseRecipient] Deleting recipient", { recipientId });

  await wiseRequest<void>(
    "DELETE",
    `/v1/accounts/${recipientId}`
  );

  logger.info("[WiseRecipient] Recipient deleted", { recipientId });
}

/**
 * Get or create a recipient for a payout
 * If recipient already exists (wiseRecipientId in bank details), verify it's still valid
 */
export async function getOrCreateRecipient(
  bankDetails: BankDetails,
  decryptedValues: {
    accountHolderName: string;
    iban?: string;
    sortCode?: string;
    accountNumber?: string;
    routingNumber?: string;
  }
): Promise<WiseRecipient> {
  // Check if we already have a recipient ID
  if (bankDetails.wiseRecipientId) {
    try {
      const existingRecipient = await getRecipient(
        parseInt(bankDetails.wiseRecipientId, 10)
      );

      if (existingRecipient.isActive) {
        logger.info("[WiseRecipient] Using existing recipient", {
          recipientId: existingRecipient.id,
        });
        return existingRecipient;
      }
    } catch (error) {
      // Recipient not found or invalid, create a new one
      logger.warn("[WiseRecipient] Existing recipient invalid, creating new", {
        wiseRecipientId: bankDetails.wiseRecipientId,
        error,
      });
    }
  }

  // Create new recipient
  return createRecipient(bankDetails, decryptedValues);
}

/**
 * Validate recipient requirements for a currency
 */
export async function getRecipientRequirements(
  sourceCurrency: string,
  targetCurrency: string,
  sourceAmount: number
): Promise<unknown> {
  const profileId = getProfileIdNumber();

  const requirements = await wiseRequest<unknown>(
    "GET",
    `/v1/account-requirements?source=${sourceCurrency}&target=${targetCurrency}&sourceAmount=${sourceAmount}`
  );

  return requirements;
}

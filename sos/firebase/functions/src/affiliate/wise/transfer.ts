/**
 * Wise Transfer Service
 *
 * Create and manage money transfers.
 */

import { logger } from "firebase-functions/v2";
import { wiseRequest, getProfileIdNumber } from "./client";
import {
  WiseTransfer,
  WiseTransferRequest,
  WiseTransferStatus,
  WiseFundTransferRequest,
  WiseFundTransferResponse,
} from "./types";

/**
 * Create a transfer
 *
 * @param recipientId - Wise recipient ID
 * @param quoteId - Wise quote UUID
 * @param payoutId - Our payout ID (for reference/idempotency)
 * @param reference - Optional reference message for the recipient
 */
export async function createTransfer(
  recipientId: number,
  quoteId: string,
  payoutId: string,
  reference?: string
): Promise<WiseTransfer> {
  const transferRequest: WiseTransferRequest = {
    targetAccount: recipientId,
    quoteUuid: quoteId,
    customerTransactionId: payoutId, // Ensures idempotency
    details: {
      reference: reference || `SOS-Expat Payout ${payoutId}`,
      transferPurpose: "verification_code",
      sourceOfFunds: "verification_code",
    },
  };

  logger.info("[WiseTransfer] Creating transfer", {
    recipientId,
    quoteId,
    payoutId,
  });

  const transfer = await wiseRequest<WiseTransfer>(
    "POST",
    "/v1/transfers",
    transferRequest
  );

  logger.info("[WiseTransfer] Transfer created", {
    transferId: transfer.id,
    status: transfer.status,
    sourceValue: transfer.sourceValue,
    targetValue: transfer.targetValue,
  });

  return transfer;
}

/**
 * Fund a transfer from Wise balance
 */
export async function fundTransfer(
  transferId: number
): Promise<WiseFundTransferResponse> {
  const profileId = getProfileIdNumber();

  const fundRequest: WiseFundTransferRequest = {
    type: "BALANCE",
  };

  logger.info("[WiseTransfer] Funding transfer from balance", {
    transferId,
    profileId,
  });

  const response = await wiseRequest<WiseFundTransferResponse>(
    "POST",
    `/v3/profiles/${profileId}/transfers/${transferId}/payments`,
    fundRequest
  );

  logger.info("[WiseTransfer] Transfer funded", {
    transferId,
    status: response.status,
    balanceTransactionId: response.balanceTransactionId,
  });

  return response;
}

/**
 * Get a transfer by ID
 */
export async function getTransfer(transferId: number): Promise<WiseTransfer> {
  logger.info("[WiseTransfer] Getting transfer", { transferId });

  const transfer = await wiseRequest<WiseTransfer>(
    "GET",
    `/v1/transfers/${transferId}`
  );

  return transfer;
}

/**
 * Cancel a transfer
 */
export async function cancelTransfer(transferId: number): Promise<WiseTransfer> {
  logger.info("[WiseTransfer] Cancelling transfer", { transferId });

  const transfer = await wiseRequest<WiseTransfer>(
    "PUT",
    `/v1/transfers/${transferId}/cancel`
  );

  logger.info("[WiseTransfer] Transfer cancelled", {
    transferId,
    status: transfer.status,
  });

  return transfer;
}

/**
 * Check if a transfer status is terminal (final)
 */
export function isTransferTerminal(status: WiseTransferStatus): boolean {
  const terminalStatuses: WiseTransferStatus[] = [
    "outgoing_payment_sent",
    "cancelled",
    "funds_refunded",
    "bounced_back",
  ];

  return terminalStatuses.includes(status);
}

/**
 * Check if a transfer was successful
 */
export function isTransferSuccessful(status: WiseTransferStatus): boolean {
  return status === "outgoing_payment_sent";
}

/**
 * Check if a transfer failed
 */
export function isTransferFailed(status: WiseTransferStatus): boolean {
  const failedStatuses: WiseTransferStatus[] = [
    "cancelled",
    "funds_refunded",
    "bounced_back",
  ];

  return failedStatuses.includes(status);
}

/**
 * Map Wise transfer status to a human-readable message
 */
export function getTransferStatusMessage(status: WiseTransferStatus): string {
  const messages: Record<WiseTransferStatus, string> = {
    incoming_payment_waiting: "En attente de fonds",
    incoming_payment_initiated: "Paiement initié",
    processing: "En cours de traitement",
    funds_converted: "Fonds convertis",
    outgoing_payment_sent: "Paiement envoyé",
    cancelled: "Annulé",
    funds_refunded: "Fonds remboursés",
    bounced_back: "Paiement rejeté",
  };

  return messages[status] || status;
}

/**
 * Execute a complete payout via Wise
 *
 * This is a high-level function that:
 * 1. Creates a transfer
 * 2. Funds it from the Wise balance
 * 3. Returns the transfer details
 */
export async function executeWisePayout(
  recipientId: number,
  quoteId: string,
  payoutId: string,
  reference?: string
): Promise<{
  transfer: WiseTransfer;
  fundingStatus: WiseFundTransferResponse;
}> {
  // 1. Create the transfer
  const transfer = await createTransfer(recipientId, quoteId, payoutId, reference);

  // 2. Fund the transfer from Wise balance
  const fundingStatus = await fundTransfer(transfer.id);

  // Check if funding was successful
  if (fundingStatus.errorCode) {
    logger.error("[WiseTransfer] Funding failed", {
      transferId: transfer.id,
      errorCode: fundingStatus.errorCode,
      errorMessage: fundingStatus.errorMessage,
    });

    throw new Error(
      `Wise funding failed: ${fundingStatus.errorMessage || fundingStatus.errorCode}`
    );
  }

  logger.info("[WiseTransfer] Payout executed successfully", {
    transferId: transfer.id,
    fundingStatus: fundingStatus.status,
  });

  return { transfer, fundingStatus };
}

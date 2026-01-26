/**
 * Wise Quote Service
 *
 * Get exchange rate quotes for transfers.
 */

import { logger } from "firebase-functions/v2";
import { wiseRequest, getProfileIdNumber } from "./client";
import { WiseQuote, WiseQuoteRequest } from "./types";

/**
 * Create a quote for a transfer
 *
 * @param sourceCurrency - Source currency (e.g., "EUR")
 * @param targetCurrency - Target currency (e.g., "GBP")
 * @param sourceAmount - Amount in source currency (in cents, will be converted)
 */
export async function createQuote(
  sourceCurrency: string,
  targetCurrency: string,
  sourceAmountCents: number
): Promise<WiseQuote> {
  const profileId = getProfileIdNumber();

  // Convert cents to decimal
  const sourceAmount = sourceAmountCents / 100;

  const quoteRequest: WiseQuoteRequest = {
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    profile: profileId,
    payOut: "BANK_TRANSFER",
  };

  logger.info("[WiseQuote] Creating quote", {
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    profileId,
  });

  const quote = await wiseRequest<WiseQuote>(
    "POST",
    "/v3/quotes",
    quoteRequest
  );

  logger.info("[WiseQuote] Quote created", {
    quoteId: quote.id,
    rate: quote.rate,
    fee: quote.fee,
    sourceAmount: quote.sourceAmount,
    targetAmount: quote.targetAmount,
    deliveryEstimate: quote.deliveryEstimate,
  });

  return quote;
}

/**
 * Get an existing quote by ID
 */
export async function getQuote(quoteId: string): Promise<WiseQuote> {
  logger.info("[WiseQuote] Getting quote", { quoteId });

  const quote = await wiseRequest<WiseQuote>(
    "GET",
    `/v3/quotes/${quoteId}`
  );

  return quote;
}

/**
 * Check if a quote is still valid (not expired)
 */
export function isQuoteValid(quote: WiseQuote): boolean {
  const expirationTime = new Date(quote.expirationTime);
  const now = new Date();

  return expirationTime > now;
}

/**
 * Get the best payment option from a quote
 */
export function getBestPaymentOption(quote: WiseQuote): {
  fee: number;
  targetAmount: number;
  estimatedDelivery: string;
} | null {
  if (!quote.paymentOptions || quote.paymentOptions.length === 0) {
    return null;
  }

  // Find the BALANCE payIn option (pay from Wise balance)
  const balanceOption = quote.paymentOptions.find(
    (option) => option.payIn === "BALANCE"
  );

  if (balanceOption) {
    return {
      fee: balanceOption.fee.total,
      targetAmount: balanceOption.targetAmount,
      estimatedDelivery: balanceOption.estimatedDelivery,
    };
  }

  // Fall back to first option
  const firstOption = quote.paymentOptions[0];
  return {
    fee: firstOption.fee.total,
    targetAmount: firstOption.targetAmount,
    estimatedDelivery: firstOption.estimatedDelivery,
  };
}

/**
 * Calculate the fees and amounts for a payout
 */
export async function calculatePayoutDetails(
  amountCents: number,
  targetCurrency: string
): Promise<{
  quote: WiseQuote;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  estimatedDelivery: string;
}> {
  const quote = await createQuote("EUR", targetCurrency, amountCents);
  const paymentOption = getBestPaymentOption(quote);

  return {
    quote,
    sourceAmount: quote.sourceAmount,
    targetAmount: paymentOption?.targetAmount || quote.targetAmount,
    rate: quote.rate,
    fee: paymentOption?.fee || quote.fee,
    estimatedDelivery: paymentOption?.estimatedDelivery || quote.deliveryEstimate,
  };
}

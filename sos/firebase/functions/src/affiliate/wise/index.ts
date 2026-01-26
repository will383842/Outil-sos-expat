/**
 * Wise Integration Module
 *
 * Complete Wise (TransferWise) integration for affiliate payouts.
 */

// Client
export {
  getWiseConfig,
  isWiseConfigured,
  wiseRequest,
  WiseApiError,
  getProfileIdNumber,
} from "./client";

// Recipient management
export {
  createRecipient,
  getRecipient,
  deleteRecipient,
  getOrCreateRecipient,
  getRecipientRequirements,
} from "./recipient";

// Quote management
export {
  createQuote,
  getQuote,
  isQuoteValid,
  getBestPaymentOption,
  calculatePayoutDetails,
} from "./quote";

// Transfer management
export {
  createTransfer,
  fundTransfer,
  getTransfer,
  cancelTransfer,
  isTransferTerminal,
  isTransferSuccessful,
  isTransferFailed,
  getTransferStatusMessage,
  executeWisePayout,
} from "./transfer";

// Types
export type {
  WiseRecipient,
  WiseRecipientRequest,
  WiseRecipientDetails,
  WiseQuote,
  WiseQuoteRequest,
  WisePaymentOption,
  WiseTransfer,
  WiseTransferRequest,
  WiseTransferStatus,
  WiseFundTransferRequest,
  WiseFundTransferResponse,
  WiseWebhookEvent,
  WiseWebhookEventType,
  WiseError,
  WiseBalance,
} from "./types";

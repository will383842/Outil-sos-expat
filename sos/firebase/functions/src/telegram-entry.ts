/**
 * Entry point for Telegram functions codebase
 * This file is used as a separate codebase to avoid timeout issues
 * when deploying the main functions codebase.
 */

// Triggers Firestore
export { telegramOnUserRegistration } from './telegram/triggers/onUserRegistration';
export { telegramOnCallCompleted } from './telegram/triggers/onCallCompleted';
export { telegramOnPaymentReceived } from './telegram/triggers/onPaymentReceived';
export { telegramOnPayPalPaymentReceived } from './telegram/triggers/onPayPalPaymentReceived';
export { telegramOnNewProvider } from './telegram/triggers/onNewProvider';
export { telegramOnNewContactMessage } from './telegram/triggers/onNewContactMessage';
export { telegramOnSecurityAlert } from './telegram/triggers/onSecurityAlert';
export { telegramOnNegativeReview } from './telegram/triggers/onNegativeReview';
export { telegramOnWithdrawalRequest } from './telegram/triggers/onWithdrawalRequest';
export { telegramOnNewCaptainApplication } from './telegram/triggers/onNewCaptainApplication';

// Scheduled
export { telegramDailyReport } from './telegram/scheduled/dailyReport';

// [MIGRATION LARAVEL] Telegram admin callables removed — admin console now calls Laravel API directly

// Queue processors
export { processTelegramQueue } from './telegram/queue/processor';
export { monitorTelegramUsage } from './telegram/queue/monitor';
export { processTelegramCampaigns } from './telegram/queue/campaignProcessor';

// Withdrawal confirmations
export { getWithdrawalConfirmationStatus } from './telegram/withdrawalConfirmation';
export { cleanupExpiredWithdrawalConfirmations } from './telegram/cleanupExpiredConfirmations';

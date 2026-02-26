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

// Scheduled
export { telegramDailyReport } from './telegram/scheduled/dailyReport';

// Callables (admin config)
export { telegram_sendTestNotification } from './telegram/callables/sendTestNotification';
export {
  telegram_updateConfig,
  telegram_getConfig,
  telegram_getChatId,
  telegram_validateBot,
  telegram_updateTemplate,
  telegram_getTemplates,
} from './telegram/callables/updateTelegramConfig';

// Callables (admin queries)
export {
  telegram_getNotificationLogs,
  telegram_getQueueStats,
  telegram_getSubscriberStats,
} from './telegram/callables/adminQueries';

// Callables (admin actions)
export {
  telegram_reprocessDeadLetters,
  telegram_sendOneOff,
} from './telegram/callables/adminActions';

// Callables (campaigns)
export {
  telegram_createCampaign,
  telegram_getCampaigns,
  telegram_cancelCampaign,
  telegram_getCampaignDetail,
} from './telegram/callables/campaigns';

// Queue processors
export { processTelegramQueue } from './telegram/queue/processor';
export { monitorTelegramUsage } from './telegram/queue/monitor';
export { processTelegramCampaigns } from './telegram/queue/campaignProcessor';

// Withdrawal confirmations
export { getWithdrawalConfirmationStatus } from './telegram/withdrawalConfirmation';
export { cleanupExpiredWithdrawalConfirmations } from './telegram/cleanupExpiredConfirmations';

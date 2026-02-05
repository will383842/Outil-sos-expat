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

// Callables (admin)
export { telegram_sendTestNotification } from './telegram/callables/sendTestNotification';
export {
  telegram_updateConfig,
  telegram_getConfig,
  telegram_getChatId,
  telegram_validateBot,
  telegram_updateTemplate,
  telegram_getTemplates,
} from './telegram/callables/updateTelegramConfig';

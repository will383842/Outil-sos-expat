// Triggers
export { telegramOnUserRegistration } from "./triggers/onUserRegistration";
export { telegramOnCallCompleted } from "./triggers/onCallCompleted";
export { telegramOnPaymentReceived } from "./triggers/onPaymentReceived";
export { telegramOnNewProvider } from "./triggers/onNewProvider";
export { telegramOnNewContactMessage } from "./triggers/onNewContactMessage";
export { telegramOnSecurityAlert } from "./triggers/onSecurityAlert";
export { telegramOnNegativeReview } from "./triggers/onNegativeReview";
export { telegramOnWithdrawalRequest } from "./triggers/onWithdrawalRequest";

// Scheduled
export { telegramDailyReport } from "./scheduled/dailyReport";

// Callables (admin)
export { telegram_sendTestNotification } from "./callables/sendTestNotification";
export {
  telegram_updateConfig,
  telegram_getConfig,
  telegram_getChatId,
  telegram_validateBot,
  telegram_updateTemplate,
  telegram_getTemplates,
} from "./callables/updateTelegramConfig";

// Service (for internal use)
export { telegramNotificationService, TelegramNotificationService } from "./TelegramNotificationService";

// Types (re-export for convenience)
export * from "./types";

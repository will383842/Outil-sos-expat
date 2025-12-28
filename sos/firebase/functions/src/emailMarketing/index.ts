/**
 * Email Marketing Automation Module
 * 
 * Main entry point for email marketing functions
 * This module handles all MailWizz integration and email automation
 */

// Export all functions
export * from './functions/userLifecycle';
export * from './functions/transactions';
export * from './functions/profileLifecycle';
export * from './functions/stopAutoresponders';
export * from './functions/inactiveUsers';

// Export utilities for internal use
export * from './utils/mailwizz';
export * from './utils/analytics';
export * from './utils/fieldMapper';
// Note: config exports getLanguageCode, so don't export * to avoid conflicts
// MAILWIZZ_API_KEY and MAILWIZZ_WEBHOOK_SECRET are now static values - not exported to avoid Firebase detecting them as secrets
export { 
  // MAILWIZZ_API_KEY and MAILWIZZ_WEBHOOK_SECRET - removed exports to avoid Firebase detecting them as secrets
  // Use getMailWizzApiKey() and getMailWizzWebhookSecret() functions instead
  MAILWIZZ_API_URL,
  MAILWIZZ_LIST_UID,
  MAILWIZZ_CUSTOMER_ID,
  validateMailWizzConfig,
  getMailWizzApiKey,
  getMailWizzWebhookSecret,
  getLanguageCode,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage
} from './config';




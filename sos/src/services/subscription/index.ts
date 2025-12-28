/**
 * Subscription Services Index
 * Export all subscription-related services
 */

export {
  // Plans
  getSubscriptionPlans,
  getSubscriptionPlan,
  subscribeToPlans,

  // Trial
  getTrialConfig,
  subscribeToTrialConfig,
  startTrial,

  // Subscription
  getSubscription,
  subscribeToSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  openCustomerPortal,

  // Usage & Quota
  getAiUsage,
  subscribeToAiUsage,
  checkAiQuota,
  recordAiCall,

  // Invoices
  getInvoices,
  subscribeToInvoices,

  // Combined
  getFullSubscriptionData,

  // Default export
  default as subscriptionService
} from './subscriptionService';

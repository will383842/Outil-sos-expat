#!/bin/bash
# Deploy failed functions in batches of 30 with 1 minute pause between each batch
cd "$(dirname "$0")"

FUNCTIONS=(
  # BATCH failures - europe-west1 (quota 429 + CPU quota)
  createUserDocument
  cleanupCloudRunRevisions
  deleteFilingDraft
  initializeAdminClaims
  getOpenAIUsage
  getPerplexityUsage
  invalidateCacheEndpoint
  getFirebaseUsage
  getChatterTrainingModules
  onFeedbackCreated
  hideProvider
  onLandingPageCreated
  onProfileCreated
  getProviderStatsMonths
  deleteLocalBackupRecord
  onFaqUpdated
  diagnoseProfiles
  generateOutilToken
  onBlogPostCreated
  getChatterTrainingCertificate
  generateInvoiceDownloadUrl
  getFeedbackStats
  getAllProviderActionLogs
  getProviderStats
  ensureUserDocument
  getAnthropicUsage
  getProviderActionLogs
  sendFilingReminders
  getMyPosts
  getConnectionLogs
  listLocalBackups
  setProviderBadge
  logConnection
  getProviderStatsSummary
  sitemapHelp
  getTwilioBalance
  getTaxThresholdStatus
  onProfileUpdated
  getHistoricalAnalytics
  paymentAdminApprove
  paymentAdminGetLogActions
  paymentAdminReject
  suspendProvider
  telegram_createCampaign
  sendCustomPasswordResetEmail
  submitFeedback
  submitPost
  telegram_cancelCampaign
  resendPayPalVerificationCode
  telegram_getChatId
  sendPayPalVerificationCode
  telegram_getConfig
  setAdminClaims
  telegram_getNotificationLogs
  sitemapFaq
  sitemapLanding
  sitemapProfiles
  telegram_getQueueStats
  telegram_getSubscriberStats
  softDeleteProvider
  telegram_sendTestNotification
  bootstrapFirstAdmin
  adminBulkUpdateStatus
  telegram_updateConfig
  telegram_updateTemplate
  telegram_validateBot
  admin_process_exceptional_claim
  triggerFilingReminders
  checkUserRole
  telegram_getCampaignDetail
  validateCouponCallable
  unhideProvider
  unsuspendProvider
  unblockProvider
  updateChatterTrainingProgress
  telegram_getCampaigns
  verifyPayPalCode
  notifyAfterPayment
  updateFeedbackStatus
  updateFilingAmounts
  updateFilingStatus
  validateVat
  paymentAdminUpdateConfig
  paymentAdminGetConfig
  registerLocalBackup
  repairOrphanedUser
  scheduledSitemapPing
  wiseWebhook
  cancelSubscription
  getPaymentMetrics
  adminGetDLQStats
  checkAndIncrementAiUsage
  adminSyncStripePrices
  adminForceRetryDLQEvent
  onBlogPostUpdated
  onFaqCreated
  adminCleanupOrphanedProviders
  adminBulkRefund
  getConnectionStats
  chatter_previewDripMessage
  exportFilingAllFormats
  adminResetFAQs
  exportProviderStatsCsv
  admin_trigger_unclaimed_funds_processing
  telegram_sendOneOff
  syncAllCustomClaims
  chatter_sendDripMessage
  adminCleanupOrphanedSessions
  adminGetAuditLogs
  getGcpBillingCosts
  admin_templates_seed
  paymentAdminGetLogs
  getUnifiedAnalytics
  bulkHideProviders
  adminGetPaymentStats
  processTelegramCampaigns
  generateProviderFeed
  adminRefundPayment
  restoreUserRoles
  paymentAdminGetPending
  notifyExpiringPromotions
  paymentAdminGetStats
  exportFilingToFormat
  # New failures - batch 3
  generateOgImage
  adminGetPendingWithdrawals
  providerCatalogFeed
  generateTaxFiling
  bulkSuspendProviders
  paymentAdminProcess
  chatter_getDripStats
  bulkDeleteProviders
  bulkBlockProviders
  aggregateDailyAnalytics
  getAgentMetrics
  auditProfileSlugs
  adminExportWithdrawals
  generateAllTaxFilings
  paymentAdminExport
  hardDeleteProvider
  renderForBotsV2
  # europe-west3 failures
  onPaymentRecordUpdated
  cleanupOldBackups
  collectDailyPaymentMetrics
  getWithdrawalHistory
  getAccountingStats
  monitorTelegramUsage
  onPaymentCompleted
)

TOTAL=${#FUNCTIONS[@]}
BATCH_SIZE=30
BATCH_NUM=0

echo "=========================================="
echo "  DEPLOIEMENT PAR BATCHES DE $BATCH_SIZE"
echo "  Total fonctions: $TOTAL"
echo "  Batches prevus: $(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
  BATCH_NUM=$((BATCH_NUM + 1))
  BATCH_END=$((i + BATCH_SIZE))
  if [ $BATCH_END -gt $TOTAL ]; then
    BATCH_END=$TOTAL
  fi

  # Build the --only string
  ONLY=""
  for ((j=i; j<BATCH_END; j++)); do
    if [ -z "$ONLY" ]; then
      ONLY="functions:${FUNCTIONS[$j]}"
    else
      ONLY="$ONLY,functions:${FUNCTIONS[$j]}"
    fi
  done

  echo ""
  echo "=== BATCH $BATCH_NUM — fonctions $((i+1)) a $BATCH_END / $TOTAL ==="
  echo "$(date '+%H:%M:%S') Deploiement..."

  firebase deploy --only "$ONLY"

  RESULT=$?
  if [ $RESULT -eq 0 ]; then
    echo "✅ Batch $BATCH_NUM OK"
  else
    echo "⚠️  Batch $BATCH_NUM termine avec erreurs (code $RESULT)"
  fi

  # Pause 1 minute between batches (skip after last)
  if [ $BATCH_END -lt $TOTAL ]; then
    echo "⏳ Pause 1 minute avant batch suivant..."
    sleep 60
  fi
done

echo ""
echo "=========================================="
echo "  DEPLOIEMENT TERMINE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

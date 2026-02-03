#!/bin/bash
# Batch deployment script to avoid Google Cloud CPU quota errors
# Each batch has ~10 functions, with a 30-second pause between batches

cd "$(dirname "$0")/.."

export FUNCTIONS_DISCOVERY_TIMEOUT=60000

# Function to deploy a batch
deploy_batch() {
    local batch_name=$1
    shift
    local functions=$@

    echo ""
    echo "=========================================="
    echo "Deploying batch: $batch_name"
    echo "Functions: $functions"
    echo "=========================================="

    npx firebase deploy --only $functions

    if [ $? -ne 0 ]; then
        echo "⚠️ Batch $batch_name had errors, continuing..."
    else
        echo "✅ Batch $batch_name completed successfully"
    fi

    echo "Waiting 30 seconds before next batch..."
    sleep 30
}

echo "Starting batched deployment..."
echo "Total batches: 30+"

# Batch 1: Admin functions (part 1)
deploy_batch "admin-1" \
    functions:adminAdvanceCycle,functions:adminApprovePayout,functions:adminBulkChatterAction,functions:adminBulkRefund,functions:adminBulkUpdateStatus,functions:adminCleanupOrphanedProviders,functions:adminCleanupOrphanedSessions,functions:adminCreateBloggerGuideBestPractice,functions:adminCreateBloggerGuideCopyText,functions:adminCreateBloggerGuideTemplate

# Batch 2: Admin functions (part 2)
deploy_batch "admin-2" \
    functions:adminCreateBloggerResource,functions:adminCreateBloggerResourceText,functions:adminCreateChatterTrainingModule,functions:adminCreateGroupAdminPost,functions:adminCreateGroupAdminResource,functions:adminCreateInfluencerTrainingModule,functions:adminCreatePromotion,functions:adminDeleteBloggerResource,functions:adminDeleteChatterTrainingModule,functions:adminDeleteInfluencerTrainingModule

# Batch 3: Admin functions (part 3)
deploy_batch "admin-3" \
    functions:adminDeletePromotion,functions:adminDuplicatePromotion,functions:adminExportChatters,functions:adminExportCommissionsCSV,functions:adminExportGroupAdmins,functions:adminGetBloggerConfig,functions:adminGetBloggerDetail,functions:adminGetBloggersList,functions:adminGetChatterConfig,functions:adminGetChatterDetail

# Batch 4: Admin functions (part 4)
deploy_batch "admin-4" \
    functions:adminGetChatterLeaderboard,functions:adminGetChatterTrainingModules,functions:adminGetChattersList,functions:adminGetCommissionStats,functions:adminGetCommissionsDetailed,functions:adminGetEarlyAdopters,functions:adminGetGroupAdminDetail,functions:adminGetGroupAdminPostsList,functions:adminGetGroupAdminWithdrawalsList,functions:adminGetGroupAdminsList

# Batch 5: Admin functions (part 5)
deploy_batch "admin-5" \
    functions:adminGetGroups,functions:adminGetInfluencerConfig,functions:adminGetInfluencerDetail,functions:adminGetInfluencerLeaderboard,functions:adminGetInfluencerTrainingModules,functions:adminGetInfluencersList,functions:adminGetOrphanedProvidersStats,functions:adminGetOrphanedSessionsStats,functions:adminGetPendingChatterWithdrawals,functions:adminGetPendingInfluencerWithdrawals

# Batch 6: Admin functions (part 6)
deploy_batch "admin-6" \
    functions:adminGetPendingPayouts,functions:adminGetPendingPosts,functions:adminGetPromotionStats,functions:adminGetPromotions,functions:adminGetReferralCommissions,functions:adminGetReferralFraudAlerts,functions:adminGetReferralStats,functions:adminGetReferralTree,functions:adminGetRestoreConfirmationCode,functions:adminProcessBloggerWithdrawal

# Batch 7: Admin functions (part 7)
deploy_batch "admin-7" \
    functions:adminProcessChatterWithdrawal,functions:adminProcessGroupAdminWithdrawal,functions:adminProcessInfluencerWithdrawal,functions:adminProcessPayoutManual,functions:adminProcessPayoutWise,functions:adminRefundPayment,functions:adminRejectPayout,functions:adminReorderChatterTrainingModules,functions:adminResetFAQs,functions:adminReviewFraudAlert

# Batch 8: Admin functions (part 8)
deploy_batch "admin-8" \
    functions:adminSoftDeleteUser,functions:adminUpdateAffiliateConfig,functions:adminUpdateBloggerConfig,functions:adminUpdateBloggerGuideBestPractice,functions:adminUpdateBloggerGuideCopyText,functions:adminUpdateBloggerGuideTemplate,functions:adminUpdateBloggerResource,functions:adminUpdateBloggerStatus,functions:adminUpdateChatterConfig,functions:adminUpdateChatterStatus

# Batch 9: Admin functions (part 9)
deploy_batch "admin-9" \
    functions:adminUpdateChatterTrainingModule,functions:adminUpdateCycleThreshold,functions:adminUpdateEarlyAdopterQuota,functions:adminUpdateGroupAdminConfig,functions:adminUpdateGroupAdminPost,functions:adminUpdateGroupAdminResource,functions:adminUpdateGroupAdminStatus,functions:adminUpdateGroupStatus,functions:adminUpdateInfluencerConfig,functions:adminUpdateInfluencerStatus

# Batch 10: Admin functions (part 10)
deploy_batch "admin-10" \
    functions:adminUpdateInfluencerTrainingModule,functions:adminUpdateMeetingStatus,functions:adminUpdatePromotion,functions:adminUpdateStatus,functions:adminVerifyGroup,functions:admin_forfeited_funds_list,functions:admin_process_exceptional_claim,functions:admin_routing_get,functions:admin_routing_upsert,functions:admin_templates_get

# Batch 11: Admin templates and misc
deploy_batch "admin-11" \
    functions:admin_templates_list,functions:admin_templates_seed,functions:admin_templates_upsert,functions:admin_testSend,functions:admin_trigger_unclaimed_funds_processing,functions:admin_unclaimed_funds_list,functions:admin_unclaimed_funds_stats,functions:acknowledgeServiceBalanceAlert,functions:acknowledgeThresholdAlert,functions:addManualDomainAuthority

# Batch 12: Affiliate and analytics
deploy_batch "affiliate" \
    functions:affiliateOnCallCompleted,functions:affiliateOnSubscriptionCreated,functions:affiliateOnSubscriptionRenewed,functions:affiliateOnUserCreated,functions:affiliateReleaseHeldCommissions,functions:aggregateDailyAnalytics,functions:api,functions:approveProfile,functions:assignValidation,functions:auditProfileSlugs

# Batch 13: Backup functions
deploy_batch "backup" \
    functions:backupFirebaseAuth,functions:backupStorageToDR,functions:blockProvider,functions:bloggerDeactivateExpiredRecruitments,functions:bloggerFinalizeMonthlyRankings,functions:bloggerReleaseValidatedCommissions,functions:bloggerRequestWithdrawal,functions:bloggerUpdateMonthlyRankings,functions:bloggerValidatePendingCommissions,functions:bootstrapFirstAdmin

# Batch 14: Bulk and calculate functions
deploy_batch "bulk-calc" \
    functions:bulkBlockProviders,functions:bulkDeleteProviders,functions:bulkHideProviders,functions:bulkSuspendProviders,functions:calculateTax,functions:calculateTaxCallable,functions:chatterMonthlyRecurringCommissions,functions:chatterOnCallCompleted,functions:chatterOnChatterCreated,functions:chatterOnChatterEarningsUpdated

# Batch 15: Chatter functions
deploy_batch "chatter" \
    functions:chatterOnClientRegistered,functions:chatterOnProviderRegistered,functions:chatterOnQuizPassed,functions:chatterReleaseValidatedCommissions,functions:chatterRequestWithdrawal,functions:chatterValidatePendingCommissions,functions:chatterValidatePendingReferralCommissions,functions:checkBudgetAlertsScheduled,functions:checkHelpCategories,functions:checkProviderInactivity

# Batch 16: Check and cleanup functions
deploy_batch "check-cleanup" \
    functions:checkReverseCharge,functions:checkServiceBalances,functions:checkSingleServiceBudget,functions:cleanupDRBackups,functions:cleanupFunctionalData,functions:cleanupOldAlerts,functions:cleanupOldAnalytics,functions:cleanupOldAuthBackups,functions:cleanupOldBackups,functions:cleanupOldPaymentAlerts

# Batch 17: More cleanup functions
deploy_batch "cleanup-2" \
    functions:cleanupOrphanedAgentTasks,functions:cleanupOrphanedProfiles,functions:cleanupOrphanedSessions,functions:cleanupTempStorageFiles,functions:cleanupUncapturedPayPalOrders,functions:cleanupVatCache,functions:cleanupWebhookDLQ,functions:collectDailyPaymentMetrics,functions:copyBloggerGuideText,functions:copyBloggerResourceText

# Batch 18: Create functions
deploy_batch "create" \
    functions:createManualBackup,functions:createPaymentIntent,functions:createUserDocument,functions:dailyCrossRegionBackup,functions:deleteFeedback,functions:deleteLocalBackupRecord,functions:detectInactiveUsers,functions:diagnoseProfiles,functions:downloadBloggerResource,functions:executeCallTask

# Batch 19: Execute and generate functions
deploy_batch "execute-gen" \
    functions:forceEndCallTask,functions:generateInvoiceDownloadUrl,functions:generateOgImage,functions:generateOutilToken,functions:generateProviderFeed,functions:generateSitemaps,functions:getAffiliateGlobalStats,functions:getAgentMetrics,functions:getAllProviderActionLogs,functions:getAnthropicUsage

# Batch 20: Get functions (part 1)
deploy_batch "get-1" \
    functions:getAvailableGroups,functions:getBloggerDashboard,functions:getBloggerGuide,functions:getBloggerLeaderboard,functions:getBloggerResources,functions:getChatterDashboard,functions:getChatterLeaderboard,functions:getChatterTrainingCertificate,functions:getChatterTrainingModuleContent,functions:getChatterTrainingModules

# Batch 21: Get functions (part 2)
deploy_batch "get-2" \
    functions:getConnectionLogs,functions:getConnectionStats,functions:getCountryThreshold,functions:getDomainAuthority,functions:getFeedbackStats,functions:getFirebaseUsage,functions:getGcpBillingCosts,functions:getGroupAdminDashboard,functions:getGroupAdminLeaderboard,functions:getGroupAdminPostContent

# Batch 22: Get functions (part 3)
deploy_batch "get-3" \
    functions:getGroupAdminPosts,functions:getGroupAdminProcessedPost,functions:getGroupAdminProcessedResourceContent,functions:getGroupAdminResourceContent,functions:getGroupAdminResources,functions:getHistoricalAnalytics,functions:getInfluencerDashboard,functions:getInfluencerLeaderboard,functions:getInfluencerTrainingCertificate,functions:getInfluencerTrainingModuleContent

# Batch 23: Get functions (part 4)
deploy_batch "get-4" \
    functions:getInfluencerTrainingModules,functions:getMyAffiliateData,functions:getMyGroups,functions:getMyPosts,functions:getOpenAIUsage,functions:getPayPalReminderStatus,functions:getPerplexityUsage,functions:getProviderActionLogs,functions:getQuizQuestions,functions:getReferralDashboard

# Batch 24: Get and handle functions
deploy_batch "get-handle" \
    functions:getServiceBalanceAlerts,functions:getServiceBalanceThresholds,functions:getTaxThresholdStatus,functions:getThresholdDashboard,functions:getTwilioBalance,functions:getUnifiedAnalytics,functions:getValidationHistory,functions:getValidationQueue,functions:handleEmailComplaint,functions:handleEmailOpen

# Batch 25: Hard delete and hide functions
deploy_batch "hard-hide" \
    functions:hardDeleteProvider,functions:hideProvider,functions:influencerOnCallCompleted,functions:influencerOnInfluencerCreated,functions:influencerOnProviderCallCompleted,functions:influencerOnProviderRegistered,functions:influencerReleaseValidatedCommissions,functions:influencerRequestWithdrawal,functions:influencerValidatePendingCommissions,functions:initHelpArticlesBatch

# Batch 26: Init and invalidate functions
deploy_batch "init-invalidate" \
    functions:initSingleHelpArticle,functions:initializeAdminClaims,functions:invalidateCacheEndpoint,functions:joinGroupAsChatter,functions:listLocalBackups,functions:logConnection,functions:morningBackup,functions:notifyAfterPayment,functions:onBlogPostCreated,functions:onBlogPostUpdated

# Batch 27: On event functions (part 1)
deploy_batch "on-event-1" \
    functions:onBookingRequestCreatedGenerateAi,functions:onBookingRequestCreatedTrackGoogleAdsLead,functions:onBookingRequestCreatedTrackLead,functions:onCallCompletedGroupAdmin,functions:onCallSessionPaymentAuthorized,functions:onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout,functions:onContactSubmittedTrackLead,functions:onFaqCreated,functions:onFaqUpdated,functions:onFeedbackCreated

# Batch 28: On event functions (part 2)
deploy_batch "on-event-2" \
    functions:onGroupAdminCreated,functions:onHelpArticleCreated,functions:onHelpArticleUpdated,functions:onLandingPageCreated,functions:onProfileCreated,functions:onProviderChange,functions:onProviderCreated,functions:onSosProfileUpdated,functions:onUserAccessUpdated,functions:onUserCreatedTrackGoogleAdsSignUp

# Batch 29: On event functions (part 3)
deploy_batch "on-event-3" \
    functions:onUserCreatedTrackRegistration,functions:onUserDeleted,functions:onUserEmailUpdated,functions:onValidationCreated,functions:onValidationDecision,functions:paymentAdminExport,functions:paymentCancelWithdrawal,functions:paymentDataCleanup,functions:paymentDeleteMethod,functions:paymentGetHistory

# Batch 30: Payment functions
deploy_batch "payment" \
    functions:paymentGetMethods,functions:paymentGetStatus,functions:paymentOnWithdrawalCreated,functions:paymentOnWithdrawalStatusChanged,functions:paymentProcessAutomaticPayments,functions:paymentRequestWithdrawal,functions:paymentSetDefault,functions:paymentWebhookFlutterwave,functions:paymentWebhookWise,functions:processDunningQueue

# Batch 31: Process functions
deploy_batch "process" \
    functions:processScheduledTransfers,functions:processWebhookDLQ,functions:providerCatalogFeed,functions:quarterlyRestoreTest,functions:registerBlogger,functions:registerChatter,functions:registerGroupAdmin,functions:registerInfluencer,functions:registerLocalBackup,functions:rejectProfile

# Batch 32: Release and request functions
deploy_batch "release-request" \
    functions:releaseValidatedGroupAdminCommissions,functions:requestChanges,functions:requestGroupAdminWithdrawal,functions:requestWithdrawal,functions:resendPayPalVerificationCode,functions:resetAffiliateConfigToDefaults,functions:resetChatterConfigToDefaults,functions:resetMonthlyQuotas,functions:restoreUserRoles,functions:resubmitForValidation

# Batch 33: Retry and run functions
deploy_batch "retry-run" \
    functions:retryFailedPayout,functions:retryOutilSync,functions:runCriticalFunctionalCheck,functions:runFunctionalHealthCheck,functions:runMonthlyDRTest,functions:runPaymentHealthCheck,functions:scheduledCleanup,functions:scheduledKYCReminders,functions:scheduledPayPalReminders,functions:scheduledProcessUnclaimedFunds

# Batch 34: Scheduled and send functions
deploy_batch "scheduled-send" \
    functions:scheduledSitemapGeneration,functions:scheduledSitemapPing,functions:sendContactReply,functions:sendPayPalVerificationCode,functions:sendPayoutSuccessEmail,functions:sendWeeklyThresholdReport,functions:setAdminClaims,functions:setProviderAvailableTask,functions:sitemapFaq,functions:sitemapHelp

# Batch 35: Sitemap and soft functions
deploy_batch "sitemap-soft" \
    functions:sitemapLanding,functions:sitemapProfiles,functions:softDeleteProvider,functions:stripeWebhook,functions:stuckPaymentsRecovery,functions:submitChatterTrainingQuiz,functions:submitFeedback,functions:submitForValidation,functions:submitGroup,functions:submitInfluencerTrainingQuiz

# Batch 36: Submit and suspend functions
deploy_batch "submit-suspend" \
    functions:submitPost,functions:submitQuiz,functions:suspendProvider,functions:syncAllCustomClaims,functions:thresholdOnPaymentCreate,functions:thresholdOnPaymentUpdate,functions:trackBloggerGuideUsage,functions:trackCAPIEvent,functions:trackGroupAdminPostUsage,functions:trackGroupAdminResourceUsage

# Batch 37: Trigger functions
deploy_batch "trigger" \
    functions:triggerBudgetAlertCheck,functions:triggerKYCReminders,functions:triggerPayPalReminders,functions:triggerServiceBalanceCheck,functions:triggerThresholdRecalculation,functions:unblockProvider,functions:unhideProvider,functions:unsuspendProvider,functions:updateBankDetails,functions:updateBloggerProfile

# Batch 38: Update functions
deploy_batch "update" \
    functions:updateChatterProfile,functions:updateChatterTrainingProgress,functions:updateFeedbackStatus,functions:updateGroupAdminProfile,functions:updateInfluencerProfile,functions:updateInfluencerTrainingProgress,functions:updateServiceBalanceThreshold,functions:validatePendingGroupAdminCommissions,functions:validateVAT,functions:validateVat

# Batch 39: Verify and webhook functions
deploy_batch "verify-webhook" \
    functions:verifyPayPalCode,functions:wiseWebhook,functions:onUserSignIn

echo ""
echo "=========================================="
echo "Batched deployment completed!"
echo "=========================================="

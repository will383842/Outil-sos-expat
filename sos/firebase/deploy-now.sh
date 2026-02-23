#!/bin/bash
cd /c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase
LOG=/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase/deploy-now.log
> $LOG
echo '[LOT 1] acknowledgeServiceBalanceAlert acknowledgeThresholdAlert acquireInvoiceLock addBankAccount addManualDomainAuthority' | tee -a $LOG
firebase deploy --only "functions:acknowledgeServiceBalanceAlert,functions:acknowledgeThresholdAlert,functions:acquireInvoiceLock,functions:addBankAccount,functions:addManualDomainAuthority" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 2] adminAdvanceCycle adminAlertsDigestDaily adminApprovePayout adminApproveWithdrawal adminBulkBloggerAction' | tee -a $LOG
firebase deploy --only "functions:adminAdvanceCycle,functions:adminAlertsDigestDaily,functions:adminApprovePayout,functions:adminApproveWithdrawal,functions:adminBulkBloggerAction" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 3] adminBulkChatterAction adminBulkGroupAdminAction adminBulkInfluencerAction adminBulkRefund adminBulkUpdateStatus' | tee -a $LOG
firebase deploy --only "functions:adminBulkChatterAction,functions:adminBulkGroupAdminAction,functions:adminBulkInfluencerAction,functions:adminBulkRefund,functions:adminBulkUpdateStatus" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 4] adminCleanupOrphanedProviders adminCleanupOrphanedSessions adminCreateBloggerArticle adminCreateBloggerGuideBestPractice adminCreateBloggerGuideCopyText' | tee -a $LOG
firebase deploy --only "functions:adminCleanupOrphanedProviders,functions:adminCleanupOrphanedSessions,functions:adminCreateBloggerArticle,functions:adminCreateBloggerGuideBestPractice,functions:adminCreateBloggerGuideCopyText" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 5] adminCreateBloggerGuideTemplate adminCreateBloggerResource adminCreateBloggerResourceText adminCreateGroupAdminPromotion adminCreateInfluencerPromotion' | tee -a $LOG
firebase deploy --only "functions:adminCreateBloggerGuideTemplate,functions:adminCreateBloggerResource,functions:adminCreateBloggerResourceText,functions:adminCreateGroupAdminPromotion,functions:adminCreateInfluencerPromotion" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 6] adminCreateInfluencerResource adminCreateInfluencerResourceText adminCreateInfluencerTrainingModule adminCreateMessageTemplate adminCreatePost' | tee -a $LOG
firebase deploy --only "functions:adminCreateInfluencerResource,functions:adminCreateInfluencerResourceText,functions:adminCreateInfluencerTrainingModule,functions:adminCreateMessageTemplate,functions:adminCreatePost" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 7] adminCreatePromotion adminCreateResource adminCreateTrainingModule adminCreateZoomMeeting adminDeleteBloggerArticle' | tee -a $LOG
firebase deploy --only "functions:adminCreatePromotion,functions:adminCreateResource,functions:adminCreateTrainingModule,functions:adminCreateZoomMeeting,functions:adminDeleteBloggerArticle" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 8] adminDeleteBloggerGuideBestPractice adminDeleteBloggerGuideCopyText adminDeleteBloggerGuideTemplate adminDeleteBloggerResource adminDeleteBloggerResourceFile' | tee -a $LOG
firebase deploy --only "functions:adminDeleteBloggerGuideBestPractice,functions:adminDeleteBloggerGuideCopyText,functions:adminDeleteBloggerGuideTemplate,functions:adminDeleteBloggerResource,functions:adminDeleteBloggerResourceFile" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 9] adminDeleteBloggerResourceText adminDeleteGroupAdminPromotion adminDeleteInfluencerPromotion adminDeleteInfluencerResource adminDeleteInfluencerResourceText' | tee -a $LOG
firebase deploy --only "functions:adminDeleteBloggerResourceText,functions:adminDeleteGroupAdminPromotion,functions:adminDeleteInfluencerPromotion,functions:adminDeleteInfluencerResource,functions:adminDeleteInfluencerResourceText" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 10] adminDeleteInfluencerTrainingModule adminDeleteMessageTemplate adminDeletePost adminDeletePromotion adminDeleteResource' | tee -a $LOG
firebase deploy --only "functions:adminDeleteInfluencerTrainingModule,functions:adminDeleteMessageTemplate,functions:adminDeletePost,functions:adminDeletePromotion,functions:adminDeleteResource" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 11] adminDeleteTrainingModule adminDuplicateGroupAdminPromotion adminDuplicateInfluencerPromotion adminDuplicatePromotion adminExportBloggers' | tee -a $LOG
firebase deploy --only "functions:adminDeleteTrainingModule,functions:adminDuplicateGroupAdminPromotion,functions:adminDuplicateInfluencerPromotion,functions:adminDuplicatePromotion,functions:adminExportBloggers" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 12] adminExportChatters adminExportCommissionsCSV adminExportGroupAdmins adminExportInfluencers adminExportWithdrawals' | tee -a $LOG
firebase deploy --only "functions:adminExportChatters,functions:adminExportCommissionsCSV,functions:adminExportGroupAdmins,functions:adminExportInfluencers,functions:adminExportWithdrawals" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 13] adminGetAuditLogActions adminGetAuditLogs adminGetBloggerArticles adminGetBloggerConfig adminGetBloggerConfigHistory' | tee -a $LOG
firebase deploy --only "functions:adminGetAuditLogActions,functions:adminGetAuditLogs,functions:adminGetBloggerArticles,functions:adminGetBloggerConfig,functions:adminGetBloggerConfigHistory" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 14] adminGetBloggerDetail adminGetBloggerGuide adminGetBloggerLeaderboard adminGetBloggerResources adminGetBloggersList' | tee -a $LOG
firebase deploy --only "functions:adminGetBloggerDetail,functions:adminGetBloggerGuide,functions:adminGetBloggerLeaderboard,functions:adminGetBloggerResources,functions:adminGetBloggersList" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 15] adminGetChatterConfig adminGetChatterConfigHistory adminGetChatterConfigSettings adminGetChatterDetail adminGetChatterLeaderboard' | tee -a $LOG
firebase deploy --only "functions:adminGetChatterConfig,functions:adminGetChatterConfigHistory,functions:adminGetChatterConfigSettings,functions:adminGetChatterDetail,functions:adminGetChatterLeaderboard" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 16] adminGetChattersList adminGetCommissionStats adminGetCommissionsDetailed adminGetCountryRotationStatus adminGetGroupAdminConfig' | tee -a $LOG
firebase deploy --only "functions:adminGetChattersList,functions:adminGetCommissionStats,functions:adminGetCommissionsDetailed,functions:adminGetCountryRotationStatus,functions:adminGetGroupAdminConfig" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 17] adminGetGroupAdminConfigHistory adminGetGroupAdminDetail adminGetGroupAdminPromotionStats adminGetGroupAdminPromotions adminGetGroupAdminRecruits' | tee -a $LOG
firebase deploy --only "functions:adminGetGroupAdminConfigHistory,functions:adminGetGroupAdminDetail,functions:adminGetGroupAdminPromotionStats,functions:adminGetGroupAdminPromotions,functions:adminGetGroupAdminRecruits" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 18] adminGetGroupAdminsList adminGetGroups adminGetInfluencerConfig adminGetInfluencerDetail adminGetInfluencerLeaderboard' | tee -a $LOG
firebase deploy --only "functions:adminGetGroupAdminsList,functions:adminGetGroups,functions:adminGetInfluencerConfig,functions:adminGetInfluencerDetail,functions:adminGetInfluencerLeaderboard" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 19] adminGetInfluencerPromotionStats adminGetInfluencerPromotions adminGetInfluencerResources adminGetInfluencerTrainingModules adminGetInfluencersList' | tee -a $LOG
firebase deploy --only "functions:adminGetInfluencerPromotionStats,functions:adminGetInfluencerPromotions,functions:adminGetInfluencerResources,functions:adminGetInfluencerTrainingModules,functions:adminGetInfluencersList" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 20] adminGetMeetingAttendees adminGetOrphanedProvidersStats adminGetOrphanedSessionsStats adminGetPaymentConfig adminGetPaymentStats' | tee -a $LOG
firebase deploy --only "functions:adminGetMeetingAttendees,functions:adminGetOrphanedProvidersStats,functions:adminGetOrphanedSessionsStats,functions:adminGetPaymentConfig,functions:adminGetPaymentStats" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 21] adminGetPendingInfluencerWithdrawals adminGetPendingPayouts adminGetPendingPosts adminGetPendingWithdrawals adminGetPostsList' | tee -a $LOG
firebase deploy --only "functions:adminGetPendingInfluencerWithdrawals,functions:adminGetPendingPayouts,functions:adminGetPendingPosts,functions:adminGetPendingWithdrawals,functions:adminGetPostsList" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 22] adminGetPromotionStats adminGetPromotions adminGetProviderEarnings adminGetRateHistory adminGetRecruitmentsList' | tee -a $LOG
firebase deploy --only "functions:adminGetPromotionStats,functions:adminGetPromotions,functions:adminGetProviderEarnings,functions:adminGetRateHistory,functions:adminGetRecruitmentsList" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 23] adminGetReferralCommissions adminGetReferralFraudAlerts adminGetReferralStats adminGetReferralTree adminGetResourcesList' | tee -a $LOG
firebase deploy --only "functions:adminGetReferralCommissions,functions:adminGetReferralFraudAlerts,functions:adminGetReferralStats,functions:adminGetReferralTree,functions:adminGetResourcesList" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 24] adminGetRestoreConfirmationCode adminGetTrainingModules adminGetWithdrawalsList adminGetZoomMeetings adminInitializeChatterConfigSettings' | tee -a $LOG
firebase deploy --only "functions:adminGetRestoreConfirmationCode,functions:adminGetTrainingModules,functions:adminGetWithdrawalsList,functions:adminGetZoomMeetings,functions:adminInitializeChatterConfigSettings" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 25] adminInitializeCountryRotation adminModeratePost adminProcessBloggerWithdrawal adminProcessInfluencerWithdrawal adminProcessPayoutManual' | tee -a $LOG
firebase deploy --only "functions:adminInitializeCountryRotation,functions:adminModeratePost,functions:adminProcessBloggerWithdrawal,functions:adminProcessInfluencerWithdrawal,functions:adminProcessPayoutManual" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 26] adminProcessPayoutWise adminProcessWithdrawal adminRefundPayment adminRejectPayout adminRejectWithdrawal' | tee -a $LOG
firebase deploy --only "functions:adminProcessPayoutWise,functions:adminProcessWithdrawal,functions:adminRefundPayment,functions:adminRejectPayout,functions:adminRejectWithdrawal" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 27] adminReorderTrainingModules adminResetFAQs adminResetMessageTemplatesToDefaults adminReviewFraudAlert adminSaveBloggerGuideBestPractice' | tee -a $LOG
firebase deploy --only "functions:adminReorderTrainingModules,functions:adminResetFAQs,functions:adminResetMessageTemplatesToDefaults,functions:adminReviewFraudAlert,functions:adminSaveBloggerGuideBestPractice" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 28] adminSaveBloggerGuideCopyText adminSaveBloggerGuideTemplate adminSaveBloggerResourceFile adminSaveBloggerResourceText adminSeedInfluencerTrainingModules' | tee -a $LOG
firebase deploy --only "functions:adminSaveBloggerGuideCopyText,functions:adminSaveBloggerGuideTemplate,functions:adminSaveBloggerResourceFile,functions:adminSaveBloggerResourceText,functions:adminSeedInfluencerTrainingModules" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 29] adminSeedMessageTemplates adminSeedTrainingModules adminSoftDeleteUser adminToggleBloggerVisibility adminToggleChatterVisibility' | tee -a $LOG
firebase deploy --only "functions:adminSeedMessageTemplates,functions:adminSeedTrainingModules,functions:adminSoftDeleteUser,functions:adminToggleBloggerVisibility,functions:adminToggleChatterVisibility" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 30] adminToggleFlashBonus adminToggleGroupAdminVisibility adminToggleInfluencerVisibility adminUpdateAffiliateConfig adminUpdateAntiFraudConfig' | tee -a $LOG
firebase deploy --only "functions:adminToggleFlashBonus,functions:adminToggleGroupAdminVisibility,functions:adminToggleInfluencerVisibility,functions:adminUpdateAffiliateConfig,functions:adminUpdateAntiFraudConfig" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 31] adminUpdateBloggerArticle adminUpdateBloggerConfig adminUpdateBloggerGuideBestPractice adminUpdateBloggerGuideCopyText adminUpdateBloggerGuideTemplate' | tee -a $LOG
firebase deploy --only "functions:adminUpdateBloggerArticle,functions:adminUpdateBloggerConfig,functions:adminUpdateBloggerGuideBestPractice,functions:adminUpdateBloggerGuideCopyText,functions:adminUpdateBloggerGuideTemplate" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 32] adminUpdateBloggerResource adminUpdateBloggerStatus adminUpdateChatterConfig adminUpdateChatterConfigSettings adminUpdateChatterStatus' | tee -a $LOG
firebase deploy --only "functions:adminUpdateBloggerResource,functions:adminUpdateBloggerStatus,functions:adminUpdateChatterConfig,functions:adminUpdateChatterConfigSettings,functions:adminUpdateChatterStatus" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 33] adminUpdateCommissionRules adminUpdateCycleThreshold adminUpdateGroupAdminConfig adminUpdateGroupAdminPromotion adminUpdateGroupAdminStatus' | tee -a $LOG
firebase deploy --only "functions:adminUpdateCommissionRules,functions:adminUpdateCycleThreshold,functions:adminUpdateGroupAdminConfig,functions:adminUpdateGroupAdminPromotion,functions:adminUpdateGroupAdminStatus" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 34] adminUpdateGroupStatus adminUpdateInfluencerConfig adminUpdateInfluencerPromotion adminUpdateInfluencerResource adminUpdateInfluencerResourceText' | tee -a $LOG
firebase deploy --only "functions:adminUpdateGroupStatus,functions:adminUpdateInfluencerConfig,functions:adminUpdateInfluencerPromotion,functions:adminUpdateInfluencerResource,functions:adminUpdateInfluencerResourceText" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 35] adminUpdateInfluencerStatus adminUpdateInfluencerTrainingModule adminUpdateMeetingStatus adminUpdateMessageTemplate adminUpdatePaymentConfig' | tee -a $LOG
firebase deploy --only "functions:adminUpdateInfluencerStatus,functions:adminUpdateInfluencerTrainingModule,functions:adminUpdateMeetingStatus,functions:adminUpdateMessageTemplate,functions:adminUpdatePaymentConfig" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 36] adminUpdatePost adminUpdatePromotion adminUpdateResource adminUpdateStatus adminUpdateTrainingModule' | tee -a $LOG
firebase deploy --only "functions:adminUpdatePost,functions:adminUpdatePromotion,functions:adminUpdateResource,functions:adminUpdateStatus,functions:adminUpdateTrainingModule" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 37] adminUpdateZoomMeeting adminVerifyGroup admin_forfeited_funds_list admin_process_exceptional_claim admin_routing_get' | tee -a $LOG
firebase deploy --only "functions:adminUpdateZoomMeeting,functions:adminVerifyGroup,functions:admin_forfeited_funds_list,functions:admin_process_exceptional_claim,functions:admin_routing_get" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 38] admin_routing_upsert admin_templates_get admin_templates_list admin_templates_seed admin_templates_upsert' | tee -a $LOG
firebase deploy --only "functions:admin_routing_upsert,functions:admin_templates_get,functions:admin_templates_list,functions:admin_templates_seed,functions:admin_templates_upsert" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 39] admin_testSend admin_trigger_unclaimed_funds_processing admin_unclaimed_funds_list admin_unclaimed_funds_stats affiliateOnCallCompleted' | tee -a $LOG
firebase deploy --only "functions:admin_testSend,functions:admin_trigger_unclaimed_funds_processing,functions:admin_unclaimed_funds_list,functions:admin_unclaimed_funds_stats,functions:affiliateOnCallCompleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 40] affiliateOnSubscriptionCreated affiliateOnSubscriptionRenewed affiliateOnUserCreated affiliateReleaseHeldCommissions aggregateCostMetrics' | tee -a $LOG
firebase deploy --only "functions:affiliateOnSubscriptionCreated,functions:affiliateOnSubscriptionRenewed,functions:affiliateOnUserCreated,functions:affiliateReleaseHeldCommissions,functions:aggregateCostMetrics" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 41] aggregateDailyAnalytics aggregateProviderStats api approveProfile assignCountriesToCurrentChatter' | tee -a $LOG
firebase deploy --only "functions:aggregateDailyAnalytics,functions:aggregateProviderStats,functions:api,functions:approveProfile,functions:assignCountriesToCurrentChatter" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 42] assignValidation auditProfileSlugs authorizePayPalOrderHttp backfillProviderStats backupFirebaseAuth' | tee -a $LOG
firebase deploy --only "functions:assignValidation,functions:auditProfileSlugs,functions:authorizePayPalOrderHttp,functions:backfillProviderStats,functions:backupFirebaseAuth" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 43] backupStorageToDR blockProvider bloggerDeactivateExpiredRecruitments bloggerFinalizeMonthlyRankings bloggerOnCallSessionCompleted' | tee -a $LOG
firebase deploy --only "functions:backupStorageToDR,functions:blockProvider,functions:bloggerDeactivateExpiredRecruitments,functions:bloggerFinalizeMonthlyRankings,functions:bloggerOnCallSessionCompleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 44] bloggerReleaseValidatedCommissions bloggerRequestWithdrawal bloggerUpdateMonthlyRankings bloggerValidatePendingCommissions bootstrapFirstAdmin' | tee -a $LOG
firebase deploy --only "functions:bloggerReleaseValidatedCommissions,functions:bloggerRequestWithdrawal,functions:bloggerUpdateMonthlyRankings,functions:bloggerValidatePendingCommissions,functions:bootstrapFirstAdmin" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 45] bulkBlockProviders bulkDeleteProviders bulkHideProviders bulkSuspendProviders bulkUnblockProviders' | tee -a $LOG
firebase deploy --only "functions:bulkBlockProviders,functions:bulkDeleteProviders,functions:bulkHideProviders,functions:bulkSuspendProviders,functions:bulkUnblockProviders" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 46] bulkUnhideProviders bulkUnsuspendProviders busySafetyTimeoutTask calculateTax cancelWithdrawal' | tee -a $LOG
firebase deploy --only "functions:bulkUnhideProviders,functions:bulkUnsuspendProviders,functions:busySafetyTimeoutTask,functions:calculateTax,functions:cancelWithdrawal" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 47] capturePayPalOrder capturePayPalOrderHttp capturePayPalPaymentManually chatterAggregateActivityFeed chatterCreateWeeklyChallenge' | tee -a $LOG
firebase deploy --only "functions:capturePayPalOrder,functions:capturePayPalOrderHttp,functions:capturePayPalPaymentManually,functions:chatterAggregateActivityFeed,functions:chatterCreateWeeklyChallenge" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 48] chatterEndWeeklyChallenge chatterMonthlyRecurringCommissions chatterMonthlyTop3Rewards chatterNotifyCommissionEarned chatterNotifyFlashBonusStart' | tee -a $LOG
firebase deploy --only "functions:chatterEndWeeklyChallenge,functions:chatterMonthlyRecurringCommissions,functions:chatterMonthlyTop3Rewards,functions:chatterNotifyCommissionEarned,functions:chatterNotifyFlashBonusStart" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 49] chatterNotifyInactiveMembers chatterNotifyNearTop3 chatterNotifyTeamMemberActivated chatterNotifyTierBonusUnlocked chatterOnCallCompleted' | tee -a $LOG
firebase deploy --only "functions:chatterNotifyInactiveMembers,functions:chatterNotifyNearTop3,functions:chatterNotifyTeamMemberActivated,functions:chatterNotifyTierBonusUnlocked,functions:chatterOnCallCompleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 50] chatterOnChatterCreated chatterOnChatterEarningsUpdated chatterOnClientRegistered chatterOnCommissionCreated chatterOnProviderRegistered' | tee -a $LOG
firebase deploy --only "functions:chatterOnChatterCreated,functions:chatterOnChatterEarningsUpdated,functions:chatterOnClientRegistered,functions:chatterOnCommissionCreated,functions:chatterOnProviderRegistered" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 51] chatterOnQuizPassed chatterRegisterFcmToken chatterReleaseValidatedCommissions chatterTierBonusCheck chatterUnregisterFcmToken' | tee -a $LOG
firebase deploy --only "functions:chatterOnQuizPassed,functions:chatterRegisterFcmToken,functions:chatterReleaseValidatedCommissions,functions:chatterTierBonusCheck,functions:chatterUnregisterFcmToken" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 52] chatterUpdateChallengeLeaderboard chatterValidatePendingCommissions chatterValidatePendingReferralCommissions chatter_getDripStats chatter_previewDripMessage' | tee -a $LOG
firebase deploy --only "functions:chatterUpdateChallengeLeaderboard,functions:chatterValidatePendingCommissions,functions:chatterValidatePendingReferralCommissions,functions:chatter_getDripStats,functions:chatter_previewDripMessage" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 53] chatter_sendDripMessage checkBlockedEntity checkBudgetAlertsScheduled checkHelpCategories checkInvoicesExist' | tee -a $LOG
firebase deploy --only "functions:chatter_sendDripMessage,functions:checkBlockedEntity,functions:checkBudgetAlertsScheduled,functions:checkHelpCategories,functions:checkInvoicesExist" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 54] checkKycStatus checkPastDueSubscriptions checkPayPalMerchantStatus checkPayPalPayoutStatus checkProviderInactivity' | tee -a $LOG
firebase deploy --only "functions:checkKycStatus,functions:checkPastDueSubscriptions,functions:checkPayPalMerchantStatus,functions:checkPayPalPayoutStatus,functions:checkProviderInactivity" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 55] checkReverseCharge checkServiceBalances checkSingleServiceBudget checkStripeAccountStatus checkTelegramLinkStatus' | tee -a $LOG
firebase deploy --only "functions:checkReverseCharge,functions:checkServiceBalances,functions:checkSingleServiceBudget,functions:checkStripeAccountStatus,functions:checkTelegramLinkStatus" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 56] checkThresholdsDaily checkUserRole cleanupCloudRunRevisions cleanupDRBackups cleanupExpiredDocuments' | tee -a $LOG
firebase deploy --only "functions:checkThresholdsDaily,functions:checkUserRole,functions:cleanupCloudRunRevisions,functions:cleanupDRBackups,functions:cleanupExpiredDocuments" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 57] cleanupExpiredTrials cleanupExpiredWithdrawalConfirmations cleanupFunctionalData cleanupOldAlerts cleanupOldAnalytics' | tee -a $LOG
firebase deploy --only "functions:cleanupExpiredTrials,functions:cleanupExpiredWithdrawalConfirmations,functions:cleanupFunctionalData,functions:cleanupOldAlerts,functions:cleanupOldAnalytics" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 58] cleanupOldAuthBackups cleanupOldBackups cleanupOldPaymentAlerts cleanupOrphanedAgentTasks cleanupOrphanedProfiles' | tee -a $LOG
firebase deploy --only "functions:cleanupOldAuthBackups,functions:cleanupOldBackups,functions:cleanupOldPaymentAlerts,functions:cleanupOrphanedAgentTasks,functions:cleanupOrphanedProfiles" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 59] cleanupOrphanedSessions cleanupTempStorageFiles cleanupUncapturedPayPalOrders cleanupVatCache cleanupWebhookDLQ' | tee -a $LOG
firebase deploy --only "functions:cleanupOrphanedSessions,functions:cleanupTempStorageFiles,functions:cleanupUncapturedPayPalOrders,functions:cleanupVatCache,functions:cleanupWebhookDLQ" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 60] clearHelpArticles collectDailyPaymentMetrics completeLawyerOnboarding consolidatedOnCallCompleted consolidatedOnUserCreated' | tee -a $LOG
firebase deploy --only "functions:clearHelpArticles,functions:collectDailyPaymentMetrics,functions:completeLawyerOnboarding,functions:consolidatedOnCallCompleted,functions:consolidatedOnUserCreated" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 61] consolidatedOnUserUpdated consolidatedReleaseCommissions consolidatedValidateCommissions copyBloggerArticle copyBloggerGuideText' | tee -a $LOG
firebase deploy --only "functions:consolidatedOnUserUpdated,functions:consolidatedReleaseCommissions,functions:consolidatedValidateCommissions,functions:copyBloggerArticle,functions:copyBloggerGuideText" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 62] copyBloggerResourceText copyInfluencerResourceText createAndScheduleCallHTTPS createContactMessage createCustomAccount' | tee -a $LOG
firebase deploy --only "functions:copyBloggerResourceText,functions:copyInfluencerResourceText,functions:createAndScheduleCallHTTPS,functions:createContactMessage,functions:createCustomAccount" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 63] createExpressAccount createLawyerStripeAccount createPayPalOnboardingLink createPayPalOrder createPayPalOrderHttp' | tee -a $LOG
firebase deploy --only "functions:createExpressAccount,functions:createLawyerStripeAccount,functions:createPayPalOnboardingLink,functions:createPayPalOrder,functions:createPayPalOrderHttp" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 64] createPayPalPayout createPaymentIntent createSecurityAlertHttp createStripeAccount createSubscriptionCheckout' | tee -a $LOG
firebase deploy --only "functions:createPayPalPayout,functions:createPaymentIntent,functions:createSecurityAlertHttp,functions:createStripeAccount,functions:createSubscriptionCheckout" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 65] createUserDocument dailyCrossRegionBackup deleteFeedback deleteFilingDraft deleteLocalBackupRecord' | tee -a $LOG
firebase deploy --only "functions:createUserDocument,functions:dailyCrossRegionBackup,functions:deleteFeedback,functions:deleteFilingDraft,functions:deleteLocalBackupRecord" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 66] deletePaymentMethod detectInactiveUsers diagnoseProfiles downloadBloggerResource downloadInfluencerResource' | tee -a $LOG
firebase deploy --only "functions:deletePaymentMethod,functions:detectInactiveUsers,functions:diagnoseProfiles,functions:downloadBloggerResource,functions:downloadInfluencerResource" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 67] enqueueMessageEvent ensureUserDocument escrowMonitoringDaily executeCallTask executePayoutRetryTask' | tee -a $LOG
firebase deploy --only "functions:enqueueMessageEvent,functions:ensureUserDocument,functions:escrowMonitoringDaily,functions:executeCallTask,functions:executePayoutRetryTask" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 68] executeStripeTransferRetry exportFilingAllFormats exportFilingToFormat exportProviderStatsCsv forceEndCallTask' | tee -a $LOG
firebase deploy --only "functions:executeStripeTransferRetry,functions:exportFilingAllFormats,functions:exportFilingToFormat,functions:exportProviderStatsCsv,functions:forceEndCallTask" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 69] forceRetryPendingTransfer generateAllTaxFilings generateInvoiceDownloadUrl generateOgImage generateOssVatDeclaration' | tee -a $LOG
firebase deploy --only "functions:forceRetryPendingTransfer,functions:generateAllTaxFilings,functions:generateInvoiceDownloadUrl,functions:generateOgImage,functions:generateOssVatDeclaration" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 70] generateOutilToken generateSitemaps generateSystemDebugReport generateTaxFiling generateTelegramLink' | tee -a $LOG
firebase deploy --only "functions:generateOutilToken,functions:generateSitemaps,functions:generateSystemDebugReport,functions:generateTaxFiling,functions:generateTelegramLink" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 71] getAccountBalances getAccountingStats getAdminAlertsDigestPreview getAffiliateGlobalStats getAgentMetrics' | tee -a $LOG
firebase deploy --only "functions:getAccountBalances,functions:getAccountingStats,functions:getAdminAlertsDigestPreview,functions:getAffiliateGlobalStats,functions:getAgentMetrics" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 72] getAllProviderActionLogs getAnthropicUsage getAvailableCountriesForChatter getAvailableGroups getBillingPortalUrl' | tee -a $LOG
firebase deploy --only "functions:getAllProviderActionLogs,functions:getAnthropicUsage,functions:getAvailableCountriesForChatter,functions:getAvailableGroups,functions:getBillingPortalUrl" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 73] getBloggerArticles getBloggerDashboard getBloggerDirectory getBloggerGuide getBloggerLeaderboard' | tee -a $LOG
firebase deploy --only "functions:getBloggerArticles,functions:getBloggerDashboard,functions:getBloggerDirectory,functions:getBloggerGuide,functions:getBloggerLeaderboard" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 74] getBloggerRecruits getBloggerResources getChallengeHistory getChatterDashboard getChatterDirectory' | tee -a $LOG
firebase deploy --only "functions:getBloggerRecruits,functions:getBloggerResources,functions:getChallengeHistory,functions:getChatterDashboard,functions:getChatterDirectory" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 75] getChatterLeaderboard getChatterMessageTemplates getChatterTrainingCertificate getChatterTrainingModuleContent getChatterTrainingModules' | tee -a $LOG
firebase deploy --only "functions:getChatterLeaderboard,functions:getChatterMessageTemplates,functions:getChatterTrainingCertificate,functions:getChatterTrainingModuleContent,functions:getChatterTrainingModules" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 76] getCloudTasksQueueStats getConnectionLogs getConnectionStats getCountryThreshold getCurrentChallenge' | tee -a $LOG
firebase deploy --only "functions:getCloudTasksQueueStats,functions:getConnectionLogs,functions:getConnectionStats,functions:getCountryThreshold,functions:getCurrentChallenge" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 77] getDLQStats getDetailedPendingTransfersStats getDomainAuthority getFeedbackStats getFirebaseUsage' | tee -a $LOG
firebase deploy --only "functions:getDLQStats,functions:getDetailedPendingTransfersStats,functions:getDomainAuthority,functions:getFeedbackStats,functions:getFirebaseUsage" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 78] getGcpBillingCosts getGroupAdminCommissions getGroupAdminDashboard getGroupAdminDirectory getGroupAdminLeaderboard' | tee -a $LOG
firebase deploy --only "functions:getGcpBillingCosts,functions:getGroupAdminCommissions,functions:getGroupAdminDashboard,functions:getGroupAdminDirectory,functions:getGroupAdminLeaderboard" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 79] getGroupAdminNotifications getGroupAdminPostContent getGroupAdminPosts getGroupAdminProcessedPost getGroupAdminProcessedResourceContent' | tee -a $LOG
firebase deploy --only "functions:getGroupAdminNotifications,functions:getGroupAdminPostContent,functions:getGroupAdminPosts,functions:getGroupAdminProcessedPost,functions:getGroupAdminProcessedResourceContent" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 80] getGroupAdminRecruits getGroupAdminResourceContent getGroupAdminResources getHistoricalAnalytics getInfluencerDashboard' | tee -a $LOG
firebase deploy --only "functions:getGroupAdminRecruits,functions:getGroupAdminResourceContent,functions:getGroupAdminResources,functions:getHistoricalAnalytics,functions:getInfluencerDashboard" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 81] getInfluencerDirectory getInfluencerLeaderboard getInfluencerResources getInfluencerTrainingCertificate getInfluencerTrainingModuleContent' | tee -a $LOG
firebase deploy --only "functions:getInfluencerDirectory,functions:getInfluencerLeaderboard,functions:getInfluencerResources,functions:getInfluencerTrainingCertificate,functions:getInfluencerTrainingModuleContent" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 82] getInfluencerTrainingModules getKYCReminderStatus getMyAffiliateData getMyGroups getMyPosts' | tee -a $LOG
firebase deploy --only "functions:getInfluencerTrainingModules,functions:getKYCReminderStatus,functions:getMyAffiliateData,functions:getMyGroups,functions:getMyPosts" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 83] getMyZoomAttendances getOnboardingLink getOpenAIUsage getPayPalReminderStatus getPaymentMethods' | tee -a $LOG
firebase deploy --only "functions:getMyZoomAttendances,functions:getOnboardingLink,functions:getOpenAIUsage,functions:getPayPalReminderStatus,functions:getPaymentMethods" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 84] getPerplexityUsage getProviderActionLogs getProviderDashboard getProviderEarningsSummary getProviderMonthlyStats' | tee -a $LOG
firebase deploy --only "functions:getPerplexityUsage,functions:getProviderActionLogs,functions:getProviderDashboard,functions:getProviderEarningsSummary,functions:getProviderMonthlyStats" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 85] getProviderPayoutHistory getProviderStats getProviderStatsMonths getProviderStatsSummary getProviderTransactions' | tee -a $LOG
firebase deploy --only "functions:getProviderPayoutHistory,functions:getProviderStats,functions:getProviderStatsMonths,functions:getProviderStatsSummary,functions:getProviderTransactions" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 86] getQuizQuestions getRecommendedPaymentGateway getReferralDashboard getSecurityStats getServiceBalanceAlerts' | tee -a $LOG
firebase deploy --only "functions:getQuizQuestions,functions:getRecommendedPaymentGateway,functions:getReferralDashboard,functions:getSecurityStats,functions:getServiceBalanceAlerts" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 87] getServiceBalanceThresholds getStripeAccountSession getStripeBalance getSystemHealthStatus getTaxThresholdStatus' | tee -a $LOG
firebase deploy --only "functions:getServiceBalanceThresholds,functions:getStripeAccountSession,functions:getStripeBalance,functions:getSystemHealthStatus,functions:getTaxThresholdStatus" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 88] getThresholdDashboard getTwilioBalance getUltraDebugLogs getUnifiedAnalytics getValidationHistory' | tee -a $LOG
firebase deploy --only "functions:getThresholdDashboard,functions:getTwilioBalance,functions:getUltraDebugLogs,functions:getUnifiedAnalytics,functions:getValidationHistory" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 89] getValidationQueue getWithdrawalConfirmationStatus getWithdrawalHistory getWithdrawalStatus getZoomMeetings' | tee -a $LOG
firebase deploy --only "functions:getValidationQueue,functions:getWithdrawalConfirmationStatus,functions:getWithdrawalHistory,functions:getWithdrawalStatus,functions:getZoomMeetings" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 90] handleAccountStatus handleBadgeUnlocked handleCallCompleted handleCallMissed handleEarningCredited' | tee -a $LOG
firebase deploy --only "functions:handleAccountStatus,functions:handleBadgeUnlocked,functions:handleCallCompleted,functions:handleCallMissed,functions:handleEarningCredited" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 91] handleEmailBounce handleEmailClick handleEmailComplaint handleEmailOpen handleFirstEarning' | tee -a $LOG
firebase deploy --only "functions:handleEmailBounce,functions:handleEmailClick,functions:handleEmailComplaint,functions:handleEmailOpen,functions:handleFirstEarning" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 92] handleKYCVerification handleMilestoneReached handlePayPalConfiguration handlePaymentFailed handlePaymentReceived' | tee -a $LOG
firebase deploy --only "functions:handleKYCVerification,functions:handleMilestoneReached,functions:handlePayPalConfiguration,functions:handlePaymentFailed,functions:handlePaymentReceived" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 93] handlePayoutFailed handlePayoutRequested handlePayoutSent handlePayoutThresholdReached handleProfileCompleted' | tee -a $LOG
firebase deploy --only "functions:handlePayoutFailed,functions:handlePayoutRequested,functions:handlePayoutSent,functions:handlePayoutThresholdReached,functions:handleProfileCompleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 94] handleProviderOnlineStatus handleReferralBonus handleReviewSubmitted handleUnsubscribe handleUserLogin' | tee -a $LOG
firebase deploy --only "functions:handleProviderOnlineStatus,functions:handleReferralBonus,functions:handleReviewSubmitted,functions:handleUnsubscribe,functions:handleUserLogin" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 95] handleUserRegistration hardDeleteProvider hideProvider influencerMonthlyTop3Rewards influencerOnCallCompleted' | tee -a $LOG
firebase deploy --only "functions:handleUserRegistration,functions:hardDeleteProvider,functions:hideProvider,functions:influencerMonthlyTop3Rewards,functions:influencerOnCallCompleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 96] influencerOnInfluencerCreated influencerOnProviderCallCompleted influencerOnProviderRegistered influencerReleaseValidatedCommissions influencerValidatePendingCommissions' | tee -a $LOG
firebase deploy --only "functions:influencerOnInfluencerCreated,functions:influencerOnProviderCallCompleted,functions:influencerOnProviderRegistered,functions:influencerReleaseValidatedCommissions,functions:influencerValidatePendingCommissions" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 97] initCountryConfigs initHelpArticlesBatch initKYCReminderTemplates initPayPalWelcomeTemplates initSingleHelpArticle' | tee -a $LOG
firebase deploy --only "functions:initCountryConfigs,functions:initHelpArticlesBatch,functions:initKYCReminderTemplates,functions:initPayPalWelcomeTemplates,functions:initSingleHelpArticle" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 98] initUnclaimedFundsTemplates initializeAdminClaims initializeAffiliateConfig initializeChatterConfig initializeChatterSystem' | tee -a $LOG
firebase deploy --only "functions:initUnclaimedFundsTemplates,functions:initializeAdminClaims,functions:initializeAffiliateConfig,functions:initializeChatterConfig,functions:initializeChatterSystem" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 99] initializeMessageTemplates initializeProviderTranslation initializeThresholdTracking invalidateCacheEndpoint joinGroupAsChatter' | tee -a $LOG
firebase deploy --only "functions:initializeMessageTemplates,functions:initializeProviderTranslation,functions:initializeThresholdTracking,functions:invalidateCacheEndpoint,functions:joinGroupAsChatter" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 100] listLocalBackups logConnection manuallyTriggerCallExecution markCountryAsRegistered migrateProfileSlugs' | tee -a $LOG
firebase deploy --only "functions:listLocalBackups,functions:logConnection,functions:manuallyTriggerCallExecution,functions:markCountryAsRegistered,functions:migrateProfileSlugs" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 101] migrateProviderSlugs migrateProvidersToUid monitorTelegramUsage monthlySecretsConfigBackup morningBackup' | tee -a $LOG
firebase deploy --only "functions:migrateProviderSlugs,functions:migrateProvidersToUid,functions:monitorTelegramUsage,functions:monthlySecretsConfigBackup,functions:morningBackup" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 102] notificationRetry notifyAfterPayment notifyExpiringPromotions onBlogPostCreated onBlogPostUpdated' | tee -a $LOG
firebase deploy --only "functions:notificationRetry,functions:notifyAfterPayment,functions:notifyExpiringPromotions,functions:onBlogPostCreated,functions:onBlogPostUpdated" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 103] onBloggerCreated onBookingRequestCreated onBookingRequestCreatedGenerateAi onBookingRequestCreatedTrackGoogleAdsLead onBookingRequestCreatedTrackLead' | tee -a $LOG
firebase deploy --only "functions:onBloggerCreated,functions:onBookingRequestCreated,functions:onBookingRequestCreatedGenerateAi,functions:onBookingRequestCreatedTrackGoogleAdsLead,functions:onBookingRequestCreatedTrackLead" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 104] onCallCompletedGroupAdmin onCallSessionPaymentAuthorized onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout onCallSessionPaymentCaptured onContactSubmittedTrackLead' | tee -a $LOG
firebase deploy --only "functions:onCallCompletedGroupAdmin,functions:onCallSessionPaymentAuthorized,functions:onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout,functions:onCallSessionPaymentCaptured,functions:onContactSubmittedTrackLead" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 105] onFaqCreated onFaqUpdated onFeedbackCreated onGroupAdminCreated onHelpArticleCreated' | tee -a $LOG
firebase deploy --only "functions:onFaqCreated,functions:onFaqUpdated,functions:onFeedbackCreated,functions:onGroupAdminCreated,functions:onHelpArticleCreated" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 106] onHelpArticleUpdated onInvoiceCreatedSendEmail onInvoiceRecordCreated onLandingPageCreated onMessageEventCreate' | tee -a $LOG
firebase deploy --only "functions:onHelpArticleUpdated,functions:onInvoiceCreatedSendEmail,functions:onInvoiceRecordCreated,functions:onLandingPageCreated,functions:onMessageEventCreate" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 107] onPaymentCompleted onPaymentRecordCreated onPaymentRecordUpdated onPayoutCompleted onProfileCreated' | tee -a $LOG
firebase deploy --only "functions:onPaymentCompleted,functions:onPaymentRecordCreated,functions:onPaymentRecordUpdated,functions:onPayoutCompleted,functions:onProfileCreated" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 108] onProfileUpdated onProviderChange onProviderCreated onRefundCompleted onRefundCreated' | tee -a $LOG
firebase deploy --only "functions:onProfileUpdated,functions:onProviderChange,functions:onProviderCreated,functions:onRefundCompleted,functions:onRefundCreated" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 109] onSecurityAlertCreated onSecurityAlertUpdated onSosProfileCreated onSosProfileUpdated onSubscriptionPaymentReceived' | tee -a $LOG
firebase deploy --only "functions:onSecurityAlertCreated,functions:onSecurityAlertUpdated,functions:onSosProfileCreated,functions:onSosProfileUpdated,functions:onSubscriptionPaymentReceived" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 110] onUserAccessUpdated onUserCreatedSyncClaims onUserCreatedTrackGoogleAdsSignUp onUserCreatedTrackRegistration onUserDeleted' | tee -a $LOG
firebase deploy --only "functions:onUserAccessUpdated,functions:onUserCreatedSyncClaims,functions:onUserCreatedTrackGoogleAdsSignUp,functions:onUserCreatedTrackRegistration,functions:onUserDeleted" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 111] onUserEmailUpdated onUserUpdatedSyncClaims onValidationCreated onValidationDecision paymentDataCleanup' | tee -a $LOG
firebase deploy --only "functions:onUserEmailUpdated,functions:onUserUpdatedSyncClaims,functions:onValidationCreated,functions:onValidationDecision,functions:paymentDataCleanup" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 112] paymentOnWithdrawalCreated paymentOnWithdrawalStatusChanged paymentProcessAutomaticPayments paymentWebhookFlutterwave paymentWebhookWise' | tee -a $LOG
firebase deploy --only "functions:paymentOnWithdrawalCreated,functions:paymentOnWithdrawalStatusChanged,functions:paymentProcessAutomaticPayments,functions:paymentWebhookFlutterwave,functions:paymentWebhookWise" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 113] paypalWebhook pendingTransfersMonitorScheduled postJournalEntry processDunningQueue processEscalationHttp' | tee -a $LOG
firebase deploy --only "functions:paypalWebhook,functions:pendingTransfersMonitorScheduled,functions:postJournalEntry,functions:processDunningQueue,functions:processEscalationHttp" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 114] processScheduledTransfers processSecurityEscalations processTelegramCampaigns processTelegramQueue processWebhookDLQ' | tee -a $LOG
firebase deploy --only "functions:processScheduledTransfers,functions:processSecurityEscalations,functions:processTelegramCampaigns,functions:processTelegramQueue,functions:processWebhookDLQ" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 115] providerCatalogFeed providerNoAnswerTwiML quarterlyRestoreTest recordZoomAttendance regenerateJournalEntry' | tee -a $LOG
firebase deploy --only "functions:providerCatalogFeed,functions:providerNoAnswerTwiML,functions:quarterlyRestoreTest,functions:recordZoomAttendance,functions:regenerateJournalEntry" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 116] registerBlogger registerChatter registerGroupAdmin registerInfluencer registerLocalBackup' | tee -a $LOG
firebase deploy --only "functions:registerBlogger,functions:registerChatter,functions:registerGroupAdmin,functions:registerInfluencer,functions:registerLocalBackup" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 117] rejectProfile releaseInvoiceLock releaseValidatedGroupAdminCommissions renderForBotsV2 repairOrphanedUser' | tee -a $LOG
firebase deploy --only "functions:rejectProfile,functions:releaseInvoiceLock,functions:releaseValidatedGroupAdminCommissions,functions:renderForBotsV2,functions:repairOrphanedUser" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 118] requestChanges requestGroupAdminWithdrawal requestWithdrawal resendPayPalVerificationCode resetAffiliateConfigToDefaults' | tee -a $LOG
firebase deploy --only "functions:requestChanges,functions:requestGroupAdminWithdrawal,functions:requestWithdrawal,functions:resendPayPalVerificationCode,functions:resetAffiliateConfigToDefaults" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 119] resetBillingCycleQuotas resetChatterConfigToDefaults restoreCollectionDocuments restoreUserRoles resubmitForValidation' | tee -a $LOG
firebase deploy --only "functions:resetBillingCycleQuotas,functions:resetChatterConfigToDefaults,functions:restoreCollectionDocuments,functions:restoreUserRoles,functions:resubmitForValidation" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 120] retryFailedPayout retryOutilSync retrySpecificDelivery reverseJournalEntry runCriticalFunctionalCheck' | tee -a $LOG
firebase deploy --only "functions:retryFailedPayout,functions:retryOutilSync,functions:retrySpecificDelivery,functions:reverseJournalEntry,functions:runCriticalFunctionalCheck" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 121] runFunctionalHealthCheck runMonthlyDRTest runPaymentHealthCheck runSystemHealthCheck saveAgentMetricsHistory' | tee -a $LOG
firebase deploy --only "functions:runFunctionalHealthCheck,functions:runMonthlyDRTest,functions:runPaymentHealthCheck,functions:runSystemHealthCheck,functions:saveAgentMetricsHistory" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 122] savePaymentMethod scheduledBackup scheduledCleanup scheduledKYCReminders scheduledPayPalReminders' | tee -a $LOG
firebase deploy --only "functions:savePaymentMethod,functions:scheduledBackup,functions:scheduledCleanup,functions:scheduledKYCReminders,functions:scheduledPayPalReminders" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 123] scheduledProcessUnclaimedFunds scheduledSitemapGeneration scheduledSitemapPing securityAlertAdminAction securityDailyCleanup' | tee -a $LOG
firebase deploy --only "functions:scheduledProcessUnclaimedFunds,functions:scheduledSitemapGeneration,functions:scheduledSitemapPing,functions:securityAlertAdminAction,functions:securityDailyCleanup" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 124] securityDailyReport seedCountryConfigsHttp sendAnniversaryEmails sendChatterDripMessages sendContactReply' | tee -a $LOG
firebase deploy --only "functions:securityDailyReport,functions:seedCountryConfigsHttp,functions:sendAnniversaryEmails,functions:sendChatterDripMessages,functions:sendContactReply" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 125] sendCustomPasswordResetEmail sendFilingReminders sendMonthlyStats sendPayPalVerificationCode sendPayoutSuccessEmail' | tee -a $LOG
firebase deploy --only "functions:sendCustomPasswordResetEmail,functions:sendFilingReminders,functions:sendMonthlyStats,functions:sendPayPalVerificationCode,functions:sendPayoutSuccessEmail" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 126] sendQuotaAlerts sendWeeklyStats sendWeeklyThresholdReport setAdminClaims setDefaultPaymentMethod' | tee -a $LOG
firebase deploy --only "functions:sendQuotaAlerts,functions:sendWeeklyStats,functions:sendWeeklyThresholdReport,functions:setAdminClaims,functions:setDefaultPaymentMethod" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 127] setProviderAvailableTask setProviderBadge setProviderOffline sitemapFaq sitemapHelp' | tee -a $LOG
firebase deploy --only "functions:setProviderAvailableTask,functions:setProviderBadge,functions:setProviderOffline,functions:sitemapFaq,functions:sitemapHelp" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 128] sitemapLanding sitemapProfiles skipTelegramOnboarding softDeleteProvider stopAutoresponders' | tee -a $LOG
firebase deploy --only "functions:sitemapLanding,functions:sitemapProfiles,functions:skipTelegramOnboarding,functions:softDeleteProvider,functions:stopAutoresponders" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 129] stripeWebhook stuckPaymentsRecovery submitChatterTrainingQuiz submitFeedback submitForValidation' | tee -a $LOG
firebase deploy --only "functions:stripeWebhook,functions:stuckPaymentsRecovery,functions:submitChatterTrainingQuiz,functions:submitFeedback,functions:submitForValidation" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 130] submitGroup submitInfluencerTrainingQuiz submitKycData submitPost submitQuiz' | tee -a $LOG
firebase deploy --only "functions:submitGroup,functions:submitInfluencerTrainingQuiz,functions:submitKycData,functions:submitPost,functions:submitQuiz" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 131] suspendProvider syncAllCustomClaims syncFromOutil telegramChatterBotWebhook telegramDailyReport' | tee -a $LOG
firebase deploy --only "functions:suspendProvider,functions:syncAllCustomClaims,functions:syncFromOutil,functions:telegramChatterBotWebhook,functions:telegramDailyReport" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 132] telegramOnCallCompleted telegramOnNegativeReview telegramOnNewContactMessage telegramOnNewProvider telegramOnPayPalPaymentReceived' | tee -a $LOG
firebase deploy --only "functions:telegramOnCallCompleted,functions:telegramOnNegativeReview,functions:telegramOnNewContactMessage,functions:telegramOnNewProvider,functions:telegramOnPayPalPaymentReceived" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 133] telegramOnPaymentReceived telegramOnSecurityAlert telegramOnUserRegistration telegramOnWithdrawalRequest telegram_cancelCampaign' | tee -a $LOG
firebase deploy --only "functions:telegramOnPaymentReceived,functions:telegramOnSecurityAlert,functions:telegramOnUserRegistration,functions:telegramOnWithdrawalRequest,functions:telegram_cancelCampaign" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 134] telegram_createCampaign telegram_getCampaignDetail telegram_getCampaigns telegram_getChatId telegram_getConfig' | tee -a $LOG
firebase deploy --only "functions:telegram_createCampaign,functions:telegram_getCampaignDetail,functions:telegram_getCampaigns,functions:telegram_getChatId,functions:telegram_getConfig" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 135] telegram_getNotificationLogs telegram_getQueueStats telegram_getSubscriberStats telegram_getTemplates telegram_reprocessDeadLetters' | tee -a $LOG
firebase deploy --only "functions:telegram_getNotificationLogs,functions:telegram_getQueueStats,functions:telegram_getSubscriberStats,functions:telegram_getTemplates,functions:telegram_reprocessDeadLetters" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 136] telegram_sendOneOff telegram_sendTestNotification telegram_updateConfig telegram_updateTemplate telegram_validateBot' | tee -a $LOG
firebase deploy --only "functions:telegram_sendOneOff,functions:telegram_sendTestNotification,functions:telegram_updateConfig,functions:telegram_updateTemplate,functions:telegram_validateBot" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 137] testCAPIConnection testCloudTasksConnection testWebhook thresholdOnPaymentCreate thresholdOnPaymentUpdate' | tee -a $LOG
firebase deploy --only "functions:testCAPIConnection,functions:testCloudTasksConnection,functions:testWebhook,functions:thresholdOnPaymentCreate,functions:thresholdOnPaymentUpdate" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 138] trackBloggerGuideUsage trackCAPIEvent trackGroupAdminPostUsage trackGroupAdminResourceUsage translateProvider' | tee -a $LOG
firebase deploy --only "functions:trackBloggerGuideUsage,functions:trackCAPIEvent,functions:trackGroupAdminPostUsage,functions:trackGroupAdminResourceUsage,functions:translateProvider" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 139] triggerAdminAlertsDigest triggerBudgetAlertCheck triggerFilingReminders triggerKYCReminders triggerNotificationRetry' | tee -a $LOG
firebase deploy --only "functions:triggerAdminAlertsDigest,functions:triggerBudgetAlertCheck,functions:triggerFilingReminders,functions:triggerKYCReminders,functions:triggerNotificationRetry" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 140] triggerPayPalReminders triggerPendingTransfersMonitor triggerProviderStatsAggregation triggerServiceBalanceCheck triggerStuckPaymentsRecovery' | tee -a $LOG
firebase deploy --only "functions:triggerPayPalReminders,functions:triggerPendingTransfersMonitor,functions:triggerProviderStatsAggregation,functions:triggerServiceBalanceCheck,functions:triggerStuckPaymentsRecovery" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 141] triggerThresholdRecalculation twilioAmdTwiml twilioCallWebhook twilioConferenceWebhook twilioGatherResponse' | tee -a $LOG
firebase deploy --only "functions:triggerThresholdRecalculation,functions:twilioAmdTwiml,functions:twilioCallWebhook,functions:twilioConferenceWebhook,functions:twilioGatherResponse" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 142] twilioRecordingWebhook unblockProvider unhideProvider unsuspendProvider updateBankDetails' | tee -a $LOG
firebase deploy --only "functions:twilioRecordingWebhook,functions:unblockProvider,functions:unhideProvider,functions:unsuspendProvider,functions:updateBankDetails" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 143] updateBloggerProfile updateChatterProfile updateChatterTrainingProgress updateFeedbackStatus updateFilingAmounts' | tee -a $LOG
firebase deploy --only "functions:updateBloggerProfile,functions:updateChatterProfile,functions:updateChatterTrainingProgress,functions:updateFeedbackStatus,functions:updateFilingAmounts" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 144] updateFilingStatus updateGroupAdminProfile updateInfluencerProfile updateInfluencerTrainingProgress updatePlanPricing' | tee -a $LOG
firebase deploy --only "functions:updateFilingStatus,functions:updateGroupAdminProfile,functions:updateInfluencerProfile,functions:updateInfluencerTrainingProgress,functions:updatePlanPricing" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 145] updatePlanPricingV2 updateProviderActivity updateProviderTranslation updateServiceBalanceThreshold updateTelegramOnboarding' | tee -a $LOG
firebase deploy --only "functions:updatePlanPricingV2,functions:updateProviderActivity,functions:updateProviderTranslation,functions:updateServiceBalanceThreshold,functions:updateTelegramOnboarding" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 146] updateTrialConfig updateTrialConfigV2 validateCouponCallable validateDashboardPassword validatePendingGroupAdminCommissions' | tee -a $LOG
firebase deploy --only "functions:updateTrialConfig,functions:updateTrialConfigV2,functions:validateCouponCallable,functions:validateDashboardPassword,functions:validatePendingGroupAdminCommissions" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
sleep 90
echo '[LOT 147] validateVAT validateVat verifyPayPalCode wiseWebhook' | tee -a $LOG
firebase deploy --only "functions:validateVAT,functions:validateVat,functions:verifyPayPalCode,functions:wiseWebhook" --project sos-urgently-ac307 --force 2>&1 | tee -a $LOG
echo 'EXIT: $?' | tee -a $LOG
echo '✅ TERMINÉ' | tee -a $LOG

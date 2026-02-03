#!/bin/bash
# Deploy failed functions in smaller batches with longer pauses

cd "$(dirname "$0")/.."

export FUNCTIONS_DISCOVERY_TIMEOUT=60000

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

    echo "Waiting 45 seconds before next batch..."
    sleep 45
}

echo "Starting deployment of failed functions..."
echo "Total: 57 functions in 12 batches of ~5 functions"

# Batch 1
deploy_batch "failed-1" \
    functions:hardDeleteProvider,functions:influencerOnCallCompleted,functions:influencerOnProviderCallCompleted,functions:influencerOnProviderRegistered,functions:influencerReleaseValidatedCommissions

# Batch 2
deploy_batch "failed-2" \
    functions:influencerValidatePendingCommissions,functions:initHelpArticlesBatch,functions:initSingleHelpArticle,functions:invalidateCacheEndpoint,functions:joinGroupAsChatter

# Batch 3
deploy_batch "failed-3" \
    functions:logConnection,functions:onBookingRequestCreatedGenerateAi,functions:onBookingRequestCreatedTrackGoogleAdsLead,functions:onBookingRequestCreatedTrackLead,functions:onCallCompletedGroupAdmin

# Batch 4
deploy_batch "failed-4" \
    functions:onCallSessionPaymentAuthorized,functions:onCallSessionPaymentAuthorizedTrackGoogleAdsCheckout,functions:onContactSubmittedTrackLead,functions:onFaqCreated,functions:onFaqUpdated

# Batch 5
deploy_batch "failed-5" \
    functions:onUserCreatedTrackRegistration,functions:paymentCancelWithdrawal,functions:paymentDeleteMethod,functions:paymentGetHistory,functions:providerCatalogFeed

# Batch 6
deploy_batch "failed-6" \
    functions:registerBlogger,functions:registerChatter,functions:registerInfluencer,functions:rejectProfile,functions:resendPayPalVerificationCode

# Batch 7
deploy_batch "failed-7" \
    functions:scheduledSitemapGeneration,functions:sendPayoutSuccessEmail,functions:sendPayPalVerificationCode,functions:setProviderAvailableTask,functions:sitemapFaq

# Batch 8
deploy_batch "failed-8" \
    functions:sitemapHelp,functions:submitChatterTrainingQuiz,functions:submitInfluencerTrainingQuiz,functions:submitPost,functions:submitQuiz

# Batch 9
deploy_batch "failed-9" \
    functions:suspendProvider,functions:trackBloggerGuideUsage,functions:trackCAPIEvent,functions:trackGroupAdminPostUsage,functions:trackGroupAdminResourceUsage

# Batch 10
deploy_batch "failed-10" \
    functions:triggerServiceBalanceCheck,functions:unblockProvider,functions:unhideProvider,functions:unsuspendProvider,functions:updateBankDetails

# Batch 11
deploy_batch "failed-11" \
    functions:updateBloggerProfile,functions:updateChatterProfile,functions:updateGroupAdminProfile,functions:updateInfluencerProfile,functions:updateInfluencerTrainingProgress

# Batch 12
deploy_batch "failed-12" \
    functions:validatePendingGroupAdminCommissions,functions:getServiceBalanceAlerts,functions:getServiceBalanceThresholds,functions:getTwilioBalance,functions:getUnifiedAnalytics

echo ""
echo "=========================================="
echo "Failed functions deployment completed!"
echo "=========================================="

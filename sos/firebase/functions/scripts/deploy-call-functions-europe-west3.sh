#!/bin/bash
# ============================================================================
# DEPLOYMENT SCRIPT: Call Functions to europe-west3
# ============================================================================
# This script deploys call-related functions to a dedicated region (europe-west3)
# to avoid CPU quota issues in europe-west1 (which has 500+ functions).
#
# IMPORTANT: Run this script from the sos/firebase/functions directory
# ============================================================================

set -e

echo "============================================================================"
echo "  DEPLOYING CALL FUNCTIONS TO EUROPE-WEST3"
echo "============================================================================"
echo ""

PROJECT_ID="sos-urgently-ac307"
NEW_REGION="europe-west3"

# List of functions to deploy to europe-west3
CALL_FUNCTIONS=(
    "twilioCallWebhook"
    "twilioConferenceWebhook"
    "twilioAmdTwiml"
    "twilioGatherResponse"
    "providerNoAnswerTwiML"
    "executeCallTask"
    "setProviderAvailableTask"
    "forceEndCallTask"
)

echo "Step 1: Creating Cloud Tasks queue in $NEW_REGION (if not exists)..."
echo "------------------------------------------------------------------------"

# Create the call-scheduler-queue in europe-west3 if it doesn't exist
gcloud tasks queues create call-scheduler-queue \
    --location=$NEW_REGION \
    --project=$PROJECT_ID \
    --max-dispatches-per-second=500 \
    --max-concurrent-dispatches=1000 \
    --max-attempts=5 \
    --min-backoff=10s \
    --max-backoff=300s \
    2>/dev/null || echo "Queue already exists or error (continuing...)"

echo ""
echo "Step 2: Deploying call functions to $NEW_REGION..."
echo "------------------------------------------------------------------------"

# Deploy each function
for func in "${CALL_FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    firebase deploy --only functions:$func --project=$PROJECT_ID
    echo ""
done

echo ""
echo "Step 3: Getting new function URLs..."
echo "------------------------------------------------------------------------"

# Get the URLs of the newly deployed functions
echo "Getting URLs for deployed functions..."
echo ""

# Function to get Cloud Run URL for a function
get_function_url() {
    local func_name=$1
    local func_lower=$(echo "$func_name" | tr '[:upper:]' '[:lower:]')
    gcloud run services describe $func_lower \
        --region=$NEW_REGION \
        --project=$PROJECT_ID \
        --format='value(status.url)' 2>/dev/null || echo "NOT_DEPLOYED"
}

echo "TWILIO_CALL_WEBHOOK_URL=$(get_function_url 'twilioCallWebhook')"
echo "TWILIO_CONFERENCE_WEBHOOK_URL=$(get_function_url 'twilioConferenceWebhook')"
echo "TWILIO_AMD_TWIML_URL=$(get_function_url 'twilioAmdTwiml')"
echo "TWILIO_GATHER_RESPONSE_URL=$(get_function_url 'twilioGatherResponse')"
echo "PROVIDER_NO_ANSWER_TWIML_URL=$(get_function_url 'providerNoAnswerTwiML')"
echo "EXECUTE_CALL_TASK_URL=$(get_function_url 'executeCallTask')"
echo "SET_PROVIDER_AVAILABLE_TASK_URL=$(get_function_url 'setProviderAvailableTask')"
echo "FORCE_END_CALL_TASK_URL=$(get_function_url 'forceEndCallTask')"

echo ""
echo "============================================================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================================================"
echo ""
echo "NEXT STEPS:"
echo "1. Copy the URLs above"
echo "2. Set them as Firebase params using:"
echo "   firebase functions:params:set TWILIO_CALL_WEBHOOK_URL=<url> --project=$PROJECT_ID"
echo "   (repeat for each URL)"
echo ""
echo "Or use the firebase console to set the params."
echo "============================================================================"

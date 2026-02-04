#!/bin/bash
# ============================================================================
# SET FIREBASE PARAMS FOR CALL FUNCTIONS (europe-west3)
# ============================================================================
# Run this script AFTER deploying call functions to europe-west3
# to update the Firebase params with the new URLs.
#
# IMPORTANT: Replace the URLs below with the actual URLs from the deployment
# ============================================================================

set -e

PROJECT_ID="sos-urgently-ac307"
NEW_REGION="europe-west3"

echo "============================================================================"
echo "  SETTING FIREBASE PARAMS FOR CALL FUNCTIONS"
echo "============================================================================"
echo ""

# Get URLs from Cloud Run (lowercase function names)
echo "Fetching URLs from Cloud Run..."

TWILIO_CALL_WEBHOOK_URL=$(gcloud run services describe twiliocallwebhook --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
TWILIO_CONFERENCE_WEBHOOK_URL=$(gcloud run services describe twilioconferencewebhook --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
TWILIO_AMD_TWIML_URL=$(gcloud run services describe twilioamdtwiml --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
TWILIO_GATHER_RESPONSE_URL=$(gcloud run services describe twiliogatherresponse --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
PROVIDER_NO_ANSWER_TWIML_URL=$(gcloud run services describe providernoanswertwiml --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
EXECUTE_CALL_TASK_URL=$(gcloud run services describe executecalltask --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
SET_PROVIDER_AVAILABLE_TASK_URL=$(gcloud run services describe setprovideravailabletask --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")
FORCE_END_CALL_TASK_URL=$(gcloud run services describe forceendcalltask --region=$NEW_REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null || echo "")

echo ""
echo "URLs found:"
echo "  TWILIO_CALL_WEBHOOK_URL: $TWILIO_CALL_WEBHOOK_URL"
echo "  TWILIO_CONFERENCE_WEBHOOK_URL: $TWILIO_CONFERENCE_WEBHOOK_URL"
echo "  TWILIO_AMD_TWIML_URL: $TWILIO_AMD_TWIML_URL"
echo "  TWILIO_GATHER_RESPONSE_URL: $TWILIO_GATHER_RESPONSE_URL"
echo "  PROVIDER_NO_ANSWER_TWIML_URL: $PROVIDER_NO_ANSWER_TWIML_URL"
echo "  EXECUTE_CALL_TASK_URL: $EXECUTE_CALL_TASK_URL"
echo "  SET_PROVIDER_AVAILABLE_TASK_URL: $SET_PROVIDER_AVAILABLE_TASK_URL"
echo "  FORCE_END_CALL_TASK_URL: $FORCE_END_CALL_TASK_URL"
echo ""

# Check if all URLs are found
if [ -z "$TWILIO_CALL_WEBHOOK_URL" ] || [ -z "$EXECUTE_CALL_TASK_URL" ]; then
    echo "ERROR: Some URLs are missing. Please deploy the functions first."
    echo "Run: ./deploy-call-functions-europe-west3.sh"
    exit 1
fi

echo "Setting Firebase params..."
echo ""

# Set each param
firebase functions:params:set \
    CLOUD_TASKS_LOCATION=$NEW_REGION \
    TWILIO_CALL_WEBHOOK_URL=$TWILIO_CALL_WEBHOOK_URL \
    TWILIO_CONFERENCE_WEBHOOK_URL=$TWILIO_CONFERENCE_WEBHOOK_URL \
    TWILIO_AMD_TWIML_URL=$TWILIO_AMD_TWIML_URL \
    TWILIO_GATHER_RESPONSE_URL=$TWILIO_GATHER_RESPONSE_URL \
    PROVIDER_NO_ANSWER_TWIML_URL=$PROVIDER_NO_ANSWER_TWIML_URL \
    EXECUTE_CALL_TASK_URL=$EXECUTE_CALL_TASK_URL \
    SET_PROVIDER_AVAILABLE_TASK_URL=$SET_PROVIDER_AVAILABLE_TASK_URL \
    FORCE_END_CALL_TASK_URL=$FORCE_END_CALL_TASK_URL \
    --project=$PROJECT_ID

echo ""
echo "============================================================================"
echo "  PARAMS SET SUCCESSFULLY"
echo "============================================================================"
echo ""
echo "The call functions are now configured to use europe-west3."
echo "Redeploy any functions that need to pick up the new params."
echo "============================================================================"

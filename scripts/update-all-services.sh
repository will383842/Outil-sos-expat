#!/bin/bash
# Update all Cloud Run services to reduce CPU quota

PROJECT="sos-urgently-ac307"
REGION="europe-west1"

# Critical services already updated, skip them
SKIP="stripewebhook|paypalwebhook|createpaymentintent|executecalltask|twiliocallwebhook|unifiedwebhook"

# Get all services
SERVICES=$(gcloud run services list --region="$REGION" --project="$PROJECT" --format="value(name)" 2>/dev/null | grep -vE "$SKIP")

TOTAL=$(echo "$SERVICES" | wc -l)
COUNT=0
SUCCESS=0
FAILED=0

echo "========================================"
echo "Updating $TOTAL services..."
echo "========================================"

for svc in $SERVICES; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Updating $svc..."

  if gcloud run services update "$svc" \
    --region="$REGION" \
    --project="$PROJECT" \
    --cpu=0.083 \
    --memory=256Mi \
    --max-instances=3 \
    --min-instances=0 \
    --no-cpu-boost \
    --concurrency=1 \
    --quiet 2>/dev/null; then
    echo "  ✅ Success"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ❌ Failed"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "========================================"
echo "DONE!"
echo "Success: $SUCCESS"
echo "Failed: $FAILED"
echo "========================================"

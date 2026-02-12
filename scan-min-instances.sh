#!/bin/bash
# Script pour scanner tous les services Cloud Run et trouver ceux avec minInstances > 0

PROJECT="sos-urgently-ac307"
OUTPUT_FILE="min-instances-report.csv"

echo "Service,Region,MinInstances,CPU,Memory" > "$OUTPUT_FILE"

# Scanner les services critiques connus
CRITICAL_SERVICES=(
  "twiliocallwebhook,europe-west3"
  "twilioconferencewebhook,europe-west3"
  "twiliogatherresponse,europe-west3"
  "twilioamdtwiml,europe-west3"
  "executecalltask,europe-west3"
  "createpaymentintent,europe-west3"
  "stripewebhook,europe-west1"
  "createpaypalorderhttp,europe-west1"
  "capturepaypalorderhttp,europe-west1"
  "paypalwebhook,europe-west1"
)

echo "Scanning critical services..."
for service_region in "${CRITICAL_SERVICES[@]}"; do
  IFS=',' read -r service region <<< "$service_region"

  minScale=$(gcloud run services describe "$service" \
    --region="$region" \
    --project="$PROJECT" \
    --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])" \
    2>/dev/null)

  cpu=$(gcloud run services describe "$service" \
    --region="$region" \
    --project="$PROJECT" \
    --format="value(spec.template.spec.containers[0].resources.limits.cpu)" \
    2>/dev/null)

  memory=$(gcloud run services describe "$service" \
    --region="$region" \
    --project="$PROJECT" \
    --format="value(spec.template.spec.containers[0].resources.limits.memory)" \
    2>/dev/null)

  if [ -n "$minScale" ]; then
    echo "$service,$region,$minScale,$cpu,$memory" >> "$OUTPUT_FILE"
    echo "✓ $service: minInstances=$minScale, cpu=$cpu, memory=$memory"
  fi
done

echo ""
echo "Report saved to: $OUTPUT_FILE"
cat "$OUTPUT_FILE"

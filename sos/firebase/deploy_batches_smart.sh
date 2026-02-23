#!/bin/bash
# Deploy toutes les fonctions par batches de 5 avec pause entre chaque batch
# Usage: bash deploy_batches_smart.sh [resume_from_batch_number]

set -uo pipefail

PROJECT="sos-urgently-ac307"
BATCH_SIZE=5
PAUSE_SECONDS=90
RESUME_FROM=${1:-1}

# Fonctions critiques EN PREMIER
CRITICAL=(
  stripeWebhook
  twilioCallWebhook
  twilioConferenceWebhook
  executeCallTask
  createPaymentIntent
  paypalWebhook
  providerNoAnswerTwiML
  twilioAmdTwiml
  twilioGatherResponse
  twilioRecordingWebhook
  forceEndCallTask
  busySafetyTimeoutTask
  setProviderAvailableTask
  consolidatedOnCallCompleted
  consolidatedOnUserCreated
  consolidatedOnUserUpdated
  createAndScheduleCall
  createAndScheduleCallHTTPS
)

# Toutes les fonctions (lues depuis firebase)
ALL_FUNCTIONS=$(cat /tmp/deployed_functions.txt)

# Construire la liste ordonnée: critiques d'abord, puis le reste
ORDERED=()
for f in "${CRITICAL[@]}"; do
  ORDERED+=("$f")
done
while IFS= read -r f; do
  skip=false
  for c in "${CRITICAL[@]}"; do
    if [[ "$f" == "$c" ]]; then skip=true; break; fi
  done
  $skip || ORDERED+=("$f")
done <<< "$ALL_FUNCTIONS"

TOTAL=${#ORDERED[@]}
TOTAL_BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))

echo "========================================="
echo "DEPLOIEMENT INTELLIGENT PAR BATCHES"
echo "Total: $TOTAL fonctions"
echo "Batch size: $BATCH_SIZE"
echo "Pause: ${PAUSE_SECONDS}s entre batches"
echo "Total batches: $TOTAL_BATCHES"
echo "Resume from batch: $RESUME_FROM"
echo "Debut: $(date)"
echo "========================================="

SUCCESS=0
FAILED=0
FAILED_LIST=""
BATCH_NUM=0

for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
  BATCH_NUM=$((BATCH_NUM + 1))

  # Skip batches before resume point
  if [[ $BATCH_NUM -lt $RESUME_FROM ]]; then
    continue
  fi

  # Build batch
  BATCH=()
  for ((j=i; j<i+BATCH_SIZE && j<TOTAL; j++)); do
    BATCH+=("${ORDERED[$j]}")
  done

  FUNC_LIST=$(IFS=,; echo "functions:${BATCH[*]// /}" | sed 's/,/,functions:/g')

  echo ""
  echo "=== BATCH $BATCH_NUM/$TOTAL_BATCHES === $(date '+%H:%M:%S')"
  echo "    ${BATCH[*]}"

  if firebase deploy --only "$FUNC_LIST" --force --project "$PROJECT" 2>&1 | tail -20; then
    echo "+++ BATCH $BATCH_NUM OK"
    SUCCESS=$((SUCCESS + ${#BATCH[@]}))
  else
    echo "!!! BATCH $BATCH_NUM ECHOUE"
    FAILED=$((FAILED + ${#BATCH[@]}))
    FAILED_LIST="$FAILED_LIST ${BATCH[*]}"
  fi

  # Pause entre batches (sauf le dernier)
  if [[ $((i + BATCH_SIZE)) -lt $TOTAL ]]; then
    echo "    Pause ${PAUSE_SECONDS}s (quota cooldown)..."
    sleep $PAUSE_SECONDS
  fi
done

echo ""
echo "========================================="
echo "DEPLOIEMENT TERMINE"
echo "Fin: $(date)"
echo "Succès: $SUCCESS"
echo "Échecs: $FAILED"
if [[ -n "$FAILED_LIST" ]]; then
  echo "Fonctions échouées: $FAILED_LIST"
fi
echo "========================================="

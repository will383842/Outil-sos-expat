#!/bin/bash
PROJECT="sos-urgently-ac307"
PAUSE=60  # 1 minute

FUNCTIONS=(
  "getBloggerDirectory"
  "getChatterDirectory"
  "getGroupAdminDirectory"
  "getInfluencerDirectory"
  "twilioRecordingWebhook"
  "adminCreateMessageTemplate"
  "adminDeleteMessageTemplate"
  "adminResetMessageTemplatesToDefaults"
  "adminSeedMessageTemplates"
  "adminToggleFlashBonus"
  "adminUpdateChatterConfigSettings"
  "adminUpdateMessageTemplate"
  "chatterRegisterFcmToken"
  "chatterUnregisterFcmToken"
  "getAvailableCountriesForChatter"
  "getBloggerRecruits"
  "getChatterMessageTemplates"
  "getFunctionalAlerts"
  "getFunctionalHealthSummary"
  "resolveFunctionalAlert"
  "triggerFunctionalCheck"
  "cleanupFunctionalData"
  "runCriticalFunctionalCheck"
  "runFunctionalHealthCheck"
)

TOTAL=${#FUNCTIONS[@]}
SUCCESS=0
FAILED=0
FAILED_LIST=""

echo "========================================="
echo "DEPLOIEMENT 1 PAR 1 — PAUSE 1 MIN"
echo "Total: $TOTAL fonctions"
echo "Debut: $(date)"
echo "========================================="

for i in "${!FUNCTIONS[@]}"; do
  FN=${FUNCTIONS[$i]}
  NUM=$((i+1))

  echo ""
  echo "=== [$NUM/$TOTAL] $FN === $(date '+%H:%M:%S')"
  firebase deploy --only "functions:$FN" --project $PROJECT --force 2>&1
  EXIT=$?

  if [ $EXIT -eq 0 ]; then
    SUCCESS=$((SUCCESS+1))
    echo "OK [$NUM/$TOTAL] $FN"
  else
    FAILED=$((FAILED+1))
    FAILED_LIST="$FAILED_LIST $FN"
    echo "!!! ECHEC [$NUM/$TOTAL] $FN (exit=$EXIT) !!!"
  fi

  # Pas de pause après la dernière
  if [ $NUM -lt $TOTAL ]; then
    echo "Pause 1 min... prochain deploy a $(date -d '+1 minutes' '+%H:%M' 2>/dev/null || echo '~1min')"
    sleep $PAUSE
  fi
done

echo ""
echo "========================================="
echo "RESULTATS FINAUX — $(date)"
echo "========================================="
echo "OK:     $SUCCESS/$TOTAL"
echo "ECHEC:  $FAILED/$TOTAL"
if [ -n "$FAILED_LIST" ]; then
  echo "FONCTIONS EN ECHEC:$FAILED_LIST"
fi
echo "========================================="

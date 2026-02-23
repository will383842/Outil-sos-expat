#!/bin/bash
PROJECT="sos-urgently-ac307"
PAUSE=600  # 10 minutes

echo "========================================="
echo "DEPLOIEMENT PAR LOTS V2 - PAUSE 10 MIN"
echo "========================================="

echo ""
echo "=== LOT 1 — 4 Directory europe-west2 ==="
firebase deploy --only "functions:getBloggerDirectory,functions:getChatterDirectory,functions:getGroupAdminDirectory,functions:getInfluencerDirectory" --project $PROJECT --force 2>&1
LOT1=$?
echo "LOT 1 exit=$LOT1"
if [ $LOT1 -ne 0 ]; then echo "!!! LOT 1 FAILED !!!"; fi
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 2 — twilioRecordingWebhook europe-west3 ==="
firebase deploy --only "functions:twilioRecordingWebhook" --project $PROJECT --force 2>&1
LOT2=$?
echo "LOT 2 exit=$LOT2"
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 3 — 5 admin chatter europe-west2 ==="
firebase deploy --only "functions:adminCreateMessageTemplate,functions:adminDeleteMessageTemplate,functions:adminResetMessageTemplatesToDefaults,functions:adminSeedMessageTemplates,functions:adminToggleFlashBonus" --project $PROJECT --force 2>&1
LOT3=$?
echo "LOT 3 exit=$LOT3"
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 4 — 5 admin/chatter europe-west2 ==="
firebase deploy --only "functions:adminUpdateChatterConfigSettings,functions:adminUpdateMessageTemplate,functions:chatterRegisterFcmToken,functions:chatterUnregisterFcmToken,functions:getAvailableCountriesForChatter" --project $PROJECT --force 2>&1
LOT4=$?
echo "LOT 4 exit=$LOT4"
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 5 — 2 chatter/blogger europe-west2 ==="
firebase deploy --only "functions:getBloggerRecruits,functions:getChatterMessageTemplates" --project $PROJECT --force 2>&1
LOT5=$?
echo "LOT 5 exit=$LOT5"
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 6 — 4 monitoring europe-west1 ==="
firebase deploy --only "functions:getFunctionalAlerts,functions:getFunctionalHealthSummary,functions:resolveFunctionalAlert,functions:triggerFunctionalCheck" --project $PROJECT --force 2>&1
LOT6=$?
echo "LOT 6 exit=$LOT6"
echo "Pause ${PAUSE}s (10 min)..."
sleep $PAUSE

echo ""
echo "=== LOT 7 — 3 monitoring europe-west3 ==="
firebase deploy --only "functions:cleanupFunctionalData,functions:runCriticalFunctionalCheck,functions:runFunctionalHealthCheck" --project $PROJECT --force 2>&1
LOT7=$?
echo "LOT 7 exit=$LOT7"

echo ""
echo "========================================="
echo "RESULTATS FINAUX"
echo "========================================="
echo "LOT 1 (4 Directory):    exit=$LOT1"
echo "LOT 2 (Recording):     exit=$LOT2"
echo "LOT 3 (5 admin):       exit=$LOT3"
echo "LOT 4 (5 admin):       exit=$LOT4"
echo "LOT 5 (2 chatter):     exit=$LOT5"
echo "LOT 6 (4 monitoring):  exit=$LOT6"
echo "LOT 7 (3 monitoring):  exit=$LOT7"
echo "========================================="

FAILED=0
for code in $LOT1 $LOT2 $LOT3 $LOT4 $LOT5 $LOT6 $LOT7; do
  if [ $code -ne 0 ]; then FAILED=$((FAILED+1)); fi
done
echo "TOTAL: $((7-FAILED))/7 lots OK, $FAILED echecs"
echo "========================================="

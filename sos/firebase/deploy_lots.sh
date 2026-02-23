#!/bin/bash
PROJECT="sos-urgently-ac307"
PAUSE=120

echo "========================================="
echo "DEPLOIEMENT PAR LOTS - SOS EXPAT"
echo "========================================="

echo ""
echo "=== PHASE 0 — Suppression des fonctions FAILED/UNKNOWN bloquées ==="
echo "--- Suppression des 5 FAILED (CloudRunServiceNotFound) ---"

firebase functions:delete getBloggerDirectory --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getBloggerDirectory"
firebase functions:delete getChatterDirectory --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getChatterDirectory"
firebase functions:delete getGroupAdminDirectory --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getGroupAdminDirectory"
firebase functions:delete getInfluencerDirectory --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getInfluencerDirectory"
firebase functions:delete twilioRecordingWebhook --region europe-west1 --project $PROJECT --force 2>&1 || echo "SKIP twilioRecordingWebhook (west1)"

echo ""
echo "--- Suppression des 12 UNKNOWN ---"

firebase functions:delete adminCreateMessageTemplate --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminCreateMessageTemplate"
firebase functions:delete adminDeleteMessageTemplate --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminDeleteMessageTemplate"
firebase functions:delete adminResetMessageTemplatesToDefaults --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminResetMessageTemplatesToDefaults"
firebase functions:delete adminSeedMessageTemplates --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminSeedMessageTemplates"
firebase functions:delete adminToggleFlashBonus --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminToggleFlashBonus"
firebase functions:delete adminUpdateChatterConfigSettings --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminUpdateChatterConfigSettings"
firebase functions:delete adminUpdateMessageTemplate --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP adminUpdateMessageTemplate"
firebase functions:delete chatterRegisterFcmToken --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP chatterRegisterFcmToken"
firebase functions:delete chatterUnregisterFcmToken --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP chatterUnregisterFcmToken"
firebase functions:delete getAvailableCountriesForChatter --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getAvailableCountriesForChatter"
firebase functions:delete getBloggerRecruits --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getBloggerRecruits"
firebase functions:delete getChatterMessageTemplates --region europe-west2 --project $PROJECT --force 2>&1 || echo "SKIP getChatterMessageTemplates"

echo ""
echo "=== Suppression terminée. Pause ${PAUSE}s pour laisser GCP nettoyer... ==="
sleep $PAUSE

echo ""
echo "=== PHASE 1 — Redéploiement des fonctions supprimées ==="

echo ""
echo "=== LOT 1a — 4 Directory europe-west2 ==="
firebase deploy --only "functions:getBloggerDirectory,functions:getChatterDirectory,functions:getGroupAdminDirectory,functions:getInfluencerDirectory" --project $PROJECT --force
echo "LOT 1a OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== LOT 1b — twilioRecordingWebhook europe-west3 ==="
firebase deploy --only "functions:twilioRecordingWebhook" --project $PROJECT --force
echo "LOT 1b OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== LOT 2a — 5 admin europe-west2 ==="
firebase deploy --only "functions:adminCreateMessageTemplate,functions:adminDeleteMessageTemplate,functions:adminResetMessageTemplatesToDefaults,functions:adminSeedMessageTemplates,functions:adminToggleFlashBonus" --project $PROJECT --force
echo "LOT 2a OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== LOT 2b — 5 admin europe-west2 ==="
firebase deploy --only "functions:adminUpdateChatterConfigSettings,functions:adminUpdateMessageTemplate,functions:chatterRegisterFcmToken,functions:chatterUnregisterFcmToken,functions:getAvailableCountriesForChatter" --project $PROJECT --force
echo "LOT 2b OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== LOT 2c — 2 europe-west2 ==="
firebase deploy --only "functions:getBloggerRecruits,functions:getChatterMessageTemplates" --project $PROJECT --force
echo "LOT 2c OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== PHASE 2 — Nouvelles fonctions monitoring ==="

echo ""
echo "=== LOT 3a — 4 monitoring europe-west1 ==="
firebase deploy --only "functions:getFunctionalAlerts,functions:getFunctionalHealthSummary,functions:resolveFunctionalAlert,functions:triggerFunctionalCheck" --project $PROJECT --force
echo "LOT 3a OK - pause ${PAUSE}s..."
sleep $PAUSE

echo ""
echo "=== LOT 3b — 3 monitoring europe-west3 ==="
firebase deploy --only "functions:cleanupFunctionalData,functions:runCriticalFunctionalCheck,functions:runFunctionalHealthCheck" --project $PROJECT --force
echo "LOT 3b OK"

echo ""
echo "========================================="
echo "DEPLOIEMENT TERMINE - TOUS LES LOTS OK"
echo "========================================="

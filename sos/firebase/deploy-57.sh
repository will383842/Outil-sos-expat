#!/bin/bash
cd /c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase
LOG="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase/deploy-57.log"
> "$LOG"
FUNCS=(assignCountriesToCurrentChatter adminGetCountryRotationStatus adminInitializeCountryRotation adminGetChatterConfigSettings adminInitializeChatterConfigSettings adminToggleFlashBonus adminUpdateChatterConfigSettings getChatterMessageTemplates adminSeedMessageTemplates adminCreateMessageTemplate adminUpdateMessageTemplate adminDeleteMessageTemplate adminResetMessageTemplatesToDefaults initializeMessageTemplates chatterNotifyCommissionEarned chatterNotifyFlashBonusStart chatterNotifyInactiveMembers chatterNotifyNearTop3 chatterNotifyTeamMemberActivated chatterNotifyTierBonusUnlocked chatterRegisterFcmToken chatterUnregisterFcmToken chatterCreateWeeklyChallenge chatterUpdateChallengeLeaderboard chatterEndWeeklyChallenge chatterTierBonusCheck chatterMonthlyTop3Rewards chatterAggregateActivityFeed getCurrentChallenge getChallengeHistory getAvailableCountriesForChatter getBloggerRecruits resetBillingCycleQuotas cleanupExpiredDocuments aggregateCostMetrics twilioRecordingWebhook savePaymentMethod getPaymentMethods deletePaymentMethod setDefaultPaymentMethod cancelWithdrawal getWithdrawalStatus getWithdrawalHistory adminApproveWithdrawal adminRejectWithdrawal adminGetPaymentConfig adminUpdatePaymentConfig adminGetPendingWithdrawals adminGetPaymentStats adminGetAuditLogs adminGetAuditLogActions adminExportWithdrawals)
BATCH_SIZE=5
for (( i=0; i<${#FUNCS[@]}; i+=BATCH_SIZE )); do
  BATCH=("${FUNCS[@]:$i:$BATCH_SIZE}")
  SPEC=$(printf "functions:%s," "${BATCH[@]}" | sed 's/,$//')
  LOT=$(( i/BATCH_SIZE + 1 ))
  echo "[$(date '+%H:%M:%S')] LOT $LOT/${#FUNCS[@]} : ${BATCH[*]}" | tee -a "$LOG"
  firebase deploy --only "$SPEC" --project sos-urgently-ac307 --force 2>&1 | tee -a "$LOG"
  echo "[EXIT: $?]" | tee -a "$LOG"
  echo "pause 90s..." | tee -a "$LOG"
  sleep 90
done
echo "[$(date '+%H:%M:%S')] TERMINE" | tee -a "$LOG"

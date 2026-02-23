#!/bin/bash
# =============================================================================
# DEPLOY NÉCESSAIRE UNIQUEMENT
# - 4 fonctions register (fix CORS critique)
# - 26 fonctions nouvelles (in_code_not_deployed)
# Lots de 2, pause 30s entre chaque
# =============================================================================

PROJECT="sos-urgently-ac307"
FIREBASE_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase"
LOG_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/deploy_necessary_$(date +%Y%m%d_%H%M%S).log"

log()     { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
success() { echo "[$(date '+%H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"; }
fail()    { echo "[$(date '+%H:%M:%S')] ❌ $1" | tee -a "$LOG_FILE"; }

# Liste des fonctions nécessaires (4 register CORS + 26 nouvelles)
FUNCTIONS=(
  # === PRIORITÉ 1 : Fix CORS register ===
  registerChatter
  registerInfluencer
  registerBlogger
  registerGroupAdmin

  # === PRIORITÉ 2 : Nouvelles fonctions (in_code_not_deployed) ===
  adminCreateBackup
  adminGetGroupAdminPromotionStats
  adminGetInfluencerPromotionStats
  adminToggleBloggerVisibility
  adminToggleChatterVisibility
  adminToggleGroupAdminVisibility
  adminToggleInfluencerVisibility
  adminUpdateGroupAdminPromotion
  adminUpdateGroupAdminVisibility
  awardBloggerRecruitmentCommission
  bulkUnblockProviders
  bulkUnhideProviders
  bulkUnsuspendProviders
  checkBlockedEntity
  checkBloggerClientReferral
  checkBloggerProviderRecruitment
  createSecurityAlertHttp
  deactivateExpiredRecruitments
  getBloggerDirectory
  getGroupAdminDirectory
  getInfluencerDirectory
  initializeInfluencerConfig
  recordAiCall
  retryFailedTransfersForProvider
  setFreeAiAccess
  stopAutorespondersForUser
)

TOTAL=${#FUNCTIONS[@]}
log "=========================================="
log "DÉPLOIEMENT CIBLÉ - LOTS DE 2 - $(date)"
log "Total: $TOTAL fonctions ($((TOTAL/2+1)) lots)"
log "=========================================="

BATCH_NUM=0
DEPLOYED=0
FAILED=0
i=0

while [ $i -lt $TOTAL ]; do
  BATCH_NUM=$((BATCH_NUM + 1))

  F1="${FUNCTIONS[$i]}"
  F2="${FUNCTIONS[$((i+1))]:-}"

  if [ -n "$F2" ]; then
    SPEC="functions:${F1},functions:${F2}"
    LABEL="$F1 + $F2"
    COUNT=2
  else
    SPEC="functions:${F1}"
    LABEL="$F1"
    COUNT=1
  fi

  log "Lot $BATCH_NUM | $LABEL"

  OUTPUT=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
  EXIT_CODE=$?

  if echo "$OUTPUT" | grep -q "Deploy complete"; then
    success "OK: $LABEL"
    DEPLOYED=$((DEPLOYED + COUNT))
  elif echo "$OUTPUT" | grep -qi "RESOURCE_EXHAUSTED\|quota\|429"; then
    log "⚠️  Quota — pause 3 min"
    sleep 180
    OUTPUT2=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
    if echo "$OUTPUT2" | grep -q "Deploy complete"; then
      success "OK (retry): $LABEL"
      DEPLOYED=$((DEPLOYED + COUNT))
    else
      fail "ÉCHEC: $LABEL"
      FAILED=$((FAILED + COUNT))
    fi
  else
    fail "ÉCHEC ($EXIT_CODE): $LABEL"
    echo "  >> $(echo "$OUTPUT" | grep -iE "error|Error|failed" | head -2)" >> "$LOG_FILE"
    FAILED=$((FAILED + COUNT))
  fi

  i=$((i + 2))

  if [ $i -lt $TOTAL ]; then
    log "  ⏳ Pause 30s..."
    sleep 30
  fi
done

log "=========================================="
log "TERMINÉ: ✅ $DEPLOYED déployées | ❌ $FAILED échouées"
log "Log: $LOG_FILE"
log "=========================================="

#!/bin/bash
# =============================================================================
# AUTO-DEPLOY v2 - Lots de 2 fonctions, 30s pause
# Sans sleep initial (CI a déjà été déclenché)
# =============================================================================

PROJECT="sos-urgently-ac307"
FIREBASE_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase"
LOG_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/deploy_log2_$(date +%Y%m%d_%H%M%S).txt"
FAILED_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/deploy_failed2.txt"

ALL_FUNCS_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/verified_function_names.txt"
NEW_FUNCS_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/in_code_not_deployed.txt"
MERGED_FILE="/tmp/all_functions_to_deploy2.txt"

cat "$ALL_FUNCS_FILE" "$NEW_FUNCS_FILE" | sort -u > "$MERGED_FILE"
mapfile -t FUNCTIONS < "$MERGED_FILE"
TOTAL=${#FUNCTIONS[@]}

> "$FAILED_FILE"

log()     { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
success() { echo "[$(date '+%H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"; }
fail()    { echo "[$(date '+%H:%M:%S')] ❌ $1" | tee -a "$LOG_FILE"; echo "$1" >> "$FAILED_FILE"; }

log "=========================================="
log "DÉPLOIEMENT - LOTS DE 2 - $(date)"
log "Total fonctions: $TOTAL"
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

  log "Lot $BATCH_NUM/$((TOTAL/2+1)) | $LABEL"

  OUTPUT=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ] || echo "$OUTPUT" | grep -q "Deploy complete"; then
    success "OK: $LABEL"
    DEPLOYED=$((DEPLOYED + COUNT))
  elif echo "$OUTPUT" | grep -qi "RESOURCE_EXHAUSTED\|quota\|429"; then
    log "⚠️  Quota — pause 3 min"
    sleep 180
    OUTPUT2=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
    if [ $? -eq 0 ] || echo "$OUTPUT2" | grep -q "Deploy complete"; then
      success "OK (retry): $LABEL"
      DEPLOYED=$((DEPLOYED + COUNT))
    else
      fail "ÉCHEC: $LABEL"
      FAILED=$((FAILED + COUNT))
    fi
  else
    # Vérifier malgré tout si "Deploy complete" est dans l'output
    if echo "$OUTPUT" | grep -q "Deploy complete"; then
      success "OK (avec warnings): $LABEL"
      DEPLOYED=$((DEPLOYED + COUNT))
    else
      fail "ÉCHEC: $LABEL"
      echo "  >> $(echo "$OUTPUT" | grep -i "error\|Error" | head -2)" >> "$LOG_FILE"
      FAILED=$((FAILED + COUNT))
    fi
  fi

  i=$((i + 2))

  if [ $i -lt $TOTAL ]; then
    sleep 30
  fi
done

log "=========================================="
log "TERMINÉ: ✅ $DEPLOYED déployées | ❌ $FAILED échouées"
log "Log: $LOG_FILE"
if [ -s "$FAILED_FILE" ]; then
  log "Échecs: $FAILED_FILE"
fi
log "=========================================="

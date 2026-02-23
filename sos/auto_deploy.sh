#!/bin/bash
# =============================================================================
# AUTO-DEPLOY - Lots de 2 fonctions, 30s de pause entre chaque lot
# Sleep initial de 10 minutes
# =============================================================================

set -o pipefail

PROJECT="sos-urgently-ac307"
FIREBASE_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase"
LOG_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/deploy_log_$(date +%Y%m%d_%H%M%S).txt"
FAILED_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/deploy_failed_$(date +%Y%m%d_%H%M%S).txt"

# Toutes les fonctions (verified + non déployées)
ALL_FUNCS_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/verified_function_names.txt"
NEW_FUNCS_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/in_code_not_deployed.txt"

# Merge + dédoublonnage
MERGED_FILE="/tmp/all_functions_to_deploy.txt"
cat "$ALL_FUNCS_FILE" "$NEW_FUNCS_FILE" | sort -u > "$MERGED_FILE"
TOTAL=$(wc -l < "$MERGED_FILE")

> "$FAILED_FILE"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
success() { echo "[$(date '+%H:%M:%S')] ✅ $1" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $1" | tee -a "$LOG_FILE"; echo "$1" >> "$FAILED_FILE"; }

log "=========================================="
log "DÉPLOIEMENT FIREBASE FUNCTIONS - LOTS DE 2"
log "Total fonctions: $TOTAL"
log "Log: $LOG_FILE"
log "=========================================="

# ============ SLEEP INITIAL 10 MINUTES ============
log "⏳ Attente initiale de 10 minutes pour stabilisation CI..."
for i in $(seq 10 -1 1); do
  log "  Démarrage dans ${i} minute(s)..."
  sleep 60
done
log "🚀 Démarrage du déploiement !"

# ============ DÉPLOIEMENT PAR LOTS DE 2 ============
BATCH_NUM=0
DEPLOYED=0
FAILED=0

mapfile -t FUNCTIONS < "$MERGED_FILE"
TOTAL=${#FUNCTIONS[@]}

i=0
while [ $i -lt $TOTAL ]; do
  BATCH_NUM=$((BATCH_NUM + 1))

  # Construire le lot de 2
  F1="${FUNCTIONS[$i]}"
  F2="${FUNCTIONS[$((i+1))]:-}"

  if [ -n "$F2" ]; then
    SPEC="functions:${F1},functions:${F2}"
    LABEL="$F1 + $F2"
  else
    SPEC="functions:${F1}"
    LABEL="$F1"
  fi

  log "Lot $BATCH_NUM | $LABEL"

  OUTPUT=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ] || echo "$OUTPUT" | grep -q "Deploy complete\|Function.*deployed"; then
    success "Lot $BATCH_NUM OK: $LABEL"
    DEPLOYED=$((DEPLOYED + (F2 != "" ? 2 : 1)))
  elif echo "$OUTPUT" | grep -qi "RESOURCE_EXHAUSTED\|quota\|429"; then
    log "⚠️  Quota hit — pause 3 minutes"
    sleep 180
    # Retry
    OUTPUT2=$(cd "$FIREBASE_DIR" && firebase deploy --only "$SPEC" --project "$PROJECT" --force 2>&1)
    if [ $? -eq 0 ] || echo "$OUTPUT2" | grep -q "Deploy complete"; then
      success "Lot $BATCH_NUM OK (retry): $LABEL"
      DEPLOYED=$((DEPLOYED + (F2 != "" ? 2 : 1)))
    else
      fail "Lot $BATCH_NUM ÉCHEC: $LABEL"
      FAILED=$((FAILED + (F2 != "" ? 2 : 1)))
    fi
  else
    # Certaines erreurs sont bénignes (fonction déjà supprimée, etc.)
    if echo "$OUTPUT" | grep -q "Deploy complete"; then
      success "Lot $BATCH_NUM OK (avec warnings): $LABEL"
      DEPLOYED=$((DEPLOYED + (F2 != "" ? 2 : 1)))
    else
      fail "Lot $BATCH_NUM ÉCHEC: $LABEL"
      echo "  Output: $(echo "$OUTPUT" | tail -3)" >> "$LOG_FILE"
      FAILED=$((FAILED + (F2 != "" ? 2 : 1)))
    fi
  fi

  i=$((i + 2))

  # Pause de 30 secondes (sauf dernier lot)
  if [ $i -lt $TOTAL ]; then
    sleep 30
  fi
done

# ============ RÉSUMÉ ============
log "=========================================="
log "DÉPLOIEMENT TERMINÉ"
log "  ✅ Succès : $DEPLOYED / $TOTAL"
log "  ❌ Échecs : $FAILED"
log "  📄 Log complet : $LOG_FILE"
if [ $FAILED -gt 0 ]; then
  log "  ⚠️  Fonctions échouées : $FAILED_FILE"
fi
log "=========================================="

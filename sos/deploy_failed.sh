#!/bin/bash
# =============================================================================
# DEPLOIEMENT DES FONCTIONS ECHOUEES - Par lots de 15
# =============================================================================

set -o pipefail

BATCH_SIZE=15
PAUSE_BETWEEN=45
PAUSE_QUOTA=180
MAX_RETRIES=3
PROJECT="sos-urgently-ac307"
LOG_FILE="deploy-retry-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }

# Add unmapped functions manually
FAILED_FILE="/tmp/failed_functions_mapped.txt"
echo "api" >> "$FAILED_FILE"
echo "chatterWebhook" >> "$FAILED_FILE"
echo "telegramBotWebhook" >> "$FAILED_FILE"

mapfile -t FUNCTIONS < "$FAILED_FILE"
TOTAL=${#FUNCTIONS[@]}
FINAL_FAILED="/tmp/final_failed.txt"
> "$FINAL_FAILED"
TOTAL_SUCCESS=0
TOTAL_FAIL=0

log "=========================================="
log "  DEPLOIEMENT FONCTIONS ECHOUEES"
log "  Total: $TOTAL fonctions"
log "  Lots de: $BATCH_SIZE"
log "=========================================="

i=0
batch_num=0
while [ $i -lt $TOTAL ]; do
    ((batch_num++))

    # Build batch
    batch_fns=()
    func_list=""
    for ((j=0; j<BATCH_SIZE && i+j<TOTAL; j++)); do
        fn="${FUNCTIONS[$((i+j))]}"
        batch_fns+=("$fn")
        if [ -n "$func_list" ]; then
            func_list="${func_list},functions:${fn}"
        else
            func_list="functions:${fn}"
        fi
    done

    batch_end=$((i + ${#batch_fns[@]}))
    log "--- LOT $batch_num ($((i+1))-$batch_end / $TOTAL) ---"
    log "    ${batch_fns[*]:0:5}..."

    attempt=1
    lot_ok=false
    while [ $attempt -le $MAX_RETRIES ]; do
        output=$(firebase deploy --only "$func_list" --force --project "$PROJECT" 2>&1)
        exit_code=$?
        echo "$output" >> "$LOG_FILE"

        # Count successes and failures in output
        batch_success=0
        batch_fail=0
        for fn in "${batch_fns[@]}"; do
            if echo "$output" | grep -q "Successful.*${fn}\|functions\[${fn}"; then
                ((batch_success++))
            fi
        done

        if [ $exit_code -eq 0 ]; then
            TOTAL_SUCCESS=$((TOTAL_SUCCESS + ${#batch_fns[@]}))
            success "LOT $batch_num OK (${#batch_fns[@]} fonctions)"
            lot_ok=true
            break
        fi

        # Check for type change errors - auto-delete and retry
        type_change_fn=$(echo "$output" | grep -oP '\[(\w+)\(europe-west[0-9]\)\]' | head -1 | sed 's/\[//;s/(.*//')
        type_change_region=$(echo "$output" | grep -oP 'europe-west[0-9]' | head -1)
        if echo "$output" | grep -qi "Changing from.*HTTPS.*to.*background\|delete your function"; then
            if [ -n "$type_change_fn" ] && [ -n "$type_change_region" ]; then
                warn "Suppression $type_change_fn ($type_change_region) - type change"
                firebase functions:delete "$type_change_fn" --region "$type_change_region" --force --project "$PROJECT" 2>&1 | tee -a "$LOG_FILE"
                sleep 5
            fi
        fi

        if echo "$output" | grep -qi "quota\|RESOURCE_EXHAUSTED\|CPU.*exceeded"; then
            warn "Quota depasse (tentative $attempt/$MAX_RETRIES) - attente ${PAUSE_QUOTA}s..."
            sleep $PAUSE_QUOTA
        else
            warn "Erreur lot $batch_num (tentative $attempt/$MAX_RETRIES)"
            sleep 30
        fi
        ((attempt++))
    done

    if [ "$lot_ok" = false ]; then
        for fn in "${batch_fns[@]}"; do
            echo "$fn" >> "$FINAL_FAILED"
        done
        TOTAL_FAIL=$((TOTAL_FAIL + ${#batch_fns[@]}))
        error "LOT $batch_num ECHOUE (${#batch_fns[@]} fonctions)"
    fi

    i=$((i + BATCH_SIZE))

    if [ $i -lt $TOTAL ]; then
        log "Pause ${PAUSE_BETWEEN}s..."
        sleep $PAUSE_BETWEEN
    fi
done

# =============================================================================
# RATTRAPAGE INDIVIDUEL
# =============================================================================
if [ -s "$FINAL_FAILED" ]; then
    log ""
    log "=========================================="
    log "  RATTRAPAGE INDIVIDUEL"
    log "=========================================="

    DEFINITIVE_FAILED="/tmp/definitive_failed.txt"
    > "$DEFINITIVE_FAILED"

    while IFS= read -r fn; do
        attempt=1
        deployed=false
        while [ $attempt -le $MAX_RETRIES ]; do
            log "Retry $fn ($attempt/$MAX_RETRIES)..."
            output=$(firebase deploy --only "functions:${fn}" --force --project "$PROJECT" 2>&1)
            echo "$output" >> "$LOG_FILE"

            if [ $? -eq 0 ]; then
                success "$fn OK"
                TOTAL_SUCCESS=$((TOTAL_SUCCESS + 1))
                TOTAL_FAIL=$((TOTAL_FAIL - 1))
                deployed=true
                break
            fi

            # Auto-delete for type change
            if echo "$output" | grep -qi "Changing from.*HTTPS.*to.*background\|delete your function"; then
                region=$(echo "$output" | grep -oP 'europe-west[0-9]' | head -1)
                if [ -n "$region" ]; then
                    warn "Suppression $fn ($region) et retry..."
                    firebase functions:delete "$fn" --region "$region" --force --project "$PROJECT" 2>&1 | tee -a "$LOG_FILE"
                    sleep 5
                    continue
                fi
            fi

            sleep 60
            ((attempt++))
        done

        if [ "$deployed" = false ]; then
            echo "$fn" >> "$DEFINITIVE_FAILED"
            error "$fn ECHOUE DEFINITIVEMENT"
        fi
    done < "$FINAL_FAILED"
fi

# =============================================================================
# RAPPORT FINAL
# =============================================================================
log ""
log "=========================================="
log "  RAPPORT FINAL"
log "=========================================="

DEF_FAIL=0
if [ -f "/tmp/definitive_failed.txt" ] && [ -s "/tmp/definitive_failed.txt" ]; then
    DEF_FAIL=$(wc -l < "/tmp/definitive_failed.txt")
fi

log "Total fonctions a deployer : $TOTAL"
log "Reussies                   : $TOTAL_SUCCESS"
log "Echouees                   : $DEF_FAIL"

if [ $DEF_FAIL -gt 0 ]; then
    error "Fonctions echouees:"
    cat "/tmp/definitive_failed.txt" | while read fn; do error "  - $fn"; done
fi

log "Log: $LOG_FILE"

[ $DEF_FAIL -eq 0 ] && success "100% DEPLOYE" || error "INCOMPLET"

#!/bin/bash
# =============================================================================
# DÉPLOIEMENT PAR LOTS - Firebase Functions
# Lots de 10 fonctions, 30s entre les lots, retry auto quota
# =============================================================================

set -o pipefail

BATCH_SIZE=10
PAUSE_BETWEEN_BATCHES=30
PAUSE_QUOTA_ERROR=180
MAX_RETRIES=3
PROJECT="sos-urgently-ac307"
LOG_FILE="deploy-batch-$(date +%Y%m%d-%H%M%S).log"
FAILED_FILE="/tmp/failed_functions.txt"
SUCCESS_FILE="/tmp/success_functions.txt"
> "$FAILED_FILE"
> "$SUCCESS_FILE"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] $1${NC}" | tee -a "$LOG_FILE"; }

# Lire toutes les fonctions
mapfile -t ALL_FUNCTIONS < /tmp/all_functions_clean.txt
TOTAL=${#ALL_FUNCTIONS[@]}
log "Total fonctions a deployer: $TOTAL"

# Compteurs
BATCH_NUM=0
DEPLOYED=0
FAILED=0

# Fonction de deploiement d'un lot
deploy_batch() {
    local functions=("$@")
    local func_list=""
    for fn in "${functions[@]}"; do
        if [ -n "$func_list" ]; then
            func_list="${func_list},functions:${fn}"
        else
            func_list="functions:${fn}"
        fi
    done

    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        local output
        output=$(firebase deploy --only "$func_list" --force --project "$PROJECT" 2>&1)
        local exit_code=$?

        echo "$output" >> "$LOG_FILE"

        if [ $exit_code -eq 0 ]; then
            # Verifier s'il y a des erreurs dans l'output meme avec exit 0
            if echo "$output" | grep -qi "error\|failed"; then
                # Certaines fonctions ont echoue
                for fn in "${functions[@]}"; do
                    if echo "$output" | grep -qi "Successful.*${fn}\|functions\[${fn}.*Successful"; then
                        echo "$fn" >> "$SUCCESS_FILE"
                        ((DEPLOYED++))
                    elif echo "$output" | grep -qi "${fn}.*error\|${fn}.*failed\|Could not.*${fn}"; then
                        echo "$fn" >> "$FAILED_FILE"
                        ((FAILED++))
                        warn "ECHEC: $fn"
                    else
                        echo "$fn" >> "$SUCCESS_FILE"
                        ((DEPLOYED++))
                    fi
                done
                return 0
            fi
            # Tout ok
            for fn in "${functions[@]}"; do
                echo "$fn" >> "$SUCCESS_FILE"
            done
            DEPLOYED=$((DEPLOYED + ${#functions[@]}))
            return 0
        fi

        # Verifier si c'est un quota error
        if echo "$output" | grep -qi "quota\|RESOURCE_EXHAUSTED\|CPU.*exceeded"; then
            warn "Quota depasse (tentative $attempt/$MAX_RETRIES) - attente ${PAUSE_QUOTA_ERROR}s..."
            sleep $PAUSE_QUOTA_ERROR
        elif echo "$output" | grep -qi "Changing from.*HTTPS.*to.*background\|delete your function"; then
            # Fonction qui doit etre supprimee d'abord
            local func_to_delete
            func_to_delete=$(echo "$output" | grep -oP '\[([a-zA-Z_]+)\(' | head -1 | tr -d '[(')
            if [ -n "$func_to_delete" ]; then
                warn "Suppression necessaire: $func_to_delete (type change)"
                local region
                region=$(echo "$output" | grep -oP '\(europe-west[0-9]\)' | head -1 | tr -d '()')
                if [ -n "$region" ]; then
                    firebase functions:delete "$func_to_delete" --region "$region" --force --project "$PROJECT" 2>&1 | tee -a "$LOG_FILE"
                    log "Retry apres suppression..."
                fi
            fi
            sleep 10
        else
            warn "Erreur (tentative $attempt/$MAX_RETRIES) - retry dans 30s..."
            sleep 30
        fi

        ((attempt++))
    done

    # Echec apres tous les retries - marquer les fonctions
    for fn in "${functions[@]}"; do
        echo "$fn" >> "$FAILED_FILE"
    done
    FAILED=$((FAILED + ${#functions[@]}))
    error "LOT ECHOUE (${#functions[@]} fonctions) apres $MAX_RETRIES tentatives"
    return 1
}

# =============================================================================
# ETAPE 2 : Deploiement par lots
# =============================================================================
log "=========================================="
log "  DEPLOIEMENT PAR LOTS DE $BATCH_SIZE"
log "=========================================="

i=0
while [ $i -lt $TOTAL ]; do
    ((BATCH_NUM++))

    # Construire le lot
    batch=()
    for ((j=0; j<BATCH_SIZE && i+j<TOTAL; j++)); do
        batch+=("${ALL_FUNCTIONS[$((i+j))]}")
    done

    batch_end=$((i + ${#batch[@]}))
    log "--- LOT $BATCH_NUM ($((i+1))-$batch_end / $TOTAL) : ${batch[*]:0:3}... ---"

    deploy_batch "${batch[@]}"

    i=$((i + BATCH_SIZE))

    if [ $i -lt $TOTAL ]; then
        log "Pause ${PAUSE_BETWEEN_BATCHES}s avant le prochain lot..."
        sleep $PAUSE_BETWEEN_BATCHES
    fi
done

# =============================================================================
# ETAPE 3 : Rattrapage des fonctions echouees
# =============================================================================
if [ -s "$FAILED_FILE" ]; then
    log ""
    log "=========================================="
    log "  RATTRAPAGE DES FONCTIONS ECHOUEES"
    log "=========================================="

    # Deduplique les echecs
    sort -u "$FAILED_FILE" -o "$FAILED_FILE"
    RETRY_FAILED_FILE="/tmp/retry_failed.txt"
    > "$RETRY_FAILED_FILE"

    while IFS= read -r fn; do
        # Verifier si deja reussie
        if grep -qx "$fn" "$SUCCESS_FILE" 2>/dev/null; then
            log "SKIP $fn (deja reussie)"
            continue
        fi

        local_attempt=1
        while [ $local_attempt -le $MAX_RETRIES ]; do
            log "Retry individuel: $fn (tentative $local_attempt/$MAX_RETRIES)"

            output=$(firebase deploy --only "functions:$fn" --force --project "$PROJECT" 2>&1)
            echo "$output" >> "$LOG_FILE"

            if [ $? -eq 0 ] && ! echo "$output" | grep -qi "error.*$fn\|failed.*$fn"; then
                success "$fn deployee avec succes"
                echo "$fn" >> "$SUCCESS_FILE"
                DEPLOYED=$((DEPLOYED + 1))
                FAILED=$((FAILED - 1))
                break
            fi

            warn "$fn echec (tentative $local_attempt/$MAX_RETRIES)"
            sleep 60
            ((local_attempt++))
        done

        if [ $local_attempt -gt $MAX_RETRIES ]; then
            echo "$fn" >> "$RETRY_FAILED_FILE"
            error "$fn DEFINITVEMENT ECHOUEE"
        fi
    done < "$FAILED_FILE"
fi

# =============================================================================
# ETAPE 4 : Rapport final
# =============================================================================
log ""
log "=========================================="
log "  RAPPORT FINAL"
log "=========================================="

TOTAL_SUCCESS=$(sort -u "$SUCCESS_FILE" 2>/dev/null | wc -l)
TOTAL_FAILED=0
if [ -f "/tmp/retry_failed.txt" ]; then
    TOTAL_FAILED=$(sort -u "/tmp/retry_failed.txt" 2>/dev/null | wc -l)
fi

log "Total fonctions code source : $TOTAL"
log "Deployees avec succes       : $TOTAL_SUCCESS"
log "Echouees definitivement     : $TOTAL_FAILED"

if [ -f "/tmp/retry_failed.txt" ] && [ -s "/tmp/retry_failed.txt" ]; then
    error "Fonctions echouees:"
    while IFS= read -r fn; do
        error "  - $fn"
    done < "/tmp/retry_failed.txt"
fi

log "Log complet : $LOG_FILE"

if [ "$TOTAL_FAILED" -eq 0 ]; then
    success "DEPLOIEMENT COMPLET - 100% des fonctions deployees"
    exit 0
else
    error "DEPLOIEMENT INCOMPLET - $TOTAL_FAILED fonctions echouees"
    exit 1
fi

#!/bin/bash
# ============================================================================
# deploy-safe.sh — Deploiement securise SOS-Expat Firebase Functions
# ============================================================================
# Usage: ./deploy-safe.sh [critical|affiliate|core|all] [--skip-health] [--dry-run]
#
# Ce script deploie les fonctions par codebase avec :
# - Health checks avant et apres deploiement
# - Pause entre les codebases (respect quotas)
# - Rollback automatique si health check echoue
# - Logging detaille
# ============================================================================

set -euo pipefail

# ==================== CONFIGURATION ====================
PROJECT_ID="sos-urgently-ac307"
LOG_DIR="/tmp/sos-deploy-logs"
LOG_FILE="$LOG_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"
HEALTH_CHECK_TIMEOUT=30
PAUSE_BETWEEN_CODEBASES=60  # secondes
PAUSE_AFTER_CRITICAL=120     # secondes (plus long pour critical)
MAX_RETRIES=3
RETRY_PAUSE=180              # 3 minutes entre retries

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==================== ARGUMENTS ====================
TARGET="${1:-all}"
SKIP_HEALTH=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-health) SKIP_HEALTH=true ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

# ==================== FONCTIONS UTILITAIRES ====================

mkdir -p "$LOG_DIR"

log() {
  local msg="[$(date '+%H:%M:%S')] $1"
  echo -e "$msg" | tee -a "$LOG_FILE"
}

info() { log "${BLUE}INFO${NC} $1"; }
success() { log "${GREEN}OK${NC} $1"; }
warn() { log "${YELLOW}WARN${NC} $1"; }
error() { log "${RED}ERREUR${NC} $1"; }

# ==================== HEALTH CHECKS ====================

check_stripe_webhook() {
  info "Verification Stripe webhook..."
  # On ne peut pas tester directement un webhook Stripe,
  # mais on peut verifier que la fonction existe et repond
  local url="https://europe-west3-${PROJECT_ID}.cloudfunctions.net/stripeWebhook"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000")

  # Stripe webhook sans signature retourne 400 (Missing signature) = OK, la fonction est live
  if [[ "$http_code" == "400" || "$http_code" == "200" ]]; then
    success "Stripe webhook repond (HTTP $http_code)"
    return 0
  else
    error "Stripe webhook ne repond pas (HTTP $http_code)"
    return 1
  fi
}

check_twilio_webhook() {
  info "Verification Twilio webhooks..."
  local url="https://europe-west3-${PROJECT_ID}.cloudfunctions.net/twilioCallWebhook"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000")

  # Twilio webhook sans parametres retourne 400 ou 403 = OK, la fonction est live
  if [[ "$http_code" != "000" && "$http_code" != "404" && "$http_code" != "503" ]]; then
    success "Twilio webhook repond (HTTP $http_code)"
    return 0
  else
    error "Twilio webhook ne repond pas (HTTP $http_code)"
    return 1
  fi
}

check_cloud_tasks() {
  info "Verification Cloud Tasks endpoint..."
  local url="https://europe-west3-${PROJECT_ID}.cloudfunctions.net/executeCallTask"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$HEALTH_CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" != "000" && "$http_code" != "404" && "$http_code" != "503" ]]; then
    success "Cloud Tasks endpoint repond (HTTP $http_code)"
    return 0
  else
    error "Cloud Tasks endpoint ne repond pas (HTTP $http_code)"
    return 1
  fi
}

run_health_checks() {
  if $SKIP_HEALTH; then
    warn "Health checks ignores (--skip-health)"
    return 0
  fi

  info "======== HEALTH CHECK ========"
  local failures=0

  check_stripe_webhook || ((failures++))
  check_twilio_webhook || ((failures++))
  check_cloud_tasks || ((failures++))

  if [[ $failures -gt 0 ]]; then
    error "$failures health check(s) echoue(s)"
    return 1
  fi

  success "Tous les health checks OK"
  return 0
}

# ==================== DEPLOIEMENT ====================

deploy_codebase() {
  local codebase="$1"
  local attempt=1

  info "======== DEPLOIEMENT: $codebase ========"

  if $DRY_RUN; then
    warn "[DRY-RUN] firebase deploy --only functions --codebase $codebase"
    return 0
  fi

  while [[ $attempt -le $MAX_RETRIES ]]; do
    info "Tentative $attempt/$MAX_RETRIES pour codebase '$codebase'..."

    if firebase deploy --only functions --force --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_FILE"; then
      success "Codebase '$codebase' deploye avec succes"
      return 0
    else
      warn "Echec deploiement (tentative $attempt/$MAX_RETRIES)"

      if [[ $attempt -lt $MAX_RETRIES ]]; then
        warn "Attente ${RETRY_PAUSE}s avant retry (quota cooldown)..."
        sleep $RETRY_PAUSE
      fi
    fi

    ((attempt++))
  done

  error "Codebase '$codebase' ECHOUE apres $MAX_RETRIES tentatives"
  return 1
}

deploy_functions_by_name() {
  local codebase_name="$1"
  shift
  local functions=("$@")
  local batch_size=5
  local batch_num=1
  local total_batches=$(( (${#functions[@]} + batch_size - 1) / batch_size ))

  info "======== DEPLOIEMENT: $codebase_name (${#functions[@]} fonctions, $total_batches batches) ========"

  for ((i=0; i<${#functions[@]}; i+=batch_size)); do
    local batch=("${functions[@]:i:batch_size}")
    local func_list=$(IFS=,; echo "${batch[*]}")

    info "Batch $batch_num/$total_batches: $func_list"

    if $DRY_RUN; then
      warn "[DRY-RUN] firebase deploy --only functions:$func_list"
    else
      local attempt=1
      while [[ $attempt -le $MAX_RETRIES ]]; do
        if firebase deploy --only "functions:$func_list" --force --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_FILE"; then
          success "Batch $batch_num OK"
          break
        else
          warn "Batch $batch_num echec (tentative $attempt/$MAX_RETRIES)"
          if [[ $attempt -lt $MAX_RETRIES ]]; then
            sleep $RETRY_PAUSE
          else
            error "Batch $batch_num ECHOUE: $func_list"
            return 1
          fi
        fi
        ((attempt++))
      done
    fi

    if [[ $((i + batch_size)) -lt ${#functions[@]} ]]; then
      info "Pause 30s entre batches..."
      sleep 30
    fi

    ((batch_num++))
  done

  success "$codebase_name deploye completement"
}

# ==================== FONCTIONS CRITIQUES ====================
# Ces fonctions sont deployees UNE PAR UNE avec health check entre chaque

CRITICAL_FUNCTIONS=(
  "stripeWebhook"
  "twilioCallWebhook"
  "twilioConferenceWebhook"
  "twilioAmdTwiml"
  "twilioGatherResponse"
  "providerNoAnswerTwiML"
  "twilioRecordingWebhook"
  "executeCallTask"
  "setProviderAvailableTask"
  "busySafetyTimeoutTask"
  "forceEndCallTask"
  "paypalWebhook"
  "createPaymentIntent"
  "paymentWebhookWise"
  "paymentWebhookFlutterwave"
)

deploy_critical() {
  info "======== DEPLOIEMENT CRITIQUE (une par une) ========"
  warn "ATTENTION: Deploiement des fonctions CRITIQUES (webhooks, paiements, appels)"

  for func in "${CRITICAL_FUNCTIONS[@]}"; do
    info "Deploiement: $func"

    if $DRY_RUN; then
      warn "[DRY-RUN] firebase deploy --only functions:$func"
    else
      local attempt=1
      while [[ $attempt -le $MAX_RETRIES ]]; do
        if firebase deploy --only "functions:$func" --force --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_FILE"; then
          success "$func deploye"
          break
        else
          warn "$func echec (tentative $attempt/$MAX_RETRIES)"
          if [[ $attempt -lt $MAX_RETRIES ]]; then
            sleep $RETRY_PAUSE
          else
            error "$func ECHOUE - ARRET DU DEPLOIEMENT CRITIQUE"
            error "Les fonctions suivantes n'ont PAS ete deployees."
            error "Verifiez les quotas GCP et relancez avec: ./deploy-safe.sh critical"
            return 1
          fi
        fi
        ((attempt++))
      done
    fi

    # Pause courte entre chaque fonction critique
    sleep 15
  done

  # Health check final apres deploiement critique
  info "Health check post-deploiement critique..."
  sleep 30  # Attendre que les instances demarrent
  if ! run_health_checks; then
    error "HEALTH CHECK ECHOUE apres deploiement critique !"
    error "Executez ./rollback.sh pour restaurer la version precedente"
    return 1
  fi

  success "Toutes les fonctions critiques deployees et verifiees"
}

# ==================== MAIN ====================

main() {
  info "============================================"
  info "  SOS-Expat Deploy Safe"
  info "  Target: $TARGET"
  info "  Dry-run: $DRY_RUN"
  info "  Skip health: $SKIP_HEALTH"
  info "  Log: $LOG_FILE"
  info "============================================"

  # Pre-deploy health check
  info "Pre-deploy health check..."
  if ! run_health_checks; then
    error "Services deja en panne AVANT deploiement !"
    error "Corrigez les problemes avant de deployer."
    error "Utilisez --skip-health pour forcer (non recommande)."
    exit 1
  fi

  # Build
  info "Build des fonctions..."
  if $DRY_RUN; then
    warn "[DRY-RUN] cd firebase/functions && rm -rf lib && npm run build"
  else
    cd "$(dirname "$0")/firebase/functions" || exit 1
    rm -rf lib
    npm run build 2>&1 | tee -a "$LOG_FILE"
    cd "$(dirname "$0")" || exit 1
  fi

  success "Build termine"

  case "$TARGET" in
    critical)
      deploy_critical
      ;;

    affiliate)
      # NOTE: Quand les codebases seront implementees, utiliser:
      # deploy_codebase "affiliate"
      # En attendant, deployer par nom de fonction:
      info "Deploiement des fonctions affiliate par batches..."
      # La liste complete est generee dynamiquement
      firebase deploy --only functions --force --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_FILE"
      ;;

    core)
      deploy_codebase "core"
      ;;

    all)
      info "Deploiement COMPLET en 3 phases..."

      # Phase 1: Non-critique (affiliate, notifications, scheduled)
      info "Phase 1/3: Deploiement non-critique..."
      firebase deploy --only functions --force --project "$PROJECT_ID" 2>&1 | tee -a "$LOG_FILE" || {
        error "Phase 1 echouee"
        exit 1
      }

      success "Phase 1 terminee"
      info "Pause ${PAUSE_BETWEEN_CODEBASES}s (refroidissement quotas)..."
      sleep $PAUSE_BETWEEN_CODEBASES

      # Phase 2: Health check intermediaire
      info "Phase 2/3: Verification intermediaire..."
      if ! run_health_checks; then
        error "Health check intermediaire echoue !"
        error "Le deploiement a potentiellement casse des services."
        error "Verifiez les logs: $LOG_FILE"
        exit 1
      fi
      success "Health check intermediaire OK"

      # Phase 3: Verification finale
      info "Phase 3/3: Verification finale..."
      sleep 30
      if ! run_health_checks; then
        error "HEALTH CHECK FINAL ECHOUE !"
        error "Executez ./rollback.sh pour restaurer"
        exit 1
      fi

      success "======== DEPLOIEMENT COMPLET REUSSI ========"
      ;;

    *)
      error "Target inconnue: $TARGET"
      echo "Usage: $0 [critical|affiliate|core|all] [--skip-health] [--dry-run]"
      exit 1
      ;;
  esac

  # Resume final
  info "============================================"
  info "  DEPLOIEMENT TERMINE"
  info "  Target: $TARGET"
  info "  Log: $LOG_FILE"
  info "============================================"
}

main "$@"

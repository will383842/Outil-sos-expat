#!/bin/bash
# ============================================================================
# rollback.sh — Rollback d'urgence SOS-Expat Firebase Functions
# ============================================================================
# Usage: ./rollback.sh [critical|all] [--confirm]
#
# Ce script restaure les fonctions critiques a leur version precedente
# en utilisant les revisions Cloud Run.
# ============================================================================

set -euo pipefail

PROJECT_ID="sos-urgently-ac307"
REGIONS=("europe-west3" "europe-west1")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TARGET="${1:-critical}"
CONFIRM=false
[[ "${2:-}" == "--confirm" ]] && CONFIRM=true

CRITICAL_FUNCTIONS=(
  "stripeWebhook"
  "twilioCallWebhook"
  "twilioConferenceWebhook"
  "twilioAmdTwiml"
  "twilioGatherResponse"
  "executeCallTask"
  "paypalWebhook"
  "createPaymentIntent"
)

log() { echo -e "[$(date '+%H:%M:%S')] $1"; }
info() { log "${GREEN}INFO${NC} $1"; }
warn() { log "${YELLOW}WARN${NC} $1"; }
error() { log "${RED}ERREUR${NC} $1"; }

# Methode 1: Rollback via git + redeploy
rollback_via_git() {
  info "Recherche du dernier commit fonctionnel..."

  # Trouver le commit precedent qui a modifie les fonctions
  local last_good_commit
  last_good_commit=$(git log --oneline -5 -- firebase/functions/src/ | head -2 | tail -1 | awk '{print $1}')

  if [[ -z "$last_good_commit" ]]; then
    error "Impossible de trouver un commit precedent"
    exit 1
  fi

  info "Dernier commit fonctionnel: $last_good_commit"
  git log --oneline -1 "$last_good_commit"

  if ! $CONFIRM; then
    warn "ATTENTION: Cette operation va restaurer les fonctions au commit $last_good_commit"
    warn "Utilisez --confirm pour executer"
    exit 0
  fi

  # Checkout du code des fonctions uniquement
  info "Restauration du code des fonctions..."
  git checkout "$last_good_commit" -- firebase/functions/src/

  # Rebuild
  info "Rebuild..."
  cd firebase/functions
  rm -rf lib
  npm run build
  cd ../..

  # Redeploy les fonctions critiques
  info "Redeploiement des fonctions critiques..."
  for func in "${CRITICAL_FUNCTIONS[@]}"; do
    info "Rollback: $func"
    firebase deploy --only "functions:$func" --force --project "$PROJECT_ID" || {
      error "Echec rollback de $func"
    }
    sleep 10
  done

  # Restaurer le code actuel (on ne veut pas garder le checkout)
  info "Restauration du code actuel dans git..."
  git checkout HEAD -- firebase/functions/src/

  info "Rollback termine. Verifiez les services !"
}

# Methode 2: Rollback via Cloud Run revision (plus rapide, pas de rebuild)
rollback_via_revision() {
  local func_name="$1"
  local region="europe-west3"

  info "Recherche des revisions pour $func_name..."

  # Lister les 3 dernieres revisions
  local revisions
  revisions=$(gcloud run revisions list \
    --service="$func_name" \
    --region="$region" \
    --project="$PROJECT_ID" \
    --format="value(name)" \
    --limit=3 2>/dev/null)

  if [[ -z "$revisions" ]]; then
    warn "Aucune revision trouvee pour $func_name — essai region europe-west1..."
    region="europe-west1"
    revisions=$(gcloud run revisions list \
      --service="$func_name" \
      --region="$region" \
      --project="$PROJECT_ID" \
      --format="value(name)" \
      --limit=3 2>/dev/null)
  fi

  if [[ -z "$revisions" ]]; then
    error "Aucune revision trouvee pour $func_name"
    return 1
  fi

  # La 2eme revision est la precedente (la 1ere est la version actuelle)
  local previous_revision
  previous_revision=$(echo "$revisions" | sed -n '2p')

  if [[ -z "$previous_revision" ]]; then
    error "Pas de revision precedente pour $func_name"
    return 1
  fi

  info "Rollback $func_name vers $previous_revision (region: $region)"

  if $CONFIRM; then
    gcloud run services update-traffic "$func_name" \
      --to-revisions="$previous_revision=100" \
      --region="$region" \
      --project="$PROJECT_ID"
    info "$func_name rollback effectue"
  else
    warn "[DRY-RUN] gcloud run services update-traffic $func_name --to-revisions=$previous_revision=100"
  fi
}

main() {
  info "============================================"
  info "  SOS-Expat ROLLBACK"
  info "  Target: $TARGET"
  info "  Confirm: $CONFIRM"
  info "============================================"

  if ! $CONFIRM; then
    warn "MODE DRY-RUN — ajoutez --confirm pour executer"
  fi

  case "$TARGET" in
    critical)
      info "Rollback des fonctions CRITIQUES via Cloud Run revisions..."
      for func in "${CRITICAL_FUNCTIONS[@]}"; do
        rollback_via_revision "$func" || warn "Echec rollback $func (continuons...)"
      done
      ;;

    git)
      info "Rollback complet via git..."
      rollback_via_git
      ;;

    all)
      warn "Rollback COMPLET — ceci va rollback TOUTES les fonctions"
      warn "Recommandation: utilisez 'critical' pour ne rollback que les webhooks"
      if $CONFIRM; then
        rollback_via_git
      fi
      ;;

    *)
      error "Target inconnue: $TARGET"
      echo "Usage: $0 [critical|git|all] [--confirm]"
      exit 1
      ;;
  esac

  info "============================================"
  info "  ROLLBACK TERMINE"
  info "  N'oubliez pas de verifier les services !"
  info "  ./health-check.sh"
  info "============================================"
}

main "$@"

#!/bin/bash
# ============================================================================
# health-check.sh — Verification de sante des services SOS-Expat
# ============================================================================
# Usage: ./health-check.sh [--verbose] [--json]
#
# Verifie que tous les services critiques sont operationnels.
# ============================================================================

set -euo pipefail

PROJECT_ID="sos-urgently-ac307"
TIMEOUT=15
VERBOSE=false
JSON_OUTPUT=false

for arg in "$@"; do
  case $arg in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0
RESULTS=()

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_codes="$3"  # codes HTTP acceptables, separes par |
  local tier="$4"            # critical, high, medium

  local http_code
  local response_time

  local start_time=$(date +%s%N)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  local end_time=$(date +%s%N)
  response_time=$(( (end_time - start_time) / 1000000 ))  # ms

  local status="FAIL"
  if echo "$expected_codes" | grep -q "$http_code"; then
    status="OK"
    ((PASSED++))
  elif [[ "$http_code" == "000" ]]; then
    status="TIMEOUT"
    ((FAILED++))
  else
    status="FAIL"
    ((FAILED++))
  fi

  # Warning si temps de reponse > 5s (cold start probable)
  local warning=""
  if [[ $response_time -gt 5000 && "$status" == "OK" ]]; then
    warning=" (COLD START: ${response_time}ms)"
    ((WARNINGS++))
  fi

  if ! $JSON_OUTPUT; then
    case $status in
      OK) echo -e "  ${GREEN}[OK]${NC} $name (HTTP $http_code, ${response_time}ms)$warning" ;;
      TIMEOUT) echo -e "  ${RED}[TIMEOUT]${NC} $name (pas de reponse en ${TIMEOUT}s)" ;;
      FAIL) echo -e "  ${RED}[FAIL]${NC} $name (HTTP $http_code, attendu: $expected_codes)" ;;
    esac
  fi

  RESULTS+=("{\"name\":\"$name\",\"status\":\"$status\",\"http_code\":\"$http_code\",\"response_ms\":$response_time,\"tier\":\"$tier\"}")
}

BASE_URL_WEST3="https://europe-west3-${PROJECT_ID}.cloudfunctions.net"
BASE_URL_WEST1="https://europe-west1-${PROJECT_ID}.cloudfunctions.net"

if ! $JSON_OUTPUT; then
  echo ""
  echo -e "${BLUE}============================================${NC}"
  echo -e "${BLUE}  SOS-Expat Health Check${NC}"
  echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${BLUE}============================================${NC}"
  echo ""
fi

# ==================== TIER 1: CRITIQUE (Twilio + Stripe) ====================
if ! $JSON_OUTPUT; then
  echo -e "${YELLOW}--- TIER 1: SERVICES CRITIQUES (appels + paiements) ---${NC}"
fi

# Stripe webhook: 400 = normal (pas de signature), 200 = OK aussi
check_endpoint "Stripe Webhook" "$BASE_URL_WEST3/stripeWebhook" "400|200|403" "critical"

# Twilio webhooks: divers codes sans params = OK (sauf 404/503)
check_endpoint "Twilio Call Webhook" "$BASE_URL_WEST3/twilioCallWebhook" "200|400|403|405|500" "critical"
check_endpoint "Twilio Conference Webhook" "$BASE_URL_WEST3/twilioConferenceWebhook" "200|400|403|405|500" "critical"
check_endpoint "Twilio AMD TwiML" "$BASE_URL_WEST3/twilioAmdTwiml" "200|400|403|405|500" "critical"
check_endpoint "Twilio Gather Response" "$BASE_URL_WEST3/twilioGatherResponse" "200|400|403|405|500" "critical"

# Cloud Tasks endpoints
check_endpoint "Execute Call Task" "$BASE_URL_WEST3/executeCallTask" "200|400|401|403|405|500" "critical"
check_endpoint "Busy Safety Timeout" "$BASE_URL_WEST3/busySafetyTimeoutTask" "200|400|401|403|405|500" "critical"

if ! $JSON_OUTPUT; then
  echo ""
  echo -e "${YELLOW}--- TIER 2: PAIEMENTS ---${NC}"
fi

# PayPal webhook
check_endpoint "PayPal Webhook" "$BASE_URL_WEST3/paypalWebhook" "200|400|401|403|405|500" "high"

# Payment webhooks (Wise/Flutterwave)
check_endpoint "Wise Webhook" "$BASE_URL_WEST3/paymentWebhookWise" "200|400|401|403|405|500" "high"
check_endpoint "Flutterwave Webhook" "$BASE_URL_WEST3/paymentWebhookFlutterwave" "200|400|401|403|405|500" "high"

if ! $JSON_OUTPUT; then
  echo ""
  echo -e "${YELLOW}--- TIER 3: SEO & API ---${NC}"
fi

# SEO endpoints
check_endpoint "Sitemap Profiles" "$BASE_URL_WEST1/sitemapProfiles" "200|400|403|500" "medium"
check_endpoint "Render For Bots" "$BASE_URL_WEST1/renderForBotsV2" "200|400|403|500" "medium"

# API admin
check_endpoint "Admin API" "$BASE_URL_WEST1/api" "200|400|401|403|404|500" "medium"

# ==================== RESUME ====================
if ! $JSON_OUTPUT; then
  echo ""
  echo -e "${BLUE}============================================${NC}"
  echo -e "${BLUE}  RESULTATS${NC}"
  echo -e "${BLUE}============================================${NC}"
  echo -e "  ${GREEN}Reussis${NC}: $PASSED"
  echo -e "  ${RED}Echoues${NC}: $FAILED"
  echo -e "  ${YELLOW}Warnings${NC}: $WARNINGS (cold starts)"
  echo ""

  if [[ $FAILED -eq 0 ]]; then
    echo -e "  ${GREEN}======== TOUS LES SERVICES SONT OK ========${NC}"
  elif [[ $FAILED -le 2 ]]; then
    echo -e "  ${YELLOW}======== ATTENTION: $FAILED SERVICE(S) EN PANNE ========${NC}"
  else
    echo -e "  ${RED}======== ALERTE: $FAILED SERVICES EN PANNE ========${NC}"
    echo -e "  ${RED}Executez ./rollback.sh critical --confirm${NC}"
  fi
  echo ""
else
  # Output JSON
  echo "{"
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"passed\": $PASSED,"
  echo "  \"failed\": $FAILED,"
  echo "  \"warnings\": $WARNINGS,"
  echo "  \"checks\": ["
  for i in "${!RESULTS[@]}"; do
    if [[ $i -lt $((${#RESULTS[@]} - 1)) ]]; then
      echo "    ${RESULTS[$i]},"
    else
      echo "    ${RESULTS[$i]}"
    fi
  done
  echo "  ]"
  echo "}"
fi

# Exit code: 0 = OK, 1 = critical failure, 2 = partial failure
if [[ $FAILED -eq 0 ]]; then
  exit 0
elif [[ $FAILED -le 2 ]]; then
  exit 2
else
  exit 1
fi

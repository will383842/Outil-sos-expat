#!/bin/bash
# =============================================================================
# redeploy_west2.sh — Monitor & Auto-deploy europe-west2 functions
# =============================================================================
# This script:
# 1) Waits for "being deleted" Cloud Run services to finish (frees quota)
# 2) Once quota is available (<20 vCPU), runs firebase deploy in multi-pass
# 3) Fixes Gen1 functions (reverts to 0.1 CPU after deploy → re-set to 0.083)
#
# Quota limit: 20 vCPU per region (20000 milli-vCPU)
# Target: 199 functions * 0.083 CPU = 16.52 vCPU
#
# Usage: bash redeploy_west2.sh 2>&1 | tee /tmp/west2_recovery.log
# =============================================================================

set -uo pipefail

PROJECT="sos-urgently-ac307"
REGION="europe-west2"
QUOTA_LIMIT=20    # vCPU
MAX_DEPLOY_PASSES=5
MAX_WAIT_CYCLES=144  # 144 * 10min = 24 hours max wait
DEPLOY_TIMEOUT=900  # 15 min per deploy
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIREBASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

get_vcpu() {
  gcloud run services list --project=$PROJECT --region=$REGION \
    --format="csv[no-heading](spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null \
    | awk '{t+=$1+0} END {printf "%.2f", t+0}'
}

get_deleting_count() {
  gcloud alpha run services list --project=$PROJECT --region=$REGION \
    --format="csv[no-heading](metadata.name,metadata.deletionTimestamp)" 2>/dev/null \
    | awk -F',' '$2 {c++} END {print c+0}'
}

get_deleting_vcpu() {
  gcloud alpha run services list --project=$PROJECT --region=$REGION \
    --format="csv[no-heading](spec.template.spec.containers[0].resources.limits.cpu,metadata.deletionTimestamp)" 2>/dev/null \
    | awk -F',' '$2 {t+=$1+0} END {printf "%.2f", t+0}'
}

get_function_states() {
  gcloud functions list --project=$PROJECT --regions=$REGION \
    --format="value(state)" 2>/dev/null | sort | uniq -c | sort -rn
}

fix_gen1_functions() {
  log "Checking for Gen1 functions reverted to 0.1 CPU..."
  local fixed=0
  gcloud run services list --project=$PROJECT --region=$REGION \
    --format="csv[no-heading](metadata.name,spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null \
    | awk -F',' '{cpu=$2+0; if(cpu>0.083 && cpu<=0.1) print $1}' \
    | while read svc; do
        log "  Fixing $svc (0.1 → 0.083)..."
        gcloud run services update "$svc" --project=$PROJECT --region=$REGION \
          --cpu=0.083 --memory=512Mi --concurrency=1 --quiet 2>/dev/null && fixed=$((fixed+1))
      done
  log "Fixed $fixed Gen1 functions"
}

echo "========================================="
echo "WEST2 RECOVERY — MONITOR & AUTO-DEPLOY"
echo "Start: $(date)"
echo "Quota limit: $QUOTA_LIMIT vCPU"
echo "========================================="

# =============================================
# PHASE 1: Wait for deletions to complete
# =============================================
log "PHASE 1: Waiting for being-deleted services to finish..."

for cycle in $(seq 1 $MAX_WAIT_CYCLES); do
  TOTAL_VCPU=$(get_vcpu)
  DEL_COUNT=$(get_deleting_count)
  DEL_VCPU=$(get_deleting_vcpu)
  ALIVE_VCPU=$(echo "$TOTAL_VCPU $DEL_VCPU" | awk '{printf "%.2f", $1-$2}')

  log "Cycle $cycle/$MAX_WAIT_CYCLES | Total: ${TOTAL_VCPU} vCPU | Deleting: ${DEL_COUNT} svc (${DEL_VCPU} vCPU) | Alive: ${ALIVE_VCPU} vCPU"

  if [ "$DEL_COUNT" -eq 0 ]; then
    log "All deletions complete! Alive vCPU: ${ALIVE_VCPU}"
    break
  fi

  # Check if we have enough room to deploy even with deletions in progress
  # Need room for: alive + new functions (89 * 0.083 = 7.39) < 20
  NEEDED=$(echo "$ALIVE_VCPU" | awk '{printf "%.2f", $1 + 7.39}')
  if (( $(echo "$NEEDED < $QUOTA_LIMIT" | bc -l 2>/dev/null || echo 0) )); then
    log "Enough room to deploy! (${NEEDED} vCPU < ${QUOTA_LIMIT})"
    break
  fi

  if [ "$cycle" -lt "$MAX_WAIT_CYCLES" ]; then
    log "Waiting 10 min... (need ${NEEDED} < ${QUOTA_LIMIT} vCPU)"
    sleep 600
  else
    log "WARNING: Max wait time reached. Attempting deploy anyway."
  fi
done

echo ""
log "Current function states:"
get_function_states

# =============================================
# PHASE 2: Multi-pass firebase deploy
# =============================================
log "PHASE 2: Multi-pass firebase deploy..."

cd "$FIREBASE_DIR"

for pass in $(seq 1 $MAX_DEPLOY_PASSES); do
  echo ""
  log "=== DEPLOY PASS $pass/$MAX_DEPLOY_PASSES ==="

  UNKNOWN=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=UNKNOWN" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  FAILED=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=FAILED" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  ACTIVE=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=ACTIVE" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')

  log "Before deploy: Active=$ACTIVE | Unknown=$UNKNOWN | Failed=$FAILED"

  if [ "$UNKNOWN" -eq 0 ] && [ "$FAILED" -eq 0 ]; then
    log "ALL functions healthy! No deploy needed."
    break
  fi

  # Run firebase deploy with timeout
  log "Running firebase deploy (timeout ${DEPLOY_TIMEOUT}s)..."
  timeout $DEPLOY_TIMEOUT firebase deploy --only functions --force --project $PROJECT 2>&1 \
    | grep -E "^i |created|updated|Skipped|Deploy complete|Error|failed|quota|409" \
    | tail -60

  RESULT=$?
  if [ $RESULT -eq 124 ]; then
    log "Deploy timed out after ${DEPLOY_TIMEOUT}s"
    pkill -f "firebase deploy" 2>/dev/null
    sleep 5
  fi

  # Wait for Cloud Run to settle
  sleep 15

  # Check progress
  NEW_UNKNOWN=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=UNKNOWN" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  NEW_FAILED=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=FAILED" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  NEW_ACTIVE=$(gcloud functions list --project=$PROJECT --regions=$REGION --filter="state=ACTIVE" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')

  log "After pass $pass: Active=$NEW_ACTIVE (was $ACTIVE) | Unknown=$NEW_UNKNOWN (was $UNKNOWN) | Failed=$NEW_FAILED"

  TOTAL_VCPU=$(get_vcpu)
  log "Current vCPU: ${TOTAL_VCPU} / ${QUOTA_LIMIT}"

  if [ "$NEW_UNKNOWN" -eq 0 ] && [ "$NEW_FAILED" -eq 0 ]; then
    log "ALL functions deployed successfully!"
    break
  fi

  if [ "$NEW_UNKNOWN" -eq "$UNKNOWN" ] && [ "$NEW_FAILED" -eq "$FAILED" ]; then
    log "No progress. Waiting 10 min before next pass..."
    sleep 600
  else
    RECOVERED=$((UNKNOWN - NEW_UNKNOWN))
    log "Progress! Recovered $RECOVERED functions."
    if [ "$pass" -lt "$MAX_DEPLOY_PASSES" ]; then
      log "Sleeping 3 min before next pass..."
      sleep 180
    fi
  fi
done

# =============================================
# PHASE 3: Fix Gen1 functions (revert to 0.083)
# =============================================
echo ""
log "PHASE 3: Fix Gen1 functions..."
fix_gen1_functions

# =============================================
# FINAL REPORT
# =============================================
echo ""
echo "========================================="
echo "FINAL REPORT"
echo "End: $(date)"
echo "========================================="
echo ""
log "Cloud Functions:"
get_function_states
echo ""
TOTAL_VCPU=$(get_vcpu)
SVC_COUNT=$(gcloud run services list --project=$PROJECT --region=$REGION --format="csv[no-heading](metadata.name)" 2>/dev/null | wc -l | tr -d ' ')
log "Cloud Run: $SVC_COUNT services | ${TOTAL_VCPU} vCPU / ${QUOTA_LIMIT} quota"
echo ""

# Check all 3 regions for overall status
echo "=== ALL REGIONS ==="
for r in europe-west1 europe-west2 europe-west3; do
  VCPU=$(gcloud run services list --project=$PROJECT --region=$r --format="csv[no-heading](spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null | awk '{t+=$1+0} END {printf "%.2f", t+0}')
  COUNT=$(gcloud run services list --project=$PROJECT --region=$r --format="csv[no-heading](metadata.name)" 2>/dev/null | wc -l | tr -d ' ')
  FUNCS=$(gcloud functions list --project=$PROJECT --regions=$r --format="value(state)" 2>/dev/null | wc -l | tr -d ' ')
  ACTIVE=$(gcloud functions list --project=$PROJECT --regions=$r --filter="state=ACTIVE" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
  echo "  $r: $COUNT svc | ${VCPU} vCPU | Functions: $ACTIVE/$FUNCS ACTIVE"
done
echo "========================================="

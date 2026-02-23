#!/bin/bash
# Automated batch deployment script for Firebase Functions
# Deploys in batches of 25, rotating between regions

PROJECT="sos-urgently-ac307"
BATCH_SIZE=25
WAIT_SECONDS=30
MAX_RETRIES=3

# Progress file
PROGRESS_FILE="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/deploy-progress.json"

# Initialize progress
echo '{"deployed":[],"failed":[],"batch":0}' > "$PROGRESS_FILE"

deploy_batch() {
  local funcs="$1"
  local batch_num="$2"
  local total="$3"
  local retry=0

  while [ $retry -lt $MAX_RETRIES ]; do
    echo "$(date '+%H:%M:%S') | Lot $batch_num | Deploying: $funcs"

    result=$(cd /c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos && \
      firebase deploy --only "$funcs" --project "$PROJECT" --force 2>&1)

    if echo "$result" | grep -q "Deploy complete"; then
      echo "$(date '+%H:%M:%S') | Lot $batch_num | SUCCESS"
      return 0
    elif echo "$result" | grep -q "RESOURCE_EXHAUSTED\|quota\|429"; then
      retry=$((retry + 1))
      echo "$(date '+%H:%M:%S') | Lot $batch_num | QUOTA HIT - waiting 120s (retry $retry/$MAX_RETRIES)"
      sleep 120
    elif echo "$result" | grep -q "ALREADY_EXISTS\|trigger type"; then
      # Try to delete and redeploy
      echo "$(date '+%H:%M:%S') | Lot $batch_num | TRIGGER CONFLICT - skipping for retry phase"
      echo "$result" | tail -5
      return 1
    else
      retry=$((retry + 1))
      echo "$(date '+%H:%M:%S') | Lot $batch_num | FAILED (retry $retry/$MAX_RETRIES)"
      echo "$result" | grep -E "Error|error|FAIL|fail" | tail -5
      sleep 30
    fi
  done
  return 1
}

# Build batches from region files
deployed=0
failed=0
batch=0

for region_file in /tmp/funcs_west1.txt /tmp/funcs_west2.txt /tmp/funcs_west3.txt /tmp/funcs_uscentral1.txt; do
  region_name=$(basename "$region_file" .txt | sed 's/funcs_//')
  total_in_region=$(wc -l < "$region_file")
  echo "==============================="
  echo "Region: $region_name ($total_in_region functions)"
  echo "==============================="

  # Read functions into array
  mapfile -t funcs < "$region_file"

  # Deploy in batches
  i=0
  while [ $i -lt ${#funcs[@]} ]; do
    batch=$((batch + 1))
    batch_funcs=""
    j=0
    while [ $j -lt $BATCH_SIZE ] && [ $((i + j)) -lt ${#funcs[@]} ]; do
      fname="${funcs[$((i + j))]}"
      if [ -n "$batch_funcs" ]; then
        batch_funcs="$batch_funcs,functions:$fname"
      else
        batch_funcs="functions:$fname"
      fi
      j=$((j + 1))
    done

    total_funcs=688
    current=$((deployed + failed))
    echo ""
    echo "🔄 Lot $batch | $region_name | $j fonctions | Progress: $current/$total_funcs"

    if deploy_batch "$batch_funcs" "$batch" "$total_funcs"; then
      deployed=$((deployed + j))
    else
      failed=$((failed + j))
      # Save failed functions
      for k in $(seq 0 $((j - 1))); do
        echo "${funcs[$((i + k))]}" >> /tmp/failed_functions.txt
      done
    fi

    echo "✅ Deployed: $deployed | ❌ Failed: $failed | 🔄 Lot $batch"

    # Update progress
    echo "{\"deployed\":$deployed,\"failed\":$failed,\"batch\":$batch,\"total\":$total_funcs}" > "$PROGRESS_FILE"

    i=$((i + BATCH_SIZE))

    # Wait between batches
    if [ $i -lt ${#funcs[@]} ]; then
      echo "Waiting ${WAIT_SECONDS}s..."
      sleep $WAIT_SECONDS
    fi
  done
done

echo ""
echo "=============================="
echo "DEPLOYMENT COMPLETE"
echo "Deployed: $deployed"
echo "Failed: $failed"
echo "Total batches: $batch"
echo "=============================="

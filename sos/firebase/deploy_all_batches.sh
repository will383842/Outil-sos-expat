#!/bin/bash
# Deploy ALL functions in batches of 30 with 1 minute pause between each batch
# Auto-extracts function names from compiled lib/index.js
cd "$(dirname "$0")"

echo "=========================================="
echo "  EXTRACTION DES FONCTIONS..."
echo "=========================================="

# Extract all exported function names from compiled code
# Filter out Sentry/console noise, keep only valid JS identifier names
FUNCTIONS=($(cd functions && node -e "
  // Suppress all console output during require
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origInfo = console.info;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  const exp = require('./lib/index.js');
  // Restore console.log for our output
  console.log = origLog;
  const exclude = new Set(['db','app','auth','storage','bucket','logger','admin']);
  const names = Object.keys(exp).filter(k => {
    if (!/^[a-z][a-zA-Z0-9_]*$/.test(k)) return false;
    if (exclude.has(k)) return false;
    const v = exp[k];
    return v && (typeof v === 'object' || typeof v === 'function');
  });
  console.log(names.join('\n'));
" 2>/dev/null))

TOTAL=${#FUNCTIONS[@]}
BATCH_SIZE=20
BATCH_NUM=0
SUCCESS=0
FAILED=0

echo "=========================================="
echo "  DEPLOIEMENT PAR BATCHES DE $BATCH_SIZE"
echo "  Total fonctions: $TOTAL"
echo "  Batches prevus: $(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

for ((i=0; i<TOTAL; i+=BATCH_SIZE)); do
  BATCH_NUM=$((BATCH_NUM + 1))
  BATCH_END=$((i + BATCH_SIZE))
  if [ $BATCH_END -gt $TOTAL ]; then
    BATCH_END=$TOTAL
  fi

  # Build the --only string
  ONLY=""
  for ((j=i; j<BATCH_END; j++)); do
    if [ -z "$ONLY" ]; then
      ONLY="functions:${FUNCTIONS[$j]}"
    else
      ONLY="$ONLY,functions:${FUNCTIONS[$j]}"
    fi
  done

  echo ""
  echo "============================================"
  echo "=== BATCH $BATCH_NUM — fonctions $((i+1)) a $BATCH_END / $TOTAL ==="
  echo "=== $(date '+%H:%M:%S') ==="
  echo "============================================"

  firebase deploy --only "$ONLY" 2>&1

  RESULT=$?
  if [ $RESULT -eq 0 ]; then
    echo "✅ Batch $BATCH_NUM OK"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "⚠️  Batch $BATCH_NUM termine avec erreurs (code $RESULT)"
    FAILED=$((FAILED + 1))
  fi

  # Pause 1 minute between batches (skip after last)
  if [ $BATCH_END -lt $TOTAL ]; then
    echo "⏳ Pause 60 secondes avant batch suivant..."
    sleep 120
  fi
done

echo ""
echo "=========================================="
echo "  DEPLOIEMENT TERMINE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Batches reussis: $SUCCESS"
echo "  Batches en erreur: $FAILED"
echo "  Total batches: $BATCH_NUM"
echo "=========================================="

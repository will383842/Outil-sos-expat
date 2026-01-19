#!/bin/bash
# =============================================================================
# DEPLOY FUNCTIONS BY BATCH
# Evite les erreurs "CPU quota exceeded" en deployant par groupes de 20
# =============================================================================

set -e

echo "=========================================="
echo "  DEPLOIEMENT PAR BATCH - SOS EXPAT"
echo "=========================================="

# Configuration
BATCH_SIZE=20
DELAY_BETWEEN_BATCHES=30  # secondes

# Se placer dans le bon repertoire
cd "$(dirname "$0")"

# Build d'abord
echo ""
echo "[1/2] Building TypeScript..."
npm run build

# Extraire toutes les fonctions exportees depuis index.ts
echo ""
echo "[2/2] Extracting function names..."

# Obtenir la liste des fonctions depuis le fichier compile
FUNCTIONS=$(node -e "
const exports = require('./lib/index.js');
const names = Object.keys(exports).filter(k =>
  typeof exports[k] === 'function' ||
  (exports[k] && exports[k].run)
);
console.log(names.join('\n'));
" 2>/dev/null | grep -v "^$" || echo "")

if [ -z "$FUNCTIONS" ]; then
  echo "ERROR: No functions found. Make sure build succeeded."
  exit 1
fi

# Compter les fonctions
TOTAL=$(echo "$FUNCTIONS" | wc -l | tr -d ' ')
echo "Found $TOTAL functions to deploy"

# Creer les batches
BATCH_NUM=1
CURRENT_BATCH=""
COUNT=0

echo ""
echo "=========================================="
echo "  STARTING BATCHED DEPLOYMENT"
echo "=========================================="

while IFS= read -r func; do
  if [ -z "$func" ]; then continue; fi

  if [ -z "$CURRENT_BATCH" ]; then
    CURRENT_BATCH="$func"
  else
    CURRENT_BATCH="$CURRENT_BATCH,$func"
  fi

  COUNT=$((COUNT + 1))

  # Deployer quand le batch est plein
  if [ $COUNT -ge $BATCH_SIZE ]; then
    echo ""
    echo "--- Batch $BATCH_NUM: Deploying $COUNT functions ---"
    firebase deploy --only "functions:$CURRENT_BATCH" --force

    echo "Waiting ${DELAY_BETWEEN_BATCHES}s before next batch..."
    sleep $DELAY_BETWEEN_BATCHES

    BATCH_NUM=$((BATCH_NUM + 1))
    CURRENT_BATCH=""
    COUNT=0
  fi
done <<< "$FUNCTIONS"

# Deployer le dernier batch (incomplet)
if [ -n "$CURRENT_BATCH" ]; then
  echo ""
  echo "--- Batch $BATCH_NUM (final): Deploying $COUNT functions ---"
  firebase deploy --only "functions:$CURRENT_BATCH" --force
fi

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="

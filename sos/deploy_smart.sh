#!/bin/bash
# Deploy uniquement les fonctions nouvelles ou modifiées
# Usage: bash deploy_smart.sh

FUNC_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase/functions"
SOS_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos"

echo "=== 1. BUILD ==="
cd "$FUNC_DIR"
rm -rf lib
npm run build

echo ""
echo "=== 2. Liste des fonctions locales ==="
node -e "
const m = require('./lib/index.js');
const fns = Object.keys(m).filter(k => m[k] && (m[k].__endpoint || m[k].__requiredAPIs || (typeof m[k] === 'function' && m[k].run)));
fns.forEach(f => console.log(f));
" | sort > /tmp/local_functions.txt
LOCAL_COUNT=$(wc -l < /tmp/local_functions.txt)
echo "Fonctions locales: $LOCAL_COUNT"

echo ""
echo "=== 3. Liste des fonctions deployees ==="
cd "$SOS_DIR"
firebase functions:list 2>/dev/null | grep -oP '^\s*\K\S+' | sed 's/(.*//;s/\s*$//' | sort -u > /tmp/deployed_functions.txt
DEPLOYED_COUNT=$(wc -l < /tmp/deployed_functions.txt)
echo "Fonctions deployees: $DEPLOYED_COUNT"

echo ""
echo "=== 4. Fonctions NOUVELLES (dans le code, pas encore deployees) ==="
comm -23 /tmp/local_functions.txt /tmp/deployed_functions.txt > /tmp/new_functions.txt
NEW_COUNT=$(wc -l < /tmp/new_functions.txt)
echo "Nouvelles fonctions: $NEW_COUNT"
if [ $NEW_COUNT -gt 0 ]; then
  cat /tmp/new_functions.txt
fi

echo ""
echo "=== 5. Fonctions MODIFIEES (git diff depuis dernier commit deploye) ==="
cd "$FUNC_DIR"
# Trouver les fichiers .ts modifies recemment (non commites + derniers commits)
MODIFIED_FILES=$(git diff --name-only HEAD~5 HEAD -- src/ 2>/dev/null; git diff --name-only -- src/ 2>/dev/null; git diff --cached --name-only -- src/ 2>/dev/null)
MODIFIED_FILES=$(echo "$MODIFIED_FILES" | sort -u | grep '\.ts$' || true)

MODIFIED_FUNCTIONS=""
if [ -n "$MODIFIED_FILES" ]; then
  echo "Fichiers modifies:"
  echo "$MODIFIED_FILES" | head -30
  echo ""
  # Extraire les noms de fonctions exportees dans ces fichiers
  for f in $MODIFIED_FILES; do
    if [ -f "$f" ]; then
      # Cherche les exports de fonctions (onCall, onRequest, onSchedule, etc.)
      grep -oP 'export\s+(const|function)\s+\K\w+' "$f" 2>/dev/null || true
    fi
  done | sort -u > /tmp/modified_functions.txt
  # Ne garder que celles qui sont dans les exports locaux
  MODIFIED_FUNCTIONS=$(comm -12 /tmp/local_functions.txt /tmp/modified_functions.txt | tr '\n' ' ')
  MOD_COUNT=$(comm -12 /tmp/local_functions.txt /tmp/modified_functions.txt | wc -l)
  echo "Fonctions modifiees: $MOD_COUNT"
  comm -12 /tmp/local_functions.txt /tmp/modified_functions.txt
fi

echo ""
echo "=== 6. CONSTRUCTION DE LA LISTE A DEPLOYER ==="
# Combiner nouvelles + modifiees
cat /tmp/new_functions.txt > /tmp/to_deploy.txt
if [ -f /tmp/modified_functions.txt ]; then
  comm -12 /tmp/local_functions.txt /tmp/modified_functions.txt >> /tmp/to_deploy.txt
fi
sort -u /tmp/to_deploy.txt -o /tmp/to_deploy.txt
TOTAL=$(wc -l < /tmp/to_deploy.txt)

if [ "$TOTAL" -eq 0 ]; then
  echo "Rien a deployer ! Tout est a jour."
  exit 0
fi

echo "Total a deployer: $TOTAL fonctions"
cat /tmp/to_deploy.txt
echo ""

# Construire la liste --only functions:xxx,functions:yyy
ONLY=$(sed 's/^/functions:/' /tmp/to_deploy.txt | tr '\n' ',' | sed 's/,$//')

cd "$SOS_DIR"

# Deployer par batches de 30 si plus de 30 fonctions
if [ "$TOTAL" -le 30 ]; then
  echo "=== DEPLOY ($TOTAL fonctions) ==="
  firebase deploy --only "$ONLY" --force 2>&1 | tee deploy_smart.log
else
  echo "=== DEPLOY PAR BATCHES DE 30 ==="
  BATCH=1
  BATCH_LIST=""
  COUNT=0
  while IFS= read -r fn; do
    if [ -z "$BATCH_LIST" ]; then
      BATCH_LIST="functions:$fn"
    else
      BATCH_LIST="$BATCH_LIST,functions:$fn"
    fi
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge 30 ]; then
      echo ""
      echo "--- Batch $BATCH ($COUNT fonctions) ---"
      firebase deploy --only "$BATCH_LIST" --force 2>&1 | tee -a deploy_smart.log
      BATCH=$((BATCH + 1))
      BATCH_LIST=""
      COUNT=0
      echo "Pause 60s..."
      sleep 60
    fi
  done < /tmp/to_deploy.txt
  # Dernier batch restant
  if [ -n "$BATCH_LIST" ]; then
    echo ""
    echo "--- Batch $BATCH ($COUNT fonctions) ---"
    firebase deploy --only "$BATCH_LIST" --force 2>&1 | tee -a deploy_smart.log
  fi
fi

echo ""
echo "=== DONE ==="

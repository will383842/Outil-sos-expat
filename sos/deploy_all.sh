#!/bin/bash
set -e

FUNC_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase/functions"
SOS_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos"

echo "=== 1. BUILD ==="
cd "$FUNC_DIR"
rm -rf lib
npm run build

echo ""
echo "=== 2. DEPLOY ALL ==="
cd "$SOS_DIR"
set +e
firebase deploy --only functions --force 2>&1 | tee deploy_all.log
DEPLOY_EXIT=$?
set -e

echo ""
echo "=== 3. CHECK FAILURES ==="
grep -iE "failed|error" deploy_all.log | grep -oP 'functions:\K\w+' | sort -u > deploy_failed_list.txt || true

if [ $DEPLOY_EXIT -ne 0 ] && [ -s deploy_failed_list.txt ]; then
  echo "Fonctions en echec:"
  cat deploy_failed_list.txt
  FAILED=$(sed 's/^/functions:/' deploy_failed_list.txt | tr '\n' ',' | sed 's/,$//')
  echo ""
  echo "=== Pause 120s avant retry ==="
  sleep 120
  echo "=== 4. RETRY ==="
  firebase deploy --only "$FAILED" --force 2>&1 | tee deploy_retry.log
elif [ $DEPLOY_EXIT -ne 0 ]; then
  echo "Deploy echoue mais impossible d'extraire les noms. Voir deploy_all.log"
else
  echo "Aucun echec — tout est deploye !"
fi

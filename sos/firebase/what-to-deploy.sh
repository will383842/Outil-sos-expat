#!/bin/bash
FIREBASE_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase"
SRC_DIR="$FIREBASE_DIR/functions/src"
BUNDLE="$FIREBASE_DIR/functions/lib/index.js"
PROJECT="sos-urgently-ac307"
LOG="$FIREBASE_DIR/what-to-deploy.log"
cd "$FIREBASE_DIR"
> "$LOG"
log() { echo "$1" | tee -a "$LOG"; }

log "=== ÉTAPE 1 — Fonctions dans le code source ==="
grep -rh "^export const " "$SRC_DIR" --include="*.ts" \
  | grep -E "onCall|onRequest|onSchedule|onDocument|onMessage|onTask|https\." \
  | grep -oP "(?<=export const )\w+" \
  | sort -u > /tmp/sos_in_code.txt
log "→ $(wc -l < /tmp/sos_in_code.txt) fonctions dans le code"

log "=== ÉTAPE 2 — Fonctions déployées ==="
firebase functions:list --project "$PROJECT" --json 2>/dev/null \
  | python3 -c "
import json,sys
try:
  data=json.load(sys.stdin)
  names=[f.get('id','').split('/')[-1] for f in data if isinstance(f,dict) and f.get('id')]
  print('\n'.join(sorted(set(names))))
except: pass
" > /tmp/sos_deployed.txt
log "→ $(wc -l < /tmp/sos_deployed.txt) fonctions déployées"

log "=== ÉTAPE 3 — Nouvelles fonctions ==="
comm -23 /tmp/sos_in_code.txt /tmp/sos_deployed.txt > /tmp/sos_new.txt
log "→ $(wc -l < /tmp/sos_new.txt) nouvelles fonctions"

log "=== ÉTAPE 4 — Fonctions modifiées ==="
> /tmp/sos_modified.txt
find "$SRC_DIR" -name "*.ts" -newer "$BUNDLE" -type f 2>/dev/null | while read FILE; do
  grep -E "^export const \w+" "$FILE" \
    | grep -E "onCall|onRequest|onSchedule|onDocument|onMessage|onTask|https\." \
    | grep -oP "(?<=export const )\w+" >> /tmp/sos_modified.txt
done
sort -u /tmp/sos_modified.txt -o /tmp/sos_modified.txt
log "→ $(wc -l < /tmp/sos_modified.txt) fonctions modifiées"

log "=== RÉSUMÉ ==="
cat /tmp/sos_new.txt /tmp/sos_modified.txt | sort -u > /tmp/sos_to_deploy.txt
TOTAL=$(wc -l < /tmp/sos_to_deploy.txt)
log "🔴 Nouvelles  : $(wc -l < /tmp/sos_new.txt)"
log "🟡 Modifiées  : $(wc -l < /tmp/sos_modified.txt)"
log "🚀 TOTAL      : $TOTAL fonctions à déployer"
log ""
log "=== LISTE ==="
cat /tmp/sos_to_deploy.txt | tee -a "$LOG"

log ""
log "=== GÉNÉRATION DU SCRIPT deploy-now.sh ==="
FUNCS=($(cat /tmp/sos_to_deploy.txt))
BATCH_SIZE=5
{ echo "#!/bin/bash"
  echo "cd $FIREBASE_DIR"
  echo "LOG=$FIREBASE_DIR/deploy-now.log"
  echo "> \$LOG"
  LOT=0
  for (( i=0; i<${#FUNCS[@]}; i+=BATCH_SIZE )); do
    LOT=$((LOT+1))
    BATCH=("${FUNCS[@]:$i:$BATCH_SIZE}")
    SPEC=$(printf "functions:%s," "${BATCH[@]}" | sed 's/,$//')
    echo "echo '[LOT $LOT] ${BATCH[*]}' | tee -a \$LOG"
    echo "firebase deploy --only \"$SPEC\" --project $PROJECT --force 2>&1 | tee -a \$LOG"
    echo "echo 'EXIT: \$?' | tee -a \$LOG"
    [ $((i+BATCH_SIZE)) -lt ${#FUNCS[@]} ] && echo "sleep 90"
  done
  echo "echo '✅ TERMINÉ' | tee -a \$LOG"
} > "$FIREBASE_DIR/deploy-now.sh"
chmod +x "$FIREBASE_DIR/deploy-now.sh"
log "✅ Script généré : $FIREBASE_DIR/deploy-now.sh"
log "   Lancer avec : bash $FIREBASE_DIR/deploy-now.sh"

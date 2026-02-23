#!/bin/bash
FIREBASE_DIR="/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase"
PROJECT="sos-urgently-ac307"
LIB="$FIREBASE_DIR/functions/lib/index.js"

echo "=========================================="
echo "  VÉRIFICATION DÉPLOIEMENT FIREBASE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo ""
echo "⏳ Récupération des fonctions déployées..."
firebase functions:list --project "$PROJECT" 2>/dev/null \
  | tr -d '\r' \
  | grep "│" \
  | awk -F'│' '{print $2}' \
  | tr -d '[:space:]' \
  | grep -v "^$\|^Function\|^-\|^─" \
  | sort -u > /tmp/deployed_now.txt

DEPLOYED=$(wc -l < /tmp/deployed_now.txt)
echo "✅ Déployées en prod : $DEPLOYED"

echo "⏳ Extraction depuis lib/index.js..."
START=$(grep -n "^__export(index_exports" "$LIB" | tail -1 | cut -d: -f1)
END=$(grep -n "^module.exports = __toCommonJS" "$LIB" | tail -1 | cut -d: -f1)

sed -n "${START},${END}p" "$LIB" \
  | grep -oP '^\s+\K[a-zA-Z][a-zA-Z0-9_]+(?=:\s*\(\)\s*=>)' \
  | grep -v '^[A-Z][A-Z_0-9]*$' \
  | grep -v '^[A-Z][A-Z][A-Z]' \
  | sort -u > /tmp/lib_fns.txt

LIB_TOTAL=$(wc -l < /tmp/lib_fns.txt)
echo "✅ Dans le lib      : $LIB_TOTAL"

# Vérification des \r résiduels
CRLF=$(cat /tmp/deployed_now.txt | cat -A | grep -c '\^M' || true)
[ "$CRLF" -gt 0 ] && echo "⚠️  $CRLF lignes avec \r détectées encore" || echo "✅ Pas de \r"

comm -23 /tmp/lib_fns.txt /tmp/deployed_now.txt > /tmp/missing_deploy.txt
comm -13 /tmp/lib_fns.txt /tmp/deployed_now.txt > /tmp/orphans.txt

MISSING=$(wc -l < /tmp/missing_deploy.txt)
ORPHANS=$(wc -l < /tmp/orphans.txt)

echo ""
echo "=========================================="
echo "  RÉSULTAT"
echo "=========================================="
echo "  ✅ Déployées  : $DEPLOYED"
echo "  📦 Dans lib   : $LIB_TOTAL"
echo "  ❌ Manquantes : $MISSING"
echo "  🗑️  Orphelines : $ORPHANS"
echo "=========================================="

if [ "$MISSING" -eq 0 ]; then
  echo ""
  echo "🎉 TOUT EST DÉPLOYÉ À 100% !"
else
  echo ""
  echo "❌ MANQUANTES ($MISSING) :"
  cat /tmp/missing_deploy.txt
  echo ""
  echo "💡 Commande deploy :"
  echo -n "firebase deploy --only "
  paste -sd',' /tmp/missing_deploy.txt | sed 's/\([^,]*\)/functions:\1/g'
fi

if [ "$ORPHANS" -gt 0 ]; then
  echo ""
  echo "🗑️  ORPHELINES ($ORPHANS) — en prod mais plus dans le code :"
  cat /tmp/orphans.txt
fi

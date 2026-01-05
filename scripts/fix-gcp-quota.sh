#!/bin/bash
# ============================================================
# SCRIPT DE RÉDUCTION DES QUOTAS CPU GCP
# Projet: sos-urgently-ac307 (SOS Expat)
# Date: 2026-01-05
# ============================================================

PROJECT="sos-urgently-ac307"
REGION="europe-west1"

echo "=========================================="
echo "🚀 RÉDUCTION DES QUOTAS CPU GCP"
echo "Projet: $PROJECT"
echo "Région: $REGION"
echo "=========================================="

# ============================================================
# PHASE 1: Fonctions CRITIQUES (garder haute perf)
# ============================================================
CRITICAL_SERVICES=(
  "stripewebhook"
  "paypalwebhook"
  "createpaymentintent"
  "executecalltask"
  "twiliocallwebhook"
  "unifiedwebhook"
)

echo ""
echo "📌 PHASE 1: Configuration des services CRITIQUES (CPU 0.5, minInstances 1)"
for svc in "${CRITICAL_SERVICES[@]}"; do
  echo "  ➤ Updating $svc..."
  gcloud run services update "$svc" \
    --region="$REGION" \
    --project="$PROJECT" \
    --cpu=0.5 \
    --memory=512Mi \
    --max-instances=10 \
    --min-instances=1 \
    --no-cpu-boost \
    --quiet 2>/dev/null || echo "    ⚠️ Service $svc not found or error"
done

# ============================================================
# PHASE 2: Fonctions WEBHOOK/API (besoin de réponse rapide)
# ============================================================
WEBHOOK_SERVICES=(
  "onmessageeventcreate"
  "onproviderchange"
  "onprovidercreated"
  "onprofilecreated"
  "onprofileupdated"
  "handlekycverification"
  "handlepaymentreceived"
  "handlepaymentfailed"
)

echo ""
echo "📌 PHASE 2: Configuration des services WEBHOOK (CPU 0.25, minInstances 0)"
for svc in "${WEBHOOK_SERVICES[@]}"; do
  echo "  ➤ Updating $svc..."
  gcloud run services update "$svc" \
    --region="$REGION" \
    --project="$PROJECT" \
    --cpu=0.25 \
    --memory=256Mi \
    --max-instances=5 \
    --min-instances=0 \
    --no-cpu-boost \
    --quiet 2>/dev/null || echo "    ⚠️ Service $svc not found or error"
done

# ============================================================
# PHASE 3: TOUTES les autres fonctions (CPU minimal)
# ============================================================
echo ""
echo "📌 PHASE 3: Réduction CPU pour TOUS les autres services (CPU 0.083, minInstances 0)"

# Récupérer tous les services sauf ceux déjà traités
ALL_SERVICES=$(gcloud run services list --region="$REGION" --project="$PROJECT" --format="value(name)" 2>/dev/null)

# Services à exclure
EXCLUDE_PATTERN="stripewebhook|paypalwebhook|createpaymentintent|executecalltask|twiliocallwebhook|unifiedwebhook|onmessageeventcreate|onproviderchange|onprovidercreated|onprofilecreated|onprofileupdated|handlekycverification|handlepaymentreceived|handlepaymentfailed"

# Compteur
COUNT=0
TOTAL=$(echo "$ALL_SERVICES" | wc -l)

for svc in $ALL_SERVICES; do
  COUNT=$((COUNT + 1))

  # Skip si dans la liste d'exclusion
  if echo "$svc" | grep -qE "$EXCLUDE_PATTERN"; then
    echo "  ⏭️ [$COUNT/$TOTAL] Skipping $svc (already configured)"
    continue
  fi

  echo "  ➤ [$COUNT/$TOTAL] Updating $svc..."
  gcloud run services update "$svc" \
    --region="$REGION" \
    --project="$PROJECT" \
    --cpu=0.083 \
    --memory=256Mi \
    --max-instances=3 \
    --min-instances=0 \
    --no-cpu-boost \
    --quiet 2>/dev/null || echo "    ⚠️ Error updating $svc"
done

echo ""
echo "=========================================="
echo "✅ TERMINÉ!"
echo "=========================================="
echo ""
echo "📊 Vérification du quota CPU:"
gcloud run services list --region="$REGION" --project="$PROJECT" --format="table(name,spec.template.spec.containers[0].resources.limits.cpu)" 2>/dev/null | head -20

# ============================================================
# SCRIPT DE RÉDUCTION DES QUOTAS CPU GCP (Windows PowerShell)
# Projet: sos-urgently-ac307 (SOS Expat)
# Date: 2026-01-05
# ============================================================

$PROJECT = "sos-urgently-ac307"
$REGION = "europe-west1"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 RÉDUCTION DES QUOTAS CPU GCP" -ForegroundColor Green
Write-Host "Projet: $PROJECT"
Write-Host "Région: $REGION"
Write-Host "==========================================" -ForegroundColor Cyan

# ============================================================
# PHASE 1: Fonctions CRITIQUES (CPU 0.5, minInstances 1)
# ============================================================
$CRITICAL_SERVICES = @(
    "stripewebhook",
    "paypalwebhook",
    "createpaymentintent",
    "executecalltask",
    "twiliocallwebhook",
    "unifiedwebhook"
)

Write-Host ""
Write-Host "📌 PHASE 1: Services CRITIQUES" -ForegroundColor Yellow

foreach ($svc in $CRITICAL_SERVICES) {
    Write-Host "  ➤ Updating $svc..." -ForegroundColor White
    gcloud run services update $svc `
        --region=$REGION `
        --project=$PROJECT `
        --cpu=0.5 `
        --memory=512Mi `
        --max-instances=10 `
        --min-instances=1 `
        --no-cpu-boost `
        --quiet 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ⚠️ Erreur ou service non trouvé" -ForegroundColor Red
    }
}

# ============================================================
# PHASE 2: TOUS les autres services (CPU 0.083 minimum)
# ============================================================
Write-Host ""
Write-Host "📌 PHASE 2: Tous les autres services (CPU minimal)" -ForegroundColor Yellow

# Récupérer tous les services
$allServices = gcloud run services list --region=$REGION --project=$PROJECT --format="value(name)" 2>$null
$serviceList = $allServices -split "`n"

$count = 0
$total = $serviceList.Count

foreach ($svc in $serviceList) {
    $svc = $svc.Trim()
    if ([string]::IsNullOrEmpty($svc)) { continue }

    $count++

    # Skip les services critiques
    if ($CRITICAL_SERVICES -contains $svc) {
        Write-Host "  ⏭️ [$count/$total] Skip $svc (déjà configuré)" -ForegroundColor DarkGray
        continue
    }

    Write-Host "  ➤ [$count/$total] Updating $svc..." -ForegroundColor White
    gcloud run services update $svc `
        --region=$REGION `
        --project=$PROJECT `
        --cpu=0.083 `
        --memory=256Mi `
        --max-instances=3 `
        --min-instances=0 `
        --no-cpu-boost `
        --quiet 2>$null
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ TERMINÉ!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

# Vérification
Write-Host ""
Write-Host "📊 Vérification (top 20 services):" -ForegroundColor Yellow
gcloud run services list --region=$REGION --project=$PROJECT --format="table(name,spec.template.spec.containers[0].resources.limits.cpu)" 2>$null | Select-Object -First 25

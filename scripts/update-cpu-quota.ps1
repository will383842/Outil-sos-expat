$PROJECT = "sos-urgently-ac307"
$REGION = "europe-west1"
$SKIP = @("stripewebhook","paypalwebhook","createpaymentintent","executecalltask","twiliocallwebhook","unifiedwebhook")

Write-Host "=== Getting services list..." -ForegroundColor Cyan
$services = gcloud run services list --region=$REGION --project=$PROJECT --format="value(name)" 2>$null
$serviceList = $services -split "`n" | Where-Object { $_.Trim() -and ($SKIP -notcontains $_.Trim()) }

$total = $serviceList.Count
Write-Host "Total: $total services to update" -ForegroundColor Yellow
$count = 0
$success = 0
$failed = 0

foreach ($svc in $serviceList) {
    $svc = $svc.Trim()
    if (-not $svc) { continue }
    $count++
    Write-Host "[$count/$total] $svc..." -NoNewline

    $null = gcloud run services update $svc --region=$REGION --project=$PROJECT --cpu=0.083 --memory=256Mi --max-instances=3 --min-instances=0 --no-cpu-boost --concurrency=1 --quiet 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $success++
    } else {
        Write-Host " FAIL" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Done! Success: $success, Failed: $failed" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

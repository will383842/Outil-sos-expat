# =============================================================================
# DEPLOY FUNCTIONS BY BATCH (Windows PowerShell)
# Evite les erreurs "CPU quota exceeded" en deployant par groupes de 20
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DEPLOIEMENT PAR BATCH - SOS EXPAT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Configuration
$BATCH_SIZE = 20
$DELAY_BETWEEN_BATCHES = 30  # secondes

# Se placer dans le bon repertoire
Set-Location $PSScriptRoot

# Build d'abord
Write-Host ""
Write-Host "[1/2] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

# Extraire toutes les fonctions exportees
Write-Host ""
Write-Host "[2/2] Extracting function names..." -ForegroundColor Yellow

$jsCode = @"
const exports = require('./lib/index.js');
const names = Object.keys(exports).filter(k =>
  typeof exports[k] === 'function' ||
  (exports[k] && exports[k].run)
);
console.log(JSON.stringify(names));
"@

$functionsJson = node -e $jsCode 2>$null
$functions = $functionsJson | ConvertFrom-Json

if ($functions.Count -eq 0) {
    Write-Host "ERROR: No functions found. Make sure build succeeded." -ForegroundColor Red
    exit 1
}

Write-Host "Found $($functions.Count) functions to deploy" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  STARTING BATCHED DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Deployer par batches
$batchNum = 1
for ($i = 0; $i -lt $functions.Count; $i += $BATCH_SIZE) {
    $batch = $functions[$i..([Math]::Min($i + $BATCH_SIZE - 1, $functions.Count - 1))]
    $batchFunctions = $batch -join ","
    $batchCount = $batch.Count

    Write-Host ""
    Write-Host "--- Batch $batchNum`: Deploying $batchCount functions ---" -ForegroundColor Yellow

    # Deployer ce batch
    $deployCmd = "firebase deploy --only `"functions:$batchFunctions`" --force"
    Write-Host "Running: $deployCmd" -ForegroundColor Gray

    Invoke-Expression $deployCmd

    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Batch $batchNum had errors, continuing..." -ForegroundColor Red
    }

    # Attendre entre les batches (sauf pour le dernier)
    if (($i + $BATCH_SIZE) -lt $functions.Count) {
        Write-Host "Waiting ${DELAY_BETWEEN_BATCHES}s before next batch..." -ForegroundColor Gray
        Start-Sleep -Seconds $DELAY_BETWEEN_BATCHES
    }

    $batchNum++
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

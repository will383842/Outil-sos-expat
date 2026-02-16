# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE DEMARRAGE POWERSHELL - SOS EXPAT + OUTIL IA
# ═══════════════════════════════════════════════════════════════════════════════
#
# Usage: .\start-dev.ps1
#        .\start-dev.ps1 -SosOnly      # Lance uniquement SOS
#        .\start-dev.ps1 -OutilOnly    # Lance uniquement l'Outil IA
#
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SosOnly,
    [switch]$OutilOnly,
    [switch]$NoEmulators
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SOS EXPAT - DEMARRAGE LOCAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chemin du projet
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Verification des node_modules
if (-not $OutilOnly) {
    if (-not (Test-Path "sos\node_modules")) {
        Write-Host "[!] Installation des dependances SOS..." -ForegroundColor Yellow
        Push-Location "sos"
        npm install
        Pop-Location
    }
}

if (-not $SosOnly) {
    if (-not (Test-Path "Outil-sos-expat\node_modules")) {
        Write-Host "[!] Installation des dependances Outil IA..." -ForegroundColor Yellow
        Push-Location "Outil-sos-expat"
        npm install
        Pop-Location
    }
}

# Demarrage de l'Outil IA
if (-not $SosOnly) {
    Write-Host "[1/2] Demarrage de l'Outil IA (port 5173)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\Outil-sos-expat'; npm run dev"
    Start-Sleep -Seconds 2
}

# Demarrage de SOS
if (-not $OutilOnly) {
    $sosCommand = if ($NoEmulators) { "npm run dev" } else { "npm run dev:full" }
    Write-Host "[2/2] Demarrage de SOS Expat (port 5174)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\sos'; $sosCommand"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  APPLICATIONS DEMARREES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if (-not $SosOnly) {
    Write-Host "  Outil IA:   " -NoNewline
    Write-Host "http://localhost:5173" -ForegroundColor Cyan
}

if (-not $OutilOnly) {
    Write-Host "  SOS Expat:  " -NoNewline
    Write-Host "http://localhost:5174" -ForegroundColor Cyan

    if (-not $NoEmulators) {
        Write-Host ""
        Write-Host "  Emulateurs Firebase:" -ForegroundColor Yellow
        Write-Host "  - Auth:      http://localhost:9099"
        Write-Host "  - Firestore: http://localhost:8080"
        Write-Host "  - Functions: http://localhost:5001"
        Write-Host "  - Storage:   http://localhost:9199"
        Write-Host "  - UI:        http://localhost:4000"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Flux SSO:" -ForegroundColor Magenta
Write-Host "  1. Ouvre SOS: http://localhost:5174"
Write-Host "  2. Connecte-toi en tant que prestataire"
Write-Host "  3. Clique sur 'Assistant IA' dans le dashboard"
Write-Host "  4. Tu seras redirige vers l'Outil IA (port 5173)"
Write-Host ""

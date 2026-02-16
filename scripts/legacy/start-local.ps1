# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE DÉMARRAGE LOCAL - SOS EXPAT PROJECT
# ═══════════════════════════════════════════════════════════════════════════════
# Ce script démarre tous les services nécessaires pour le développement local:
#   - Firebase Emulators (Auth, Firestore, Functions, Storage)
#   - SOS Platform Frontend (Vite - port 5174)
#   - SOS Cloud Functions (watch mode)
#   - Outil-SOS-Expat Frontend (Vite - port 5173)
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SkipInstall,      # Passer -SkipInstall pour ne pas réinstaller les dépendances
    [switch]$SosOnly,          # Passer -SosOnly pour lancer uniquement SOS
    [switch]$OutilOnly,        # Passer -OutilOnly pour lancer uniquement Outil
    [switch]$NoEmulators       # Passer -NoEmulators pour utiliser Firebase en production
)

$ErrorActionPreference = "Continue"

# Couleurs pour le terminal
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Header($Message) {
    Write-Output ""
    Write-ColorOutput Yellow "═══════════════════════════════════════════════════════════════"
    Write-ColorOutput Yellow "  $Message"
    Write-ColorOutput Yellow "═══════════════════════════════════════════════════════════════"
    Write-Output ""
}

function Write-Step($Message) {
    Write-ColorOutput Cyan "→ $Message"
}

function Write-Success($Message) {
    Write-ColorOutput Green "✓ $Message"
}

function Write-Error($Message) {
    Write-ColorOutput Red "✗ $Message"
}

# Répertoire racine du projet
$projectRoot = $PSScriptRoot
$sosDir = Join-Path $projectRoot "sos"
$outilDir = Join-Path $projectRoot "Outil-sos-expat"
$sosFunctionsDir = Join-Path $sosDir "firebase\functions"
$outilFunctionsDir = Join-Path $outilDir "functions"

Write-Header "SOS EXPAT - DÉMARRAGE LOCAL"

# Vérification des prérequis
Write-Step "Vérification des prérequis..."

# Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Success "Node.js: $nodeVersion"
} catch {
    Write-Error "Node.js n'est pas installé!"
    exit 1
}

# Firebase CLI
try {
    $firebaseVersion = firebase --version 2>$null
    Write-Success "Firebase CLI: $firebaseVersion"
} catch {
    Write-Error "Firebase CLI n'est pas installé! Installez-le avec: npm install -g firebase-tools"
    exit 1
}

# Installation des dépendances si nécessaire
if (-not $SkipInstall) {
    Write-Header "INSTALLATION DES DÉPENDANCES"

    if (-not $OutilOnly) {
        Write-Step "Installation des dépendances SOS..."
        Push-Location $sosDir
        npm install
        Pop-Location

        Write-Step "Installation des dépendances SOS Functions..."
        Push-Location $sosFunctionsDir
        npm install
        Pop-Location
    }

    if (-not $SosOnly) {
        Write-Step "Installation des dépendances Outil-SOS-Expat..."
        Push-Location $outilDir
        npm install
        Pop-Location

        Write-Step "Installation des dépendances Outil Functions..."
        Push-Location $outilFunctionsDir
        npm install
        Pop-Location
    }

    Write-Success "Toutes les dépendances sont installées!"
}

# Build initial des fonctions
Write-Header "BUILD DES CLOUD FUNCTIONS"

if (-not $OutilOnly) {
    Write-Step "Build des fonctions SOS..."
    Push-Location $sosFunctionsDir
    npm run build
    Pop-Location
}

if (-not $SosOnly) {
    Write-Step "Build des fonctions Outil..."
    Push-Location $outilFunctionsDir
    npm run build
    Pop-Location
}

Write-Success "Build des fonctions terminé!"

# Démarrage des services
Write-Header "DÉMARRAGE DES SERVICES"

# Tableau pour stocker les processus
$jobs = @()

# 1. Firebase Emulators (pour SOS)
if (-not $NoEmulators -and -not $OutilOnly) {
    Write-Step "Démarrage des Firebase Emulators pour SOS..."
    $emulatorJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        firebase emulators:start --only firestore,functions,auth,storage 2>&1
    } -ArgumentList $sosDir
    $jobs += @{Name = "Firebase Emulators (SOS)"; Job = $emulatorJob; Port = 4002}
    Start-Sleep -Seconds 5  # Attendre que les émulateurs démarrent
}

# 2. SOS Functions Watch Mode
if (-not $OutilOnly) {
    Write-Step "Démarrage du watch mode pour SOS Functions..."
    $functionWatchJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run build:watch 2>&1
    } -ArgumentList $sosFunctionsDir
    $jobs += @{Name = "SOS Functions Watch"; Job = $functionWatchJob}
}

# 3. SOS Frontend (Vite)
if (-not $OutilOnly) {
    Write-Step "Démarrage du frontend SOS (port 5174)..."
    $sosFrontendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run dev 2>&1
    } -ArgumentList $sosDir
    $jobs += @{Name = "SOS Frontend"; Job = $sosFrontendJob; Port = 5174}
}

# 4. Outil-SOS-Expat Frontend (Vite)
if (-not $SosOnly) {
    Write-Step "Démarrage du frontend Outil-SOS-Expat (port 5173)..."
    $outilFrontendJob = Start-Job -ScriptBlock {
        param($dir)
        Set-Location $dir
        npm run dev 2>&1
    } -ArgumentList $outilDir
    $jobs += @{Name = "Outil Frontend"; Job = $outilFrontendJob; Port = 5173}
}

# Attendre que tous les services démarrent
Start-Sleep -Seconds 8

Write-Header "SERVICES ACTIFS"
Write-Output ""
Write-ColorOutput Green "Les services suivants sont maintenant actifs:"
Write-Output ""

if (-not $OutilOnly) {
    Write-ColorOutput Cyan "  📱 SOS Platform Frontend:"
    Write-ColorOutput White "     → http://localhost:5174"
    Write-Output ""
}

if (-not $SosOnly) {
    Write-ColorOutput Cyan "  🛠️  Outil-SOS-Expat Frontend:"
    Write-ColorOutput White "     → http://localhost:5173"
    Write-Output ""
}

if (-not $NoEmulators -and -not $OutilOnly) {
    Write-ColorOutput Cyan "  🔥 Firebase Emulator UI:"
    Write-ColorOutput White "     → http://localhost:4002"
    Write-Output ""
    Write-ColorOutput Cyan "  Émulateurs:"
    Write-ColorOutput White "     → Auth:      http://localhost:9099"
    Write-ColorOutput White "     → Firestore: http://localhost:8080"
    Write-ColorOutput White "     → Functions: http://localhost:5001"
    Write-ColorOutput White "     → Storage:   http://localhost:9199"
    Write-Output ""
}

Write-ColorOutput Yellow "═══════════════════════════════════════════════════════════════"
Write-ColorOutput Yellow "  Appuyez sur Ctrl+C pour arrêter tous les services"
Write-ColorOutput Yellow "═══════════════════════════════════════════════════════════════"
Write-Output ""

# Fonction de nettoyage
function Stop-AllJobs {
    Write-Output ""
    Write-Header "ARRÊT DES SERVICES"
    foreach ($jobInfo in $jobs) {
        Write-Step "Arrêt de $($jobInfo.Name)..."
        Stop-Job -Job $jobInfo.Job -ErrorAction SilentlyContinue
        Remove-Job -Job $jobInfo.Job -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Tous les services ont été arrêtés."
}

# Gestionnaire pour Ctrl+C
try {
    # Afficher les logs en temps réel
    while ($true) {
        foreach ($jobInfo in $jobs) {
            $output = Receive-Job -Job $jobInfo.Job -ErrorAction SilentlyContinue
            if ($output) {
                foreach ($line in $output) {
                    Write-Output "[$($jobInfo.Name)] $line"
                }
            }
        }
        Start-Sleep -Milliseconds 500
    }
} finally {
    Stop-AllJobs
}

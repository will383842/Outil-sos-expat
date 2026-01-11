# =====================================================
# SCRIPT DE BACKUP DES SECRETS - SOS EXPAT
# =====================================================
# Ce script exporte et chiffre les secrets Firebase
# Usage: .\backup-secrets.ps1 [-Upload]
# =====================================================

param(
    [switch]$Upload,
    [string]$EncryptionKey = $env:BACKUP_ENCRYPTION_KEY
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "$PSScriptRoot\..\secrets-backup"
$outputFile = "$backupDir\secrets-$timestamp.json"
$encryptedFile = "$backupDir\secrets-$timestamp.enc"

# Couleurs pour output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Info "=========================================="
Write-Info "BACKUP DES SECRETS SOS-EXPAT"
Write-Info "Date: $timestamp"
Write-Info "=========================================="

# 1. Verifier Firebase CLI
Write-Info "`n[1/5] Verification Firebase CLI..."
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Success "Firebase CLI v$firebaseVersion detecte"
} catch {
    Write-Error "Firebase CLI non installe. Installez avec: npm install -g firebase-tools"
    exit 1
}

# 2. Creer le dossier de backup
Write-Info "`n[2/5] Creation du dossier de backup..."
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Success "Dossier cree: $backupDir"
} else {
    Write-Success "Dossier existant: $backupDir"
}

# 3. Exporter la configuration Firebase
Write-Info "`n[3/5] Export de la configuration Firebase Functions..."
Push-Location "$PSScriptRoot\..\..\sos"
try {
    $config = firebase functions:config:get 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Impossible d'exporter la config Firebase (peut-etre vide ou pas connecte)"
        $config = "{}"
    }

    # Creer le fichier de backup avec metadonnees
    $backupData = @{
        metadata = @{
            exportDate = $timestamp
            project = "sos-urgently-ac307"
            exportedBy = $env:USERNAME
            hostname = $env:COMPUTERNAME
        }
        firebaseConfig = $config | ConvertFrom-Json -ErrorAction SilentlyContinue
        environmentVariables = @{
            note = "Variables d'environnement non incluses automatiquement"
            requiredVars = @(
                "VITE_FIREBASE_API_KEY",
                "VITE_FIREBASE_AUTH_DOMAIN",
                "VITE_FIREBASE_PROJECT_ID",
                "VITE_FIREBASE_STORAGE_BUCKET",
                "VITE_FIREBASE_MESSAGING_SENDER_ID",
                "VITE_FIREBASE_APP_ID",
                "VITE_STRIPE_PUBLISHABLE_KEY",
                "VITE_PAYPAL_CLIENT_ID",
                "VITE_RECAPTCHA_SITE_KEY"
            )
        }
    }

    $backupData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Success "Configuration exportee vers: $outputFile"
} finally {
    Pop-Location
}

# 4. Chiffrer le fichier
Write-Info "`n[4/5] Chiffrement du fichier..."
if (-not $EncryptionKey) {
    Write-Warning "Pas de cle de chiffrement fournie."
    Write-Warning "Definissez BACKUP_ENCRYPTION_KEY ou utilisez -EncryptionKey"
    Write-Warning "Le fichier reste NON CHIFFRE: $outputFile"
    Write-Warning "ATTENTION: Ne commitez PAS ce fichier dans Git!"
} else {
    try {
        # Utiliser OpenSSL si disponible
        $opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
        if ($opensslPath) {
            & openssl enc -aes-256-cbc -salt -pbkdf2 -in $outputFile -out $encryptedFile -pass pass:$EncryptionKey
            Remove-Item $outputFile -Force
            Write-Success "Fichier chiffre: $encryptedFile"
            Write-Success "Fichier original supprime"
        } else {
            Write-Warning "OpenSSL non trouve. Fichier non chiffre."
        }
    } catch {
        Write-Error "Erreur lors du chiffrement: $_"
    }
}

# 5. Upload vers bucket DR (optionnel)
if ($Upload) {
    Write-Info "`n[5/5] Upload vers bucket DR..."
    try {
        $fileToUpload = if (Test-Path $encryptedFile) { $encryptedFile } else { $outputFile }
        gsutil cp $fileToUpload "gs://sos-expat-backup-dr/secrets/"
        Write-Success "Fichier uploade vers gs://sos-expat-backup-dr/secrets/"
    } catch {
        Write-Error "Erreur lors de l'upload: $_"
    }
} else {
    Write-Info "`n[5/5] Upload ignore (utilisez -Upload pour activer)"
}

# Resume
Write-Info "`n=========================================="
Write-Info "RESUME DU BACKUP"
Write-Info "=========================================="
Write-Success "Backup termine avec succes!"
if (Test-Path $encryptedFile) {
    Write-Info "Fichier: $encryptedFile (chiffre)"
} elseif (Test-Path $outputFile) {
    Write-Warning "Fichier: $outputFile (NON chiffre!)"
}

Write-Info "`nPROCHAINES ETAPES:"
Write-Info "1. Verifiez le contenu du backup"
Write-Info "2. Sauvegardez la cle de chiffrement dans un gestionnaire de mots de passe"
Write-Info "3. Uploadez vers le bucket DR avec: .\backup-secrets.ps1 -Upload"

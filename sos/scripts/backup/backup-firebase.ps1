# ============================================================
# SCRIPT DE SAUVEGARDE COMPLETE FIREBASE - SOS EXPAT
# ============================================================
# Ce script sauvegarde TOUT votre projet Firebase en local :
# - Firestore (base de donnees)
# - Storage (fichiers)
# - Authentication (utilisateurs)
# - Secrets/Config des Cloud Functions
# - Regles Firestore et Storage
# ============================================================

param(
    [string]$BackupRoot = "C:\FirebaseBackups\sos-expat",
    [string]$ProjectId = "sos-urgently-ac307",
    [int]$RetentionDays = 30
)

# Configuration
$ErrorActionPreference = "Stop"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = Join-Path $BackupRoot $Date
$LogFile = Join-Path $BackupDir "backup.log"

# Couleurs pour le terminal
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERREUR] $args" -ForegroundColor Red }

# Fonction de logging
function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LogFile -Append
}

# ============================================================
# DEBUT DU SCRIPT
# ============================================================

Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "   SAUVEGARDE COMPLETE FIREBASE - SOS EXPAT" -ForegroundColor Magenta
Write-Host "   Projet: $ProjectId" -ForegroundColor Magenta
Write-Host "   Date: $Date" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""

# Creer le dossier de backup
Write-Info "Creation du dossier de backup: $BackupDir"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\firestore" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\storage" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\auth" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\secrets" -Force | Out-Null
New-Item -ItemType Directory -Path "$BackupDir\rules" -Force | Out-Null

Log "Debut de la sauvegarde"

# ============================================================
# 1. SAUVEGARDE FIRESTORE (Base de donnees)
# ============================================================
Write-Host ""
Write-Info "1/6 - Sauvegarde Firestore..."

try {
    # Methode 1: Export via gcloud (necessite un bucket GCS temporaire)
    # Methode 2: Utiliser un script Node.js pour exporter collection par collection

    $firestoreScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialiser avec les credentials par defaut
admin.initializeApp({
    projectId: '$ProjectId'
});

const db = admin.firestore();
const outputDir = '$($BackupDir -replace '\\', '/')' + '/firestore';

async function exportCollection(collectionRef, collectionPath) {
    const snapshot = await collectionRef.get();
    const data = [];

    for (const doc of snapshot.docs) {
        const docData = {
            id: doc.id,
            data: doc.data(),
            subcollections: {}
        };

        // Recuperer les sous-collections
        const subcollections = await doc.ref.listCollections();
        for (const subcol of subcollections) {
            docData.subcollections[subcol.id] = await exportSubcollection(subcol);
        }

        data.push(docData);
    }

    return data;
}

async function exportSubcollection(collectionRef) {
    const snapshot = await collectionRef.get();
    const data = [];

    for (const doc of snapshot.docs) {
        const docData = {
            id: doc.id,
            data: doc.data()
        };

        // Recursif pour sous-sous-collections
        const subcollections = await doc.ref.listCollections();
        if (subcollections.length > 0) {
            docData.subcollections = {};
            for (const subcol of subcollections) {
                docData.subcollections[subcol.id] = await exportSubcollection(subcol);
            }
        }

        data.push(docData);
    }

    return data;
}

async function main() {
    console.log('Connexion a Firestore...');

    // Lister toutes les collections racine
    const collections = await db.listCollections();
    console.log('Collections trouvees:', collections.map(c => c.id).join(', '));

    const fullBackup = {};

    for (const collection of collections) {
        console.log('Export de:', collection.id);
        fullBackup[collection.id] = await exportCollection(collection, collection.id);

        // Sauvegarder aussi individuellement
        const filePath = path.join(outputDir, collection.id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(fullBackup[collection.id], null, 2));
        console.log('  -> Sauvegarde:', filePath);
    }

    // Sauvegarder le backup complet
    const fullBackupPath = path.join(outputDir, '_FULL_BACKUP.json');
    fs.writeFileSync(fullBackupPath, JSON.stringify(fullBackup, null, 2));
    console.log('Backup complet:', fullBackupPath);

    console.log('Export Firestore termine!');
    process.exit(0);
}

main().catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
});
"@

    $firestoreScriptPath = Join-Path $BackupDir "export-firestore.js"
    $firestoreScript | Out-File -FilePath $firestoreScriptPath -Encoding UTF8

    # Executer le script
    Push-Location (Join-Path $PSScriptRoot "firebase\functions")
    node $firestoreScriptPath
    Pop-Location

    Write-Success "Firestore sauvegarde!"
    Log "Firestore exporte avec succes"
}
catch {
    Write-Err "Echec Firestore: $_"
    Log "ERREUR Firestore: $_"
}

# ============================================================
# 2. SAUVEGARDE STORAGE (Fichiers)
# ============================================================
Write-Host ""
Write-Info "2/6 - Sauvegarde Storage..."

try {
    $storageBucket = "$ProjectId.appspot.com"
    $storageDir = Join-Path $BackupDir "storage"

    # Utiliser gsutil pour telecharger tout le bucket
    Write-Info "Telechargement depuis gs://$storageBucket..."
    gsutil -m cp -r "gs://$storageBucket/*" $storageDir 2>&1

    Write-Success "Storage sauvegarde!"
    Log "Storage exporte avec succes"
}
catch {
    Write-Warn "Echec Storage (gsutil peut ne pas etre installe): $_"
    Log "ERREUR Storage: $_"

    # Alternative avec Node.js
    Write-Info "Tentative avec Firebase Admin SDK..."

    $storageScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
    projectId: '$ProjectId',
    storageBucket: '$ProjectId.appspot.com'
});

const bucket = admin.storage().bucket();
const outputDir = '$($BackupDir -replace '\\', '/')' + '/storage';

async function downloadAllFiles() {
    console.log('Listage des fichiers...');
    const [files] = await bucket.getFiles();

    console.log('Fichiers trouves:', files.length);

    for (const file of files) {
        const destPath = path.join(outputDir, file.name);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        console.log('Telechargement:', file.name);
        await file.download({ destination: destPath });
    }

    console.log('Telechargement termine!');
}

downloadAllFiles().catch(console.error);
"@

    $storageScriptPath = Join-Path $BackupDir "export-storage.js"
    $storageScript | Out-File -FilePath $storageScriptPath -Encoding UTF8

    Push-Location (Join-Path $PSScriptRoot "firebase\functions")
    node $storageScriptPath
    Pop-Location
}

# ============================================================
# 3. SAUVEGARDE AUTHENTICATION (Utilisateurs)
# ============================================================
Write-Host ""
Write-Info "3/6 - Sauvegarde Authentication..."

try {
    $authDir = Join-Path $BackupDir "auth"
    $authFile = Join-Path $authDir "users.json"

    Push-Location $PSScriptRoot
    firebase auth:export $authFile --format=json --project $ProjectId
    Pop-Location

    Write-Success "Authentication sauvegarde!"
    Log "Auth exporte avec succes"
}
catch {
    Write-Err "Echec Authentication: $_"
    Log "ERREUR Auth: $_"
}

# ============================================================
# 4. SAUVEGARDE SECRETS / CONFIG
# ============================================================
Write-Host ""
Write-Info "4/6 - Sauvegarde Secrets et Config..."

try {
    $secretsDir = Join-Path $BackupDir "secrets"

    # Firebase Functions Config
    Push-Location $PSScriptRoot
    $config = firebase functions:config:get --project $ProjectId 2>&1
    $config | Out-File -FilePath (Join-Path $secretsDir "functions-config.json") -Encoding UTF8
    Pop-Location

    # Copier les fichiers .env locaux s'ils existent
    $envFiles = @(
        ".env",
        ".env.local",
        ".env.production",
        "firebase/functions/.env",
        "firebase/functions/.env.local"
    )

    foreach ($envFile in $envFiles) {
        $envPath = Join-Path $PSScriptRoot $envFile
        if (Test-Path $envPath) {
            $destName = $envFile -replace "/", "_"
            Copy-Item $envPath (Join-Path $secretsDir $destName)
            Write-Info "  Copie: $envFile"
        }
    }

    # Sauvegarder serviceAccountKey si existe
    $saKey = Join-Path $PSScriptRoot "firebase/functions/serviceAccountKey.json"
    if (Test-Path $saKey) {
        Copy-Item $saKey (Join-Path $secretsDir "serviceAccountKey.json")
        Write-Info "  Copie: serviceAccountKey.json"
    }

    Write-Success "Secrets sauvegardes!"
    Log "Secrets exportes avec succes"
}
catch {
    Write-Warn "Echec partiel Secrets: $_"
    Log "ERREUR Secrets: $_"
}

# ============================================================
# 5. SAUVEGARDE REGLES (Firestore + Storage)
# ============================================================
Write-Host ""
Write-Info "5/6 - Sauvegarde des regles..."

try {
    $rulesDir = Join-Path $BackupDir "rules"

    # Firestore rules
    $firestoreRules = Join-Path $PSScriptRoot "firestore.rules"
    if (Test-Path $firestoreRules) {
        Copy-Item $firestoreRules (Join-Path $rulesDir "firestore.rules")
    }

    # Storage rules
    $storageRules = Join-Path $PSScriptRoot "storage.rules"
    if (Test-Path $storageRules) {
        Copy-Item $storageRules (Join-Path $rulesDir "storage.rules")
    }

    # Firestore indexes
    $firestoreIndexes = Join-Path $PSScriptRoot "firebase/firestore.indexes.json"
    if (Test-Path $firestoreIndexes) {
        Copy-Item $firestoreIndexes (Join-Path $rulesDir "firestore.indexes.json")
    }

    Write-Success "Regles sauvegardees!"
    Log "Regles exportees avec succes"
}
catch {
    Write-Warn "Echec Regles: $_"
    Log "ERREUR Regles: $_"
}

# ============================================================
# 6. SAUVEGARDE CODE SOURCE (Optionnel mais recommande)
# ============================================================
Write-Host ""
Write-Info "6/6 - Sauvegarde du code source..."

try {
    $codeDir = Join-Path $BackupDir "code"
    New-Item -ItemType Directory -Path $codeDir -Force | Out-Null

    # Copier les fichiers importants (sans node_modules)
    $itemsToCopy = @(
        "firebase/functions/src",
        "firebase/functions/package.json",
        "firebase/functions/tsconfig.json",
        "src",
        "package.json",
        "tsconfig.json",
        "firebase.json",
        ".firebaserc"
    )

    foreach ($item in $itemsToCopy) {
        $sourcePath = Join-Path $PSScriptRoot $item
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $codeDir $item
            $destDir = Split-Path $destPath -Parent

            if (!(Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }

            if ((Get-Item $sourcePath).PSIsContainer) {
                Copy-Item $sourcePath $destPath -Recurse -Force
            } else {
                Copy-Item $sourcePath $destPath -Force
            }
            Write-Info "  Copie: $item"
        }
    }

    Write-Success "Code source sauvegarde!"
    Log "Code source copie avec succes"
}
catch {
    Write-Warn "Echec Code source: $_"
    Log "ERREUR Code source: $_"
}

# ============================================================
# NETTOYAGE DES ANCIENS BACKUPS
# ============================================================
Write-Host ""
Write-Info "Nettoyage des backups de plus de $RetentionDays jours..."

try {
    $oldBackups = Get-ChildItem -Path $BackupRoot -Directory |
        Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) }

    foreach ($old in $oldBackups) {
        Write-Info "  Suppression: $($old.Name)"
        Remove-Item $old.FullName -Recurse -Force
    }

    if ($oldBackups.Count -eq 0) {
        Write-Info "  Aucun ancien backup a supprimer"
    }

    Log "Nettoyage termine"
}
catch {
    Write-Warn "Echec nettoyage: $_"
}

# ============================================================
# RESUME
# ============================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   SAUVEGARDE TERMINEE!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Emplacement: $BackupDir" -ForegroundColor Yellow
Write-Host ""

# Calculer la taille
$size = (Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum
$sizeFormatted = "{0:N2} MB" -f ($size / 1MB)
Write-Host "Taille totale: $sizeFormatted" -ForegroundColor Cyan

# Lister le contenu
Write-Host ""
Write-Host "Contenu:" -ForegroundColor Cyan
Get-ChildItem $BackupDir | ForEach-Object {
    $itemSize = if ($_.PSIsContainer) {
        $s = (Get-ChildItem $_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
        "{0:N2} MB" -f ($s / 1MB)
    } else {
        "{0:N2} KB" -f ($_.Length / 1KB)
    }
    Write-Host "  $($_.Name) - $itemSize"
}

Log "Sauvegarde terminee - Taille: $sizeFormatted"

Write-Host ""
Write-Host "Pour restaurer, consultez le fichier README dans le dossier de backup." -ForegroundColor Gray

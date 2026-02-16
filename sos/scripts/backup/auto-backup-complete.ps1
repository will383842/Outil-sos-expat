# ============================================================
# SAUVEGARDE AUTOMATIQUE COMPLETE - SOS EXPAT
# ============================================================
# Ce script sauvegarde ABSOLUMENT TOUT en local:
# - Firestore (exports GCP)
# - Storage (tous les fichiers)
# - Authentication (utilisateurs)
# - Secrets et Config
# - Code source
# - Regles de securite
# - Bucket backup DR
# ============================================================

param(
    [string]$BackupRoot = "C:\Users\willi\Documents\BACKUP_SOS-Expat",
    [string]$ProjectId = "sos-urgently-ac307",
    [int]$RetentionDays = 30
)

# Configuration
$ErrorActionPreference = "Continue"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = Join-Path $BackupRoot $Date
$LogFile = Join-Path $BackupDir "backup.log"
$ProjectDir = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos"

# Couleurs
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERREUR] $args" -ForegroundColor Red }

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - $Message"
    Write-Host $logEntry
    if (Test-Path (Split-Path $LogFile -Parent)) {
        $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
    }
}

# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   SAUVEGARDE COMPLETE SOS-EXPAT" -ForegroundColor Magenta
Write-Host "   $Date" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

# Creer structure de dossiers
Write-Info "Creation des dossiers..."
$folders = @(
    $BackupDir,
    "$BackupDir\01-firestore-gcp-backups",
    "$BackupDir\02-firestore-exports",
    "$BackupDir\03-storage-files",
    "$BackupDir\04-auth-users",
    "$BackupDir\05-secrets-config",
    "$BackupDir\06-rules-indexes",
    "$BackupDir\07-code-source",
    "$BackupDir\08-bucket-backup-dr"
)
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}
Log "Dossiers crees"

# ============================================================
# 1. TELECHARGER LE BUCKET BACKUP-DR (contient les backups auto)
# ============================================================
Write-Host ""
Write-Info "1/8 - Telechargement bucket backup-dr..."
try {
    $drDir = "$BackupDir\08-bucket-backup-dr"
    gsutil -m rsync -r "gs://sos-expat-backup-dr/" "$drDir\" 2>&1 | Out-Null
    Write-Success "Bucket backup-dr telecharge!"
    Log "Bucket backup-dr: OK"
} catch {
    Write-Warn "Echec bucket backup-dr: $_"
    Log "Bucket backup-dr: ECHEC - $_"
}

# ============================================================
# 2. LISTER ET SAUVEGARDER INFO DES BACKUPS FIRESTORE GCP
# ============================================================
Write-Host ""
Write-Info "2/8 - Liste des backups Firestore GCP..."
try {
    $gcpBackups = gcloud firestore backups list --project=$ProjectId --format=json 2>&1
    $gcpBackups | Out-File -FilePath "$BackupDir\01-firestore-gcp-backups\backups-list.json" -Encoding UTF8

    # Sauvegarder les metadata de la database
    $dbInfo = gcloud firestore databases describe --project=$ProjectId --format=json 2>&1
    $dbInfo | Out-File -FilePath "$BackupDir\01-firestore-gcp-backups\database-info.json" -Encoding UTF8

    # Liste des schedules
    $schedules = gcloud firestore backups schedules list --database="(default)" --project=$ProjectId --format=json 2>&1
    $schedules | Out-File -FilePath "$BackupDir\01-firestore-gcp-backups\backup-schedules.json" -Encoding UTF8

    Write-Success "Info backups GCP sauvegardee!"
    Log "Backups GCP info: OK"
} catch {
    Write-Warn "Echec info backups GCP: $_"
    Log "Backups GCP info: ECHEC"
}

# ============================================================
# 3. EXPORT FIRESTORE COMPLET (via Admin SDK)
# ============================================================
Write-Host ""
Write-Info "3/8 - Export Firestore complet..."
try {
    $firestoreScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: '$ProjectId'
    });
} else {
    admin.initializeApp({ projectId: '$ProjectId' });
}

const db = admin.firestore();
const outputDir = '$($BackupDir -replace '\\', '/')' + '/02-firestore-exports';

async function exportCollection(collectionRef, depth = 0) {
    const snapshot = await collectionRef.get();
    const data = [];

    for (const doc of snapshot.docs) {
        const docData = {
            _id: doc.id,
            _path: doc.ref.path,
            _createTime: doc.createTime?.toDate()?.toISOString(),
            _updateTime: doc.updateTime?.toDate()?.toISOString(),
            ...doc.data()
        };

        // Convertir les Timestamps
        for (const [key, value] of Object.entries(docData)) {
            if (value && value.toDate) {
                docData[key] = { _type: 'Timestamp', value: value.toDate().toISOString() };
            }
            if (value && value._lat !== undefined) {
                docData[key] = { _type: 'GeoPoint', lat: value._lat, lng: value._lng };
            }
        }

        // Sous-collections (max 3 niveaux)
        if (depth < 3) {
            const subcollections = await doc.ref.listCollections();
            if (subcollections.length > 0) {
                docData._subcollections = {};
                for (const subcol of subcollections) {
                    docData._subcollections[subcol.id] = await exportCollection(subcol, depth + 1);
                }
            }
        }

        data.push(docData);
    }

    return data;
}

async function main() {
    console.log('Connexion Firestore...');
    const collections = await db.listCollections();
    console.log('Collections:', collections.map(c => c.id).join(', '));

    const fullBackup = {
        _exportDate: new Date().toISOString(),
        _projectId: '$ProjectId',
        collections: {}
    };

    for (const collection of collections) {
        console.log('Export:', collection.id);
        const data = await exportCollection(collection);
        fullBackup.collections[collection.id] = data;

        // Fichier individuel par collection
        fs.writeFileSync(
            path.join(outputDir, collection.id + '.json'),
            JSON.stringify(data, null, 2)
        );
    }

    // Backup complet
    fs.writeFileSync(
        path.join(outputDir, '_COMPLETE_BACKUP.json'),
        JSON.stringify(fullBackup, null, 2)
    );

    console.log('Export termine!');
    process.exit(0);
}

main().catch(err => {
    console.error('Erreur:', err.message);
    process.exit(1);
});
"@

    $scriptPath = "$BackupDir\export-firestore-temp.js"
    $firestoreScript | Out-File -FilePath $scriptPath -Encoding UTF8

    Push-Location "$ProjectDir\firebase\functions"
    $output = node $scriptPath 2>&1
    Write-Host $output
    Pop-Location

    Remove-Item $scriptPath -Force -ErrorAction SilentlyContinue
    Write-Success "Firestore exporte!"
    Log "Firestore export: OK"
} catch {
    Write-Warn "Echec export Firestore: $_"
    Log "Firestore export: ECHEC - $_"
}

# ============================================================
# 4. TELECHARGER TOUT LE STORAGE
# ============================================================
Write-Host ""
Write-Info "4/8 - Telechargement Storage complet..."
try {
    $storageDir = "$BackupDir\03-storage-files"
    gsutil -m rsync -r "gs://$ProjectId.firebasestorage.app/" "$storageDir\" 2>&1 | Out-Null
    Write-Success "Storage telecharge!"
    Log "Storage: OK"
} catch {
    Write-Warn "Echec Storage: $_"
    Log "Storage: ECHEC"
}

# ============================================================
# 5. EXPORT AUTHENTICATION
# ============================================================
Write-Host ""
Write-Info "5/8 - Export Authentication..."
try {
    $authDir = "$BackupDir\04-auth-users"
    Push-Location $ProjectDir
    firebase auth:export "$authDir\users.json" --format=json --project=$ProjectId 2>&1 | Out-Null
    Pop-Location
    Write-Success "Authentication exportee!"
    Log "Auth: OK"
} catch {
    Write-Warn "Echec Auth: $_"
    Log "Auth: ECHEC"
}

# ============================================================
# 6. SECRETS ET CONFIG
# ============================================================
Write-Host ""
Write-Info "6/8 - Sauvegarde Secrets et Config..."
try {
    $secretsDir = "$BackupDir\05-secrets-config"

    # Firebase Functions Config (ancienne methode)
    Push-Location $ProjectDir
    $config = firebase functions:config:get --project=$ProjectId 2>&1
    $config | Out-File -FilePath "$secretsDir\functions-config.json" -Encoding UTF8
    Pop-Location

    # Google Cloud Secret Manager
    try {
        $secrets = gcloud secrets list --project=$ProjectId --format=json 2>&1
        $secrets | Out-File -FilePath "$secretsDir\gcloud-secrets-list.json" -Encoding UTF8

        # Tenter de recuperer les valeurs des secrets
        $secretsList = $secrets | ConvertFrom-Json
        foreach ($secret in $secretsList) {
            $secretName = $secret.name -split '/' | Select-Object -Last 1
            try {
                $secretValue = gcloud secrets versions access latest --secret=$secretName --project=$ProjectId 2>&1
                $secretValue | Out-File -FilePath "$secretsDir\secret_$secretName.txt" -Encoding UTF8
            } catch {}
        }
    } catch {
        Write-Info "  Pas de secrets dans Secret Manager"
    }

    # Fichiers .env locaux
    $envFiles = @(
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        "firebase\functions\.env",
        "firebase\functions\.env.local",
        "firebase\functions\.env.production"
    )

    foreach ($envFile in $envFiles) {
        $envPath = Join-Path $ProjectDir $envFile
        if (Test-Path $envPath) {
            $destName = ($envFile -replace '\\', '_') -replace '/', '_'
            Copy-Item $envPath "$secretsDir\$destName"
            Write-Info "  Copie: $envFile"
        }
    }

    # Service Account Key
    $saKeys = @(
        "firebase\functions\serviceAccountKey.json",
        "serviceAccountKey.json",
        "service-account.json"
    )
    foreach ($saKey in $saKeys) {
        $saPath = Join-Path $ProjectDir $saKey
        if (Test-Path $saPath) {
            Copy-Item $saPath "$secretsDir\serviceAccountKey.json"
            Write-Info "  Copie: $saKey"
            break
        }
    }

    # Firebase config (web)
    $firebaseConfigs = Get-ChildItem -Path $ProjectDir -Recurse -Include "firebase*.ts","firebase*.js","firebaseConfig*" -ErrorAction SilentlyContinue | Select-Object -First 5
    foreach ($config in $firebaseConfigs) {
        Copy-Item $config.FullName "$secretsDir\$($config.Name)" -ErrorAction SilentlyContinue
    }

    Write-Success "Secrets sauvegardes!"
    Log "Secrets: OK"
} catch {
    Write-Warn "Echec Secrets: $_"
    Log "Secrets: ECHEC"
}

# ============================================================
# 7. REGLES ET INDEXES
# ============================================================
Write-Host ""
Write-Info "7/8 - Sauvegarde Regles et Indexes..."
try {
    $rulesDir = "$BackupDir\06-rules-indexes"

    # Fichiers de regles
    $ruleFiles = @(
        "firestore.rules",
        "storage.rules",
        "database.rules.json",
        "firebase\firestore.indexes.json",
        "firebase.json",
        ".firebaserc"
    )

    foreach ($ruleFile in $ruleFiles) {
        $rulePath = Join-Path $ProjectDir $ruleFile
        if (Test-Path $rulePath) {
            $destName = ($ruleFile -replace '\\', '_') -replace '/', '_'
            Copy-Item $rulePath "$rulesDir\$destName"
            Write-Info "  Copie: $ruleFile"
        }
    }

    # Telecharger les regles actives depuis Firebase
    Push-Location $ProjectDir
    try {
        # Firestore rules actuelles
        $fsRules = firebase firestore:rules:get --project=$ProjectId 2>&1
        $fsRules | Out-File -FilePath "$rulesDir\firestore-rules-active.txt" -Encoding UTF8
    } catch {}
    Pop-Location

    Write-Success "Regles sauvegardees!"
    Log "Regles: OK"
} catch {
    Write-Warn "Echec Regles: $_"
    Log "Regles: ECHEC"
}

# ============================================================
# 8. CODE SOURCE COMPLET
# ============================================================
Write-Host ""
Write-Info "8/8 - Sauvegarde Code Source..."
try {
    $codeDir = "$BackupDir\07-code-source"

    # Copier tout le projet (sans node_modules, .git, dist)
    $excludeDirs = @("node_modules", ".git", "dist", "build", ".next", ".cache", "coverage", ".firebase")

    Get-ChildItem -Path $ProjectDir -Directory | Where-Object { $_.Name -notin $excludeDirs } | ForEach-Object {
        Copy-Item $_.FullName "$codeDir\$($_.Name)" -Recurse -Force
    }

    # Copier les fichiers racine
    Get-ChildItem -Path $ProjectDir -File | ForEach-Object {
        Copy-Item $_.FullName "$codeDir\$($_.Name)" -Force
    }

    Write-Success "Code source sauvegarde!"
    Log "Code source: OK"
} catch {
    Write-Warn "Echec Code source: $_"
    Log "Code source: ECHEC"
}

# ============================================================
# CREER FICHIER README DE RESTAURATION
# ============================================================
$readme = @"
# BACKUP SOS-EXPAT - $Date
================================================

## CONTENU DE CE BACKUP

| Dossier | Contenu |
|---------|---------|
| 01-firestore-gcp-backups | Info sur les backups GCP natifs |
| 02-firestore-exports | Export complet de toutes les collections |
| 03-storage-files | Tous les fichiers uploades |
| 04-auth-users | Export des utilisateurs |
| 05-secrets-config | Secrets, .env, service account |
| 06-rules-indexes | Regles Firestore/Storage, indexes |
| 07-code-source | Code source complet |
| 08-bucket-backup-dr | Contenu du bucket backup DR |

## RESTAURATION COMPLETE

### 1. Creer un nouveau projet Firebase
firebase projects:create nouveau-projet-id

### 2. Restaurer Firestore
- Utiliser le script restore-firestore.js
- Ou importer _COMPLETE_BACKUP.json via l'admin SDK

### 3. Restaurer Authentication
firebase auth:import 04-auth-users/users.json --project=nouveau-projet

### 4. Restaurer Storage
gsutil -m cp -r 03-storage-files/* gs://nouveau-projet.appspot.com/

### 5. Restaurer les secrets
- Copier 05-secrets-config/*.env vers le nouveau projet
- Importer serviceAccountKey.json

### 6. Deployer les regles
firebase deploy --only firestore:rules,storage:rules

### 7. Deployer les functions
cd 07-code-source/firebase/functions && npm install && firebase deploy --only functions

## CONTACT URGENCE
En cas de probleme, ce backup contient tout le necessaire pour reconstruire le projet.
"@

$readme | Out-File -FilePath "$BackupDir\README-RESTAURATION.md" -Encoding UTF8

# ============================================================
# NETTOYAGE DES ANCIENS BACKUPS
# ============================================================
Write-Host ""
Write-Info "Nettoyage des backups > $RetentionDays jours..."
try {
    $oldBackups = Get-ChildItem -Path $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}' } |
        Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) }

    $count = 0
    foreach ($old in $oldBackups) {
        Remove-Item $old.FullName -Recurse -Force -ErrorAction SilentlyContinue
        $count++
    }

    if ($count -gt 0) {
        Write-Info "  $count ancien(s) backup(s) supprime(s)"
    }
} catch {
    Write-Warn "Echec nettoyage: $_"
}

# ============================================================
# RESUME FINAL
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   SAUVEGARDE TERMINEE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Emplacement: $BackupDir" -ForegroundColor Yellow

# Calculer la taille
$size = (Get-ChildItem $BackupDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$sizeFormatted = "{0:N2} MB" -f ($size / 1MB)
Write-Host "Taille totale: $sizeFormatted" -ForegroundColor Cyan

Write-Host ""
Write-Host "Contenu:" -ForegroundColor Cyan
Get-ChildItem $BackupDir -Directory | ForEach-Object {
    $itemSize = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $itemSizeFormatted = "{0:N2} MB" -f ($itemSize / 1MB)
    Write-Host "  $($_.Name) - $itemSizeFormatted"
}

Log "=== BACKUP TERMINE - Taille: $sizeFormatted ==="
Write-Host ""

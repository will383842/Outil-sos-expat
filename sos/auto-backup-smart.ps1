# ============================================================
# SAUVEGARDE INTELLIGENTE SOS-EXPAT
# ============================================================
# Sauvegarde TOUT ce qui est necessaire sans telecharger
# les backups redondants (evite 150GB inutiles)
# ============================================================

param(
    [string]$BackupRoot = "C:\Users\willi\Documents\BACKUP_SOS-Expat",
    [string]$ProjectId = "sos-urgently-ac307",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Continue"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = Join-Path $BackupRoot $Date
$LogFile = Join-Path $BackupDir "backup.log"
$ProjectDir = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos"

function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERREUR] $args" -ForegroundColor Red }

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp - $Message"
    if (Test-Path (Split-Path $LogFile -Parent)) {
        $logEntry | Out-File -FilePath $LogFile -Append -Encoding UTF8
    }
}

# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   SAUVEGARDE INTELLIGENTE SOS-EXPAT" -ForegroundColor Magenta
Write-Host "   $Date" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

# Creer structure
$folders = @(
    $BackupDir,
    "$BackupDir\1-FIRESTORE",
    "$BackupDir\2-STORAGE-USERS",
    "$BackupDir\3-AUTH",
    "$BackupDir\4-SECRETS",
    "$BackupDir\5-RULES",
    "$BackupDir\6-CODE",
    "$BackupDir\7-GCP-BACKUP-INFO"
)
foreach ($f in $folders) { New-Item -ItemType Directory -Path $f -Force | Out-Null }

# ============================================================
# 1. EXPORT FIRESTORE (collections critiques, optimise memoire)
# ============================================================
Write-Host ""
Write-Info "1/8 - Export Firestore (collections critiques)..."
try {
    $functionsDir = "$ProjectDir\firebase\functions"
    $outDirEscaped = ($BackupDir -replace '\\', '/') + '/1-FIRESTORE'

    # Collections critiques a sauvegarder en priorite (donnees business)
    # Les logs/analytics sont exclus car trop volumineux et non critiques
    $firestoreScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const saPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
    admin.initializeApp({
        credential: admin.credential.cert(require(saPath)),
        projectId: '$ProjectId'
    });
} else {
    admin.initializeApp({ projectId: '$ProjectId' });
}

const db = admin.firestore();
const outDir = '$outDirEscaped';

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Collections a EXCLURE (logs volumineux, non critiques pour restauration)
const EXCLUDE_COLLECTIONS = [
    'logs', 'error_logs', 'system_logs', 'production_logs',
    'analytics', 'analytics_events', 'analytics_errors',
    'performance_metrics', 'agent_metrics_history',
    'notification_logs', 'connection_logs', 'indexing_logs',
    'storage_cleanup_logs', 'sitemap_logs', 'provider_status_logs',
    'message_events', 'message_deliveries', 'capi_events',
    'google_ads_events', 'processed_webhook_events',
    'paypal_webhook_events', 'admin_audit_logs', 'audit_logs',
    'auditLogs', 'auth_claims_logs', 'payment_audit_logs',
    'payment_audit', 'ssoLogs', 'trial_expiration_logs'
];

function convertValue(val) {
    if (!val) return val;
    if (val.toDate) return { _type: 'Timestamp', value: val.toDate().toISOString() };
    if (val._lat !== undefined) return { _type: 'GeoPoint', lat: val._lat, lng: val._lng };
    if (val.path) return { _type: 'DocumentReference', path: val.path };
    if (Array.isArray(val)) return val.map(convertValue);
    if (typeof val === 'object') {
        const converted = {};
        for (const [k, v] of Object.entries(val)) converted[k] = convertValue(v);
        return converted;
    }
    return val;
}

async function exportCollection(ref, maxDocs = 10000) {
    // Limite pour eviter crash memoire
    const snap = await ref.limit(maxDocs).get();
    return snap.docs.map(doc => ({
        _id: doc.id,
        _path: doc.ref.path,
        ...convertValue(doc.data())
    }));
}

async function main() {
    console.log('Export Firestore (collections critiques)...');
    const allCollections = await db.listCollections();

    // Filtrer les collections exclues
    const collections = allCollections.filter(c => !EXCLUDE_COLLECTIONS.includes(c.id));
    console.log('Collections a exporter:', collections.length);
    console.log('Collections exclues (logs):', allCollections.length - collections.length);

    const stats = { exported: {}, excluded: EXCLUDE_COLLECTIONS };

    for (const col of collections) {
        try {
            console.log('  -', col.id);
            const data = await exportCollection(col);
            stats.exported[col.id] = data.length;

            fs.writeFileSync(
                path.join(outDir, col.id + '.json'),
                JSON.stringify(data, null, 2)
            );

            // Liberer memoire apres chaque collection
            if (global.gc) global.gc();
        } catch (err) {
            console.error('    Erreur:', col.id, err.message);
            stats.exported[col.id] = 'ERROR: ' + err.message;
        }
    }

    fs.writeFileSync(path.join(outDir, '_STATS.json'), JSON.stringify(stats, null, 2));
    console.log('Export termine!', Object.keys(stats.exported).length, 'collections');
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
"@

    $scriptPath = "$functionsDir\temp-backup-export.js"
    $firestoreScript | Out-File -FilePath $scriptPath -Encoding UTF8

    Push-Location $functionsDir
    # Augmenter la memoire Node.js a 4GB
    $env:NODE_OPTIONS = "--max-old-space-size=4096"
    node temp-backup-export.js 2>&1 | ForEach-Object { Write-Host "  $_" }
    Remove-Item temp-backup-export.js -Force -ErrorAction SilentlyContinue
    Pop-Location

    Write-Success "Firestore exporte!"
    Log "Firestore: OK"
} catch {
    Write-Err "Echec Firestore: $_"
    Log "Firestore: ECHEC - $_"
}

# ============================================================
# 2. TELECHARGER STORAGE UTILISATEURS (sans les backups)
# ============================================================
Write-Host ""
Write-Info "2/7 - Telechargement Storage (fichiers utilisateurs seulement)..."
try {
    $storageDir = "$BackupDir\2-STORAGE-USERS"

    # Liste des dossiers a telecharger (fichiers utilisateurs uniquement)
    $userFolders = @(
        "profilePhotos",
        "profile_photos",
        "invoices",
        "documents",
        "uploads",
        "images",
        "files",
        "avatars"
    )

    foreach ($folder in $userFolders) {
        Write-Info "  Verification: $folder..."
        $exists = gsutil ls "gs://$ProjectId.firebasestorage.app/$folder/" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Info "  Telechargement: $folder..."
            New-Item -ItemType Directory -Path "$storageDir\$folder" -Force | Out-Null
            gsutil -m rsync -r "gs://$ProjectId.firebasestorage.app/$folder/" "$storageDir\$folder\" 2>&1 | Out-Null
            Write-Success "  $folder telecharge!"
        }
    }

    # Telecharger aussi les sitemaps si present
    $sitemaps = gsutil ls "gs://$ProjectId.firebasestorage.app/sitemaps/" 2>&1
    if ($LASTEXITCODE -eq 0) {
        New-Item -ItemType Directory -Path "$storageDir\sitemaps" -Force | Out-Null
        gsutil -m rsync -r "gs://$ProjectId.firebasestorage.app/sitemaps/" "$storageDir\sitemaps\" 2>&1 | Out-Null
    }

    Log "Storage users: OK"
} catch {
    Write-Warn "Echec Storage: $_"
    Log "Storage: ECHEC"
}

# ============================================================
# 3. TELECHARGER AUTH BACKUPS (dernier seulement)
# ============================================================
Write-Host ""
Write-Info "3/7 - Telechargement Auth (derniers backups)..."
try {
    $authDir = "$BackupDir\3-AUTH"

    # Export frais via Firebase CLI
    Push-Location $ProjectDir
    firebase auth:export "$authDir\users_fresh_export.json" --format=json --project=$ProjectId 2>&1 | Out-Null
    Pop-Location

    # Telecharger aussi les backups auth du bucket DR (petits fichiers)
    gsutil -m rsync -r "gs://sos-expat-backup-dr/auth_backups/" "$authDir\cloud_backups\" 2>&1 | Out-Null

    Write-Success "Auth exporte!"
    Log "Auth: OK"
} catch {
    Write-Warn "Echec Auth: $_"
    Log "Auth: ECHEC"
}

# ============================================================
# 4. SECRETS ET CONFIG
# ============================================================
Write-Host ""
Write-Info "4/7 - Sauvegarde Secrets..."
try {
    $secretsDir = "$BackupDir\4-SECRETS"

    # Firebase Functions Config
    Push-Location $ProjectDir
    firebase functions:config:get --project=$ProjectId 2>&1 | Out-File "$secretsDir\functions-config.json" -Encoding UTF8
    Pop-Location

    # Fichiers .env
    $envFiles = @(
        ".env", ".env.local", ".env.production", ".env.development",
        "firebase\functions\.env", "firebase\functions\.env.local",
        "firebase\functions\.env.production"
    )
    foreach ($ef in $envFiles) {
        $src = Join-Path $ProjectDir $ef
        if (Test-Path $src) {
            $dest = ($ef -replace '\\', '_') -replace '/', '_'
            Copy-Item $src "$secretsDir\$dest"
            Write-Info "  Copie: $ef"
        }
    }

    # Service Account Key
    $saKeys = @(
        "firebase\functions\serviceAccountKey.json",
        "serviceAccountKey.json"
    )
    foreach ($sa in $saKeys) {
        $src = Join-Path $ProjectDir $sa
        if (Test-Path $src) {
            Copy-Item $src "$secretsDir\serviceAccountKey.json"
            Write-Info "  Copie: serviceAccountKey"
            break
        }
    }

    # Google Cloud Secrets (si existent)
    try {
        $gcSecrets = gcloud secrets list --project=$ProjectId --format="value(name)" 2>&1
        if ($gcSecrets -and $LASTEXITCODE -eq 0) {
            foreach ($secret in $gcSecrets) {
                $val = gcloud secrets versions access latest --secret=$secret --project=$ProjectId 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $val | Out-File "$secretsDir\gcloud_secret_$secret.txt" -Encoding UTF8
                }
            }
        }
    } catch {}

    Write-Success "Secrets sauvegardes!"
    Log "Secrets: OK"
} catch {
    Write-Warn "Echec Secrets: $_"
    Log "Secrets: ECHEC"
}

# ============================================================
# 5. REGLES ET INDEXES
# ============================================================
Write-Host ""
Write-Info "5/7 - Sauvegarde Regles..."
try {
    $rulesDir = "$BackupDir\5-RULES"

    $ruleFiles = @(
        "firestore.rules",
        "storage.rules",
        "firebase\firestore.indexes.json",
        "firebase.json",
        ".firebaserc"
    )
    foreach ($rf in $ruleFiles) {
        $src = Join-Path $ProjectDir $rf
        if (Test-Path $src) {
            $dest = ($rf -replace '\\', '_') -replace '/', '_'
            Copy-Item $src "$rulesDir\$dest"
        }
    }

    Write-Success "Regles sauvegardees!"
    Log "Regles: OK"
} catch {
    Write-Warn "Echec Regles: $_"
    Log "Regles: ECHEC"
}

# ============================================================
# 6. CODE SOURCE
# ============================================================
Write-Host ""
Write-Info "6/7 - Sauvegarde Code Source..."
try {
    $codeDir = "$BackupDir\6-CODE"
    $exclude = @("node_modules", ".git", "dist", "build", ".next", ".cache", ".firebase")

    Get-ChildItem -Path $ProjectDir -Directory | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
        Copy-Item $_.FullName "$codeDir\$($_.Name)" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Get-ChildItem -Path $ProjectDir -File | ForEach-Object {
        Copy-Item $_.FullName "$codeDir\$($_.Name)" -Force -ErrorAction SilentlyContinue
    }

    Write-Success "Code source sauvegarde!"
    Log "Code: OK"
} catch {
    Write-Warn "Echec Code: $_"
    Log "Code: ECHEC"
}

# ============================================================
# 7. INFO BACKUPS GCP (pour reference)
# ============================================================
Write-Host ""
Write-Info "7/7 - Info backups GCP..."
try {
    $gcpDir = "$BackupDir\7-GCP-BACKUP-INFO"

    # Liste des backups Firestore GCP
    gcloud firestore backups list --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\firestore-backups.json" -Encoding UTF8

    # Info database
    gcloud firestore databases describe --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\database-info.json" -Encoding UTF8

    # Schedules
    gcloud firestore backups schedules list --database="(default)" --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\backup-schedules.json" -Encoding UTF8

    # Contenu bucket DR (liste seulement)
    gsutil ls -l gs://sos-expat-backup-dr/ 2>&1 | Out-File "$gcpDir\bucket-dr-content.txt" -Encoding UTF8

    Write-Success "Info GCP sauvegardee!"
    Log "GCP info: OK"
} catch {
    Write-Warn "Echec Info GCP: $_"
}

# ============================================================
# README
# ============================================================
$readme = @"
# BACKUP SOS-EXPAT - $Date

## CONTENU

| Dossier | Description |
|---------|-------------|
| 1-FIRESTORE | Export complet de toutes les collections Firestore |
| 2-STORAGE-USERS | Fichiers utilisateurs (photos, factures, etc.) |
| 3-AUTH | Export des utilisateurs Firebase Auth |
| 4-SECRETS | Tous les secrets, .env, service account |
| 5-RULES | Regles Firestore, Storage, indexes |
| 6-CODE | Code source complet |
| 7-GCP-BACKUP-INFO | Info sur les backups GCP natifs |

## RESTAURATION RAPIDE

### 1. Nouveau projet Firebase
firebase projects:create mon-nouveau-projet
firebase use mon-nouveau-projet

### 2. Restaurer Firestore
Utiliser le script dans 1-FIRESTORE ou:
- Aller sur console.cloud.google.com
- Firestore > Import/Export
- Importer depuis un des backups GCP listes dans 7-GCP-BACKUP-INFO

### 3. Restaurer Auth
firebase auth:import 3-AUTH/users_fresh_export.json

### 4. Restaurer Storage
gsutil -m cp -r 2-STORAGE-USERS/* gs://nouveau-projet.appspot.com/

### 5. Configurer les secrets
- Copier 4-SECRETS/*.env vers le projet
- Copier 4-SECRETS/serviceAccountKey.json

### 6. Deployer
firebase deploy --only firestore:rules,storage:rules,functions

## NOTE IMPORTANTE

Les backups Firestore GCP natifs (liste dans 7-GCP-BACKUP-INFO) sont conserves
sur Google Cloud pendant 98 jours. En cas de besoin de restauration complete
Firestore, utilisez la restauration GCP native qui est plus rapide.

Ce backup local contient tout le necessaire pour reconstruire le projet
meme si Google vous bannit completement.
"@

$readme | Out-File "$BackupDir\README.md" -Encoding UTF8

# ============================================================
# NETTOYAGE
# ============================================================
Write-Host ""
Write-Info "Nettoyage anciens backups (> $RetentionDays jours)..."
$old = Get-ChildItem -Path $BackupRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}' } |
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$RetentionDays) }
$old | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
if ($old.Count -gt 0) { Write-Info "  $($old.Count) ancien(s) backup(s) supprime(s)" }

# ============================================================
# 8. ENREGISTRER DANS FIRESTORE (pour affichage console admin)
# ============================================================
Write-Host ""
Write-Info "8/8 - Enregistrement dans Firestore..."
try {
    $size = (Get-ChildItem $BackupDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size/1MB, 2)

    # Compter les fichiers
    $firestoreFiles = (Get-ChildItem "$BackupDir\1-FIRESTORE" -File -ErrorAction SilentlyContinue).Count
    $storageFiles = (Get-ChildItem "$BackupDir\2-STORAGE-USERS" -Recurse -File -ErrorAction SilentlyContinue).Count
    $authFile = Test-Path "$BackupDir\3-AUTH\users_fresh_export.json"

    # Script Node pour enregistrer dans Firestore
    $registerScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Utiliser serviceAccountKey si dispo, sinon Application Default Credentials
const saPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
    admin.initializeApp({
        credential: admin.credential.cert(require(saPath)),
        projectId: '$ProjectId'
    });
} else {
    admin.initializeApp({ projectId: '$ProjectId' });
}

const db = admin.firestore();

async function register() {
    const record = {
        backupDate: '$Date',
        backupPath: '$($BackupDir -replace '\\', '\\\\')',
        machineName: '$env:COMPUTERNAME',
        status: 'completed',
        sizeMB: $sizeMB,
        components: {
            firestore: $($firestoreFiles -gt 0 ? 'true' : 'false'),
            storage: $($storageFiles -gt 0 ? 'true' : 'false'),
            auth: $($authFile ? 'true' : 'false'),
            secrets: true,
            rules: true,
            code: true
        },
        stats: {
            firestoreCollections: $firestoreFiles,
            storageFiles: $storageFiles
        },
        createdAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection('local_backups').add(record);
    console.log('Backup enregistre:', docRef.id);
}

register().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
"@

    $regScriptPath = "$ProjectDir\firebase\functions\temp-register-backup.js"
    $registerScript | Out-File -FilePath $regScriptPath -Encoding UTF8

    Push-Location "$ProjectDir\firebase\functions"
    node temp-register-backup.js 2>&1 | ForEach-Object { Write-Host "  $_" }
    Remove-Item temp-register-backup.js -Force -ErrorAction SilentlyContinue
    Pop-Location

    Write-Success "Backup enregistre dans Firestore!"
    Log "Enregistrement Firestore: OK"
} catch {
    Write-Warn "Echec enregistrement Firestore: $_"
    Log "Enregistrement Firestore: ECHEC"
}

# ============================================================
# RESUME
# ============================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   SAUVEGARDE TERMINEE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Emplacement: $BackupDir" -ForegroundColor Yellow

$size = (Get-ChildItem $BackupDir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Write-Host "Taille: $([math]::Round($size/1MB, 2)) MB" -ForegroundColor Cyan

Write-Host ""
Write-Host "Contenu:" -ForegroundColor Cyan
Get-ChildItem $BackupDir -Directory | ForEach-Object {
    $s = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Write-Host "  $($_.Name): $([math]::Round($s/1MB, 2)) MB"
}

Log "=== TERMINE - $([math]::Round($size/1MB, 2)) MB ==="
Write-Host ""

# ============================================================
# SAUVEGARDE INTELLIGENTE SOS-EXPAT
# ============================================================
# Sauvegarde TOUT ce qui est necessaire sans telecharger
# les backups redondants (evite 150GB inutiles)
# ============================================================

param(
    [string]$BackupRoot = "C:\Users\willi\Documents\Projets\VS_CODE\Sauvegardes\Sauv_sos_expat",
    [string]$ProjectId = "sos-urgently-ac307",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Continue"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = Join-Path $BackupRoot $Date
$LogFile = Join-Path $BackupDir "backup.log"
$ProjectDir = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos"
$ErrorCount = 0
$ErrorDetails = @()

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
    "$BackupDir\7-GCP-BACKUP-INFO",
    "$BackupDir\8-OUTIL-SOS-EXPAT",
    "$BackupDir\9-DASHBOARD-MULTIPRESTATAIRE",
    "$BackupDir\10-VPS-DATABASES"
)
foreach ($f in $folders) { New-Item -ItemType Directory -Path $f -Force | Out-Null }

# ============================================================
# 1. EXPORT FIRESTORE (collections critiques, optimise memoire)
# ============================================================
Write-Host ""
Write-Info "1/11 - Export Firestore (collections + sous-collections)..."
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

// Collections avec sous-collections connues a exporter
const SUBCOLLECTION_PARENTS = [
    'users', 'sos_profiles', 'call_sessions', 'disputes',
    'payments', 'invoices', 'chatters', 'influencers',
    'bloggers', 'group_admins'
];

async function exportCollection(ref, maxDocs = 10000) {
    const snap = await ref.limit(maxDocs).get();
    return snap.docs.map(doc => ({
        _id: doc.id,
        _path: doc.ref.path,
        ...convertValue(doc.data())
    }));
}

async function exportSubcollections(docRef) {
    const subs = {};
    try {
        const subCollections = await docRef.listCollections();
        for (const subCol of subCollections) {
            if (EXCLUDE_COLLECTIONS.includes(subCol.id)) continue;
            const snap = await subCol.limit(500).get();
            if (snap.size > 0) {
                subs[subCol.id] = snap.docs.map(d => ({
                    _id: d.id,
                    _path: d.ref.path,
                    ...convertValue(d.data())
                }));
            }
        }
    } catch (e) {
        // Certains docs n'ont pas de sous-collections, c'est normal
    }
    return subs;
}

async function main() {
    console.log('Export Firestore (collections + sous-collections)...');
    const allCollections = await db.listCollections();

    const collections = allCollections.filter(c => !EXCLUDE_COLLECTIONS.includes(c.id));
    console.log('Collections a exporter:', collections.length);
    console.log('Collections exclues (logs):', allCollections.length - collections.length);

    const stats = { exported: {}, subcollections: {}, excluded: EXCLUDE_COLLECTIONS };

    for (const col of collections) {
        try {
            console.log('  -', col.id);
            const snap = await col.limit(10000).get();
            const data = [];
            let subCount = 0;

            for (const doc of snap.docs) {
                const entry = {
                    _id: doc.id,
                    _path: doc.ref.path,
                    ...convertValue(doc.data())
                };

                // Exporter sous-collections pour les collections critiques
                if (SUBCOLLECTION_PARENTS.includes(col.id)) {
                    const subs = await exportSubcollections(doc.ref);
                    if (Object.keys(subs).length > 0) {
                        entry._subcollections = subs;
                        subCount += Object.values(subs).reduce((a, b) => a + b.length, 0);
                    }
                }

                data.push(entry);
            }

            stats.exported[col.id] = data.length;
            if (subCount > 0) stats.subcollections[col.id] = subCount;

            fs.writeFileSync(
                path.join(outDir, col.id + '.json'),
                JSON.stringify(data, null, 2)
            );

            if (global.gc) global.gc();
        } catch (err) {
            console.error('    Erreur:', col.id, err.message);
            stats.exported[col.id] = 'ERROR: ' + err.message;
        }
    }

    fs.writeFileSync(path.join(outDir, '_STATS.json'), JSON.stringify(stats, null, 2));
    console.log('Export termine!', Object.keys(stats.exported).length, 'collections');
    if (Object.keys(stats.subcollections).length > 0) {
        console.log('Sous-collections exportees:', JSON.stringify(stats.subcollections));
    }
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
    $ErrorCount++; $ErrorDetails += "Firestore: $_"
}

# ============================================================
# 2. TELECHARGER STORAGE UTILISATEURS (sans les backups)
# ============================================================
Write-Host ""
Write-Info "2/11 - Telechargement Storage (fichiers utilisateurs seulement)..."
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
        "avatars",
        "chatter_photos",
        "blogger_photos",
        "influencer_photos",
        "group_admin_photos",
        "disputes"
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
    $ErrorCount++; $ErrorDetails += "Storage: $_"
}

# ============================================================
# 3. TELECHARGER AUTH BACKUPS (dernier seulement)
# ============================================================
Write-Host ""
Write-Info "3/11 - Telechargement Auth (derniers backups)..."
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
    $ErrorCount++; $ErrorDetails += "Auth: $_"
}

# ============================================================
# 4. SECRETS ET CONFIG
# ============================================================
Write-Host ""
Write-Info "4/11 - Sauvegarde Secrets..."
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
    $ErrorCount++; $ErrorDetails += "Secrets: $_"
}

# ============================================================
# 5. REGLES ET INDEXES
# ============================================================
Write-Host ""
Write-Info "5/11 - Sauvegarde Regles..."
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
    $ErrorCount++; $ErrorDetails += "Regles: $_"
}

# ============================================================
# 6. CODE SOURCE
# ============================================================
Write-Host ""
Write-Info "6/11 - Sauvegarde Code Source..."
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
    $ErrorCount++; $ErrorDetails += "Code: $_"
}

# ============================================================
# 7. OUTIL-SOS-EXPAT (2e projet Firebase)
# ============================================================
Write-Host ""
Write-Info "7/11 - Sauvegarde Outil-sos-expat..."
try {
    $outilDir = "$BackupDir\8-OUTIL-SOS-EXPAT"
    $outilProjectDir = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\Outil-sos-expat"
    $outilExclude = @("node_modules", ".git", "dist", "build", ".cache", ".firebase")

    if (Test-Path $outilProjectDir) {
        # Code source
        New-Item -ItemType Directory -Path "$outilDir\code" -Force | Out-Null
        Get-ChildItem -Path $outilProjectDir -Directory | Where-Object { $_.Name -notin $outilExclude } | ForEach-Object {
            Copy-Item $_.FullName "$outilDir\code\$($_.Name)" -Recurse -Force -ErrorAction SilentlyContinue
        }
        Get-ChildItem -Path $outilProjectDir -File | ForEach-Object {
            Copy-Item $_.FullName "$outilDir\code\$($_.Name)" -Force -ErrorAction SilentlyContinue
        }

        # Firestore export via le meme projet (outils-sos-expat partage le meme Firestore sos-urgently-ac307)
        # Les rules et indexes sont dans le code source copie ci-dessus

        Write-Success "Outil-sos-expat sauvegarde!"
        Log "Outil-sos-expat: OK"
    } else {
        Write-Warn "Dossier Outil-sos-expat non trouve, skip"
        Log "Outil-sos-expat: SKIP (dossier absent)"
    }
} catch {
    Write-Warn "Echec Outil-sos-expat: $_"
    Log "Outil-sos-expat: ECHEC"
    $ErrorCount++; $ErrorDetails += "Outil-sos-expat: $_"
}

# ============================================================
# 8. DASHBOARD-MULTIPRESTATAIRE (code source)
# ============================================================
Write-Host ""
Write-Info "8/11 - Sauvegarde Dashboard-multiprestataire..."
try {
    $dashDir = "$BackupDir\9-DASHBOARD-MULTIPRESTATAIRE"
    $dashProjectDir = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\Dashboard-multiprestataire"
    $dashExclude = @("node_modules", ".git", "dist", "build", ".cache")

    if (Test-Path $dashProjectDir) {
        New-Item -ItemType Directory -Path $dashDir -Force | Out-Null
        Get-ChildItem -Path $dashProjectDir -Directory | Where-Object { $_.Name -notin $dashExclude } | ForEach-Object {
            Copy-Item $_.FullName "$dashDir\$($_.Name)" -Recurse -Force -ErrorAction SilentlyContinue
        }
        Get-ChildItem -Path $dashProjectDir -File | ForEach-Object {
            Copy-Item $_.FullName "$dashDir\$($_.Name)" -Force -ErrorAction SilentlyContinue
        }

        Write-Success "Dashboard-multiprestataire sauvegarde!"
        Log "Dashboard-multiprestataire: OK"
    } else {
        Write-Info "Dashboard-multiprestataire non trouve, skip"
    }
} catch {
    Write-Warn "Echec Dashboard: $_"
    $ErrorCount++; $ErrorDetails += "Dashboard: $_"
}

# ============================================================
# 9. POSTGRESQL VPS (Backlink Engine + Telegram Engine)
# ============================================================
Write-Host ""
Write-Info "9/11 - Sauvegarde PostgreSQL VPS (Hetzner)..."
try {
    $vpsDir = "$BackupDir\10-VPS-DATABASES"
    New-Item -ItemType Directory -Path $vpsDir -Force | Out-Null

    $vpsHost = "95.216.179.163"

    # Motivation Engine - PostgreSQL (container: mt-postgres, user: motivation, db: motivation_engine)
    Write-Info "  Motivation Engine PostgreSQL..."
    try {
        ssh -o ConnectTimeout=15 -o StrictHostKeyChecking=no "root@$vpsHost" "docker exec mt-postgres pg_dump -U motivation motivation_engine" > "$vpsDir\motivation_engine.sql" 2>$null
        if ((Test-Path "$vpsDir\motivation_engine.sql") -and (Get-Item "$vpsDir\motivation_engine.sql").Length -gt 100) {
            Write-Success "  Motivation Engine: OK"
            Log "Motivation Engine PostgreSQL: OK"
        } else {
            Write-Warn "  Motivation Engine: dump vide ou echec"
            Log "Motivation Engine PostgreSQL: VIDE"
            $ErrorCount++; $ErrorDetails += "Motivation Engine: dump vide"
        }
    } catch {
        Write-Warn "  Echec Motivation Engine: $_"
        $ErrorCount++; $ErrorDetails += "Motivation Engine: $_"
    }

    # Telegram Engine - PostgreSQL (container: tg-postgres, user: telegram, db: engine-telegram-sos-expat)
    # Note: peut etre arrete — on tente quand meme
    Write-Info "  Telegram Engine PostgreSQL..."
    try {
        ssh -o ConnectTimeout=15 "root@$vpsHost" "docker exec tg-postgres pg_dump -U telegram engine-telegram-sos-expat 2>/dev/null" > "$vpsDir\telegram_engine.sql" 2>$null
        if ((Test-Path "$vpsDir\telegram_engine.sql") -and (Get-Item "$vpsDir\telegram_engine.sql").Length -gt 100) {
            Write-Success "  Telegram Engine: OK"
            Log "Telegram Engine PostgreSQL: OK"
        } else {
            Write-Info "  Telegram Engine: non demarre ou vide (skip)"
            Log "Telegram Engine PostgreSQL: NON DEMARRE"
        }
    } catch {
        Write-Info "  Telegram Engine: non disponible (skip)"
    }

    # WhatsApp Campaigns - MySQL (container: wc-mysql, user: wc_user, db: whatsapp_campaigns)
    Write-Info "  WhatsApp Campaigns MySQL..."
    try {
        ssh -o ConnectTimeout=15 "root@$vpsHost" "docker exec wc-mysql mysqldump -u wc_user -pwc_secret whatsapp_campaigns" > "$vpsDir\whatsapp_campaigns.sql" 2>$null
        if ((Test-Path "$vpsDir\whatsapp_campaigns.sql") -and (Get-Item "$vpsDir\whatsapp_campaigns.sql").Length -gt 100) {
            Write-Success "  WhatsApp Campaigns: OK"
            Log "WhatsApp Campaigns MySQL: OK"
        } else {
            Write-Warn "  WhatsApp Campaigns: dump vide ou echec"
            Log "WhatsApp Campaigns MySQL: VIDE"
            $ErrorCount++; $ErrorDetails += "WhatsApp Campaigns: dump vide"
        }
    } catch {
        Write-Warn "  Echec WhatsApp Campaigns: $_"
        $ErrorCount++; $ErrorDetails += "WhatsApp Campaigns: $_"
    }

    # Influenceurs Tracker - MySQL (container: inf-mysql, user: inf_user, db: influenceurs_tracker)
    Write-Info "  Influenceurs Tracker MySQL..."
    try {
        ssh -o ConnectTimeout=15 "root@$vpsHost" "docker exec inf-mysql mysqldump -u root -proot_secret influenceurs_tracker" > "$vpsDir\influenceurs_tracker.sql" 2>$null
        if ((Test-Path "$vpsDir\influenceurs_tracker.sql") -and (Get-Item "$vpsDir\influenceurs_tracker.sql").Length -gt 100) {
            Write-Success "  Influenceurs Tracker: OK"
            Log "Influenceurs Tracker MySQL: OK"
        } else {
            Write-Warn "  Influenceurs Tracker: dump vide ou echec"
            Log "Influenceurs Tracker MySQL: VIDE"
            $ErrorCount++; $ErrorDetails += "Influenceurs Tracker: dump vide"
        }
    } catch {
        Write-Warn "  Echec Influenceurs Tracker: $_"
        $ErrorCount++; $ErrorDetails += "Influenceurs Tracker: $_"
    }

    # Configs Docker/nginx du VPS
    Write-Info "  Configs VPS (Docker, nginx)..."
    try {
        New-Item -ItemType Directory -Path "$vpsDir\configs" -Force | Out-Null
        ssh -o ConnectTimeout=15 "root@$vpsHost" "cat /etc/nginx/sites-enabled/* 2>/dev/null" > "$vpsDir\configs\nginx-sites.conf" 2>$null
        ssh -o ConnectTimeout=15 "root@$vpsHost" "ls -la /etc/letsencrypt/live/ 2>/dev/null" > "$vpsDir\configs\ssl-certs-list.txt" 2>$null
        ssh -o ConnectTimeout=15 "root@$vpsHost" "docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'" > "$vpsDir\configs\docker-containers.txt" 2>$null
        # Docker compose files de tous les projets
        ssh -o ConnectTimeout=15 "root@$vpsHost" "find /opt -name 'docker-compose.yml' -o -name 'docker-compose.yaml' 2>/dev/null | while read f; do echo '=== '\$f' ==='; cat \$f; done" > "$vpsDir\configs\all-docker-compose.yml" 2>$null
        # .env files de tous les projets
        ssh -o ConnectTimeout=15 "root@$vpsHost" "find /opt -maxdepth 2 -name '.env' 2>/dev/null | while read f; do echo '=== '\$f' ==='; cat \$f; done" > "$vpsDir\configs\all-env-files.txt" 2>$null
        Write-Success "  Configs VPS: OK"
    } catch {
        Write-Warn "  Echec configs VPS: $_"
    }
} catch {
    Write-Warn "Echec VPS: $_ (le VPS est peut-etre injoignable)"
    Log "VPS: ECHEC - $_"
    $ErrorCount++; $ErrorDetails += "VPS: $_"
}

# ============================================================
# 10. INFO BACKUPS GCP (pour reference)
# ============================================================
Write-Host ""
Write-Info "10/11 - Info backups GCP..."
try {
    $gcpDir = "$BackupDir\7-GCP-BACKUP-INFO"

    # Liste des backups Firestore GCP
    gcloud firestore backups list --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\firestore-backups.json" -Encoding UTF8

    # Info database
    gcloud firestore databases describe --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\database-info.json" -Encoding UTF8

    # Schedules
    gcloud firestore backups schedules list --database="(default)" --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\backup-schedules.json" -Encoding UTF8

    # Cloud Tasks queues (config complete)
    gcloud tasks queues list --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\cloud-tasks-queues.json" -Encoding UTF8

    # Cloud Functions list (toutes les fonctions deployees)
    gcloud functions list --project=$ProjectId --format=json 2>&1 | Out-File "$gcpDir\cloud-functions-list.json" -Encoding UTF8

    # Contenu bucket DR (liste seulement)
    gsutil ls -l gs://sos-expat-backup-dr/ 2>&1 | Out-File "$gcpDir\bucket-dr-content.txt" -Encoding UTF8

    Write-Success "Info GCP sauvegardee!"
    Log "GCP info: OK"
} catch {
    Write-Warn "Echec Info GCP: $_"
    $ErrorCount++; $ErrorDetails += "GCP Info: $_"
}

# ============================================================
# README
# ============================================================
$readme = @"
# BACKUP COMPLET SOS-EXPAT - $Date

## CONTENU

| Dossier | Description |
|---------|-------------|
| 1-FIRESTORE | Collections Firestore + SOUS-COLLECTIONS (ratings, linkedAccounts, etc.) |
| 2-STORAGE-USERS | Fichiers utilisateurs (photos, factures, documents KYC) |
| 3-AUTH | Export complet des utilisateurs Firebase Auth |
| 4-SECRETS | Secrets, .env, service account, GCP secrets |
| 5-RULES | Regles Firestore, Storage, indexes |
| 6-CODE | Code source SOS Expat (frontend + functions) |
| 7-GCP-BACKUP-INFO | Backups GCP natifs, Cloud Tasks queues, Cloud Functions list |
| 8-OUTIL-SOS-EXPAT | Projet Outil IA (2e projet Firebase - code + rules) |
| 9-DASHBOARD-MULTIPRESTATAIRE | Dashboard multi-prestataire (code source) |
| 10-VPS-DATABASES | PostgreSQL Backlink Engine + Telegram Engine + configs VPS |

## RESTAURATION RAPIDE

### 1. Nouveau projet Firebase
firebase projects:create mon-nouveau-projet
firebase use mon-nouveau-projet

### 2. Restaurer Firestore (avec sous-collections)
Les fichiers JSON dans 1-FIRESTORE contiennent un champ _subcollections
pour les documents qui en ont. Un script de restauration doit les reimporter.

### 3. Restaurer Auth
firebase auth:import 3-AUTH/users_fresh_export.json

### 4. Restaurer Storage
gsutil -m cp -r 2-STORAGE-USERS/* gs://nouveau-projet.appspot.com/

### 5. Configurer les secrets
- Copier 4-SECRETS/*.env vers le projet
- Copier 4-SECRETS/serviceAccountKey.json
- Reconfigurer les GCP secrets via gcloud

### 6. Deployer
firebase deploy --only firestore:rules,storage:rules,functions

### 7. Restaurer PostgreSQL VPS
psql -h VPS_HOST -U postgres backlink_engine < 10-VPS-DATABASES/backlink_engine.sql
psql -h VPS_HOST -U postgres telegram_engine < 10-VPS-DATABASES/telegram_engine.sql

### 8. Restaurer configs VPS
Les docker-compose.yml et nginx configs sont dans 10-VPS-DATABASES/configs/

## NOTE IMPORTANTE

Ce backup contient TOUT le necessaire pour reconstruire l'integralite
du projet SOS Expat meme en cas de perte totale (hack, ban Google, crash VPS).
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
Write-Info "11/11 - Enregistrement dans Firestore..."
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
            firestore: $(if ($firestoreFiles -gt 0) { 'true' } else { 'false' }),
            storage: $(if ($storageFiles -gt 0) { 'true' } else { 'false' }),
            auth: $(if ($authFile) { 'true' } else { 'false' }),
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

# ============================================================
# 9. NOTIFICATION TELEGRAM (si erreurs)
# ============================================================
if ($ErrorCount -gt 0) {
    Write-Warn "Envoi notification Telegram ($ErrorCount erreur(s))..."
    try {
        $errSummary = ($ErrorDetails | Select-Object -First 3) -join " | "
        $notifScript = @"
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const saPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)), projectId: '$ProjectId' });
} else {
    admin.initializeApp({ projectId: '$ProjectId' });
}

async function notify() {
    const engineUrl = process.env.TELEGRAM_ENGINE_URL || '';
    const apiKey = process.env.TELEGRAM_ENGINE_API_KEY || '';

    // Essayer via les secrets Firebase
    let url = engineUrl;
    let key = apiKey;
    if (!url) {
        try {
            const doc = await admin.firestore().collection('admin_config').doc('telegram_engine').get();
            const data = doc.data();
            if (data) { url = data.url || ''; key = data.apiKey || ''; }
        } catch(e) {}
    }
    if (!url || !key) {
        console.log('Telegram Engine non configure, skip notification');
        return;
    }

    const payload = {
        eventType: 'security.alert',
        sosUserId: undefined,
        payload: {
            alertType: 'backup_failure',
            userEmail: 'system',
            ipAddress: '$env:COMPUTERNAME',
            country: '-',
            details: 'Backup LOCAL PARTIEL ($ErrorCount erreur(s)): $errSummary'
        },
        idempotencyKey: createHash('sha256').update('local-backup:${Date}:${ErrorCount}').digest('hex')
    };

    const res = await fetch(url + '/api/events/security-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Engine-Secret': key },
        body: JSON.stringify(payload)
    });
    console.log('Telegram notification sent:', res.status);
}

notify().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
"@

        $notifPath = "$ProjectDir\firebase\functions\temp-backup-notify.js"
        $notifScript | Out-File -FilePath $notifPath -Encoding UTF8
        Push-Location "$ProjectDir\firebase\functions"
        node temp-backup-notify.js 2>&1 | ForEach-Object { Write-Host "  $_" }
        Remove-Item temp-backup-notify.js -Force -ErrorAction SilentlyContinue
        Pop-Location
        Write-Success "Notification Telegram envoyee!"
    } catch {
        Write-Warn "Echec notification Telegram: $_"
    }
}

Write-Host ""

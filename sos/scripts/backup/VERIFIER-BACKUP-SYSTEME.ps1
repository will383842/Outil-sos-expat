# ============================================================
# VERIFICATION COMPLETE DU SYSTEME DE BACKUP - SOS EXPAT
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   VERIFICATION SYSTEME DE BACKUP SOS-EXPAT" -ForegroundColor Magenta
Write-Host "   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

$allOk = $true

# ============================================================
# 1. VERIFIER LE BUCKET PRINCIPAL
# ============================================================
Write-Host "1. BUCKET PRINCIPAL (Firebase Storage)" -ForegroundColor Cyan
Write-Host "   gs://sos-urgently-ac307.firebasestorage.app/"
try {
    $mainBucket = gsutil ls gs://sos-urgently-ac307.firebasestorage.app/ 2>&1
    if ($mainBucket -match "scheduled-backups") {
        Write-Host "   [OK] Bucket principal accessible" -ForegroundColor Green
        Write-Host "   [OK] Dossier scheduled-backups present" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Bucket accessible mais pas de backups" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "   [ERREUR] Bucket inaccessible" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# ============================================================
# 2. VERIFIER LE BUCKET DR (Disaster Recovery)
# ============================================================
Write-Host "2. BUCKET DR (Disaster Recovery - Frankfurt)" -ForegroundColor Cyan
Write-Host "   gs://sos-expat-backup-dr/"
try {
    $drBucket = gsutil ls gs://sos-expat-backup-dr/ 2>&1
    if ($drBucket -match "scheduled-backups" -or $drBucket -match "auth_backups") {
        Write-Host "   [OK] Bucket DR accessible" -ForegroundColor Green
        Write-Host "   [OK] Backups presents dans le bucket DR" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Bucket DR accessible mais vide" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERREUR] Bucket DR inaccessible ou inexistant" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# ============================================================
# 3. VERIFIER LES BACKUPS FIRESTORE RECENTS
# ============================================================
Write-Host "3. BACKUPS FIRESTORE RECENTS" -ForegroundColor Cyan
try {
    $backups = gsutil ls -l "gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/" 2>&1 | Select-Object -Last 10
    if ($backups) {
        Write-Host "   [OK] Backups Firestore trouves:" -ForegroundColor Green
        $backups | ForEach-Object { Write-Host "       $_" -ForegroundColor Gray }
    } else {
        Write-Host "   [WARN] Aucun backup Firestore recent" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERREUR] Impossible de lister les backups" -ForegroundColor Red
}
Write-Host ""

# ============================================================
# 4. VERIFIER LES BACKUPS AUTH RECENTS
# ============================================================
Write-Host "4. BACKUPS AUTHENTICATION RECENTS" -ForegroundColor Cyan
try {
    $authBackups = gsutil ls -l "gs://sos-urgently-ac307.firebasestorage.app/auth_backups/" 2>&1 | Select-Object -Last 5
    if ($authBackups) {
        Write-Host "   [OK] Backups Auth trouves:" -ForegroundColor Green
        $authBackups | ForEach-Object { Write-Host "       $_" -ForegroundColor Gray }
    } else {
        Write-Host "   [WARN] Aucun backup Auth recent" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [ERREUR] Impossible de lister les backups Auth" -ForegroundColor Red
}
Write-Host ""

# ============================================================
# 5. VERIFIER LA TACHE PLANIFIEE WINDOWS
# ============================================================
Write-Host "5. TACHE PLANIFIEE WINDOWS (Backup Local)" -ForegroundColor Cyan
try {
    $task = Get-ScheduledTask -TaskName "SOS-Expat-Backup-Quotidien" -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "   [OK] Tache planifiee configuree" -ForegroundColor Green
        Write-Host "       Etat: $($task.State)" -ForegroundColor Gray
        $trigger = $task.Triggers | Select-Object -First 1
        Write-Host "       Heure: Tous les jours" -ForegroundColor Gray
    } else {
        Write-Host "   [MANQUANT] Tache planifiee non configuree" -ForegroundColor Yellow
        Write-Host "       Executez: setup-scheduled-backup.ps1 (en admin)" -ForegroundColor Yellow
        $allOk = $false
    }
} catch {
    Write-Host "   [ERREUR] Impossible de verifier la tache" -ForegroundColor Red
}
Write-Host ""

# ============================================================
# 6. VERIFIER LES BACKUPS LOCAUX
# ============================================================
Write-Host "6. BACKUPS LOCAUX" -ForegroundColor Cyan
$localBackupDir = "C:\Users\willi\Documents\BACKUP_SOS-Expat"
if (Test-Path $localBackupDir) {
    $localBackups = Get-ChildItem $localBackupDir -Directory | Sort-Object CreationTime -Descending | Select-Object -First 5
    if ($localBackups.Count -gt 0) {
        Write-Host "   [OK] $($localBackups.Count) backups locaux trouves:" -ForegroundColor Green
        $localBackups | ForEach-Object {
            $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            $sizeFormatted = "{0:N2} MB" -f ($size / 1MB)
            Write-Host "       $($_.Name) - $sizeFormatted" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [WARN] Dossier existe mais aucun backup" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [INFO] Aucun backup local (normal si jamais execute)" -ForegroundColor Yellow
    Write-Host "       Executez: BACKUP-MAINTENANT.bat pour creer le premier" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# 7. VERIFIER LES CLOUD FUNCTIONS DE BACKUP
# ============================================================
Write-Host "7. CLOUD FUNCTIONS DE BACKUP" -ForegroundColor Cyan
try {
    Push-Location "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos"
    $functions = firebase functions:list --project=sos-urgently-ac307 2>&1

    $backupFunctions = @(
        "morningBackup",
        "backupFirebaseAuth",
        "dailyCrossRegionBackup",
        "backupStorageToDR",
        "monthlySecretsConfigBackup",
        "runMonthlyDRTest"
    )

    foreach ($fn in $backupFunctions) {
        if ($functions -match $fn) {
            Write-Host "   [OK] $fn" -ForegroundColor Green
        } else {
            Write-Host "   [MANQUANT] $fn" -ForegroundColor Yellow
        }
    }
    Pop-Location
} catch {
    Write-Host "   [ERREUR] Impossible de lister les functions" -ForegroundColor Red
}
Write-Host ""

# ============================================================
# 8. VERIFIER LES OUTILS REQUIS
# ============================================================
Write-Host "8. OUTILS REQUIS" -ForegroundColor Cyan

# Firebase CLI
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "   [OK] Firebase CLI: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "   [MANQUANT] Firebase CLI" -ForegroundColor Red
    $allOk = $false
}

# gcloud CLI
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "   [OK] gcloud CLI: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "   [MANQUANT] gcloud CLI" -ForegroundColor Red
    $allOk = $false
}

# gsutil
try {
    $gsutilVersion = gsutil version 2>&1 | Select-Object -First 1
    Write-Host "   [OK] gsutil: $gsutilVersion" -ForegroundColor Green
} catch {
    Write-Host "   [MANQUANT] gsutil" -ForegroundColor Red
    $allOk = $false
}
Write-Host ""

# ============================================================
# RESUME
# ============================================================
Write-Host "============================================================" -ForegroundColor Magenta
if ($allOk) {
    Write-Host "   SYSTEME DE BACKUP: OPERATIONNEL" -ForegroundColor Green
} else {
    Write-Host "   SYSTEME DE BACKUP: ACTIONS REQUISES" -ForegroundColor Yellow
}
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

Write-Host "RAPPEL DES BACKUPS AUTOMATIQUES:" -ForegroundColor Cyan
Write-Host "  - Cloud Firestore: Tous les jours a 03:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Cloud Auth: Tous les jours a 03:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Cloud Storage DR: Tous les jours a 05:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Cross-Region DR: Dimanche a 04:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Audit Secrets: 1er du mois a 02:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Test DR: 1er du mois a 06:00 (Paris)" -ForegroundColor Gray
Write-Host "  - Local PC: Tous les jours a 02:00 (si configure)" -ForegroundColor Gray
Write-Host ""

Read-Host "Appuyez sur Entree pour fermer"

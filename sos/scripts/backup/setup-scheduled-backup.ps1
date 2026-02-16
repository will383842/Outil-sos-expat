# ============================================================
# CONFIGURATION DU BACKUP AUTOMATIQUE - SOS EXPAT
# Exécutez ce script en tant qu'ADMINISTRATEUR:
# Clic droit > "Exécuter avec PowerShell en tant qu'administrateur"
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURATION BACKUP AUTOMATIQUE SOS-EXPAT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier les droits admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERREUR: Ce script doit etre execute en tant qu'administrateur!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instructions:" -ForegroundColor Yellow
    Write-Host "1. Clic droit sur ce fichier" -ForegroundColor Yellow
    Write-Host "2. Selectionnez 'Executer avec PowerShell en tant qu'administrateur'" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

Write-Host "Droits administrateur: OK" -ForegroundColor Green
Write-Host ""

# Configuration
$TaskName = "SOS-Expat-Backup-Quotidien"
$ScriptPath = "C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\sos\auto-backup-complete.ps1"
$BackupTime = "02:00"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Nom de la tache: $TaskName"
Write-Host "  Script: $ScriptPath"
Write-Host "  Heure: $BackupTime (tous les jours)"
Write-Host "  Destination: C:\Users\willi\Documents\BACKUP_SOS-Expat"
Write-Host ""

# Supprimer l'ancienne tâche si elle existe
Write-Host "Suppression de l'ancienne tache (si existante)..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# Créer l'action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptPath`""

# Créer le déclencheur (tous les jours à 02:00)
$trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime

# Créer les paramètres
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Créer la tâche
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Backup quotidien automatique SOS Expat - Firestore, Storage, Auth, Secrets, Code" `
        -RunLevel Highest

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   SUCCES! Backup automatique configure." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "La sauvegarde s'executera chaque nuit a $BackupTime" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour verifier:" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez 'Planificateur de taches' (taskschd.msc)" -ForegroundColor Yellow
    Write-Host "  2. Cherchez '$TaskName'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pour lancer un backup maintenant:" -ForegroundColor Yellow
    Write-Host "  Double-cliquez sur BACKUP-MAINTENANT.bat" -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERREUR lors de la creation de la tache:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Read-Host "Appuyez sur Entree pour fermer"

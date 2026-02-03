@echo off
REM ============================================================
REM CONFIGURATION DU BACKUP AUTOMATIQUE QUOTIDIEN
REM Exécutez ce fichier EN TANT QU'ADMINISTRATEUR
REM ============================================================

echo.
echo ============================================================
echo    CONFIGURATION BACKUP AUTOMATIQUE SOS-EXPAT
echo ============================================================
echo.
echo Ce script va creer une tache planifiee Windows qui:
echo - Execute un backup complet tous les jours a 02:00
echo - Sauvegarde dans: C:\Users\willi\Documents\BACKUP_SOS-Expat
echo - Conserve les 30 derniers jours de backups
echo.
echo IMPORTANT: Ce script doit etre execute en tant qu'ADMINISTRATEUR
echo.
pause

REM Supprimer l'ancienne tâche si elle existe
schtasks /delete /tn "SOS-Expat-Backup-Quotidien" /f 2>nul

REM Créer la nouvelle tâche planifiée
schtasks /create /tn "SOS-Expat-Backup-Quotidien" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0auto-backup-complete.ps1\"" /sc daily /st 02:00 /ru "%USERNAME%" /rl HIGHEST /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo    SUCCES! Backup automatique configure.
    echo ============================================================
    echo.
    echo La sauvegarde s'executera chaque nuit a 02:00
    echo.
    echo Pour verifier: Ouvrez "Planificateur de taches" Windows
    echo et cherchez "SOS-Expat-Backup-Quotidien"
    echo.
) else (
    echo.
    echo ============================================================
    echo    ERREUR! Veuillez executer en tant qu'administrateur.
    echo ============================================================
    echo.
    echo Clic droit sur ce fichier ^> "Executer en tant qu'administrateur"
    echo.
)

pause

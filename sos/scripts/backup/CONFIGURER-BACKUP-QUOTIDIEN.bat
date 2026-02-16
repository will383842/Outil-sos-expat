@echo off
REM ============================================================
REM CONFIGURER LA SAUVEGARDE AUTOMATIQUE QUOTIDIENNE
REM Executez CE SCRIPT EN TANT QU'ADMINISTRATEUR
REM ============================================================

echo.
echo ========================================================
echo    CONFIGURATION BACKUP QUOTIDIEN SOS-EXPAT
echo ========================================================
echo.

REM Verifier les droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'Administrateur!
    echo.
    echo   Clic droit sur ce fichier
    echo   ^> "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set SCRIPT_PATH=%~dp0auto-backup-complete.ps1
set TASK_NAME=SOS-Expat-Backup-Quotidien
set BACKUP_DEST=C:\Users\willi\Documents\BACKUP_SOS-Expat

echo Configuration:
echo   Nom de la tache: %TASK_NAME%
echo   Script: %SCRIPT_PATH%
echo   Destination: %BACKUP_DEST%
echo   Heure: 03:00 (chaque nuit)
echo   Retention: 30 jours
echo.

REM Creer le dossier de destination
if not exist "%BACKUP_DEST%" mkdir "%BACKUP_DEST%"

REM Supprimer l'ancienne tache si elle existe
schtasks /delete /tn "%TASK_NAME%" /f 2>nul

REM Creer la tache planifiee
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT_PATH%\"" ^
    /sc daily ^
    /st 03:00 ^
    /ru "%USERNAME%" ^
    /rl HIGHEST ^
    /f

if %errorLevel% equ 0 (
    echo.
    echo ========================================================
    echo    [OK] TACHE PLANIFIEE CREEE AVEC SUCCES!
    echo ========================================================
    echo.
    echo La sauvegarde s'executera automatiquement chaque jour a 03:00
    echo.
    echo Les backups seront dans:
    echo   %BACKUP_DEST%\YYYY-MM-DD_HH-MM-SS\
    echo.
    echo Pour modifier l'heure:
    echo   1. Ouvrir "Planificateur de taches" Windows
    echo   2. Trouver "%TASK_NAME%"
    echo   3. Modifier le declencheur
    echo.
    echo Pour tester maintenant: double-cliquez sur BACKUP-MAINTENANT.bat
    echo.
) else (
    echo.
    echo [ERREUR] Impossible de creer la tache planifiee.
    echo Verifiez que vous avez les droits administrateur.
    echo.
)

pause

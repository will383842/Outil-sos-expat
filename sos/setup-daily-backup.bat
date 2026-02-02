@echo off
REM ============================================================
REM CONFIGURATION DE LA SAUVEGARDE QUOTIDIENNE AUTOMATIQUE
REM Execute ce script EN TANT QU'ADMINISTRATEUR pour configurer
REM une tache planifiee Windows qui fait un backup chaque jour
REM ============================================================

echo.
echo ========================================
echo   CONFIGURATION BACKUP QUOTIDIEN
echo   SOS EXPAT - Firebase
echo ========================================
echo.

REM Verifier les droits admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'Administrateur!
    echo.
    echo Clic droit sur ce fichier ^> "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b 1
)

set SCRIPT_PATH=%~dp0backup-firebase.ps1
set TASK_NAME=FirebaseBackup-SOS-Expat

echo Configuration de la tache planifiee...
echo.
echo Nom: %TASK_NAME%
echo Script: %SCRIPT_PATH%
echo Heure: 02:00 (chaque nuit)
echo.

REM Supprimer l'ancienne tache si elle existe
schtasks /delete /tn "%TASK_NAME%" /f 2>nul

REM Creer la nouvelle tache
schtasks /create ^
    /tn "%TASK_NAME%" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT_PATH%\"" ^
    /sc daily ^
    /st 02:00 ^
    /ru "%USERNAME%" ^
    /rl HIGHEST ^
    /f

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo   [OK] TACHE PLANIFIEE CREEE!
    echo ========================================
    echo.
    echo La sauvegarde s'executera automatiquement chaque jour a 02:00.
    echo.
    echo Pour modifier l'heure:
    echo   1. Ouvrez "Planificateur de taches" Windows
    echo   2. Trouvez "%TASK_NAME%"
    echo   3. Modifiez le declencheur
    echo.
    echo Pour lancer manuellement: double-cliquez sur "backup-now.bat"
    echo.
    echo Les backups seront stockes dans: C:\FirebaseBackups\sos-expat
    echo.
) else (
    echo.
    echo [ERREUR] Impossible de creer la tache planifiee.
    echo.
)

pause

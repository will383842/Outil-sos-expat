@echo off
REM ============================================================
REM CONFIGURER BACKUP AUTOMATIQUE QUOTIDIEN
REM Executez EN TANT QU'ADMINISTRATEUR
REM ============================================================

echo.
echo ============================================================
echo    CONFIGURATION BACKUP AUTOMATIQUE QUOTIDIEN
echo ============================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Executez ce script en tant qu'Administrateur!
    echo Clic droit ^> "Executer en tant qu'administrateur"
    pause
    exit /b 1
)

set SCRIPT=%~dp0auto-backup-smart.ps1
set TASK=SOS-Expat-Backup-Auto

echo Nom tache: %TASK%
echo Heure: 03:00 chaque nuit
echo Destination: C:\Users\willi\Documents\BACKUP_SOS-Expat
echo.

schtasks /delete /tn "%TASK%" /f 2>nul

schtasks /create ^
    /tn "%TASK%" ^
    /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT%\"" ^
    /sc daily ^
    /st 03:00 ^
    /ru "%USERNAME%" ^
    /rl HIGHEST ^
    /f

if %errorLevel% equ 0 (
    echo.
    echo [OK] Tache planifiee creee avec succes!
    echo.
    echo Backup automatique chaque nuit a 03:00
    echo.
) else (
    echo [ERREUR] Echec de la creation
)

pause

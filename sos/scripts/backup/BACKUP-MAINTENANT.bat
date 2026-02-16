@echo off
REM ============================================================
REM LANCER UNE SAUVEGARDE COMPLETE MAINTENANT
REM Double-cliquez pour sauvegarder tout vers:
REM C:\Users\willi\Documents\BACKUP_SOS-Expat\[DATE_HEURE]
REM ============================================================

echo.
echo ========================================================
echo    SAUVEGARDE COMPLETE SOS-EXPAT
echo    Destination: C:\Users\willi\Documents\BACKUP_SOS-Expat
echo ========================================================
echo.
echo Appuyez sur une touche pour demarrer...
pause >nul

powershell -ExecutionPolicy Bypass -File "%~dp0auto-backup-complete.ps1"

echo.
echo ========================================================
echo    TERMINE! Appuyez sur une touche pour fermer.
echo ========================================================
pause >nul

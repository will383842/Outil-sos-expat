@echo off
REM ============================================================
REM SAUVEGARDE INTELLIGENTE - Double-cliquez pour lancer
REM Destination: C:\Users\willi\Documents\Projets\VS_CODE\Sauvegardes\Sauv_sos_expat\[DATE]
REM ============================================================

echo.
echo ============================================================
echo    SAUVEGARDE INTELLIGENTE SOS-EXPAT
echo    Destination: C:\Users\willi\Documents\Projets\VS_CODE\Sauvegardes\Sauv_sos_expat
echo ============================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0auto-backup-smart.ps1"

echo.
echo Appuyez sur une touche pour fermer...
pause >nul

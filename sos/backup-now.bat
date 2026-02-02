@echo off
REM ============================================================
REM LANCEMENT RAPIDE DE LA SAUVEGARDE FIREBASE
REM Double-cliquez sur ce fichier pour lancer une sauvegarde
REM ============================================================

echo.
echo ========================================
echo   SAUVEGARDE FIREBASE - SOS EXPAT
echo ========================================
echo.

REM Verifier si PowerShell peut executer des scripts
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force" 2>nul

REM Lancer le script de backup
powershell -ExecutionPolicy Bypass -File "%~dp0backup-firebase.ps1"

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer
echo ========================================
pause >nul

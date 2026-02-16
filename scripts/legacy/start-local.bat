@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM SCRIPT DE DEMARRAGE LOCAL - SOS EXPAT PROJECT
REM ═══════════════════════════════════════════════════════════════════════════════
REM Ce script ouvre 4 terminaux pour chaque service:
REM   1. Firebase Emulators (Auth, Firestore, Functions, Storage)
REM   2. SOS Cloud Functions (watch mode)
REM   3. SOS Platform Frontend (Vite - port 5174)
REM   4. Outil-SOS-Expat Frontend (Vite - port 5173)
REM ═══════════════════════════════════════════════════════════════════════════════

echo.
echo ══════════════════════════════════════════════════════════════
echo   SOS EXPAT - DEMARRAGE LOCAL (Multi-Terminal)
echo ══════════════════════════════════════════════════════════════
echo.

set PROJECT_ROOT=%~dp0
set SOS_DIR=%PROJECT_ROOT%sos
set OUTIL_DIR=%PROJECT_ROOT%Outil-sos-expat
set SOS_FUNCTIONS_DIR=%SOS_DIR%\firebase\functions
set OUTIL_FUNCTIONS_DIR=%OUTIL_DIR%\functions

echo [1/4] Demarrage des Firebase Emulators...
start "Firebase Emulators" cmd /k "cd /d %SOS_DIR% && firebase emulators:start --only firestore,functions,auth,storage"

timeout /t 3 /nobreak > nul

echo [2/4] Demarrage du watch mode pour SOS Functions...
start "SOS Functions Watch" cmd /k "cd /d %SOS_FUNCTIONS_DIR% && npm run build:watch"

timeout /t 2 /nobreak > nul

echo [3/4] Demarrage du frontend SOS (port 5174)...
start "SOS Frontend - Port 5174" cmd /k "cd /d %SOS_DIR% && npm run dev"

echo [4/4] Demarrage du frontend Outil-SOS-Expat (port 5173)...
start "Outil Frontend - Port 5173" cmd /k "cd /d %OUTIL_DIR% && npm run dev"

echo.
echo ══════════════════════════════════════════════════════════════
echo   TOUS LES SERVICES SONT LANCES!
echo ══════════════════════════════════════════════════════════════
echo.
echo   SOS Platform:        http://localhost:5174
echo   Outil-SOS-Expat:     http://localhost:5173
echo   Firebase Emulator UI: http://localhost:4002
echo.
echo   Emulateurs:
echo     - Auth:      http://localhost:9099
echo     - Firestore: http://localhost:8080
echo     - Functions: http://localhost:5001
echo     - Storage:   http://localhost:9199
echo.
echo   Fermez les fenetres des terminaux pour arreter les services.
echo.
pause

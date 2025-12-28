@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM SCRIPT DE DEMARRAGE - SOS EXPAT + OUTIL IA
REM ═══════════════════════════════════════════════════════════════════════════════
REM
REM Ce script lance les deux applications en mode developpement:
REM   - SOS Expat (port 5174) avec emulateurs Firebase
REM   - Outil IA (port 5173)
REM
REM PREREQUIS: npm install dans les deux dossiers
REM ═══════════════════════════════════════════════════════════════════════════════

echo.
echo ========================================
echo   SOS EXPAT - DEMARRAGE LOCAL
echo ========================================
echo.

REM Verification des node_modules
if not exist "sos\node_modules" (
    echo [!] Installation des dependances SOS...
    cd sos
    call npm install
    cd ..
)

if not exist "Outil-sos-expat\node_modules" (
    echo [!] Installation des dependances Outil IA...
    cd Outil-sos-expat
    call npm install
    cd ..
)

echo.
echo [1/3] Demarrage de l'Outil IA (port 5173)...
start "Outil-IA" cmd /k "cd Outil-sos-expat && npm run dev"

echo [2/3] Attente 3 secondes...
timeout /t 3 /nobreak > nul

echo [3/3] Demarrage de SOS Expat (port 5174) avec emulateurs...
start "SOS-Expat" cmd /k "cd sos && npm run dev:full"

echo.
echo ========================================
echo   APPLICATIONS DEMARREES
echo ========================================
echo.
echo   Outil IA:   http://localhost:5173
echo   SOS Expat:  http://localhost:5174
echo.
echo   Emulateurs Firebase:
echo   - Auth:      http://localhost:9099
echo   - Firestore: http://localhost:8080
echo   - Functions: http://localhost:5001
echo   - Storage:   http://localhost:9199
echo.
echo   Pour arreter: fermez les fenetres de terminal
echo ========================================
echo.
pause

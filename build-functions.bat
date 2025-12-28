@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM BUILD DES CLOUD FUNCTIONS - SOS EXPAT PROJECT
REM ═══════════════════════════════════════════════════════════════════════════════

echo.
echo ══════════════════════════════════════════════════════════════
echo   SOS EXPAT - BUILD DES CLOUD FUNCTIONS
echo ══════════════════════════════════════════════════════════════
echo.

set PROJECT_ROOT=%~dp0
set SOS_FUNCTIONS_DIR=%PROJECT_ROOT%sos\firebase\functions
set OUTIL_FUNCTIONS_DIR=%PROJECT_ROOT%Outil-sos-expat\functions

echo [1/2] Build des fonctions SOS...
cd /d %SOS_FUNCTIONS_DIR%
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Build SOS Functions echoue!
    pause
    exit /b 1
)
echo OK!
echo.

echo [2/2] Build des fonctions Outil...
cd /d %OUTIL_FUNCTIONS_DIR%
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Build Outil Functions echoue!
    pause
    exit /b 1
)
echo OK!
echo.

echo ══════════════════════════════════════════════════════════════
echo   BUILD TERMINE AVEC SUCCES!
echo ══════════════════════════════════════════════════════════════
echo.
pause

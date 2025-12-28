@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM INSTALLATION DES DEPENDANCES - SOS EXPAT PROJECT
REM ═══════════════════════════════════════════════════════════════════════════════

echo.
echo ══════════════════════════════════════════════════════════════
echo   SOS EXPAT - INSTALLATION DES DEPENDANCES
echo ══════════════════════════════════════════════════════════════
echo.

set PROJECT_ROOT=%~dp0
set SOS_DIR=%PROJECT_ROOT%sos
set OUTIL_DIR=%PROJECT_ROOT%Outil-sos-expat
set SOS_FUNCTIONS_DIR=%SOS_DIR%\firebase\functions
set OUTIL_FUNCTIONS_DIR=%OUTIL_DIR%\functions

echo [1/4] Installation des dependances SOS Frontend...
cd /d %SOS_DIR%
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Installation SOS Frontend echouee!
    pause
    exit /b 1
)
echo OK!
echo.

echo [2/4] Installation des dependances SOS Functions...
cd /d %SOS_FUNCTIONS_DIR%
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Installation SOS Functions echouee!
    pause
    exit /b 1
)
echo OK!
echo.

echo [3/4] Installation des dependances Outil-SOS-Expat Frontend...
cd /d %OUTIL_DIR%
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Installation Outil Frontend echouee!
    pause
    exit /b 1
)
echo OK!
echo.

echo [4/4] Installation des dependances Outil Functions...
cd /d %OUTIL_FUNCTIONS_DIR%
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Installation Outil Functions echouee!
    pause
    exit /b 1
)
echo OK!
echo.

echo ══════════════════════════════════════════════════════════════
echo   TOUTES LES DEPENDANCES SONT INSTALLEES!
echo ══════════════════════════════════════════════════════════════
echo.
echo   Vous pouvez maintenant lancer: start-local.bat
echo.
pause

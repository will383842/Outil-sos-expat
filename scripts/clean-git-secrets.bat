@echo off
REM =============================================================================
REM SCRIPT DE NETTOYAGE DES SECRETS DE L'HISTORIQUE GIT (Windows)
REM =============================================================================
REM Ce script supprime les fichiers .env de l'historique Git
REM ATTENTION: Cette operation reecrit l'historique Git
REM Tous les collaborateurs devront re-cloner le repository apres execution
REM =============================================================================

echo ==============================================
echo NETTOYAGE DES SECRETS DE L'HISTORIQUE GIT
echo ==============================================
echo.
echo ATTENTION: Cette operation va reecrit l'historique Git!
echo Tous les collaborateurs devront re-cloner le repository.
echo.

set /p confirm="Voulez-vous continuer? (oui/non): "
if /i not "%confirm%"=="oui" (
    echo Operation annulee.
    exit /b 0
)

echo.
echo Creation d'une branche de sauvegarde...
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a%%b
git branch backup-before-clean-%mydate%-%mytime%

echo.
echo Suppression des fichiers sensibles de l'historique...
echo Note: Cette operation peut prendre plusieurs minutes...
echo.

REM Liste des fichiers a supprimer
set FILES=sos/.env sos/.env.production sos/.env.local sos/.env.development
set FILES=%FILES% sos/firebase/functions/.env sos/firebase/functions/.env.production
set FILES=%FILES% Outil-sos-expat/.env Outil-sos-expat/.env.local Outil-sos-expat/functions/.env
set FILES=%FILES% sos/fix-firebase-secrets.sh

for %%f in (%FILES%) do (
    echo Suppression de: %%f
    git filter-branch --force --index-filter "git rm --cached --ignore-unmatch '%%f'" --prune-empty --tag-name-filter cat -- --all 2>nul
)

echo.
echo Nettoyage des references...
if exist .git\refs\original rmdir /s /q .git\refs\original

echo.
echo Compactage du repository...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo.
echo ==============================================
echo NETTOYAGE TERMINE
echo ==============================================
echo.
echo PROCHAINES ETAPES:
echo 1. Verifiez que tout fonctionne correctement
echo 2. Forcez le push vers le remote:
echo    git push origin --force --all
echo    git push origin --force --tags
echo.
echo 3. Informez tous les collaborateurs de re-cloner le repository
echo.
echo 4. Regenerez TOUS les secrets exposes (recommande)
echo.
pause

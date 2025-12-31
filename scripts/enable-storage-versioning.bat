@echo off
REM =============================================================================
REM ACTIVATION DU VERSIONING FIREBASE STORAGE (Windows)
REM =============================================================================

echo ==============================================
echo ACTIVATION DU VERSIONING FIREBASE STORAGE
echo ==============================================

set PROJECT_ID=sos-urgently-ac307
set BUCKET_NAME=%PROJECT_ID%.firebasestorage.app
set DR_BUCKET_NAME=sos-expat-backup-dr

echo.
echo Configuration:
echo   - Project ID: %PROJECT_ID%
echo   - Bucket principal: %BUCKET_NAME%
echo   - Bucket DR: %DR_BUCKET_NAME%
echo.

REM Verifier gcloud
where gcloud >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERREUR: gcloud CLI n'est pas installe.
    echo Installez-le depuis: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

echo Configuration du projet %PROJECT_ID%...
gcloud config set project %PROJECT_ID%

echo.
echo 1. ACTIVATION DU VERSIONING SUR LE BUCKET PRINCIPAL
echo ---------------------------------------------------
gcloud storage buckets update gs://%BUCKET_NAME% --versioning

echo.
echo 2. CREATION DU BUCKET DR (CROSS-REGION)
echo ---------------------------------------
gcloud storage buckets describe gs://%DR_BUCKET_NAME% >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Creation du bucket DR dans europe-west3...
    gcloud storage buckets create gs://%DR_BUCKET_NAME% --location=EUROPE-WEST3 --uniform-bucket-level-access --public-access-prevention
    gcloud storage buckets update gs://%DR_BUCKET_NAME% --versioning
) else (
    echo Bucket DR existe deja.
)

echo.
echo 3. VERIFICATION
echo ---------------
gcloud storage buckets describe gs://%BUCKET_NAME% --format="table(versioning.enabled)"

echo.
echo ==============================================
echo CONFIGURATION TERMINEE
echo ==============================================
echo.
echo Prochaines etapes:
echo   1. Deployer les Cloud Functions: firebase deploy --only functions
echo   2. Verifier les backups dans la console Firebase
echo.
pause

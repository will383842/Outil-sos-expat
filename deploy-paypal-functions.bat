@echo off
echo Deploying PayPal Functions...
cd sos\firebase
set FIREBASE_FUNCTIONS_TIMEOUT=60000
firebase deploy --only functions:createPayPalOrder --force
if %ERRORLEVEL% EQU 0 (
    firebase deploy --only functions:capturePayPalOrder --force
)
pause

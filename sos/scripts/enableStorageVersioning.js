/**
 * Script to enable Storage versioning via Cloud Function
 * Run with: node scripts/enableStorageVersioning.js
 *
 * Prerequisites:
 * - Be logged in with Firebase CLI: firebase login
 * - Have admin/dev role in Firestore users collection
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

const firebaseConfig = {
  apiKey: "AIzaSyADVS62e6rl87qw12lxNiuqaThW91Oibnk",
  authDomain: "sos-urgently-ac307.firebaseapp.com",
  projectId: "sos-urgently-ac307",
  storageBucket: "sos-urgently-ac307.firebasestorage.app",
  messagingSenderId: "268195823113",
  appId: "1:268195823113:web:8f8b8b8f8b8b8f8b8b8b8b"
};

async function main() {
  console.log('=== Storage Versioning Setup ===\n');

  // Check for credentials
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Usage: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx node scripts/enableStorageVersioning.js');
    console.log('\nOr run from the browser console while logged in as admin:');
    console.log(`
// In browser console at https://sos-expat.com (logged in as admin):
const functions = firebase.functions();
functions.useRegion('europe-west1');

// 1. Check current config
const getConfig = functions.httpsCallable('getStorageConfig');
getConfig().then(r => console.log('Current config:', r.data));

// 2. Enable versioning
const enableVersioning = functions.httpsCallable('enableStorageVersioning');
enableVersioning().then(r => console.log('Versioning:', r.data));

// 3. Configure lifecycle
const configLifecycle = functions.httpsCallable('configureStorageLifecycle');
configLifecycle().then(r => console.log('Lifecycle:', r.data));
`);
    process.exit(1);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const functions = getFunctions(app, 'europe-west1');

  try {
    // Sign in
    console.log('Signing in as', email, '...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in successfully!\n');

    // Get current config
    console.log('1. Getting current Storage config...');
    const getStorageConfig = httpsCallable(functions, 'getStorageConfig');
    const configResult = await getStorageConfig();
    console.log('Current config:', JSON.stringify(configResult.data, null, 2), '\n');

    // Enable versioning
    console.log('2. Enabling Storage versioning...');
    const enableStorageVersioning = httpsCallable(functions, 'enableStorageVersioning');
    const versioningResult = await enableStorageVersioning();
    console.log('Versioning result:', JSON.stringify(versioningResult.data, null, 2), '\n');

    // Configure lifecycle
    console.log('3. Configuring lifecycle policies...');
    const configureStorageLifecycle = httpsCallable(functions, 'configureStorageLifecycle');
    const lifecycleResult = await configureStorageLifecycle();
    console.log('Lifecycle result:', JSON.stringify(lifecycleResult.data, null, 2), '\n');

    console.log('=== Setup Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }

  process.exit(0);
}

main();

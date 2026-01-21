const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function dumpProvider() {
  const providerId = 'A6DHfbs5YyNItHthYxnHE5ccdZy1'; // Julien Valentine

  console.log('=== DUMP COMPLET - Julien Valentine ===\n');

  // Get sos_profiles data
  const profile = await db.collection('sos_profiles').doc(providerId).get();
  const p = profile.data();

  console.log('--- sos_profiles (tous les champs) ---');
  console.log(JSON.stringify(p, (key, val) => {
    if (val && val._seconds) return new Date(val._seconds * 1000).toISOString();
    return val;
  }, 2));

  // Check lawyers collection
  const lawyer = await db.collection('lawyers').doc(providerId).get();
  if (lawyer.exists) {
    console.log('\n--- lawyers ---');
    console.log(JSON.stringify(lawyer.data(), null, 2));
  }

  // Check provider_status (if exists)
  const status = await db.collection('provider_status').doc(providerId).get();
  if (status.exists) {
    console.log('\n--- provider_status ---');
    console.log(JSON.stringify(status.data(), null, 2));
  }

  process.exit(0);
}

dumpProvider().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

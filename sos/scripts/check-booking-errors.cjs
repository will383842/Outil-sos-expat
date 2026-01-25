const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function checkBookingErrors() {
  console.log('\n========== VERIFICATION ERREURS AI SUR BOOKING_REQUESTS ==========\n');

  const bookingsSnap = await db.collection('booking_requests')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  for (const doc of bookingsSnap.docs) {
    const data = doc.data();
    console.log('ID: ' + doc.id);
    console.log('  Provider ID: ' + data.providerId);
    console.log('  AI Response: ' + (data.aiResponse ? 'OUI' : 'NON'));
    console.log('  AI Error: ' + (data.aiError || 'Aucune'));
    console.log('  AI Error At: ' + (data.aiErrorAt || 'N/A'));
    console.log('  AI Processed At: ' + (data.aiProcessedAt || 'N/A'));
    console.log('');
  }
}

async function checkTriggerStatus() {
  console.log('\n========== VERIFICATION SI PROVIDER EST MULTI ==========\n');

  // Provider ID from recent booking
  const testProviderId = 'aaa_lawyer_1764094456047_uebzhh';

  const usersQuery = await db
    .collection('users')
    .where('linkedProviderIds', 'array-contains', testProviderId)
    .limit(1)
    .get();

  console.log('Test Provider ID: ' + testProviderId);
  console.log('Est dans un compte multi-prestataire: ' + (!usersQuery.empty ? 'OUI' : 'NON'));

  if (!usersQuery.empty) {
    const userData = usersQuery.docs[0].data();
    console.log('Compte: ' + (userData.displayName || userData.email));
    console.log('isMultiProvider: ' + (userData.isMultiProvider || false));
    console.log('Nb prestataires: ' + (userData.linkedProviderIds?.length || 0));
  }
}

async function main() {
  try {
    await checkBookingErrors();
    await checkTriggerStatus();
  } catch (error) {
    console.error('Erreur:', error.message);
  }
  process.exit(0);
}

main();

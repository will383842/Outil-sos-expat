const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function unblockProvider() {
  const searchName = 'julien valentine';

  console.log(`Searching for provider: "${searchName}"...\n`);

  // Search in sos_profiles by displayName (case-insensitive search)
  const profilesSnapshot = await db.collection('sos_profiles').get();

  let foundProvider = null;
  let foundId = null;

  for (const doc of profilesSnapshot.docs) {
    const data = doc.data();
    const displayName = (data.displayName || '').toLowerCase();
    const firstName = (data.firstName || '').toLowerCase();
    const lastName = (data.lastName || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();

    if (displayName.includes(searchName) || fullName.includes(searchName)) {
      foundProvider = data;
      foundId = doc.id;
      break;
    }
  }

  if (!foundProvider) {
    console.log('Provider not found! Listing providers with "busy" status...\n');

    const busyProviders = await db.collection('sos_profiles')
      .where('availability', '==', 'busy')
      .get();

    if (busyProviders.empty) {
      console.log('No providers with "busy" status found.');
    } else {
      console.log('Busy providers:');
      busyProviders.forEach(doc => {
        const d = doc.data();
        console.log(`  - ${d.displayName || d.firstName + ' ' + d.lastName} (${doc.id})`);
        console.log(`    availability: ${d.availability}, isOnline: ${d.isOnline}`);
      });
    }
    process.exit(1);
  }

  console.log('=== PROVIDER FOUND ===');
  console.log(`  ID: ${foundId}`);
  console.log(`  Name: ${foundProvider.displayName || foundProvider.firstName + ' ' + foundProvider.lastName}`);
  console.log(`  Current status:`);
  console.log(`    - availability: ${foundProvider.availability}`);
  console.log(`    - isOnline: ${foundProvider.isOnline}`);
  console.log(`    - busyReason: ${foundProvider.busyReason || 'N/A'}`);
  console.log(`    - busySince: ${foundProvider.busySince?.toDate?.() || 'N/A'}`);

  if (foundProvider.availability !== 'busy') {
    console.log('\nProvider is NOT in busy status. No action needed.');
    process.exit(0);
  }

  console.log('\n>>> Unblocking provider (setting to available)...\n');

  // Update sos_profiles
  await db.collection('sos_profiles').doc(foundId).update({
    availability: 'available',
    isOnline: true,
    busyReason: admin.firestore.FieldValue.delete(),
    busySince: admin.firestore.FieldValue.delete(),
    lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Also update users collection for consistency
  await db.collection('users').doc(foundId).update({
    availability: 'available',
    isOnline: true,
    busyReason: admin.firestore.FieldValue.delete(),
    busySince: admin.firestore.FieldValue.delete(),
  }).catch(() => {
    console.log('  (users collection update skipped - may not exist)');
  });

  console.log('=== SUCCESS ===');
  console.log(`Provider "${foundProvider.displayName || foundProvider.firstName}" is now AVAILABLE (green).`);

  process.exit(0);
}

unblockProvider().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

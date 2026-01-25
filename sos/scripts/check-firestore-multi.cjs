const admin = require('firebase-admin');

// Initialize with default credentials
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function checkMultiProviderAccounts() {
  console.log('\n========== ANALYSE DES COMPTES MULTI-PRESTATAIRES ==========\n');

  const usersSnap = await db.collection('users').get();

  let totalUsers = 0;
  let usersWithLinkedProviders = 0;
  let usersWithOneProvider = 0;
  let usersWithTwoOrMoreProviders = 0;
  let usersWithIsMultiProviderFlag = 0;

  const multiProviderAccounts = [];

  for (const doc of usersSnap.docs) {
    totalUsers++;
    const data = doc.data();
    const linkedIds = data.linkedProviderIds || [];

    if (linkedIds.length > 0) {
      usersWithLinkedProviders++;

      if (linkedIds.length === 1) {
        usersWithOneProvider++;
      } else {
        usersWithTwoOrMoreProviders++;
        multiProviderAccounts.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName,
          linkedCount: linkedIds.length,
          isMultiProvider: data.isMultiProvider,
          linkedProviderIds: linkedIds
        });
      }
    }

    if (data.isMultiProvider === true) {
      usersWithIsMultiProviderFlag++;
    }
  }

  console.log('STATISTIQUES:');
  console.log('   Total utilisateurs: ' + totalUsers);
  console.log('   Avec linkedProviderIds > 0: ' + usersWithLinkedProviders);
  console.log('   Avec 1 seul prestataire: ' + usersWithOneProvider);
  console.log('   Avec 2+ prestataires (VRAIS multi): ' + usersWithTwoOrMoreProviders);
  console.log('   Avec flag isMultiProvider=true: ' + usersWithIsMultiProviderFlag);

  console.log('\nCOMPTES MULTI-PRESTATAIRES (2+ providers):');
  for (const acc of multiProviderAccounts) {
    console.log('   - ' + (acc.displayName || acc.email || acc.id));
    console.log('     Email: ' + acc.email);
    console.log('     Nb prestataires: ' + acc.linkedCount);
    console.log('     Flag isMultiProvider: ' + (acc.isMultiProvider || false));
    console.log('     IDs: ' + acc.linkedProviderIds.join(', '));
    console.log('');
  }
}

async function checkRecentBookingRequests() {
  console.log('\n========== DERNIERES DEMANDES CLIENTS (booking_requests) ==========\n');

  const bookingsSnap = await db.collection('booking_requests')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  console.log(bookingsSnap.size + ' dernieres demandes:');

  for (const doc of bookingsSnap.docs) {
    const data = doc.data();
    const createdAt = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt;
    console.log('   - ID: ' + doc.id);
    console.log('     Client: ' + (data.clientName || ((data.clientFirstName || '') + ' ' + (data.clientLastName || '')).trim()));
    console.log('     Provider ID: ' + data.providerId);
    console.log('     Service: ' + data.serviceType);
    console.log('     Status: ' + data.status);
    console.log('     Cree le: ' + createdAt);
    console.log('     AI Response: ' + (data.aiResponse ? 'OUI' : 'NON'));
    console.log('');
  }
}

async function main() {
  try {
    await checkMultiProviderAccounts();
    await checkRecentBookingRequests();
  } catch (error) {
    console.error('Erreur:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
}

main();

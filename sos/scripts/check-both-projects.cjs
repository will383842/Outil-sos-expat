const admin = require('firebase-admin');

// App for sos-urgently
const soaApp = admin.initializeApp({
  projectId: 'sos-urgently-ac307'
}, 'sos');

// App for outils-sos-expat
const outilApp = admin.initializeApp({
  projectId: 'outils-sos-expat'
}, 'outil');

const dbSos = soaApp.firestore();
const dbOutil = outilApp.firestore();

async function checkBookingsInBothProjects() {
  console.log('\n========== BOOKING_REQUESTS DANS SOS-URGENTLY ==========\n');

  try {
    const sosBookings = await dbSos.collection('booking_requests')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    console.log('Nombre dans SOS-URGENTLY: ' + sosBookings.size);
    sosBookings.forEach(doc => {
      console.log('  - ' + doc.id + ' (provider: ' + doc.data().providerId + ')');
    });
  } catch (err) {
    console.log('Erreur SOS-URGENTLY: ' + err.message);
  }

  console.log('\n========== BOOKING_REQUESTS DANS OUTILS-SOS-EXPAT ==========\n');

  try {
    const outilBookings = await dbOutil.collection('booking_requests')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    console.log('Nombre dans OUTILS-SOS-EXPAT: ' + outilBookings.size);
    outilBookings.forEach(doc => {
      console.log('  - ' + doc.id + ' (provider: ' + doc.data().providerId + ')');
    });
  } catch (err) {
    console.log('Erreur OUTILS-SOS-EXPAT: ' + err.message);
  }

  console.log('\n========== USERS MULTIPRESTATAIRES DANS OUTILS-SOS-EXPAT ==========\n');

  try {
    const outilUsers = await dbOutil.collection('users')
      .where('isMultiProvider', '==', true)
      .get();

    console.log('Comptes multi dans OUTILS-SOS-EXPAT: ' + outilUsers.size);
    outilUsers.forEach(doc => {
      const data = doc.data();
      console.log('  - ' + (data.displayName || data.email) + ' (' + (data.linkedProviderIds?.length || 0) + ' providers)');
    });
  } catch (err) {
    console.log('Erreur: ' + err.message);
  }

  process.exit(0);
}

checkBookingsInBothProjects();

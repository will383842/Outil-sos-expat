/**
 * Script de debug pour analyser le flux de notifications
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'sos-urgently-ac307' });
}
const db = admin.firestore();

async function debug() {
  console.log('\n========================================');
  console.log('       DIAGNOSTIC COMPLET DU FLUX');
  console.log('========================================\n');

  // 1. Check recent message_events
  console.log('1. DERNIERS MESSAGE_EVENTS:');
  console.log('----------------------------');
  const messageEvents = await db.collection('message_events')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  if (messageEvents.empty) {
    console.log('   ❌ AUCUN message_event trouvé!');
    console.log('   → Le code de création n\'est probablement pas appelé');
  } else {
    console.log(`   ✅ ${messageEvents.size} message_events trouvés:`);
    messageEvents.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      console.log(`   - ${doc.id}: ${data.eventId} (${createdAt})`);
      console.log(`     to.phone: ${data.to?.phone || 'N/A'}`);
      console.log(`     locale: ${data.locale}`);
    });
  }

  // 2. Check recent call_sessions
  console.log('\n2. DERNIERES CALL_SESSIONS:');
  console.log('----------------------------');
  const callSessions = await db.collection('call_sessions')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  if (callSessions.empty) {
    console.log('   ❌ AUCUNE call_session trouvée!');
  } else {
    console.log(`   ✅ ${callSessions.size} call_sessions trouvées:`);
    callSessions.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      console.log(`   - ${doc.id}: status=${data.status} (${createdAt})`);
      console.log(`     payment.status: ${data.payment?.status || 'N/A'}`);
    });
  }

  // 3. Check recent payments
  console.log('\n3. DERNIERS PAIEMENTS:');
  console.log('----------------------------');
  const payments = await db.collection('payments')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  if (payments.empty) {
    console.log('   ❌ AUCUN paiement trouvé!');
  } else {
    console.log(`   ✅ ${payments.size} paiements trouvés:`);
    payments.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      console.log(`   - ${doc.id.slice(0, 20)}...: status=${data.status} (${createdAt})`);
    });
  }

  // 4. Check message_deliveries
  console.log('\n4. DERNIERES LIVRAISONS SMS:');
  console.log('----------------------------');
  const deliveries = await db.collection('message_deliveries')
    .orderBy('sentAt', 'desc')
    .limit(10)
    .get();

  if (deliveries.empty) {
    console.log('   ❌ AUCUNE livraison trouvée!');
  } else {
    console.log(`   ✅ ${deliveries.size} livraisons trouvées:`);
    deliveries.forEach(doc => {
      const data = doc.data();
      const sentAt = data.sentAt?.toDate?.() || data.sentAt;
      console.log(`   - ${doc.id.slice(0, 40)}...`);
      console.log(`     status: ${data.status}, channel: ${data.channel || 'N/A'}`);
      console.log(`     sentAt: ${sentAt}`);
      if (data.error) console.log(`     error: ${data.error}`);
    });
  }

  // 5. Check bookings collection (for Outil IA)
  console.log('\n5. DERNIERES DEMANDES (bookings):');
  console.log('----------------------------');
  const bookings = await db.collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  if (bookings.empty) {
    console.log('   ❌ AUCUN booking trouvé!');
  } else {
    console.log(`   ✅ ${bookings.size} bookings trouvés:`);
    bookings.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt;
      console.log(`   - ${doc.id}: ${data.title || 'N/A'} (${createdAt})`);
      console.log(`     providerId: ${data.providerId || 'N/A'}`);
      console.log(`     aiProcessed: ${data.aiProcessed || false}`);
    });
  }

  console.log('\n========================================');
  console.log('         FIN DU DIAGNOSTIC');
  console.log('========================================\n');
}

debug().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

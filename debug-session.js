const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

async function checkSession() {
  const paymentIntentId = 'pi_3SqwoADF7L3utQbN05fLrJUE';

  console.log(`\nSearching for session with payment.intentId = ${paymentIntentId}\n`);

  const snapshot = await db.collection('call_sessions')
    .where('payment.intentId', '==', paymentIntentId)
    .get();

  if (snapshot.empty) {
    console.log('No session found');
    process.exit(0);
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Session ID: ${doc.id}`);
    console.log(`Status: ${data.status}`);
    console.log(`\n--- PAYMENT ---`);
    console.log(`  status: ${data.payment?.status}`);
    console.log(`  failureReason: ${data.payment?.failureReason || 'none'}`);
    console.log(`\n--- PARTICIPANTS ---`);
    console.log(`  client.status: ${data.participants?.client?.status}`);
    console.log(`  client.connectedAt: ${data.participants?.client?.connectedAt?.toDate?.()}`);
    console.log(`  provider.status: ${data.participants?.provider?.status}`);
    console.log(`  provider.connectedAt: ${data.participants?.provider?.connectedAt?.toDate?.()}`);
    console.log(`  provider.disconnectedAt: ${data.participants?.provider?.disconnectedAt?.toDate?.()}`);
    console.log(`\n--- CONFERENCE ---`);
    console.log(`  billingDuration: ${data.conference?.billingDuration}s`);
    console.log(`  duration: ${data.conference?.duration}s`);
  });

  process.exit(0);
}

checkSession().catch(e => { console.error(e); process.exit(1); });

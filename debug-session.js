const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('call_sessions')
    .where('payment.intentId', '==', 'pi_3SqyWxDF7L3utQbN0EDLOV73')
    .get();

  if (snapshot.empty) {
    console.log('Session not found');
    process.exit(0);
  }

  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`Session: ${doc.id}`);
    console.log(`Status: ${d.status}`);
    console.log(`\nPAYMENT:`);
    console.log(`  status: ${d.payment?.status}`);
    console.log(`  failureReason: ${d.payment?.failureReason || 'none'}`);
    console.log(`\nCLIENT:`);
    console.log(`  status: ${d.participants?.client?.status}`);
    console.log(`  connectedAt: ${d.participants?.client?.connectedAt?.toDate?.()}`);
    console.log(`  disconnectedAt: ${d.participants?.client?.disconnectedAt?.toDate?.()}`);
    console.log(`\nPROVIDER:`);
    console.log(`  status: ${d.participants?.provider?.status}`);
    console.log(`  connectedAt: ${d.participants?.provider?.connectedAt?.toDate?.()}`);
    console.log(`  disconnectedAt: ${d.participants?.provider?.disconnectedAt?.toDate?.()}`);
    console.log(`\nCONFERENCE:`);
    console.log(`  sid: ${d.conference?.sid}`);
    console.log(`  billingDuration: ${d.conference?.billingDuration}s`);
    console.log(`  endedAt: ${d.conference?.endedAt?.toDate?.()}`);
  });
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });

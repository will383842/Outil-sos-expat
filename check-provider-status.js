const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function checkProviderStatus() {
  const providerId = 'A6DHfbs5YyNItHthYxnHE5ccdZy1'; // Julien Valentine

  console.log('=== Checking Julien Valentine Status ===\n');

  // Get sos_profiles data
  const profile = await db.collection('sos_profiles').doc(providerId).get();
  const p = profile.data();

  console.log('--- SOS_PROFILES ---');
  console.log(`  displayName: ${p.displayName}`);
  console.log(`  availability: ${p.availability}`);
  console.log(`  isOnline: ${p.isOnline}`);
  console.log(`  isVisible: ${p.isVisible}`);
  console.log(`  isApproved: ${p.isApproved}`);
  console.log(`  isBanned: ${p.isBanned}`);
  console.log(`  isSuspended: ${p.isSuspended}`);
  console.log(`  busyReason: ${p.busyReason || 'N/A'}`);
  console.log(`  busySince: ${p.busySince?.toDate?.() || 'N/A'}`);
  console.log(`  lastOnline: ${p.lastOnline?.toDate?.() || 'N/A'}`);
  console.log(`  lastStatusChange: ${p.lastStatusChange?.toDate?.() || 'N/A'}`);

  // Get users data
  const user = await db.collection('users').doc(providerId).get();
  if (user.exists) {
    const u = user.data();
    console.log('\n--- USERS ---');
    console.log(`  availability: ${u.availability}`);
    console.log(`  isOnline: ${u.isOnline}`);
    console.log(`  busyReason: ${u.busyReason || 'N/A'}`);
  }

  // Check for active call sessions
  const activeSessions = await db.collection('call_sessions')
    .where('providerId', '==', providerId)
    .where('status', 'in', ['pending', 'accepted', 'active', 'ringing'])
    .get();

  console.log('\n--- ACTIVE CALL SESSIONS ---');
  if (activeSessions.empty) {
    console.log('  No active sessions');
  } else {
    activeSessions.forEach(doc => {
      const s = doc.data();
      console.log(`  Session ${doc.id}:`);
      console.log(`    status: ${s.status}`);
      console.log(`    createdAt: ${s.createdAt?.toDate?.()}`);
    });
  }

  // Check provider_status_logs (recent)
  const statusLogs = await db.collection('provider_status_logs')
    .where('providerId', '==', providerId)
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get();

  console.log('\n--- RECENT STATUS LOGS ---');
  if (statusLogs.empty) {
    console.log('  No status logs');
  } else {
    statusLogs.forEach(doc => {
      const l = doc.data();
      console.log(`  ${l.timestamp?.toDate?.()}: ${l.previousStatus} -> ${l.newStatus} (${l.reason || 'no reason'})`);
    });
  }

  process.exit(0);
}

checkProviderStatus().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

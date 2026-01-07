const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function main() {
  // Query recent sessions to find ones where client didn't connect
  const sessions = await db.collection('call_sessions')
    .orderBy(admin.firestore.FieldPath.documentId())
    .startAt('call_session_17677')
    .endAt('call_session_17678')
    .limit(30)
    .get();

  console.log('Looking for buggy sessions...\n');

  let bugsFound = 0;
  let missingRetriesFound = 0;

  sessions.docs.forEach(doc => {
    const d = doc.data();
    const clientConnectedAt = d.participants?.client?.connectedAt;
    const clientAttempts = d.participants?.client?.attemptCount || 0;
    const clientStatus = d.participants?.client?.status;
    const providerAttempts = d.participants?.provider?.attemptCount || 0;
    const providerStatus = d.participants?.provider?.status;

    // Case 1: Client didn't connect but provider was called (BUG!)
    if (!clientConnectedAt && providerAttempts > 0) {
      bugsFound++;
      console.log('=== BUG: Provider called when client did NOT connect ===');
      console.log('Session:', doc.id);
      console.log('  Client connectedAt: NULL');
      console.log('  Client attemptCount:', clientAttempts);
      console.log('  Client status:', clientStatus);
      console.log('  Provider attemptCount:', providerAttempts);
      console.log('  Provider status:', providerStatus);
      console.log();
    }

    // Case 2: Client had attempts but never connected and less than 3 attempts
    if (!clientConnectedAt && clientAttempts > 0 && clientAttempts < 3 && d.status === 'failed') {
      missingRetriesFound++;
      console.log('=== MISSING RETRIES ===');
      console.log('Session:', doc.id);
      console.log('  Client attemptCount:', clientAttempts, '(should be 3)');
      console.log('  Client status:', clientStatus);
      console.log('  Session status:', d.status);
      console.log();
    }
  });

  console.log('=== SUMMARY ===');
  console.log('Total sessions checked:', sessions.size);
  console.log('Provider-called-without-client bugs:', bugsFound);
  console.log('Missing retry attempts:', missingRetriesFound);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

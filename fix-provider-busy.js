const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function fixProviderBusy() {
  const providerId = 'A6DHfbs5YyNItHthYxnHE5ccdZy1'; // Julien Valentine

  console.log('=== DIAGNOSTIC COMPLET pour Julien Valentine ===\n');

  // 1. Check ALL fields in sos_profiles
  const profile = await db.collection('sos_profiles').doc(providerId).get();
  const p = profile.data();

  console.log('--- TOUS LES CHAMPS PERTINENTS (sos_profiles) ---');
  const relevantFields = [
    'availability', 'isOnline', 'isVisible', 'isApproved', 'isBanned', 'isSuspended',
    'busyReason', 'busySince', 'inCall', 'currentCallId', 'currentSessionId',
    'wasOfflineBeforeCall', 'lastCallEndedAt', 'pendingCallId'
  ];
  relevantFields.forEach(f => {
    const val = p[f];
    if (val !== undefined && val !== null) {
      console.log(`  ${f}: ${val instanceof admin.firestore.Timestamp ? val.toDate() : JSON.stringify(val)}`);
    }
  });

  // 2. Check users collection
  const user = await db.collection('users').doc(providerId).get();
  if (user.exists) {
    const u = user.data();
    console.log('\n--- TOUS LES CHAMPS PERTINENTS (users) ---');
    relevantFields.forEach(f => {
      const val = u[f];
      if (val !== undefined && val !== null) {
        console.log(`  ${f}: ${val instanceof admin.firestore.Timestamp ? val.toDate() : JSON.stringify(val)}`);
      }
    });
  }

  // 3. Check call_queue for pending calls (simpler query)
  console.log('\n--- FILE D\'ATTENTE (call_queue) ---');
  const queue = await db.collection('call_queue')
    .where('providerId', '==', providerId)
    .get();

  if (queue.empty) {
    console.log('  Aucun appel en file');
  } else {
    queue.forEach(doc => {
      const q = doc.data();
      console.log(`  Queue ${doc.id}: status=${q.status}`);
    });
  }

  // 4. FORCE FIX - Clear all busy-related fields
  console.log('\n>>> APPLICATION DU FIX FORCE...\n');

  const fixData = {
    availability: 'available',
    isOnline: true,
    busyReason: admin.firestore.FieldValue.delete(),
    busySince: admin.firestore.FieldValue.delete(),
    inCall: admin.firestore.FieldValue.delete(),
    currentCallId: admin.firestore.FieldValue.delete(),
    currentSessionId: admin.firestore.FieldValue.delete(),
    pendingCallId: admin.firestore.FieldValue.delete(),
    wasOfflineBeforeCall: admin.firestore.FieldValue.delete(),
    lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Update sos_profiles
  await db.collection('sos_profiles').doc(providerId).update(fixData);
  console.log('  ✓ sos_profiles mis à jour');

  // Update users
  try {
    await db.collection('users').doc(providerId).update(fixData);
    console.log('  ✓ users mis à jour');
  } catch (e) {
    console.log('  - users: ' + e.message);
  }

  // Clean up any stuck call_queue entries
  if (!queue.empty) {
    for (const doc of queue.docs) {
      await doc.ref.delete();
      console.log(`  ✓ call_queue/${doc.id} supprimé`);
    }
  }

  // Try to find and clean stuck sessions (simpler approach)
  console.log('\n--- Recherche de sessions bloquées ---');
  const sessions = await db.collection('call_sessions')
    .where('providerId', '==', providerId)
    .limit(10)
    .get();

  let fixedSessions = 0;
  for (const doc of sessions.docs) {
    const s = doc.data();
    if (['pending', 'accepted', 'active', 'ringing', 'connecting'].includes(s.status)) {
      await doc.ref.update({
        status: 'ended',
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        endReason: 'admin_force_cleanup',
      });
      console.log(`  ✓ Session ${doc.id} (${s.status}) -> ended`);
      fixedSessions++;
    }
  }
  if (fixedSessions === 0) {
    console.log('  Aucune session bloquée trouvée');
  }

  console.log('\n=== FIX APPLIQUE ===');
  console.log('Julien Valentine devrait maintenant apparaître en VERT (disponible).');
  console.log('Si le problème persiste, rafraîchissez la page admin (Ctrl+Shift+R).');

  process.exit(0);
}

fixProviderBusy().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

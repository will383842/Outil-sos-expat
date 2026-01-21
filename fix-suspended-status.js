const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function fixSuspendedStatus() {
  const providerId = 'A6DHfbs5YyNItHthYxnHE5ccdZy1'; // Julien Valentine

  console.log('=== FIX STATUS SUSPENDED ===\n');

  // Get current status
  const profile = await db.collection('sos_profiles').doc(providerId).get();
  const p = profile.data();

  console.log('Avant:');
  console.log(`  status: ${p.status}`);
  console.log(`  availability: ${p.availability}`);
  console.log(`  isOnline: ${p.isOnline}`);

  // Fix the status field
  await db.collection('sos_profiles').doc(providerId).update({
    status: 'active',
    availability: 'available',
    isOnline: true,
    isSuspended: admin.firestore.FieldValue.delete(),
    suspendedAt: admin.firestore.FieldValue.delete(),
    suspendedBy: admin.firestore.FieldValue.delete(),
    suspendReason: admin.firestore.FieldValue.delete(),
    lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('\n✓ sos_profiles mis à jour');

  // Also update lawyers collection
  try {
    await db.collection('lawyers').doc(providerId).update({
      status: 'active',
    });
    console.log('✓ lawyers mis à jour');
  } catch (e) {
    // Ignore if field doesn't exist
  }

  // Verify
  const updated = await db.collection('sos_profiles').doc(providerId).get();
  const u = updated.data();

  console.log('\nAprès:');
  console.log(`  status: ${u.status}`);
  console.log(`  availability: ${u.availability}`);
  console.log(`  isOnline: ${u.isOnline}`);

  console.log('\n=== TERMINE ===');
  console.log('Julien Valentine devrait maintenant apparaître en VERT.');
  console.log('Rafraîchissez la page admin (Ctrl+Shift+R).');

  process.exit(0);
}

fixSuspendedStatus().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

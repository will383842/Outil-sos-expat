/**
 * Script pour corriger le statut incohérent d'un prestataire
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();

async function fixProvider(providerId) {
  console.log(`\n🔧 Correction du prestataire: ${providerId}\n`);
  
  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();
  
  const updateData = {
    availability: 'available',
    isOnline: true,
    currentCallSessionId: admin.firestore.FieldValue.delete(),
    busySince: admin.firestore.FieldValue.delete(),
    busyReason: admin.firestore.FieldValue.delete(),
    busyBySibling: admin.firestore.FieldValue.delete(),
    busySiblingProviderId: admin.firestore.FieldValue.delete(),
    busySiblingCallSessionId: admin.firestore.FieldValue.delete(),
    lastStatusChange: now,
    lastActivityCheck: now,
    updatedAt: now,
  };
  
  // Update sos_profiles
  const profileRef = db.collection('sos_profiles').doc(providerId);
  batch.update(profileRef, updateData);
  console.log('📝 sos_profiles sera mis à jour');
  
  // Update users
  const userRef = db.collection('users').doc(providerId);
  batch.update(userRef, updateData);
  console.log('📝 users sera mis à jour');
  
  // Log
  batch.set(db.collection('provider_status_logs').doc(), {
    providerId,
    action: 'MANUAL_FIX_INCONSISTENT_STATUS',
    previousBusyReason: 'in_call',
    newStatus: 'available',
    reason: 'Script fix - busyReason was stuck after completed call',
    timestamp: now,
    fixedBy: 'Claude AI diagnostic script',
  });
  
  await batch.commit();
  
  console.log('\n✅ Prestataire corrigé avec succès!');
  console.log('   - busyReason: supprimé');
  console.log('   - currentCallSessionId: supprimé');
  console.log('   - availability: available');
  
  // Verify
  const verifyDoc = await profileRef.get();
  const data = verifyDoc.data();
  console.log('\n📋 Vérification après correction:');
  console.log(`   isOnline: ${data.isOnline}`);
  console.log(`   availability: ${data.availability}`);
  console.log(`   busyReason: ${data.busyReason || 'undefined (correct!)'}`);
  console.log(`   currentCallSessionId: ${data.currentCallSessionId || 'undefined (correct!)'}`);
}

const providerId = process.argv[2] || 'DfDbWASBaeaVEZrqg6Wlcd3zpYX2';
fixProvider(providerId)
  .then(() => {
    console.log('\n🎉 Terminé! Le prestataire devrait maintenant être réservable.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });

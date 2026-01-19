/**
 * Script pour vérifier le statut d'un prestataire dans Firestore
 * Usage: node scripts/checkProviderStatus.js "Julien Valentine"
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();

async function findAndCheckProvider(searchName) {
  console.log(`\n🔍 Recherche du prestataire: "${searchName}"\n`);
  
  // Search in sos_profiles
  const profilesSnapshot = await db.collection('sos_profiles')
    .where('isOnline', '==', true)
    .get();
  
  let foundProvider = null;
  
  profilesSnapshot.forEach(doc => {
    const data = doc.data();
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
    const displayName = (data.fullName || data.displayName || '').toLowerCase();
    
    if (fullName.includes(searchName.toLowerCase()) || 
        displayName.includes(searchName.toLowerCase())) {
      foundProvider = { id: doc.id, ...data, collection: 'sos_profiles' };
    }
  });
  
  if (!foundProvider) {
    // Try searching all profiles
    const allProfilesSnapshot = await db.collection('sos_profiles').get();
    allProfilesSnapshot.forEach(doc => {
      const data = doc.data();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
      const displayName = (data.fullName || data.displayName || '').toLowerCase();
      
      if (fullName.includes(searchName.toLowerCase()) || 
          displayName.includes(searchName.toLowerCase())) {
        foundProvider = { id: doc.id, ...data, collection: 'sos_profiles' };
      }
    });
  }
  
  if (!foundProvider) {
    console.log('❌ Prestataire non trouvé');
    return;
  }
  
  console.log('✅ Prestataire trouvé!\n');
  console.log('='.repeat(60));
  console.log('DONNÉES SOS_PROFILES');
  console.log('='.repeat(60));
  console.log(`ID: ${foundProvider.id}`);
  console.log(`Nom: ${foundProvider.firstName} ${foundProvider.lastName}`);
  console.log(`Type: ${foundProvider.type}`);
  console.log(`Email: ${foundProvider.email}`);
  console.log('---');
  console.log(`isOnline: ${foundProvider.isOnline}`);
  console.log(`availability: ${foundProvider.availability}`);
  console.log(`busyReason: ${foundProvider.busyReason}`);
  console.log(`currentCallSessionId: ${foundProvider.currentCallSessionId}`);
  console.log(`busySince: ${foundProvider.busySince?.toDate?.() || foundProvider.busySince}`);
  console.log(`busyBySibling: ${foundProvider.busyBySibling}`);
  
  // Check users collection too
  const userDoc = await db.collection('users').doc(foundProvider.id).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    console.log('\n' + '='.repeat(60));
    console.log('DONNÉES USERS');
    console.log('='.repeat(60));
    console.log(`isOnline: ${userData.isOnline}`);
    console.log(`availability: ${userData.availability}`);
    console.log(`busyReason: ${userData.busyReason}`);
    console.log(`currentCallSessionId: ${userData.currentCallSessionId}`);
    console.log(`busySince: ${userData.busySince?.toDate?.() || userData.busySince}`);
  }
  
  // Check for active call sessions
  if (foundProvider.currentCallSessionId) {
    const sessionDoc = await db.collection('call_sessions').doc(foundProvider.currentCallSessionId).get();
    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data();
      console.log('\n' + '='.repeat(60));
      console.log('SESSION D\'APPEL ASSOCIÉE');
      console.log('='.repeat(60));
      console.log(`Session ID: ${foundProvider.currentCallSessionId}`);
      console.log(`Status: ${sessionData.status}`);
      console.log(`Created: ${sessionData.createdAt?.toDate?.()}`);
      console.log(`Ended: ${sessionData.endedAt?.toDate?.() || 'N/A'}`);
    }
  }
  
  // Diagnostic
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC');
  console.log('='.repeat(60));
  
  const issues = [];
  
  if (foundProvider.busyReason === 'in_call' && foundProvider.availability !== 'busy') {
    issues.push('⚠️ INCOHÉRENCE: busyReason=in_call mais availability≠busy');
  }
  
  if (foundProvider.busyReason === 'in_call' && !foundProvider.currentCallSessionId) {
    issues.push('⚠️ INCOHÉRENCE: busyReason=in_call mais pas de currentCallSessionId');
  }
  
  if (foundProvider.availability === 'busy' && !foundProvider.busyReason) {
    issues.push('⚠️ INCOHÉRENCE: availability=busy mais pas de busyReason');
  }
  
  if (issues.length === 0) {
    console.log('✅ Aucune incohérence détectée');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  return foundProvider;
}

// Run
const searchName = process.argv[2] || 'Julien Valentine';
findAndCheckProvider(searchName)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });

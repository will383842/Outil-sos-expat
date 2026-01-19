/**
 * Trouve tous les prestataires avec un statut incohérent
 */
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function findInconsistent() {
  console.log('🔍 Recherche de prestataires avec statut incohérent...\n');

  const snapshot = await db.collection('sos_profiles').get();
  const issues = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const problems = [];

    // Check inconsistencies
    if (data.busyReason === 'in_call' && data.availability !== 'busy') {
      problems.push('busyReason=in_call mais availability≠busy');
    }
    if (data.busyReason === 'in_call' && !data.currentCallSessionId) {
      problems.push('busyReason=in_call sans currentCallSessionId');
    }
    if (data.availability === 'busy' && !data.busyReason) {
      problems.push('availability=busy sans busyReason');
    }
    if (data.currentCallSessionId && data.availability === 'available') {
      problems.push('currentCallSessionId présent mais availability=available');
    }

    // Check if currentCallSessionId points to completed session
    if (data.currentCallSessionId) {
      const sessionDoc = await db.collection('call_sessions').doc(data.currentCallSessionId).get();
      if (sessionDoc.exists) {
        const sessionData = sessionDoc.data();
        if (sessionData.status === 'completed' || sessionData.status === 'failed') {
          problems.push('currentCallSessionId pointe vers session ' + sessionData.status);
        }
      } else {
        problems.push('currentCallSessionId pointe vers session inexistante');
      }
    }

    if (problems.length > 0) {
      issues.push({
        id: doc.id,
        name: (data.firstName || '') + ' ' + (data.lastName || ''),
        email: data.email,
        isOnline: data.isOnline,
        availability: data.availability,
        busyReason: data.busyReason,
        currentCallSessionId: data.currentCallSessionId,
        problems
      });
    }
  }

  if (issues.length === 0) {
    console.log('✅ Aucun prestataire avec statut incohérent trouvé!');
  } else {
    console.log('⚠️ ' + issues.length + ' prestataire(s) avec problèmes:\n');
    issues.forEach(function(p, i) {
      console.log((i+1) + '. ' + p.name + ' (' + p.id + ')');
      console.log('   Email: ' + p.email);
      console.log('   isOnline: ' + p.isOnline + ', availability: ' + p.availability + ', busyReason: ' + p.busyReason);
      p.problems.forEach(function(prob) { console.log('   ❌ ' + prob); });
      console.log('');
    });
  }

  return issues;
}

findInconsistent()
  .then(function() { process.exit(0); })
  .catch(function(err) { console.error(err); process.exit(1); });

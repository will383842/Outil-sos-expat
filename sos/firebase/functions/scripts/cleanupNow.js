/**
 * Script de nettoyage immédiat des sessions orphelines
 * Usage: node cleanupNow.js
 */

const admin = require('firebase-admin');

// Initialiser avec les credentials par défaut du projet
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();

async function cleanupOrphanedSessions() {
  console.log('🧹 Démarrage du nettoyage des sessions orphelines...\n');

  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  const orphanedStatuses = ['pending', 'provider_connecting', 'client_connecting', 'both_connecting'];

  let totalFound = 0;
  let totalCleaned = 0;
  let totalErrors = 0;

  for (const status of orphanedStatuses) {
    console.log(`\n📋 Recherche des sessions "${status}"...`);

    const snapshot = await db
      .collection('call_sessions')
      .where('status', '==', status)
      .get();

    console.log(`   Trouvées: ${snapshot.size}`);
    totalFound += snapshot.size;

    for (const doc of snapshot.docs) {
      const session = doc.data();
      const sessionId = doc.id;
      const createdAt = session.metadata?.createdAt?.toMillis?.() || 0;
      const ageMinutes = Math.round((now - createdAt) / 60000);
      const ageDays = Math.round(ageMinutes / 1440);

      // Ne nettoyer que les sessions > 60 minutes
      if (ageMinutes < 60) {
        console.log(`   ⏭️  ${sessionId.slice(-12)} - ${ageMinutes}min (trop récent, ignoré)`);
        continue;
      }

      try {
        // Marquer comme failed
        await doc.ref.update({
          status: 'failed',
          'payment.status': session.payment?.status === 'authorized' ? 'cancelled' : session.payment?.status,
          'payment.refundReason': 'script_cleanup_orphaned',
          'metadata.updatedAt': admin.firestore.Timestamp.now(),
          'metadata.cleanupNote': `Cleaned by script on ${new Date().toISOString()}`,
        });

        // Libérer le prestataire si nécessaire
        if (session.metadata?.providerId) {
          try {
            await db.collection('sos_profiles').doc(session.metadata.providerId).update({
              availability: 'available',
              currentCallSessionId: null,
              busySince: null,
              lastAvailableAt: admin.firestore.Timestamp.now(),
            });
          } catch (e) {
            // Ignore si le profil n'existe pas
          }
        }

        console.log(`   ✅ ${sessionId.slice(-12)} - ${ageDays > 0 ? ageDays + ' jours' : ageMinutes + ' min'} - NETTOYÉ`);
        totalCleaned++;

      } catch (error) {
        console.log(`   ❌ ${sessionId.slice(-12)} - ERREUR: ${error.message}`);
        totalErrors++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ DU NETTOYAGE');
  console.log('='.repeat(50));
  console.log(`   Sessions trouvées:  ${totalFound}`);
  console.log(`   Sessions nettoyées: ${totalCleaned}`);
  console.log(`   Erreurs:            ${totalErrors}`);
  console.log('='.repeat(50));

  // Log dans Firestore
  if (totalCleaned > 0) {
    await db.collection('system_logs').add({
      type: 'script_cleanup_orphaned_sessions',
      sessionsFound: totalFound,
      sessionsCleaned: totalCleaned,
      errors: totalErrors,
      timestamp: admin.firestore.Timestamp.now(),
    });
  }

  return { totalFound, totalCleaned, totalErrors };
}

// Exécuter
cleanupOrphanedSessions()
  .then(result => {
    console.log('\n✅ Nettoyage terminé!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  });

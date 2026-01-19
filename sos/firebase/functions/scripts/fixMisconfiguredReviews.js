/**
 * Script pour corriger les avis mal configurés
 * Ajoute status='published' et isPublic=true si manquants
 */

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

async function fixMisconfiguredReviews() {
  console.log('========================================');
  console.log('CORRECTION: Avis mal configurés');
  console.log('========================================\n');

  const batch = db.batch();
  let fixCount = 0;

  // Récupérer tous les avis
  const snapshot = await db.collection('reviews').get();
  console.log(`Total d'avis: ${snapshot.size}\n`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    // Vérifier status
    if (!data.status || data.status !== 'published') {
      if (!data.status) {
        updates.status = 'published';
        needsUpdate = true;
      }
    }

    // Vérifier isPublic
    if (data.isPublic !== true) {
      updates.isPublic = true;
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`🔧 Correction: ${doc.id}`);
      console.log(`   Avant: status=${data.status}, isPublic=${data.isPublic}`);
      console.log(`   Updates: ${JSON.stringify(updates)}`);

      batch.update(doc.ref, updates);
      fixCount++;
    }
  }

  if (fixCount > 0) {
    console.log(`\n⏳ Application des corrections (${fixCount} avis)...`);
    await batch.commit();
    console.log('✅ Corrections appliquées!');
  } else {
    console.log('✅ Aucune correction nécessaire!');
  }

  console.log(`\n--- Résumé ---`);
  console.log(`Avis corrigés: ${fixCount}`);

  process.exit(0);
}

fixMisconfiguredReviews().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

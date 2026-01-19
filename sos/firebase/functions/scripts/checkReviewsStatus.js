/**
 * Script de diagnostic des avis
 * Vérifie l'état des reviewCount vs avis réels
 */

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

async function checkReviewsStatus() {
  console.log('========================================');
  console.log('DIAGNOSTIC: État des avis');
  console.log('========================================\n');

  // 1. Compter les profils
  const profilesSnapshot = await db.collection('sos_profiles').limit(50).get();
  console.log(`Profils analysés: ${profilesSnapshot.size}\n`);

  // 2. Compter les avis totaux
  const reviewsSnapshot = await db.collection('reviews').limit(1000).get();
  console.log(`Avis totaux (max 1000): ${reviewsSnapshot.size}\n`);

  // 3. Vérifier quelques profils
  console.log('--- Échantillon de profils ---\n');

  let profilsAvecReviewCount = 0;
  let profilsSansReviewCount = 0;
  let totalExpected = 0;
  let totalReal = 0;

  for (const doc of profilesSnapshot.docs.slice(0, 20)) {
    const data = doc.data();
    const reviewCount = data.reviewCount;
    const fullName = data.fullName || data.displayName || doc.id;

    // Compter les vrais avis
    const realReviewsSnap = await db.collection('reviews')
      .where('providerId', '==', doc.id)
      .where('status', '==', 'published')
      .where('isPublic', '==', true)
      .get();

    const realCount = realReviewsSnap.size;

    if (typeof reviewCount === 'number' && reviewCount > 0) {
      profilsAvecReviewCount++;
      totalExpected += reviewCount;
      totalReal += realCount;

      const diff = reviewCount - realCount;
      const status = diff === 0 ? '✅' : (diff > 0 ? '⚠️ MANQUANTS' : '❓ EXCÈS');

      console.log(`${status} ${fullName.substring(0, 25).padEnd(25)} | reviewCount: ${reviewCount.toString().padStart(3)} | réels: ${realCount.toString().padStart(3)} | diff: ${diff}`);
    } else {
      profilsSansReviewCount++;
      if (realCount > 0) {
        console.log(`❓ ${fullName.substring(0, 25).padEnd(25)} | reviewCount: N/A | réels: ${realCount.toString().padStart(3)}`);
      }
    }
  }

  console.log('\n--- Résumé ---\n');
  console.log(`Profils avec reviewCount > 0: ${profilsAvecReviewCount}`);
  console.log(`Profils sans reviewCount: ${profilsSansReviewCount}`);
  console.log(`Total reviewCount attendu: ${totalExpected}`);
  console.log(`Total avis réels: ${totalReal}`);
  console.log(`Différence: ${totalExpected - totalReal}`);

  // 4. Vérifier les avis sans isPublic ou status
  console.log('\n--- Avis potentiellement mal configurés ---\n');

  const allReviewsSnap = await db.collection('reviews').limit(100).get();
  let missingStatus = 0;
  let missingIsPublic = 0;
  let notPublished = 0;

  allReviewsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.status) missingStatus++;
    if (data.isPublic !== true) missingIsPublic++;
    if (data.status && data.status !== 'published') notPublished++;
  });

  console.log(`Avis sans status: ${missingStatus}`);
  console.log(`Avis sans isPublic=true: ${missingIsPublic}`);
  console.log(`Avis avec status !== 'published': ${notPublished}`);

  process.exit(0);
}

checkReviewsStatus().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

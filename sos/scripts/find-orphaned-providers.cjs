/**
 * Script pour identifier les IDs orphelins dans linkedProviderIds
 * Compare les IDs dans linkedProviderIds avec les profils existants dans sos_profiles
 *
 * L'admin UI affiche seulement les prestataires qui ont un profil valide.
 * La différence entre linkedProviderIds.length et le nombre affiché dans l'UI = IDs orphelins
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialiser Firebase Admin
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function findOrphanedProviders() {
  console.log('=== Recherche des IDs orphelins dans linkedProviderIds ===\n');

  // 1. Récupérer tous les comptes multi-prestataires
  const usersSnap = await db.collection('users')
    .where('isMultiProvider', '==', true)
    .get();

  console.log(`Nombre de comptes multi-prestataires: ${usersSnap.size}\n`);

  let totalLinkedIds = 0;
  let totalValidIds = 0;
  let totalOrphanedIds = 0;
  const allOrphanedIds = [];
  const accountDetails = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const linkedIds = userData.linkedProviderIds || [];
    const accountName = userData.displayName || userData.email || userDoc.id;

    console.log(`\n--- Compte: ${accountName} ---`);
    console.log(`  linkedProviderIds.length: ${linkedIds.length}`);

    if (linkedIds.length === 0) {
      console.log('  Aucun ID lié');
      continue;
    }

    totalLinkedIds += linkedIds.length;

    // Vérifier chaque ID dans sos_profiles
    const validIds = [];
    const orphanedIds = [];

    // Batch get pour performance
    const batchSize = 10;
    for (let i = 0; i < linkedIds.length; i += batchSize) {
      const batch = linkedIds.slice(i, i + batchSize);
      const refs = batch.map(id => db.collection('sos_profiles').doc(id));
      const docs = await db.getAll(...refs);

      for (let idx = 0; idx < docs.length; idx++) {
        const doc = docs[idx];
        const id = batch[idx];

        if (doc.exists) {
          const data = doc.data();
          // Vérifier si le profil est vraiment un prestataire (lawyer ou expat)
          if (data.type === 'lawyer' || data.type === 'expat') {
            validIds.push({ id, name: data.displayName || 'N/A', type: data.type });
          } else {
            // Profil existe mais n'est pas un prestataire (type différent)
            orphanedIds.push({ id, reason: 'wrong_type', type: data.type || 'unknown', name: data.displayName });
          }
        } else {
          // Le profil n'existe pas dans sos_profiles - vérifier dans users
          const userRef = await db.collection('users').doc(id).get();
          if (userRef.exists) {
            const userData2 = userRef.data();
            // Check if it's a provider type user
            if (userData2.type === 'lawyer' || userData2.type === 'expat_aidant') {
              validIds.push({ id, name: userData2.displayName || 'N/A', type: userData2.type });
            } else {
              orphanedIds.push({ id, reason: 'wrong_type_in_users', type: userData2.type || 'unknown', name: userData2.displayName });
            }
          } else {
            orphanedIds.push({ id, reason: 'not_found', type: 'N/A' });
          }
        }
      }
    }

    totalValidIds += validIds.length;
    totalOrphanedIds += orphanedIds.length;

    console.log(`  Profils valides (affichés dans UI): ${validIds.length}`);
    console.log(`  IDs orphelins (non affichés): ${orphanedIds.length}`);

    accountDetails.push({
      name: accountName,
      userId: userDoc.id,
      linkedCount: linkedIds.length,
      validCount: validIds.length,
      orphanedCount: orphanedIds.length,
      orphanedIds: orphanedIds
    });

    if (orphanedIds.length > 0) {
      console.log('  Détail des orphelins:');
      orphanedIds.forEach(o => {
        console.log(`    - ${o.id} (${o.reason}${o.type !== 'N/A' ? ', type: ' + o.type : ''})`);
        allOrphanedIds.push({ ...o, accountId: userDoc.id, accountName });
      });
    }
  }

  console.log('\n========================================');
  console.log('=== RÉSUMÉ ===');
  console.log('========================================');
  console.log(`Total IDs dans linkedProviderIds: ${totalLinkedIds}`);
  console.log(`Total profils valides (affichés): ${totalValidIds}`);
  console.log(`Total IDs orphelins: ${totalOrphanedIds}`);
  console.log(`Différence: ${totalLinkedIds - totalValidIds}`);

  console.log('\n=== DÉTAIL PAR COMPTE ===');
  accountDetails.forEach(acc => {
    console.log(`${acc.name}:`);
    console.log(`  - linkedProviderIds: ${acc.linkedCount}`);
    console.log(`  - Affichés dans UI: ${acc.validCount}`);
    console.log(`  - Orphelins: ${acc.orphanedCount}`);
  });

  if (allOrphanedIds.length > 0) {
    console.log('\n=== TOUS LES IDS ORPHELINS ===');
    allOrphanedIds.forEach(o => {
      console.log(`  ${o.accountName}: ${o.id} (${o.reason})`);
    });

    console.log('\n=== CORRECTION SUGGÉRÉE ===');
    console.log('Pour nettoyer ces IDs orphelins, utilisez le bouton "Orphelins"');
    console.log('dans l\'onglet Multi-Prestataires de la console d\'administration.');
  } else {
    console.log('\n✅ Aucun ID orphelin trouvé - les données sont propres!');
  }

  process.exit(0);
}

findOrphanedProviders().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

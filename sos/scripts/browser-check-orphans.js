/**
 * Script à exécuter dans la console du navigateur sur l'admin panel
 * (après être connecté comme admin sur https://sos-expat.com/admin)
 *
 * Ce script vérifie les IDs orphelins dans linkedProviderIds
 *
 * Instructions:
 * 1. Connectez-vous à l'admin panel
 * 2. Ouvrez la console du navigateur (F12 > Console)
 * 3. Copiez-collez ce script et appuyez sur Entrée
 */

(async function checkOrphanedProviders() {
  // Import Firebase from the page's context
  const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');

  // Get the db instance from window (it should be exposed by the app)
  if (!window.db) {
    console.error('❌ Firebase db not found. Make sure you are on the admin panel.');
    return;
  }

  const db = window.db;

  console.log('=== Vérification des IDs orphelins ===\n');

  // 1. Get multi-provider accounts
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('isMultiProvider', '==', true))
  );

  console.log(`Nombre de comptes multi-prestataires: ${usersSnap.size}\n`);

  let totalLinkedIds = 0;
  let totalValidIds = 0;
  let totalOrphanedIds = 0;
  const results = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const linkedIds = userData.linkedProviderIds || [];
    const accountName = userData.displayName || userData.email || userDoc.id;

    console.log(`\n--- Compte: ${accountName} ---`);
    console.log(`  linkedProviderIds: ${linkedIds.length}`);

    if (linkedIds.length === 0) continue;

    totalLinkedIds += linkedIds.length;

    const validIds = [];
    const orphanedIds = [];

    // Check each ID
    for (const pid of linkedIds) {
      try {
        const profileDoc = await getDoc(doc(db, 'sos_profiles', pid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          if (data.type === 'lawyer' || data.type === 'expat') {
            validIds.push({ id: pid, name: data.displayName });
          } else {
            orphanedIds.push({ id: pid, reason: 'wrong_type', type: data.type });
          }
        } else {
          orphanedIds.push({ id: pid, reason: 'not_found' });
        }
      } catch (e) {
        orphanedIds.push({ id: pid, reason: 'error', error: e.message });
      }
    }

    totalValidIds += validIds.length;
    totalOrphanedIds += orphanedIds.length;

    console.log(`  Valides: ${validIds.length}`);
    console.log(`  Orphelins: ${orphanedIds.length}`);

    if (orphanedIds.length > 0) {
      console.log('  Orphelins détaillés:', orphanedIds);
    }

    results.push({
      accountName,
      userId: userDoc.id,
      linkedCount: linkedIds.length,
      validCount: validIds.length,
      orphanedCount: orphanedIds.length,
      orphanedIds
    });
  }

  console.log('\n========================================');
  console.log('=== RÉSUMÉ ===');
  console.log('========================================');
  console.log(`Total IDs dans linkedProviderIds: ${totalLinkedIds}`);
  console.log(`Total profils valides: ${totalValidIds}`);
  console.log(`Total IDs orphelins: ${totalOrphanedIds}`);

  console.log('\nRésultats par compte:');
  results.forEach(r => {
    console.log(`  ${r.accountName}: ${r.validCount}/${r.linkedCount} (${r.orphanedCount} orphelins)`);
  });

  // Return results for further use
  return results;
})();

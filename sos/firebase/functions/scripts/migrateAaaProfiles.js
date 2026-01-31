/**
 * Script de migration pour ajouter forcedAIAccess: true à tous les profils AAA
 *
 * Usage:
 *   cd sos/firebase/functions
 *   node scripts/migrateAaaProfiles.js [--dry-run]
 *
 * Options:
 *   --dry-run   Prévisualiser les changements sans les appliquer (par défaut)
 *   --execute   Exécuter la migration réellement
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin avec les credentials par défaut
// Utilise GOOGLE_APPLICATION_CREDENTIALS ou gcloud auth
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function migrateAaaProfiles(dryRun = true) {
  console.log(`\n🔧 Migration AAA Profiles - ${dryRun ? 'DRY RUN (prévisualisation)' : '⚠️  EXÉCUTION RÉELLE'}`);
  console.log('='.repeat(60));

  // 1. Trouver tous les profils AAA via isAAA: true
  console.log('\n📋 Recherche des profils AAA dans users (isAAA: true)...');
  const usersQuery = await db.collection('users').where('isAAA', '==', true).get();
  console.log(`   Trouvé: ${usersQuery.size} profils AAA`);

  // 2. Trouver aussi les profils avec uid commençant par 'aaa_'
  console.log('\n📋 Recherche des profils AAA dans sos_profiles (uid: aaa_*)...');
  const sosProfilesSnapshot = await db.collection('sos_profiles').get();
  const aaaProfiles = sosProfilesSnapshot.docs.filter(doc => doc.id.startsWith('aaa_'));
  console.log(`   Trouvé: ${aaaProfiles.length} profils avec uid aaa_*`);

  // Combiner les IDs uniques
  const allAaaIds = new Set([
    ...usersQuery.docs.map(doc => doc.id),
    ...aaaProfiles.map(doc => doc.id)
  ]);

  console.log(`\n📊 Total profils AAA uniques: ${allAaaIds.size}`);

  // 3. Vérifier lesquels ont besoin de mise à jour
  const profilesToMigrate = [];

  for (const profileId of allAaaIds) {
    const userDoc = await db.collection('users').doc(profileId).get();
    const sosDoc = await db.collection('sos_profiles').doc(profileId).get();

    const userData = userDoc.data() || {};
    const sosData = sosDoc.data() || {};

    const needsUserUpdate = userData.forcedAIAccess !== true;
    const needsSosUpdate = sosDoc.exists && sosData.forcedAIAccess !== true;

    if (needsUserUpdate || needsSosUpdate) {
      profilesToMigrate.push({
        id: profileId,
        name: userData.fullName || sosData.fullName || userData.email || 'N/A',
        email: userData.email || sosData.email || 'N/A',
        needsUserUpdate,
        needsSosUpdate,
        userExists: userDoc.exists,
        sosExists: sosDoc.exists
      });
    }
  }

  console.log(`\n📝 Profils nécessitant une mise à jour: ${profilesToMigrate.length}`);

  if (profilesToMigrate.length === 0) {
    console.log('\n✅ Tous les profils AAA ont déjà forcedAIAccess: true');
    return { total: allAaaIds.size, migrated: 0 };
  }

  // Afficher les profils à migrer
  console.log('\nProfils à mettre à jour:');
  profilesToMigrate.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.id}`);
    console.log(`      Nom: ${p.name}`);
    console.log(`      Email: ${p.email}`);
    console.log(`      Update users: ${p.needsUserUpdate ? 'OUI' : 'non'} | Update sos_profiles: ${p.needsSosUpdate ? 'OUI' : 'non'}`);
  });

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - Aucune modification effectuée');
    console.log('   Pour exécuter la migration, relancez avec: node scripts/migrateAaaProfiles.js --execute');
    return { total: allAaaIds.size, toMigrate: profilesToMigrate.length, migrated: 0 };
  }

  // 4. Exécuter la migration
  console.log('\n🚀 Exécution de la migration...');

  let migrated = 0;
  const batchSize = 400; // Firestore limit is 500, using 400 for safety (2 writes per profile)

  for (let i = 0; i < profilesToMigrate.length; i += batchSize) {
    const batch = db.batch();
    const chunk = profilesToMigrate.slice(i, i + batchSize);

    for (const profile of chunk) {
      const updateData = {
        forcedAIAccess: true,
        hasActiveSubscription: true,
        subscriptionStatus: 'active',
        isAAA: true, // S'assurer que le flag AAA est présent
        aaaAiAccessMigratedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (profile.needsUserUpdate && profile.userExists) {
        batch.update(db.collection('users').doc(profile.id), updateData);
      }

      if (profile.needsSosUpdate && profile.sosExists) {
        batch.update(db.collection('sos_profiles').doc(profile.id), updateData);
      }
    }

    await batch.commit();
    migrated += chunk.length;
    console.log(`   ✓ Migré ${migrated}/${profilesToMigrate.length}`);
  }

  console.log(`\n✅ Migration terminée! ${migrated} profils mis à jour`);
  return { total: allAaaIds.size, toMigrate: profilesToMigrate.length, migrated };
}

// Exécution principale
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/migrateAaaProfiles.js [options]

Options:
  --dry-run   Prévisualiser les changements (par défaut)
  --execute   Exécuter la migration réellement
  --help      Afficher cette aide
`);
    process.exit(0);
  }

  try {
    const result = await migrateAaaProfiles(dryRun);
    console.log('\n📊 Résultat:', result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

main();

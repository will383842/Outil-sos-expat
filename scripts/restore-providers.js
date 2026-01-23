/**
 * Script pour restaurer les prestataires dans les bons comptes régionaux
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse if already initialized)
if (!admin.apps.length) {
  const serviceAccount = require('../security-audit/backups/firebase-adminsdk-NEW-.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Prestataires à restaurer avec leur compte cible
const providersToRestore = [
  // Afrique & Moyen-Orient
  { providerId: 'aaa_lawyer_cm_1767138593166_r3vd', accountId: 'aaa_multi_afrique_1769080741948', name: 'Abdoulaye Sy', country: 'CM' },
  { providerId: 'aaa_lawyer_lb_1767139034877_cxra', accountId: 'aaa_multi_afrique_1769080741948', name: 'Amadou Diop', country: 'LB' },
  { providerId: 'aaa_lawyer_ao_1767138572174_q2hd', accountId: 'aaa_multi_afrique_1769080741948', name: 'Alexei Sokolov', country: 'AO' },

  // Europe
  { providerId: 'aaa_lawyer_se_1767138957802_fjq8', accountId: 'aaa_multi_europe_1769080742343', name: 'Alexandre Bernard', country: 'SE' },
  { providerId: 'aaa_lawyer_al_1767138551802_o3sh', accountId: 'aaa_multi_europe_1769080742343', name: 'Ali Jafari', country: 'AL' },

  // Amériques
  { providerId: 'aaa_lawyer_gf_1767138779155_52ky', accountId: 'aaa_multi_ameriques_1769080742491', name: 'Alejandro Sánchez', country: 'GF' },
];

async function main() {
  console.log('\n========================================');
  console.log('  RESTAURATION DES PRESTATAIRES');
  console.log('========================================\n');

  // First, find the provider IDs by searching profiles
  console.log('Recherche des IDs des prestataires...\n');

  const profilesSnap = await db.collection('sos_profiles').get();
  const profilesByName = new Map();

  profilesSnap.forEach(doc => {
    const data = doc.data();
    const name = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
    if (name) {
      profilesByName.set(name.toLowerCase(), {
        id: doc.id,
        name,
        country: data.country
      });
    }
  });

  // Map names to IDs
  const namesToFind = [
    { name: 'Abdoulaye Sy', targetAccount: 'aaa_multi_afrique_1769080741948' },
    { name: 'Amadou Diop', targetAccount: 'aaa_multi_afrique_1769080741948' },
    { name: 'Alexei Sokolov', targetAccount: 'aaa_multi_afrique_1769080741948' },
    { name: 'Alexandre Bernard', targetAccount: 'aaa_multi_europe_1769080742343' },
    { name: 'Ali Jafari', targetAccount: 'aaa_multi_europe_1769080742343' },
    { name: 'Alejandro Sánchez', targetAccount: 'aaa_multi_ameriques_1769080742491' },
  ];

  const providersFound = [];

  for (const item of namesToFind) {
    const profile = profilesByName.get(item.name.toLowerCase());
    if (profile) {
      console.log(`  ✓ ${item.name} -> ${profile.id} (${profile.country})`);
      providersFound.push({
        providerId: profile.id,
        name: item.name,
        targetAccount: item.targetAccount
      });
    } else {
      console.log(`  ✗ ${item.name} -> NON TROUVÉ`);
    }
  }

  console.log(`\nTrouvé ${providersFound.length}/${namesToFind.length} prestataires\n`);

  // Now add them to their target accounts
  console.log('Ajout aux comptes régionaux...\n');

  const accountUpdates = new Map();

  for (const provider of providersFound) {
    if (!accountUpdates.has(provider.targetAccount)) {
      accountUpdates.set(provider.targetAccount, []);
    }
    accountUpdates.get(provider.targetAccount).push(provider.providerId);
  }

  for (const [accountId, providerIds] of accountUpdates) {
    console.log(`\nCompte ${accountId}:`);

    // Get current linkedProviderIds
    const accountDoc = await db.collection('users').doc(accountId).get();
    const currentData = accountDoc.data() || {};
    const currentLinkedIds = currentData.linkedProviderIds || [];

    // Add new provider IDs (avoiding duplicates)
    const newLinkedIds = [...new Set([...currentLinkedIds, ...providerIds])];
    const addedCount = newLinkedIds.length - currentLinkedIds.length;

    if (addedCount > 0) {
      await db.collection('users').doc(accountId).update({
        linkedProviderIds: newLinkedIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`  ✓ Ajouté ${addedCount} prestataire(s)`);
      providerIds.forEach(pid => {
        const provider = providersFound.find(p => p.providerId === pid);
        console.log(`    - ${provider?.name || pid}`);
      });
    } else {
      console.log(`  (Déjà présents)`);
    }
  }

  console.log('\n\n========================================');
  console.log('  RESTAURATION TERMINÉE');
  console.log('========================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

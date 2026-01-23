/**
 * Script pour analyser et corriger les doublons multi-prestataires
 * Usage: node fix-multiprestataires.js [--fix]
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../security-audit/backups/firebase-adminsdk-NEW-.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuration
const DRY_RUN = !process.argv.includes('--fix');

async function main() {
  console.log('\n========================================');
  console.log('  ANALYSE DES COMPTES MULTI-PRESTATAIRES');
  console.log('========================================\n');

  if (DRY_RUN) {
    console.log('MODE: Analyse seule (ajouter --fix pour appliquer les corrections)\n');
  } else {
    console.log('MODE: CORRECTION ACTIVE\n');
  }

  // 1. Charger tous les utilisateurs avec linkedProviderIds
  console.log('Chargement des utilisateurs...');
  const usersSnap = await db.collection('users').get();

  // 2. Charger tous les profils pour avoir les noms et pays
  console.log('Chargement des profils...');
  const profilesSnap = await db.collection('sos_profiles').get();

  const profiles = new Map();
  profilesSnap.forEach(doc => {
    const data = doc.data();
    profiles.set(doc.id, {
      id: doc.id,
      name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
      email: data.email || '',
      country: data.country || '',
      type: data.type || 'unknown'
    });
  });

  // 3. Construire la map des comptes multi-prestataires
  const multiProviderAccounts = [];
  const providerToAccounts = new Map(); // providerId -> [accountIds]

  usersSnap.forEach(doc => {
    const data = doc.data();
    const linkedIds = data.linkedProviderIds || [];

    if (linkedIds.length > 0) {
      const displayName = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A';

      multiProviderAccounts.push({
        userId: doc.id,
        displayName,
        email: data.email || '',
        linkedProviderIds: linkedIds,
        activeProviderId: data.activeProviderId
      });

      // Track which accounts each provider is linked to
      linkedIds.forEach(pid => {
        if (!providerToAccounts.has(pid)) {
          providerToAccounts.set(pid, []);
        }
        providerToAccounts.get(pid).push({
          userId: doc.id,
          displayName
        });
      });
    }
  });

  console.log(`\nTrouvé ${multiProviderAccounts.length} comptes multi-prestataires\n`);

  // 4. Afficher les comptes
  console.log('========================================');
  console.log('  LISTE DES COMPTES');
  console.log('========================================\n');

  multiProviderAccounts.forEach(account => {
    console.log(`\n[${account.displayName}] (${account.email})`);
    console.log(`  User ID: ${account.userId}`);
    console.log(`  Prestataires liés (${account.linkedProviderIds.length}):`);

    account.linkedProviderIds.forEach(pid => {
      const profile = profiles.get(pid);
      const name = profile?.name || pid;
      const country = profile?.country || '??';
      const type = profile?.type || '??';
      const isActive = account.activeProviderId === pid ? ' [ACTIF]' : '';

      // Check if this provider is in multiple accounts
      const linkedTo = providerToAccounts.get(pid) || [];
      const isDuplicate = linkedTo.length > 1;
      const duplicateWarning = isDuplicate
        ? ` ⚠️ DOUBLON (aussi dans: ${linkedTo.filter(a => a.userId !== account.userId).map(a => a.displayName).join(', ')})`
        : '';

      console.log(`    - ${name} (${country}, ${type})${isActive}${duplicateWarning}`);
    });
  });

  // 5. Identifier les doublons
  console.log('\n\n========================================');
  console.log('  DOUBLONS DETECTES');
  console.log('========================================\n');

  const duplicates = [];
  providerToAccounts.forEach((accounts, providerId) => {
    if (accounts.length > 1) {
      const profile = profiles.get(providerId);
      duplicates.push({
        providerId,
        providerName: profile?.name || providerId,
        providerCountry: profile?.country || '??',
        accounts
      });
    }
  });

  if (duplicates.length === 0) {
    console.log('Aucun doublon détecté!');
  } else {
    console.log(`${duplicates.length} prestataire(s) en doublon:\n`);
    duplicates.forEach(dup => {
      console.log(`  "${dup.providerName}" (${dup.providerCountry})`);
      console.log(`    Présent dans ${dup.accounts.length} comptes:`);
      dup.accounts.forEach(acc => {
        console.log(`      - ${acc.displayName} (${acc.userId})`);
      });
      console.log('');
    });
  }

  // 6. Chercher le compte "Julien Valentine"
  console.log('\n========================================');
  console.log('  COMPTE "JULIEN VALENTINE"');
  console.log('========================================\n');

  const julienAccount = multiProviderAccounts.find(a =>
    a.displayName.toLowerCase().includes('julien') &&
    a.displayName.toLowerCase().includes('valentine')
  );

  if (!julienAccount) {
    console.log('Compte "Julien Valentine" non trouvé.');
    console.log('\nRecherche de comptes similaires:');
    multiProviderAccounts.forEach(a => {
      if (a.displayName.toLowerCase().includes('julien') ||
          a.displayName.toLowerCase().includes('valentine')) {
        console.log(`  - ${a.displayName} (${a.email})`);
      }
    });
  } else {
    console.log(`Trouvé: ${julienAccount.displayName}`);
    console.log(`Email: ${julienAccount.email}`);
    console.log(`User ID: ${julienAccount.userId}`);
    console.log(`\nPrestataires à redistribuer (${julienAccount.linkedProviderIds.length}):\n`);

    // Group providers by country for redistribution suggestions
    const providersByCountry = new Map();
    julienAccount.linkedProviderIds.forEach(pid => {
      const profile = profiles.get(pid);
      const country = profile?.country || 'UNKNOWN';
      if (!providersByCountry.has(country)) {
        providersByCountry.set(country, []);
      }
      providersByCountry.get(country).push({
        id: pid,
        name: profile?.name || pid,
        type: profile?.type || 'unknown'
      });
    });

    providersByCountry.forEach((providers, country) => {
      console.log(`  ${country}:`);
      providers.forEach(p => {
        console.log(`    - ${p.name} (${p.type})`);
      });
    });

    // Find other accounts that could receive these providers
    console.log('\n\nComptes disponibles pour la redistribution:');
    multiProviderAccounts
      .filter(a => a.userId !== julienAccount.userId)
      .forEach(a => {
        // Get countries of providers in this account
        const countries = new Set();
        a.linkedProviderIds.forEach(pid => {
          const profile = profiles.get(pid);
          if (profile?.country) countries.add(profile.country);
        });
        console.log(`  - ${a.displayName}: ${[...countries].join(', ') || 'N/A'}`);
      });

    // Apply fix if --fix flag is set
    if (!DRY_RUN) {
      console.log('\n\n========================================');
      console.log('  APPLICATION DES CORRECTIONS');
      console.log('========================================\n');

      // For now, just clear the Julien Valentine account
      // The providers need to be manually reassigned based on country
      console.log(`Suppression du compte "${julienAccount.displayName}"...`);

      await db.collection('users').doc(julienAccount.userId).update({
        linkedProviderIds: [],
        activeProviderId: null,
        isMultiProvider: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Compte supprimé (prestataires déliés).');
      console.log('\n⚠️  Les prestataires doivent maintenant être reliés manuellement aux bons comptes selon leur pays.');
    }
  }

  // 7. Proposer des corrections pour les doublons
  if (duplicates.length > 0 && !DRY_RUN) {
    console.log('\n\n========================================');
    console.log('  CORRECTION DES DOUBLONS');
    console.log('========================================\n');

    for (const dup of duplicates) {
      console.log(`\nTraitement de "${dup.providerName}"...`);

      // Keep the provider in the first account, remove from others
      const keepIn = dup.accounts[0];
      const removeFrom = dup.accounts.slice(1);

      for (const account of removeFrom) {
        console.log(`  Retrait de ${account.displayName}...`);

        const userDoc = await db.collection('users').doc(account.userId).get();
        const userData = userDoc.data();
        const newLinkedIds = (userData.linkedProviderIds || []).filter(id => id !== dup.providerId);
        const newActiveId = userData.activeProviderId === dup.providerId
          ? (newLinkedIds[0] || null)
          : userData.activeProviderId;

        await db.collection('users').doc(account.userId).update({
          linkedProviderIds: newLinkedIds,
          activeProviderId: newActiveId,
          ...(newLinkedIds.length === 0 && { isMultiProvider: false }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`    OK - Gardé dans: ${keepIn.displayName}`);
      }
    }
  }

  console.log('\n\n========================================');
  console.log('  TERMINE');
  console.log('========================================\n');

  if (DRY_RUN) {
    console.log('Pour appliquer les corrections, relancer avec: node fix-multiprestataires.js --fix\n');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

/**
 * Script pour corriger les champs de paiement AAA sur les profils existants
 *
 * Ce script ajoute/met à jour les champs suivants sur tous les profils AAA:
 * - isAAA: true
 * - aaaPayoutMode: 'internal' (par défaut)
 * - kycDelegated: true
 * - kycStatus: 'not_required'
 *
 * Les profils AAA sont identifiés par:
 * - isTestProfile: true
 * - isSOS: true
 * - uid commençant par 'aaa_'
 *
 * Usage: node scripts/fix-aaa-profiles-payment-fields.js [--dry-run]
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialiser Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// Mode dry-run (simulation sans modifications)
const DRY_RUN = process.argv.includes('--dry-run');

async function fixAaaProfiles() {
  console.log('='.repeat(60));
  console.log('CORRECTION DES CHAMPS DE PAIEMENT AAA');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (simulation)' : 'PRODUCTION (modifications réelles)'}`);
  console.log('');

  const stats = {
    total: 0,
    fixed: 0,
    alreadyCorrect: 0,
    errors: 0
  };

  // Récupérer tous les profils de sos_profiles
  console.log('[1/4] Récupération des profils sos_profiles...');
  const sosProfilesSnapshot = await db.collection('sos_profiles').get();
  console.log(`     Trouvé ${sosProfilesSnapshot.size} profils au total`);

  // Filtrer les profils AAA
  console.log('[2/4] Identification des profils AAA...');
  const aaaProfiles = [];

  sosProfilesSnapshot.forEach(doc => {
    const data = doc.data();
    const uid = doc.id;

    // Identifier les profils AAA
    const isAaaProfile =
      data.isTestProfile === true ||
      data.isSOS === true ||
      data.isAAA === true ||
      uid.startsWith('aaa_');

    if (isAaaProfile) {
      aaaProfiles.push({ uid, data, ref: doc.ref });
    }
  });

  console.log(`     Trouvé ${aaaProfiles.length} profils AAA`);
  stats.total = aaaProfiles.length;

  if (aaaProfiles.length === 0) {
    console.log('\n[INFO] Aucun profil AAA trouvé. Fin du script.');
    return;
  }

  // Corriger chaque profil AAA
  console.log('[3/4] Correction des profils AAA...');

  for (const { uid, data, ref } of aaaProfiles) {
    try {
      // Vérifier si les champs sont déjà corrects
      const needsFix =
        data.isAAA !== true ||
        !data.aaaPayoutMode ||
        data.kycDelegated !== true ||
        data.kycStatus !== 'not_required';

      if (!needsFix) {
        console.log(`  [OK] ${uid} - Déjà correct`);
        stats.alreadyCorrect++;
        continue;
      }

      // Préparer les mises à jour
      const updates = {
        isAAA: true,
        aaaPayoutMode: data.aaaPayoutMode || 'internal',
        kycDelegated: true,
        kycStatus: 'not_required',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (DRY_RUN) {
        console.log(`  [DRY-RUN] ${uid} - Serait corrigé avec:`, JSON.stringify(updates, null, 2));
      } else {
        // Mettre à jour sos_profiles
        await ref.update(updates);

        // Mettre à jour aussi users/{uid} si existe
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          await userRef.update(updates);
        }

        console.log(`  [FIXED] ${uid}`);
      }

      stats.fixed++;
    } catch (error) {
      console.error(`  [ERROR] ${uid}:`, error.message);
      stats.errors++;
    }
  }

  // Afficher les statistiques
  console.log('\n[4/4] Résumé:');
  console.log('='.repeat(60));
  console.log(`Total profils AAA:      ${stats.total}`);
  console.log(`Déjà corrects:          ${stats.alreadyCorrect}`);
  console.log(`Corrigés:               ${stats.fixed}`);
  console.log(`Erreurs:                ${stats.errors}`);
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n[INFO] Mode DRY-RUN - Aucune modification effectuée.');
    console.log('       Pour appliquer les corrections, relancez sans --dry-run');
  } else {
    console.log('\n[SUCCESS] Corrections appliquées.');
  }
}

// Exécuter le script
fixAaaProfiles()
  .then(() => {
    console.log('\nScript terminé.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nErreur fatale:', error);
    process.exit(1);
  });

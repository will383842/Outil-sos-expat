/**
 * Script de restauration complète des rôles utilisateurs
 * Exécute restoreUserRoles + syncAllCustomClaims via Firebase Admin SDK
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialiser Firebase Admin avec les credentials par défaut (gcloud auth)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();

async function main() {
  console.log('🚀 SCRIPT DE RESTAURATION COMPLÈTE DES RÔLES');
  console.log('='.repeat(60));

  const results = {
    restored: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  try {
    // ========== ÉTAPE 1: Trouver les users avec role='client' qui ont un sos_profile ==========
    console.log('\n📋 ÉTAPE 1: Recherche des utilisateurs à restaurer...');

    const clientUsersSnapshot = await db
      .collection('users')
      .where('role', '==', 'client')
      .get();

    console.log(`   Trouvé ${clientUsersSnapshot.size} utilisateurs avec role='client'`);

    for (const userDoc of clientUsersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      try {
        // Vérifier s'ils ont un profil sos_profiles
        const sosProfileDoc = await db.collection('sos_profiles').doc(userId).get();

        if (!sosProfileDoc.exists) {
          results.skipped++;
          continue;
        }

        const sosData = sosProfileDoc.data();
        const providerType = sosData?.providerType;

        if (!providerType || !['lawyer', 'expat'].includes(providerType)) {
          results.skipped++;
          continue;
        }

        // Restaurer le rôle
        await db.collection('users').doc(userId).update({
          role: providerType,
          _roleRestored: true,
          _roleRestoredAt: admin.firestore.FieldValue.serverTimestamp(),
          _roleRestoredFrom: 'client',
        });

        // Synchroniser les Custom Claims
        await admin.auth().setCustomUserClaims(userId, { role: providerType });

        // Log
        await db.collection('role_restoration_logs').add({
          userId,
          email: userData.email || 'unknown',
          oldRole: 'client',
          newRole: providerType,
          restoredBy: 'script',
          restoredAt: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
        });

        results.restored++;
        console.log(`   ✅ ${userData.email || userId}: client → ${providerType}`);

      } catch (error) {
        results.failed++;
        results.errors.push(`${userId}: ${error.message}`);
        console.error(`   ❌ ${userId}: ${error.message}`);
      }
    }

    // ========== ÉTAPE 2: Synchroniser TOUS les Custom Claims ==========
    console.log('\n📋 ÉTAPE 2: Synchronisation de tous les Custom Claims...');

    const allUsersSnapshot = await db
      .collection('users')
      .where('role', 'in', ['client', 'lawyer', 'expat', 'admin'])
      .get();

    console.log(`   Trouvé ${allUsersSnapshot.size} utilisateurs à synchroniser`);

    for (const userDoc of allUsersSnapshot.docs) {
      const userId = userDoc.id;
      const role = userDoc.data().role;

      try {
        await admin.auth().setCustomUserClaims(userId, { role });
        results.synced++;
      } catch (error) {
        // User might not exist in Auth
        if (error.code !== 'auth/user-not-found') {
          console.error(`   ⚠️ Sync failed for ${userId}: ${error.message}`);
        }
      }
    }

    // ========== RÉSUMÉ ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE LA RESTAURATION');
    console.log('='.repeat(60));
    console.log(`   ✅ Rôles restaurés:     ${results.restored}`);
    console.log(`   ✅ Claims synchronisés: ${results.synced}`);
    console.log(`   ⏭️  Ignorés (vrais clients): ${results.skipped}`);
    console.log(`   ❌ Échecs:             ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      results.errors.forEach(e => console.log(`   - ${e}`));
    }

    // Log final dans Firestore
    await db.collection('admin_actions_logs').add({
      action: 'full_role_restoration',
      performedBy: 'script',
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
      result: results,
    });

    console.log('\n✅ RESTAURATION TERMINÉE !');

  } catch (error) {
    console.error('\n❌ ERREUR GLOBALE:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();

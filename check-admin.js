/**
 * Script de diagnostic et correction pour l'accès admin
 * Exécuter avec: node check-admin.js
 *
 * Prérequis: gcloud auth application-default login
 */

const admin = require('firebase-admin');

// Initialize avec Application Default Credentials (gcloud)
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const auth = admin.auth();
const db = admin.firestore();

const TARGET_UID = 'MqnoW1EnFifJkFGL3v83VzGsbaf2';
const TARGET_EMAIL = 'williamsjullin@gmail.com';

async function diagnose() {
  console.log('='.repeat(60));
  console.log('DIAGNOSTIC ADMIN POUR:', TARGET_EMAIL);
  console.log('UID:', TARGET_UID);
  console.log('='.repeat(60));

  try {
    // 1. Vérifier les Custom Claims
    console.log('\n1. VERIFICATION DES CUSTOM CLAIMS:');
    const userRecord = await auth.getUser(TARGET_UID);
    console.log('   Custom Claims actuels:', JSON.stringify(userRecord.customClaims || {}, null, 2));

    const claims = userRecord.customClaims || {};
    const hasAdminClaim = claims.admin === true;
    const hasRoleAdmin = claims.role === 'admin' || claims.role === 'superadmin';

    console.log('   - admin: true ?', hasAdminClaim ? 'OUI' : 'NON');
    console.log('   - role: admin/superadmin ?', hasRoleAdmin ? 'OUI' : 'NON');

    // 2. Vérifier le document Firestore
    console.log('\n2. VERIFICATION DOCUMENT FIRESTORE users/' + TARGET_UID + ':');
    const userDoc = await db.collection('users').doc(TARGET_UID).get();

    if (!userDoc.exists) {
      console.log('   ERREUR: Document utilisateur NON TROUVE!');
      console.log('   -> C\'est probablement la cause du problème.');
    } else {
      const userData = userDoc.data();
      console.log('   Document existe: OUI');
      console.log('   - isAdmin:', userData.isAdmin);
      console.log('   - role:', userData.role);
      console.log('   - email:', userData.email);
      console.log('   - displayName:', userData.displayName);
    }

    // 3. Diagnostic final
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSTIC FINAL:');

    if (!hasAdminClaim && !hasRoleAdmin) {
      console.log('-> PROBLEME: Aucun Custom Claim admin défini!');
    }

    if (!userDoc.exists) {
      console.log('-> PROBLEME: Document Firestore manquant!');
    } else {
      const userData = userDoc.data();
      if (!userData.isAdmin && userData.role !== 'admin' && userData.role !== 'superadmin') {
        console.log('-> PROBLEME: Pas de flag admin dans Firestore!');
      }
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

async function fixAdmin() {
  console.log('\n' + '='.repeat(60));
  console.log('CORRECTION EN COURS...');
  console.log('='.repeat(60));

  try {
    // 1. Définir les Custom Claims
    console.log('\n1. Définition des Custom Claims...');
    await auth.setCustomUserClaims(TARGET_UID, {
      admin: true,
      role: 'superadmin'
    });
    console.log('   -> Custom Claims définis: { admin: true, role: "superadmin" }');

    // 2. Vérifier/Créer le document Firestore
    console.log('\n2. Mise à jour du document Firestore...');
    const userDoc = await db.collection('users').doc(TARGET_UID).get();

    if (!userDoc.exists) {
      // Créer le document
      await db.collection('users').doc(TARGET_UID).set({
        uid: TARGET_UID,
        email: TARGET_EMAIL,
        displayName: 'William Jullin',
        role: 'superadmin',
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('   -> Document créé avec droits admin');
    } else {
      // Mettre à jour
      await db.collection('users').doc(TARGET_UID).update({
        role: 'superadmin',
        isAdmin: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('   -> Document mis à jour avec droits admin');
    }

    // 3. Vérification finale
    console.log('\n3. Vérification finale...');
    const updatedUser = await auth.getUser(TARGET_UID);
    console.log('   Custom Claims:', JSON.stringify(updatedUser.customClaims, null, 2));

    const updatedDoc = await db.collection('users').doc(TARGET_UID).get();
    const data = updatedDoc.data();
    console.log('   Firestore isAdmin:', data.isAdmin);
    console.log('   Firestore role:', data.role);

    console.log('\n' + '='.repeat(60));
    console.log('CORRECTION TERMINEE!');
    console.log('IMPORTANT: Déconnectez-vous et reconnectez-vous pour que');
    console.log('les nouveaux Custom Claims soient pris en compte.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Erreur lors de la correction:', error.message);
  }
}

// Exécuter le diagnostic puis la correction
async function main() {
  await diagnose();

  // Demander confirmation avant de corriger
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nVoulez-vous appliquer la correction? (oui/non): ', async (answer) => {
    if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o') {
      await fixAdmin();
    } else {
      console.log('Correction annulée.');
    }
    rl.close();
    process.exit(0);
  });
}

main();

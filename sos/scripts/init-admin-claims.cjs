/**
 * Script pour initialiser les custom claims admin pour SOS-Expat
 *
 * Usage:
 *   node scripts/init-admin-claims.js
 *
 * Prérequis:
 *   - Avoir firebase-admin installé
 *   - Être authentifié avec gcloud: gcloud auth application-default login
 *   - OU avoir un fichier service-account.json dans firebase/
 *
 * Ce script:
 *   1. Trouve l'utilisateur par email dans Firebase Auth
 *   2. Définit les custom claims { role: 'admin' }
 *   3. Crée/met à jour le document Firestore users/{uid}
 *   4. Enregistre un audit log
 */

const admin = require('firebase-admin');
const path = require('path');

// Liste des emails admin à configurer
const ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'julienvalentine1@gmail.com'
];

// Tentative d'initialisation avec différentes méthodes
function initializeFirebase() {
  // Déjà initialisé?
  try {
    return admin.app();
  } catch (e) {
    // Pas encore initialisé
  }

  // Essayer avec les service accounts possibles
  const serviceAccountPaths = [
    path.join(__dirname, '../firebase/service-account.json'),
    path.join(__dirname, '../service-account.json'),
    path.join(__dirname, '../firebase/functions/service-account.json'),
  ];

  for (const saPath of serviceAccountPaths) {
    try {
      const serviceAccount = require(saPath);
      console.log(`✅ Utilisation du service account: ${saPath}`);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } catch (e) {
      // Continuer avec la prochaine option
    }
  }

  // Essayer avec les credentials par défaut de gcloud
  try {
    console.log('📝 Utilisation des credentials par défaut (gcloud)...');
    console.log('   Assurez-vous d\'être connecté: gcloud auth application-default login');
    return admin.initializeApp({
      projectId: 'sos-urgently-ac307' // Project ID de SOS-Expat
    });
  } catch (e) {
    console.error('❌ Impossible d\'initialiser Firebase Admin SDK');
    console.error('   Assurez-vous d\'avoir un service-account.json ou d\'être connecté via gcloud');
    console.error('   Commande: gcloud auth application-default login');
    process.exit(1);
  }
}

async function initAdminClaims() {
  initializeFirebase();
  const db = admin.firestore();

  console.log('\n🔐 Initialisation des droits admin pour SOS-Expat\n');
  console.log('=' .repeat(60));

  for (const email of ADMIN_EMAILS) {
    console.log(`\n📧 Traitement de: ${email}`);

    try {
      // 1. Trouver l'utilisateur par email
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
        console.log(`   ✅ Utilisateur trouvé: ${userRecord.uid}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`   ⚠️  Utilisateur non trouvé - il doit d'abord créer un compte sur sos-expat.com`);
          continue;
        }
        throw error;
      }

      // 2. Vérifier les claims actuels
      const currentClaims = userRecord.customClaims || {};
      console.log(`   📋 Claims actuels: ${JSON.stringify(currentClaims)}`);

      // 3. Définir les custom claims admin (préserver les autres claims)
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        ...currentClaims,
        role: 'admin'
      });
      console.log(`   ✅ Custom claims mis à jour: { role: 'admin' }`);

      // 4. Créer/mettre à jour le document Firestore users/{uid}
      const userRef = db.collection('users').doc(userRecord.uid);
      const userSnap = await userRef.get();

      const userData = {
        uid: userRecord.uid,
        id: userRecord.uid,
        email: email,
        displayName: userRecord.displayName || email.split('@')[0],
        fullName: userRecord.displayName || email.split('@')[0],
        photoURL: userRecord.photoURL || null,
        profilePhoto: userRecord.photoURL || null,
        role: 'admin',
        isAdmin: true,
        status: 'active',
        isVerifiedEmail: userRecord.emailVerified || false,
        phone: userRecord.phoneNumber || null,
        // Accès gratuit à l'outil IA pour les admins
        forcedAIAccess: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (userSnap.exists) {
        await userRef.update(userData);
        console.log(`   ✅ Document Firestore mis à jour`);
      } else {
        await userRef.set({
          ...userData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ Document Firestore créé`);
      }

      // 5. Log d'audit (optionnel)
      try {
        await db.collection('admin_audit_logs').add({
          action: 'admin_initialized',
          resourceType: 'user',
          resourceId: userRecord.uid,
          email: email,
          performedBy: 'init-admin-claims.js',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`   ✅ Log d'audit enregistré`);
      } catch (auditErr) {
        console.log(`   ⚠️  Log d'audit échoué (non bloquant): ${auditErr.message}`);
      }

    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ TERMINÉ!\n');
  console.log('⚠️  IMPORTANT: Les utilisateurs doivent se DÉCONNECTER puis se RECONNECTER');
  console.log('   pour que les nouveaux claims prennent effet.\n');
  console.log('💡 Conseil: Pour vérifier que ça fonctionne, allez sur sos-expat.com,');
  console.log('   déconnectez-vous, puis reconnectez-vous avec l\'email admin.\n');

  process.exit(0);
}

// Exécution
initAdminClaims().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

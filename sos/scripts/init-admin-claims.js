/**
 * Script pour initialiser les custom claims admin
 * Usage: node scripts/init-admin-claims.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialiser avec le service account
const serviceAccountPath = path.join(__dirname, '../firebase/service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Essayer avec les credentials par défaut (si déjà configuré)
  admin.initializeApp();
}

const ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'julienvalentine1@gmail.com'
];

async function initAdminClaims() {
  console.log('Initialisation des claims admin...\n');

  for (const email of ADMIN_EMAILS) {
    try {
      // Trouver l'utilisateur
      const userRecord = await admin.auth().getUserByEmail(email);

      // Définir les custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

      // Mettre à jour Firestore
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        role: 'admin',
        isAdmin: true,
        email: email,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`✅ ${email} - Claims admin définis (UID: ${userRecord.uid})`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  ${email} - Utilisateur non trouvé (pas encore inscrit)`);
      } else {
        console.error(`❌ ${email} - Erreur:`, error.message);
      }
    }
  }

  console.log('\n✅ Terminé! Les utilisateurs doivent se reconnecter pour appliquer les claims.');
  process.exit(0);
}

initAdminClaims();

/**
 * Script pour définir un utilisateur comme admin
 * Utilise le service account Firebase via GOOGLE_APPLICATION_CREDENTIALS
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// UID fourni par l'utilisateur
const UID = 'WfzTMSVKWzeJciWkvKtipemp2g82';
const EMAIL = 'williamsjullin@gmail.com';

async function setAdmin() {
  try {
    // Essayer d'initialiser avec le fichier service account s'il existe
    let app;
    const fs = require('fs');
    const path = require('path');

    // Chercher un service account dans le dossier functions
    const saPath = path.join(__dirname, 'service-account.json');
    const saPathAlt = path.join(__dirname, 'serviceAccountKey.json');

    if (fs.existsSync(saPath)) {
      const sa = require(saPath);
      app = initializeApp({ credential: cert(sa), projectId: 'outils-sos-expat' });
    } else if (fs.existsSync(saPathAlt)) {
      const sa = require(saPathAlt);
      app = initializeApp({ credential: cert(sa), projectId: 'outils-sos-expat' });
    } else {
      // Fallback: juste Firestore sans Auth (on ne pourra pas set les claims)
      console.log('⚠️  Pas de service account trouvé - création document Firestore seulement');
      app = initializeApp({ projectId: 'outils-sos-expat' });
    }

    const db = getFirestore(app);

    // Créer le document utilisateur dans Firestore
    await db.collection('users').doc(UID).set({
      email: EMAIL,
      displayName: 'Williams Jullin',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ Document Firestore créé avec role=admin');
    console.log('   UID:', UID);
    console.log('   Email:', EMAIL);

    // Essayer de set les custom claims si on a accès à Auth
    try {
      const auth = getAuth(app);
      await auth.setCustomUserClaims(UID, { role: 'admin' });
      console.log('✅ Custom claims définis: role=admin');
    } catch (e) {
      console.log('⚠️  Custom claims non définis (pas de service account)');
      console.log('   L\'utilisateur pourra quand même accéder à l\'admin via Firestore');
    }

    console.log('\n🎉 Terminé! Connecte-toi sur http://localhost:5173/login');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  process.exit(0);
}

setAdmin();

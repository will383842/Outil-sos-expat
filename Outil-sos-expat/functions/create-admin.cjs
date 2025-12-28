/**
 * Script pour créer un utilisateur admin Firebase
 * Usage: node scripts/create-admin.js
 */

const admin = require('firebase-admin');

// Initialiser avec les credentials par défaut (via gcloud/firebase login)
admin.initializeApp({
  projectId: 'outils-sos-expat',
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  const email = 'williamsjullin@gmail.com';
  const password = 'MJullin2006/*%';

  try {
    // Vérifier si l'utilisateur existe déjà
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log('Utilisateur existant trouvé:', user.uid);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        // Créer l'utilisateur
        user = await auth.createUser({
          email,
          password,
          emailVerified: true,
          displayName: 'Williams Jullin',
        });
        console.log('Utilisateur créé:', user.uid);
      } else {
        throw e;
      }
    }

    // Définir les custom claims pour admin
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    console.log('Custom claims définis: role=admin');

    // Créer/mettre à jour le document Firestore
    await db.collection('users').doc(user.uid).set({
      email,
      displayName: 'Williams Jullin',
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('Document Firestore créé/mis à jour');

    console.log('\n✅ Admin créé avec succès!');
    console.log('Email:', email);
    console.log('UID:', user.uid);
    console.log('\nConnecte-toi sur: http://localhost:5173/login');

  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

createAdminUser();

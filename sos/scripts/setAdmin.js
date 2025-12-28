const admin = require('firebase-admin');

// Utiliser les credentials par défaut (Firebase CLI)
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const email = 'williamsjullin@gmail.com';

admin.auth().getUserByEmail(email)
  .then((user) => {
    console.log(`🔍 Utilisateur trouvé : ${user.uid}`);
    return admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      dev: true,
      role: 'admin'
    });
  })
  .then(() => {
    console.log(`✅ Custom claims ajoutés pour ${email}`);
    console.log('⚠️  Déconnectez-vous et reconnectez-vous pour que les claims prennent effet.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
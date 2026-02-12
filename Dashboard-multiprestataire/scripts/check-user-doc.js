/**
 * Script pour vérifier le document utilisateur dans Firestore
 * Usage: node scripts/check-user-doc.js <userId>
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: node scripts/check-user-doc.js <userId>');
  process.exit(1);
}

async function checkUserDoc() {
  try {
    console.log(`🔍 Vérification du document: users/${userId}\n`);

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.error('❌ Le document utilisateur n\'existe PAS dans Firestore !');
      console.log('\n💡 Solution: Créez le document avec:');
      console.log(`   - role: "agency_manager" ou "admin"`);
      console.log(`   - linkedProviderIds: ["id1", "id2", ...]`);
      process.exit(1);
    }

    const data = userDoc.data();
    console.log('✅ Document trouvé !\n');
    console.log('📋 Contenu du document:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n🔍 Vérification des champs requis:');

    // Vérifier le rôle
    if (!data.role) {
      console.error('❌ Champ "role" manquant !');
    } else if (data.role !== 'agency_manager' && data.role !== 'admin') {
      console.error(`❌ Rôle invalide: "${data.role}" (doit être "agency_manager" ou "admin")`);
    } else {
      console.log(`✅ role: "${data.role}"`);
    }

    // Vérifier linkedProviderIds
    if (!data.linkedProviderIds) {
      console.error('❌ Champ "linkedProviderIds" manquant !');
    } else if (!Array.isArray(data.linkedProviderIds)) {
      console.error(`❌ "linkedProviderIds" n'est pas un array !`);
    } else if (data.linkedProviderIds.length === 0) {
      console.warn('⚠️  "linkedProviderIds" est vide (array vide)');
    } else {
      console.log(`✅ linkedProviderIds: ${data.linkedProviderIds.length} provider(s)`);
      console.log(`   IDs: ${data.linkedProviderIds.join(', ')}`);
    }

    console.log('\n✅ Vérification terminée !');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkUserDoc();

/**
 * Script de diagnostic pour vérifier si les profils AAA ont des descriptions/bio
 *
 * Usage:
 *   cd sos/firebase/functions
 *   node scripts/checkAaaDescriptions.js
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307'
  });
}

const db = admin.firestore();

async function checkDescriptions() {
  console.log('\n🔍 Vérification des descriptions/bio des profils AAA...\n');
  console.log('='.repeat(60));

  // Récupérer quelques profils AAA
  const snapshot = await db.collection('sos_profiles')
    .where('isAAA', '==', true)
    .limit(10)
    .get();

  console.log(`\nProfils AAA trouvés: ${snapshot.size}\n`);

  let withBio = 0;
  let withDescription = 0;
  let withNeither = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hasBio = !!data.bio;
    const hasDescription = !!data.description;

    console.log(`📋 ${doc.id}`);
    console.log(`   Nom: ${data.fullName || data.name || 'N/A'}`);
    console.log(`   bio: ${hasBio ? (typeof data.bio === 'object' ? JSON.stringify(data.bio).substring(0, 100) + '...' : data.bio?.substring(0, 100) + '...') : '❌ ABSENT'}`);
    console.log(`   description: ${hasDescription ? (typeof data.description === 'object' ? JSON.stringify(data.description).substring(0, 100) + '...' : data.description?.substring(0, 100) + '...') : '❌ ABSENT'}`);
    console.log('');

    if (hasBio) withBio++;
    if (hasDescription) withDescription++;
    if (!hasBio && !hasDescription) withNeither++;
  }

  console.log('='.repeat(60));
  console.log('\n📊 Résumé:');
  console.log(`   Profils avec bio: ${withBio}/${snapshot.size}`);
  console.log(`   Profils avec description: ${withDescription}/${snapshot.size}`);
  console.log(`   Profils sans aucun des deux: ${withNeither}/${snapshot.size}`);

  if (withNeither > 0) {
    console.log('\n⚠️  PROBLÈME DÉTECTÉ: Certains profils n\'ont ni bio ni description!');
    console.log('   Solution: Exécuter une migration pour ajouter les descriptions manquantes.');
  }

  process.exit(0);
}

checkDescriptions().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

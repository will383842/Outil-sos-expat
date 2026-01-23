const admin = require('firebase-admin');
const serviceAccount = require('../security-audit/backups/firebase-adminsdk-NEW-.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  const julienId = 'DfDbWASBaeaVEZrqg6Wlcd3zpYX2';
  const europeAccountId = 'aaa_multi_europe_1769080742343';
  const asieAccountId = 'aaa_multi_asie_oceanie_1769080742882';

  // 1. Retirer de Europe
  const europeDoc = await db.collection('users').doc(europeAccountId).get();
  const europeData = europeDoc.data();
  const europeLinkedIds = (europeData.linkedProviderIds || []).filter(id => id !== julienId);

  await db.collection('users').doc(europeAccountId).update({
    linkedProviderIds: europeLinkedIds,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✓ Julien Valentine retiré du compte Europe');

  // 2. Ajouter à Asie & Océanie
  await db.collection('users').doc(asieAccountId).update({
    linkedProviderIds: admin.firestore.FieldValue.arrayUnion(julienId),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✓ Julien Valentine ajouté au compte Asie & Océanie');

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

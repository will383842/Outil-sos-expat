const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: 'sos-urgently-ac307.firebasestorage.app' });

const db = admin.firestore();
const bucket = admin.storage().bucket();

const BASE = path.join(__dirname, '../../CP blogguers et admingroup');

async function uploadPdf(localPath, storagePath) {
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType: 'application/pdf', cacheControl: 'public, max-age=86400' },
  });
  await bucket.file(storagePath).makePublic();
  return `https://storage.googleapis.com/sos-urgently-ac307.firebasestorage.app/${storagePath}`;
}

async function run() {
  // CP4 - Blogger
  const cp4Path = path.join(BASE, 'SOS-Expat_CP4_Blogueurs_FR.pdf');
  console.log('[CP4] Uploading PDF...');
  const cp4Url = await uploadPdf(cp4Path, 'blogger/releases/cp4/pdf/fr.pdf');
  console.log('[CP4] PDF URL:', cp4Url);
  await db.collection('blogger_releases').doc('cp4').update({ 'pdfUrl.fr': cp4Url });
  console.log('[CP4] Firestore updated');

  // CP5 - GroupAdmin
  const cp5Path = path.join(BASE, 'SOS-Expat_CP5_Communautes_FR.pdf');
  console.log('[CP5] Uploading PDF...');
  const cp5Url = await uploadPdf(cp5Path, 'group_admin/releases/cp5/pdf/fr.pdf');
  console.log('[CP5] PDF URL:', cp5Url);
  await db.collection('group_admin_releases').doc('cp5').update({ 'pdfUrl.fr': cp5Url });
  console.log('[CP5] Firestore updated');

  console.log('\n✅ Done! PDFs uploadés et Firestore mis à jour.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

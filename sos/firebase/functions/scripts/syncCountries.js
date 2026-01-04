/**
 * Sync countries collection from country_fiscal_configs
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

const firebaseCredPath = path.join(
  process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);
if (fs.existsSync(firebaseCredPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = firebaseCredPath;
}

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

async function syncCountries() {
  console.log('🚀 Synchronisation countries depuis country_fiscal_configs...\n');

  // Récupérer tous les pays de country_fiscal_configs
  const configsSnap = await db.collection('country_fiscal_configs').get();
  console.log('📊 country_fiscal_configs: ' + configsSnap.size + ' pays');

  // Récupérer les pays existants dans countries
  const countriesSnap = await db.collection('countries').get();
  const existingCodes = new Set();
  countriesSnap.forEach(doc => existingCodes.add(doc.id));
  console.log('📊 countries existants: ' + existingCodes.size + ' pays\n');

  // Ajouter les pays manquants
  const batch = db.batch();
  let added = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  configsSnap.forEach(doc => {
    const data = doc.data();
    const code = doc.id;

    if (!existingCodes.has(code)) {
      const countryName = data.countryName?.en || data.countryName || code;
      const docRef = db.collection('countries').doc(code);
      batch.set(docRef, {
        code: code,
        name: countryName,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      added++;
      console.log('  + ' + code + ': ' + countryName);
    }
  });

  if (added > 0) {
    await batch.commit();
    console.log('\n✅ Ajouté ' + added + ' pays manquants');
  } else {
    console.log('✅ Tous les pays sont déjà présents');
  }

  // Vérifier le total
  const finalSnap = await db.collection('countries').get();
  console.log('\n📊 Total countries: ' + finalSnap.size + ' pays');

  process.exit(0);
}

syncCountries().catch(e => { console.error('❌ Erreur:', e); process.exit(1); });

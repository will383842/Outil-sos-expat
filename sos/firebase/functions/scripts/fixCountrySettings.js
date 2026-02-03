/**
 * Fix country_settings collection
 * This script:
 * 1. Checks how many documents are in country_settings
 * 2. Initializes ALL 195 countries with isActive: true if needed
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Firebase credentials
const homeDir = os.homedir();
const firebaseCredPath = path.join(
  process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);

if (fs.existsSync(firebaseCredPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = firebaseCredPath;
}

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

// All 195 countries (from countries.ts)
const ALL_COUNTRIES = [
  "GB", "FR", "DE", "ES", "RU", "CN", "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR", "BN", "BG", "BF", "BI",
  "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CY",
  "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI", "GA", "GM",
  "GE", "GH", "GR", "GD", "GT", "GN", "GW", "GY", "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE",
  "IL", "IT", "JM", "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR",
  "LY", "LI", "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MR", "MU", "MX", "FM", "MD", "MC",
  "MN", "ME", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK",
  "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RW", "KN", "LC", "VC", "WS", "SM",
  "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SK", "SI", "SB", "SO", "ZA", "SS", "LK", "SD", "SR", "SE",
  "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV", "UG", "UA", "AE",
  "US", "UY", "UZ", "VU", "VA", "VE", "VN", "YE", "ZM", "ZW"
];

async function checkAndFixCountrySettings() {
  console.log('🔍 Vérification de la collection country_settings...\n');

  // 1. Check current state
  const snapshot = await db.collection('country_settings').get();
  console.log(`📊 Documents actuels dans country_settings: ${snapshot.size}`);

  const activeCount = snapshot.docs.filter(d => d.data().isActive === true).length;
  const inactiveCount = snapshot.docs.filter(d => d.data().isActive === false).length;
  console.log(`   ✅ Actifs: ${activeCount}`);
  console.log(`   ❌ Inactifs: ${inactiveCount}`);
  console.log(`   ❓ Sans statut: ${snapshot.size - activeCount - inactiveCount}\n`);

  // 2. Check which countries are missing
  const existingCodes = new Set(snapshot.docs.map(d => d.id.toUpperCase()));
  const missingCodes = ALL_COUNTRIES.filter(code => !existingCodes.has(code));

  console.log(`📋 Pays manquants: ${missingCodes.length}`);
  if (missingCodes.length > 0 && missingCodes.length <= 20) {
    console.log(`   ${missingCodes.join(', ')}`);
  }

  // 3. Ask for confirmation to fix
  if (missingCodes.length === 0 && activeCount === ALL_COUNTRIES.length) {
    console.log('\n✅ Tout est correct! Tous les pays sont présents et actifs.');
    process.exit(0);
  }

  console.log('\n🔧 Correction en cours...');

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  let updatedCount = 0;

  // Add missing countries
  for (const code of missingCodes) {
    const docRef = db.collection('country_settings').doc(code.toLowerCase());
    batch.set(docRef, {
      code: code.toUpperCase(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      updatedBy: 'script-fix'
    });
    updatedCount++;
  }

  // Activate inactive countries
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.isActive !== true) {
      batch.update(docSnap.ref, {
        isActive: true,
        updatedAt: now,
        updatedBy: 'script-fix'
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\n✅ ${updatedCount} pays mis à jour/ajoutés avec isActive: true`);
  }

  // Verify final state
  const finalSnapshot = await db.collection('country_settings').get();
  const finalActiveCount = finalSnapshot.docs.filter(d => d.data().isActive === true).length;
  console.log(`\n📊 État final: ${finalSnapshot.size} documents, ${finalActiveCount} actifs`);

  process.exit(0);
}

checkAndFixCountrySettings().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

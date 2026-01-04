/**
 * List ALL countries in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

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

async function listAll() {
  console.log('🔍 Listing ALL countries in Firestore...\n');

  const snapshot = await db.collection('country_fiscal_configs').get();

  console.log(`📊 TOTAL: ${snapshot.size} countries\n`);

  const countries = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    countries.push({
      code: doc.id,
      name: data.countryName?.en || data.countryName || 'N/A',
      currency: data.currency || 'N/A'
    });
  });

  // Sort by code
  countries.sort((a, b) => a.code.localeCompare(b.code));

  // Group by region (first letter for simplicity)
  console.log('📋 All countries by code:\n');

  let currentLetter = '';
  for (const c of countries) {
    const letter = c.code[0];
    if (letter !== currentLetter) {
      currentLetter = letter;
      console.log(`\n--- ${letter} ---`);
    }
    console.log(`  ${c.code}: ${c.name} (${c.currency})`);
  }

  console.log(`\n\n✅ Total: ${countries.length} countries`);
  process.exit(0);
}

listAll().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

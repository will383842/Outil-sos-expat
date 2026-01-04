/**
 * Verify Country Fiscal Configs in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Set up credentials from Firebase CLI
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

async function verify() {
  console.log('🔍 Verifying Firestore data...\n');

  // Count countries
  const countriesSnap = await db.collection('country_fiscal_configs').get();
  console.log(`📊 Countries in Firestore: ${countriesSnap.size}`);

  // Show sample countries
  console.log('\n📍 Sample countries:');
  const samples = ['FR', 'US', 'DE', 'JP', 'BR', 'AU', 'EE', 'NG'];
  for (const code of samples) {
    const doc = await db.collection('country_fiscal_configs').doc(code).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`  ${code}: ${data.countryName?.en || data.countryName} - VAT: ${data.vat?.standardRate || 'N/A'}% - Currency: ${data.currency}`);
    }
  }

  // Count subdivisions
  const subdivisionsSnap = await db.collection('country_subdivisions').get();
  console.log(`\n📊 Subdivisions in Firestore: ${subdivisionsSnap.size}`);

  // Show sample USA states
  console.log('\n🇺🇸 Sample USA states:');
  const usStates = ['US_CA', 'US_NY', 'US_TX', 'US_FL', 'US_WA'];
  for (const id of usStates) {
    const doc = await db.collection('country_subdivisions').doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`  ${data.subdivisionCode}: ${data.subdivisionName?.en} - Tax: ${data.combinedTaxRate}% - Prof Services Exempt: ${data.professionalServicesExempt}`);
    }
  }

  // Show sample Canada provinces
  console.log('\n🇨🇦 Sample Canada provinces:');
  const caProvinces = ['CA_QC', 'CA_ON', 'CA_BC', 'CA_AB'];
  for (const id of caProvinces) {
    const doc = await db.collection('country_subdivisions').doc(id).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`  ${data.subdivisionCode}: ${data.subdivisionName?.en} - Tax: ${data.combinedTaxRate}% - Type: ${data.taxes?.map(t => t.taxType).join('+') || 'N/A'}`);
    }
  }

  console.log('\n✅ Verification complete!');
  process.exit(0);
}

verify().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

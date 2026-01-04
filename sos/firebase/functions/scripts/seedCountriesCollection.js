/**
 * Initialize Countries Collection for admin dashboard
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

// Main countries list
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'GR', name: 'Greece' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'EG', name: 'Egypt' },
  { code: 'MA', name: 'Morocco' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'SG', name: 'Singapore' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'NZ', name: 'New Zealand' },
];

async function seedCountries() {
  console.log('🚀 Seeding countries collection...\n');

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const country of COUNTRIES) {
    const docRef = db.collection('countries').doc(country.code);
    batch.set(docRef, {
      code: country.code,
      name: country.name,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
    console.log(`  ✅ ${country.code}: ${country.name}`);
  }

  await batch.commit();
  console.log(`\n✅ Seeded ${COUNTRIES.length} countries`);

  // Also create empty tax_declarations collection
  console.log('\n📍 Initializing tax_declarations collection...');
  await db.collection('tax_declarations').doc('_init').set({
    _description: 'Placeholder to initialize collection',
    createdAt: now,
  });
  console.log('  ✅ tax_declarations initialized');

  process.exit(0);
}

seedCountries().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

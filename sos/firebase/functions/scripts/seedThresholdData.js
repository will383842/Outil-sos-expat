/**
 * Initialize Threshold Tracking Data in Firestore
 *
 * Run with: node scripts/seedThresholdData.js
 */

const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Set up credentials
const homeDir = os.homedir();
const firebaseCredPath = path.join(
  process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);

if (fs.existsSync(firebaseCredPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = firebaseCredPath;
  console.log('Using Firebase CLI credentials');
}

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

// Threshold configurations (from types.ts)
const THRESHOLD_CONFIGS = [
  {
    countryCode: 'OSS_EU',
    name: 'OSS EU (One Stop Shop)',
    thresholdAmount: 10000,
    currency: 'EUR',
    periodType: 'CALENDAR_YEAR',
    consequence: 'TVA pays client obligatoire',
    b2cOnly: true,
    flag: '🇪🇺',
  },
  {
    countryCode: 'GB',
    name: 'Royaume-Uni',
    thresholdAmount: 0,
    currency: 'GBP',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement UK VAT des 1ere vente',
    b2cOnly: false,
    flag: '🇬🇧',
  },
  {
    countryCode: 'CH',
    name: 'Suisse',
    thresholdAmount: 100000,
    currency: 'CHF',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement TVA CH',
    b2cOnly: false,
    flag: '🇨🇭',
  },
  {
    countryCode: 'AU',
    name: 'Australie',
    thresholdAmount: 75000,
    currency: 'AUD',
    periodType: 'ROLLING_12M',
    consequence: 'Enregistrement GST',
    b2cOnly: false,
    flag: '🇦🇺',
  },
  {
    countryCode: 'JP',
    name: 'Japon',
    thresholdAmount: 10000000,
    currency: 'JPY',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement JCT',
    b2cOnly: false,
    flag: '🇯🇵',
  },
  {
    countryCode: 'SG',
    name: 'Singapour',
    thresholdAmount: 100000,
    currency: 'SGD',
    periodType: 'ROLLING_12M',
    consequence: 'OVR Registration',
    b2cOnly: false,
    flag: '🇸🇬',
  },
  {
    countryCode: 'IN',
    name: 'Inde',
    thresholdAmount: 2000000,
    currency: 'INR',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement GST',
    b2cOnly: false,
    flag: '🇮🇳',
  },
  {
    countryCode: 'CA',
    name: 'Canada',
    thresholdAmount: 30000,
    currency: 'CAD',
    periodType: 'ROLLING_12M',
    consequence: 'Enregistrement GST/HST',
    b2cOnly: false,
    flag: '🇨🇦',
  },
  {
    countryCode: 'KR',
    name: 'Coree du Sud',
    thresholdAmount: 0,
    currency: 'KRW',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement des 1ere vente',
    b2cOnly: false,
    flag: '🇰🇷',
  },
  {
    countryCode: 'MX',
    name: 'Mexique',
    thresholdAmount: 0,
    currency: 'MXN',
    periodType: 'CALENDAR_YEAR',
    consequence: 'IVA des 1ere vente B2C',
    b2cOnly: true,
    flag: '🇲🇽',
  },
  // Add more countries for completeness
  {
    countryCode: 'US',
    name: 'Etats-Unis',
    thresholdAmount: 100000,
    currency: 'USD',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Sales Tax Nexus (varies by state)',
    b2cOnly: false,
    flag: '🇺🇸',
  },
  {
    countryCode: 'NZ',
    name: 'Nouvelle-Zelande',
    thresholdAmount: 60000,
    currency: 'NZD',
    periodType: 'ROLLING_12M',
    consequence: 'Enregistrement GST',
    b2cOnly: false,
    flag: '🇳🇿',
  },
  {
    countryCode: 'NO',
    name: 'Norvege',
    thresholdAmount: 50000,
    currency: 'NOK',
    periodType: 'CALENDAR_YEAR',
    consequence: 'Enregistrement VOEC',
    b2cOnly: true,
    flag: '🇳🇴',
  },
];

// Get current period based on periodType
function getCurrentPeriod(periodType) {
  const now = new Date();
  const year = now.getFullYear();

  if (periodType === 'CALENDAR_YEAR') {
    return `${year}`;
  } else if (periodType === 'ROLLING_12M') {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}_12M`;
  } else if (periodType === 'QUARTER') {
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
  return `${year}`;
}

async function seedThresholds() {
  console.log('🚀 Starting threshold tracking seed...\n');

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const config of THRESHOLD_CONFIGS) {
    const period = getCurrentPeriod(config.periodType);
    const docId = `${config.countryCode}_${period}`;

    const trackingData = {
      countryCode: config.countryCode,
      countryName: config.name,
      period: period,
      periodType: config.periodType,
      thresholdAmount: config.thresholdAmount,
      thresholdCurrency: config.currency,
      currentAmount: 0,
      currentAmountEUR: 0,
      transactionCount: 0,
      b2cCount: 0,
      b2bCount: 0,
      percentageUsed: 0,
      status: 'SAFE',
      isRegistered: false,
      alertsSent: {
        alert70: false,
        alert90: false,
        alert100: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    const docRef = db.collection('threshold_tracking').doc(docId);
    batch.set(docRef, trackingData, { merge: true });

    console.log(`  ✅ ${config.flag} ${config.countryCode}: ${config.name} (${period})`);
  }

  try {
    await batch.commit();
    console.log(`\n✅ Seeded ${THRESHOLD_CONFIGS.length} threshold trackings`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  // Also create an empty alerts collection document to initialize it
  console.log('\n📍 Creating threshold_alerts collection...');

  await db.collection('threshold_alerts').doc('_init').set({
    _description: 'Placeholder document to initialize collection',
    createdAt: now,
  });
  console.log('  ✅ threshold_alerts collection initialized');

  // Create tax_configs collection with EU VAT rates
  console.log('\n📍 Creating tax_configs collection with EU VAT rates...');

  const taxConfigs = [
    { countryCode: 'AT', standardRate: 20, reducedRate: 10, name: 'Austria' },
    { countryCode: 'BE', standardRate: 21, reducedRate: 6, name: 'Belgium' },
    { countryCode: 'BG', standardRate: 20, reducedRate: 9, name: 'Bulgaria' },
    { countryCode: 'HR', standardRate: 25, reducedRate: 13, name: 'Croatia' },
    { countryCode: 'CY', standardRate: 19, reducedRate: 5, name: 'Cyprus' },
    { countryCode: 'CZ', standardRate: 21, reducedRate: 15, name: 'Czech Republic' },
    { countryCode: 'DK', standardRate: 25, reducedRate: null, name: 'Denmark' },
    { countryCode: 'EE', standardRate: 22, reducedRate: 9, name: 'Estonia' },
    { countryCode: 'FI', standardRate: 24, reducedRate: 10, name: 'Finland' },
    { countryCode: 'FR', standardRate: 20, reducedRate: 5.5, name: 'France' },
    { countryCode: 'DE', standardRate: 19, reducedRate: 7, name: 'Germany' },
    { countryCode: 'GR', standardRate: 24, reducedRate: 13, name: 'Greece' },
    { countryCode: 'HU', standardRate: 27, reducedRate: 18, name: 'Hungary' },
    { countryCode: 'IE', standardRate: 23, reducedRate: 13.5, name: 'Ireland' },
    { countryCode: 'IT', standardRate: 22, reducedRate: 10, name: 'Italy' },
    { countryCode: 'LV', standardRate: 21, reducedRate: 12, name: 'Latvia' },
    { countryCode: 'LT', standardRate: 21, reducedRate: 9, name: 'Lithuania' },
    { countryCode: 'LU', standardRate: 17, reducedRate: 8, name: 'Luxembourg' },
    { countryCode: 'MT', standardRate: 18, reducedRate: 7, name: 'Malta' },
    { countryCode: 'NL', standardRate: 21, reducedRate: 9, name: 'Netherlands' },
    { countryCode: 'PL', standardRate: 23, reducedRate: 8, name: 'Poland' },
    { countryCode: 'PT', standardRate: 23, reducedRate: 13, name: 'Portugal' },
    { countryCode: 'RO', standardRate: 19, reducedRate: 9, name: 'Romania' },
    { countryCode: 'SK', standardRate: 20, reducedRate: 10, name: 'Slovakia' },
    { countryCode: 'SI', standardRate: 22, reducedRate: 9.5, name: 'Slovenia' },
    { countryCode: 'ES', standardRate: 21, reducedRate: 10, name: 'Spain' },
    { countryCode: 'SE', standardRate: 25, reducedRate: 12, name: 'Sweden' },
    // Non-EU
    { countryCode: 'GB', standardRate: 20, reducedRate: 5, name: 'United Kingdom' },
    { countryCode: 'CH', standardRate: 8.1, reducedRate: 2.6, name: 'Switzerland' },
    { countryCode: 'NO', standardRate: 25, reducedRate: 15, name: 'Norway' },
  ];

  const taxBatch = db.batch();
  for (const config of taxConfigs) {
    const docRef = db.collection('tax_configs').doc(config.countryCode);
    taxBatch.set(docRef, {
      ...config,
      isRegistered: config.countryCode === 'EE', // Estonia is our base
      registrationNumber: config.countryCode === 'EE' ? 'EE123456789' : null,
      threshold: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  await taxBatch.commit();
  console.log(`  ✅ Created ${taxConfigs.length} tax configs (EU VAT rates)`);

  console.log('\n============================================================');
  console.log('📊 SEED SUMMARY');
  console.log('============================================================');
  console.log(`threshold_tracking: ${THRESHOLD_CONFIGS.length} documents`);
  console.log(`threshold_alerts: 1 document (initialized)`);
  console.log(`tax_configs: ${taxConfigs.length} documents`);
  console.log('============================================================');
  console.log('\n✅ All threshold data seeded successfully!');

  process.exit(0);
}

seedThresholds().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

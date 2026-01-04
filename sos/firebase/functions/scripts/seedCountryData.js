/**
 * Local Script to Seed Country Fiscal Configs
 *
 * Run with: node scripts/seedCountryData.js
 *
 * This script runs locally and seeds Firestore directly.
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

// Check if Firebase CLI credentials exist
if (fs.existsSync(firebaseCredPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = firebaseCredPath;
  console.log('✅ Using Firebase CLI credentials');
} else {
  console.log('⚠️ Firebase CLI credentials not found, using ADC');
}

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

// Import data from compiled JS files
const { ALL_COUNTRIES } = require('../lib/seeds/seedCountryConfigs');
const { ALL_SUBDIVISIONS } = require('../lib/seeds/seedSubdivisionConfigs');

async function seedData() {
  console.log('🚀 Starting country configs seed...');
  console.log(`📊 Countries to seed: ${ALL_COUNTRIES.length}`);
  console.log(`📊 Subdivisions to seed: ${ALL_SUBDIVISIONS.length}`);

  const results = {
    countries: { success: 0, failed: 0 },
    subdivisions: { success: 0, failed: 0 }
  };

  // =========================================================================
  // SEED COUNTRIES
  // =========================================================================
  console.log('\n📍 Seeding countries...');

  // Firestore batch limit is 500 operations
  const countryBatches = [];
  let currentBatch = db.batch();
  let operationsInBatch = 0;

  for (const country of ALL_COUNTRIES) {
    try {
      const docRef = db.collection('country_fiscal_configs').doc(country.countryCode);
      currentBatch.set(docRef, {
        ...country,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      operationsInBatch++;
      results.countries.success++;

      if (operationsInBatch >= 450) {
        countryBatches.push(currentBatch);
        currentBatch = db.batch();
        operationsInBatch = 0;
        console.log(`  Batch ${countryBatches.length} prepared (${results.countries.success} countries so far)`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to prepare ${country.countryCode}:`, error.message);
      results.countries.failed++;
    }
  }

  // Add remaining batch
  if (operationsInBatch > 0) {
    countryBatches.push(currentBatch);
  }

  // Commit all country batches
  for (let i = 0; i < countryBatches.length; i++) {
    try {
      await countryBatches[i].commit();
      console.log(`  ✅ Country batch ${i + 1}/${countryBatches.length} committed`);
    } catch (error) {
      console.error(`  ❌ Country batch ${i + 1} failed:`, error.message);
    }
  }

  console.log(`✅ Countries seeded: ${results.countries.success} success, ${results.countries.failed} failed`);

  // =========================================================================
  // SEED SUBDIVISIONS
  // =========================================================================
  console.log('\n📍 Seeding subdivisions (USA states + Canada provinces)...');

  const subdivisionBatch = db.batch();

  for (const subdivision of ALL_SUBDIVISIONS) {
    try {
      const docRef = db.collection('country_subdivisions').doc(subdivision.id);
      subdivisionBatch.set(docRef, {
        ...subdivision,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      results.subdivisions.success++;
    } catch (error) {
      console.error(`  ❌ Failed to prepare ${subdivision.id}:`, error.message);
      results.subdivisions.failed++;
    }
  }

  try {
    await subdivisionBatch.commit();
    console.log(`✅ Subdivisions seeded: ${results.subdivisions.success} success, ${results.subdivisions.failed} failed`);
  } catch (error) {
    console.error('❌ Subdivision batch failed:', error.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`Countries: ${results.countries.success} / ${ALL_COUNTRIES.length}`);
  console.log(`Subdivisions: ${results.subdivisions.success} / ${ALL_SUBDIVISIONS.length}`);
  console.log('='.repeat(60));

  console.log('\n✅ Seed completed!');
  process.exit(0);
}

// Run the seed
seedData().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});

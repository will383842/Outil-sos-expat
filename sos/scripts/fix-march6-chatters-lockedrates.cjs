/**
 * Fix lockedRates for chatters registered since March 6, 2026
 * Sets commissionClientCallAmount to 1000 ($10) for ALL call types
 *
 * Usage:
 *   node scripts/fix-march6-chatters-lockedrates.cjs              # Dry-run (audit only)
 *   node scripts/fix-march6-chatters-lockedrates.cjs --fix        # Apply changes
 */

const admin = require('firebase-admin');
const path = require('path');

// Auth via Firebase CLI credentials
const credPath = path.join(
  process.env.APPDATA || process.env.HOME,
  'firebase',
  'williamsjullin_gmail_com_application_default_credentials.json'
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const FIX_MODE = process.argv.includes('--fix');

// March 6, 2026 00:00:00 UTC
const SINCE_DATE = new Date('2026-03-06T00:00:00Z');

// New rate: $10/call = 1000 cents for ALL call types
const NEW_LOCKED_RATES = {
  commissionClientCallAmount: 1000,        // $10 generic
  commissionClientCallAmountLawyer: 1000,  // $10 lawyer
  commissionClientCallAmountExpat: 1000,   // $10 expat
};

async function main() {
  console.log(`\n=== Fix lockedRates for chatters registered since ${SINCE_DATE.toISOString()} ===`);
  console.log(`Mode: ${FIX_MODE ? 'FIX (will modify Firestore)' : 'DRY-RUN (read only)'}\n`);

  const sinceTimestamp = admin.firestore.Timestamp.fromDate(SINCE_DATE);

  // Query chatters registered since March 6
  const chattersSnap = await db
    .collection('chatters')
    .where('createdAt', '>=', sinceTimestamp)
    .get();

  console.log(`Found ${chattersSnap.size} chatters registered since ${SINCE_DATE.toDateString()}\n`);

  if (chattersSnap.empty) {
    console.log('No chatters to update.');
    process.exit(0);
  }

  let updated = 0;
  let skipped = 0;
  let alreadyCorrect = 0;

  for (const doc of chattersSnap.docs) {
    const data = doc.data();
    const name = data.displayName || data.firstName || doc.id;
    const currentRates = data.lockedRates || {};
    const currentClient = currentRates.commissionClientCallAmount;
    const currentLawyer = currentRates.commissionClientCallAmountLawyer;
    const currentExpat = currentRates.commissionClientCallAmountExpat;
    const registeredAt = data.createdAt?.toDate?.()?.toISOString?.() || 'unknown';

    // Check if already at $10
    if (
      currentClient === 1000 &&
      currentLawyer === 1000 &&
      currentExpat === 1000
    ) {
      console.log(`  [OK] ${name} (${doc.id}) - already $10/call`);
      alreadyCorrect++;
      continue;
    }

    console.log(`  [UPDATE] ${name} (${doc.id})`);
    console.log(`           Registered: ${registeredAt}`);
    console.log(`           Current: client=${currentClient ?? 'none'}, lawyer=${currentLawyer ?? 'none'}, expat=${currentExpat ?? 'none'}`);
    console.log(`           New:     client=1000, lawyer=1000, expat=1000 ($10/call)`);

    if (FIX_MODE) {
      // Merge new rates into existing lockedRates (preserve other fields)
      const mergedRates = { ...currentRates, ...NEW_LOCKED_RATES };

      await db.collection('chatters').doc(doc.id).update({
        lockedRates: mergedRates,
        // Also set plan metadata if not present
        ...(data.commissionPlanId ? {} : {
          commissionPlanName: 'Correction manuelle - $10/appel',
          rateLockDate: new Date().toISOString(),
        }),
      });
      console.log(`           -> UPDATED in Firestore`);
      updated++;
    } else {
      console.log(`           -> Would update (dry-run)`);
      updated++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total chatters found: ${chattersSnap.size}`);
  console.log(`Already correct ($10): ${alreadyCorrect}`);
  console.log(`${FIX_MODE ? 'Updated' : 'Would update'}: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  if (!FIX_MODE && updated > 0) {
    console.log(`\nRun with --fix to apply changes:`);
    console.log(`  node scripts/fix-march6-chatters-lockedrates.cjs --fix`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

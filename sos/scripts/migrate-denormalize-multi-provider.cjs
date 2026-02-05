/**
 * Migration script: Denormalize linkedProviderIds + shareBusyStatus
 *
 * Reads all user docs with linkedProviderIds.length > 0 (account owners),
 * then writes linkedProviderIds + shareBusyStatus to each provider's
 * users/{providerId} and sos_profiles/{providerId} docs.
 *
 * Usage:
 *   node scripts/migrate-denormalize-multi-provider.cjs
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path
 *   - Or run from an environment with default Firebase credentials
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function migrate() {
  console.log('🔄 Starting denormalization migration...\n');

  // 1. Find all account owners with linked providers
  const usersSnap = await db.collection('users').get();

  let accountsProcessed = 0;
  let providersUpdated = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const linkedProviderIds = data.linkedProviderIds || [];

    if (linkedProviderIds.length === 0) continue;

    const shareBusyStatus = data.shareBusyStatus === true;
    const accountId = userDoc.id;
    const displayName = data.displayName || data.email || accountId;

    console.log(`\n📋 Account: ${displayName} (${accountId})`);
    console.log(`   linkedProviderIds: [${linkedProviderIds.join(', ')}]`);
    console.log(`   shareBusyStatus: ${shareBusyStatus}`);

    accountsProcessed++;

    // 2. Write config to each provider's own docs
    for (const pid of linkedProviderIds) {
      // Skip if the provider IS the account owner (already has the data)
      if (pid === accountId) {
        console.log(`   ⏩ Skipping ${pid} (is account owner)`);
        continue;
      }

      const denormData = {
        linkedProviderIds,
        shareBusyStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        // Update users/{providerId}
        const userRef = db.collection('users').doc(pid);
        const userExists = (await userRef.get()).exists;
        if (userExists) {
          await userRef.update(denormData);
          console.log(`   ✅ users/${pid} updated`);
        } else {
          console.log(`   ⚠️ users/${pid} does not exist`);
        }

        // Update sos_profiles/{providerId}
        const profileRef = db.collection('sos_profiles').doc(pid);
        const profileExists = (await profileRef.get()).exists;
        if (profileExists) {
          await profileRef.update(denormData);
          console.log(`   ✅ sos_profiles/${pid} updated`);
        } else {
          console.log(`   ⚠️ sos_profiles/${pid} does not exist`);
        }

        providersUpdated++;
      } catch (err) {
        console.error(`   ❌ Error updating ${pid}:`, err.message);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!');
  console.log(`   Accounts processed: ${accountsProcessed}`);
  console.log(`   Providers updated: ${providersUpdated}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(60));
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

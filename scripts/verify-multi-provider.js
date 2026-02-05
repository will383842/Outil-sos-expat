/**
 * Verify Multi-Provider Accounts
 *
 * This script queries Firestore to find all multi-provider accounts
 * (users with linkedProviderIds) and prints detailed information about
 * each account and its linked providers.
 *
 * Usage: node scripts/verify-multi-provider.js
 *
 * Requires: Firebase Admin SDK with Application Default Credentials
 *   - Run `gcloud auth application-default login` first, or
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env variable
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

const db = admin.firestore();

async function main() {
  console.log('\n============================================================');
  console.log('  MULTI-PROVIDER ACCOUNT VERIFICATION');
  console.log('============================================================\n');

  // ---------------------------------------------------------------
  // 1. Query all users that have linkedProviderIds with >= 1 element
  // ---------------------------------------------------------------
  console.log('Querying users collection for multi-provider accounts...\n');

  const usersSnapshot = await db
    .collection('users')
    .where('linkedProviderIds', '!=', [])
    .get();

  // Filter to only documents where linkedProviderIds is a non-empty array
  const multiProviderDocs = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    const linkedIds = data.linkedProviderIds;
    if (Array.isArray(linkedIds) && linkedIds.length > 0) {
      multiProviderDocs.push({ id: doc.id, data });
    }
  });

  if (multiProviderDocs.length === 0) {
    console.log('No multi-provider accounts found.');
    process.exit(0);
  }

  console.log(`Found ${multiProviderDocs.length} multi-provider account(s).\n`);

  // ---------------------------------------------------------------
  // 2. Collect all unique linked provider IDs to batch-fetch profiles
  // ---------------------------------------------------------------
  const allProviderIds = new Set();
  for (const { data } of multiProviderDocs) {
    for (const pid of data.linkedProviderIds) {
      allProviderIds.add(pid);
    }
  }

  // Fetch all linked provider profiles from sos_profiles in batches of 10
  // (Firestore 'in' queries support max 10 values per query)
  const providerProfiles = new Map();
  const providerUserDocs = new Map();
  const providerIdArray = Array.from(allProviderIds);

  for (let i = 0; i < providerIdArray.length; i += 10) {
    const batch = providerIdArray.slice(i, i + 10);

    // Fetch sos_profiles docs
    const profilePromises = batch.map((pid) =>
      db.collection('sos_profiles').doc(pid).get()
    );
    // Fetch users docs for each provider (to check if provider has its own multi-provider fields)
    const userPromises = batch.map((pid) =>
      db.collection('users').doc(pid).get()
    );

    const [profileResults, userResults] = await Promise.all([
      Promise.all(profilePromises),
      Promise.all(userPromises),
    ]);

    for (const snap of profileResults) {
      if (snap.exists) {
        providerProfiles.set(snap.id, snap.data());
      }
    }
    for (const snap of userResults) {
      if (snap.exists) {
        providerUserDocs.set(snap.id, snap.data());
      }
    }
  }

  // ---------------------------------------------------------------
  // 3. Print detailed info for each multi-provider account
  // ---------------------------------------------------------------
  for (const { id: accountId, data: accountData } of multiProviderDocs) {
    const linkedIds = accountData.linkedProviderIds;

    console.log('------------------------------------------------------------');
    console.log(`ACCOUNT OWNER: ${accountId}`);
    console.log('------------------------------------------------------------');
    console.log(`  linkedProviderIds : [${linkedIds.join(', ')}]`);
    console.log(`  shareBusyStatus   : ${accountData.shareBusyStatus !== undefined ? accountData.shareBusyStatus : '(not set)'}`);
    console.log(`  isMultiProvider   : ${accountData.isMultiProvider !== undefined ? accountData.isMultiProvider : '(not set)'}`);
    console.log('');

    // -----------------------------------------------------------------
    // 4. For each linked provider, print profile and cross-check fields
    // -----------------------------------------------------------------
    for (const providerId of linkedIds) {
      const profile = providerProfiles.get(providerId);
      const providerUser = providerUserDocs.get(providerId);

      console.log(`  LINKED PROVIDER: ${providerId}`);

      if (profile) {
        const displayName =
          profile.displayName ||
          `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
          '(no name)';
        console.log(`    Display Name     : ${displayName}`);
        console.log(`    availability     : ${profile.availability !== undefined ? profile.availability : '(not set)'}`);
        console.log(`    busyBySibling    : ${profile.busyBySibling !== undefined ? profile.busyBySibling : '(not set)'}`);
      } else {
        console.log(`    [!] No sos_profiles document found for this provider`);
      }

      // Check provider's OWN user document for multi-provider fields
      if (providerUser) {
        const hasLinkedProviderIds =
          providerUser.linkedProviderIds !== undefined &&
          Array.isArray(providerUser.linkedProviderIds) &&
          providerUser.linkedProviderIds.length > 0;
        const hasShareBusyStatus = providerUser.shareBusyStatus !== undefined;

        console.log(`    --- Provider's OWN user doc ---`);
        console.log(`    linkedProviderIds exists : ${hasLinkedProviderIds}${hasLinkedProviderIds ? ` (value: [${providerUser.linkedProviderIds.join(', ')}])` : ''}`);
        console.log(`    shareBusyStatus exists   : ${hasShareBusyStatus}${hasShareBusyStatus ? ` (value: ${providerUser.shareBusyStatus})` : ''}`);
      } else {
        console.log(`    [!] No users document found for this provider`);
      }

      console.log('');
    }

    console.log('');
  }

  // ---------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------
  console.log('============================================================');
  console.log('  SUMMARY');
  console.log('============================================================');
  console.log(`  Total multi-provider accounts : ${multiProviderDocs.length}`);
  console.log(`  Total linked providers         : ${allProviderIds.size}`);
  console.log('============================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error running verification script:', err);
  process.exit(1);
});

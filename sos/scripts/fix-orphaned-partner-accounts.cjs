/**
 * fix-orphaned-partner-accounts.cjs
 *
 * Identifies and fixes partner accounts that were created in Firebase Auth
 * and users/{uid} but lack the corresponding profile document
 * (chatters/{uid}, influencers/{uid}, bloggers/{uid}, group_admins/{uid}).
 *
 * This can happen when:
 * - The registration Cloud Function (registerChatter/etc.) fails with 503/CORS
 * - The auth user is created but the profile doc is never written
 *
 * Options:
 *   --dry-run     (default) List orphans without modifying anything
 *   --delete      Delete orphaned auth users + users docs (users can re-register)
 *   --fix-claims  Re-sync custom claims for all partner users (fix syncRoleClaims bug)
 *
 * Usage:
 *   node scripts/fix-orphaned-partner-accounts.cjs --dry-run
 *   node scripts/fix-orphaned-partner-accounts.cjs --delete
 *   node scripts/fix-orphaned-partner-accounts.cjs --fix-claims
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();
const auth = admin.auth();

const PARTNER_ROLES = ['chatter', 'influencer', 'blogger', 'groupAdmin'];

const ROLE_TO_COLLECTION = {
  chatter: 'chatters',
  influencer: 'influencers',
  blogger: 'bloggers',
  groupAdmin: 'group_admins',
};

async function findOrphans() {
  console.log('🔍 Searching for orphaned partner accounts...\n');

  const orphans = [];
  const validAccounts = [];

  for (const role of PARTNER_ROLES) {
    const collection = ROLE_TO_COLLECTION[role];
    console.log(`--- Checking role: ${role} (collection: ${collection}) ---`);

    const usersSnap = await db.collection('users')
      .where('role', '==', role)
      .get();

    console.log(`  Found ${usersSnap.size} users with role="${role}"`);

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const profileSnap = await db.collection(collection).doc(userDoc.id).get();

      if (!profileSnap.exists) {
        orphans.push({
          uid: userDoc.id,
          email: userData.email || '(no email)',
          role,
          collection,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || 'unknown',
          hasAuthUser: false, // Will check below
        });
        console.log(`  ❌ ORPHAN: ${userDoc.id} (${userData.email}) — no ${collection}/${userDoc.id} doc`);
      } else {
        validAccounts.push({ uid: userDoc.id, role });
      }
    }
  }

  // Check if orphans have Firebase Auth accounts
  for (const orphan of orphans) {
    try {
      await auth.getUser(orphan.uid);
      orphan.hasAuthUser = true;
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        orphan.hasAuthUser = false;
      } else {
        console.error(`  ⚠️ Error checking auth for ${orphan.uid}:`, e.message);
      }
    }
  }

  return { orphans, validAccounts };
}

async function deleteOrphans(orphans) {
  console.log(`\n🗑️ Deleting ${orphans.length} orphaned accounts...\n`);

  for (const orphan of orphans) {
    try {
      // Delete Firebase Auth user
      if (orphan.hasAuthUser) {
        await auth.deleteUser(orphan.uid);
        console.log(`  ✅ Deleted auth user: ${orphan.uid} (${orphan.email})`);
      }

      // Delete users/{uid} document
      await db.collection('users').doc(orphan.uid).delete();
      console.log(`  ✅ Deleted users/${orphan.uid}`);
    } catch (e) {
      console.error(`  ❌ Error deleting ${orphan.uid}:`, e.message);
    }
  }
}

async function fixClaims(validAccounts) {
  console.log(`\n🔧 Fixing custom claims for ${validAccounts.length} valid partner accounts...\n`);

  for (const account of validAccounts) {
    try {
      await auth.setCustomUserClaims(account.uid, { role: account.role });
      console.log(`  ✅ Set claims role="${account.role}" for ${account.uid}`);
    } catch (e) {
      console.error(`  ❌ Error setting claims for ${account.uid}:`, e.message);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || '--dry-run';

  console.log('═══════════════════════════════════════════════');
  console.log('  Fix Orphaned Partner Accounts');
  console.log(`  Mode: ${mode}`);
  console.log('═══════════════════════════════════════════════\n');

  const { orphans, validAccounts } = await findOrphans();

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  SUMMARY`);
  console.log(`  Orphans found: ${orphans.length}`);
  console.log(`  Valid accounts: ${validAccounts.length}`);
  console.log(`═══════════════════════════════════════════════\n`);

  if (orphans.length > 0) {
    console.log('Orphaned accounts:');
    for (const o of orphans) {
      console.log(`  - ${o.uid} | ${o.email} | role=${o.role} | auth=${o.hasAuthUser ? 'YES' : 'NO'} | created=${o.createdAt}`);
    }
  }

  if (mode === '--delete' && orphans.length > 0) {
    await deleteOrphans(orphans);
    console.log('\n✅ Orphan cleanup complete. Users can now re-register.');
  } else if (mode === '--fix-claims') {
    await fixClaims(validAccounts);
    console.log('\n✅ Custom claims fix complete.');
  } else if (mode === '--dry-run') {
    console.log('\n💡 This was a dry run. Use --delete to remove orphans or --fix-claims to fix claims.');
  } else {
    console.log(`\n❓ Unknown mode: ${mode}. Use --dry-run, --delete, or --fix-claims.`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

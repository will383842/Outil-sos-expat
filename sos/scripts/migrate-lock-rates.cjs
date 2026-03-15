/**
 * Migration Script: Lock commission rates for all existing users
 *
 * What this does:
 * 1. Creates a promotional plan "promo_launch_2026" with current production values
 * 2. Locks rates (lockedRates) for ALL existing users based on their role
 * 3. All affiliate roles (chatter, influencer, blogger, groupAdmin) get $10/$10
 * 4. Partners get default $5/$3 (individually overridable per partner)
 * 5. Minimum withdrawal = $30 for ALL roles
 *
 * Run: node scripts/migrate-lock-rates.cjs [--dry-run]
 */

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'sos-urgently-ac307',
});
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');
const NOW = new Date().toISOString();

// ============================================================================
// PROMOTIONAL PLAN (current production rates)
// ============================================================================

const PROMO_PLAN = {
  id: 'promo_launch_2026',
  name: 'Plan Lancement (taux actuels)',
  description: 'Taux promotionnels appliqués depuis le lancement. Tous les affiliés: $10 avocat, $10 expatrié. Créé lors de la migration du 15 mars 2026.',
  isActive: true,
  isDefault: false,
  startDate: admin.firestore.Timestamp.fromDate(new Date('2025-01-01')),
  endDate: null, // Active until manually stopped
  priority: 100,
  targetRoles: ['chatter', 'captainChatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat', 'partner'],
  version: 1,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  createdBy: 'migration_script',
  updatedBy: 'migration_script',
};

// ============================================================================
// LOCKED RATES PER ROLE
// All affiliate roles: $10 avocat, $10 expatrié (current prod values)
// ============================================================================

// Base rates for all affiliate roles (chatter, influencer, blogger, groupAdmin)
const AFFILIATE_BASE_RATES = {
  client_call_lawyer: 1000,          // $10 par appel client (avocat)
  client_call_expat: 1000,           // $10 par appel client (expatrié)
  provider_recruitment_lawyer: 500,  // $5 par appel prestataire recruté (avocat)
  provider_recruitment_expat: 300,   // $3 par appel prestataire recruté (expatrié)
  signup_bonus: 200,                 // $2 bonus inscription
};

const LOCKED_RATES_BY_ROLE = {
  chatter: {
    ...AFFILIATE_BASE_RATES,
    n1_call: 100,                    // $1 par appel recrue N1
    n2_call: 50,                     // $0.50 par appel recrue N2
    activation_bonus: 500,           // $5 bonus activation (après 2 appels recrue)
    recruit_bonus: 100,              // $1 bonus recrutement
    n1_recruit_bonus: 100,           // $1 bonus quand N1 recrute un N2
  },
  captainChatter: {
    ...AFFILIATE_BASE_RATES,
    n1_call: 100,
    n2_call: 50,
    activation_bonus: 500,
    recruit_bonus: 100,
    n1_recruit_bonus: 100,
    captain_call_bonus: 300,         // $3 par appel équipe capitaine
  },
  influencer: {
    ...AFFILIATE_BASE_RATES,
    client_discount_percent: 5,      // 5% remise client
  },
  blogger: {
    ...AFFILIATE_BASE_RATES,
    // Pas de remise client pour les blogueurs
  },
  groupAdmin: {
    ...AFFILIATE_BASE_RATES,
    n1_call: 100,
    n2_call: 50,
    activation_bonus: 500,
    recruit_bonus: 100,
    n1_recruit_bonus: 100,
    client_discount_amount: 500,     // $5 remise fixe client
  },
  client: {
    client_call_lawyer: 200,         // $2 (plan par défaut)
    client_call_expat: 100,          // $1 (plan par défaut)
    signup_bonus: 200,               // $2
  },
  lawyer: {
    client_call_lawyer: 200,         // $2 (plan par défaut)
    client_call_expat: 100,          // $1 (plan par défaut)
    signup_bonus: 200,               // $2
  },
  expat: {
    client_call_lawyer: 200,         // $2 (plan par défaut)
    client_call_expat: 100,          // $1 (plan par défaut)
    signup_bonus: 200,               // $2
  },
  partner: {
    // Taux par défaut partenaire — configurable individuellement par partenaire
    client_call_lawyer: 500,         // $5 (défaut global)
    client_call_expat: 300,          // $3 (défaut global)
  },
};

// ============================================================================
// MIGRATION
// ============================================================================

async function migrate() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  MIGRATION: Lock Commission Rates for Existing Users`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : '*** LIVE ***'}`);
  console.log(`  Date: ${NOW}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Create promotional plan
  console.log('--- Step 1: Create promotional plan ---');
  const planRef = db.collection('commission_plans').doc(PROMO_PLAN.id);
  const planDoc = await planRef.get();

  if (planDoc.exists) {
    console.log(`  Plan "${PROMO_PLAN.id}" already exists. Skipping creation.`);
  } else {
    if (!DRY_RUN) {
      await planRef.set(PROMO_PLAN);
    }
    console.log(`  ${DRY_RUN ? '[DRY] Would create' : 'Created'} plan "${PROMO_PLAN.id}"`);
  }

  // Step 2: Lock rates for all users
  console.log('\n--- Step 2: Lock rates for existing users ---');

  const rolesToProcess = ['chatter', 'influencer', 'blogger', 'groupAdmin', 'client', 'lawyer', 'expat', 'partner'];
  const stats = { total: 0, updated: 0, skipped: 0, errors: 0, byRole: {} };

  for (const role of rolesToProcess) {
    const usersSnap = await db.collection('users').where('role', '==', role).get();
    stats.byRole[role] = { total: usersSnap.size, updated: 0, skipped: 0 };

    console.log(`\n  Processing ${role}: ${usersSnap.size} users`);

    const baseRates = LOCKED_RATES_BY_ROLE[role];
    if (!baseRates) {
      console.log(`    No rates defined for role "${role}". Skipping.`);
      continue;
    }

    let batch = db.batch();
    let batchCount = 0;

    for (const userDoc of usersSnap.docs) {
      stats.total++;
      const userData = userDoc.data();

      // Skip if already has lockedRates
      if (userData.lockedRates && Object.keys(userData.lockedRates).length > 0) {
        console.log(`    SKIP ${userDoc.id} (${userData.email}) — already has lockedRates`);
        stats.skipped++;
        stats.byRole[role].skipped++;
        continue;
      }

      // For chatters, check if they're a captain
      let rates = baseRates;
      if (role === 'chatter' && userData.isCaptain) {
        rates = LOCKED_RATES_BY_ROLE.captainChatter;
        console.log(`    ${userDoc.id} is Captain — using captain rates`);
      }

      const updateData = {
        lockedRates: rates,
        commissionPlanId: PROMO_PLAN.id,
        commissionPlanName: PROMO_PLAN.name,
        rateLockDate: userData.createdAt || NOW,
        rateLockMigration: NOW,
      };

      if (!DRY_RUN) {
        batch.update(userDoc.ref, updateData);
        batchCount++;

        // Firestore batch limit is 500
        if (batchCount >= 450) {
          await batch.commit();
          console.log(`    Committed batch of ${batchCount}`);
          batch = db.batch();
          batchCount = 0;
        }
      }

      stats.updated++;
      stats.byRole[role].updated++;

      if (DRY_RUN) {
        console.log(`    [DRY] ${userDoc.id} (${userData.email || 'no-email'}) → ${Object.keys(rates).length} rates locked`);
      }
    }

    // Commit remaining batch
    if (!DRY_RUN && batchCount > 0) {
      await batch.commit();
      console.log(`    Committed final batch of ${batchCount}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('  MIGRATION SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total users: ${stats.total}`);
  console.log(`  Locked: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log('');
  console.log('  Par rôle:');
  for (const [role, data] of Object.entries(stats.byRole)) {
    console.log(`    ${role.padEnd(12)} ${String(data.total).padStart(3)} users, ${String(data.updated).padStart(3)} locked, ${String(data.skipped).padStart(3)} skipped`);
  }
  console.log(`\n  Taux affiliés: $10 avocat / $10 expatrié`);
  console.log(`  Retrait min: $30 pour tous`);
  console.log(`  Plan promo: ${PROMO_PLAN.id}`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE — écritures effectuées ***'}`);
  console.log('');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('MIGRATION ERROR:', err);
    process.exit(1);
  });

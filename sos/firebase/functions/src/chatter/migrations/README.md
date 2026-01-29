# Chatter System Migrations

This directory contains data migration scripts for the Chatter system.

## Available Migrations

### addRecruiterCommissionPaidField.ts

**Purpose:** Adds the `recruiterCommissionPaid` boolean field to all existing chatter documents.

**Background:**
There was a critical bug in the `onCallCompleted` trigger where recruiter commissions were checked using `totalClients === 1`. This condition would never work correctly because `totalClients` is incremented BEFORE the check happens. The solution is to use a dedicated flag `recruiterCommissionPaid` to track whether the recruiter commission has already been awarded.

**What it does:**
- Adds `recruiterCommissionPaid: boolean` field to all chatters
- Sets to `true` for chatters who were recruited AND already have 1+ clients (assumes commission was already paid)
- Sets to `false` for chatters who were recruited but have no clients yet (commission not paid)
- Sets to `false` for chatters who were not recruited (not applicable)

**When to run:**
BEFORE deploying the updated `onCallCompleted` trigger.

**How to run:**
```bash
cd sos/firebase/functions
npx ts-node src/chatter/migrations/addRecruiterCommissionPaidField.ts
```

**Safety:**
- Idempotent (can be run multiple times safely)
- Uses batched writes to handle large datasets
- Skips documents that already have the field
- No data deletion, only additions

## Migration Best Practices

1. **Always backup before migrating:** Take a Firestore export before running any migration
2. **Test in development first:** Run migrations on a dev/staging environment before production
3. **Review the script:** Always read and understand what a migration does before running it
4. **Check logs:** Review the migration output to ensure expected results
5. **Verify data:** Spot-check a few documents after migration to ensure correctness

### addReferralN2Fields.ts

**Purpose:** Adds the new 2-level referral system fields to all existing chatter documents.

**Background:**
Implementation of a comprehensive 2-level referral (parrainage) system with:
- Commission thresholds: $10 → $1, $50 → $4 (N1), $50 → $2 (N2)
- Monthly recurring 5% on active filleuls
- Tier bonuses: 5 filleuls → $25, 10 → $75, 25 → $200, 50 → $500
- Early Adopter (Pioneer): +50% lifetime bonus for first 100 per country
- Promotions/Hackathons with multipliers

**What it does:**
- Adds referral system fields to all chatters:
  - `parrainNiveau2Id`: Parrain's parrain ID (calculated from chain)
  - `isEarlyAdopter`, `earlyAdopterCountry`, `earlyAdopterDate`: Pioneer status
  - `qualifiedReferralsCount`: N1 filleuls at $50+ (calculated)
  - `referralsN2Count`: N2 filleuls count (calculated)
  - `referralEarnings`: Separate from totalEarned
  - `referralToClientRatio`: For anti-fraud
  - `threshold10Reached`, `threshold50Reached`: Prevent duplicate bonuses
  - `tierBonusesPaid`: Array of paid tier bonuses
- Creates `chatter_early_adopter_counters` collection with 100 slots per country

**When to run:**
BEFORE deploying the referral system triggers and callables.

**How to run:**
```bash
cd sos/firebase/functions
npx ts-node src/chatter/migrations/addReferralN2Fields.ts
```

**Safety:**
- Idempotent (can be run multiple times safely)
- Uses batched writes to handle large datasets
- Skips documents that already have the fields
- No data deletion, only additions
- Calculates N2 chain from existing recruitedBy relationships

---

## Related Code Changes

When running these migrations, ensure the following code changes are deployed:

### For addRecruiterCommissionPaidField:
1. **types.ts:** Added `recruiterCommissionPaid: boolean` field to `Chatter` interface
2. **onCallCompleted.ts:** Changed logic from `totalClients === 1` to `!recruiterCommissionPaid`
3. **registerChatter.ts:** Initialize `recruiterCommissionPaid: false` for new chatters
4. **getChatterDashboard.ts:** Include `recruiterCommissionPaid` in dashboard response

### For addReferralN2Fields:
1. **types.ts:** Added all referral system types and fields
2. **onChatterCreated.ts:** Calculate parrainNiveau2Id for new chatters
3. **onChatterEarningsUpdated.ts:** New trigger for threshold bonuses
4. **chatterReferralService.ts:** Core referral commission logic
5. **chatterPromotionService.ts:** Promotion multipliers
6. **chatterReferralFraudService.ts:** Anti-fraud detection
7. **monthlyRecurringCommissions.ts:** Scheduled 5% recurring
8. **Admin callables:** referral.ts and promotions.ts
9. **Frontend:** Referral pages, hooks, and components

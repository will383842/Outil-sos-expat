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

## Related Code Changes

When running these migrations, ensure the following code changes are deployed:

1. **types.ts:** Added `recruiterCommissionPaid: boolean` field to `Chatter` interface
2. **onCallCompleted.ts:** Changed logic from `totalClients === 1` to `!recruiterCommissionPaid`
3. **registerChatter.ts:** Initialize `recruiterCommissionPaid: false` for new chatters
4. **getChatterDashboard.ts:** Include `recruiterCommissionPaid` in dashboard response

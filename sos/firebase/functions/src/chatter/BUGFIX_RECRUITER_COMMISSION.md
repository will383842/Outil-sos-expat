# Bug Fix: Recruiter Commission Logic

## Problem Description

**File:** `sos/firebase/functions/src/chatter/triggers/onCallCompleted.ts`
**Line:** ~147

### The Bug
The trigger `onCallCompleted` was checking if a chatter's first client commission should trigger a recruiter commission using this condition:

```typescript
if (chatter.recruitedBy && chatter.totalClients === 1)
```

**Why it fails:**
1. When `createCommission()` is called for the client referral, it increments `totalClients` from 0 to 1
2. The chatter document is then re-read from Firestore (line 138-143)
3. At this point, `totalClients` is already 1, so the condition `=== 1` is true
4. **BUT** if multiple commissions arrive concurrently, this check can fire multiple times
5. More critically, the logic assumes `totalClients === 1` means "first commission", but this is fragile and race-condition prone

### Impact
- Recruiter commissions may be created multiple times for the same recruited chatter
- Or in some race conditions, may never be created at all
- The system relies on an indirect indicator (`totalClients`) instead of a direct flag

## Solution

Replace the indirect check with a dedicated boolean flag: `recruiterCommissionPaid`

### Changes Made

#### 1. Updated Chatter Type
**File:** `sos/firebase/functions/src/chatter/types.ts`

Added new field to `Chatter` interface:
```typescript
/** Whether recruiter commission has been paid (for first client) */
recruiterCommissionPaid: boolean;
```

#### 2. Fixed Trigger Logic
**File:** `sos/firebase/functions/src/chatter/triggers/onCallCompleted.ts`

**Before:**
```typescript
if (chatter.recruitedBy && chatter.totalClients === 1) {
  // Create recruitment commission
}
```

**After:**
```typescript
if (chatter.recruitedBy && !chatter.recruiterCommissionPaid) {
  // Mark as paid BEFORE creating commission (prevent race conditions)
  await db.collection("chatters").doc(clientData.referredByChatterId).update({
    recruiterCommissionPaid: true,
    updatedAt: Timestamp.now(),
  });

  // Create recruitment commission
  const recruiterResult = await createCommission({ ... });

  // Rollback flag if commission creation failed
  if (!recruiterResult.success) {
    await db.collection("chatters").doc(clientData.referredByChatterId).update({
      recruiterCommissionPaid: false,
      updatedAt: Timestamp.now(),
    });
  }
}
```

**Key improvements:**
- Uses a dedicated flag instead of relying on `totalClients`
- Sets the flag BEFORE creating the commission to prevent race conditions
- Includes rollback logic if commission creation fails
- Makes the intent explicit and easy to understand

#### 3. Initialize Field for New Chatters
**File:** `sos/firebase/functions/src/chatter/callables/registerChatter.ts`

Added initialization:
```typescript
recruiterCommissionPaid: false,
```

#### 4. Include Field in Dashboard Response
**File:** `sos/firebase/functions/src/chatter/callables/getChatterDashboard.ts`

Added field to response:
```typescript
recruiterCommissionPaid: chatter.recruiterCommissionPaid,
```

#### 5. Data Migration Script
**File:** `sos/firebase/functions/src/chatter/migrations/addRecruiterCommissionPaidField.ts`

Created migration script to add the field to existing chatters:
- Sets to `true` for chatters with recruiter + clients (assumes commission was paid)
- Sets to `false` for chatters with recruiter but no clients yet
- Sets to `false` for chatters without recruiter

## Deployment Steps

### 1. Run Migration (REQUIRED BEFORE DEPLOY)
```bash
cd sos/firebase/functions
npx ts-node src/chatter/migrations/addRecruiterCommissionPaidField.ts
```

### 2. Verify Migration Results
Check Firestore to confirm:
- All chatters have the `recruiterCommissionPaid` field
- Values are set appropriately based on existing data

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

## Testing Recommendations

1. **Test new chatter registration:**
   - Register a new chatter with a recruitment code
   - Verify `recruiterCommissionPaid: false` is set

2. **Test first commission:**
   - Have a recruited chatter generate their first client commission
   - Verify recruiter commission is created
   - Verify `recruiterCommissionPaid` is set to `true`

3. **Test second commission:**
   - Have the same chatter generate a second client commission
   - Verify NO recruiter commission is created (flag already true)

4. **Test concurrent commissions:**
   - Simulate multiple concurrent first commissions for the same chatter
   - Verify only ONE recruiter commission is created

## Rollback Plan

If issues arise after deployment:

1. **Revert trigger code:**
   ```bash
   git revert <commit-hash>
   firebase deploy --only functions
   ```

2. **Optional: Remove field from existing chatters**
   (Only if necessary - the field being present doesn't cause issues)

## Related Files

- `sos/firebase/functions/src/chatter/types.ts`
- `sos/firebase/functions/src/chatter/triggers/onCallCompleted.ts`
- `sos/firebase/functions/src/chatter/callables/registerChatter.ts`
- `sos/firebase/functions/src/chatter/callables/getChatterDashboard.ts`
- `sos/firebase/functions/src/chatter/migrations/addRecruiterCommissionPaidField.ts`
- `sos/firebase/functions/src/chatter/migrations/README.md`

## Author
Fixed by: Claude Code (AI Assistant)
Date: 2026-01-29

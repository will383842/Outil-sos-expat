# Delayed Transfer System - Implementation Guide

## 🎯 What Changed

Provider payments are now **scheduled for later** instead of being transferred immediately after calls.

---

## ⏰ **Transfer Timeline**

```
Day 0: Call Completes
  ├─ ✅ Client charged
  ├─ ✅ Payment captured
  ├─ ✅ Invoices created
  └─ 📅 Transfer SCHEDULED (not executed)

Day 1-6: Waiting Period
  ├─ Funds settle in your Stripe account
  ├─ Dispute window active
  └─ Transfer shows as "scheduled" status

Day 7: Scheduled Function Runs
  ├─ 🤖 Runs daily at 2 AM UTC
  ├─ Processes all due transfers
  ├─ Executes Stripe Transfer
  └─ Updates status to "succeeded"

Provider Receives Payment
  └─ 💰 Money arrives in provider's account
```

---

## ⚙️ **Configuration**

### **Transfer Delay (Configurable)**

**File:** `firebase/functions/src/TwilioCallManager.ts`  
**Line:** 1333

```typescript
const TRANSFER_DELAY_DAYS = 7; // ← CHANGE THIS VALUE
```

**Options:**
- `3` - Quick payout (3 days)
- `7` - Standard (1 week) ← **Current Setting**
- `14` - Conservative (2 weeks)
- `30` - Very safe (1 month)

### **Scheduled Function**

**File:** `firebase/functions/src/processScheduledTransfers.ts`  
**Schedule:** Every day at 2 AM UTC

```typescript
schedule: "0 2 * * *" // Cron format
```

**To change schedule:**
- `"0 */6 * * *"` - Every 6 hours
- `"0 0 * * *"` - Daily at midnight
- `"0 9 * * *"` - Daily at 9 AM

---

## 📊 **Database Schema**

### **New Collection: pending_transfers**

```typescript
{
  id: string;                      // Auto-generated doc ID
  providerId: string;              // Provider UID
  amount: number;                  // EUR amount to transfer
  sessionId: string;               // Call session reference
  status: "pending" | "completed" | "failed";
  scheduledFor: Timestamp;         // When to execute (call date + 7 days)
  createdAt: Timestamp;            // When pending transfer was created
  completedAt?: Timestamp;         // When transfer executed successfully
  attemptedAt?: Timestamp;         // Last attempt timestamp
  transferId?: string;             // Stripe Transfer ID (after completion)
  failureReason?: string;          // Error message if failed
  retryCount?: number;             // Number of retry attempts
  metadata: {
    serviceType: string;           // "lawyer_call" | "expat_call"
    providerType: string;          // "lawyer" | "expat"
    callCompletedAt: Timestamp;    // Original call completion time
    platformFee: number;           // Platform commission amount
  };
}
```

### **Updated: call_sessions.payment**

```typescript
{
  payment: {
    // ... existing fields ...
    transferStatus: "scheduled" | "pending" | "succeeded" | "failed";
    scheduledTransferDate: Timestamp;    // When transfer will execute
    pendingTransferId: string;           // Reference to pending_transfers doc
    transferId?: string;                 // Stripe Transfer ID (after execution)
    transferredAt?: Timestamp;           // When actually transferred
  }
}
```

---

## 🔄 **How It Works**

### **1. After Successful Call:**

```javascript
// TwilioCallManager creates pending transfer
await db.collection('pending_transfers').add({
  providerId: "provider_uid",
  amount: 30,                        // EUR
  sessionId: "call_session_xxx",
  status: "pending",
  scheduledFor: Timestamp(now + 7 days),
  createdAt: Timestamp(now),
});
```

### **2. Daily Scheduled Function:**

```javascript
// processScheduledTransfers runs at 2 AM UTC
// Finds transfers where scheduledFor <= now
const pending = await db.collection('pending_transfers')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', now)
  .get();

// Executes each transfer
for (const transfer of pending) {
  await stripeManager.transferToProvider(...);
  // Updates status to "completed"
}
```

---

## 📈 **Monitoring**

### **Check Pending Transfers:**

```javascript
// Firebase Console → Firestore → pending_transfers
// Filter by: status == "pending"
// Sort by: scheduledFor (ascending)
```

### **Check Logs:**

```javascript
// Cloud Functions logs
"📅 Scheduling transfer of 30 EUR to provider..."
"✅ Pending transfer created: doc_id"
"📅 Will be processed in 7 days"

// 7 days later
"🔄 Starting scheduled transfer processing..."
"📊 Found 5 transfers to process"
"✅ Transfer doc_id completed successfully"
"💰 Total amount transferred: 150 EUR"
```

### **Query Transfers by Status:**

```javascript
// Pending (not yet executed)
db.collection('pending_transfers')
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
  .get()

// Completed
db.collection('pending_transfers')
  .where('status', '==', 'completed')
  .orderBy('completedAt', 'desc')
  .get()

// Failed (need manual review)
db.collection('pending_transfers')
  .where('status', '==', 'failed')
  .orderBy('attemptedAt', 'desc')
  .get()
```

---

## ✅ **Benefits**

### **For Platform:**
- ✅ **No balance errors** - Funds always settled
- ✅ **Dispute protection** - 7 days to handle refunds
- ✅ **Batch processing** - More efficient
- ✅ **Better cash flow** - Time to verify everything

### **For Providers:**
- ✅ **Predictable payouts** - Know exactly when payment arrives
- ✅ **Transparent** - Can see scheduled date
- ✅ **Reliable** - No "insufficient funds" failures

---

## 🧪 **Testing**

### **Test Immediate Processing:**

For testing, you can manually trigger the function or reduce the delay:

**Option 1: Change delay to 1 minute for testing:**
```typescript
const TRANSFER_DELAY_DAYS = 1 / (24 * 60); // 1 minute instead of 7 days
```

**Option 2: Manually trigger the scheduled function:**
```bash
# From Firebase Console → Functions
# Find: processScheduledTransfers
# Click "Test function"
```

**Option 3: Process via Cloud Tasks API:**
```bash
gcloud scheduler jobs run processScheduledTransfers --project=sos-urgently-ac307
```

---

## 🔧 **Deployment**

Deploy the changes:

```bash
# Deploy functions (includes the new scheduled function)
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:processScheduledTransfers
```

The scheduled function will automatically start running daily at 2 AM UTC.

---

## ⚠️ **Important Notes**

### **First Execution:**
After deployment, the function will run at the next scheduled time (2 AM UTC). Existing calls won't have pending transfers retroactively.

### **Manual Processing:**
If you need to process transfers immediately, you can:
1. Lower `TRANSFER_DELAY_DAYS` temporarily
2. Manually trigger the function from Firebase Console
3. Create an admin tool to force-process specific transfers

### **Failed Transfers:**
Failed transfers stay in `pending_transfers` with `status: "failed"`. You can:
1. Review in Firestore
2. Fix the issue (e.g., provider completes KYC)
3. Manually change `status` back to `"pending"` to retry

---

## 📊 **Money Flow**

### **Example: 49 EUR Lawyer Call**

**Day 0 (Call completes):**
```
Your Stripe Account: +49 EUR
Provider Account: +0 EUR (scheduled for Day 7)
Status: payment.transferStatus = "scheduled"
```

**Day 7 (Function runs at 2 AM):**
```
Your Stripe Account: -30 EUR (transferred out)
Provider Account: +30 EUR (received)
Platform Keeps: 19 EUR
Status: payment.transferStatus = "succeeded"
```

---

## 🎯 **Key Configuration**

**Transfer Delay:** 7 days (line 1333 in TwilioCallManager.ts)
**Processing Schedule:** Daily at 2 AM UTC (processScheduledTransfers.ts)
**Batch Size:** 100 transfers per run
**Retry Logic:** Failed transfers can be retried manually

---

**Status:** ✅ Implemented and Ready
**Date:** November 11, 2025
**Breaking Change:** Yes - providers now wait 7 days instead of immediate payout


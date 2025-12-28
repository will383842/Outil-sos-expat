# Delayed Transfer Implementation - Summary

## ✅ **What Was Implemented**

Provider payments are now **scheduled for 7 days** after call completion instead of immediate transfer.

---

## 📋 **Changes Made**

### **1. Modified Files:**

#### **`firebase/functions/src/TwilioCallManager.ts`**
- ✅ Updated `CallSessionState` payment interface (added new fields)
- ✅ Commented out immediate transfer logic (lines 1392-1457)
- ✅ Added new delayed transfer scheduling logic (lines 1331-1390)
- ✅ Creates `pending_transfers` document after successful call
- ✅ Updates call_session with scheduled date and pending transfer ID

**Key Fields Added:**
```typescript
transferStatus: "scheduled" | "pending" | "succeeded" | "failed" | "scheduling_failed"
scheduledTransferDate: Timestamp
pendingTransferId: string
```

#### **`firebase/functions/src/processScheduledTransfers.ts`** (NEW FILE)
- ✅ Created scheduled Cloud Function
- ✅ Runs daily at 2:00 AM UTC
- ✅ Queries pending transfers where `scheduledFor <= now`
- ✅ Executes Stripe transfers via `StripeManager.transferToProvider()`
- ✅ Updates `pending_transfers` and `call_sessions` collections
- ✅ Logs all results and errors
- ✅ Processes up to 100 transfers per run

#### **`firebase/functions/src/index.ts`**
- ✅ Exported `processScheduledTransfers` function

#### **`firestore.rules`**
- ✅ Added `pending_transfers` collection rules
- ✅ Providers can read their own pending transfers
- ✅ Admins can create/update/delete

#### **`firestore.indexes.json`**
- ✅ Added composite index: `status + scheduledFor` (for scheduled function query)
- ✅ Added composite index: `providerId + createdAt` (for provider dashboard)

---

## 📦 **New Database Collection**

### **`pending_transfers`**

```typescript
{
  // Document ID: auto-generated
  providerId: string;              // Provider's UID
  amount: number;                  // EUR amount to transfer (e.g., 30)
  sessionId: string;               // Reference to call_sessions document
  status: "pending" | "completed" | "failed";
  scheduledFor: Timestamp;         // Date when transfer will execute (call_date + 7 days)
  createdAt: Timestamp;            // When scheduled
  completedAt?: Timestamp;         // When successfully transferred
  attemptedAt?: Timestamp;         // Last execution attempt
  transferId?: string;             // Stripe Transfer ID (after success)
  failureReason?: string;          // Error message if failed
  retryCount?: number;             // Number of retry attempts
  metadata: {
    serviceType: "lawyer_call" | "expat_call";
    providerType: "lawyer" | "expat";
    callCompletedAt: Timestamp;
    platformFee: number;
  };
}
```

---

## ⏰ **Timeline Flow**

### **Before (Old System):**
```
Call Ends → Payment Captured → Transfer Immediately → Provider Paid
           (instant)
```

### **After (New System):**
```
Day 0: Call Ends
  ├─ Payment Captured (instant)
  ├─ Invoices Created (instant)
  └─ Transfer SCHEDULED (not executed)
      └─ Status: "scheduled"
      └─ scheduledFor: Day 7

Days 1-6: Waiting Period
  ├─ Funds settle in your account
  ├─ Dispute window active
  └─ Provider can see scheduled date

Day 7 at 2 AM UTC: Scheduled Function
  ├─ Query: status=pending & scheduledFor≤now
  ├─ Execute Stripe Transfer
  ├─ Update status: "completed"
  └─ Record transferId

Provider Receives Payment
  └─ Status: "succeeded"
```

---

## 🔧 **Configuration**

### **Transfer Delay:**
**File:** `firebase/functions/src/TwilioCallManager.ts`  
**Line:** 1333

```typescript
const TRANSFER_DELAY_DAYS = 7; // ← Change this number
```

### **Processing Schedule:**
**File:** `firebase/functions/src/processScheduledTransfers.ts`  
**Line:** 13

```typescript
schedule: "0 2 * * *" // ← Cron expression (2 AM UTC daily)
```

---

## 📊 **Deployment Status**

- ✅ **Firestore Rules:** Deployed
- ✅ **Firestore Indexes:** Deployed
- ⏳ **Cloud Functions:** Deploying (background)
  - `processScheduledTransfers` → ✅ Created successfully
  - All other functions → ⏳ Updating

---

## 🎯 **Next Steps**

### **1. Wait for Full Deployment**
```bash
# Check deployment status
firebase functions:log --only processScheduledTransfers
```

### **2. Verify Function is Scheduled**
**Firebase Console:**
- Go to: Functions → processScheduledTransfers
- Check: "Cloud Scheduler job created"
- Next run: Tomorrow at 2:00 AM UTC

### **3. Test Transfer Flow**

**Option A: Short Delay Test**
```typescript
// Temporarily change in TwilioCallManager.ts line 1333
const TRANSFER_DELAY_DAYS = 1/1440; // 1 minute instead of 7 days

// Redeploy
firebase deploy --only functions:twiliocallwebhook

// Make test call
// Wait 1 minute
// Manually trigger: firebase functions:shell
// > processScheduledTransfers()
```

**Option B: Manual Trigger**
```bash
# From Firebase Console
# Functions → processScheduledTransfers → "Test function"

# Or from CLI
gcloud scheduler jobs run processScheduledTransfers --project=sos-urgently-ac307
```

### **4. Monitor First Real Run**
**Tomorrow at 2:00 AM UTC:**
- Check Cloud Functions logs
- Look for: "Transfer processing complete"
- Verify: `pending_transfers` status changed to "completed"
- Confirm: Provider accounts received payments

### **5. Add Provider Notifications (Optional)**
**Update provider dashboard to show:**
- "Payment of 30 EUR scheduled for Nov 18, 2025"
- "Payment of 30 EUR received on Nov 18, 2025"

---

## 📝 **Documentation Files Created**

1. **`DELAYED_TRANSFER_IMPLEMENTATION.md`** - Detailed technical guide
2. **`TRANSFER_DELAY_QUICK_START.md`** - Quick reference for daily operations
3. **`TRANSFER_DELAY_SUMMARY.md`** - This file (overview)

---

## ⚠️ **Important Notes**

### **Breaking Change:**
- **Old behavior:** Providers paid immediately after call
- **New behavior:** Providers paid 7 days after call
- **Action required:** Notify existing providers of the change

### **Existing Calls:**
- Calls completed **before** this deployment: No pending transfers created
- Calls completed **after** this deployment: Will use new 7-day delay
- No retroactive scheduling needed

### **Test Environment:**
- Use test card: `4000 0000 0000 0077` (instant available balance)
- Or wait 2-7 days for funds to become available
- Or reduce delay to 1 minute for testing

### **Failed Transfers:**
- Failed transfers stay as `status: "failed"` in `pending_transfers`
- Review failures in Firestore
- Common reasons:
  - Provider hasn't completed KYC
  - Provider account disabled
  - Insufficient platform balance (rare)
- Fix issue and manually change status back to "pending" to retry

---

## 💰 **Money Flow Example**

**Lawyer Call: 49 EUR**
- Platform commission: 19 EUR
- Provider amount: 30 EUR

**Day 0 (Call ends):**
```
Your Stripe Balance: +49 EUR
Provider Balance: +0 EUR
Status: "scheduled"
```

**Days 1-6 (Waiting):**
```
Your Stripe Balance: +49 EUR (pending → available)
Provider Balance: +0 EUR
Status: "scheduled"
```

**Day 7 (Transfer executes):**
```
Your Stripe Balance: +19 EUR (kept commission)
Provider Balance: +30 EUR (received)
Status: "succeeded"
```

---

## 🔍 **Monitoring Queries**

### **Check Pending Transfers:**
```javascript
// Firestore query
db.collection('pending_transfers')
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
  .limit(50)
```

### **Check Today's Due Transfers:**
```javascript
// Transfers that should process today
const today = new Date();
today.setHours(23, 59, 59);

db.collection('pending_transfers')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(today))
  .get()
```

### **Check Failed Transfers:**
```javascript
// Needs manual review
db.collection('pending_transfers')
  .where('status', '==', 'failed')
  .orderBy('attemptedAt', 'desc')
  .limit(20)
```

### **Provider Dashboard Query:**
```javascript
// Show provider their scheduled payments
db.collection('pending_transfers')
  .where('providerId', '==', currentUser.uid)
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
  .get()
```

---

## ✅ **Implementation Complete**

**Status:** Ready for production
**Deployment:** In progress
**First Execution:** Tomorrow at 2:00 AM UTC
**Configuration:** 7-day delay (adjustable)

**Contact:** Check logs if any issues arise during first scheduled run.

---

**Last Updated:** November 11, 2025
**Version:** 1.0.0
**Author:** AI Assistant


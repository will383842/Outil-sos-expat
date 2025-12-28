# Delayed Transfer - Quick Start Guide

## ✅ What's Implemented

Provider payments are now **scheduled for 7 days later** instead of immediate transfer.

---

## 🎯 **Current Settings:**

### **Transfer Delay:**
```
7 DAYS (configurable)
```

Located at: `firebase/functions/src/TwilioCallManager.ts` line 1333

### **Processing Schedule:**
```
Daily at 2:00 AM UTC
```

Located at: `firebase/functions/src/processScheduledTransfers.ts` line 12

---

## 📅 **Timeline Example**

**Monday (Day 0):**
- Client calls lawyer, pays 49 EUR
- Payment captured immediately
- Transfer scheduled for **next Monday (Day 7)**
- Provider sees: "Payment scheduled for Nov 18"

**Tuesday-Sunday (Days 1-6):**
- Money sits in your Stripe account
- Time to handle any disputes
- Provider can see scheduled date

**Next Monday (Day 7) at 2 AM UTC:**
- Automated function runs
- Transfer executed: 30 EUR → Provider
- Provider receives notification
- Status changes to "succeeded"

---

## 🔍 **How to Check Status**

### **1. For a Specific Call:**

**Firestore Console:**
```
call_sessions/{sessionId}
  └─ payment
      ├─ transferStatus: "scheduled"
      ├─ scheduledTransferDate: Timestamp(Day 7)
      └─ pendingTransferId: "doc_id"
```

### **2. All Pending Transfers:**

**Firestore Console → pending_transfers:**
```javascript
// Filter: status == "pending"
// Sort by: scheduledFor (ascending)
// Shows: All transfers waiting to be processed
```

### **3. Provider View (Dashboard):**

Providers can see their scheduled payments:
```javascript
db.collection('pending_transfers')
  .where('providerId', '==', currentUser.uid)
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
  .get()
```

---

## ⚙️ **Changing the Delay**

**File:** `firebase/functions/src/TwilioCallManager.ts`  
**Line:** 1333

```typescript
// Change this number:
const TRANSFER_DELAY_DAYS = 7;

// Options:
// 3  - Quick payout (recommended minimum)
// 7  - Standard (current setting)
// 14 - Conservative
// 30 - Maximum protection
```

**After changing:**
```bash
firebase deploy --only functions:twiliocallwebhook
```

---

## 🛠️ **Manual Operations**

### **Force Process a Transfer:**

**Firebase Console:**
1. Go to Firestore → `pending_transfers`
2. Find the transfer document
3. Edit `scheduledFor` to a past date
4. Wait for next scheduled run (or trigger manually)

### **Cancel a Transfer:**

```javascript
// In Firebase Console
pending_transfers/{docId}
  └─ status: "pending" → "cancelled"
```

### **Manually Trigger Processing:**

```bash
# From Cloud Console
gcloud scheduler jobs run processScheduledTransfers --project=sos-urgently-ac307

# Or from Firebase Console
Functions → processScheduledTransfers → Test function
```

---

## 📊 **Status Values**

### **Call Session Transfer Status:**
- `scheduled` - Transfer created, waiting for scheduled date
- `succeeded` - Transfer completed successfully
- `failed` - Transfer failed (check logs)
- `scheduling_failed` - Failed to create pending transfer

### **Pending Transfer Status:**
- `pending` - Waiting for scheduled date
- `completed` - Successfully transferred
- `failed` - Transfer failed (manual review needed)

---

## 🔔 **What to Monitor**

### **Daily:**
1. Check function logs after 2 AM UTC
2. Look for: "Transfer processing complete"
3. Verify: succeeded count matches expected

### **Weekly:**
1. Check `pending_transfers` for failed transfers
2. Review reasons (usually KYC issues)
3. Notify providers to complete KYC

### **Failed Transfers:**
```javascript
// Query failed transfers
db.collection('pending_transfers')
  .where('status', '==', 'failed')
  .orderBy('attemptedAt', 'desc')
  .get()

// Common reasons:
// - "Provider has not completed Stripe onboarding"
// - "Provider account cannot receive payments yet"
// - "Insufficient funds" (rare after 7 days)
```

---

## 💡 **Best Practices**

### **1. Notify Providers:**
Add to provider dashboard:
```
"Your payment of 30 EUR is scheduled for Nov 18, 2025"
```

### **2. Handle Disputes:**
If client requests refund within 7 days:
- Cancel the pending transfer
- Process refund to client
- Both parties handled properly

### **3. Monitor Failed Transfers:**
Set up alerts for failed transfers:
- Email admin when > 5 transfers fail
- Check KYC status of providers
- Retry after provider fixes issues

---

## 🚀 **Deployment Checklist**

- ✅ TwilioCallManager.ts updated (immediate transfer commented out)
- ✅ processScheduledTransfers.ts created (scheduled function)
- ✅ index.ts updated (function exported)
- ✅ CallSessionState type updated (new fields)
- ✅ Firestore rules added (pending_transfers collection)
- ✅ Firestore indexes added (2 composite indexes)
- ✅ Rules deployed successfully
- ✅ Indexes deployed successfully
- ⏳ Functions deployment pending

---

## 🎯 **Next Steps**

1. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```

2. **Monitor first execution:**
   - Wait until 2 AM UTC
   - Check Cloud Functions logs
   - Verify transfers process correctly

3. **Test with short delay:**
   - Temporarily set `TRANSFER_DELAY_DAYS = 1/1440` (1 minute)
   - Make test call
   - Manually trigger function
   - Verify transfer executes

4. **Add provider notifications:**
   - Notify when transfer is scheduled
   - Notify when transfer completes
   - Alert if transfer fails

---

**Status:** ✅ Ready to Deploy
**Breaking Change:** Yes - providers now wait 7 days
**Backward Compatible:** No - existing immediate logic commented out
**Configuration File:** TwilioCallManager.ts line 1333


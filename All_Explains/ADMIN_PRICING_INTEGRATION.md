# Admin Pricing Config Integration

## ✅ **What Was Changed**

The transfer and invoice system now uses **dynamic amounts from `admin_config/pricing`** instead of hardcoded percentages.

---

## 📊 **Before vs After**

### **BEFORE (Hardcoded):**
```typescript
const platformFee = Math.round(session.payment.amount * 0.15);      // 15%
const providerAmount = Math.round(session.payment.amount * 0.85);   // 85%
```

**Example for 49 EUR:**
- Platform: 7.35 EUR (15%)
- Provider: 41.65 EUR (85%)

---

### **AFTER (Admin Config):**
```typescript
const pricingConfig = await getPricingConfig();
const platformFee = pricingConfig[serviceType][currency].connectionFeeAmount;
const providerAmount = pricingConfig[serviceType][currency].providerAmount;
```

**Example for 49 EUR (lawyer):**
- Platform: **19 EUR** (from admin panel)
- Provider: **30 EUR** (from admin panel)

---

## 🎯 **Current Admin Pricing Config**

Located at: `admin_config/pricing` in Firestore

```typescript
{
  lawyer: {
    eur: {
      totalAmount: 49,
      connectionFeeAmount: 19,  // 38.8% - Platform commission
      providerAmount: 30,       // 61.2% - Provider payment
      duration: 25
    },
    usd: {
      totalAmount: 55,
      connectionFeeAmount: 25,
      providerAmount: 30,
      duration: 25
    }
  },
  expat: {
    eur: {
      totalAmount: 19,
      connectionFeeAmount: 9,   // 47.4% - Platform commission
      providerAmount: 10,       // 52.6% - Provider payment
      duration: 35
    },
    usd: {
      totalAmount: 25,
      connectionFeeAmount: 15,
      providerAmount: 10,
      duration: 35
    }
  }
}
```

---

## 💰 **New Commission Structure**

### **Lawyers:**
- Client pays: **49 EUR**
- Platform gets: **19 EUR** (38.8%)
- Provider gets: **30 EUR** (61.2%)

### **Expats:**
- Client pays: **19 EUR**
- Platform gets: **9 EUR** (47.4%)
- Provider gets: **10 EUR** (52.6%)

**Platform makes MORE commission now** compared to the old 15%!

---

## 🔧 **How to Change Pricing**

### **Option 1: Via Firebase Console**
1. Go to Firestore
2. Navigate to: `admin_config/pricing`
3. Edit the values:
   - `connectionFeeAmount` - What platform keeps
   - `providerAmount` - What provider receives
   - `totalAmount` - Must equal sum of above two

### **Option 2: Via AdminPricing Page**
1. Go to: `/admin/pricing`
2. Edit values in the UI
3. Save changes
4. Changes apply immediately to new calls

---

## ⚠️ **Important:**

### **The Math Must Add Up:**
```
totalAmount = connectionFeeAmount + providerAmount
```

**Example:**
- ✅ Valid: `49 = 19 + 30`
- ❌ Invalid: `49 ≠ 20 + 31`

### **Both Places Updated:**
The admin pricing is now used in **two places**:
1. **Invoice creation** (line 1428-1438)
2. **Provider transfers** (line 1319-1330)

This ensures consistency across all financial operations.

---

## 🧪 **Testing:**

1. **Check current config:**
   ```javascript
   // In Firebase Console
   admin_config/pricing → lawyer → eur
   // Should show: connectionFeeAmount: 19, providerAmount: 30
   ```

2. **Make a test call**
3. **Check logs:**
   ```
   📄 Creating invoices with admin pricing - Platform: 19 EUR, Provider: 30 EUR
   💸 Using admin pricing config - Platform: 19 EUR, Provider: 30 EUR
   ```

4. **Verify transfer amount:**
   ```
   ✅ Transfer created: tr_xxx
   // Amount should be 3000 cents (30 EUR)
   ```

---

## ✅ **Benefits:**

1. **No code changes needed** - Just update Firestore document
2. **Consistent** - Same source of truth for all pricing
3. **Flexible** - Different rates for lawyers vs expats
4. **Multi-currency** - Supports EUR and USD
5. **Dynamic** - Change pricing anytime without redeploying

---

**Implementation Date**: November 11, 2025
**Status**: ✅ Active
**Source**: `admin_config/pricing` in Firestore


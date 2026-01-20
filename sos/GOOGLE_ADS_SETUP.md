# Google Ads Conversion Tracking Setup

This document explains how to configure Google Ads conversion tracking for SOS-Expat, including:
- Frontend tracking (gtag.js)
- Backend Enhanced Conversions API
- Consent Mode v2 compliance

## Architecture Overview

```
+------------------+     +------------------+     +------------------+
|     Browser      |     |  Firebase Func   |     |   Google Ads     |
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| gtag.js (via GA4)|---->| Enhanced Conv.   |---->| Conversion API   |
| Consent Mode v2  |     | API (server)     |     |                  |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

## 1. Frontend Configuration

### Environment Variables (.env)

```env
# Google Ads Conversion Tracking
# Get these values from Google Ads > Tools > Conversions

# Conversion ID (format: AW-XXXXXXXXXX)
VITE_GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXXX

# Conversion Labels (one per conversion action)
VITE_GOOGLE_ADS_PURCHASE_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_LEAD_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_SIGNUP_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_CHECKOUT_LABEL=XXXXXXXXXXXXXXXXXXX
```

### How to Get Conversion ID and Labels

1. Go to Google Ads > Tools & Settings > Conversions
2. Click "+ New conversion action"
3. Select "Website"
4. Choose "Manual setup"
5. Fill in conversion details:
   - **Name**: e.g., "Purchase - Call Service"
   - **Category**: Purchase/Sale
   - **Value**: Use different values for each conversion
   - **Count**: One (for unique conversions)
6. Click "Create and continue"
7. In the tag setup, choose "Install with Google Tag Manager" or "Manual"
8. Copy the **Conversion ID** (e.g., `AW-123456789`)
9. Copy the **Conversion Label** (e.g., `AbCdEfGhIjKlMnOpQr`)

### Usage in Code

```typescript
import {
  trackGoogleAdsPurchase,
  trackGoogleAdsLead,
  trackGoogleAdsBeginCheckout,
  setGoogleAdsUserData
} from '@/utils/googleAds';

// Set user data for Enhanced Conversions (improved match rate)
await setGoogleAdsUserData({
  email: 'user@example.com',
  phone: '+33612345678',
  firstName: 'John',
  lastName: 'Doe',
  country: 'FR',
});

// Track a Lead (booking request submitted)
trackGoogleAdsLead({
  value: 49,
  currency: 'EUR',
  content_name: 'booking_request',
  content_category: 'lawyer',
});

// Track Begin Checkout
trackGoogleAdsBeginCheckout({
  value: 49,
  currency: 'EUR',
  content_name: 'lawyer_call',
});

// Track a Purchase (payment successful)
trackGoogleAdsPurchase({
  value: 49,
  currency: 'EUR',
  transaction_id: 'order_123',
  content_name: 'lawyer_call',
});
```

## 2. Backend Configuration (Enhanced Conversions)

For server-side conversion tracking with Enhanced Conversions, you need to set up Firebase secrets.

### Firebase Secrets

```bash
# Set the secrets in Firebase
firebase functions:secrets:set GOOGLE_ADS_CUSTOMER_ID
# Enter your customer ID (format: 1234567890 without dashes)

firebase functions:secrets:set GOOGLE_ADS_PURCHASE_CONVERSION_ID
# Enter the conversion action ID from Google Ads

firebase functions:secrets:set GOOGLE_ADS_LEAD_CONVERSION_ID
# Enter the lead conversion action ID

firebase functions:secrets:set GOOGLE_ADS_DEVELOPER_TOKEN
# Get this from Google Ads API Center

firebase functions:secrets:set GOOGLE_ADS_REFRESH_TOKEN
# OAuth refresh token

firebase functions:secrets:set GOOGLE_ADS_CLIENT_ID
# OAuth client ID

firebase functions:secrets:set GOOGLE_ADS_CLIENT_SECRET
# OAuth client secret
```

### Setting up OAuth for Google Ads API

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add authorized redirect URIs
4. Use the OAuth Playground to get a refresh token:
   - Go to https://developers.google.com/oauthplayground/
   - Settings > Use your own OAuth credentials
   - Enter your Client ID and Secret
   - Authorize the Google Ads API scope: `https://www.googleapis.com/auth/adwords`
   - Exchange authorization code for tokens
   - Copy the refresh token

### Usage in Firebase Functions

```typescript
import {
  trackGoogleAdsPurchase,
  trackStripePurchase
} from './googleAdsConversionsApi';

// In your Stripe webhook handler:
export const stripeWebhook = onRequest(async (req, res) => {
  const event = stripe.webhooks.constructEvent(/* ... */);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // Track the purchase with Enhanced Conversions
    await trackStripePurchase(paymentIntent, {
      gclid: paymentIntent.metadata?.gclid, // Pass GCLID if available
    });
  }
});
```

## 3. Consent Mode v2 Compliance

Google Ads tracking respects user consent preferences via Consent Mode v2.

### How it works

1. **Default state**: All consent signals are `denied`
2. **User accepts marketing cookies**: Consent is updated to `granted`
3. **Google Ads tracking**: Only fires when `ad_storage` and `ad_user_data` are `granted`

### Code Integration

The `CookieBanner` component automatically handles consent:

```typescript
// In CookieBanner.tsx - already integrated
import { updateGoogleAdsConsent, initializeGoogleAds } from '@/utils/googleAds';

const savePreferences = (prefs) => {
  // Update Google Ads consent
  updateGoogleAdsConsent(prefs.marketing);

  // Initialize if marketing is granted
  if (prefs.marketing) {
    initializeGoogleAds();
  }
};
```

## 4. GCLID Tracking

The GCLID (Google Click ID) is automatically captured from URLs and stored for attribution.

### How it works

1. User clicks a Google Ad with `?gclid=xxx` parameter
2. `getGoogleClickId()` captures and stores it in sessionStorage
3. GCLID is passed to backend for Enhanced Conversions
4. Google Ads attributes the conversion correctly

### Passing GCLID to Backend

```typescript
// In your checkout/payment flow
const gclid = getGoogleClickId();

// Store in payment metadata
const paymentIntent = await stripe.paymentIntents.create({
  amount: 4900,
  currency: 'eur',
  metadata: {
    gclid: gclid || '', // Pass GCLID for server-side tracking
  },
});
```

## 5. Diagnostic Tool

Use the diagnostic function to verify your setup:

```javascript
// In browser console
googleAdsDiagnostic()
```

This will show:
- Configuration status
- Consent state
- GCLID presence
- User data for Enhanced Conversions
- Network requests to Google Ads

## 6. Events Tracked

| Event | Frontend Function | Backend Function | When |
|-------|-------------------|------------------|------|
| Lead | `trackGoogleAdsLead()` | `trackGoogleAdsLead()` | Booking request submitted |
| Begin Checkout | `trackGoogleAdsBeginCheckout()` | - | Payment form opened |
| Add Payment Info | `trackGoogleAdsAddPaymentInfo()` | - | Payment method entered |
| Purchase | `trackGoogleAdsPurchase()` | `trackGoogleAdsPurchase()` | Payment successful |
| Sign Up | `trackGoogleAdsSignUp()` | - | User registration complete |

## 7. Testing

### Test Mode

1. Use Google Tag Assistant to verify events
2. Check the Google Ads > Conversions > Diagnostics
3. Use the browser console diagnostic: `googleAdsDiagnostic()`

### Verify Enhanced Conversions

1. Go to Google Ads > Tools > Conversions
2. Click on your conversion action
3. Check the "Enhanced conversions" section
4. Verify match rate is improving

## 8. Troubleshooting

### Events not appearing in Google Ads

1. Check consent is granted: `hasMarketingConsent()` should return `true`
2. Verify Conversion ID is correct: Check `VITE_GOOGLE_ADS_CONVERSION_ID`
3. Check Conversion Label is set for the event type
4. Wait 24-48 hours for data to appear

### Low match rate for Enhanced Conversions

1. Ensure user data is set: Call `setGoogleAdsUserData()` with email/phone
2. Hash format must be SHA256 lowercase
3. Phone must be in E.164 format

### GCLID not being captured

1. Check URL has `?gclid=xxx` parameter
2. Verify `getGoogleClickId()` returns a value
3. Ensure GCLID is passed to backend in metadata

## 9. Files Reference

| File | Purpose |
|------|---------|
| `src/utils/googleAds.ts` | Frontend tracking utilities |
| `firebase/functions/src/googleAdsConversionsApi.ts` | Backend Enhanced Conversions |
| `src/components/common/CookieBanner.tsx` | Consent management |
| `src/pages/PaymentSuccess.tsx` | Purchase tracking |
| `src/pages/BookingRequest.tsx` | Lead/Checkout tracking |

## 10. Related Documentation

- [Google Ads Conversion Tracking](https://support.google.com/google-ads/answer/1722054)
- [Enhanced Conversions](https://support.google.com/google-ads/answer/9888656)
- [Consent Mode](https://developers.google.com/tag-platform/devguides/consent)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)

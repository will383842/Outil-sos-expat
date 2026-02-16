# Google Analytics 4 (GA4) Setup Guide

## Overview

This project now has complete GA4 integration with:
- ✅ Frontend event tracking (respects cookie consent)
- ✅ Backend server-side event tracking via Measurement Protocol
- ✅ Cookie consent integration
- ✅ Privacy-compliant implementation

## IMPORTANT: GA4 ID Consistency (P1-2 FIX)

**CRITICAL:** You MUST use the SAME Measurement ID for both frontend and backend:

| Environment Variable | Location | Must Be Identical |
|---------------------|----------|-------------------|
| `VITE_GA4_MEASUREMENT_ID` | Frontend `.env` | Same ID |
| `GA4_MEASUREMENT_ID` | Backend `.env` | Same ID |

If the IDs don't match, analytics data will be fragmented across two properties,
making it impossible to correlate frontend user journeys with backend events.

## Quick Setup

### 1. Get Your GA4 Credentials

1. **Measurement ID:**
   - Go to [Google Analytics](https://analytics.google.com/)
   - Admin → Data Streams → Select your web stream
   - Copy the Measurement ID (format: `G-XXXXXXXXXX`)

2. **API Secret (for backend):**
   - In the same Data Stream settings
   - Scroll to "Measurement Protocol API secrets"
   - Click "Create" → Copy the secret value

### 2. Frontend Configuration

Add to your root `.env.development` or `.env` file:

```env
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

**For production:** Add to `.env.production` or your deployment platform's environment variables.

### 3. Backend Configuration

Add to `firebase/functions/.env` or `firebase/functions/.env.developement`:

```env
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_ga4_api_secret_here
```

**For production Firebase Functions:**

```bash
# Set as Firebase secret (recommended for production)
firebase functions:secrets:set GA4_API_SECRET

# Or set as environment variable in your deployment platform
```

### 4. Verify Setup

1. **Frontend:**
   - Open browser console
   - Accept analytics cookies
   - Check for: `✅ GA4 initialized: G-XXXXXXXXXX`
   - Events should appear in GA4 Real-Time reports

2. **Backend:**
   - Check Firebase Functions logs
   - Look for: `📊 GA4 Event logged: [event_name]`
   - Events should appear in GA4 within a few minutes

## How It Works

### Frontend Tracking

- **Initialization:** GA4 script loads only after user consents to analytics cookies
- **Cookie Consent:** Integrated with `CookieBanner` component
- **Event Tracking:** Uses `trackEvent()` utility from `src/utils/ga4.ts`
- **User Properties:** Can set user ID and properties via `setUserId()` and `setUserProperties()`

### Backend Tracking

- **Measurement Protocol:** Server-side events sent via GA4 Measurement Protocol API
- **Firestore Backup:** All events also stored in `analytics_events` collection
- **Automatic:** Events logged in backend functions automatically sent to GA4

## Usage Examples

### Frontend

```typescript
import { trackEvent, setUserId, setUserProperties } from './utils/ga4';

// Track an event
trackEvent('button_click', {
  button_name: 'signup',
  page_location: window.location.href,
});

// Set user ID (after login)
setUserId('user123');

// Set user properties
setUserProperties({
  user_type: 'premium',
  subscription_status: 'active',
});
```

### Backend

```typescript
import { logGA4Event, logUserEvent } from './utils/analytics';

// Simple event
await logGA4Event('payment_completed', {
  amount: 99.99,
  currency: 'EUR',
});

// User-specific event
await logUserEvent('user123', 'profile_updated', {
  profile_type: 'lawyer',
});
```

## Event Types Tracked

### Frontend Events
- User actions (clicks, form submissions)
- Conversions (bookings, payments)
- Page views
- Errors
- Performance metrics

### Backend Events
- Email events (sent, opened, clicked, bounced)
- User lifecycle (registration, login, profile updates)
- Transaction events (payments, payouts)
- Trustpilot events
- Autoresponder events

## Privacy & Compliance

- ✅ **Cookie Consent:** GA4 only loads after user consent
- ✅ **Consent Mode:** Respects user preferences
- ✅ **IP Anonymization:** Enabled by default
- ✅ **GDPR Compliant:** No tracking without consent

## Troubleshooting

### Events Not Appearing in GA4

1. **Check Measurement ID:**
   - Verify `VITE_GA4_MEASUREMENT_ID` is set correctly
   - Format should be `G-XXXXXXXXXX`

2. **Check Cookie Consent:**
   - User must accept analytics cookies
   - Check browser console for consent status

3. **Check Network Tab:**
   - Look for requests to `www.google-analytics.com`
   - Verify they're not blocked by ad blockers

4. **Backend Events:**
   - Verify `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` are set
   - Check Firebase Functions logs for errors
   - Verify API secret is valid in GA4

### Common Issues

**Issue:** `gtag is not defined`
- **Solution:** GA4 not initialized. Check if user consented to analytics cookies.

**Issue:** Backend events not sending
- **Solution:** Verify `GA4_API_SECRET` is set correctly in Firebase Functions environment.

**Issue:** Events delayed in GA4
- **Solution:** Normal behavior. Real-time events appear immediately, others may take 24-48 hours.

## Files Modified

- `src/utils/ga4.ts` - GA4 initialization and tracking utilities
- `src/main.tsx` - Initialize GA4 on app start (if consented)
- `src/components/common/CookieBanner.tsx` - GA4 initialization on consent
- `src/services/analytics.ts` - Use GA4 tracking for events
- `firebase/functions/src/emailMarketing/utils/analytics.ts` - Backend GA4 integration
- `firebase/functions/src/emailMarketing/config.ts` - GA4 configuration
- `index.html` - Added preconnect for GA4 domains

## Next Steps

1. ✅ Set `VITE_GA4_MEASUREMENT_ID` in your `.env` file
2. ✅ Set `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` in Firebase Functions `.env`
3. ✅ Test frontend events by accepting cookies and performing actions
4. ✅ Test backend events by triggering functions that log events
5. ✅ Verify events appear in GA4 Real-Time reports

## Support

For issues or questions:
- Check GA4 Real-Time reports: https://analytics.google.com/
- Review Firebase Functions logs
- Check browser console for frontend errors


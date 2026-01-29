# Payment System Secrets Configuration

This document describes all the secrets required for the centralized payment system to process payouts via Wise (international bank transfers) and Flutterwave (mobile money in Africa).

## Required Secrets

### Wise API (International Bank Transfers)

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `WISE_API_TOKEN` | Wise API token (Bearer authentication) | Yes |
| `WISE_PROFILE_ID` | Wise business profile ID | Yes |
| `WISE_WEBHOOK_SECRET` | Secret for webhook signature verification | Yes |
| `WISE_MODE` | Environment mode: `sandbox` or `live` | Yes (defaults to `sandbox`) |

### Flutterwave API (Mobile Money Africa)

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key for API authentication | Yes |
| `FLUTTERWAVE_PUBLIC_KEY` | Flutterwave public key (for frontend initialization) | Yes |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Secret hash for webhook verification | Yes |
| `FLUTTERWAVE_MODE` | Environment mode: `sandbox` or `production` | Yes (defaults to `sandbox`) |

## Setting Secrets in Firebase

Use the Firebase CLI to set secrets for Cloud Functions:

```bash
# Wise secrets
firebase functions:secrets:set WISE_API_TOKEN
firebase functions:secrets:set WISE_PROFILE_ID
firebase functions:secrets:set WISE_WEBHOOK_SECRET

# Flutterwave secrets
firebase functions:secrets:set FLUTTERWAVE_SECRET_KEY
firebase functions:secrets:set FLUTTERWAVE_PUBLIC_KEY
firebase functions:secrets:set FLUTTERWAVE_WEBHOOK_SECRET
```

For environment mode configuration (non-secret strings), set them in `.env` or via Firebase config:

```bash
# Set mode via Firebase config
firebase functions:config:set wise.mode="sandbox"
firebase functions:config:set flutterwave.mode="sandbox"
```

Or define in your `.env` file:

```
WISE_MODE=sandbox
FLUTTERWAVE_MODE=sandbox
```

### Viewing Existing Secrets

```bash
# List all secrets
firebase functions:secrets:list

# Access a secret value (be careful with output!)
firebase functions:secrets:access WISE_API_TOKEN
```

### Deleting Secrets

```bash
firebase functions:secrets:destroy WISE_API_TOKEN
```

## Obtaining API Keys

### Wise API Keys

1. **Create a Wise Business Account**
   - Go to [wise.com/business](https://wise.com/business)
   - Complete business verification

2. **Get API Access**
   - Navigate to **Settings > API tokens**
   - Or visit [wise.com/settings/api-tokens](https://wise.com/settings/api-tokens)
   - Click **Add new token**

3. **Generate API Token**
   - Select **Full access** for the token permissions
   - Required scopes:
     - `quotes:create`
     - `recipients:create`
     - `transfers:create`
     - `transfers:read`
     - `balances:read`
   - Copy and securely store the token (shown only once)

4. **Get Profile ID**
   - Use the API to list profiles:
     ```bash
     curl -H "Authorization: Bearer YOUR_TOKEN" \
       https://api.wise.com/v1/profiles
     ```
   - The business profile ID is returned in the response

5. **Set Up Webhooks**
   - Navigate to **Settings > Webhooks**
   - Add webhook URL: `https://us-central1-sos-expat.cloudfunctions.net/wiseWebhook`
   - Select events: `transfer#state-change`, `transfer#active-cases`
   - Copy the webhook signing secret

### Wise Sandbox Testing

1. Visit [sandbox.transferwise.tech](https://sandbox.transferwise.tech)
2. Create a sandbox account (separate from production)
3. Generate sandbox API tokens
4. Use sandbox base URL: `https://api.sandbox.transferwise.tech`

### Flutterwave API Keys

1. **Create a Flutterwave Account**
   - Go to [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
   - Complete business verification

2. **Access API Keys**
   - Navigate to **Settings > API Keys**
   - You'll find both Test and Live keys

3. **Copy Keys**
   - **Secret Key**: Used for server-side API calls (starts with `FLWSECK_TEST-` or `FLWSECK-`)
   - **Public Key**: Used for frontend/client initialization (starts with `FLWPUBK_TEST-` or `FLWPUBK-`)

4. **Set Up Webhooks**
   - Navigate to **Settings > Webhooks**
   - Add webhook URL: `https://us-central1-sos-expat.cloudfunctions.net/flutterwaveWebhook`
   - Set a webhook secret hash (custom string you choose)
   - Select events: `transfer.completed`, `transfer.failed`

### Flutterwave Sandbox Testing

1. Use Test API keys (prefixed with `_TEST`)
2. Test phone numbers for mobile money:
   - Ghana (GHS): `0551234567`
   - Kenya (KES): `0712345678`
   - Nigeria (NGN): `08012345678`
3. Sandbox transactions use test money, no real funds are transferred

## Environment Configuration

### Sandbox (Development/Testing)

```bash
# .env.local or Firebase secrets
WISE_MODE=sandbox
FLUTTERWAVE_MODE=sandbox

# Use sandbox/test API keys
WISE_API_TOKEN=<sandbox-token>
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxx
```

### Production (Live)

```bash
# .env.production or Firebase secrets
WISE_MODE=live
FLUTTERWAVE_MODE=production

# Use production/live API keys
WISE_API_TOKEN=<production-token>
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxxxxx
```

**Important**: The payment system automatically forces live/production mode when running in the production Firebase project, regardless of the mode setting. This is enforced in `lib/secrets.ts`.

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
   - Add `.env*` files to `.gitignore`
   - Use Firebase Secrets Manager for production

2. **Use separate keys for each environment**
   - Sandbox keys for development and testing
   - Production keys only in production environment

3. **Rotate keys regularly**
   - Wise: Regenerate tokens every 90 days
   - Flutterwave: Rotate keys quarterly

4. **Limit API key permissions**
   - Create keys with minimum required scopes
   - Use read-only keys where possible

### Webhook Security

1. **Always verify webhook signatures**
   - Wise: Verify using the webhook signing secret
   - Flutterwave: Compare `verif-hash` header with your secret

2. **Use HTTPS endpoints only**
   - Never expose webhook endpoints over HTTP

3. **Implement idempotency**
   - Use unique external IDs to prevent duplicate processing
   - The system uses withdrawal IDs as idempotency keys

### Access Control

1. **Restrict secret access**
   - Only deployment systems and authorized personnel
   - Use IAM roles for Firebase Functions

2. **Audit access**
   - Enable Cloud Audit Logs
   - Monitor secret access patterns

3. **Protect webhook endpoints**
   - Implement rate limiting
   - Log all webhook requests

## Usage in Code

### Importing Secrets

```typescript
import {
  // Wise
  WISE_SECRETS,
  getWiseApiToken,
  getWiseProfileId,
  getWiseWebhookSecret,
  getWiseMode,
  getWiseBaseUrl,

  // Flutterwave
  FLUTTERWAVE_SECRETS,
  getFlutterwaveSecretKey,
  getFlutterwavePublicKey,
  getFlutterwaveWebhookSecret,
  getFlutterwaveMode,
  getFlutterwaveBaseUrl,
} from '../lib/secrets';
```

### Using in Cloud Functions

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { WISE_SECRETS, FLUTTERWAVE_SECRETS } from '../lib/secrets';

export const processPayment = onCall({
  secrets: [...WISE_SECRETS, ...FLUTTERWAVE_SECRETS],
}, async (request) => {
  // Function has access to secrets
});
```

### Using Providers

```typescript
// Wise Provider
import { WiseProvider } from '../payment/providers/wiseProvider';
const wiseProvider = WiseProvider.fromSecrets();

// Flutterwave Provider
import { createFlutterwaveProvider } from '../payment/providers/flutterwaveProvider';
const flutterwaveProvider = createFlutterwaveProvider();
```

## Troubleshooting

### Common Issues

1. **"Secret not found" errors**
   - Ensure the secret is set: `firebase functions:secrets:list`
   - Check secret name spelling (case-sensitive)
   - Redeploy functions after setting secrets

2. **"Unauthorized" API errors**
   - Verify API keys are correct
   - Check if using sandbox keys with production API (or vice versa)
   - Ensure API token hasn't expired

3. **Webhook verification fails**
   - Verify webhook secret matches dashboard configuration
   - Check raw body parsing (don't parse JSON before verification)
   - Ensure HTTPS is being used

4. **Mode not switching correctly**
   - Remember: production project always forces live mode
   - Check `WISE_MODE` / `FLUTTERWAVE_MODE` configuration
   - Verify secrets are set for the correct mode

### Debug Logging

The secrets module logs which source was used for each secret:

```
[Secrets] WISE_API_TOKEN loaded from Firebase Secret
[Secrets] FLUTTERWAVE_SECRET_KEY loaded from process.env
```

Check Cloud Functions logs for these messages to verify secrets are loading correctly.

## Related Documentation

- [Wise API Documentation](https://docs.wise.com/api-docs/api-reference)
- [Flutterwave API Documentation](https://developer.flutterwave.com/docs)
- [Firebase Secrets Documentation](https://firebase.google.com/docs/functions/config-env)
- [Payment System Implementation Plan](./IMPLEMENTATION_PLAN.md)

# SOS Expat - Cloudflare Worker Deployment Guide

This guide provides step-by-step instructions for deploying the SOS Expat Cloudflare Worker. This worker intercepts requests from bots (search engines, social media crawlers, AI bots) and redirects them to a server-side rendering (SSR) endpoint for provider profile pages.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Route Configuration](#route-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (version 16.17.0 or later) - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **A Cloudflare account** - [Sign up for free](https://dash.cloudflare.com/sign-up)
- **Your domain added to Cloudflare** (sos-expat.com should be managed by Cloudflare)

### Install Wrangler CLI

Wrangler is Cloudflare's command-line tool for managing Workers. Install it globally:

```bash
npm install -g wrangler
```

Verify the installation:

```bash
wrangler --version
```

You should see output like `wrangler 3.x.x` (version 3 or later).

**Alternative: Install locally in the project**

If you prefer not to install globally, you can use npx:

```bash
npx wrangler --version
```

---

## Installation

1. **Navigate to the cloudflare-worker directory:**

   ```bash
   cd sos/cloudflare-worker
   ```

2. **Review the files:**
   - `worker.js` - The main worker code that handles bot detection and SSR redirect
   - `wrangler.toml` - Configuration file for the worker

---

## Authentication

Before deploying, you need to authenticate with your Cloudflare account.

### Step 1: Login to Cloudflare

Run the following command:

```bash
wrangler login
```

This will:
1. Open your default web browser
2. Redirect you to the Cloudflare login page
3. Ask you to authorize Wrangler to access your account

Click **"Allow"** to grant access. You should see a success message in your terminal.

### Step 2: Verify Authentication

Check that you're logged in correctly:

```bash
wrangler whoami
```

This should display your Cloudflare account email and account ID.

### Alternative: API Token Authentication

If you're deploying from a CI/CD pipeline or prefer not to use browser login:

1. Go to [Cloudflare Dashboard > My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"**
3. Use the **"Edit Cloudflare Workers"** template
4. Set the token as an environment variable:

   ```bash
   export CLOUDFLARE_API_TOKEN=your-api-token-here
   ```

---

## Configuration

### Update wrangler.toml

Before deploying to production, you need to configure the `wrangler.toml` file:

1. **Add your Cloudflare Account ID:**

   Find your Account ID in the [Cloudflare Dashboard](https://dash.cloudflare.com) (right sidebar on the overview page).

   Uncomment and update line 9:
   ```toml
   account_id = "your-cloudflare-account-id"
   ```

2. **Configure routes for production:**

   Uncomment and update the routes section (lines 16-19):
   ```toml
   routes = [
     { pattern = "sos-expat.com/*", zone_name = "sos-expat.com" },
     { pattern = "www.sos-expat.com/*", zone_name = "sos-expat.com" }
   ]
   ```

---

## Deployment

### Deploy to Development (Workers.dev)

For testing purposes, deploy to a workers.dev subdomain first:

```bash
wrangler deploy
```

This will deploy the worker and give you a URL like:
```
https://sos-expat-bot-ssr.<your-subdomain>.workers.dev
```

### Deploy to Production

Once you've tested on workers.dev, deploy to production:

```bash
wrangler deploy --env production
```

### Deploy to Staging

If you have a staging environment:

```bash
wrangler deploy --env staging
```

### View Deployment Status

Check the status of your deployed worker:

```bash
wrangler deployments list
```

---

## Route Configuration

After deploying, you need to configure routes in the Cloudflare Dashboard to intercept requests to your domain.

### Option A: Via wrangler.toml (Recommended)

The routes are already configured in `wrangler.toml`. When you deploy with routes configured, they will be automatically set up.

### Option B: Via Cloudflare Dashboard

If you prefer to configure routes manually:

1. **Go to Cloudflare Dashboard:**
   - Navigate to https://dash.cloudflare.com
   - Select your domain (sos-expat.com)

2. **Navigate to Workers Routes:**
   - Click **"Workers & Pages"** in the left sidebar
   - Click on the **"Routes"** tab (or find "Workers Routes" in the sidebar)

3. **Add a new route:**
   - Click **"Add route"**
   - Enter the route pattern: `sos-expat.com/*`
   - Select the worker: `sos-expat-bot-ssr-prod`
   - Click **"Save"**

4. **Add www subdomain route:**
   - Click **"Add route"** again
   - Enter the route pattern: `www.sos-expat.com/*`
   - Select the worker: `sos-expat-bot-ssr-prod`
   - Click **"Save"**

### Verify Routes

After configuring routes, verify they are active:

```bash
wrangler routes list
```

---

## Testing

### Test 1: Basic Worker Response

Test that the worker is deployed and responding:

```bash
curl -I https://sos-expat-bot-ssr.<your-subdomain>.workers.dev/
```

### Test 2: Bot Detection with Googlebot

Simulate a Googlebot request to a provider profile page:

```bash
curl -A "Googlebot/2.1 (+http://www.google.com/bot.html)" \
  "https://sos-expat.com/fr-fr/avocat-paris-test123" \
  -v
```

Look for these response headers:
- `X-Rendered-By: sos-expat-ssr` - Indicates SSR was used
- `X-Bot-Detected: googlebot` - Indicates the bot was detected

### Test 3: Bot Detection with Facebook Crawler

```bash
curl -A "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" \
  "https://sos-expat.com/en-us/lawyer-london-abc123" \
  -v
```

### Test 4: Regular User Request (Should Pass Through)

A regular browser request should pass through to the origin without SSR:

```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0" \
  "https://sos-expat.com/fr-fr/avocat-paris-test123" \
  -v
```

This should NOT have the `X-Rendered-By` header.

### Test 5: Non-Profile Page (Should Pass Through)

Bot requests to non-profile pages should pass through:

```bash
curl -A "Googlebot/2.1" "https://sos-expat.com/about" -v
```

### View Real-time Logs

Monitor worker logs in real-time:

```bash
wrangler tail
```

This shows live logs including bot detections and any errors.

---

## Troubleshooting

### Issue: "Authentication error" when deploying

**Solution:**
1. Run `wrangler logout` then `wrangler login` again
2. Ensure your API token has the correct permissions
3. Check that your account ID is correct in `wrangler.toml`

### Issue: Worker deployed but routes not working

**Solutions:**
1. Verify your domain is active in Cloudflare (orange cloud enabled)
2. Check that the zone_name in routes matches your domain exactly
3. Ensure the worker name in routes matches the deployed worker name
4. Wait 1-2 minutes for DNS propagation

### Issue: SSR not returning content (empty or error response)

**Solutions:**
1. Check that the Firebase Cloud Function `renderForBots` is deployed and working
2. Test the SSR function directly:
   ```bash
   curl "https://europe-west1-sos-expat.cloudfunctions.net/renderForBots?path=/fr-fr/avocat-paris-test123"
   ```
3. Check worker logs for errors: `wrangler tail`

### Issue: Bot not detected

**Solutions:**
1. Verify the User-Agent string matches one in the BOT_USER_AGENTS list
2. Check that the URL path matches a provider profile pattern
3. Use exact User-Agent string from the bot documentation

### Issue: All requests being sent to SSR (performance issues)

**Solutions:**
1. The worker should only redirect bots visiting provider profile pages
2. Check that regular browser requests have standard User-Agent headers
3. Review the `isProviderProfilePath()` function patterns

### Issue: "Account not authorized" error

**Solution:**
1. Ensure Workers is enabled for your Cloudflare account
2. Free plans include 100,000 requests/day
3. Check usage at: Cloudflare Dashboard > Workers & Pages > Overview

### View Detailed Logs

For debugging, view detailed logs:

```bash
wrangler tail --format=pretty
```

Or filter for specific events:

```bash
wrangler tail --search "Bot Detection"
```

### Check Worker Status

View your worker's analytics and status:

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Click on your worker (sos-expat-bot-ssr)
4. View the Analytics and Logs tabs

### Delete and Redeploy

If all else fails, delete the worker and redeploy:

```bash
wrangler delete sos-expat-bot-ssr
wrangler deploy
```

---

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers Status Page](https://www.cloudflarestatus.com/)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Cloudflare Community Forums](https://community.cloudflare.com/)
2. Review the [Workers Discord](https://discord.gg/cloudflaredev)
3. Contact the development team

# Sitemap Testing & Verification Guide

## 🎯 Quick Start - Test Your Sitemaps

### Step 1: Build and Deploy Functions

```bash
cd firebase/functions
npm run build
firebase deploy --only functions:generateSitemaps
```

### Step 2: Trigger Manual Generation

**Option A: Via HTTP Request (Easiest)**
```bash
# Get your function URL from Firebase Console or use:
curl -X GET https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/generateSitemaps
```

**Option B: Via Firebase Console**
1. Go to Firebase Console → Functions
2. Find `generateSitemaps` function
3. Click "Test function" or use the HTTP trigger URL

### Step 3: Check if Sitemaps Were Created

#### ✅ Method 1: Firebase Console (Visual Check)
1. Go to **Firebase Console → Storage**
2. Navigate to `sitemaps/` folder
3. You should see:
   - `sitemap-index.xml.gz` (Level 3 - Main index)
   - `sitemap-fr-fr.xml.gz`, `sitemap-en-us.xml.gz`, etc. (Level 1 - 9 files)
   - `sitemap-country-france.xml.gz`, etc. (Level 2 - one per country)

#### ✅ Method 2: Check Firestore Logs (Automatic)
1. Go to **Firebase Console → Firestore**
2. Open collection: `sitemap_logs`
3. Check the latest document for:
   - `status`: "success" or "partial"
   - `totalFiles`: Number of files generated
   - `duration`: Time taken in milliseconds
   - `errors`: Any errors (if status is "partial")

#### ✅ Method 3: Check Function Logs
```bash
firebase functions:log --only generateSitemaps --limit 50
```

Look for:
- `🚀 Starting sitemap generation...`
- `✅ Uploaded: sitemap-...`
- `✅ Sitemap generation complete!`

#### ✅ Method 4: Verify Files Are Accessible
```bash
# Test if sitemap index is accessible
curl -I https://sosexpats.com/sitemaps/sitemap-index.xml.gz

# Should return: HTTP/1.1 200 OK
# And: Content-Encoding: gzip
```

---

## 🔄 Automatic Generation

Your sitemaps will be generated automatically in these cases:

### 1. **Scheduled Generation** (Every 24 hours)
- Function: `scheduledSitemapGeneration`
- Runs automatically via Cloud Scheduler
- Check: Firebase Console → Functions → scheduledSitemapGeneration

### 2. **Provider Changes** (Real-time)
- Function: `onProviderChange`
- Triggers when a provider is created/updated in Firestore
- Only regenerates if provider is public (`isVisible: true`, `isApproved: true`)

---

## 📊 Monitoring Dashboard

### Check Generation Status

**Via Firestore:**
```javascript
// In Firebase Console → Firestore → sitemap_logs
// Latest document shows:
{
  timestamp: Timestamp,
  status: "success" | "partial",
  level1Count: 9,
  level2Count: 50, // number of countries with providers
  totalFiles: 60,
  totalSize: 1234567, // bytes
  duration: 45000, // milliseconds
  sitemapIndexUrl: "https://sosexpats.com/sitemaps/sitemap-index.xml.gz",
  errors: [] // if any
}
```

### Check Function Execution

**Via Firebase Console:**
1. Go to **Functions → generateSitemaps**
2. Click on "Logs" tab
3. See execution history and logs

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Function deployed successfully
- [ ] HTTP endpoint accessible
- [ ] Files created in Storage (`sitemaps/` folder)
- [ ] Firestore log entry created (`sitemap_logs` collection)
- [ ] Sitemap index accessible via URL
- [ ] Search engines notified (check logs for "✅ Submitted to Google/Bing/Yandex")
- [ ] No errors in function logs

---

## 🐛 Troubleshooting

### Problem: No files in Storage

**Check:**
1. Function logs for errors
2. Storage bucket permissions
3. Function has Storage admin access

**Solution:**
```bash
# Check function logs
firebase functions:log --only generateSitemaps

# Redeploy with correct permissions
firebase deploy --only functions:generateSitemaps
```

### Problem: Function times out

**Check:**
- Number of providers (too many = slow)
- Function timeout settings

**Solution:**
- Increase timeout in `firebase.json` or function config
- Consider pagination for large datasets

### Problem: Sitemaps not accessible via URL

**Check:**
- Firebase Hosting rewrite rules
- Storage bucket CORS settings
- File permissions

**Solution:**
- Update `firebase.json` hosting rules (see below)
- Ensure Storage bucket allows public read access

---

## ⚙️ Configuration

### Update firebase.json for Sitemap Serving

Add this to your `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/sitemaps/**",
        "run": {
          "serviceId": "storage",
          "region": "europe-west1"
        }
      }
    ],
    "headers": [
      {
        "source": "/sitemaps/*.xml.gz",
        "headers": [
          {
            "key": "Content-Type",
            "value": "application/xml"
          },
          {
            "key": "Content-Encoding",
            "value": "gzip"
          },
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600"
          }
        ]
      }
    ]
  }
}
```

### Update robots.txt

Make sure your `public/robots.txt` includes:

```
Sitemap: https://sosexpats.com/sitemaps/sitemap-index.xml.gz
```

---

## 📈 Expected Results

After successful generation, you should have:

- **Level 1:** 9 files (one per language-country: fr-fr, en-us, es-es, etc.)
- **Level 2:** ~50-200 files (one per country with providers)
- **Level 3:** 1 file (sitemap-index.xml.gz)
- **Total:** ~60-210 files in Storage

**File Sizes:**
- Individual sitemaps: 10-500 KB (gzipped)
- Index file: 1-10 KB (gzipped)
- Total: Usually under 50 MB

---

## 🚀 Next Steps

1. **Verify in Google Search Console:**
   - Submit sitemap: `https://sosexpats.com/sitemaps/sitemap-index.xml.gz`
   - Check indexing status

2. **Monitor Regularly:**
   - Check `sitemap_logs` collection weekly
   - Verify files are being updated

3. **Set Up Alerts (Optional):**
   - Create Cloud Monitoring alerts for function failures
   - Set up email notifications for errors

---

## 📞 Quick Commands Reference

```bash
# Deploy sitemap functions
firebase deploy --only functions:generateSitemaps,functions:onProviderChange,functions:scheduledSitemapGeneration

# Check logs
firebase functions:log --only generateSitemaps --limit 20

# Test HTTP endpoint
curl https://europe-west1-YOUR_PROJECT.cloudfunctions.net/generateSitemaps

# Check Storage files (via gcloud)
gcloud storage ls gs://YOUR_BUCKET/sitemaps/

# View Firestore logs
# Go to Firebase Console → Firestore → sitemap_logs
```

---

## ✅ Success Indicators

You'll know sitemaps are working when:

1. ✅ Files appear in Firebase Storage (`sitemaps/` folder)
2. ✅ Log entry in Firestore (`sitemap_logs` collection)
3. ✅ Function logs show "✅ Sitemap generation complete!"
4. ✅ Sitemap index is accessible: `https://sosexpats.com/sitemaps/sitemap-index.xml.gz`
5. ✅ Search engines respond with success (check logs)

**No manual checking needed** - everything is logged automatically! 🎉


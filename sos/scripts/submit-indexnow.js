/**
 * submit-indexnow.js
 * Submits all static URLs to the IndexNow API (Bing, Yandex, Seznam).
 * IndexNow engines index in <24h and indirectly signal Google to crawl faster.
 *
 * Key: sosexpat2025indexnowkey (already published at https://sos-expat.com/sosexpat2025indexnowkey.txt)
 *
 * Usage:
 *   node scripts/submit-indexnow.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEXNOW_KEY = 'sosexpat2025indexnowkey';
const SITE_HOST = 'sos-expat.com';
const SITE_BASE = `https://${SITE_HOST}`;
const BATCH_SIZE = 100; // IndexNow max per request

// Endpoints: api.indexnow.org (Bing) requires Bing Webmaster Tools verification.
// Yandex and Seznam accept submissions without pre-registration.
const INDEXNOW_ENDPOINTS = [
  'https://yandex.com/indexnow',
  'https://search.seznam.cz/indexnow',
];

// ─── Parse sitemap-static.xml for all <loc> URLs ────────────────────────────

function extractUrlsFromSitemap(xmlContent) {
  const urls = [];
  const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xmlContent)) !== null) {
    const url = match[1].trim();
    // Only submit canonical URLs (loc), not hreflang alternates
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

// ─── Submit a batch of URLs to one IndexNow endpoint ────────────────────────

async function submitBatch(endpoint, urlList, batchIndex, totalBatches) {
  const body = JSON.stringify({
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    urlList,
  });

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body,
    });

    if (res.ok || res.status === 202) {
      console.log(`  ✅ [${endpoint}] Batch ${batchIndex}/${totalBatches} — ${urlList.length} URLs — HTTP ${res.status}`);
      return true;
    } else {
      const text = await res.text().catch(() => '');
      console.warn(`  ⚠️  [${endpoint}] Batch ${batchIndex}/${totalBatches} — HTTP ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ [${endpoint}] Batch ${batchIndex}/${totalBatches} — ${err.message}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap-static.xml');

  if (!fs.existsSync(sitemapPath)) {
    console.error(`❌ Sitemap not found: ${sitemapPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(sitemapPath, 'utf-8');
  const urls = extractUrlsFromSitemap(xml);

  if (urls.length === 0) {
    console.error('❌ No URLs found in sitemap-static.xml');
    process.exit(1);
  }

  console.log(`\n📡 IndexNow Submission`);
  console.log(`   Endpoints : ${INDEXNOW_ENDPOINTS.join(', ')}`);
  console.log(`   Key       : ${INDEXNOW_KEY}`);
  console.log(`   URLs found: ${urls.length}`);
  console.log(`   Batch size: ${BATCH_SIZE}\n`);

  // Split into batches
  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  let totalSuccessCount = 0;
  let totalAttempts = 0;

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    console.log(`\n→ Submitting to ${endpoint}`);
    let endpointSuccess = 0;
    for (let i = 0; i < batches.length; i++) {
      const ok = await submitBatch(endpoint, batches[i], i + 1, batches.length);
      if (ok) endpointSuccess += batches[i].length;
      totalAttempts += batches[i].length;
      if (i < batches.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    totalSuccessCount += endpointSuccess;
    console.log(`   → ${endpointSuccess}/${urls.length} URLs accepted`);
  }

  console.log(`\n📊 Total: ${totalSuccessCount}/${urls.length * INDEXNOW_ENDPOINTS.length} accepted across ${INDEXNOW_ENDPOINTS.length} endpoints`);

  if (totalSuccessCount === 0) {
    console.error('❌ No URLs were submitted successfully');
    process.exit(1);
  } else {
    console.log('✅ Done — Yandex/Seznam will crawl these within 24h');
    console.log('   💡 Tip: Now run `npm run warm-ssr` to pre-warm the SSR cache for Googlebot');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

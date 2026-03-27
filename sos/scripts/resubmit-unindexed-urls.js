/**
 * resubmit-unindexed-urls.js
 * Soumission massive d'URLs non indexees a Google Indexing API + IndexNow.
 * Lit un fichier texte d'URLs (une par ligne) et :
 *   - Soumet TOUTES les URLs a IndexNow (Bing/Yandex/Seznam) en batches de 100
 *   - Soumet les 200 premieres a Google Indexing API (quota quotidien)
 *   - Ecrit les URLs restantes dans un fichier pour reexecution le lendemain
 *
 * Usage:
 *   node scripts/resubmit-unindexed-urls.js --file urls-to-resubmit.txt
 *   node scripts/resubmit-unindexed-urls.js --file urls-to-resubmit.txt --dry-run
 *   node scripts/resubmit-unindexed-urls.js --file urls-to-resubmit.txt --skip-google
 *   node scripts/resubmit-unindexed-urls.js --file urls-to-resubmit.txt --skip-indexnow
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const INDEXING_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/indexing';

const GOOGLE_DAILY_LIMIT = 200;
const GOOGLE_DELAY_MS = 300;

const INDEXNOW_KEY = 'sosexpat2025indexnowkey';
const SITE_HOST = 'sos-expat.com';
const INDEXNOW_BATCH_SIZE = 100;
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://yandex.com/indexnow',
  'https://search.seznam.cz/indexnow',
];

// ─── JWT RS256 (natif Node.js crypto) ────────────────────────────────────────

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = base64url(sign.sign(serviceAccount.private_key));
  return `${unsigned}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = createJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Authentification echouee (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Google Indexing API ─────────────────────────────────────────────────────

async function submitGoogleUrl(url, token) {
  try {
    const res = await fetch(INDEXING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.status === 200, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: { message: err.message } } };
  }
}

// ─── IndexNow ────────────────────────────────────────────────────────────────

async function submitIndexNowBatch(endpoint, urlList, batchIndex, totalBatches) {
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
      console.log(`  [OK] [${endpoint}] Batch ${batchIndex}/${totalBatches} — ${urlList.length} URLs — HTTP ${res.status}`);
      return true;
    } else {
      const text = await res.text().catch(() => '');
      console.warn(`  [WARN] [${endpoint}] Batch ${batchIndex}/${totalBatches} — HTTP ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
  } catch (err) {
    console.error(`  [ERR] [${endpoint}] Batch ${batchIndex}/${totalBatches} — ${err.message}`);
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readUrlsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.startsWith('http'));
}

function getDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const filePath = fileIndex !== -1 && args[fileIndex + 1] ? args[fileIndex + 1] : null;
  const dryRun = args.includes('--dry-run');
  const skipGoogle = args.includes('--skip-google');
  const skipIndexNow = args.includes('--skip-indexnow');
  return { filePath, dryRun, skipGoogle, skipIndexNow };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { filePath, dryRun, skipGoogle, skipIndexNow } = parseArgs();

  console.log('\n=== Resubmit Unindexed URLs — Google Indexing API + IndexNow ===');
  console.log('='.repeat(60));

  if (!filePath) {
    console.error('\nUsage: node scripts/resubmit-unindexed-urls.js --file <fichier-urls.txt>');
    console.error('\nOptions:');
    console.error('  --dry-run       Affiche les URLs sans soumettre');
    console.error('  --skip-google   Ne soumet pas a Google (IndexNow seulement)');
    console.error('  --skip-indexnow Ne soumet pas a IndexNow (Google seulement)');
    process.exit(1);
  }

  // Resoudre le chemin du fichier (relatif au cwd ou absolu)
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`\nFichier introuvable : ${resolvedPath}`);
    process.exit(1);
  }

  const urls = readUrlsFromFile(resolvedPath);
  console.log(`\nFichier : ${resolvedPath}`);
  console.log(`URLs trouvees : ${urls.length}`);

  if (urls.length === 0) {
    console.error('Aucune URL valide trouvee dans le fichier.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n[DRY-RUN] ${urls.length} URLs trouvees :\n`);
    urls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
    console.log(`\nIndexNow : ${urls.length} URLs seraient soumises (${Math.ceil(urls.length / INDEXNOW_BATCH_SIZE)} batches)`);
    console.log(`Google   : ${Math.min(urls.length, GOOGLE_DAILY_LIMIT)} URLs seraient soumises (quota: ${GOOGLE_DAILY_LIMIT}/jour)`);
    if (urls.length > GOOGLE_DAILY_LIMIT) {
      console.log(`Restantes: ${urls.length - GOOGLE_DAILY_LIMIT} URLs`);
    }
    console.log('\n(aucune requete envoyee)');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1 : IndexNow (toutes les URLs, pas de limite quotidienne)
  // ═══════════════════════════════════════════════════════════════════════════

  let indexNowSuccess = 0;
  let indexNowTotal = 0;

  if (!skipIndexNow) {
    console.log('\n--- Phase 1 : IndexNow (Bing, Yandex, Seznam) ---');
    console.log(`Endpoints : ${INDEXNOW_ENDPOINTS.join(', ')}`);
    console.log(`Batches   : ${Math.ceil(urls.length / INDEXNOW_BATCH_SIZE)} x ${INDEXNOW_BATCH_SIZE} URLs max\n`);

    const batches = [];
    for (let i = 0; i < urls.length; i += INDEXNOW_BATCH_SIZE) {
      batches.push(urls.slice(i, i + INDEXNOW_BATCH_SIZE));
    }

    for (const endpoint of INDEXNOW_ENDPOINTS) {
      console.log(`\n-> ${endpoint}`);
      let endpointSuccess = 0;

      for (let i = 0; i < batches.length; i++) {
        const ok = await submitIndexNowBatch(endpoint, batches[i], i + 1, batches.length);
        if (ok) endpointSuccess += batches[i].length;
        indexNowTotal += batches[i].length;

        if (i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      indexNowSuccess += endpointSuccess;
      console.log(`   -> ${endpointSuccess}/${urls.length} URLs acceptees`);
    }
  } else {
    console.log('\n--- Phase 1 : IndexNow — SKIP (--skip-indexnow) ---');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2 : Google Indexing API (200 premieres URLs, quota quotidien)
  // ═══════════════════════════════════════════════════════════════════════════

  let googleOk = 0;
  let googleFail = 0;
  const googleUrls = urls.slice(0, GOOGLE_DAILY_LIMIT);
  const remainingUrls = urls.slice(GOOGLE_DAILY_LIMIT);

  if (!skipGoogle) {
    console.log('\n--- Phase 2 : Google Indexing API ---');
    console.log(`Quota quotidien : ${GOOGLE_DAILY_LIMIT} URLs`);
    console.log(`A soumettre     : ${googleUrls.length} URLs`);

    if (remainingUrls.length > 0) {
      console.log(`Restantes       : ${remainingUrls.length} URLs (a reexecuter demain)`);
    }

    // Verification du service account
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error(`\nFichier service account introuvable : ${SERVICE_ACCOUNT_PATH}`);
      console.error('Voir les instructions dans submit-google-indexing.js');
      console.error('Google Indexing API ignore. IndexNow a ete traite.\n');
    } else {
      const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
      console.log(`Service account : ${serviceAccount.client_email}`);

      process.stdout.write('\nAuthentification JWT... ');
      const token = await getAccessToken(serviceAccount);
      console.log('OK');

      console.log(`\nSoumission de ${googleUrls.length} URLs a Google...\n`);

      for (let i = 0; i < googleUrls.length; i++) {
        const url = googleUrls[i];
        const result = await submitGoogleUrl(url, token);

        if (result.ok) {
          googleOk++;
          console.log(`  [OK] [${i + 1}/${googleUrls.length}] ${url}`);
        } else {
          googleFail++;
          const msg = result.data?.error?.message || JSON.stringify(result.data).slice(0, 120);
          console.warn(`  [FAIL] [${i + 1}/${googleUrls.length}] HTTP ${result.status} — ${msg}`);
          console.warn(`         URL : ${url}`);
        }

        if (i < googleUrls.length - 1) {
          await new Promise(r => setTimeout(r, GOOGLE_DELAY_MS));
        }
      }
    }
  } else {
    console.log('\n--- Phase 2 : Google Indexing API — SKIP (--skip-google) ---');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3 : Ecrire les URLs restantes
  // ═══════════════════════════════════════════════════════════════════════════

  let remainingFile = null;

  if (remainingUrls.length > 0 && !skipGoogle) {
    const dateStr = getDateString();
    remainingFile = path.join(__dirname, `urls-remaining-${dateStr}.txt`);
    fs.writeFileSync(remainingFile, remainingUrls.join('\n') + '\n', 'utf-8');
    console.log(`\nURLs restantes ecrites dans : ${remainingFile}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Resume
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(60));
  console.log('RESUME');
  console.log('='.repeat(60));

  if (!skipIndexNow) {
    const avgPerEndpoint = Math.round(indexNowSuccess / INDEXNOW_ENDPOINTS.length);
    console.log(`IndexNow : ${avgPerEndpoint}/${urls.length} URLs soumises (${INDEXNOW_ENDPOINTS.length} endpoints: Bing, Yandex, Seznam)`);
  }

  if (!skipGoogle) {
    console.log(`Google   : ${googleOk}/${urls.length} URLs soumises (quota quotidien: ${GOOGLE_DAILY_LIMIT})`);
    if (googleFail > 0) {
      console.log(`           ${googleFail} echecs`);
    }
  }

  if (remainingUrls.length > 0 && !skipGoogle) {
    console.log(`Restantes: ${remainingUrls.length} URLs -> ${remainingFile}`);
    console.log(`\nReexecutez demain : node scripts/resubmit-unindexed-urls.js --file ${remainingFile}`);
  } else if (remainingUrls.length === 0 && !skipGoogle) {
    console.log('\nToutes les URLs ont ete soumises a Google. Rien a reexecuter.');
  }

  console.log('');
}

main().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});

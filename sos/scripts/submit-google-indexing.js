/**
 * submit-google-indexing.js
 * Notifie Google Indexing API des URLs à crawler/recrawler.
 * Authentification via service account (JWT RS256, natif Node.js — aucune dépendance externe).
 * Limite Google: 200 requêtes/jour par propriété.
 *
 * ─── Setup (une seule fois) ────────────────────────────────────────────────
 *  1. Google Cloud Console → APIs & Services → Bibliothèque → activer "Web Search Indexing API"
 *  2. IAM et admin → Comptes de service → Créer un compte → Télécharger la clé JSON
 *  3. Sauvegarder sous : sos/scripts/service-account.json  (déjà dans .gitignore)
 *  4. Google Search Console → Paramètres → Utilisateurs et autorisations
 *     → Ajouter l'email du service account comme PROPRIÉTAIRE pour https://sos-expat.com
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   node scripts/submit-google-indexing.js              # toutes les URLs du sitemap (max 200/jour)
 *   node scripts/submit-google-indexing.js --new-only   # 9 URLs captain landing uniquement
 *   node scripts/submit-google-indexing.js --dry-run    # affiche les URLs sans soumettre
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap-static.xml');
const INDEXING_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/indexing';
const DAILY_LIMIT = 200;
const DELAY_MS = 300; // ~3 req/sec, bien en dessous du burst limit

// ─── URLs prioritaires : captain landing (9 langues) ──────────────────────
// Utilisées avec --new-only pour notifier Google du nouveau contenu
const CAPTAIN_URLS = [
  'https://sos-expat.com/fr-fr/devenir-capitaine',
  'https://sos-expat.com/en-us/become-captain',
  'https://sos-expat.com/es-es/ser-capitan',
  'https://sos-expat.com/de-de/kapitaen-werden',
  'https://sos-expat.com/pt-pt/tornar-se-capitao',
  'https://sos-expat.com/ru-ru/stat-kapitanom',
  'https://sos-expat.com/zh-cn/chengwei-duizhang',
  'https://sos-expat.com/ar-sa/كن-قائدا',
  'https://sos-expat.com/hi-in/captain-bane',
];

// ─── JWT RS256 (natif Node.js crypto) ─────────────────────────────────────

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

// ─── Échange JWT → access token OAuth2 ────────────────────────────────────

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
    throw new Error(`Authentification échouée (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.access_token;
}

// ─── Soumettre une URL ─────────────────────────────────────────────────────

async function submitUrl(url, token) {
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
}

// ─── Extraire les <loc> du sitemap ────────────────────────────────────────

function extractUrlsFromSitemap(xmlContent) {
  const urls = [];
  const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xmlContent)) !== null) {
    const url = match[1].trim();
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const newOnly = process.argv.includes('--new-only');
  const dryRun = process.argv.includes('--dry-run');

  console.log('\n🔍 Google Indexing API — SOS Expat');
  console.log('─'.repeat(50));

  // Vérification credentials
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`\n❌ Fichier service account introuvable :`);
    console.error(`   ${SERVICE_ACCOUNT_PATH}\n`);
    console.error('📋 Instructions setup (une seule fois) :');
    console.error('');
    console.error('   Étape 1 — Activer l\'API');
    console.error('   → https://console.cloud.google.com/apis/library/indexing.googleapis.com');
    console.error('   → Projet : sos-urgently-ac307 → Activer\n');
    console.error('   Étape 2 — Créer le service account');
    console.error('   → IAM et admin → Comptes de service → Créer');
    console.error('   → Nom : sos-expat-indexing');
    console.error('   → Clés → Ajouter une clé → JSON → Télécharger');
    console.error('   → Sauvegarder sous : sos/scripts/service-account.json\n');
    console.error('   Étape 3 — Ajouter comme propriétaire dans GSC');
    console.error('   → https://search.google.com/search-console/users');
    console.error('   → Propriété : https://sos-expat.com/');
    console.error('   → Ajouter utilisateur → coller l\'email du service account → Propriétaire\n');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  console.log(`\n🔑 Service account : ${serviceAccount.client_email}`);

  // Sélection des URLs
  let urls;
  if (newOnly) {
    urls = CAPTAIN_URLS;
    console.log(`📋 Mode : --new-only → ${urls.length} URLs captain landing`);
  } else {
    if (!fs.existsSync(SITEMAP_PATH)) {
      console.error(`❌ Sitemap introuvable : ${SITEMAP_PATH}`);
      process.exit(1);
    }
    const xml = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    urls = extractUrlsFromSitemap(xml);
    console.log(`📋 Mode : sitemap complet → ${urls.length} URLs trouvées`);
  }

  if (urls.length === 0) {
    console.error('❌ Aucune URL trouvée.');
    process.exit(1);
  }

  if (urls.length > DAILY_LIMIT) {
    console.warn(`\n⚠️  ${urls.length} URLs > limite journalière (${DAILY_LIMIT}).`);
    console.warn(`   Seules les ${DAILY_LIMIT} premières seront soumises.`);
    console.warn('   Relancez demain pour le reste.\n');
    urls = urls.slice(0, DAILY_LIMIT);
  }

  if (dryRun) {
    console.log(`\n🔵 Dry-run — ${urls.length} URLs qui seraient soumises :\n`);
    urls.forEach((url, i) => console.log(`   ${i + 1}. ${url}`));
    console.log('\n(aucune requête envoyée à Google)');
    return;
  }

  // Authentification
  process.stdout.write('\n🔐 Authentification JWT... ');
  const token = await getAccessToken(serviceAccount);
  console.log('✅');

  console.log(`\n📡 Soumission de ${urls.length} URLs...\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const { status, data } = await submitUrl(url, token);

    if (status === 200) {
      ok++;
      console.log(`  ✅ [${i + 1}/${urls.length}] ${url}`);
    } else {
      fail++;
      const msg = data?.error?.message || JSON.stringify(data).slice(0, 120);
      console.warn(`  ❌ [${i + 1}/${urls.length}] HTTP ${status} — ${msg}`);
      console.warn(`     URL : ${url}`);
    }

    if (i < urls.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 Résultats : ${ok} soumis ✅  ${fail} échoués ❌`);

  if (ok > 0) {
    console.log('\n✅ Google crawlera ces URLs dans les 24-48h.');
    console.log('   Suivi : Google Search Console → Inspection d\'URL → Demander l\'indexation');
    if (!newOnly) {
      console.log('   💡 Prochaine étape : npm run warm-ssr (une fois le billing résolu)');
    }
  }

  if (fail > 0) {
    console.log('\n⚠️  Pour les erreurs 403 : vérifier que le service account est bien PROPRIÉTAIRE dans GSC.');
    console.log('   Pour les erreurs 429 : limite journalière atteinte, relancer demain.');
  }
}

main().catch(err => {
  console.error('\n💥 Erreur fatale :', err.message);
  process.exit(1);
});

/**
 * Import des 3 communiqués de presse × 9 langues dans Firestore + Firebase Storage
 *
 * Usage : node scripts/import-press-releases.cjs
 *         node scripts/import-press-releases.cjs --dry-run
 *
 * Stockage :
 *   • HTML → Firebase Storage : press/releases/{docId}/html/{lang}.html
 *   • Métadonnées → Firestore  : press_releases/{docId}
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const STORAGE_BUCKET = 'sos-urgently-ac307.firebasestorage.app';
const HTML_DIR = path.join(
  __dirname,
  '../../communiqués de presse/SOS-Expat_HTML_27fichiers/press_kit_html'
);

// Compte de service admin (droits complets Firestore + Storage)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../serviceAccount.json');

// Correspondance suffixe fichier → code langue Firestore
const LANG_MAP = {
  FR: 'fr',
  EN: 'en',
  ES: 'es',
  DE: 'de',
  PT: 'pt',
  RU: 'ru',
  ZH: 'ch', // admin utilise "ch" pour le chinois
  HI: 'hi',
  AR: 'ar',
};

const ALL_LANGS = Object.keys(LANG_MAP);

// Définition des 3 communiqués
const COMMUNIQUES = [
  {
    key: 'CP1',
    filenamePrefix: 'SOS-Expat_CP1_Grand_Public',
    slugBase: 'sos-expat-service-urgence-mondial',
    tags: ['urgence', 'expatries', 'grand-public', 'lancement', '2026'],
    publishedAt: new Date('2026-04-05T08:00:00Z'),
  },
  {
    key: 'CP2',
    filenamePrefix: 'SOS-Expat_CP2_Economie_Innovation',
    slugBase: 'sos-expat-economie-innovation-modele',
    tags: ['economie', 'innovation', 'marche', 'modele', 'investissement'],
    publishedAt: new Date('2026-04-05T08:00:00Z'),
  },
  {
    key: 'CP3',
    filenamePrefix: 'SOS-Expat_CP3_Partenaires',
    slugBase: 'sos-expat-partenaires-avocats-recrutement',
    tags: ['partenaires', 'avocats', 'recrutement', 'revenus'],
    publishedAt: new Date('2026-04-05T08:00:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────
// FIREBASE INIT
// ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ service-account.json introuvable : ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─────────────────────────────────────────────────────────────────
// EXTRACTION HTML → TEXTE
// ─────────────────────────────────────────────────────────────────

function extractTitle(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!match) return '';
  return match[1]
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDeck(html) {
  // "deck" = premier paragraphe introductif sous le h1
  const match = html.match(/<p class="deck">([\s\S]*?)<\/p>/);
  if (!match) return '';
  return match[1]
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<strong>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContent(html) {
  // Extrait le texte complet : deck + toutes les sections
  const parts = [];

  // Deck
  const deckMatch = html.match(/<p class="deck">([\s\S]*?)<\/p>/);
  if (deckMatch) {
    parts.push(
      deckMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  // Sections numérotées
  const sectionRegex = /<section class="section">([\s\S]*?)<\/section>/g;
  let sectionMatch;
  while ((sectionMatch = sectionRegex.exec(html)) !== null) {
    const raw = sectionMatch[1];

    // h2 titre de section
    const h2 = raw.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    if (h2) {
      const title = h2[1].replace(/<[^>]+>/g, '').trim();
      parts.push(`\n## ${title}`);
    }

    // Paragraphes principaux
    const pRegex = /<p(?:\s[^>]*)?>(?!<)([\s\S]*?)<\/p>/g;
    let pMatch;
    while ((pMatch = pRegex.exec(raw)) !== null) {
      const text = pMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<strong>/gi, '')
        .replace(/<\/strong>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 20) parts.push(text);
    }

    // Steps (étapes)
    const stepRegex = /<div class="step[^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
    let stepMatch;
    while ((stepMatch = stepRegex.exec(raw)) !== null) {
      const stepTitle = stepMatch[1].replace(/<[^>]+>/g, '').trim();
      const stepDesc = stepMatch[2].replace(/<[^>]+>/g, '').trim();
      if (stepTitle) parts.push(`• ${stepTitle} — ${stepDesc}`);
    }

    // Breakthroughs
    const btRegex = /<div class="bt-text">([\s\S]*?)<\/div>/g;
    let btMatch;
    while ((btMatch = btRegex.exec(raw)) !== null) {
      const text = btMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (text) parts.push(`→ ${text}`);
    }
  }

  // Citation fondateur
  const quoteMatch = html.match(/<blockquote>([\s\S]*?)<\/blockquote>/);
  if (quoteMatch) {
    const quote = quoteMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    parts.push(`\n"${quote}"\n— Williams Jullin, Fondateur & CEO`);
  }

  return parts
    .filter(Boolean)
    .join('\n\n')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────────────
// UPLOAD HTML → FIREBASE STORAGE
// ─────────────────────────────────────────────────────────────────

async function uploadHtml(docId, langCode, htmlContent) {
  const storagePath = `press/releases/${docId}/html/${langCode}.html`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(htmlContent, 'utf8'), {
    contentType: 'text/html; charset=utf-8',
    metadata: {
      cacheControl: 'public, max-age=86400', // 24h cache
      'x-robots-tag': 'noindex',             // éviter duplicate content Google
    },
  });

  // URL publique signée (token Firebase Storage)
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2030', // valable jusqu'en 2030
  });

  return url;
}

// ─────────────────────────────────────────────────────────────────
// IMPORT PRINCIPAL
// ─────────────────────────────────────────────────────────────────

async function importCommunique(cp) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📰 Traitement : ${cp.key} — ${cp.filenamePrefix}`);
  console.log(`${'─'.repeat(60)}`);

  const title = {};
  const summary = {};
  const content = {};
  const slug = {};
  const htmlUrl = {};

  for (const fileLang of ALL_LANGS) {
    const langCode = LANG_MAP[fileLang];
    const filename = `${cp.filenamePrefix}_${fileLang}.html`;
    const filepath = path.join(HTML_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.warn(`  ⚠️  Fichier manquant : ${filename}`);
      continue;
    }

    const html = fs.readFileSync(filepath, 'utf8');

    title[langCode] = extractTitle(html);
    summary[langCode] = extractDeck(html);
    content[langCode] = extractContent(html);

    // Slug : ASCII uniquement (règle mémoire)
    const NON_LATIN = new Set(['ru', 'ch', 'hi', 'ar']);
    if (NON_LATIN.has(langCode)) {
      slug[langCode] = `${langCode}-${cp.slugBase}`;
    } else {
      slug[langCode] = `${langCode !== 'fr' ? langCode + '-' : ''}${cp.slugBase}`;
    }

    console.log(`  ✓ [${fileLang}→${langCode}] "${title[langCode].slice(0, 50)}..."`);
  }

  // ── Créer le document Firestore (avec ID connu)
  const docRef = db.collection('press_releases').doc();
  const docId = docRef.id;
  console.log(`\n  📄 Firestore ID : ${docId}`);

  // ── Upload HTML → Firebase Storage (optionnel, nécessite Storage write permissions)
  if (!DRY_RUN) {
    console.log('\n  📤 Upload des fichiers HTML vers Firebase Storage...');
    for (const fileLang of ALL_LANGS) {
      const langCode = LANG_MAP[fileLang];
      const filename = `${cp.filenamePrefix}_${fileLang}.html`;
      const filepath = path.join(HTML_DIR, filename);
      if (!fs.existsSync(filepath)) continue;

      const html = fs.readFileSync(filepath, 'utf8');
      try {
        const url = await uploadHtml(docId, langCode, html);
        htmlUrl[langCode] = url;
        console.log(`     ✓ [${fileLang}] → Storage OK`);
      } catch (err) {
        // Compte de service sans droits Storage — on ignore, htmlUrl sera vide
        // Les fichiers peuvent être uploadés via /admin/press/releases
        console.warn(`     ⚠️  [${fileLang}] Storage non accessible (ajoute via admin) : ${err.message?.slice(0, 80)}`);
      }
    }
  } else {
    console.log('  [DRY-RUN] Upload Storage ignoré');
  }

  // ── Sauvegarder en Firestore
  const docData = {
    title,
    summary,
    content,
    slug,
    htmlUrl,
    pdfUrl: {},          // pas de PDF pour l'instant
    tags: cp.tags,
    publishedAt: admin.firestore.Timestamp.fromDate(cp.publishedAt),
    isActive: true,
    imageUrl: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!DRY_RUN) {
    await docRef.set(docData);
    console.log(`\n  ✅ Firestore créé : press_releases/${docId}`);
  } else {
    console.log('\n  [DRY-RUN] Document Firestore :');
    console.log(JSON.stringify({ id: docId, langues: Object.keys(title), tags: cp.tags }, null, 2));
  }

  return docId;
}

// ─────────────────────────────────────────────────────────────────
// POINT D'ENTRÉE
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   IMPORT COMMUNIQUÉS DE PRESSE — SOS-Expat                ║');
  console.log('║   Firestore (press_releases) + Firebase Storage            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (DRY_RUN) {
    console.log('\n⚠️  MODE DRY-RUN — Aucune donnée ne sera écrite\n');
  }

  // Vérifier que le dossier HTML existe
  if (!fs.existsSync(HTML_DIR)) {
    console.error(`\n❌ Dossier HTML introuvable : ${HTML_DIR}`);
    process.exit(1);
  }

  const createdIds = [];

  for (const cp of COMMUNIQUES) {
    try {
      const docId = await importCommunique(cp);
      createdIds.push({ cp: cp.key, id: docId });
    } catch (err) {
      console.error(`\n❌ Erreur sur ${cp.key} : ${err.message}`);
      console.error(err.stack);
    }
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   RÉSUMÉ                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  for (const { cp, id } of createdIds) {
    console.log(`  ${cp} → press_releases/${id}`);
  }
  console.log(`\n  ✅ ${createdIds.length}/3 communiqués importés`);
  console.log('  📍 Visibles sur https://sos-expat.com/presse (section Communiqués)');
  console.log('  🔧 Admin : /admin/press/releases\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err);
  process.exit(1);
});

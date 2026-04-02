#!/usr/bin/env node
/**
 * translate-faqs.cjs
 *
 * Traduit les FAQ Firestore manquantes via Claude API (claude-haiku-4-5-20251001).
 * Pour chaque FAQ, pour chaque langue sans contenu, génère question + answer + slug natifs.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node translate-faqs.cjs
 *   # ou avec le service account Firebase :
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json ANTHROPIC_API_KEY=sk-ant-... node translate-faqs.cjs
 *
 * Options:
 *   --dry-run     : affiche les traductions sans écrire dans Firestore
 *   --lang=es,de  : ne traiter que ces langues (défaut : toutes sauf fr)
 *   --limit=3     : ne traiter que N FAQ (pour tests)
 */

'use strict';

const admin = require('firebase-admin');
const https = require('https');
const path = require('path');

// ─── Config ────────────────────────────────────────────────────────────────
const PROJECT_ID = 'sos-urgently-ac307';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const a = process.argv.find(x => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : Infinity;
})();
const ONLY_LANGS = (() => {
  const a = process.argv.find(x => x.startsWith('--lang='));
  return a ? a.split('=')[1].split(',') : null;
})();

// Langues cibles (fr est la source, toujours présente)
const ALL_LANGS = ['en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];
const TARGET_LANGS = ONLY_LANGS ? ONLY_LANGS.filter(l => ALL_LANGS.includes(l)) : ALL_LANGS;

const LANG_NAMES = {
  en: 'English', es: 'Spanish (Español)', de: 'German (Deutsch)',
  pt: 'Portuguese (Português)', ru: 'Russian (Русский)',
  ch: 'Simplified Chinese (中文简体)', hi: 'Hindi (हिन्दी)', ar: 'Arabic (العربية)',
};

// Translittération pour slugs ASCII (non-Latin → ASCII romanisé)
const SLUG_PREFIXES = { ru: 'ru', ar: 'ar', ch: 'zh', hi: 'hi' };

// ─── Firebase Admin Init ────────────────────────────────────────────────────
if (!admin.apps.length) {
  try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
    console.log('[Firebase] Initialized with service account');
  } catch (e) {
    admin.initializeApp({ projectId: PROJECT_ID });
    console.log('[Firebase] Initialized with application default credentials');
  }
}
const db = admin.firestore();

// ─── Claude API ─────────────────────────────────────────────────────────────
function claudeRequest(messages, systemPrompt) {
  return new Promise((resolve, reject) => {
    if (!ANTHROPIC_API_KEY) {
      reject(new Error('ANTHROPIC_API_KEY is not set. Set it as env var before running this script.'));
      return;
    }

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const text = parsed.content?.[0]?.text || '';
          resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse Claude response: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Translation ─────────────────────────────────────────────────────────────
async function translateFAQ(frQuestion, frAnswer, targetLang) {
  const langName = LANG_NAMES[targetLang] || targetLang;
  const isNonLatin = ['ru', 'ar', 'ch', 'hi'].includes(targetLang);
  const slugPrefix = SLUG_PREFIXES[targetLang] || '';

  const systemPrompt = `Tu es un rédacteur natif ${langName} spécialisé expatriation internationale.
RÈGLES ABSOLUES :
1. JAMAIS traduction mot-à-mot. Question et réponse doivent sonner 100% naturelles, comme si un locuteur natif ${langName} les avait écrites.
2. La question doit être formulée comme un vrai utilisateur la taperait dans Google (naturelle, directe, conversationnelle).
3. La réponse conserve le sens exact mais adapte les formulations au contexte culturel ${langName}.
4. Le slug = ASCII romanisé UNIQUEMENT. JAMAIS de caractères Unicode dans le slug.${isNonLatin ? `\n   Pour ${langName} : utilise la translittération romaine, préfixe "${slugPrefix}-". Ex: "${slugPrefix}-difference-avocat-expat"` : ''}
5. Les tarifs (49€, 19€, $49, $19) et les durées (20 min, 30 min) restent inchangés.
6. Pour l'arabe : le texte de question/answer est en arabe (RTL), mais le slug est TOUJOURS en ASCII romanisé.
7. Réponds UNIQUEMENT avec un JSON valide sur une seule ligne, sans markdown, sans commentaires.

Format de réponse : {"question":"...","answer":"...","slug":"..."}`;

  const userMessage = `Traduis cette FAQ SOS-Expat du français vers ${langName} :

QUESTION FR: ${frQuestion}
ANSWER FR: ${frAnswer}

Retourne uniquement le JSON {"question":"...","answer":"...","slug":"..."} sans aucun autre texte.`;

  const raw = await claudeRequest(
    [{ role: 'user', content: userMessage }],
    systemPrompt
  );

  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in Claude response: ${raw.substring(0, 300)}`);

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.question || !parsed.answer || !parsed.slug) {
    throw new Error(`Invalid JSON structure: ${JSON.stringify(parsed)}`);
  }

  // Ensure slug is ASCII only (safety check)
  const asciiSlug = parsed.slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);

  return { question: parsed.question, answer: parsed.answer, slug: asciiSlug };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== FAQ Translation Script ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no Firestore writes)' : 'LIVE'}`);
  console.log(`Target languages: ${TARGET_LANGS.join(', ')}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'all' : LIMIT} FAQs\n`);

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY env var is required. Set it before running.');
    console.error('   Example: ANTHROPIC_API_KEY=sk-ant-... node translate-faqs.cjs');
    process.exit(1);
  }

  // Load all active FAQs
  const snapshot = await db.collection('app_faq').where('isActive', '==', true).get();
  const faqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${faqs.length} active FAQs from Firestore`);

  let processed = 0;
  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (const faq of faqs) {
    if (processed >= LIMIT) break;
    processed++;

    const frQuestion = faq.question?.fr || faq.question?.en;
    const frAnswer = faq.answer?.fr || faq.answer?.en;

    if (!frQuestion || !frAnswer) {
      console.log(`[FAQ ${faq.id}] ⚠️  No FR/EN content, skipping`);
      skipped++;
      continue;
    }

    console.log(`\n[FAQ ${processed}/${Math.min(faqs.length, LIMIT)}] "${frQuestion.substring(0, 60)}..."`);

    const updates = {};
    const newSlug = {};
    const newQuestion = {};
    const newAnswer = {};

    for (const lang of TARGET_LANGS) {
      const hasQuestion = faq.question?.[lang] && faq.question[lang].trim().length > 0;
      const hasAnswer = faq.answer?.[lang] && faq.answer[lang].trim().length > 0;
      const hasSlug = faq.slug?.[lang] && faq.slug[lang].trim().length > 0;

      if (hasQuestion && hasAnswer && hasSlug) {
        process.stdout.write(`  ${lang}: ✅ exists\n`);
        continue;
      }

      process.stdout.write(`  ${lang}: 🔄 translating...`);

      try {
        const result = await translateFAQ(frQuestion, frAnswer, lang);
        process.stdout.write(` ✅ "${result.question.substring(0, 40)}..." [${result.slug}]\n`);

        newQuestion[lang] = result.question;
        newAnswer[lang] = result.answer;
        newSlug[lang] = result.slug;
        translated++;
      } catch (err) {
        process.stdout.write(` ❌ ${err.message}\n`);
        errors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    // Build update object
    const hasUpdates = Object.keys(newQuestion).length > 0;
    if (hasUpdates && !DRY_RUN) {
      const updatePayload = {};
      for (const lang of Object.keys(newQuestion)) {
        updatePayload[`question.${lang}`] = newQuestion[lang];
        updatePayload[`answer.${lang}`] = newAnswer[lang];
        updatePayload[`slug.${lang}`] = newSlug[lang];
      }
      updatePayload['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();

      try {
        await db.collection('app_faq').doc(faq.id).update(updatePayload);
        console.log(`  💾 Saved ${Object.keys(newQuestion).length} new translations to Firestore`);
      } catch (err) {
        console.error(`  ❌ Failed to save: ${err.message}`);
        errors++;
      }
    } else if (hasUpdates && DRY_RUN) {
      console.log(`  [DRY RUN] Would save ${Object.keys(newQuestion).length} translations`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`FAQs processed: ${processed}`);
  console.log(`Translations created: ${translated}`);
  console.log(`Skipped (no source): ${skipped}`);
  console.log(`Errors: ${errors}`);
  if (DRY_RUN) console.log(`(DRY RUN — nothing was written to Firestore)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

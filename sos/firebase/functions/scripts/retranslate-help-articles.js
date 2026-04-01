#!/usr/bin/env node
/**
 * retranslate-help-articles.js
 * Retraduit le contenu (content + excerpt) des articles Help Center via Claude Haiku.
 * Cible les articles où content[lang] est vide ou identique au français.
 *
 * Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/retranslate-help-articles.js
 */

const admin = require('firebase-admin');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY env variable');
  process.exit(1);
}

admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const LANGS = ['en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];
const LANG_NAMES = {
  en: 'English', es: 'Spanish', de: 'German', ru: 'Russian',
  pt: 'Portuguese', ch: 'Simplified Chinese', hi: 'Hindi', ar: 'Arabic',
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Appel Claude Haiku avec retry sur 429
async function callClaude(prompt, maxTokens = 2000, attempt = 0) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (resp.status === 429) {
    if (attempt >= 5) throw new Error('Rate limit: max retries exceeded');
    const wait = Math.pow(2, attempt + 1) * 5000; // 10s, 20s, 40s, 80s, 160s
    console.log(`    ⏳ Rate limit 429, retry in ${wait/1000}s...`);
    await sleep(wait);
    return callClaude(prompt, maxTokens, attempt + 1);
  }

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude ${resp.status}: ${err.substring(0, 200)}`);
  }
  const data = await resp.json();
  return data.content[0].text.trim();
}

// Traduit le contenu markdown complet
async function translateContent(text, targetLang) {
  if (!text || text.trim().length === 0) return text;
  const langName = LANG_NAMES[targetLang] || targetLang;
  const prompt = `Translate the following help center article from French to ${langName}.
Keep all markdown formatting (##, ###, **, -, numbered lists) exactly as-is.
Return ONLY the translated markdown, no explanations.

${text}`;
  try {
    return await callClaude(prompt, 2000);
  } catch (e) {
    console.warn(`  ⚠ Claude error for ${targetLang}:`, e.message);
    return null;
  }
}

// Traduit excerpt (JSON court)
async function translateExcerpt(text, targetLang) {
  if (!text || text.trim().length === 0) return null;
  const langName = LANG_NAMES[targetLang] || targetLang;
  const prompt = `Translate this French text to ${langName}. Return ONLY the translation, nothing else.\n\n${text}`;
  try {
    return await callClaude(prompt, 300);
  } catch (e) {
    console.warn(`  ⚠ Claude excerpt error for ${targetLang}:`, e.message);
    return null;
  }
}

function needsTranslation(content, frContent) {
  if (!content || content.trim().length === 0) return true;
  if (content.trim() === (frContent || '').trim()) return true;
  return false;
}

async function main() {
  console.log('📚 Loading all help articles from Firestore...');
  const snap = await db.collection('help_articles').get();
  console.log(`Found ${snap.size} articles\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < snap.docs.length; i++) {
    const docRef = snap.docs[i].ref;
    const data = snap.docs[i].data();
    const frContent = (data.content && data.content['fr']) || '';
    const frExcerpt = (data.excerpt && data.excerpt['fr']) || '';
    const frTitle = (data.title && data.title['fr']) || '';

    if (!frContent) {
      console.log(`[${i+1}/${snap.size}] SKIP (no FR content): ${frTitle.substring(0,50)}`);
      skipped++;
      continue;
    }

    const langsNeedingContent = LANGS.filter(l => needsTranslation(data.content?.[l], frContent));
    const langsNeedingExcerpt = LANGS.filter(l => needsTranslation(data.excerpt?.[l], frExcerpt));

    if (langsNeedingContent.length === 0 && langsNeedingExcerpt.length === 0) {
      console.log(`[${i+1}/${snap.size}] ✓ Already translated: ${frTitle.substring(0,50)}`);
      skipped++;
      continue;
    }

    console.log(`[${i+1}/${snap.size}] Translating: ${frTitle.substring(0,50)}`);
    console.log(`  → content needed: [${langsNeedingContent.join(',')}]`);

    const updates = {
      content: { ...(data.content || {}) },
      excerpt: { ...(data.excerpt || {}) },
      'translationStatus.lastRetranslationAt': admin.firestore.FieldValue.serverTimestamp(),
    };

    // Translate content sequentially (1 language at a time) — 10s between calls to stay under 10k TPM
    for (const lang of langsNeedingContent) {
      process.stdout.write(`    ${lang}... `);
      const text = await translateContent(frContent, lang);
      if (text) {
        updates.content[lang] = text;
        process.stdout.write(`✓\n`);
      } else {
        process.stdout.write(`✗\n`);
      }
      await sleep(10000); // 10s between each language call
    }

    // Translate excerpts sequentially
    for (const lang of langsNeedingExcerpt) {
      const text = await translateExcerpt(frExcerpt, lang);
      if (text) updates.excerpt[lang] = text;
      await sleep(10000);
    }

    // Write to Firestore
    try {
      await docRef.update(updates);
      console.log(`  ✅ Updated ${snap.docs[i].id.substring(0,8)} — ${langsNeedingContent.length} langs`);
      updated++;
    } catch (e) {
      console.error(`  ❌ Firestore error:`, e.message);
      errors++;
    }

    // Pause between articles
    await sleep(5000);
  }

  console.log('\n========== DONE ==========');
  console.log(`Total:   ${snap.size}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});

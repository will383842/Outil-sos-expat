#!/usr/bin/env node
/**
 * retranslate-faqs.js
 * Retraduit les FAQ (question + answer + slug) via Claude Haiku.
 * Cible les docs où question[lang] ou answer[lang] est vide ou identique au français.
 * Génère aussi les slugs manquants (ASCII romanisé pour AR/RU/HI/CH).
 *
 * Usage: ANTHROPIC_API_KEY=sk-ant-... node scripts/retranslate-faqs.js
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

// Non-Latin: slug generated from English translation with lang prefix
const NON_LATIN = ['ru', 'ar', 'ch', 'hi'];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callClaude(prompt, maxTokens = 500, attempt = 0) {
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
    const wait = Math.pow(2, attempt + 1) * 5000;
    console.log(`    ⏳ Rate limit 429, retry in ${wait / 1000}s...`);
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

async function translateShort(text, targetLang) {
  if (!text || text.trim().length === 0) return null;
  const langName = LANG_NAMES[targetLang] || targetLang;
  const prompt = `Translate this French FAQ text to ${langName}. Return ONLY the translation, nothing else.\n\n${text}`;
  try {
    return await callClaude(prompt, 500);
  } catch (e) {
    console.warn(`  ⚠ Claude error [${targetLang}]:`, e.message);
    return null;
  }
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100) || 'untitled';
}

function needsTranslation(value, frValue) {
  if (!value || value.trim().length === 0) return true;
  if (value.trim() === (frValue || '').trim()) return true;
  return false;
}

async function main() {
  console.log('📚 Loading all FAQs from Firestore...');
  const snap = await db.collection('faqs').get();
  console.log(`Found ${snap.size} FAQs\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < snap.docs.length; i++) {
    const docRef = snap.docs[i].ref;
    const data = snap.docs[i].data();

    const frQuestion = data.question?.['fr'] || '';
    const frAnswer = data.answer?.['fr'] || '';
    const frSlug = data.slug?.['fr'] || '';

    if (!frQuestion || !frAnswer) {
      console.log(`[${i + 1}/${snap.size}] SKIP (no FR content): ${snap.docs[i].id}`);
      skipped++;
      continue;
    }

    const langsNeedingQuestion = LANGS.filter(l => needsTranslation(data.question?.[l], frQuestion));
    const langsNeedingAnswer = LANGS.filter(l => needsTranslation(data.answer?.[l], frAnswer));
    const langsNeedingSlug = LANGS.filter(l => !data.slug?.[l] || data.slug[l].trim().length === 0);

    if (langsNeedingQuestion.length === 0 && langsNeedingAnswer.length === 0 && langsNeedingSlug.length === 0) {
      console.log(`[${i + 1}/${snap.size}] ✓ Already translated: ${frQuestion.substring(0, 60)}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${snap.size}] Translating: ${frQuestion.substring(0, 60)}`);
    if (langsNeedingQuestion.length) console.log(`  → question: [${langsNeedingQuestion.join(',')}]`);
    if (langsNeedingAnswer.length) console.log(`  → answer:   [${langsNeedingAnswer.join(',')}]`);
    if (langsNeedingSlug.length) console.log(`  → slug:     [${langsNeedingSlug.join(',')}]`);

    const updates = {
      question: { ...(data.question || {}) },
      answer: { ...(data.answer || {}) },
      slug: { ...(data.slug || {}) },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Need English translation for non-Latin slug generation
    let enQuestion = data.question?.['en'] || '';

    // Translate all langs that need question
    for (const lang of langsNeedingQuestion) {
      process.stdout.write(`    [q] ${lang}... `);
      const text = await translateShort(frQuestion, lang);
      if (text) {
        updates.question[lang] = text;
        if (lang === 'en') enQuestion = text;
        process.stdout.write(`✓\n`);
      } else {
        process.stdout.write(`✗\n`);
      }
      await sleep(8000);
    }

    // If we still don't have English for slug generation, fetch it
    if (!enQuestion && langsNeedingSlug.some(l => NON_LATIN.includes(l))) {
      if (!updates.question['en'] && !data.question?.['en']) {
        const text = await translateShort(frQuestion, 'en');
        if (text) enQuestion = text;
        await sleep(8000);
      } else {
        enQuestion = updates.question['en'] || data.question['en'];
      }
    }

    // Translate all langs that need answer
    for (const lang of langsNeedingAnswer) {
      process.stdout.write(`    [a] ${lang}... `);
      const text = await translateShort(frAnswer, lang);
      if (text) {
        updates.answer[lang] = text;
        process.stdout.write(`✓\n`);
      } else {
        process.stdout.write(`✗\n`);
      }
      await sleep(8000);
    }

    // Generate missing slugs
    for (const lang of langsNeedingSlug) {
      if (NON_LATIN.includes(lang)) {
        const base = enQuestion || frQuestion;
        updates.slug[lang] = `${lang}-${generateSlug(base)}`;
      } else {
        const translatedQ = updates.question[lang] || data.question?.[lang] || frQuestion;
        updates.slug[lang] = generateSlug(translatedQ);
      }
    }

    try {
      await docRef.update(updates);
      console.log(`  ✅ Updated ${snap.docs[i].id.substring(0, 8)}`);
      updated++;
    } catch (e) {
      console.error(`  ❌ Firestore error:`, e.message);
      errors++;
    }

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

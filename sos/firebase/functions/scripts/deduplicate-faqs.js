#!/usr/bin/env node
/**
 * deduplicate-faqs.js
 * Supprime les doublons de FAQ dans Firestore (collection "faqs").
 * Pour chaque slug FR dupliqué, conserve le doc avec le plus de contenu traduit.
 *
 * Usage: node scripts/deduplicate-faqs.js
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

function totalContentLength(data) {
  let total = 0;
  for (const field of ['question', 'answer', 'slug']) {
    if (data[field] && typeof data[field] === 'object') {
      total += Object.values(data[field]).reduce((sum, v) => sum + (typeof v === 'string' ? v.length : 0), 0);
    }
  }
  return total;
}

async function main() {
  console.log('Loading all faqs...');
  const snap = await db.collection('faqs').get();
  console.log(`Total docs: ${snap.size}`);

  // Group by FR slug
  const bySlug = {};
  snap.docs.forEach(d => {
    const slug = (d.data().slug && d.data().slug['fr']) || d.id;
    if (!bySlug[slug]) bySlug[slug] = [];
    bySlug[slug].push({ id: d.id, ref: d.ref, data: d.data() });
  });

  const duplicatedSlugs = Object.entries(bySlug).filter(([, docs]) => docs.length > 1);
  console.log(`Unique slugs: ${Object.keys(bySlug).length}`);
  console.log(`Duplicated slugs: ${duplicatedSlugs.length}\n`);

  let deleted = 0;
  let kept = 0;
  let errors = 0;

  for (const [slug, docs] of duplicatedSlugs) {
    docs.sort((a, b) => totalContentLength(b.data) - totalContentLength(a.data));
    const toKeep = docs[0];
    const toDelete = docs.slice(1);

    console.log(`Slug: ${slug.substring(0, 60)}`);
    console.log(`  Keep:   ${toKeep.id} (${totalContentLength(toKeep.data)} chars)`);

    for (const doc of toDelete) {
      console.log(`  Delete: ${doc.id} (${totalContentLength(doc.data)} chars)`);
      try {
        await doc.ref.delete();
        deleted++;
      } catch (e) {
        console.error(`  ❌ Error deleting ${doc.id}:`, e.message);
        errors++;
      }
    }
    kept++;
  }

  console.log('\n========== DONE ==========');
  console.log(`Slugs processed: ${duplicatedSlugs.length}`);
  console.log(`Docs kept:       ${kept}`);
  console.log(`Docs deleted:    ${deleted}`);
  console.log(`Errors:          ${errors}`);

  const finalSnap = await db.collection('faqs').get();
  console.log(`Final FAQ count: ${finalSnap.size}`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

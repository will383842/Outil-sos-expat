#!/usr/bin/env node
/**
 * deduplicate-help-articles.js
 * Supprime les doublons d'articles Help Center dans Firestore.
 * Pour chaque slug FR dupliqué, conserve le doc avec le plus de contenu traduit.
 *
 * Usage: node scripts/deduplicate-help-articles.js
 */

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

function totalContentLength(data) {
  if (!data.content || typeof data.content !== 'object') return 0;
  return Object.values(data.content).reduce((sum, v) => sum + (typeof v === 'string' ? v.length : 0), 0);
}

async function main() {
  console.log('Loading all help_articles...');
  const snap = await db.collection('help_articles').get();
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
    // Sort: keep the doc with the most total content length
    docs.sort((a, b) => totalContentLength(b.data) - totalContentLength(a.data));
    const toKeep = docs[0];
    const toDelete = docs.slice(1);

    console.log(`Slug: ${slug.substring(0, 50)}`);
    console.log(`  Keep:   ${toKeep.id} (${totalContentLength(toKeep.data)} chars total)`);

    for (const doc of toDelete) {
      console.log(`  Delete: ${doc.id} (${totalContentLength(doc.data)} chars total)`);
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

  // Final count
  const finalSnap = await db.collection('help_articles').get();
  console.log(`Final article count: ${finalSnap.size}`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

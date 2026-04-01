/**
 * Purge SSR Cache — Deletes all documents in the ssr_cache Firestore collection.
 *
 * Run this after deploying Worker fixes to force fresh SSR renders for all pages.
 * Old cached pages may contain stale/broken HTML from when minInstances was 0.
 *
 * Usage: node purge-ssr-cache.js
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account key
 *   - Or run from a machine authenticated with `gcloud auth application-default login`
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sos-urgently-ac307',
  });
}

const db = admin.firestore();
const COLLECTION = 'ssr_cache';

async function purge() {
  console.log(`Fetching all documents from '${COLLECTION}'...`);

  const snapshot = await db.collection(COLLECTION).get();

  if (snapshot.empty) {
    console.log('Collection is already empty. Nothing to purge.');
    return;
  }

  console.log(`Found ${snapshot.size} cached SSR entries. Deleting...`);

  // Firestore batch delete (max 500 per batch)
  const batchSize = 500;
  let deleted = 0;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + batchSize);

    chunk.forEach(doc => {
      const data = doc.data();
      const path = data.path || doc.id;
      const age = data.timestamp ? Math.round((Date.now() - data.timestamp) / 1000 / 60) : '?';
      console.log(`  DELETE: ${path} (age: ${age} min)`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    deleted += chunk.length;
    console.log(`  Batch committed: ${deleted}/${docs.length}`);
  }

  console.log(`\nDone! Purged ${deleted} SSR cache entries.`);
  console.log('Next bot visit will trigger a fresh Puppeteer render for each page.');
}

purge().catch(err => {
  console.error('Purge failed:', err.message);
  process.exit(1);
});

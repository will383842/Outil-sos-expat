/**
 * Migration : copie tous les documents de la collection `faqs` vers `app_faq`
 * et supprime l'ancienne collection.
 *
 * Usage:
 *   node scripts/migrate-faqs-to-app-faq.cjs             (migre + supprime faqs)
 *   node scripts/migrate-faqs-to-app-faq.cjs --dry-run   (prévisualise sans écrire)
 *   node scripts/migrate-faqs-to-app-faq.cjs --keep      (migre sans supprimer faqs)
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: "sos-urgently-ac307" });
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");
const KEEP_OLD = process.argv.includes("--keep");

async function main() {
  console.log(`\n🔄 Migration faqs → app_faq${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  // 1. Lire tous les documents de l'ancienne collection
  const oldSnap = await db.collection("faqs").get();
  if (oldSnap.empty) {
    console.log("✅ Collection 'faqs' est vide — rien à migrer.");
    process.exit(0);
  }

  console.log(`📂 ${oldSnap.size} document(s) trouvé(s) dans 'faqs'`);

  // 2. Vérifier ce qui existe déjà dans app_faq
  const newSnap = await db.collection("app_faq").get();
  const existingIds = new Set(newSnap.docs.map(d => d.id));
  console.log(`📂 ${existingIds.size} document(s) déjà dans 'app_faq'`);

  // 3. Copier chaque document
  let copied = 0;
  let skipped = 0;
  const batch = db.batch();

  for (const docSnap of oldSnap.docs) {
    if (existingIds.has(docSnap.id)) {
      console.log(`  ⏭  skip (déjà présent): ${docSnap.id}`);
      skipped++;
      continue;
    }
    const data = docSnap.data();
    const qFr = data.question?.fr || data.question || "(sans titre)";
    console.log(`  ✓ copie: ${docSnap.id} — "${String(qFr).substring(0, 60)}"`);
    if (!DRY_RUN) {
      batch.set(db.collection("app_faq").doc(docSnap.id), data);
    }
    copied++;
  }

  if (!DRY_RUN && copied > 0) {
    await batch.commit();
    console.log(`\n✅ ${copied} document(s) copiés dans 'app_faq'`);
  } else if (DRY_RUN) {
    console.log(`\n[DRY RUN] ${copied} document(s) seraient copiés, ${skipped} ignorés`);
  }

  // 4. Supprimer l'ancienne collection (sauf --keep ou --dry-run)
  if (!DRY_RUN && !KEEP_OLD) {
    console.log(`\n🗑  Suppression de l'ancienne collection 'faqs'...`);
    const deleteBatch = db.batch();
    for (const docSnap of oldSnap.docs) {
      deleteBatch.delete(docSnap.ref);
    }
    await deleteBatch.commit();
    console.log(`✅ ${oldSnap.size} document(s) supprimés de 'faqs'`);
  } else if (KEEP_OLD) {
    console.log(`\nℹ️  '--keep' : ancienne collection 'faqs' conservée`);
  }

  console.log("\n🎉 Migration terminée.\n");
}

main().catch(err => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});

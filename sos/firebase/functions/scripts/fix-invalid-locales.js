/**
 * 🔧 MIGRATION: Nettoyer les slugs avec locales invalides
 *
 * À exécuter depuis: sos/firebase/functions/
 * Usage: node scripts/fix-invalid-locales.js [--dry-run]
 */

const admin = require('firebase-admin');

// Utiliser le service account du projet
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Whitelist de locales valides
const VALID_LOCALES = new Set([
  'fr-fr', 'fr-ca', 'fr-be', 'fr-ch',
  'en-us', 'en-gb', 'en-ca', 'en-au',
  'es-es', 'es-mx', 'es-ar',
  'de-de', 'de-at', 'de-ch',
  'pt-pt', 'pt-br',
  'ru-ru',
  'zh-cn', 'zh-tw',
  'ar-sa',
  'hi-in'
]);

// Locales par défaut par langue
const DEFAULT_LOCALES = {
  'fr': 'fr-fr',
  'en': 'en-us',
  'es': 'es-es',
  'de': 'de-de',
  'pt': 'pt-pt',
  'ru': 'ru-ru',
  'zh': 'zh-cn',
  'ar': 'ar-sa',
  'hi': 'hi-in'
};

function extractLocale(slug) {
  const match = slug.match(/^([a-z]{2}-[a-z]{2})\//i);
  return match ? match[1].toLowerCase() : null;
}

function isValidLocale(locale) {
  return VALID_LOCALES.has(locale.toLowerCase());
}

function normalizeLocale(invalidLocale) {
  const lang = invalidLocale.split('-')[0];
  return DEFAULT_LOCALES[lang] || 'fr-fr';
}

function fixSlug(slug) {
  const locale = extractLocale(slug);
  if (!locale) return null;
  if (isValidLocale(locale)) return slug;

  const correctLocale = normalizeLocale(locale);
  const slugWithoutLocale = slug.substring(locale.length + 1);
  return `${correctLocale}/${slugWithoutLocale}`;
}

async function migrateProfiles() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔧 MIGRATION: Correction des locales invalides`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (aucune modification)' : '✍️ ÉCRITURE'}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    const snapshot = await db.collection('sos_profiles')
      .where('isVisible', '==', true)
      .get();

    console.log(`📊 ${snapshot.docs.length} profils à vérifier\n`);

    let fixedCount = 0;
    let invalidCount = 0;
    const updates = [];

    for (const doc of snapshot.docs) {
      const profile = doc.data();
      const slugs = profile.slugs;

      if (!slugs || typeof slugs !== 'object') continue;

      const fixedSlugs = {};
      let hasInvalid = false;

      for (const [lang, slug] of Object.entries(slugs)) {
        if (!slug) continue;

        const locale = extractLocale(slug);
        if (!locale) {
          console.warn(`⚠️  ${doc.id} (${lang}): Pas de locale dans "${slug}"`);
          continue;
        }

        if (!isValidLocale(locale)) {
          hasInvalid = true;
          invalidCount++;

          const fixedSlug = fixSlug(slug);
          if (fixedSlug) {
            console.log(`🔧 ${doc.id} (${lang}):`);
            console.log(`   ❌ ${slug}`);
            console.log(`   ✅ ${fixedSlug}`);
            fixedSlugs[lang] = fixedSlug;
          }
        } else {
          fixedSlugs[lang] = slug;
        }
      }

      if (hasInvalid) {
        updates.push({ ref: doc.ref, slugs: fixedSlugs });
        fixedCount++;
      }
    }

    if (!isDryRun && updates.length > 0) {
      console.log(`\n💾 Mise à jour de ${updates.length} profils...`);

      // Batch updates (max 500 par batch)
      for (let i = 0; i < updates.length; i += 500) {
        const batch = db.batch();
        const chunk = updates.slice(i, i + 500);

        chunk.forEach(({ ref, slugs }) => {
          batch.update(ref, { slugs });
        });

        await batch.commit();
        console.log(`✅ Batch ${Math.floor(i/500) + 1} sauvegardé (${chunk.length} documents)`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ TERMINÉ`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 Slugs invalides trouvés: ${invalidCount}`);
    console.log(`✅ Profils à corriger: ${fixedCount}`);

    if (isDryRun && fixedCount > 0) {
      console.log(`\n💡 Pour appliquer: node scripts/fix-invalid-locales.js`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateProfiles();

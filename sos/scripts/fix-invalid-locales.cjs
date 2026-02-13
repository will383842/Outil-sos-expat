/**
 * 🔧 MIGRATION: Nettoyer les slugs avec locales invalides
 *
 * Problème: Des slugs comme "es-FR/avocat-thailand/..." ont été générés
 * avec des combinaisons langue-pays invalides (espagnol-France, chinois-Croatie, etc.)
 *
 * Solution:
 * - Détecte les slugs avec locales invalides
 * - Les corrige vers la locale par défaut de la langue
 * - Ou les supprime du champ slugs si correction impossible
 *
 * Usage: node scripts/fix-invalid-locales.cjs [--dry-run]
 */

const admin = require('firebase-admin');

// Initialisation avec les credentials par défaut
// (utilise GOOGLE_APPLICATION_CREDENTIALS ou gcloud auth)
admin.initializeApp({
  projectId: 'sos-urgently-ac307'
});

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

/**
 * Extrait la locale d'un slug
 */
function extractLocale(slug) {
  const match = slug.match(/^([a-z]{2}-[a-z]{2})\//i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Vérifie si une locale est valide
 */
function isValidLocale(locale) {
  return VALID_LOCALES.has(locale.toLowerCase());
}

/**
 * Corrige une locale invalide vers la locale par défaut
 */
function normalizeLocale(invalidLocale) {
  const lang = invalidLocale.split('-')[0];
  return DEFAULT_LOCALES[lang] || 'fr-fr';
}

/**
 * Corrige un slug avec locale invalide
 */
function fixSlug(slug) {
  const locale = extractLocale(slug);
  if (!locale) return null; // Pas de locale détectée

  if (isValidLocale(locale)) return slug; // Déjà valide

  // Corriger: remplacer la locale invalide par la locale par défaut
  const correctLocale = normalizeLocale(locale);
  const slugWithoutLocale = slug.substring(locale.length + 1); // +1 pour le "/"
  return `${correctLocale}/${slugWithoutLocale}`;
}

async function migrateProfiles() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔧 MIGRATION: Correction des locales invalides`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (aucune modification)' : '✍️ ÉCRITURE'}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // Récupérer tous les profils visibles
    const snapshot = await db.collection('sos_profiles')
      .where('isVisible', '==', true)
      .get();

    console.log(`📊 ${snapshot.docs.length} profils à vérifier\n`);

    let fixedCount = 0;
    let invalidCount = 0;
    const batch = db.batch();
    let batchCount = 0;

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
          console.warn(`⚠️  ${doc.id} (${lang}): Pas de locale détectée dans "${slug}"`);
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
          } else {
            console.log(`❌ ${doc.id} (${lang}): Impossible de corriger "${slug}"`);
          }
        } else {
          fixedSlugs[lang] = slug; // Garder inchangé
        }
      }

      if (hasInvalid && !isDryRun) {
        // Mettre à jour le document
        batch.update(doc.ref, { slugs: fixedSlugs });
        batchCount++;
        fixedCount++;

        // Commit par batch de 500 (limite Firestore)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`\n💾 Batch de ${batchCount} documents sauvegardé\n`);
          batchCount = 0;
        }
      }
    }

    // Commit le dernier batch
    if (batchCount > 0 && !isDryRun) {
      await batch.commit();
      console.log(`\n💾 Dernier batch de ${batchCount} documents sauvegardé\n`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ TERMINÉ`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📊 Slugs invalides trouvés: ${invalidCount}`);
    console.log(`✅ Profils corrigés: ${fixedCount}`);

    if (isDryRun) {
      console.log(`\n💡 Pour appliquer les changements, lancez: node scripts/fix-invalid-locales.cjs`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrateProfiles();

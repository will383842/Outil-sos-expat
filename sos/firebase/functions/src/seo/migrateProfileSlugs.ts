/**
 * Migration Script: Fix all profile slugs and shortIds
 *
 * This script:
 * 1. Checks all profiles in sos_profiles
 * 2. Generates missing shortId fields
 * 3. Regenerates multilingual slugs for all 9 languages (fr, en, de, es, pt, ru, zh, ar, hi)
 *
 * Run via: firebase functions:shell then migrateProfileSlugs()
 * Or deploy and call via HTTP
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const REGION = 'europe-west1';

// Characters for short ID generation (URL-safe, lowercase)
const SHORT_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SHORT_ID_LENGTH = 6;

// Supported languages
// IMPORTANT: 'ch' is the internal code for Chinese, but URLs use 'zh-cn/' (ISO standard)
// The translations use 'zh' internally and URLs also use 'zh' prefix
const LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'] as const;

// Role translations (romanized for non-Latin scripts)
const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  lawyer: {
    fr: 'avocat', en: 'lawyer', es: 'abogado', pt: 'advogado', de: 'anwalt',
    ru: 'advokat', zh: 'lushi', ar: 'muhami', hi: 'vakil'
  },
  expat: {
    fr: 'expatrie', en: 'expat', es: 'expatriado', pt: 'expatriado', de: 'expat',
    ru: 'expat', zh: 'haiwai', ar: 'wafid', hi: 'videshi'
  },
  notary: {
    fr: 'notaire', en: 'notary', es: 'notario', pt: 'notario', de: 'notar',
    ru: 'notar', zh: 'gongzheng', ar: 'katib', hi: 'notari'
  },
  accountant: {
    fr: 'expert-comptable', en: 'accountant', es: 'contador', pt: 'contador', de: 'steuerberater',
    ru: 'bukhgalter', zh: 'kuaiji', ar: 'muhasib', hi: 'lekhaakar'
  },
  doctor: {
    fr: 'medecin', en: 'doctor', es: 'medico', pt: 'medico', de: 'arzt',
    ru: 'vrach', zh: 'yisheng', ar: 'tabib', hi: 'chikitsak'
  },
};

// Country translations (romanized for non-Latin scripts)
const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Major countries with full translations
  FR: { fr: 'france', en: 'france', es: 'francia', pt: 'franca', de: 'frankreich', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'phrans' },
  US: { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'vereinigte-staaten', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'amerika' },
  GB: { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', pt: 'reino-unido', de: 'vereinigtes-koenigreich', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britania', hi: 'briten' },
  DE: { fr: 'allemagne', en: 'germany', es: 'alemania', pt: 'alemanha', de: 'deutschland', ru: 'germaniya', zh: 'deguo', ar: 'almania', hi: 'jarmani' },
  ES: { fr: 'espagne', en: 'spain', es: 'espana', pt: 'espanha', de: 'spanien', ru: 'ispaniya', zh: 'xibanya', ar: 'isbania', hi: 'spen' },
  IT: { fr: 'italie', en: 'italy', es: 'italia', pt: 'italia', de: 'italien', ru: 'italiya', zh: 'yidali', ar: 'italia', hi: 'itali' },
  PT: { fr: 'portugal', en: 'portugal', es: 'portugal', pt: 'portugal', de: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'burtugal', hi: 'purtugal' },
  BR: { fr: 'bresil', en: 'brazil', es: 'brasil', pt: 'brasil', de: 'brasilien', ru: 'braziliya', zh: 'baxi', ar: 'brazil', hi: 'brazil' },
  CA: { fr: 'canada', en: 'canada', es: 'canada', pt: 'canada', de: 'kanada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'kanada' },
  AU: { fr: 'australie', en: 'australia', es: 'australia', pt: 'australia', de: 'australien', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia' },
  JP: { fr: 'japon', en: 'japan', es: 'japon', pt: 'japao', de: 'japan', ru: 'yaponiya', zh: 'riben', ar: 'yaban', hi: 'japan' },
  CN: { fr: 'chine', en: 'china', es: 'china', pt: 'china', de: 'china', ru: 'kitay', zh: 'zhongguo', ar: 'sin', hi: 'chin' },
  IN: { fr: 'inde', en: 'india', es: 'india', pt: 'india', de: 'indien', ru: 'indiya', zh: 'yindu', ar: 'alhind', hi: 'bharat' },
  RU: { fr: 'russie', en: 'russia', es: 'rusia', pt: 'russia', de: 'russland', ru: 'rossiya', zh: 'eluosi', ar: 'rusia', hi: 'rus' },
  MX: { fr: 'mexique', en: 'mexico', es: 'mexico', pt: 'mexico', de: 'mexiko', ru: 'meksika', zh: 'moxige', ar: 'maksik', hi: 'meksiko' },
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', pt: 'tailandia', de: 'thailand', ru: 'tailand', zh: 'taiguo', ar: 'tailanda', hi: 'thailand' },
  AE: { fr: 'emirats-arabes-unis', en: 'uae', es: 'emiratos', pt: 'emirados', de: 'vae', ru: 'oae', zh: 'alianqiu', ar: 'alemarat', hi: 'uae' },
  SA: { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', pt: 'arabia-saudita', de: 'saudi-arabien', ru: 'saudovskaya', zh: 'shate', ar: 'saudia', hi: 'saudi' },
  SG: { fr: 'singapour', en: 'singapore', es: 'singapur', pt: 'singapura', de: 'singapur', ru: 'singapur', zh: 'xinjiapo', ar: 'singhafura', hi: 'singapore' },
  HK: { fr: 'hong-kong', en: 'hong-kong', es: 'hong-kong', pt: 'hong-kong', de: 'hongkong', ru: 'gonkong', zh: 'xianggang', ar: 'hongkong', hi: 'hongkong' },
  CH: { fr: 'suisse', en: 'switzerland', es: 'suiza', pt: 'suica', de: 'schweiz', ru: 'shveytsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  BE: { fr: 'belgique', en: 'belgium', es: 'belgica', pt: 'belgica', de: 'belgien', ru: 'belgiya', zh: 'bilishi', ar: 'baljika', hi: 'belgium' },
  NL: { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', pt: 'holanda', de: 'niederlande', ru: 'niderlandy', zh: 'helan', ar: 'holanda', hi: 'netherlands' },
  PL: { fr: 'pologne', en: 'poland', es: 'polonia', pt: 'polonia', de: 'polen', ru: 'polsha', zh: 'bolan', ar: 'bolanda', hi: 'poland' },
  SE: { fr: 'suede', en: 'sweden', es: 'suecia', pt: 'suecia', de: 'schweden', ru: 'shvetsiya', zh: 'ruidian', ar: 'swid', hi: 'sweden' },
  NO: { fr: 'norvege', en: 'norway', es: 'noruega', pt: 'noruega', de: 'norwegen', ru: 'norvegiya', zh: 'nuowei', ar: 'norwij', hi: 'norway' },
  DK: { fr: 'danemark', en: 'denmark', es: 'dinamarca', pt: 'dinamarca', de: 'daenemark', ru: 'daniya', zh: 'danmai', ar: 'denmark', hi: 'denmark' },
  FI: { fr: 'finlande', en: 'finland', es: 'finlandia', pt: 'finlandia', de: 'finnland', ru: 'finlyandiya', zh: 'fenlan', ar: 'finlanda', hi: 'finland' },
  AT: { fr: 'autriche', en: 'austria', es: 'austria', pt: 'austria', de: 'oesterreich', ru: 'avstriya', zh: 'aodili', ar: 'nemsa', hi: 'austria' },
  IE: { fr: 'irlande', en: 'ireland', es: 'irlanda', pt: 'irlanda', de: 'irland', ru: 'irlandiya', zh: 'aierlan', ar: 'irlanda', hi: 'ireland' },
  NZ: { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', pt: 'nova-zelandia', de: 'neuseeland', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'nyuzillanda', hi: 'newzealand' },
  ZA: { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', pt: 'africa-do-sul', de: 'suedafrika', ru: 'yuar', zh: 'nanfei', ar: 'janubafrika', hi: 'southafrica' },
  EG: { fr: 'egypte', en: 'egypt', es: 'egipto', pt: 'egito', de: 'aegypten', ru: 'yegipet', zh: 'aiji', ar: 'misr', hi: 'misr' },
  MA: { fr: 'maroc', en: 'morocco', es: 'marruecos', pt: 'marrocos', de: 'marokko', ru: 'marokko', zh: 'moluoge', ar: 'maghrib', hi: 'morocco' },
  TN: { fr: 'tunisie', en: 'tunisia', es: 'tunez', pt: 'tunisia', de: 'tunesien', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia' },
  KR: { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', pt: 'coreia-do-sul', de: 'suedkorea', ru: 'yuzhnaya-koreya', zh: 'hanguo', ar: 'koria', hi: 'korea' },
  VN: { fr: 'vietnam', en: 'vietnam', es: 'vietnam', pt: 'vietna', de: 'vietnam', ru: 'vyetnam', zh: 'yuenan', ar: 'fitnam', hi: 'vietnam' },
  PH: { fr: 'philippines', en: 'philippines', es: 'filipinas', pt: 'filipinas', de: 'philippinen', ru: 'filippiny', zh: 'feilvbin', ar: 'filipin', hi: 'philippines' },
  ID: { fr: 'indonesie', en: 'indonesia', es: 'indonesia', pt: 'indonesia', de: 'indonesien', ru: 'indoneziya', zh: 'yinni', ar: 'indunisia', hi: 'indonesia' },
  MY: { fr: 'malaisie', en: 'malaysia', es: 'malasia', pt: 'malasia', de: 'malaysia', ru: 'malayziya', zh: 'malaixiya', ar: 'malizia', hi: 'malaysia' },
  TR: { fr: 'turquie', en: 'turkey', es: 'turquia', pt: 'turquia', de: 'tuerkei', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkia', hi: 'turkey' },
  GR: { fr: 'grece', en: 'greece', es: 'grecia', pt: 'grecia', de: 'griechenland', ru: 'gretsiya', zh: 'xila', ar: 'yunan', hi: 'greece' },
  CZ: { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', pt: 'republica-tcheca', de: 'tschechien', ru: 'chekhiya', zh: 'jieke', ar: 'tshik', hi: 'czech' },
  HU: { fr: 'hongrie', en: 'hungary', es: 'hungria', pt: 'hungria', de: 'ungarn', ru: 'vengriya', zh: 'xiongyali', ar: 'hungharia', hi: 'hungary' },
  RO: { fr: 'roumanie', en: 'romania', es: 'rumania', pt: 'romenia', de: 'rumaenien', ru: 'ruminiya', zh: 'luomaniya', ar: 'rumania', hi: 'romania' },
  IL: { fr: 'israel', en: 'israel', es: 'israel', pt: 'israel', de: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  AR: { fr: 'argentine', en: 'argentina', es: 'argentina', pt: 'argentina', de: 'argentinien', ru: 'argentina', zh: 'agenting', ar: 'arjantin', hi: 'argentina' },
  CL: { fr: 'chili', en: 'chile', es: 'chile', pt: 'chile', de: 'chile', ru: 'chili', zh: 'zhili', ar: 'tshili', hi: 'chile' },
  CO: { fr: 'colombie', en: 'colombia', es: 'colombia', pt: 'colombia', de: 'kolumbien', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kolumbia', hi: 'colombia' },
  PE: { fr: 'perou', en: 'peru', es: 'peru', pt: 'peru', de: 'peru', ru: 'peru', zh: 'bilu', ar: 'biru', hi: 'peru' },
};

// Default locale per language
// Note: 'ch' maps to 'cn' locale (Chinese -> China)
const DEFAULT_LOCALES: Record<string, string> = {
  fr: 'fr', en: 'us', de: 'de', es: 'es', pt: 'br', ru: 'ru', ch: 'cn', ar: 'sa', hi: 'in'
};

/**
 * Generate a random short ID
 */
function generateShortId(): string {
  let shortId = '';
  for (let i = 0; i < SHORT_ID_LENGTH; i++) {
    shortId += SHORT_ID_CHARS[Math.floor(Math.random() * SHORT_ID_CHARS.length)];
  }
  return shortId;
}

/**
 * Slugify a string (remove accents, lowercase, replace spaces with hyphens)
 */
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * Get translated role
 * Maps 'ch' to 'zh' for translation lookup since translations use ISO code
 */
function getTranslatedRole(role: string, lang: string): string {
  const normalizedRole = role?.toLowerCase() || 'lawyer';
  const roleKey = normalizedRole === 'avocat' ? 'lawyer' :
                  normalizedRole === 'expatrie' ? 'expat' : normalizedRole;
  // Map 'ch' (URL convention) to 'zh' (ISO code) for translation lookup
  const translationLang = lang === 'ch' ? 'zh' : lang;
  return ROLE_TRANSLATIONS[roleKey]?.[translationLang] || ROLE_TRANSLATIONS['lawyer'][translationLang] || 'lawyer';
}

/**
 * Get translated country
 * Maps 'ch' to 'zh' for translation lookup since translations use ISO code
 */
function getTranslatedCountry(countryCode: string, lang: string): string {
  const code = countryCode?.toUpperCase() || 'FR';
  // Map 'ch' (URL convention) to 'zh' (ISO code) for translation lookup
  const translationLang = lang === 'ch' ? 'zh' : lang;
  return COUNTRY_TRANSLATIONS[code]?.[translationLang] || countryCode?.toLowerCase() || 'france';
}

/**
 * Generate multilingual slugs for a profile
 */
function generateMultilingualSlugs(
  profile: admin.firestore.DocumentData,
  shortId: string
): Record<string, string> {
  const slugs: Record<string, string> = {};

  const firstName = profile.firstName || profile.fullName?.split(' ')[0] || 'provider';
  const role = profile.role || profile.type || 'lawyer';
  const countryCode = profile.countryCode || profile.country || 'FR';

  const nameSlug = slugify(firstName);

  for (const lang of LANGUAGES) {
    const translatedRole = getTranslatedRole(role, lang);
    const translatedCountry = getTranslatedCountry(countryCode, lang);
    const locale = DEFAULT_LOCALES[lang];
    // Chinese: internal code is 'ch' but URL should use 'zh' (ISO 639-1 standard)
    const urlLang = lang === 'ch' ? 'zh' : lang;

    // Format: {urlLang}-{locale}/{role}-{country}/{name}-{shortId}
    // Ex: fr-fr/avocat-thailande/julien-abc123, zh-cn/lushi-faguo/julien-abc123
    slugs[lang] = `${urlLang}-${locale}/${translatedRole}-${translatedCountry}/${nameSlug}-${shortId}`;
  }

  return slugs;
}

/**
 * Migration function - fixes all profile slugs
 */
export const migrateProfileSlugs = onRequest(
  {
    region: REGION,
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 540, // 9 minutes max
    maxInstances: 1,
    invoker: 'public', // Allow unauthenticated access (protected by API key)
    concurrency: 1,
  },
  async (req, res) => {
    // Security: Only allow POST or require a secret key
    const authKey = req.query.key || req.headers['x-migration-key'];
    if (authKey !== 'sos-expat-migrate-2024') {
      res.status(403).json({ error: 'Unauthorized. Provide ?key=sos-expat-migrate-2024' });
      return;
    }

    const db = admin.firestore();
    const forceRegen = req.query.forceRegen === 'true';
    const results = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      forceRegen,
    };

    try {
      console.log(`🚀 Starting profile slugs migration... (forceRegen: ${forceRegen})`);

      // Get all profiles
      const snapshot = await db.collection('sos_profiles').get();
      results.total = snapshot.docs.length;

      console.log(`📊 Found ${results.total} profiles to process`);

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      let batch = db.batch();
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        try {
          const profile = doc.data();
          const profileId = doc.id;

          // Check if profile needs update
          let needsUpdate = false;
          const updates: Record<string, any> = {};

          // 1. Check/generate shortId
          let shortId = profile.shortId;
          if (!shortId || shortId.length !== 6) {
            shortId = generateShortId();
            updates.shortId = shortId;
            needsUpdate = true;
            console.log(`  📝 [${profileId}] Generated new shortId: ${shortId}`);
          }

          // 2. Check/generate multilingual slugs
          const existingSlugs = profile.slugs || {};
          const hasAllLanguages = LANGUAGES.every(lang => existingSlugs[lang]);

          // Also check for old Chinese format (ch-cn instead of zh-cn)
          const chineseSlug = existingSlugs.ch || '';
          const hasOldChineseFormat = chineseSlug.startsWith('ch-');

          if (forceRegen || !hasAllLanguages || hasOldChineseFormat) {
            const newSlugs = generateMultilingualSlugs(profile, shortId);
            updates.slugs = newSlugs;
            needsUpdate = true;
            const reason = forceRegen ? 'forced regeneration' :
                          (hasOldChineseFormat ? `old Chinese format: ${chineseSlug.substring(0, 20)}` : 'missing languages');
            console.log(`  🌐 [${profileId}] Regenerated slugs (${reason})`);
          }

          // 3. Ensure visibility flags are set
          if (profile.isActive === undefined) {
            updates.isActive = true;
            needsUpdate = true;
          }
          if (profile.isVisible === undefined) {
            updates.isVisible = true;
            needsUpdate = true;
          }
          if (profile.isApproved === undefined) {
            updates.isApproved = true;
            needsUpdate = true;
          }

          // Apply updates if needed
          if (needsUpdate) {
            updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            batch.update(doc.ref, updates);
            batchCount++;
            results.updated++;

            // Commit batch if reached limit
            if (batchCount >= batchSize) {
              await batch.commit();
              console.log(`  ✅ Committed batch of ${batchCount} updates`);
              batch = db.batch();
              batchCount = 0;
            }
          } else {
            results.skipped++;
          }

        } catch (docError: any) {
          const errorMsg = `Error processing ${doc.id}: ${docError.message}`;
          console.error(`  ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`  ✅ Committed final batch of ${batchCount} updates`);
      }

      console.log('🎉 Migration completed!');
      console.log(`   Total: ${results.total}`);
      console.log(`   Updated: ${results.updated}`);
      console.log(`   Skipped: ${results.skipped}`);
      console.log(`   Errors: ${results.errors.length}`);

      res.status(200).json({
        success: true,
        message: 'Migration completed',
        results,
      });

    } catch (error: any) {
      console.error('❌ Migration failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        results,
      });
    }
  }
);

/**
 * AUDIT function - identifies profiles with malformed slugs
 * This function only READS data, it does not modify anything
 *
 * Checks for:
 * 1. Uppercase country codes (ch-DJ instead of ch-dj)
 * 2. Double locale prefixes (/xx-yy/zz/...)
 * 3. Missing language slugs
 * 4. Old format slugs (ch-cn instead of zh-cn)
 * 5. Legacy single-language slugs
 */
export const auditProfileSlugs = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 300,
    maxInstances: 1,
    invoker: 'public', // Allow unauthenticated access (protected by API key)
  },
  async (req, res) => {
    // Security check
    const authKey = req.query.key || req.headers['x-migration-key'];
    if (authKey !== 'sos-expat-migrate-2024') {
      res.status(403).json({ error: 'Unauthorized. Provide ?key=sos-expat-migrate-2024' });
      return;
    }

    const db = admin.firestore();

    interface SlugIssue {
      profileId: string;
      profileName: string;
      issue: string;
      slugValue: string;
      language?: string;
    }

    const issues: SlugIssue[] = [];
    const stats = {
      totalProfiles: 0,
      profilesWithIssues: 0,
      uppercaseCountry: 0,
      doubleLocale: 0,
      missingLanguages: 0,
      oldChineseFormat: 0,
      legacySlugs: 0,
      noSlugs: 0,
    };

    try {
      console.log('🔍 Starting profile slugs audit...');

      const snapshot = await db.collection('sos_profiles').get();
      stats.totalProfiles = snapshot.docs.length;

      console.log(`📊 Auditing ${stats.totalProfiles} profiles...`);

      for (const doc of snapshot.docs) {
        const profile = doc.data();
        const profileId = doc.id;
        const profileName = profile.firstName || profile.fullName || profile.name || 'Unknown';
        let hasIssue = false;

        // Check multilingual slugs
        const slugs = profile.slugs as Record<string, string> | undefined;

        if (!slugs || Object.keys(slugs).length === 0) {
          // No multilingual slugs at all
          stats.noSlugs++;
          hasIssue = true;

          // Check legacy slug
          if (profile.slug) {
            const legacySlug = profile.slug as string;
            issues.push({
              profileId,
              profileName,
              issue: 'LEGACY_SLUG_ONLY',
              slugValue: legacySlug,
            });
            stats.legacySlugs++;

            // Check if legacy slug has issues
            if (/[A-Z]/.test(legacySlug)) {
              issues.push({
                profileId,
                profileName,
                issue: 'UPPERCASE_IN_LEGACY_SLUG',
                slugValue: legacySlug,
              });
              stats.uppercaseCountry++;
            }
          } else {
            issues.push({
              profileId,
              profileName,
              issue: 'NO_SLUGS_AT_ALL',
              slugValue: 'N/A',
            });
          }
        } else {
          // Check each language slug
          for (const [lang, slug] of Object.entries(slugs)) {
            if (!slug) {
              issues.push({
                profileId,
                profileName,
                issue: 'MISSING_SLUG',
                slugValue: 'null/undefined',
                language: lang,
              });
              stats.missingLanguages++;
              hasIssue = true;
              continue;
            }

            // Check for uppercase letters (indicates malformed locale like ch-DJ)
            if (/[A-Z]/.test(slug)) {
              issues.push({
                profileId,
                profileName,
                issue: 'UPPERCASE_IN_SLUG',
                slugValue: slug,
                language: lang,
              });
              stats.uppercaseCountry++;
              hasIssue = true;
            }

            // Check for double locale prefix (e.g., /fr-fr/en/...)
            const doubleLocalePattern = /^[a-z]{2}-[a-z]{2}\/[a-z]{2}\//;
            if (doubleLocalePattern.test(slug)) {
              issues.push({
                profileId,
                profileName,
                issue: 'DOUBLE_LOCALE_PREFIX',
                slugValue: slug,
                language: lang,
              });
              stats.doubleLocale++;
              hasIssue = true;
            }

            // Check for old Chinese format (ch-cn instead of zh-cn)
            if (slug.startsWith('ch-')) {
              issues.push({
                profileId,
                profileName,
                issue: 'OLD_CHINESE_FORMAT',
                slugValue: slug,
                language: lang,
              });
              stats.oldChineseFormat++;
              hasIssue = true;
            }
          }

          // Check for missing languages
          const expectedLangs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'];
          for (const expectedLang of expectedLangs) {
            if (!slugs[expectedLang]) {
              issues.push({
                profileId,
                profileName,
                issue: 'MISSING_LANGUAGE',
                slugValue: 'N/A',
                language: expectedLang,
              });
              stats.missingLanguages++;
              hasIssue = true;
            }
          }
        }

        if (hasIssue) {
          stats.profilesWithIssues++;
        }
      }

      console.log('✅ Audit completed!');
      console.log(`   Total profiles: ${stats.totalProfiles}`);
      console.log(`   Profiles with issues: ${stats.profilesWithIssues}`);
      console.log(`   Total issues found: ${issues.length}`);

      // Group issues by type for summary
      const issueSummary = issues.reduce((acc, issue) => {
        acc[issue.issue] = (acc[issue.issue] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        success: true,
        message: 'Audit completed - NO CHANGES MADE',
        stats,
        issueSummary,
        issues: issues.slice(0, 100), // Limit to first 100 issues in response
        totalIssues: issues.length,
        note: issues.length > 100 ? `Showing first 100 of ${issues.length} issues` : undefined,
      });

    } catch (error: any) {
      console.error('❌ Audit failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

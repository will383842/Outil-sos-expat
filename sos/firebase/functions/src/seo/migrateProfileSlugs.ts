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
// IMPORTANT: Use 'ch' for Chinese URLs (internal convention to match sitemaps.ts)
// The translations use 'zh' internally but URLs use 'ch-cn/'
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

    // Format: {lang}-{locale}/{role}-{country}/{name}-{shortId}
    // Ex: fr-fr/avocat-thailande/julien-abc123
    slugs[lang] = `${lang}-${locale}/${translatedRole}-${translatedCountry}/${nameSlug}-${shortId}`;
  }

  return slugs;
}

/**
 * Migration function - fixes all profile slugs
 */
export const migrateProfileSlugs = onRequest(
  {
    region: REGION,
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes max
    maxInstances: 1,
  },
  async (req, res) => {
    // Security: Only allow POST or require a secret key
    const authKey = req.query.key || req.headers['x-migration-key'];
    if (authKey !== 'sos-expat-migrate-2024') {
      res.status(403).json({ error: 'Unauthorized. Provide ?key=sos-expat-migrate-2024' });
      return;
    }

    const db = admin.firestore();
    const results = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      console.log('🚀 Starting profile slugs migration...');

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

          if (!hasAllLanguages) {
            const newSlugs = generateMultilingualSlugs(profile, shortId);
            updates.slugs = newSlugs;
            needsUpdate = true;
            console.log(`  🌐 [${profileId}] Generated slugs for ${LANGUAGES.length} languages`);
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

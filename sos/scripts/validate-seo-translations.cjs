#!/usr/bin/env node
/**
 * validate-seo-translations.cjs
 *
 * Diagnostic tool — validates that ALL SEO-critical translation keys
 * exist and are properly translated across all 9 languages.
 *
 * Does NOT modify any file. Read-only audit.
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const HELPER_DIR = path.join(__dirname, '..', 'src', 'helper');
const SRC_DIR = path.join(__dirname, '..', 'src');
const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];
const REFERENCE_LANG = 'en';

// Keys that are naturally identical across languages (URLs, brand names, etc.)
const ALLOWED_IDENTICAL = new Set([
  'seo.author',
  'seo.siteName',
  'seo.logo',
  'seo.ogImage',
  'seo.twitterImage',
  'seo.contactType',
]);

// ── SEO key prefixes to scan from translation files ─────────────────────────
const SEO_PREFIXES = [
  'seo.',
  'meta.',
  'breadcrumb.',
];

const SEO_SUBSTRINGS = [
  '.meta.title',
  '.meta.description',
  '.landing.seo.',
];

const LANDING_PAGE_PREFIXES = [
  'chatter.hero.',
  'chatter.landing.seo.',
  'blogger.hero.',
  'blogger.landing.seo.',
  'influencer.hero.',
  'influencer.landing.seo.',
  'groupAdmin.landing.seo.',
  'captain.landing.seo.',
  'captain.faq.',
];

const PRICING_FAQ_PREFIXES = [
  'pricing.heading',
  'pricing.headingHighlight',
  'pricing.ourOffers',
  'pricing.ourOffersHighlight',
  'pricing.lawyerTitle',
  'pricing.lawyerDescription',
  'pricing.expatTitle',
  'pricing.expatDescription',
  'pricing.faq',
  'pricing.faqSubtitle',
  'pricing.faq.',
  'pricing.badge',
  'pricing.ctaTitle',
  'pricing.ctaDesc',
  'pricing.ctaButton',
  'pricing.ctaButtonSecondary',
  'pricing.satisfactionGuarantee',
  'faq.heroTitle',
  'faq.heroSubtitle',
  'faq.q',
  'faq.a',
  'faq.answer',
  'faq.categories',
  'faq.login.',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadTranslations() {
  const translations = {};
  for (const lang of LANGUAGES) {
    const filePath = path.join(HELPER_DIR, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`[ERREUR] Fichier manquant: ${filePath}`);
      process.exit(1);
    }
    translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return translations;
}

function isSeoKey(key) {
  // Matches any prefix
  for (const prefix of SEO_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  // Matches any substring pattern
  for (const sub of SEO_SUBSTRINGS) {
    if (key.includes(sub)) return true;
  }
  // Matches landing page prefixes
  for (const prefix of LANDING_PAGE_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  // Matches pricing/faq prefixes
  for (const prefix of PRICING_FAQ_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

// ── Scan source code for formatMessage IDs ──────────────────────────────────
function scanSourceForSeoKeys() {
  const seoKeysFromCode = new Set();
  const patterns = [
    /formatMessage\s*\(\s*\{\s*id:\s*['"]([^'"]+)['"]/g,
    /intl\.formatMessage\s*\(\s*\{\s*id:\s*['"]([^'"]+)['"]/g,
    /defineMessage\s*\(\s*\{\s*id:\s*['"]([^'"]+)['"]/g,
    /defineMessages\s*\(\s*\{[^}]*id:\s*['"]([^'"]+)['"]/g,
    /<FormattedMessage\s+[^>]*id=\s*['"]([^'"]+)['"]/g,
    /id:\s*['"]([^'"]+seo[^'"]*)['"]/gi,
    /id:\s*['"]([^'"]*meta\.title[^'"]*)['"]/g,
    /id:\s*['"]([^'"]*meta\.description[^'"]*)['"]/g,
    /id:\s*['"]([^'"]*breadcrumb[^'"]*)['"]/g,
  ];

  function walkDir(dir) {
    let files = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          files = files.concat(walkDir(fullPath));
        } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) { /* skip */ }
    return files;
  }

  const srcFiles = walkDir(SRC_DIR);
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        if (isSeoKey(key)) {
          seoKeysFromCode.add(key);
        }
      }
    }
  }
  return seoKeysFromCode;
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  console.log('='.repeat(70));
  console.log('  AUDIT SEO TRANSLATIONS — SOS Expat SPA');
  console.log('  Langues: ' + LANGUAGES.join(', '));
  console.log('='.repeat(70));
  console.log();

  const translations = loadTranslations();

  // 1. Collect ALL SEO keys from en.json (reference)
  const enKeys = Object.keys(translations[REFERENCE_LANG]);
  const seoKeysFromJson = new Set(enKeys.filter(isSeoKey));

  // 2. Scan source code for additional SEO keys
  console.log('[1/4] Scan du code source pour les cles SEO...');
  const seoKeysFromCode = scanSourceForSeoKeys();

  // 3. Merge all SEO keys
  const allSeoKeys = new Set([...seoKeysFromJson, ...seoKeysFromCode]);
  const sortedKeys = [...allSeoKeys].sort();

  console.log(`     → ${seoKeysFromJson.size} cles SEO trouvees dans en.json`);
  console.log(`     → ${seoKeysFromCode.size} cles SEO trouvees dans le code source`);
  console.log(`     → ${allSeoKeys.size} cles SEO uniques au total`);
  console.log();

  // 4. Validate each language
  console.log('[2/4] Validation des traductions par langue...');
  console.log();

  const report = {
    timestamp: new Date().toISOString(),
    totalSeoKeys: allSeoKeys.size,
    languages: {},
    issues: [],
  };

  const enData = translations[REFERENCE_LANG];

  for (const lang of LANGUAGES) {
    const data = translations[lang];
    const langReport = {
      totalKeys: allSeoKeys.size,
      missing: [],
      empty: [],
      placeholder: [],         // starts with "[EN] "
      untranslated: [],        // identical to English (suspicious)
    };

    for (const key of sortedKeys) {
      const value = data[key];
      const enValue = enData[key];

      // Missing key
      if (value === undefined) {
        langReport.missing.push(key);
        report.issues.push({ lang, key, type: 'MISSING', enValue: enValue || '(not in en.json either)' });
        continue;
      }

      // Empty value
      if (typeof value === 'string' && value.trim() === '') {
        langReport.empty.push(key);
        report.issues.push({ lang, key, type: 'EMPTY' });
        continue;
      }

      // Placeholder [EN] prefix
      if (typeof value === 'string' && value.startsWith('[EN] ')) {
        langReport.placeholder.push(key);
        report.issues.push({ lang, key, type: 'PLACEHOLDER_EN', value });
        continue;
      }

      // Identical to English (only for non-EN languages)
      if (lang !== REFERENCE_LANG && enValue && value === enValue && !ALLOWED_IDENTICAL.has(key)) {
        // Only flag if the value is long enough to be suspicious (>10 chars)
        if (typeof value === 'string' && value.length > 10) {
          langReport.untranslated.push(key);
          report.issues.push({ lang, key, type: 'IDENTICAL_TO_EN', value: value.substring(0, 80) + (value.length > 80 ? '...' : '') });
        }
      }
    }

    report.languages[lang] = {
      missingCount: langReport.missing.length,
      emptyCount: langReport.empty.length,
      placeholderCount: langReport.placeholder.length,
      untranslatedCount: langReport.untranslated.length,
      totalIssues: langReport.missing.length + langReport.empty.length + langReport.placeholder.length + langReport.untranslated.length,
    };

    // Print summary for this language
    const total = report.languages[lang].totalIssues;
    const status = total === 0 ? 'OK' : `${total} probleme(s)`;
    console.log(`  [${lang.toUpperCase()}] ${status}`);
    if (langReport.missing.length > 0) {
      console.log(`       Manquantes: ${langReport.missing.length}`);
    }
    if (langReport.empty.length > 0) {
      console.log(`       Vides: ${langReport.empty.length}`);
    }
    if (langReport.placeholder.length > 0) {
      console.log(`       Placeholders [EN]: ${langReport.placeholder.length}`);
    }
    if (langReport.untranslated.length > 0) {
      console.log(`       Identiques a EN (suspect): ${langReport.untranslated.length}`);
    }
  }

  // 5. Keys only in code but not in en.json
  console.log();
  console.log('[3/4] Cles SEO dans le code mais absentes de en.json...');
  const codeOnlyKeys = [...seoKeysFromCode].filter(k => !seoKeysFromJson.has(k)).sort();
  if (codeOnlyKeys.length > 0) {
    console.log(`     → ${codeOnlyKeys.length} cle(s) utilisees dans le code mais absentes de en.json:`);
    for (const k of codeOnlyKeys.slice(0, 20)) {
      console.log(`       - ${k}`);
    }
    if (codeOnlyKeys.length > 20) {
      console.log(`       ... et ${codeOnlyKeys.length - 20} de plus`);
    }
  } else {
    console.log('     → Aucune cle orpheline. Tout est dans en.json.');
  }

  // 6. Blog route-segments.php validation
  console.log();
  console.log('[4/4] Validation Blog route-segments.php...');
  const blogConfigPath = path.resolve(__dirname, '../../../Blog_sos-expat_frontend/config/route-segments.php');
  if (fs.existsSync(blogConfigPath)) {
    const blogContent = fs.readFileSync(blogConfigPath, 'utf-8');
    const blogLangs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'];
    const segments = ['articles', 'faq', 'categories', 'tags', 'countries'];
    const blogIssues = [];

    for (const segment of segments) {
      for (const lang of blogLangs) {
        // Check if 'lang' => 'value' exists within the segment block
        const segmentRegex = new RegExp(`'${segment}'\\s*=>\\s*\\[([^\\]]+)\\]`, 's');
        const segMatch = blogContent.match(segmentRegex);
        if (!segMatch) {
          blogIssues.push({ segment, issue: `Segment "${segment}" introuvable` });
          break;
        }
        const langRegex = new RegExp(`'${lang}'\\s*=>`);
        if (!langRegex.test(segMatch[1])) {
          blogIssues.push({ segment, lang, issue: `Langue "${lang}" manquante dans segment "${segment}"` });
        }
      }
    }

    // Check for 'ch' vs 'zh' mismatch (SPA uses 'ch', Blog uses 'zh')
    report.blogRouteSegments = {
      path: blogConfigPath,
      languageCodeNote: "Blog utilise 'zh' (standard ISO) vs SPA utilise 'ch' — attention a la coherence",
      issues: blogIssues,
      status: blogIssues.length === 0 ? 'OK' : `${blogIssues.length} probleme(s)`,
    };

    if (blogIssues.length === 0) {
      console.log('     → route-segments.php: OK (toutes les langues presentes)');
    } else {
      console.log(`     → route-segments.php: ${blogIssues.length} probleme(s):`);
      for (const issue of blogIssues) {
        console.log(`       - ${issue.issue}`);
      }
    }
    console.log(`     ⚠ Note: Blog utilise 'zh' vs SPA utilise 'ch' pour le chinois`);
  } else {
    console.log(`     → Fichier non trouve: ${blogConfigPath}`);
    report.blogRouteSegments = { status: 'FILE_NOT_FOUND', path: blogConfigPath };
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log();
  console.log('='.repeat(70));
  console.log('  RESUME');
  console.log('='.repeat(70));

  const totalIssues = report.issues.length;
  console.log(`  Total cles SEO verifiees: ${allSeoKeys.size}`);
  console.log(`  Total problemes trouves:  ${totalIssues}`);
  console.log();

  // Per-type breakdown
  const byType = {};
  for (const issue of report.issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`    ${type}: ${count}`);
  }
  console.log();

  // Top problematic keys (appear in most languages)
  const keyFrequency = {};
  for (const issue of report.issues) {
    keyFrequency[issue.key] = (keyFrequency[issue.key] || 0) + 1;
  }
  const topProblematic = Object.entries(keyFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  if (topProblematic.length > 0) {
    console.log('  Top 15 cles les plus problematiques (nb langues affectees):');
    for (const [key, count] of topProblematic) {
      console.log(`    [${count} langues] ${key}`);
    }
  }

  // ── Write JSON report ────────────────────────────────────────────────────
  const reportPath = path.join(__dirname, 'seo-translations-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log();
  console.log(`  Rapport JSON: ${reportPath}`);
  console.log('='.repeat(70));

  // Exit code
  process.exit(totalIssues > 0 ? 1 : 0);
}

main();

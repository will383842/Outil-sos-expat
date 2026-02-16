#!/usr/bin/env node
/**
 * INFLUENCER TRANSLATIONS AUDIT
 *
 * Analyse complète des traductions Influencer :
 * - Extraction de toutes les clés influencer.* du code
 * - Vérification dans les 9 langues (FR, EN, ES, DE, RU, PT, CH, HI, AR)
 * - Génération de rapports détaillés
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'sos');
const HELPER_DIR = path.join(ROOT, 'src', 'helper');
const SRC_DIR = path.join(ROOT, 'src');

const LANGUAGES = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

// Chemins à analyser
const PATHS_TO_SCAN = [
  path.join(SRC_DIR, 'pages', 'Influencer'),
  path.join(SRC_DIR, 'components', 'Influencer'),
];

// ============================================================================
// EXTRACTION DES CLÉS DU CODE
// ============================================================================

function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();

  // Pattern 1: id="influencer.xxx" ou id: 'influencer.xxx'
  const pattern1 = /id:\s*["']influencer\.([^"']+)["']/g;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    keys.add(`influencer.${match[1]}`);
  }

  // Pattern 2: FormattedMessage id="influencer.xxx"
  const pattern2 = /id=["']influencer\.([^"']+)["']/g;
  while ((match = pattern2.exec(content)) !== null) {
    keys.add(`influencer.${match[1]}`);
  }

  // Pattern 3: formatMessage({ id: 'influencer.xxx' })
  const pattern3 = /formatMessage\(\{\s*id:\s*["']influencer\.([^"']+)["']/g;
  while ((match = pattern3.exec(content)) !== null) {
    keys.add(`influencer.${match[1]}`);
  }

  return Array.from(keys);
}

function extractKeysFromDirectory(dirPath) {
  const allKeys = new Set();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        const keys = extractKeysFromFile(fullPath);
        keys.forEach(k => allKeys.add(k));
      }
    }
  }

  scanDir(dirPath);
  return Array.from(allKeys).sort();
}

// ============================================================================
// CHARGEMENT DES TRADUCTIONS
// ============================================================================

function loadTranslations() {
  const translations = {};
  for (const lang of LANGUAGES) {
    const filePath = path.join(HELPER_DIR, `${lang}.json`);
    if (fs.existsSync(filePath)) {
      translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      translations[lang] = {};
    }
  }
  return translations;
}

function getInfluencerKeys(translations, lang) {
  const keys = Object.keys(translations[lang] || {}).filter(k => k.startsWith('influencer.'));
  return keys.sort();
}

// ============================================================================
// ANALYSE
// ============================================================================

function analyzeTranslations() {
  console.log('🔍 INFLUENCER TRANSLATIONS AUDIT\n');

  // 1. Extraction des clés du code
  console.log('📂 Scanning code for influencer.* keys...');
  let allKeysFromCode = new Set();
  for (const dirPath of PATHS_TO_SCAN) {
    const keys = extractKeysFromDirectory(dirPath);
    console.log(`   - ${path.basename(dirPath)}: ${keys.length} keys`);
    keys.forEach(k => allKeysFromCode.add(k));
  }
  allKeysFromCode = Array.from(allKeysFromCode).sort();
  console.log(`\n✅ Total unique keys found in code: ${allKeysFromCode.length}\n`);

  // 2. Chargement des traductions
  console.log('📖 Loading translation files...');
  const translations = loadTranslations();

  // 3. Analyse par langue
  const coverage = {};
  const missingKeys = {};

  for (const lang of LANGUAGES) {
    const keysInJson = getInfluencerKeys(translations, lang);
    const missing = allKeysFromCode.filter(k => !translations[lang][k]);
    const present = allKeysFromCode.filter(k => translations[lang][k]);

    coverage[lang] = {
      total: allKeysFromCode.length,
      present: present.length,
      missing: missing.length,
      percentage: ((present.length / allKeysFromCode.length) * 100).toFixed(2),
      orphaned: keysInJson.filter(k => !allKeysFromCode.includes(k)).length,
    };
    missingKeys[lang] = missing;

    console.log(`   ${lang.toUpperCase()}: ${present.length}/${allKeysFromCode.length} (${coverage[lang].percentage}%)`);
  }

  // 4. Clés orphelines (dans JSON mais pas dans le code)
  const orphanedKeys = {};
  for (const lang of LANGUAGES) {
    const keysInJson = getInfluencerKeys(translations, lang);
    orphanedKeys[lang] = keysInJson.filter(k => !allKeysFromCode.includes(k));
  }

  // 5. Catégorisation des clés
  const categories = {
    landing: [],
    hero: [],
    dashboard: [],
    earnings: [],
    payments: [],
    leaderboard: [],
    referrals: [],
    tools: [],
    profile: [],
    resources: [],
    register: [],
    suspended: [],
    faq: [],
    calculator: [],
    content: [],
    platform: [],
    profiles: [],
    network: [],
    social: [],
    final: [],
    sticky: [],
    type: [],
    status: [],
    commissionType: [],
    other: [],
  };

  for (const key of allKeysFromCode) {
    const parts = key.split('.');
    if (parts.length >= 2) {
      const category = parts[1];
      if (categories[category] !== undefined) {
        categories[category].push(key);
      } else {
        categories.other.push(key);
      }
    }
  }

  // ============================================================================
  // GÉNÉRATION DU RAPPORT MARKDOWN
  // ============================================================================

  let report = `# INFLUENCER TRANSLATIONS AUDIT

**Date**: ${new Date().toISOString().split('T')[0]}
**Total clés trouvées dans le code**: ${allKeysFromCode.length}

---

## 📊 Résumé Global

| Langue | Couverture | Clés Présentes | Clés Manquantes | Clés Orphelines |
|--------|-----------|---------------|----------------|----------------|
`;

  for (const lang of LANGUAGES) {
    const c = coverage[lang];
    const emoji = c.percentage >= 99 ? '✅' : c.percentage >= 90 ? '⚠️' : '❌';
    report += `| ${lang.toUpperCase()} | ${emoji} ${c.percentage}% | ${c.present} | ${c.missing} | ${c.orphaned} |\n`;
  }

  report += `\n---\n\n## 🗂️ Catégorisation des Clés\n\n`;
  for (const [cat, keys] of Object.entries(categories)) {
    if (keys.length > 0) {
      report += `### ${cat} (${keys.length} clés)\n\n`;
      report += `<details>\n<summary>Voir les clés</summary>\n\n`;
      keys.forEach(k => report += `- \`${k}\`\n`);
      report += `\n</details>\n\n`;
    }
  }

  report += `\n---\n\n## 🔍 Clés Manquantes par Langue\n\n`;
  for (const lang of LANGUAGES) {
    if (missingKeys[lang].length > 0) {
      report += `### ${lang.toUpperCase()} - ${missingKeys[lang].length} clés manquantes\n\n`;
      report += `<details>\n<summary>Voir la liste</summary>\n\n`;
      missingKeys[lang].forEach(k => report += `- \`${k}\`\n`);
      report += `\n</details>\n\n`;
    } else {
      report += `### ${lang.toUpperCase()} - ✅ Complet (0 clés manquantes)\n\n`;
    }
  }

  report += `\n---\n\n## 🗑️ Clés Orphelines (dans JSON mais pas dans le code)\n\n`;
  for (const lang of LANGUAGES) {
    if (orphanedKeys[lang].length > 0) {
      report += `### ${lang.toUpperCase()} - ${orphanedKeys[lang].length} clés orphelines\n\n`;
      report += `<details>\n<summary>Voir la liste</summary>\n\n`;
      orphanedKeys[lang].forEach(k => report += `- \`${k}\`\n`);
      report += `\n</details>\n\n`;
    }
  }

  report += `\n---\n\n## 📋 Toutes les Clés Utilisées dans le Code (${allKeysFromCode.length})\n\n`;
  report += `<details>\n<summary>Voir la liste complète</summary>\n\n`;
  allKeysFromCode.forEach(k => report += `- \`${k}\`\n`);
  report += `\n</details>\n`;

  // ============================================================================
  // SAUVEGARDE DES FICHIERS
  // ============================================================================

  const reportPath = path.join(__dirname, 'INFLUENCER_TRANSLATIONS_AUDIT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 Rapport Markdown sauvegardé: ${reportPath}`);

  const jsonPath = path.join(__dirname, 'INFLUENCER_MISSING_KEYS.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    summary: coverage,
    missingKeys,
    orphanedKeys,
    allKeysFromCode,
    categories,
  }, null, 2), 'utf-8');
  console.log(`📄 Rapport JSON sauvegardé: ${jsonPath}`);

  // ============================================================================
  // AFFICHAGE CONSOLE
  // ============================================================================

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(80));
  console.log(`Total clés dans le code: ${allKeysFromCode.length}`);
  console.log('');

  const completeLangs = LANGUAGES.filter(l => coverage[l].missing === 0);
  const incompleteLangs = LANGUAGES.filter(l => coverage[l].missing > 0);

  if (completeLangs.length > 0) {
    console.log(`✅ Langues COMPLÈTES (${completeLangs.length}): ${completeLangs.map(l => l.toUpperCase()).join(', ')}`);
  }
  if (incompleteLangs.length > 0) {
    console.log(`❌ Langues INCOMPLÈTES (${incompleteLangs.length}): ${incompleteLangs.map(l => l.toUpperCase()).join(', ')}`);
    console.log('');
    incompleteLangs.forEach(lang => {
      console.log(`   ${lang.toUpperCase()}: ${coverage[lang].missing} clés manquantes (${coverage[lang].percentage}% couverture)`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analyse terminée !');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================

try {
  analyzeTranslations();
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}

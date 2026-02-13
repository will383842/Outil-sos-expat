#!/usr/bin/env node
/**
 * fix-blogger-translations.cjs
 *
 * Ajoute TOUTES les traductions manquantes pour BloggerLanding dans les 9 langues.
 * Utilise les defaultMessage du fichier TSX comme source.
 *
 * Usage: node sos/scripts/fix-blogger-translations.cjs
 */

const fs = require('fs');
const path = require('path');

// Chemins
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SOS_ROOT = path.join(PROJECT_ROOT, 'sos');
const LOCALES_DIR = path.join(SOS_ROOT, 'src/locales');
const BLOGGER_LANDING_FILE = path.join(SOS_ROOT, 'src/pages/Blogger/BloggerLanding.tsx');

// 9 langues supportées
const LANGUAGES = {
  'en': 'English',
  'fr-fr': 'Français',
  'es-es': 'Español',
  'de-de': 'Deutsch',
  'pt-pt': 'Português',
  'ru-ru': 'Русский',
  'zh-cn': '中文',
  'hi-in': 'हिन्दी',
  'ar-sa': 'العربية'
};

// Extraire toutes les clés de traduction de BloggerLanding.tsx
function extractTranslationKeys() {
  console.log('📖 Lecture de BloggerLanding.tsx...');
  const content = fs.readFileSync(BLOGGER_LANDING_FILE, 'utf8');

  const translations = {};

  // Nettoyer le contenu pour gérer les sauts de ligne dans les FormattedMessage
  const cleanContent = content.replace(/\n\s*/g, ' ');

  // Pattern 1: <FormattedMessage id="..." defaultMessage="..." />
  const pattern1 = /<FormattedMessage\s+id=["']([^"']+)["']\s+defaultMessage=["']([^"']+)["']/g;
  let match;
  while ((match = pattern1.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  // Pattern 2: intl.formatMessage({ id: '...', defaultMessage: '...' })
  const pattern2 = /intl\.formatMessage\(\{\s*id:\s*["']([^"']+)["'],\s*defaultMessage:\s*["']([^"']+)["']/g;
  while ((match = pattern2.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  // Pattern 3: Dans les arrays d'objets (titleId, descId, etc.)
  const pattern3 = /(?:titleId|descId|typeId|textId):\s*["']([^"']+)["'],?\s*(?:titleDefault|descDefault|typeDefault|textDefault):\s*["']([^"']+)["']/g;
  while ((match = pattern3.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  // Pattern 4: Dans les objets FAQ ou similaires
  const pattern4 = /question:\s*intl\.formatMessage\(\{\s*id:\s*["']([^"']+)["'],\s*defaultMessage:\s*["']([^"']+)["']/g;
  while ((match = pattern4.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  const pattern5 = /answer:\s*intl\.formatMessage\(\{\s*id:\s*["']([^"']+)["'],\s*defaultMessage:\s*["']([^"']+)["']/g;
  while ((match = pattern5.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  // Pattern 6: name, icon, desc dans les arrays
  const pattern6 = /name:\s*intl\.formatMessage\(\{\s*id:\s*["']([^"']+)["'],\s*defaultMessage:\s*["']([^"']+)["']/g;
  while ((match = pattern6.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  const pattern7 = /desc:\s*intl\.formatMessage\(\{\s*id:\s*["']([^"']+)["'],\s*defaultMessage:\s*["']([^"']+)["']/g;
  while ((match = pattern7.exec(cleanContent)) !== null) {
    const [, id, defaultMessage] = match;
    if (id.startsWith('blogger.')) {
      translations[id] = defaultMessage;
    }
  }

  console.log(`✅ ${Object.keys(translations).length} clés extraites de BloggerLanding.tsx`);

  // Afficher quelques exemples
  const keys = Object.keys(translations);
  if (keys.length > 0) {
    console.log(`   Exemples: ${keys.slice(0, 5).join(', ')}`);
  }

  return translations;
}

// Nettoyer les traductions (échappements, etc.)
function cleanTranslation(text) {
  return text
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// Ajouter les traductions manquantes à un fichier JSON
function addMissingTranslations(langCode, translations) {
  const commonJsonPath = path.join(LOCALES_DIR, langCode, 'common.json');

  if (!fs.existsSync(commonJsonPath)) {
    console.log(`⚠️  Fichier non trouvé: ${commonJsonPath}`);
    return 0;
  }

  const commonJson = JSON.parse(fs.readFileSync(commonJsonPath, 'utf8'));
  let addedCount = 0;

  // Filtrer uniquement les clés blogger.*
  const bloggerKeys = Object.entries(translations).filter(([key]) => key.startsWith('blogger.'));

  for (const [key, defaultMessage] of bloggerKeys) {
    if (!commonJson[key]) {
      // Pour l'anglais, utiliser directement le defaultMessage
      if (langCode === 'en') {
        commonJson[key] = cleanTranslation(defaultMessage);
        addedCount++;
      } else {
        // Pour les autres langues, marquer comme à traduire
        commonJson[key] = `[TO TRANSLATE] ${cleanTranslation(defaultMessage)}`;
        addedCount++;
      }
    }
  }

  if (addedCount > 0) {
    // Trier les clés alphabétiquement
    const sortedJson = {};
    Object.keys(commonJson).sort().forEach(key => {
      sortedJson[key] = commonJson[key];
    });

    // Écrire avec indentation 2 espaces
    fs.writeFileSync(commonJsonPath, JSON.stringify(sortedJson, null, 2) + '\n', 'utf8');
    console.log(`  ✅ ${langCode}: ${addedCount} traductions ajoutées`);
  } else {
    console.log(`  ✓ ${langCode}: aucune traduction manquante`);
  }

  return addedCount;
}

// Générer un rapport de couverture
function generateCoverageReport(translations) {
  console.log('\n📊 Rapport de couverture des traductions:\n');

  const bloggerKeys = Object.keys(translations).filter(k => k.startsWith('blogger.'));
  const stats = {
    total: bloggerKeys.length,
    byLang: {}
  };

  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    const commonJsonPath = path.join(LOCALES_DIR, langCode, 'common.json');
    if (!fs.existsSync(commonJsonPath)) {
      console.log(`  ⚠️  ${langCode} (${langName}): fichier manquant`);
      continue;
    }

    const commonJson = JSON.parse(fs.readFileSync(commonJsonPath, 'utf8'));
    const existingKeys = bloggerKeys.filter(key => commonJson[key]);
    const missingKeys = bloggerKeys.filter(key => !commonJson[key]);
    const toTranslateKeys = bloggerKeys.filter(key =>
      commonJson[key] && typeof commonJson[key] === 'string' && commonJson[key].startsWith('[TO TRANSLATE]')
    );

    const coverage = ((existingKeys.length / bloggerKeys.length) * 100).toFixed(1);
    const translated = existingKeys.length - toTranslateKeys.length;
    const translatedPct = ((translated / bloggerKeys.length) * 100).toFixed(1);

    stats.byLang[langCode] = {
      existing: existingKeys.length,
      missing: missingKeys.length,
      toTranslate: toTranslateKeys.length,
      translated,
      coverage: parseFloat(coverage),
      translatedPct: parseFloat(translatedPct)
    };

    const icon = coverage === '100.0' ? (toTranslateKeys.length === 0 ? '✅' : '⚠️ ') : '❌';
    console.log(`  ${icon} ${langCode} (${langName}): ${existingKeys.length}/${bloggerKeys.length} (${coverage}%)`);

    if (toTranslateKeys.length > 0) {
      console.log(`      🔄 ${toTranslateKeys.length} marquées [TO TRANSLATE]`);
    }

    if (missingKeys.length > 0 && missingKeys.length <= 10) {
      console.log(`      Manquantes: ${missingKeys.join(', ')}`);
    } else if (missingKeys.length > 10) {
      console.log(`      ${missingKeys.length} clés manquantes`);
    }
  }

  return stats;
}

// Fonction principale
function main() {
  console.log('🚀 Début du fix des traductions BloggerLanding\n');

  // Vérifier que les fichiers existent
  if (!fs.existsSync(BLOGGER_LANDING_FILE)) {
    console.error(`❌ Fichier non trouvé: ${BLOGGER_LANDING_FILE}`);
    process.exit(1);
  }

  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`❌ Dossier non trouvé: ${LOCALES_DIR}`);
    process.exit(1);
  }

  // Extraire toutes les clés
  const translations = extractTranslationKeys();

  if (Object.keys(translations).length === 0) {
    console.error('❌ Aucune clé de traduction trouvée dans BloggerLanding.tsx');
    process.exit(1);
  }

  // Rapport de couverture AVANT
  generateCoverageReport(translations);

  console.log('\n📝 Ajout des traductions manquantes...\n');

  // Ajouter les traductions pour chaque langue
  let totalAdded = 0;
  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    totalAdded += addMissingTranslations(langCode, translations);
  }

  console.log(`\n✅ Terminé! ${totalAdded} traductions ajoutées au total.`);

  if (totalAdded > 0) {
    console.log('\n⚠️  NOTE: Les traductions non-anglaises sont marquées [TO TRANSLATE]');
    console.log('   Utilisez smart-translate.cjs pour traduire automatiquement.');

    // Rapport APRÈS
    generateCoverageReport(translations);
  }
}

// Exécuter
main();

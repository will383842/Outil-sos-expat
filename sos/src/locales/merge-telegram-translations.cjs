#!/usr/bin/env node
/**
 * Script pour fusionner les traductions telegram.json dans helper/*.json
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;
const HELPER_DIR = path.join(LOCALES_DIR, '..', 'helper');

// Mapping des noms de dossiers vers les noms de fichiers helper
const LANG_MAPPING = {
  'en': 'en.json',
  'fr-fr': 'fr.json',
  'es-es': 'es.json',
  'de-de': 'de.json',
  'pt-pt': 'pt.json',
  'ru-ru': 'ru.json',
  'zh-cn': 'ch.json',
  'hi-in': 'hi.json',
  'ar-sa': 'ar.json',
};

/**
 * Charge un fichier JSON
 */
function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Erreur lors du chargement de ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Sauvegarde un fichier JSON trié alphabétiquement
 */
function saveJson(filePath, data) {
  try {
    // Trier les clés alphabétiquement
    const sortedData = Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});

    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la sauvegarde de ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Fusionne les traductions telegram dans un fichier helper
 */
function mergeTelegramTranslations(langDir, helperFile) {
  const telegramPath = path.join(LOCALES_DIR, langDir, 'telegram.json');
  const helperPath = path.join(HELPER_DIR, helperFile);

  // Charger les traductions telegram
  const telegramTranslations = loadJson(telegramPath);
  if (!telegramTranslations) {
    return { added: 0, updated: 0, error: true };
  }

  // Charger le fichier helper
  const helperData = loadJson(helperPath);
  if (!helperData) {
    return { added: 0, updated: 0, error: true };
  }

  // Fusionner
  let added = 0;
  let updated = 0;

  for (const [key, value] of Object.entries(telegramTranslations)) {
    if (!helperData[key]) {
      helperData[key] = value;
      added++;
    } else if (helperData[key] !== value) {
      helperData[key] = value;
      updated++;
    }
  }

  // Sauvegarder
  if (added > 0 || updated > 0) {
    if (saveJson(helperPath, helperData)) {
      return { added, updated, error: false };
    }
  }

  return { added, updated, error: false };
}

// Main
console.log('🚀 Fusion des traductions Telegram dans helper/*.json...\n');

let totalAdded = 0;
let totalUpdated = 0;
let hasErrors = false;

for (const [langDir, helperFile] of Object.entries(LANG_MAPPING)) {
  const result = mergeTelegramTranslations(langDir, helperFile);

  if (result.error) {
    hasErrors = true;
    continue;
  }

  if (result.added > 0 || result.updated > 0) {
    console.log(
      `✅ ${langDir} → ${helperFile}: ` +
      `${result.added} ajoutées, ${result.updated} mises à jour`
    );
    totalAdded += result.added;
    totalUpdated += result.updated;
  } else {
    console.log(`ℹ️  ${langDir} → ${helperFile}: déjà à jour`);
  }
}

console.log(
  `\n🎉 Total: ${totalAdded} traductions ajoutées, ${totalUpdated} mises à jour sur 9 langues`
);

if (hasErrors) {
  console.log('\n⚠️  Des erreurs se sont produites lors de la fusion');
  process.exit(1);
}

process.exit(0);

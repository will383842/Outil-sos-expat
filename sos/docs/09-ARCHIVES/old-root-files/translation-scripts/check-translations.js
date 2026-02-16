const fs = require('fs');
const path = require('path');

const LOCALES_DIR = './sos/src/locales';
const LANGUAGES = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

// Sections à vérifier
const SECTIONS_TO_CHECK = ['influencer', 'blogger', 'groupadmin'];

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getKeysForSection(keys, section) {
  return keys.filter(key => key.startsWith(`${section}.`));
}

console.log('🔍 Vérification des traductions pour influencer, blogger et adminGroup\n');
console.log('=' .repeat(80));

// Charger toutes les traductions
const translations = {};
for (const lang of LANGUAGES) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    translations[lang] = flattenKeys(data);
  } catch (error) {
    console.error(`❌ Erreur lecture ${lang}:`, error.message);
    translations[lang] = [];
  }
}

// Analyser chaque section
for (const section of SECTIONS_TO_CHECK) {
  console.log(`\n\n📋 SECTION: ${section.toUpperCase()}`);
  console.log('-'.repeat(80));

  // Collecter toutes les clés uniques pour cette section
  const allKeysSet = new Set();
  for (const lang of LANGUAGES) {
    const sectionKeys = getKeysForSection(translations[lang], section);
    sectionKeys.forEach(key => allKeysSet.add(key));
  }

  const allKeys = Array.from(allKeysSet).sort();

  if (allKeys.length === 0) {
    console.log(`⚠️  Aucune clé trouvée pour la section "${section}"`);
    continue;
  }

  console.log(`\n✅ ${allKeys.length} clés trouvées pour cette section\n`);

  // Vérifier chaque langue
  const results = {};
  for (const lang of LANGUAGES) {
    const langKeys = getKeysForSection(translations[lang], section);
    const missing = allKeys.filter(key => !langKeys.includes(key));
    results[lang] = {
      total: allKeys.length,
      present: langKeys.length,
      missing: missing
    };
  }

  // Afficher le résumé
  console.log('Langue    | Total | Présentes | Manquantes | Status');
  console.log('-'.repeat(80));

  for (const lang of LANGUAGES) {
    const r = results[lang];
    const status = r.missing.length === 0 ? '✅ Complet' : `❌ ${r.missing.length} manquantes`;
    const langDisplay = lang.padEnd(9);
    console.log(`${langDisplay} | ${r.total.toString().padEnd(5)} | ${r.present.toString().padEnd(9)} | ${r.missing.length.toString().padEnd(10)} | ${status}`);
  }

  // Afficher les détails des clés manquantes
  console.log('\n📝 Détails des clés manquantes:');
  let hasMissing = false;
  for (const lang of LANGUAGES) {
    if (results[lang].missing.length > 0) {
      hasMissing = true;
      console.log(`\n  ${lang.toUpperCase()}:`);
      results[lang].missing.forEach(key => {
        console.log(`    - ${key}`);
      });
    }
  }

  if (!hasMissing) {
    console.log('  🎉 Aucune clé manquante !');
  }
}

console.log('\n' + '='.repeat(80));
console.log('✨ Vérification terminée\n');

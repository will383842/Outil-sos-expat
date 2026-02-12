#!/usr/bin/env node
/**
 * Script pour synchroniser complètement toutes les langues
 * Trouve toutes les clés uniques de toutes les langues et s'assure que chaque langue les a toutes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;
const allLangs = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

// Étape 1 : Collecter toutes les clés uniques de toutes les langues
console.log('📋 Collecte de toutes les clés uniques...\n');

const allUniqueKeys = new Set();
const langData = {};

for (const lang of allLangs) {
  const langPath = path.join(LOCALES_DIR, lang, 'common.json');
  const content = fs.readFileSync(langPath, 'utf8');
  const data = JSON.parse(content);

  langData[lang] = data;

  for (const key of Object.keys(data)) {
    allUniqueKeys.add(key);
  }
}

console.log(`✅ Total de clés uniques trouvées : ${allUniqueKeys.size}\n`);

// Étape 2 : Pour chaque langue, ajouter les clés manquantes
console.log('🔄 Synchronisation en cours...\n');

let totalAdded = 0;

for (const lang of allLangs) {
  const missingKeys = [];

  for (const key of allUniqueKeys) {
    if (!langData[lang][key]) {
      missingKeys.push(key);

      // Essayer de trouver la valeur dans une autre langue (priorité : FR > EN)
      if (langData['fr-fr'] && langData['fr-fr'][key]) {
        langData[lang][key] = langData['fr-fr'][key];
      } else if (langData['en'] && langData['en'][key]) {
        langData[lang][key] = langData['en'][key];
      } else {
        // Fallback : prendre la première valeur trouvée
        for (const otherLang of allLangs) {
          if (langData[otherLang][key]) {
            langData[lang][key] = langData[otherLang][key];
            break;
          }
        }
      }
    }
  }

  if (missingKeys.length > 0) {
    console.log(`⚠️  ${lang}: ${missingKeys.length} clés ajoutées`);
    totalAdded += missingKeys.length;

    // Sauvegarder avec tri alphabétique
    const sortedData = Object.keys(langData[lang]).sort().reduce((acc, key) => {
      acc[key] = langData[lang][key];
      return acc;
    }, {});

    const langPath = path.join(LOCALES_DIR, lang, 'common.json');
    fs.writeFileSync(langPath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
  } else {
    console.log(`✅ ${lang}: complet`);
  }
}

console.log(`\n🎉 Synchronisation terminée !`);
console.log(`   Total de clés ajoutées : ${totalAdded}`);
console.log(`   Toutes les langues ont maintenant ${allUniqueKeys.size} clés`);

if (totalAdded > 0) {
  console.log(`\n⚠️  Note : Les clés ajoutées utilisent des traductions de fallback (FR ou EN).`);
  console.log(`   Certaines peuvent nécessiter une révision manuelle.`);
}

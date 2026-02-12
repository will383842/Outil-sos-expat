#!/usr/bin/env node
/**
 * Script pour synchroniser toutes les clés entre les langues
 * Utilise FR comme référence et ajoute les clés manquantes dans les autres langues
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;
const REFERENCE_LANG = 'fr-fr';

// Lire le fichier de référence (FR)
const refPath = path.join(LOCALES_DIR, REFERENCE_LANG, 'common.json');
const refContent = fs.readFileSync(refPath, 'utf8');
const refKeys = JSON.parse(refContent);

const allLangs = ['en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

console.log(`📋 Référence: ${REFERENCE_LANG} (${Object.keys(refKeys).length} clés)\n`);

let totalAdded = 0;

for (const lang of allLangs) {
  const langPath = path.join(LOCALES_DIR, lang, 'common.json');
  const langContent = fs.readFileSync(langPath, 'utf8');
  const langKeys = JSON.parse(langContent);

  const missingKeys = [];

  // Trouver les clés manquantes
  for (const key of Object.keys(refKeys)) {
    if (!langKeys[key]) {
      missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    console.log(`⚠️  ${lang}: ${missingKeys.length} clés manquantes`);
    console.log(`   Clés: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`);

    // Ajouter les clés manquantes avec une traduction par défaut (valeur FR)
    for (const key of missingKeys) {
      langKeys[key] = refKeys[key]; // Utilise la valeur FR comme fallback
    }

    // Trier et sauvegarder
    const sortedData = Object.keys(langKeys).sort().reduce((acc, key) => {
      acc[key] = langKeys[key];
      return acc;
    }, {});

    fs.writeFileSync(langPath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
    totalAdded += missingKeys.length;
  } else {
    console.log(`✅ ${lang}: complet (${Object.keys(langKeys).length} clés)`);
  }
}

console.log(`\n🎉 Total: ${totalAdded} clés ajoutées/synchronisées`);

if (totalAdded > 0) {
  console.log(`\n⚠️  Note: Les clés ajoutées utilisent temporairement la traduction FR.`);
  console.log(`   Vous devrez les traduire manuellement dans chaque langue.`);
}

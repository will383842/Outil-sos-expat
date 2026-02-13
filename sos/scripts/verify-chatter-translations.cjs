#!/usr/bin/env node
/**
 * Script de vérification de la complétude des traductions Chatter
 * Usage: node verify-chatter-translations.cjs
 */

const fs = require('fs');
const path = require('path');

// Chemins
const helperDir = path.join(__dirname, '..', 'src', 'helper');
const missingKeysPath = path.join(__dirname, '..', '..', 'CHATTER_MISSING_KEYS.json');

// Langues
const languages = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];

console.log('🔍 Vérification de la complétude des traductions Chatter...\n');

// Charger le fichier des clés manquantes
const missingKeysData = JSON.parse(fs.readFileSync(missingKeysPath, 'utf8'));
const allMissingKeys = missingKeysData.missingInAllLanguages;
const someMissingKeys = missingKeysData.missingInSomeLanguages;

console.log(`📋 Clés à vérifier:`);
console.log(`   - ${allMissingKeys.length} clés manquantes dans toutes les langues`);
console.log(`   - ${someMissingKeys.length} clés manquantes dans certaines langues\n`);

// Statistiques
let globalStats = {
  totalChecks: 0,
  found: 0,
  missing: 0,
  missingByLang: {}
};

// Vérifier chaque langue
languages.forEach(lang => {
  const filePath = path.join(helperDir, `${lang}.json`);
  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let missingInLang = [];

  // Vérifier les clés manquantes dans toutes les langues
  allMissingKeys.forEach(key => {
    globalStats.totalChecks++;
    if (langData[key]) {
      globalStats.found++;
    } else {
      globalStats.missing++;
      missingInLang.push(key);
    }
  });

  // Vérifier les clés manquantes dans certaines langues
  someMissingKeys.forEach(item => {
    const langCode = lang.toUpperCase();
    if (item.missing.includes(langCode) || (lang === 'pt' && item.missing.includes('PT'))) {
      globalStats.totalChecks++;
      if (langData[item.key]) {
        globalStats.found++;
      } else {
        globalStats.missing++;
        missingInLang.push(item.key);
      }
    }
  });

  // Afficher le résultat pour cette langue
  if (missingInLang.length > 0) {
    console.log(`❌ ${lang.toUpperCase()}: ${missingInLang.length} clés manquantes`);
    globalStats.missingByLang[lang] = missingInLang;
    missingInLang.slice(0, 5).forEach(key => {
      console.log(`   - ${key}`);
    });
    if (missingInLang.length > 5) {
      console.log(`   ... et ${missingInLang.length - 5} autres`);
    }
  } else {
    console.log(`✅ ${lang.toUpperCase()}: Toutes les clés présentes`);
  }
});

// Rapport final
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT FINAL DE VÉRIFICATION');
console.log('='.repeat(60));
console.log(`Total de vérifications: ${globalStats.totalChecks}`);
console.log(`✅ Clés trouvées: ${globalStats.found} (${Math.round(globalStats.found * 100 / globalStats.totalChecks)}%)`);
console.log(`❌ Clés manquantes: ${globalStats.missing} (${Math.round(globalStats.missing * 100 / globalStats.totalChecks)}%)`);

if (globalStats.missing === 0) {
  console.log('\n🎉 SUCCÈS COMPLET ! Toutes les traductions Chatter sont présentes dans toutes les langues !');
} else {
  console.log('\n⚠️  Des traductions sont encore manquantes dans les langues suivantes:');
  Object.keys(globalStats.missingByLang).forEach(lang => {
    console.log(`   - ${lang.toUpperCase()}: ${globalStats.missingByLang[lang].length} clés`);
  });
}

console.log('\n✅ Vérification terminée !');

// Retourner un code d'erreur si des traductions manquent
process.exit(globalStats.missing > 0 ? 1 : 0);

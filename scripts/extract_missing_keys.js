const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../sos/src/helper');

// Charger tous les fichiers de traduction
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];
const translations = {};

langs.forEach(lang => {
  translations[lang] = JSON.parse(fs.readFileSync(path.join(basePath, `${lang}.json`), 'utf-8'));
});

// Créer l'ensemble des clés de référence (FR + EN)
const refKeys = new Set([
  ...Object.keys(translations.fr),
  ...Object.keys(translations.en)
]);

// Filtrer les clés parasites (===...)
const cleanRefKeys = [...refKeys].filter(k => !k.startsWith('==='));

console.log('Clés de référence totales:', cleanRefKeys.length);

// Pour chaque langue, trouver les clés manquantes
langs.forEach(lang => {
  if (lang === 'fr' || lang === 'en') return;

  const langKeys = new Set(Object.keys(translations[lang]));
  const missing = cleanRefKeys.filter(k => !langKeys.has(k));

  console.log(`${lang.toUpperCase()}: ${missing.length} clés manquantes`);
});

// Créer un fichier avec toutes les clés manquantes et leurs valeurs FR/EN
const missingData = {};
cleanRefKeys.forEach(key => {
  // Vérifier si la clé manque dans au moins une langue
  const missingInLangs = langs.filter(lang => {
    if (lang === 'fr' || lang === 'en') return false;
    return !translations[lang][key];
  });

  if (missingInLangs.length > 0) {
    missingData[key] = {
      fr: translations.fr[key] || '',
      en: translations.en[key] || '',
      missingIn: missingInLangs
    };
  }
});

// Sauvegarder
fs.writeFileSync(
  path.join(__dirname, '../missing_keys_analysis.json'),
  JSON.stringify(missingData, null, 2)
);

console.log('\nFichier missing_keys_analysis.json créé');
console.log('Clés à traduire:', Object.keys(missingData).length);

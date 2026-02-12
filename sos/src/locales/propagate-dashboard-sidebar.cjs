#!/usr/bin/env node
/**
 * Script de propagation des clés Dashboard sidebar
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;

// Traductions EN
const enTranslations = {
  "blogger.sidebar.perClient": "/call",
  "blogger.sidebar.perRecruit": "/partner"
};

// Traductions ES
const esTranslations = {
  "blogger.sidebar.perClient": "/llamada",
  "blogger.sidebar.perRecruit": "/socio"
};

// Traductions DE
const deTranslations = {
  "blogger.sidebar.perClient": "/Anruf",
  "blogger.sidebar.perRecruit": "/Partner"
};

// Traductions PT
const ptTranslations = {
  "blogger.sidebar.perClient": "/chamada",
  "blogger.sidebar.perRecruit": "/parceiro"
};

// Traductions RU
const ruTranslations = {
  "blogger.sidebar.perClient": "/звонок",
  "blogger.sidebar.perRecruit": "/партнер"
};

// Traductions ZH
const zhTranslations = {
  "blogger.sidebar.perClient": "/通话",
  "blogger.sidebar.perRecruit": "/合作伙伴"
};

// Traductions HI
const hiTranslations = {
  "blogger.sidebar.perClient": "/कॉल",
  "blogger.sidebar.perRecruit": "/साझेदार"
};

// Traductions AR
const arTranslations = {
  "blogger.sidebar.perClient": "/مكالمة",
  "blogger.sidebar.perRecruit": "/شريك"
};

// Map de toutes les langues
const translationsMap = {
  'en': enTranslations,
  'es-es': esTranslations,
  'de-de': deTranslations,
  'pt-pt': ptTranslations,
  'ru-ru': ruTranslations,
  'zh-cn': zhTranslations,
  'hi-in': hiTranslations,
  'ar-sa': arTranslations
};

// Fonction pour mettre à jour un fichier JSON
function updateJsonFile(filePath, translations) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let updated = false;

    for (const [key, value] of Object.entries(translations)) {
      if (!data[key] || data[key] !== value) {
        data[key] = value;
        updated = true;
      }
    }

    if (updated) {
      // Trier les clés alphabétiquement
      const sortedData = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});

      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      return Object.keys(translations).length;
    }

    return 0;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de ${filePath}:`, error.message);
    return 0;
  }
}

// Main
let totalUpdates = 0;

for (const [lang, translations] of Object.entries(translationsMap)) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Fichier non trouvé : ${filePath}`);
    continue;
  }

  const count = updateJsonFile(filePath, translations);
  if (count > 0) {
    console.log(`✅ ${lang}: ${count} clés mises à jour`);
    totalUpdates += count;
  }
}

console.log(`\n🎉 Total: ${totalUpdates} traductions propagées sur 8 langues`);

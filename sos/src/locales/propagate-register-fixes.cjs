#!/usr/bin/env node
/**
 * Script de propagation des corrections Register pages
 * Corrige GroupAdmin et Influencer Register
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;

// Traductions EN
const enTranslations = {
  "groupadmin.register.seo.description": "Register as a Group Admin to earn $10 per call referred.",
  "groupadmin.register.subtitle": "Earn $10 per call referred from your group",
  "influencer.register.benefit1": "$10 per call referred",
  "influencer.register.benefit2.v3": "$5 per call to your lawyer or expat helper partners"
};

// Traductions ES
const esTranslations = {
  "groupadmin.register.seo.description": "Regístrese como Administrador de Grupo para ganar $10 por llamada referida.",
  "groupadmin.register.subtitle": "Gane $10 por llamada referida desde su grupo",
  "influencer.register.benefit1": "$10 por llamada referida",
  "influencer.register.benefit2.v3": "$5 por llamada a sus socios abogados o ayudantes de expatriados"
};

// Traductions DE
const deTranslations = {
  "groupadmin.register.seo.description": "Registrieren Sie sich als Gruppenadministrator, um $10 pro Anruf zu verdienen.",
  "groupadmin.register.subtitle": "Verdienen Sie $10 pro Anruf aus Ihrer Gruppe",
  "influencer.register.benefit1": "$10 pro Anruf",
  "influencer.register.benefit2.v3": "$5 pro Anruf an Ihre Anwalts- oder Expat-Helfer-Partner"
};

// Traductions PT
const ptTranslations = {
  "groupadmin.register.seo.description": "Registre-se como Administrador de Grupo para ganhar $10 por chamada referida.",
  "groupadmin.register.subtitle": "Ganhe $10 por chamada referida do seu grupo",
  "influencer.register.benefit1": "$10 por chamada referida",
  "influencer.register.benefit2.v3": "$5 por chamada para seus parceiros advogados ou assistentes de expatriados"
};

// Traductions RU
const ruTranslations = {
  "groupadmin.register.seo.description": "Зарегистрируйтесь в качестве администратора группы, чтобы зарабатывать $10 за звонок.",
  "groupadmin.register.subtitle": "Зарабатывайте $10 за звонок из вашей группы",
  "influencer.register.benefit1": "$10 за звонок",
  "influencer.register.benefit2.v3": "$5 за звонок вашим партнерам-юристам или помощникам экспатов"
};

// Traductions ZH
const zhTranslations = {
  "groupadmin.register.seo.description": "注册为群组管理员，每次推荐电话赚取$10。",
  "groupadmin.register.subtitle": "从您的群组推荐电话每次赚取$10",
  "influencer.register.benefit1": "每次推荐电话$10",
  "influencer.register.benefit2.v3": "每次致电您的律师或外派助手合作伙伴$5"
};

// Traductions HI
const hiTranslations = {
  "groupadmin.register.seo.description": "प्रति कॉल $10 कमाने के लिए समूह व्यवस्थापक के रूप में पंजीकरण करें।",
  "groupadmin.register.subtitle": "अपने समूह से प्रति कॉल $10 कमाएं",
  "influencer.register.benefit1": "प्रति कॉल $10",
  "influencer.register.benefit2.v3": "आपके वकील या प्रवासी सहायक साझेदारों को प्रति कॉल $5"
};

// Traductions AR
const arTranslations = {
  "groupadmin.register.seo.description": "سجل كمسؤول مجموعة لكسب 10 دولارات لكل مكالمة.",
  "groupadmin.register.subtitle": "اربح 10 دولارات لكل مكالمة من مجموعتك",
  "influencer.register.benefit1": "10 دولارات لكل مكالمة",
  "influencer.register.benefit2.v3": "5 دولارات لكل مكالمة لشركائك المحامين أو مساعدي المغتربين"
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

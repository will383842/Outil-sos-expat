#!/usr/bin/env node
/**
 * Script pour ajouter les traductions du texte hardcodé trouvé
 * GroupAdmin: 9 textes + Influencer: 4 noms de plateformes
 */

const fs = require('fs');
const path = require('path');

const translationDir = path.join(__dirname, '../src/helper');
const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

// ==========================================
// GROUPADMIN - 9 TEXTES HARDCODÉS
// ==========================================
const groupAdminHardcodedKeys = {
  "groupadmin.examples.small.title": {
    fr: "Petit groupe",
    en: "Small group",
    es: "Grupo pequeño",
    de: "Kleine Gruppe",
    pt: "Grupo pequeno",
    ru: "Маленькая группа",
    ch: "小组",
    hi: "छोटा समूह",
    ar: "مجموعة صغيرة"
  },
  "groupadmin.examples.small.members": {
    fr: "5K membres",
    en: "5K members",
    es: "5K miembros",
    de: "5K Mitglieder",
    pt: "5K membros",
    ru: "5K участников",
    ch: "5K成员",
    hi: "5K सदस्य",
    ar: "5K أعضاء"
  },
  "groupadmin.examples.small.earnings": {
    fr: "~1000$/mois",
    en: "~$1000/month",
    es: "~1000$/mes",
    de: "~1000$/Monat",
    pt: "~1000$/mês",
    ru: "~1000$/месяц",
    ch: "~1000美元/月",
    hi: "~1000$/माह",
    ar: "~1000$/شهر"
  },
  "groupadmin.examples.medium.title": {
    fr: "Moyen groupe",
    en: "Medium group",
    es: "Grupo mediano",
    de: "Mittlere Gruppe",
    pt: "Grupo médio",
    ru: "Средняя группа",
    ch: "中等组",
    hi: "मध्यम समूह",
    ar: "مجموعة متوسطة"
  },
  "groupadmin.examples.medium.members": {
    fr: "20K membres",
    en: "20K members",
    es: "20K miembros",
    de: "20K Mitglieder",
    pt: "20K membros",
    ru: "20K участников",
    ch: "20K成员",
    hi: "20K सदस्य",
    ar: "20K أعضاء"
  },
  "groupadmin.examples.medium.earnings": {
    fr: "~4000$/mois",
    en: "~$4000/month",
    es: "~4000$/mes",
    de: "~4000$/Monat",
    pt: "~4000$/mês",
    ru: "~4000$/месяц",
    ch: "~4000美元/月",
    hi: "~4000$/माह",
    ar: "~4000$/شهر"
  },
  "groupadmin.examples.large.title": {
    fr: "Grand groupe",
    en: "Large group",
    es: "Grupo grande",
    de: "Große Gruppe",
    pt: "Grupo grande",
    ru: "Большая группа",
    ch: "大组",
    hi: "बड़ा समूह",
    ar: "مجموعة كبيرة"
  },
  "groupadmin.examples.large.members": {
    fr: "50K membres",
    en: "50K members",
    es: "50K miembros",
    de: "50K Mitglieder",
    pt: "50K membros",
    ru: "50K участников",
    ch: "50K成员",
    hi: "50K सदस्य",
    ar: "50K أعضاء"
  },
  "groupadmin.examples.large.earnings": {
    fr: "~10 000$/mois",
    en: "~$10,000/month",
    es: "~10 000$/mes",
    de: "~10 000$/Monat",
    pt: "~10 000$/mês",
    ru: "~10 000$/месяц",
    ch: "~10 000美元/月",
    hi: "~10 000$/माह",
    ar: "~10 000$/شهر"
  }
};

// ==========================================
// INFLUENCER - 4 NOMS DE PLATEFORMES
// ==========================================
const influencerPlatformKeys = {
  "influencer.platform.youtube.name": {
    fr: "YouTube",
    en: "YouTube",
    es: "YouTube",
    de: "YouTube",
    pt: "YouTube",
    ru: "YouTube",
    ch: "YouTube",
    hi: "YouTube",
    ar: "يوتيوب"
  },
  "influencer.platform.instagram.name": {
    fr: "Instagram",
    en: "Instagram",
    es: "Instagram",
    de: "Instagram",
    pt: "Instagram",
    ru: "Instagram",
    ch: "Instagram",
    hi: "Instagram",
    ar: "إنستغرام"
  },
  "influencer.platform.tiktok.name": {
    fr: "TikTok",
    en: "TikTok",
    es: "TikTok",
    de: "TikTok",
    pt: "TikTok",
    ru: "TikTok",
    ch: "TikTok",
    hi: "TikTok",
    ar: "تيك توك"
  },
  "influencer.platform.blog.name": {
    fr: "Blog",
    en: "Blog",
    es: "Blog",
    de: "Blog",
    pt: "Blog",
    ru: "Блог",
    ch: "博客",
    hi: "ब्लॉग",
    ar: "مدونة"
  }
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
function addHardcodedTranslations() {
  console.log('🔧 Ajout des traductions du texte hardcodé...\n');

  let totalAdded = 0;

  languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      let added = 0;

      // Ajouter GroupAdmin hardcoded
      Object.entries(groupAdminHardcodedKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      // Ajouter Influencer platforms
      Object.entries(influencerPlatformKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      // Sauvegarder
      fs.writeFileSync(
        filePath,
        JSON.stringify(translations, null, 2) + '\n',
        'utf8'
      );

      console.log(`✅ ${lang.toUpperCase()}: ${added} clés ajoutées`);
      totalAdded += added;

    } catch (error) {
      console.error(`❌ Erreur pour ${lang}.json:`, error.message);
    }
  });

  console.log(`\n✨ Total: ${totalAdded} clés ajoutées`);
  console.log('📦 GroupAdmin: 9 clés (exemples de groupes)');
  console.log('📦 Influencer: 4 clés (noms de plateformes)');
}

addHardcodedTranslations();

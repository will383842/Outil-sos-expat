const fs = require('fs');
const path = require('path');

// 1. Ajouter les clés aux fichiers de traduction
const basePath = path.join(__dirname, '../sos/src/helper');
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];

const newTranslations = {
  'contact.funStats.ultraFast': {
    fr: 'Ultra rapide',
    en: 'Ultra fast',
    de: 'Blitzschnell',
    es: 'Ultra rápido',
    pt: 'Ultra rápido',
    ru: 'Сверхбыстрый',
    hi: 'अति तेज़',
    ar: 'سريع للغاية',
    ch: '极速'
  },
  'contact.funStats.withSmile': {
    fr: 'Avec le sourire',
    en: 'With a smile',
    de: 'Mit einem Lächeln',
    es: 'Con una sonrisa',
    pt: 'Com um sorriso',
    ru: 'С улыбкой',
    hi: 'मुस्कान के साथ',
    ar: 'بابتسامة',
    ch: '微笑服务'
  },
  'contact.funStats.tailored': {
    fr: 'Sur-mesure',
    en: 'Tailored',
    de: 'Maßgeschneidert',
    es: 'A medida',
    pt: 'Sob medida',
    ru: 'Индивидуальный подход',
    hi: 'अनुकूलित',
    ar: 'مخصص',
    ch: '量身定制'
  }
};

// Charger et mettre à jour les fichiers de traduction
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  Object.entries(newTranslations).forEach(([key, values]) => {
    if (values[lang] && !translations[key]) {
      translations[key] = values[lang];
    }
  });

  // Trier et sauvegarder
  const sortedKeys = Object.keys(translations).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = translations[k]);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
});

console.log('✅ Traductions Contact ajoutées aux fichiers JSON');

// 2. Modifier Contact.tsx pour ajouter les nouvelles clés dans l'objet t
const contactPath = path.join(__dirname, '../sos/src/pages/Contact.tsx');
let content = fs.readFileSync(contactPath, 'utf-8');

// Ajouter les nouvelles clés dans l'objet t (après "required:")
content = content.replace(
  'required: intl.formatMessage({ id: "contact.required" }),',
  `required: intl.formatMessage({ id: "contact.required" }),

      // Fun stats
      ultraFast: intl.formatMessage({ id: "contact.funStats.ultraFast" }),
      withSmile: intl.formatMessage({ id: "contact.funStats.withSmile" }),
      tailored: intl.formatMessage({ id: "contact.funStats.tailored" }),`
);

// Remplacer les textes hardcodés dans le JSX
content = content.replace(
  '<div className="text-emerald-600">Ultra rapide</div>',
  '<div className="text-emerald-600">{t.ultraFast}</div>'
);
content = content.replace(
  '<div className="text-emerald-600">Avec le sourire</div>',
  '<div className="text-emerald-600">{t.withSmile}</div>'
);
content = content.replace(
  '<div className="text-emerald-600">Sur-mesure</div>',
  '<div className="text-emerald-600">{t.tailored}</div>'
);

fs.writeFileSync(contactPath, content, 'utf-8');
console.log('✅ Contact.tsx mis à jour avec les traductions');

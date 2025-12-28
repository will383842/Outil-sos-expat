const fs = require('fs');
const path = require('path');

// 1. Ajouter les clés aux fichiers de traduction
const basePath = path.join(__dirname, '../sos/src/helper');
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];

const newTranslations = {
  'admin.layout.openMenu': {
    fr: 'Ouvrir le menu', en: 'Open menu', de: 'Menü öffnen', es: 'Abrir menú',
    pt: 'Abrir menu', ru: 'Открыть меню', hi: 'मेन्यू खोलें', ar: 'فتح القائمة', ch: '打开菜单'
  },
  'admin.layout.backHome': {
    fr: "Retour à l'accueil", en: 'Back to home', de: 'Zurück zur Startseite', es: 'Volver al inicio',
    pt: 'Voltar ao início', ru: 'На главную', hi: 'होम पर वापस', ar: 'العودة للرئيسية', ch: '返回首页'
  },
  'admin.layout.administration': {
    fr: 'Administration', en: 'Administration', de: 'Verwaltung', es: 'Administración',
    pt: 'Administração', ru: 'Администрирование', hi: 'प्रशासन', ar: 'الإدارة', ch: '管理'
  }
};

// Charger et mettre à jour les fichiers de traduction
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  const translations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  Object.entries(newTranslations).forEach(([key, values]) => {
    if (values[lang]) {
      translations[key] = values[lang];
    }
  });

  // Trier et sauvegarder
  const sortedKeys = Object.keys(translations).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = translations[k]);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
});

console.log('✅ Traductions AdminLayout ajoutées aux fichiers JSON');

// 2. Modifier AdminLayout.tsx
const adminPath = path.join(__dirname, '../sos/src/components/admin/AdminLayout.tsx');
let content = fs.readFileSync(adminPath, 'utf-8');

// Ajouter l'import useLanguage si pas déjà présent
if (!content.includes("import { useLanguage }") && !content.includes("useLanguage")) {
  content = content.replace(
    "import { useAuth } from '../../contexts/AuthContext';",
    "import { useAuth } from '../../contexts/AuthContext';\nimport { useLanguage } from '../../contexts/LanguageContext';"
  );
}

// Ajouter le hook useLanguage dans le composant
if (!content.includes("const { t } = useLanguage()")) {
  content = content.replace(
    "const { user, logout } = useAuth();",
    "const { user, logout } = useAuth();\n  const { t } = useLanguage();"
  );
}

// Remplacer les textes hardcodés
content = content.replace(
  'aria-label="Ouvrir le menu"',
  "aria-label={t('admin.layout.openMenu')}"
);
content = content.replace(
  'aria-label="Retour à l\'accueil"',
  "aria-label={t('admin.layout.backHome')}"
);
content = content.replace(
  '<span className="text-gray-900 font-medium">Administration</span>',
  "<span className=\"text-gray-900 font-medium\">{t('admin.layout.administration')}</span>"
);

fs.writeFileSync(adminPath, content, 'utf-8');
console.log('✅ AdminLayout.tsx mis à jour avec les traductions');

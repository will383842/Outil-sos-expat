/**
 * Script to extract hardcoded legal documents from TSX files
 * and save them to a JSON file for migration
 *
 * Run with: node scripts/extract-legal-docs.js
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');

const files = [
  { file: 'TermsClients.tsx', type: 'terms' },
  { file: 'TermsLawyers.tsx', type: 'terms_lawyers' },
  { file: 'TermsExpats.tsx', type: 'terms_expats' },
  { file: 'Cookies.tsx', type: 'cookies' },
  { file: 'Consumers.tsx', type: 'legal' },
  { file: 'PrivacyPolicy.tsx', type: 'privacy' },
];

const languageMap = {
  'defaultFr': 'fr',
  'defaultEn': 'en',
  'defaultEs': 'es',
  'defaultDe': 'de',
  'defaultRu': 'ru',
  'defaultHi': 'hi',
  'defaultPt': 'pt',
  'defaultCh': 'ch',
  'defaultAr': 'ar',
};

const titles = {
  'terms': {
    'fr': 'CGU Clients - Français',
    'en': 'Terms & Conditions - English',
    'es': 'Términos y Condiciones - Español',
    'de': 'AGB Kunden - Deutsch',
    'ru': 'Условия использования - Русский',
    'hi': 'नियम और शर्तें - हिन्दी',
    'pt': 'Termos e Condições - Português',
    'ch': '客户条款 - 中文',
    'ar': 'الشروط والأحكام - العربية',
  },
  'terms_lawyers': {
    'fr': 'CGU Avocats - Français',
    'en': 'Lawyer Terms - English',
    'es': 'Términos Abogados - Español',
    'de': 'AGB Anwälte - Deutsch',
    'ru': 'Условия для адвокатов - Русский',
    'hi': 'वकील की शर्तें - हिन्दी',
    'pt': 'Termos Advogados - Português',
    'ch': '律师条款 - 中文',
    'ar': 'شروط المحامين - العربية',
  },
  'terms_expats': {
    'fr': 'CGU Expatriés Aidants - Français',
    'en': 'Expat Helper Terms - English',
    'es': 'Términos Expatriados - Español',
    'de': 'AGB Expat-Helfer - Deutsch',
    'ru': 'Условия для помощников - Русский',
    'hi': 'प्रवासी सहायक शर्तें - हिन्दी',
    'pt': 'Termos Expatriados - Português',
    'ch': '外籍助手条款 - 中文',
    'ar': 'شروط المساعدين - العربية',
  },
  'cookies': {
    'fr': 'Politique des Cookies - Français',
    'en': 'Cookie Policy - English',
    'es': 'Política de Cookies - Español',
    'de': 'Cookie-Richtlinie - Deutsch',
    'ru': 'Политика Cookies - Русский',
    'hi': 'कुकी नीति - हिन्दी',
    'pt': 'Política de Cookies - Português',
    'ch': 'Cookie政策 - 中文',
    'ar': 'سياسة ملفات تعريف الارتباط - العربية',
  },
  'legal': {
    'fr': 'Mentions Légales - Français',
    'en': 'Legal Notice - English',
    'es': 'Aviso Legal - Español',
    'de': 'Impressum - Deutsch',
    'ru': 'Юридическая информация - Русский',
    'hi': 'कानूनी सूचना - हिन्दी',
    'pt': 'Aviso Legal - Português',
    'ch': '法律声明 - 中文',
    'ar': 'إشعار قانوني - العربية',
  },
  'privacy': {
    'fr': 'Politique de Confidentialité - Français',
    'en': 'Privacy Policy - English',
    'es': 'Política de Privacidad - Español',
    'de': 'Datenschutzerklärung - Deutsch',
    'ru': 'Политика конфиденциальности - Русский',
    'hi': 'गोपनीयता नीति - हिन्दी',
    'pt': 'Política de Privacidade - Português',
    'ch': '隐私政策 - 中文',
    'ar': 'سياسة الخصوصية - العربية',
  },
};

function extractContent(fileContent) {
  const documents = [];

  // Match patterns like: const defaultFr = `...content...`;
  // or const defaultFr = `...content...` (with or without semicolon)
  for (const [varName, lang] of Object.entries(languageMap)) {
    // Try to find the variable declaration - semicolon is optional
    const regex = new RegExp(`(?:const|let|var)\\s+${varName}\\s*=\\s*\`([\\s\\S]*?)\`\\s*;?`, 'g');

    let match;
    while ((match = regex.exec(fileContent)) !== null) {
      const content = match[1].trim();
      if (content.length > 100) { // Only include if it has substantial content
        documents.push({
          lang,
          content,
        });
        break; // Take first match only
      }
    }
  }

  return documents;
}

function main() {
  const allDocuments = [];

  for (const { file, type } of files) {
    const filePath = path.join(pagesDir, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const extracted = extractContent(content);

      console.log(`${file}: Found ${extracted.length} language variants`);

      for (const doc of extracted) {
        allDocuments.push({
          id: `${type}_${doc.lang}`,
          type,
          language: doc.lang,
          title: titles[type]?.[doc.lang] || `${type} - ${doc.lang}`,
          content: doc.content,
          isActive: true,
          version: '2.2',
        });
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }

  // Write to JSON file
  const outputPath = path.join(__dirname, '..', 'src', 'services', 'legalDocumentsData.json');
  fs.writeFileSync(outputPath, JSON.stringify(allDocuments, null, 2), 'utf-8');

  console.log(`\nTotal documents extracted: ${allDocuments.length}`);
  console.log(`Output written to: ${outputPath}`);

  // Also output a summary
  const summary = {};
  for (const doc of allDocuments) {
    if (!summary[doc.type]) summary[doc.type] = [];
    summary[doc.type].push(doc.language);
  }

  console.log('\nSummary by type:');
  for (const [type, langs] of Object.entries(summary)) {
    console.log(`  ${type}: ${langs.join(', ')} (${langs.length} languages)`);
  }
}

main();

const fs = require('fs');
const path = require('path');

// Extract all FormattedMessage id values from BloggerLanding.tsx
const bloggerLandingPath = path.join(__dirname, 'sos/src/pages/Blogger/BloggerLanding.tsx');
const bloggerLandingContent = fs.readFileSync(bloggerLandingPath, 'utf8');

// Regex to extract all id values from <FormattedMessage id="..." /> and intl.formatMessage({ id: '...' })
const idMatches = bloggerLandingContent.matchAll(/(?:id:\s*['"]|id=['"])([^'"]+)['"]/g);
const usedKeys = new Set();

for (const match of idMatches) {
  usedKeys.add(match[1]);
}

console.log(`\n🔍 Found ${usedKeys.size} unique translation keys in BloggerLanding.tsx\n`);

// Languages to check (9 languages)
const languages = [
  { code: 'fr', file: 'sos/src/helper/fr.json', name: 'Français' },
  { code: 'en', file: 'sos/src/helper/en.json', name: 'English' },
  { code: 'es', file: 'sos/src/helper/es.json', name: 'Español' },
  { code: 'de', file: 'sos/src/helper/de.json', name: 'Deutsch' },
  { code: 'pt', file: 'sos/src/helper/pt.json', name: 'Português' },
  { code: 'ru', file: 'sos/src/helper/ru.json', name: 'Русский' },
  { code: 'ch', file: 'sos/src/helper/ch.json', name: '中文' },
  { code: 'hi', file: 'sos/src/helper/hi.json', name: 'हिन्दी' },
  { code: 'ar', file: 'sos/src/helper/ar.json', name: 'العربية' },
];

const results = {};

// Check each language file
for (const lang of languages) {
  const filePath = path.join(__dirname, lang.file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${lang.name} (${lang.code}): File not found!`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const translations = JSON.parse(content);

  const missingKeys = [];

  for (const key of usedKeys) {
    if (!translations[key]) {
      missingKeys.push(key);
    }
  }

  results[lang.code] = {
    name: lang.name,
    total: usedKeys.size,
    missing: missingKeys.length,
    missingKeys: missingKeys
  };
}

// Display results
console.log('═'.repeat(80));
console.log('📊 RÉSULTATS PAR LANGUE');
console.log('═'.repeat(80));

for (const [code, data] of Object.entries(results)) {
  const percentage = ((data.total - data.missing) / data.total * 100).toFixed(1);
  const status = data.missing === 0 ? '✅' : '❌';

  console.log(`\n${status} ${data.name} (${code}): ${data.total - data.missing}/${data.total} clés (${percentage}%)`);

  if (data.missing > 0) {
    console.log(`   ⚠️  ${data.missing} clés manquantes:`);
    data.missingKeys.forEach(key => {
      console.log(`      - ${key}`);
    });
  }
}

console.log('\n' + '═'.repeat(80));

// Summary
const allComplete = Object.values(results).every(r => r.missing === 0);
if (allComplete) {
  console.log('✅ PARFAIT! Toutes les clés sont présentes dans les 9 langues!');
} else {
  const langWithMissing = Object.entries(results)
    .filter(([_, data]) => data.missing > 0)
    .map(([code, data]) => `${data.name} (${data.missing})`)
    .join(', ');
  console.log(`❌ Clés manquantes dans: ${langWithMissing}`);
}

console.log('═'.repeat(80) + '\n');

// Generate missing keys report
const allMissingKeys = new Set();
Object.values(results).forEach(r => r.missingKeys.forEach(k => allMissingKeys.add(k)));

if (allMissingKeys.size > 0) {
  console.log('\n📝 LISTE COMPLÈTE DES CLÉS MANQUANTES (au moins 1 langue):');
  console.log('─'.repeat(80));
  Array.from(allMissingKeys).sort().forEach(key => {
    const missingIn = Object.entries(results)
      .filter(([_, data]) => data.missingKeys.includes(key))
      .map(([code]) => code)
      .join(', ');
    console.log(`${key} → Manquante dans: ${missingIn}`);
  });
  console.log('─'.repeat(80));
}

// Export results as JSON
const outputPath = path.join(__dirname, 'blogger-translation-report.json');
fs.writeFileSync(outputPath, JSON.stringify({
  totalKeys: usedKeys.size,
  usedKeys: Array.from(usedKeys).sort(),
  results,
  allMissingKeys: Array.from(allMissingKeys).sort()
}, null, 2));

console.log(`\n💾 Rapport détaillé exporté: ${outputPath}\n`);

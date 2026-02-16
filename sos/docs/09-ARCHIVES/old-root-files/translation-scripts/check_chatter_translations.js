const fs = require('fs');
const path = require('path');

const languages = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];
const helperDir = 'sos/src/helper';

// Read all chatter keys from code
const keysFromCode = fs.readFileSync('chatter_keys.txt', 'utf8')
  .trim()
  .split('\n')
  .filter(k => k.length > 0);

console.log(`\n=== CHATTER TRANSLATIONS VERIFICATION ===\n`);
console.log(`Total keys found in code: ${keysFromCode.length}\n`);

// Load each language file and check
const results = {};
const missingByLang = {};
const allKeysInFiles = new Set();

languages.forEach(lang => {
  const filePath = path.join(helperDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${lang}.json`);
    results[lang] = { present: 0, missing: keysFromCode.length, coverage: 0 };
    missingByLang[lang] = keysFromCode;
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const chatterKeys = Object.keys(data).filter(k => k.startsWith('chatter.'));
  
  const missing = [];
  keysFromCode.forEach(key => {
    allKeysInFiles.add(key);
    if (!data.hasOwnProperty(key)) {
      missing.push(key);
    }
  });

  const coverage = Math.round((1 - missing.length / keysFromCode.length) * 100);
  results[lang] = {
    present: keysFromCode.length - missing.length,
    missing: missing.length,
    coverage: coverage
  };
  missingByLang[lang] = missing;

  console.log(`Language: ${lang.toUpperCase()}`);
  console.log(`  Coverage: ${coverage}% (${keysFromCode.length - missing.length}/${keysFromCode.length} keys)`);
  if (missing.length > 0 && missing.length <= 15) {
    console.log(`  Missing keys: ${missing.join(', ')}`);
  } else if (missing.length > 15) {
    console.log(`  Missing keys (first 15): ${missing.slice(0, 15).join(', ')}`);
    console.log(`  ... and ${missing.length - 15} more`);
  }
  console.log('');
});

// Summary
console.log('\n=== COVERAGE SUMMARY ===\n');
const sorted = Object.entries(results)
  .sort((a, b) => b[1].coverage - a[1].coverage);

sorted.forEach(([lang, data]) => {
  const bar = '█'.repeat(Math.round(data.coverage / 5)) + '░'.repeat(20 - Math.round(data.coverage / 5));
  console.log(`${lang.toUpperCase()}: [${bar}] ${data.coverage}% (${data.present}/${keysFromCode.length})`);
});

console.log('\n=== COMPLETE COVERAGE LANGUAGES ===\n');
const complete = sorted.filter(([_, data]) => data.missing === 0);
if (complete.length === 0) {
  console.log('❌ No language has complete coverage');
} else {
  complete.forEach(([lang, _]) => {
    console.log(`✓ ${lang.toUpperCase()}`);
  });
}

console.log(`\n=== KEY STATISTICS ===\n`);
console.log(`Total chatter keys in code: ${keysFromCode.length}`);
console.log(`Unique keys found in files: ${allKeysInFiles.size}`);

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  totalKeysInCode: keysFromCode.length,
  languages: results,
  missingKeysByLanguage: missingByLang
};

fs.writeFileSync('chatter_translations_report.json', JSON.stringify(report, null, 2));
console.log(`\nDetailed report saved to: chatter_translations_report.json`);

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '..', 'src', 'helper');
const REFERENCE_FILE = 'en.json';
const SKIP_FILES = ['en.json', 'fr.json'];
const LANG_FILES = ['es.json', 'de.json', 'pt.json', 'ru.json', 'ch.json', 'hi.json', 'ar.json'];

// Load reference (en.json)
const enData = JSON.parse(fs.readFileSync(path.join(HELPER_DIR, REFERENCE_FILE), 'utf8'));
const enKeys = Object.keys(enData);

console.log(`Reference: ${REFERENCE_FILE} has ${enKeys.length} keys\n`);

const report = {
  reference: REFERENCE_FILE,
  referenceKeyCount: enKeys.length,
  generatedAt: new Date().toISOString(),
  languages: {}
};

for (const langFile of LANG_FILES) {
  const filePath = path.join(HELPER_DIR, langFile);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${langFile} not found`);
    continue;
  }

  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langKeys = new Set(Object.keys(langData));
  const missingKeys = enKeys.filter(k => !langKeys.has(k));
  const extraKeys = Object.keys(langData).filter(k => !(k in enData));

  report.languages[langFile] = {
    totalKeys: langKeys.size,
    missingCount: missingKeys.length,
    extraCount: extraKeys.length,
    first20Missing: missingKeys.slice(0, 20),
    first10Extra: extraKeys.slice(0, 10)
  };

  console.log(`${langFile}: ${langKeys.size} keys, ${missingKeys.length} missing, ${extraKeys.length} extra`);
}

const outputPath = path.join(__dirname, 'missing-translations-report.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`\nReport written to: ${outputPath}`);

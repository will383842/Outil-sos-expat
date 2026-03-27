const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '..', 'src', 'helper');
const REFERENCE_FILE = 'en.json';
const LANG_FILES = ['es.json', 'de.json', 'pt.json', 'ru.json', 'ch.json', 'hi.json', 'ar.json'];

// Load reference (en.json)
const enData = JSON.parse(fs.readFileSync(path.join(HELPER_DIR, REFERENCE_FILE), 'utf8'));
const enKeys = Object.keys(enData);

console.log(`Reference: ${REFERENCE_FILE} has ${enKeys.length} keys\n`);

let totalAdded = 0;

for (const langFile of LANG_FILES) {
  const filePath = path.join(HELPER_DIR, langFile);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${langFile} not found`);
    continue;
  }

  const langData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langKeys = new Set(Object.keys(langData));

  // Find missing keys
  const missingKeys = enKeys.filter(k => !langKeys.has(k));

  if (missingKeys.length === 0) {
    console.log(`${langFile}: already complete (${langKeys.size} keys)`);
    continue;
  }

  // Build updated object: keep existing keys in their order, then append missing ones
  const updated = { ...langData };
  let added = 0;

  for (const key of missingKeys) {
    updated[key] = `[EN] ${enData[key]}`;
    added++;
  }

  // Write the updated file
  const jsonStr = JSON.stringify(updated, null, 2) + '\n';

  // Validate JSON is valid before writing
  try {
    JSON.parse(jsonStr);
  } catch (e) {
    console.error(`ERROR: Generated invalid JSON for ${langFile}, skipping!`);
    continue;
  }

  fs.writeFileSync(filePath, jsonStr, 'utf8');
  totalAdded += added;

  console.log(`${langFile}: added ${added} missing keys (${langKeys.size} -> ${langKeys.size + added} total)`);
}

console.log(`\nDone! Total keys added across all files: ${totalAdded}`);

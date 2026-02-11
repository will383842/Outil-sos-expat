/**
 * Cleanup dead i18n keys from ALL language files.
 * Uses the dead keys list from find-dead-i18n-keys.cjs.
 *
 * SAFETY: Keeps utility namespaces that might be used via dynamic patterns
 * not detectable by static analysis (state, language, country, time, etc.)
 */

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.resolve(__dirname, '..', 'src', 'helper');
const DEAD_KEYS_FILE = path.join(__dirname, 'dead-i18n-keys.json');

// Load dead keys list
const deadData = JSON.parse(fs.readFileSync(DEAD_KEYS_FILE, 'utf-8'));
const deadKeys = new Set(deadData.deadKeys);

// Utility namespaces to KEEP even if detected as dead
// These are generic labels that might be used dynamically in ways the script can't detect
const KEEP_NAMESPACES = [
  'state',       // status labels (active, pending, etc.)
  'language',    // language names (fr, en, es, etc.)
  'country',     // country names
  'time',        // time labels (months, days)
  'action',      // generic action labels
  'specialty',   // specialty/expertise names
  'unit',        // measurement units
  'number',      // number formatters
  'currency',    // currency labels
  'role',        // user role labels
];

// Filter: remove keys that are in KEEP_NAMESPACES
const keysToRemove = new Set();
for (const key of deadKeys) {
  const topNamespace = key.split('.')[0];
  if (!KEEP_NAMESPACES.includes(topNamespace)) {
    keysToRemove.add(key);
  }
}

const keptByNamespace = deadKeys.size - keysToRemove.size;
console.log(`Dead keys total: ${deadKeys.size}`);
console.log(`Kept (utility namespaces): ${keptByNamespace}`);
console.log(`Will remove: ${keysToRemove.size}`);

// Process all language files
const langFiles = ['fr.json', 'en.json', 'es.json', 'de.json', 'ru.json', 'pt.json', 'ch.json', 'ar.json', 'hi.json'];

for (const fileName of langFiles) {
  const filePath = path.join(HELPER_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${fileName} not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const originalCount = Object.keys(data).length;

  let removedCount = 0;
  for (const key of keysToRemove) {
    if (key in data) {
      delete data[key];
      removedCount++;
    }
  }

  const newCount = Object.keys(data).length;

  // Sort keys alphabetically and write back
  const sorted = {};
  for (const key of Object.keys(data).sort()) {
    sorted[key] = data[key];
  }

  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`${fileName}: ${originalCount} → ${newCount} (removed ${removedCount})`);
}

console.log('\nDone! Backup of dead keys in: scripts/dead-i18n-keys.json');

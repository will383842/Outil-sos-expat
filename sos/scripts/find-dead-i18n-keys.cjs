/**
 * Script to find dead i18n keys in fr.json/en.json
 * A key is "dead" if it's not referenced anywhere in the source code.
 *
 * Strategy:
 * 1. Extract all keys from fr.json
 * 2. For each key, search for it in the source code
 * 3. Account for dynamic key patterns (template literals)
 * 4. Report dead keys grouped by namespace
 *
 * CONSERVATIVE approach: If a key's prefix is used dynamically, keep ALL keys with that prefix.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Load translation keys
const frJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'src/helper/fr.json'), 'utf-8'));
const allKeys = Object.keys(frJson);

console.log(`Total keys in fr.json: ${allKeys.length}`);

// Collect all source files (tsx, ts, jsx, js) from src/ and firebase/functions/src/
function getAllSourceFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'dist' || entry.name === '.next') continue;
        results = results.concat(getAllSourceFiles(fullPath, extensions));
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
  return results;
}

console.log('Scanning source files...');
const srcFiles = getAllSourceFiles(path.join(PROJECT_ROOT, 'src'));
const functionsFiles = getAllSourceFiles(path.join(PROJECT_ROOT, 'firebase/functions/src'));
const allFiles = [...srcFiles, ...functionsFiles];
console.log(`Found ${allFiles.length} source files`);

// Read all source code into one big string for fast searching
console.log('Reading source files...');
let allSourceCode = '';
for (const file of allFiles) {
  allSourceCode += fs.readFileSync(file, 'utf-8') + '\n';
}
console.log(`Total source code size: ${(allSourceCode.length / 1024 / 1024).toFixed(1)} MB`);

// Identify dynamic key prefixes - patterns like:
// `${prefix}.something` or `${i18nPrefix}.errors.${name}`
// We'll keep ALL keys that share a prefix with any dynamic pattern
const dynamicPrefixes = new Set();

// Match template literal patterns with i18n-looking content
const templatePatterns = [
  // intl.formatMessage({ id: `some.prefix.${var}` })
  /formatMessage\(\{\s*id:\s*`([^`]*?\$\{[^`]*)`/g,
  // <FormattedMessage id={`some.prefix.${var}`} />
  /id=\{`([^`]*?\$\{[^`]*)`\}/g,
  // t(`some.prefix.${var}`)
  /t\(`([^`]*?\$\{[^`]*)`\)/g,
  // Generic template literal with dot-separated keys
  /`([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+)\.?\$\{/g,
];

for (const pattern of templatePatterns) {
  let match;
  while ((match = pattern.exec(allSourceCode)) !== null) {
    const template = match[1];
    // Extract the static prefix before the first ${
    const prefix = template.split('${')[0].replace(/\.$/, '');
    if (prefix && prefix.includes('.')) {
      dynamicPrefixes.add(prefix);
    }
  }
}

// Also look for patterns like: `${namespace}.faq.q${i}` → keep "*.faq.*"
// And: registerClient.errors.${fieldName} → keep "registerClient.errors.*"
const dynamicPatterns2 = [
  /(?:id|key|message)\s*[:=]\s*`([a-zA-Z][a-zA-Z0-9.]*)\.\$\{/g,
  /(?:id|key|message)\s*[:=]\s*['"]([a-zA-Z][a-zA-Z0-9.]*)['"]\s*\+/g,
];
for (const pattern of dynamicPatterns2) {
  let match;
  while ((match = pattern.exec(allSourceCode)) !== null) {
    dynamicPrefixes.add(match[1]);
  }
}

console.log(`\nDynamic prefixes found (${dynamicPrefixes.size}):`);
for (const p of [...dynamicPrefixes].sort()) {
  console.log(`  - ${p}`);
}

// Check each key
console.log('\nChecking keys...');
const deadKeys = [];
const aliveKeys = [];
const keptByDynamic = [];

for (const key of allKeys) {
  // Check if this key is protected by a dynamic prefix
  let protectedByDynamic = false;
  for (const prefix of dynamicPrefixes) {
    if (key.startsWith(prefix + '.') || key === prefix) {
      protectedByDynamic = true;
      break;
    }
  }

  if (protectedByDynamic) {
    keptByDynamic.push(key);
    continue;
  }

  // Search for exact key reference in source code
  // Keys are typically referenced as: "key.name" or 'key.name' or `key.name`
  if (allSourceCode.includes(key)) {
    aliveKeys.push(key);
  } else {
    deadKeys.push(key);
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Total keys: ${allKeys.length}`);
console.log(`Alive (found in code): ${aliveKeys.length}`);
console.log(`Kept by dynamic prefix: ${keptByDynamic.length}`);
console.log(`Dead (not found): ${deadKeys.length}`);

// Group dead keys by top-level namespace
const deadByNamespace = {};
for (const key of deadKeys) {
  const namespace = key.split('.')[0];
  if (!deadByNamespace[namespace]) {
    deadByNamespace[namespace] = [];
  }
  deadByNamespace[namespace].push(key);
}

// Sort namespaces by count
const sortedNamespaces = Object.entries(deadByNamespace).sort((a, b) => b[1].length - a[1].length);

console.log(`\n=== DEAD KEYS BY NAMESPACE ===`);
for (const [ns, keys] of sortedNamespaces) {
  console.log(`\n${ns}: ${keys.length} dead keys`);
  // Show first 5 examples
  for (const k of keys.slice(0, 5)) {
    console.log(`  - ${k}`);
  }
  if (keys.length > 5) {
    console.log(`  ... and ${keys.length - 5} more`);
  }
}

// Write dead keys to file for review
const outputPath = path.join(__dirname, 'dead-i18n-keys.json');
fs.writeFileSync(outputPath, JSON.stringify({
  summary: {
    total: allKeys.length,
    alive: aliveKeys.length,
    keptByDynamic: keptByDynamic.length,
    dead: deadKeys.length,
  },
  dynamicPrefixes: [...dynamicPrefixes].sort(),
  deadByNamespace: Object.fromEntries(sortedNamespaces),
  deadKeys: deadKeys.sort(),
}, null, 2));

console.log(`\nDead keys written to: ${outputPath}`);

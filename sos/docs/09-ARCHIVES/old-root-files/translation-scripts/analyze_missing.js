const fs = require('fs');

const report = JSON.parse(fs.readFileSync('chatter_translations_report.json', 'utf8'));

// Get all missing keys
const allMissing = [];
Object.values(report.missingKeysByLanguage).forEach(keys => {
  keys.forEach(k => {
    if (!allMissing.includes(k)) {
      allMissing.push(k);
    }
  });
});

// Group by prefix (3 levels)
const keysByCategory = {};
allMissing.forEach(key => {
  const parts = key.split('.');
  const category = parts.slice(0, 3).join('.');
  if (!keysByCategory[category]) {
    keysByCategory[category] = [];
  }
  keysByCategory[category].push(key);
});

// Create organized output
const result = {
  metadata: {
    totalMissingKeys: allMissing.length,
    totalCategories: Object.keys(keysByCategory).length,
    generatedAt: new Date().toISOString()
  },
  categories: {}
};

Object.entries(keysByCategory)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([category, keys]) => {
    result.categories[category] = {
      count: keys.length,
      keys: keys.sort()
    };
  });

fs.writeFileSync('CHATTER_MISSING_KEYS_BY_CATEGORY.json', JSON.stringify(result, null, 2));
console.log('✓ File created: CHATTER_MISSING_KEYS_BY_CATEGORY.json');
console.log(`\nTotal: ${allMissing.length} missing keys in ${Object.keys(keysByCategory).length} categories\n`);

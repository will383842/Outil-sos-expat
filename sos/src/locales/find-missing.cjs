const fs = require('fs');
const path = require('path');

const languages = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

// Load all translations
const translations = {};
languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

// Get keys by prefix
function getKeysByPrefix(data, prefix) {
  return Object.keys(data).filter(k => k.startsWith(prefix + '.'));
}

// Analyze influencer
console.log('=== INFLUENCER ===\n');
const influencerKeys = {};
languages.forEach(lang => {
  influencerKeys[lang] = new Set(getKeysByPrefix(translations[lang], 'influencer'));
});

// Use pt-pt as reference (complete)
const refInfluencer = influencerKeys['pt-pt'];
console.log(`Référence (pt-pt): ${refInfluencer.size} clés\n`);

languages.forEach(lang => {
  const missing = [...refInfluencer].filter(k => !influencerKeys[lang].has(k));
  if (missing.length > 0) {
    console.log(`${lang}: ${influencerKeys[lang].size}/${refInfluencer.size} (${missing.length} manquantes)`);
    if (missing.length <= 10) {
      missing.forEach(k => console.log(`  - ${k}`));
    }
  } else {
    console.log(`${lang}: ✓ ${refInfluencer.size}/${refInfluencer.size}`);
  }
});

// Analyze blogger
console.log('\n=== BLOGGER ===\n');
const bloggerKeys = {};
languages.forEach(lang => {
  bloggerKeys[lang] = new Set(getKeysByPrefix(translations[lang], 'blogger'));
});

// Use ru-ru as reference (most complete)
const refBlogger = bloggerKeys['ru-ru'];
console.log(`Référence (ru-ru): ${refBlogger.size} clés\n`);

languages.forEach(lang => {
  const missing = [...refBlogger].filter(k => !bloggerKeys[lang].has(k));
  if (missing.length > 0) {
    console.log(`${lang}: ${bloggerKeys[lang].size}/${refBlogger.size} (${missing.length} manquantes)`);
  } else {
    console.log(`${lang}: ✓ ${refBlogger.size}/${refBlogger.size}`);
  }
});

// Export missing keys for es-es influencer (detailed)
console.log('\n=== MISSING KEYS FOR es-es influencer ===\n');
const missingEsInfluencer = [...refInfluencer].filter(k => !influencerKeys['es-es'].has(k));
missingEsInfluencer.sort();
missingEsInfluencer.forEach(k => {
  console.log(`${k}: "${translations['pt-pt'][k]}"`);
});

// Save missing keys to file for processing
const missing = {
  influencer: {},
  blogger: {}
};

languages.forEach(lang => {
  missing.influencer[lang] = [...refInfluencer].filter(k => !influencerKeys[lang].has(k));
  missing.blogger[lang] = [...refBlogger].filter(k => !bloggerKeys[lang].has(k));
});

fs.writeFileSync(
  path.join(__dirname, 'missing-keys.json'),
  JSON.stringify(missing, null, 2),
  'utf8'
);

console.log('\n✓ missing-keys.json created');

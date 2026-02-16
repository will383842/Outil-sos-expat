const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'sos/src/pages/Blogger/BloggerLanding.tsx'), 'utf8');

const missingKeys = [
  'blogger-existing-title',
  'blogger-faq-title',
  'blogger-passive-title',
  'blogger-profiles-title',
  'blogger-resources-title',
  'blogger-steps-title',
  'blogger-topics-title',
  'blogger.aria.cta.main',
  'blogger.hero.hot',
  'blogger.hero.new.amount',
  'blogger.hero.new.line1',
  'blogger.hero.new.line2',
  'blogger.hero.new.subtitle',
  'blogger.hero.partnerExample',
  'blogger.hero.scroll',
  'blogger.hero.source1',
  'blogger.hero.source2',
  'blogger.hero.source3',
  'blogger.hero.sources',
];

console.log('\n╔═════════════════════════════════════════════════════════════════════════════╗');
console.log('║      CLÉS MANQUANTES AVEC LEURS defaultMessage (pour traduction)           ║');
console.log('╚═════════════════════════════════════════════════════════════════════════════╝\n');

const keyValues = {};

missingKeys.forEach(key => {
  // Look for the key in the content
  // Pattern 1: <FormattedMessage id="key" defaultMessage="value" />
  const pattern1 = new RegExp(`id=["'\`]${key.replace(/\./g, '\\.')}["'\`][^>]*defaultMessage=["'\`]([^"'\`]+)["'\`]`, 's');

  // Pattern 2: intl.formatMessage({ id: 'key', defaultMessage: 'value' })
  const pattern2 = new RegExp(`id:\\s*["'\`]${key.replace(/\./g, '\\.')}["'\`][^}]*defaultMessage:\\s*["'\`]([^"'\`]+)["'\`]`, 's');

  let match = content.match(pattern1) || content.match(pattern2);

  if (match) {
    keyValues[key] = match[1];
  } else {
    keyValues[key] = '⚠️ NOT FOUND IN CODE';
  }
});

console.log('📋 DÉTAIL PAR CLÉ (avec valeurs EN par défaut):\n');
console.log('═'.repeat(80));

Object.entries(keyValues).forEach(([key, value], idx) => {
  console.log(`\n${(idx + 1).toString().padStart(2, ' ')}. ${key}`);
  console.log(`    EN: ${value}`);
});

console.log('\n\n' + '═'.repeat(80));
console.log('\n📄 FORMAT JSON (à copier dans chaque fichier de langue):\n');

console.log(JSON.stringify(keyValues, null, 2));

console.log('\n' + '═'.repeat(80));

// Save to file
const outputPath = path.join(__dirname, 'missing-keys-with-values.json');
fs.writeFileSync(outputPath, JSON.stringify(keyValues, null, 2));

console.log(`\n💾 Sauvegardé dans: ${outputPath}\n`);

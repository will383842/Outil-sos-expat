const fs = require('fs');
const path = require('path');

const langs = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];
const sampleKeys = [
  'influencer.hero.earn',
  'influencer.profiles.title',
  'influencer.calculator.title',
  'influencer.network.title',
  'blogger.earnings.client.title',
  'blogger.final.trust',
  'blogger.register.success',
  'blogger.payment.methods',
  'blogger.example.visa'
];

console.log('=== QUALITY CHECK SAMPLE ===\n');

sampleKeys.forEach(key => {
  console.log(`\n[${key}]`);
  langs.forEach(lang => {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, lang, 'common.json'), 'utf8'));
    const value = data[key] || '[MISSING]';
    console.log(`  ${lang}: ${value}`);
  });
});

console.log('\n\n=== FINAL STATISTICS ===\n');

langs.forEach(lang => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, lang, 'common.json'), 'utf8'));
  const allKeys = Object.keys(data);
  const influencerKeys = allKeys.filter(k => k.startsWith('influencer.'));
  const bloggerKeys = allKeys.filter(k => k.startsWith('blogger.'));
  const groupadminKeys = allKeys.filter(k => k.startsWith('groupadmin.'));

  console.log(`${lang}:`);
  console.log(`  Total keys: ${allKeys.length}`);
  console.log(`  Influencer: ${influencerKeys.length}`);
  console.log(`  Blogger: ${bloggerKeys.length}`);
  console.log(`  GroupAdmin: ${groupadminKeys.length}`);
  console.log('');
});

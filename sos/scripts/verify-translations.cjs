const fs = require('fs');
const path = require('path');

const REQUIRED_KEYS = [
  'blogger.menu.bloggerRecruitment',
  'blogger.bloggerRecruitment.title',
  'blogger.bloggerRecruitment.subtitle',
  'blogger.bloggerRecruitment.howItWorks.title',
  'blogger.bloggerRecruitment.howItWorks.step1',
  'blogger.bloggerRecruitment.howItWorks.step2',
  'blogger.bloggerRecruitment.howItWorks.step3',
  'blogger.bloggerRecruitment.howItWorks.note',
  'blogger.bloggerRecruitment.linkTitle',
  'blogger.bloggerRecruitment.stats.total',
  'blogger.bloggerRecruitment.stats.active',
  'blogger.bloggerRecruitment.stats.bonusesPaid',
  'blogger.bloggerRecruitment.stats.totalEarned',
  'blogger.bloggerRecruitment.table.blogger',
  'blogger.bloggerRecruitment.table.joined',
  'blogger.bloggerRecruitment.table.progress',
  'blogger.bloggerRecruitment.table.earnings',
  'blogger.bloggerRecruitment.table.bonus',
  'blogger.bloggerRecruitment.bonusPaid',
  'blogger.bloggerRecruitment.bonusPending',
  'blogger.bloggerRecruitment.windowExpired',
  'blogger.bloggerRecruitment.empty',
  'blogger.bloggerRecruitment.emptyHint',
];

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

console.log('🔍 Vérification des traductions blogger recruitment...\n');

let allGood = true;

for (const lang of LANGUAGES) {
  const filePath = path.join(__dirname, '..', 'src', 'helper', `${lang}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${lang.toUpperCase()}: File not found`);
    allGood = false;
    continue;
  }

  try {
    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const missing = REQUIRED_KEYS.filter(key => !translations[key]);

    if (missing.length > 0) {
      console.log(`❌ ${lang.toUpperCase()}: Missing ${missing.length} keys`);
      missing.forEach(key => console.log(`   - ${key}`));
      allGood = false;
    } else {
      console.log(`✅ ${lang.toUpperCase()}: All ${REQUIRED_KEYS.length} keys present`);
    }
  } catch (error) {
    console.log(`❌ ${lang.toUpperCase()}: Error parsing - ${error.message}`);
    allGood = false;
  }
}

console.log('\n' + (allGood ? '✅ SUCCESS - All translations verified!' : '❌ FAILURE - Missing translations'));
process.exit(allGood ? 0 : 1);

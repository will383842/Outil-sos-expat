/**
 * Add GroupAdmin Landing Recruitment Note Translation
 * Updates the landing page to clarify the $50 recruitment bonus system
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'groupAdmin.landing.hero.recruitmentNote': '*Bonus de 50$ payé quand l\'admin recruté atteint 200$ en commissions directes',
  },
  en: {
    'groupAdmin.landing.hero.recruitmentNote': '*$50 bonus paid when recruited admin reaches $200 in direct commissions',
  },
  es: {
    'groupAdmin.landing.hero.recruitmentNote': '*Bono de 50$ pagado cuando el admin reclutado alcanza 200$ en comisiones directas',
  },
  de: {
    'groupAdmin.landing.hero.recruitmentNote': '*$50 Bonus gezahlt, wenn der geworbene Admin $200 an direkten Provisionen erreicht',
  },
  pt: {
    'groupAdmin.landing.hero.recruitmentNote': '*Bônus de $50 pago quando o admin recrutado atinge $200 em comissões diretas',
  },
  ru: {
    'groupAdmin.landing.hero.recruitmentNote': '*Бонус $50 выплачивается, когда приглашенный администратор достигает $200 прямых комиссионных',
  },
  ch: {
    'groupAdmin.landing.hero.recruitmentNote': '*当被招募的管理员达到200美元直接佣金时支付50美元奖金',
  },
  hi: {
    'groupAdmin.landing.hero.recruitmentNote': '*जब भर्ती किया गया व्यवस्थापक प्रत्यक्ष कमीशन में $200 तक पहुंचता है तो $50 बोनस का भुगतान किया जाता है',
  },
  ar: {
    'groupAdmin.landing.hero.recruitmentNote': '*يتم دفع مكافأة 50$ عندما يصل المشرف المجند إلى 200$ في العمولات المباشرة',
  },
};

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

function addTranslations() {
  let totalAdded = 0;
  const errors = [];

  for (const lang of LANGUAGES) {
    const filePath = path.join(__dirname, '..', 'src', 'helper', `${lang}.json`);

    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const updated = { ...existing, ...TRANSLATIONS[lang] };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

      const addedCount = Object.keys(TRANSLATIONS[lang]).length;
      totalAdded += addedCount;
      console.log(`✅ ${lang.toUpperCase()}: Added ${addedCount} key`);
    } catch (error) {
      const msg = `❌ ${lang.toUpperCase()}: ${error.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log(`\n📊 Summary: Added ${totalAdded} translation keys across ${LANGUAGES.length} languages`);

  if (errors.length > 0) {
    console.error(`\n⚠️ Errors occurred:\n${errors.join('\n')}`);
    process.exit(1);
  }

  console.log('\n✅ All translations added successfully!');
}

addTranslations();

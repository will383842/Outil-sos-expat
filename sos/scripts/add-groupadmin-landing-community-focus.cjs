/**
 * Add GroupAdmin Landing Community Focus Translations
 * Met en avant SA COMMUNAUTÉ comme mine d'or
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'groupAdmin.landing.hero.new.line1': 'Transformez votre communauté en',
    'groupAdmin.landing.hero.new.amount': 'MACHINE À CASH',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/mois possibles',
    'groupAdmin.landing.hero.new.subtitle': '📱 Votre groupe = votre trésor ! 10 000 membres × 2% conversion = 200 appels/mois × 10$ = 2000$/mois récurrents',
    'groupAdmin.landing.hero.new.subtitle2': '+ Vos membres économisent 5$/appel = Win-win total !',
  },
  en: {
    'groupAdmin.landing.hero.new.line1': 'Transform your community into a',
    'groupAdmin.landing.hero.new.amount': 'CASH MACHINE',
    'groupAdmin.landing.hero.new.line2': '$5000-15000/month possible',
    'groupAdmin.landing.hero.new.subtitle': '📱 Your group = your treasure! 10,000 members × 2% conversion = 200 calls/month × $10 = $2000/month recurring',
    'groupAdmin.landing.hero.new.subtitle2': '+ Your members save $5/call = Total win-win!',
  },
  es: {
    'groupAdmin.landing.hero.new.line1': 'Transforma tu comunidad en una',
    'groupAdmin.landing.hero.new.amount': 'MÁQUINA DE DINERO',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/mes posibles',
    'groupAdmin.landing.hero.new.subtitle': '📱 ¡Tu grupo = tu tesoro! 10 000 miembros × 2% conversión = 200 llamadas/mes × 10$ = 2000$/mes recurrentes',
    'groupAdmin.landing.hero.new.subtitle2': '+ Tus miembros ahorran 5$/llamada = ¡Win-win total!',
  },
  de: {
    'groupAdmin.landing.hero.new.line1': 'Verwandeln Sie Ihre Community in eine',
    'groupAdmin.landing.hero.new.amount': 'GELDMASCHINE',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/Monat möglich',
    'groupAdmin.landing.hero.new.subtitle': '📱 Ihre Gruppe = Ihr Schatz! 10.000 Mitglieder × 2% Konversion = 200 Anrufe/Monat × 10$ = 2000$/Monat wiederkehrend',
    'groupAdmin.landing.hero.new.subtitle2': '+ Ihre Mitglieder sparen 5$/Anruf = Totaler Win-Win!',
  },
  pt: {
    'groupAdmin.landing.hero.new.line1': 'Transforme sua comunidade em uma',
    'groupAdmin.landing.hero.new.amount': 'MÁQUINA DE DINHEIRO',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/mês possíveis',
    'groupAdmin.landing.hero.new.subtitle': '📱 Seu grupo = seu tesouro! 10.000 membros × 2% conversão = 200 chamadas/mês × 10$ = 2000$/mês recorrentes',
    'groupAdmin.landing.hero.new.subtitle2': '+ Seus membros economizam 5$/chamada = Win-win total!',
  },
  ru: {
    'groupAdmin.landing.hero.new.line1': 'Превратите свое сообщество в',
    'groupAdmin.landing.hero.new.amount': 'ДЕНЕЖНЫЙ АВТОМАТ',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/месяц возможно',
    'groupAdmin.landing.hero.new.subtitle': '📱 Ваша группа = ваше сокровище! 10 000 участников × 2% конверсия = 200 звонков/месяц × 10$ = 2000$/месяц регулярно',
    'groupAdmin.landing.hero.new.subtitle2': '+ Ваши участники экономят 5$/звонок = Полный win-win!',
  },
  ch: {
    'groupAdmin.landing.hero.new.line1': '将您的社区变成',
    'groupAdmin.landing.hero.new.amount': '赚钱机器',
    'groupAdmin.landing.hero.new.line2': '每月5000-15000美元可能',
    'groupAdmin.landing.hero.new.subtitle': '📱 您的群组 = 您的宝藏！10,000名成员 × 2%转化率 = 每月200次通话 × 10$ = 每月2000$经常性',
    'groupAdmin.landing.hero.new.subtitle2': '+ 您的成员每次通话节省5$ = 完全双赢！',
  },
  hi: {
    'groupAdmin.landing.hero.new.line1': 'अपने समुदाय को बदलें',
    'groupAdmin.landing.hero.new.amount': 'कैश मशीन में',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/माह संभव',
    'groupAdmin.landing.hero.new.subtitle': '📱 आपका समूह = आपका खजाना! 10,000 सदस्य × 2% रूपांतरण = 200 कॉल/माह × 10$ = 2000$/माह आवर्ती',
    'groupAdmin.landing.hero.new.subtitle2': '+ आपके सदस्य 5$/कॉल बचाते हैं = कुल विन-विन!',
  },
  ar: {
    'groupAdmin.landing.hero.new.line1': 'حول مجتمعك إلى',
    'groupAdmin.landing.hero.new.amount': 'آلة نقدية',
    'groupAdmin.landing.hero.new.line2': '5000-15000$/شهر ممكن',
    'groupAdmin.landing.hero.new.subtitle': '📱 مجموعتك = كنزك! 10,000 عضو × 2% تحويل = 200 مكالمة/شهر × 10$ = 2000$/شهر متكرر',
    'groupAdmin.landing.hero.new.subtitle2': '+ أعضاؤك يوفرون 5$/مكالمة = فوز كامل للجميع!',
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
      console.log(`✅ ${lang.toUpperCase()}: Added ${addedCount} keys`);
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

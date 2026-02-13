/**
 * Fix GroupAdmin Landing - Montants RÉALISTES et CRÉDIBLES
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'groupAdmin.landing.hero.new.subtitle': '📱 Votre communauté = votre mine d\'or ! Plus elle est active, plus vous gagnez.',
    'groupAdmin.landing.hero.example.small': 'Groupe moyen (5K membres)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 appels/mois = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'Gros groupe (20K+ membres)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 appels/mois = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Vos membres économisent 5$/appel = Win-win total !',
  },
  en: {
    'groupAdmin.landing.hero.new.subtitle': '📱 Your community = your gold mine! The more active it is, the more you earn.',
    'groupAdmin.landing.hero.example.small': 'Average group (5K members)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 calls/month = $500-1000',
    'groupAdmin.landing.hero.example.large': 'Large group (20K+ members)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 calls/month = $2000-5000',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Your members save $5/call = Total win-win!',
  },
  es: {
    'groupAdmin.landing.hero.new.subtitle': '📱 ¡Tu comunidad = tu mina de oro! Cuanto más activa, más ganas.',
    'groupAdmin.landing.hero.example.small': 'Grupo medio (5K miembros)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 llamadas/mes = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'Grupo grande (20K+ miembros)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 llamadas/mes = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Tus miembros ahorran 5$/llamada = ¡Win-win total!',
  },
  de: {
    'groupAdmin.landing.hero.new.subtitle': '📱 Ihre Community = Ihre Goldmine! Je aktiver sie ist, desto mehr verdienen Sie.',
    'groupAdmin.landing.hero.example.small': 'Durchschnittsgruppe (5K Mitglieder)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 Anrufe/Monat = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'Große Gruppe (20K+ Mitglieder)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 Anrufe/Monat = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Ihre Mitglieder sparen 5$/Anruf = Totaler Win-Win!',
  },
  pt: {
    'groupAdmin.landing.hero.new.subtitle': '📱 Sua comunidade = sua mina de ouro! Quanto mais ativa, mais você ganha.',
    'groupAdmin.landing.hero.example.small': 'Grupo médio (5K membros)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 chamadas/mês = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'Grupo grande (20K+ membros)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 chamadas/mês = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Seus membros economizam 5$/chamada = Win-win total!',
  },
  ru: {
    'groupAdmin.landing.hero.new.subtitle': '📱 Ваше сообщество = ваша золотая жила! Чем активнее, тем больше вы зарабатываете.',
    'groupAdmin.landing.hero.example.small': 'Средняя группа (5K участников)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 звонков/месяц = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'Большая группа (20K+ участников)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 звонков/месяц = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 Ваши участники экономят 5$/звонок = Полный win-win!',
  },
  ch: {
    'groupAdmin.landing.hero.new.subtitle': '📱 您的社区 = 您的金矿！越活跃，您赚得越多。',
    'groupAdmin.landing.hero.example.small': '中等群组（5K成员）',
    'groupAdmin.landing.hero.example.small.calc': '每月50-100次通话 = 500-1000$',
    'groupAdmin.landing.hero.example.large': '大型群组（20K+成员）',
    'groupAdmin.landing.hero.example.large.calc': '每月200-500次通话 = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 您的成员每次通话节省5$ = 完全双赢！',
  },
  hi: {
    'groupAdmin.landing.hero.new.subtitle': '📱 आपका समुदाय = आपकी सोने की खान! जितना अधिक सक्रिय, उतना अधिक कमाई।',
    'groupAdmin.landing.hero.example.small': 'औसत समूह (5K सदस्य)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 कॉल/माह = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'बड़ा समूह (20K+ सदस्य)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 कॉल/माह = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 आपके सदस्य 5$/कॉल बचाते हैं = कुल विन-विन!',
  },
  ar: {
    'groupAdmin.landing.hero.new.subtitle': '📱 مجتمعك = منجم الذهب الخاص بك! كلما كان أكثر نشاطا، كلما ربحت أكثر.',
    'groupAdmin.landing.hero.example.small': 'مجموعة متوسطة (5K عضو)',
    'groupAdmin.landing.hero.example.small.calc': '50-100 مكالمة/شهر = 500-1000$',
    'groupAdmin.landing.hero.example.large': 'مجموعة كبيرة (20K+ عضو)',
    'groupAdmin.landing.hero.example.large.calc': '200-500 مكالمة/شهر = 2000-5000$',
    'groupAdmin.landing.hero.new.subtitle2': '💡 أعضاؤك يوفرون 5$/مكالمة = فوز كامل للجميع!',
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
      console.log(`✅ ${lang.toUpperCase()}: Updated ${addedCount} keys`);
    } catch (error) {
      const msg = `❌ ${lang.toUpperCase()}: ${error.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log(`\n📊 Summary: Updated ${totalAdded} translation keys across ${LANGUAGES.length} languages`);

  if (errors.length > 0) {
    console.error(`\n⚠️ Errors occurred:\n${errors.join('\n')}`);
    process.exit(1);
  }

  console.log('\n✅ All translations updated successfully!');
}

addTranslations();

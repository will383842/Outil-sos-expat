/**
 * Add GroupAdmin Landing Ultra Seller Translations
 * Rend la landing page BEAUCOUP plus vendeuse
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'groupAdmin.landing.hero.sources': '3 SOURCES DE REVENUS ILLIMITÉES',
    'groupAdmin.landing.hero.source1.label': '📱 VOS MEMBRES',
    'groupAdmin.landing.hero.source1.subtitle': 'par mois',
    'groupAdmin.landing.hero.source1.detail': '10$/appel × votre trafic',
    'groupAdmin.landing.hero.source2.label': '👥 ÉQUIPE D\'ADMINS',
    'groupAdmin.landing.hero.source2.subtitle': 'bonus récurrents',
    'groupAdmin.landing.hero.source2.detail': '50$ × chaque admin actif',
    'groupAdmin.landing.hero.source3.label': '⚖️ AVOCATS/AIDANTS',
    'groupAdmin.landing.hero.source3.subtitle': '100% passifs',
    'groupAdmin.landing.hero.source3.detail': '5$/appel × partenaires',
    'groupAdmin.landing.hero.example1.title': 'Équipe de 20 admins',
    'groupAdmin.landing.hero.example1.calc': '20 admins × 50$ bonus',
    'groupAdmin.landing.hero.example1.frequency': 'bonus',
    'groupAdmin.landing.hero.example2.title': '10 avocats partenaires',
    'groupAdmin.landing.hero.example2.calc': '300 appels/mois × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/mois passifs',
    'groupAdmin.landing.hero.motivation': '🎯 Combinez les 3 sources = 5000-15000$/mois possibles !',
  },
  en: {
    'groupAdmin.landing.hero.sources': '3 UNLIMITED REVENUE STREAMS',
    'groupAdmin.landing.hero.source1.label': '📱 YOUR MEMBERS',
    'groupAdmin.landing.hero.source1.subtitle': 'per month',
    'groupAdmin.landing.hero.source1.detail': '$10/call × your traffic',
    'groupAdmin.landing.hero.source2.label': '👥 ADMIN TEAM',
    'groupAdmin.landing.hero.source2.subtitle': 'recurring bonuses',
    'groupAdmin.landing.hero.source2.detail': '$50 × each active admin',
    'groupAdmin.landing.hero.source3.label': '⚖️ LAWYERS/HELPERS',
    'groupAdmin.landing.hero.source3.subtitle': '100% passive',
    'groupAdmin.landing.hero.source3.detail': '$5/call × partners',
    'groupAdmin.landing.hero.example1.title': 'Team of 20 admins',
    'groupAdmin.landing.hero.example1.calc': '20 admins × $50 bonus',
    'groupAdmin.landing.hero.example1.frequency': 'bonuses',
    'groupAdmin.landing.hero.example2.title': '10 lawyer partners',
    'groupAdmin.landing.hero.example2.calc': '300 calls/month × $5',
    'groupAdmin.landing.hero.example2.frequency': '/month passive',
    'groupAdmin.landing.hero.motivation': '🎯 Combine all 3 = $5000-15000/month possible!',
  },
  es: {
    'groupAdmin.landing.hero.sources': '3 FUENTES DE INGRESOS ILIMITADAS',
    'groupAdmin.landing.hero.source1.label': '📱 TUS MIEMBROS',
    'groupAdmin.landing.hero.source1.subtitle': 'por mes',
    'groupAdmin.landing.hero.source1.detail': '10$/llamada × tu tráfico',
    'groupAdmin.landing.hero.source2.label': '👥 EQUIPO DE ADMINS',
    'groupAdmin.landing.hero.source2.subtitle': 'bonos recurrentes',
    'groupAdmin.landing.hero.source2.detail': '50$ × cada admin activo',
    'groupAdmin.landing.hero.source3.label': '⚖️ ABOGADOS/AYUDANTES',
    'groupAdmin.landing.hero.source3.subtitle': '100% pasivos',
    'groupAdmin.landing.hero.source3.detail': '5$/llamada × socios',
    'groupAdmin.landing.hero.example1.title': 'Equipo de 20 admins',
    'groupAdmin.landing.hero.example1.calc': '20 admins × 50$ bono',
    'groupAdmin.landing.hero.example1.frequency': 'bonos',
    'groupAdmin.landing.hero.example2.title': '10 abogados socios',
    'groupAdmin.landing.hero.example2.calc': '300 llamadas/mes × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/mes pasivos',
    'groupAdmin.landing.hero.motivation': '🎯 ¡Combina las 3 fuentes = 5000-15000$/mes posibles!',
  },
  de: {
    'groupAdmin.landing.hero.sources': '3 UNBEGRENZTE EINNAHMEQUELLEN',
    'groupAdmin.landing.hero.source1.label': '📱 IHRE MITGLIEDER',
    'groupAdmin.landing.hero.source1.subtitle': 'pro Monat',
    'groupAdmin.landing.hero.source1.detail': '10$/Anruf × Ihr Traffic',
    'groupAdmin.landing.hero.source2.label': '👥 ADMIN-TEAM',
    'groupAdmin.landing.hero.source2.subtitle': 'wiederkehrende Boni',
    'groupAdmin.landing.hero.source2.detail': '50$ × jeder aktive Admin',
    'groupAdmin.landing.hero.source3.label': '⚖️ ANWÄLTE/HELFER',
    'groupAdmin.landing.hero.source3.subtitle': '100% passiv',
    'groupAdmin.landing.hero.source3.detail': '5$/Anruf × Partner',
    'groupAdmin.landing.hero.example1.title': 'Team von 20 Admins',
    'groupAdmin.landing.hero.example1.calc': '20 Admins × 50$ Bonus',
    'groupAdmin.landing.hero.example1.frequency': 'Boni',
    'groupAdmin.landing.hero.example2.title': '10 Anwaltspartner',
    'groupAdmin.landing.hero.example2.calc': '300 Anrufe/Monat × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/Monat passiv',
    'groupAdmin.landing.hero.motivation': '🎯 Kombinieren Sie alle 3 = 5000-15000$/Monat möglich!',
  },
  pt: {
    'groupAdmin.landing.hero.sources': '3 FONTES DE RECEITA ILIMITADAS',
    'groupAdmin.landing.hero.source1.label': '📱 SEUS MEMBROS',
    'groupAdmin.landing.hero.source1.subtitle': 'por mês',
    'groupAdmin.landing.hero.source1.detail': '10$/chamada × seu tráfego',
    'groupAdmin.landing.hero.source2.label': '👥 EQUIPE DE ADMINS',
    'groupAdmin.landing.hero.source2.subtitle': 'bônus recorrentes',
    'groupAdmin.landing.hero.source2.detail': '50$ × cada admin ativo',
    'groupAdmin.landing.hero.source3.label': '⚖️ ADVOGADOS/AJUDANTES',
    'groupAdmin.landing.hero.source3.subtitle': '100% passivos',
    'groupAdmin.landing.hero.source3.detail': '5$/chamada × parceiros',
    'groupAdmin.landing.hero.example1.title': 'Equipe de 20 admins',
    'groupAdmin.landing.hero.example1.calc': '20 admins × 50$ bônus',
    'groupAdmin.landing.hero.example1.frequency': 'bônus',
    'groupAdmin.landing.hero.example2.title': '10 advogados parceiros',
    'groupAdmin.landing.hero.example2.calc': '300 chamadas/mês × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/mês passivos',
    'groupAdmin.landing.hero.motivation': '🎯 Combine as 3 fontes = 5000-15000$/mês possíveis!',
  },
  ru: {
    'groupAdmin.landing.hero.sources': '3 НЕОГРАНИЧЕННЫХ ИСТОЧНИКА ДОХОДА',
    'groupAdmin.landing.hero.source1.label': '📱 ВАШИ УЧАСТНИКИ',
    'groupAdmin.landing.hero.source1.subtitle': 'в месяц',
    'groupAdmin.landing.hero.source1.detail': '10$/звонок × ваш трафик',
    'groupAdmin.landing.hero.source2.label': '👥 КОМАНДА АДМИНОВ',
    'groupAdmin.landing.hero.source2.subtitle': 'регулярные бонусы',
    'groupAdmin.landing.hero.source2.detail': '50$ × каждый активный админ',
    'groupAdmin.landing.hero.source3.label': '⚖️ ЮРИСТЫ/ПОМОЩНИКИ',
    'groupAdmin.landing.hero.source3.subtitle': '100% пассивно',
    'groupAdmin.landing.hero.source3.detail': '5$/звонок × партнеры',
    'groupAdmin.landing.hero.example1.title': 'Команда из 20 админов',
    'groupAdmin.landing.hero.example1.calc': '20 админов × 50$ бонус',
    'groupAdmin.landing.hero.example1.frequency': 'бонусы',
    'groupAdmin.landing.hero.example2.title': '10 партнеров-юристов',
    'groupAdmin.landing.hero.example2.calc': '300 звонков/месяц × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/месяц пассивно',
    'groupAdmin.landing.hero.motivation': '🎯 Объедините все 3 = 5000-15000$/месяц возможно!',
  },
  ch: {
    'groupAdmin.landing.hero.sources': '3个无限收入来源',
    'groupAdmin.landing.hero.source1.label': '📱 您的成员',
    'groupAdmin.landing.hero.source1.subtitle': '每月',
    'groupAdmin.landing.hero.source1.detail': '10$/通话 × 您的流量',
    'groupAdmin.landing.hero.source2.label': '👥 管理员团队',
    'groupAdmin.landing.hero.source2.subtitle': '经常性奖金',
    'groupAdmin.landing.hero.source2.detail': '50$ × 每个活跃管理员',
    'groupAdmin.landing.hero.source3.label': '⚖️ 律师/助手',
    'groupAdmin.landing.hero.source3.subtitle': '100%被动',
    'groupAdmin.landing.hero.source3.detail': '5$/通话 × 合作伙伴',
    'groupAdmin.landing.hero.example1.title': '20名管理员团队',
    'groupAdmin.landing.hero.example1.calc': '20名管理员 × 50$奖金',
    'groupAdmin.landing.hero.example1.frequency': '奖金',
    'groupAdmin.landing.hero.example2.title': '10个律师合作伙伴',
    'groupAdmin.landing.hero.example2.calc': '300次通话/月 × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/月被动',
    'groupAdmin.landing.hero.motivation': '🎯 结合所有3个 = 每月5000-15000$可能！',
  },
  hi: {
    'groupAdmin.landing.hero.sources': '3 असीमित राजस्व स्रोत',
    'groupAdmin.landing.hero.source1.label': '📱 आपके सदस्य',
    'groupAdmin.landing.hero.source1.subtitle': 'प्रति माह',
    'groupAdmin.landing.hero.source1.detail': '10$/कॉल × आपका ट्रैफ़िक',
    'groupAdmin.landing.hero.source2.label': '👥 एडमिन टीम',
    'groupAdmin.landing.hero.source2.subtitle': 'आवर्ती बोनस',
    'groupAdmin.landing.hero.source2.detail': '50$ × प्रत्येक सक्रिय एडमिन',
    'groupAdmin.landing.hero.source3.label': '⚖️ वकील/सहायक',
    'groupAdmin.landing.hero.source3.subtitle': '100% निष्क्रिय',
    'groupAdmin.landing.hero.source3.detail': '5$/कॉल × भागीदार',
    'groupAdmin.landing.hero.example1.title': '20 एडमिन की टीम',
    'groupAdmin.landing.hero.example1.calc': '20 एडमिन × 50$ बोनस',
    'groupAdmin.landing.hero.example1.frequency': 'बोनस',
    'groupAdmin.landing.hero.example2.title': '10 वकील भागीदार',
    'groupAdmin.landing.hero.example2.calc': '300 कॉल/माह × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/माह निष्क्रिय',
    'groupAdmin.landing.hero.motivation': '🎯 सभी 3 को मिलाएं = 5000-15000$/माह संभव!',
  },
  ar: {
    'groupAdmin.landing.hero.sources': '3 مصادر دخل غير محدودة',
    'groupAdmin.landing.hero.source1.label': '📱 أعضاؤك',
    'groupAdmin.landing.hero.source1.subtitle': 'شهريا',
    'groupAdmin.landing.hero.source1.detail': '10$/مكالمة × حركة المرور الخاصة بك',
    'groupAdmin.landing.hero.source2.label': '👥 فريق المشرفين',
    'groupAdmin.landing.hero.source2.subtitle': 'مكافآت متكررة',
    'groupAdmin.landing.hero.source2.detail': '50$ × كل مشرف نشط',
    'groupAdmin.landing.hero.source3.label': '⚖️ محامون/مساعدون',
    'groupAdmin.landing.hero.source3.subtitle': '100% سلبي',
    'groupAdmin.landing.hero.source3.detail': '5$/مكالمة × شركاء',
    'groupAdmin.landing.hero.example1.title': 'فريق من 20 مشرفا',
    'groupAdmin.landing.hero.example1.calc': '20 مشرفا × 50$ مكافأة',
    'groupAdmin.landing.hero.example1.frequency': 'مكافآت',
    'groupAdmin.landing.hero.example2.title': '10 شركاء محامين',
    'groupAdmin.landing.hero.example2.calc': '300 مكالمة/شهر × 5$',
    'groupAdmin.landing.hero.example2.frequency': '/شهر سلبي',
    'groupAdmin.landing.hero.motivation': '🎯 ادمج الثلاثة = 5000-15000$/شهر ممكن!',
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

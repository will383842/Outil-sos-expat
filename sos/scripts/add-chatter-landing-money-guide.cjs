/**
 * Add Chatter Landing MONEY GUIDE Section
 * DIFFÉRENT des autres : focus sur COMMENT gagner rapidement et facilement
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'chatter.landing.money.badge': '💰 Guide Pratique',
    'chatter.landing.money.title': 'Comment GAGNER rapidement et facilement',
    'chatter.landing.money.subtitle': 'Pas de blabla. Voici EXACTEMENT comment faire vos premiers 500$ ce mois-ci.',

    'chatter.landing.money.method1.title': '🚀 Démarrage rapide (2 min)',
    'chatter.landing.money.method1.time': 'Aujourd\'hui',
    'chatter.landing.money.method1.desc': 'Créer compte + lier Telegram + obtenir vos codes affiliés. C\'est tout. Vous êtes prêt à gagner.',
    'chatter.landing.money.method1.action': 'S\'inscrire maintenant',

    'chatter.landing.money.method2.title': '📱 Partager son lien (5 min/jour)',
    'chatter.landing.money.method2.time': 'Dès maintenant',
    'chatter.landing.money.method2.desc': 'Poster dans groupes Facebook/Telegram/WhatsApp d\'expats. Copier-coller simple. 1 appel = 10$.',
    'chatter.landing.money.method2.action': 'Templates prêts fournis',

    'chatter.landing.money.method3.title': '👥 Construire équipe (passif)',
    'chatter.landing.money.method3.time': 'Revenus à vie',
    'chatter.landing.money.method3.desc': 'Recruter d\'autres chatters avec votre code. 1$/appel (niveau 1) + 0,50$/appel (niveau 2). Vos filleuls travaillent = vous gagnez.',
    'chatter.landing.money.method3.action': 'MLM sans limite',

    'chatter.landing.money.method4.title': '⚖️ Recruter partenaires (5$/appel)',
    'chatter.landing.money.method4.time': '900$/partenaire',
    'chatter.landing.money.method4.desc': 'Trouver 1 avocat/expat helper. Il fait 30 appels/mois × 5$ × 6 mois = 900$ passifs pour VOUS. Répétable à l\'infini.',
    'chatter.landing.money.method4.action': '10 partenaires = 9000$',

    'chatter.landing.money.reality.title': '💡 Réalité terrain : Top chatters gagnent 500-5000$/mois',
    'chatter.landing.money.reality.desc': 'Combinaison des 4 méthodes = revenus illimités. Plus tu partages + recrutes, plus tu gagnes. C\'est mathématique.',
    'chatter.landing.money.reality.tag': 'Facile + Rapide + Passif',
  },
  en: {
    'chatter.landing.money.badge': '💰 Practical Guide',
    'chatter.landing.money.title': 'How to EARN quickly and easily',
    'chatter.landing.money.subtitle': 'No fluff. Here\'s EXACTLY how to make your first $500 this month.',

    'chatter.landing.money.method1.title': '🚀 Quick start (2 min)',
    'chatter.landing.money.method1.time': 'Today',
    'chatter.landing.money.method1.desc': 'Create account + link Telegram + get your affiliate codes. That\'s it. You\'re ready to earn.',
    'chatter.landing.money.method1.action': 'Sign up now',

    'chatter.landing.money.method2.title': '📱 Share your link (5 min/day)',
    'chatter.landing.money.method2.time': 'Right now',
    'chatter.landing.money.method2.desc': 'Post in Facebook/Telegram/WhatsApp expat groups. Simple copy-paste. 1 call = $10.',
    'chatter.landing.money.method2.action': 'Ready templates provided',

    'chatter.landing.money.method3.title': '👥 Build team (passive)',
    'chatter.landing.money.method3.time': 'Lifetime income',
    'chatter.landing.money.method3.desc': 'Recruit other chatters with your code. $1/call (level 1) + $0.50/call (level 2). Your recruits work = you earn.',
    'chatter.landing.money.method3.action': 'Unlimited MLM',

    'chatter.landing.money.method4.title': '⚖️ Recruit partners ($5/call)',
    'chatter.landing.money.method4.time': '$900/partner',
    'chatter.landing.money.method4.desc': 'Find 1 lawyer/expat helper. They make 30 calls/month × $5 × 6 months = $900 passive for YOU. Infinitely repeatable.',
    'chatter.landing.money.method4.action': '10 partners = $9000',

    'chatter.landing.money.reality.title': '💡 Reality check: Top chatters earn $500-5000/month',
    'chatter.landing.money.reality.desc': 'Combination of 4 methods = unlimited income. More you share + recruit, more you earn. It\'s math.',
    'chatter.landing.money.reality.tag': 'Easy + Fast + Passive',
  },
  es: {
    'chatter.landing.money.badge': '💰 Guía Práctica',
    'chatter.landing.money.title': 'Cómo GANAR rápido y fácil',
    'chatter.landing.money.subtitle': 'Sin rodeos. Aquí está EXACTAMENTE cómo hacer tus primeros 500$ este mes.',

    'chatter.landing.money.method1.title': '🚀 Inicio rápido (2 min)',
    'chatter.landing.money.method1.time': 'Hoy',
    'chatter.landing.money.method1.desc': 'Crear cuenta + vincular Telegram + obtener tus códigos de afiliado. Eso es todo. Listo para ganar.',
    'chatter.landing.money.method1.action': 'Regístrate ahora',

    'chatter.landing.money.method2.title': '📱 Compartir tu enlace (5 min/día)',
    'chatter.landing.money.method2.time': 'Ahora mismo',
    'chatter.landing.money.method2.desc': 'Publicar en grupos Facebook/Telegram/WhatsApp de expatriados. Copiar-pegar simple. 1 llamada = 10$.',
    'chatter.landing.money.method2.action': 'Plantillas listas incluidas',

    'chatter.landing.money.method3.title': '👥 Construir equipo (pasivo)',
    'chatter.landing.money.method3.time': 'Ingresos de por vida',
    'chatter.landing.money.method3.desc': 'Reclutar otros chatters con tu código. 1$/llamada (nivel 1) + 0,50$/llamada (nivel 2). Tus reclutas trabajan = tú ganas.',
    'chatter.landing.money.method3.action': 'MLM sin límite',

    'chatter.landing.money.method4.title': '⚖️ Reclutar socios (5$/llamada)',
    'chatter.landing.money.method4.time': '900$/socio',
    'chatter.landing.money.method4.desc': 'Encontrar 1 abogado/ayudante expat. Hace 30 llamadas/mes × 5$ × 6 meses = 900$ pasivos para TI. Repetible infinitamente.',
    'chatter.landing.money.method4.action': '10 socios = 9000$',

    'chatter.landing.money.reality.title': '💡 Realidad: Top chatters ganan 500-5000$/mes',
    'chatter.landing.money.reality.desc': 'Combinación de 4 métodos = ingresos ilimitados. Cuanto más compartes + reclutas, más ganas. Es matemático.',
    'chatter.landing.money.reality.tag': 'Fácil + Rápido + Pasivo',
  },
  de: {
    'chatter.landing.money.badge': '💰 Praktischer Leitfaden',
    'chatter.landing.money.title': 'Wie man SCHNELL und einfach verdient',
    'chatter.landing.money.subtitle': 'Kein Blabla. Hier ist GENAU wie Sie Ihre ersten 500$ diesen Monat machen.',

    'chatter.landing.money.method1.title': '🚀 Schnellstart (2 Min)',
    'chatter.landing.money.method1.time': 'Heute',
    'chatter.landing.money.method1.desc': 'Konto erstellen + Telegram verknüpfen + Ihre Affiliate-Codes erhalten. Das war\'s. Sie sind bereit zu verdienen.',
    'chatter.landing.money.method1.action': 'Jetzt anmelden',

    'chatter.landing.money.method2.title': '📱 Link teilen (5 Min/Tag)',
    'chatter.landing.money.method2.time': 'Jetzt sofort',
    'chatter.landing.money.method2.desc': 'In Facebook/Telegram/WhatsApp Expat-Gruppen posten. Einfaches Kopieren-Einfügen. 1 Anruf = 10$.',
    'chatter.landing.money.method2.action': 'Fertige Vorlagen bereitgestellt',

    'chatter.landing.money.method3.title': '👥 Team aufbauen (passiv)',
    'chatter.landing.money.method3.time': 'Lebenslang Einkommen',
    'chatter.landing.money.method3.desc': 'Andere Chatter mit Ihrem Code rekrutieren. 1$/Anruf (Level 1) + 0,50$/Anruf (Level 2). Ihre Rekruten arbeiten = Sie verdienen.',
    'chatter.landing.money.method3.action': 'Unbegrenztes MLM',

    'chatter.landing.money.method4.title': '⚖️ Partner rekrutieren (5$/Anruf)',
    'chatter.landing.money.method4.time': '900$/Partner',
    'chatter.landing.money.method4.desc': '1 Anwalt/Expat-Helfer finden. Sie machen 30 Anrufe/Monat × 5$ × 6 Monate = 900$ passiv für SIE. Unendlich wiederholbar.',
    'chatter.landing.money.method4.action': '10 Partner = 9000$',

    'chatter.landing.money.reality.title': '💡 Realität: Top Chatter verdienen 500-5000$/Monat',
    'chatter.landing.money.reality.desc': 'Kombination von 4 Methoden = unbegrenztes Einkommen. Je mehr Sie teilen + rekrutieren, desto mehr verdienen Sie. Es ist Mathematik.',
    'chatter.landing.money.reality.tag': 'Einfach + Schnell + Passiv',
  },
  pt: {
    'chatter.landing.money.badge': '💰 Guia Prático',
    'chatter.landing.money.title': 'Como GANHAR rápido e fácil',
    'chatter.landing.money.subtitle': 'Sem enrolação. Aqui está EXATAMENTE como fazer seus primeiros 500$ este mês.',

    'chatter.landing.money.method1.title': '🚀 Início rápido (2 min)',
    'chatter.landing.money.method1.time': 'Hoje',
    'chatter.landing.money.method1.desc': 'Criar conta + vincular Telegram + obter seus códigos de afiliado. É isso. Você está pronto para ganhar.',
    'chatter.landing.money.method1.action': 'Cadastre-se agora',

    'chatter.landing.money.method2.title': '📱 Compartilhar seu link (5 min/dia)',
    'chatter.landing.money.method2.time': 'Agora mesmo',
    'chatter.landing.money.method2.desc': 'Postar em grupos Facebook/Telegram/WhatsApp de expatriados. Copiar-colar simples. 1 chamada = 10$.',
    'chatter.landing.money.method2.action': 'Templates prontos fornecidos',

    'chatter.landing.money.method3.title': '👥 Construir equipe (passivo)',
    'chatter.landing.money.method3.time': 'Renda vitalícia',
    'chatter.landing.money.method3.desc': 'Recrutar outros chatters com seu código. 1$/chamada (nível 1) + 0,50$/chamada (nível 2). Seus recrutas trabalham = você ganha.',
    'chatter.landing.money.method3.action': 'MLM sem limite',

    'chatter.landing.money.method4.title': '⚖️ Recrutar parceiros (5$/chamada)',
    'chatter.landing.money.method4.time': '900$/parceiro',
    'chatter.landing.money.method4.desc': 'Encontrar 1 advogado/ajudante expat. Ele faz 30 chamadas/mês × 5$ × 6 meses = 900$ passivos para VOCÊ. Repetível infinitamente.',
    'chatter.landing.money.method4.action': '10 parceiros = 9000$',

    'chatter.landing.money.reality.title': '💡 Realidade: Top chatters ganham 500-5000$/mês',
    'chatter.landing.money.reality.desc': 'Combinação de 4 métodos = renda ilimitada. Quanto mais você compartilha + recruta, mais você ganha. É matemática.',
    'chatter.landing.money.reality.tag': 'Fácil + Rápido + Passivo',
  },
  ru: {
    'chatter.landing.money.badge': '💰 Практическое руководство',
    'chatter.landing.money.title': 'Как ЗАРАБОТАТЬ быстро и легко',
    'chatter.landing.money.subtitle': 'Без воды. Вот ТОЧНО как сделать ваши первые 500$ в этом месяце.',

    'chatter.landing.money.method1.title': '🚀 Быстрый старт (2 мин)',
    'chatter.landing.money.method1.time': 'Сегодня',
    'chatter.landing.money.method1.desc': 'Создать аккаунт + связать Telegram + получить ваши партнерские коды. Вот и все. Вы готовы зарабатывать.',
    'chatter.landing.money.method1.action': 'Зарегистрироваться сейчас',

    'chatter.landing.money.method2.title': '📱 Делиться ссылкой (5 мин/день)',
    'chatter.landing.money.method2.time': 'Прямо сейчас',
    'chatter.landing.money.method2.desc': 'Публиковать в Facebook/Telegram/WhatsApp группах экспатов. Простое копирование-вставка. 1 звонок = 10$.',
    'chatter.landing.money.method2.action': 'Готовые шаблоны предоставлены',

    'chatter.landing.money.method3.title': '👥 Создать команду (пассивно)',
    'chatter.landing.money.method3.time': 'Доход на всю жизнь',
    'chatter.landing.money.method3.desc': 'Рекрутировать других чаттеров с вашим кодом. 1$/звонок (уровень 1) + 0,50$/звонок (уровень 2). Ваши рекруты работают = вы зарабатываете.',
    'chatter.landing.money.method3.action': 'Безлимитный MLM',

    'chatter.landing.money.method4.title': '⚖️ Рекрутировать партнеров (5$/звонок)',
    'chatter.landing.money.method4.time': '900$/партнер',
    'chatter.landing.money.method4.desc': 'Найти 1 юриста/помощника экспата. Они делают 30 звонков/месяц × 5$ × 6 месяцев = 900$ пассивно для ВАС. Бесконечно повторяемо.',
    'chatter.landing.money.method4.action': '10 партнеров = 9000$',

    'chatter.landing.money.reality.title': '💡 Реальность: Топ чаттеры зарабатывают 500-5000$/месяц',
    'chatter.landing.money.reality.desc': 'Комбинация 4 методов = неограниченный доход. Чем больше вы делитесь + рекрутируете, тем больше зарабатываете. Это математика.',
    'chatter.landing.money.reality.tag': 'Легко + Быстро + Пассивно',
  },
  ch: {
    'chatter.landing.money.badge': '💰 实用指南',
    'chatter.landing.money.title': '如何快速轻松赚钱',
    'chatter.landing.money.subtitle': '不废话。这里准确告诉您本月如何赚取您的第一个500美元。',

    'chatter.landing.money.method1.title': '🚀 快速开始（2分钟）',
    'chatter.landing.money.method1.time': '今天',
    'chatter.landing.money.method1.desc': '创建帐户+链接Telegram+获取您的联盟代码。就这样。您准备好赚钱了。',
    'chatter.landing.money.method1.action': '立即注册',

    'chatter.landing.money.method2.title': '📱 分享您的链接（5分钟/天）',
    'chatter.landing.money.method2.time': '现在',
    'chatter.landing.money.method2.desc': '在Facebook/Telegram/WhatsApp外派群组中发布。简单的复制粘贴。1次通话=10美元。',
    'chatter.landing.money.method2.action': '提供现成模板',

    'chatter.landing.money.method3.title': '👥 建立团队（被动）',
    'chatter.landing.money.method3.time': '终身收入',
    'chatter.landing.money.method3.desc': '用您的代码招募其他聊天者。1美元/通话（第1级）+0.50美元/通话（第2级）。您的招募者工作=您赚钱。',
    'chatter.landing.money.method3.action': '无限MLM',

    'chatter.landing.money.method4.title': '⚖️ 招募合作伙伴（5美元/通话）',
    'chatter.landing.money.method4.time': '900美元/合作伙伴',
    'chatter.landing.money.method4.desc': '找到1个律师/外派助手。他们每月30次通话×5美元×6个月=为您被动赚取900美元。无限可重复。',
    'chatter.landing.money.method4.action': '10个合作伙伴=9000美元',

    'chatter.landing.money.reality.title': '💡 现实：顶级聊天者每月赚500-5000美元',
    'chatter.landing.money.reality.desc': '4种方法的组合=无限收入。您分享+招募越多，您赚得越多。这是数学。',
    'chatter.landing.money.reality.tag': '简单+快速+被动',
  },
  hi: {
    'chatter.landing.money.badge': '💰 व्यावहारिक गाइड',
    'chatter.landing.money.title': 'जल्दी और आसानी से कैसे कमाएं',
    'chatter.landing.money.subtitle': 'कोई बकवास नहीं। यहाँ EXACTLY बताया गया है कि इस महीने अपने पहले 500$ कैसे बनाएं।',

    'chatter.landing.money.method1.title': '🚀 त्वरित शुरुआत (2 मिनट)',
    'chatter.landing.money.method1.time': 'आज',
    'chatter.landing.money.method1.desc': 'खाता बनाएं + Telegram लिंक करें + अपने सहबद्ध कोड प्राप्त करें। बस इतना ही। आप कमाने के लिए तैयार हैं।',
    'chatter.landing.money.method1.action': 'अभी साइन अप करें',

    'chatter.landing.money.method2.title': '📱 अपना लिंक साझा करें (5 मिनट/दिन)',
    'chatter.landing.money.method2.time': 'अभी',
    'chatter.landing.money.method2.desc': 'Facebook/Telegram/WhatsApp प्रवासी समूहों में पोस्ट करें। सरल कॉपी-पेस्ट। 1 कॉल = 10$।',
    'chatter.landing.money.method2.action': 'तैयार टेम्पलेट प्रदान किए गए',

    'chatter.landing.money.method3.title': '👥 टीम बनाएं (निष्क्रिय)',
    'chatter.landing.money.method3.time': 'आजीवन आय',
    'chatter.landing.money.method3.desc': 'अपने कोड के साथ अन्य चैटर्स को भर्ती करें। 1$/कॉल (स्तर 1) + 0.50$/कॉल (स्तर 2)। आपके भर्ती काम करते हैं = आप कमाते हैं।',
    'chatter.landing.money.method3.action': 'असीमित MLM',

    'chatter.landing.money.method4.title': '⚖️ भागीदारों की भर्ती (5$/कॉल)',
    'chatter.landing.money.method4.time': '900$/भागीदार',
    'chatter.landing.money.method4.desc': '1 वकील/प्रवासी सहायक खोजें। वे 30 कॉल/माह × 5$ × 6 महीने = आपके लिए 900$ निष्क्रिय करते हैं। अनंत रूप से दोहराया जा सकता है।',
    'chatter.landing.money.method4.action': '10 भागीदार = 9000$',

    'chatter.landing.money.reality.title': '💡 वास्तविकता: शीर्ष चैटर्स 500-5000$/माह कमाते हैं',
    'chatter.landing.money.reality.desc': '4 विधियों का संयोजन = असीमित आय। आप जितना अधिक साझा करते हैं + भर्ती करते हैं, उतना अधिक कमाते हैं। यह गणित है।',
    'chatter.landing.money.reality.tag': 'आसान + तेज + निष्क्रिय',
  },
  ar: {
    'chatter.landing.money.badge': '💰 دليل عملي',
    'chatter.landing.money.title': 'كيف تكسب بسرعة وسهولة',
    'chatter.landing.money.subtitle': 'لا كلام فارغ. إليك بالضبط كيفية كسب أول 500$ هذا الشهر.',

    'chatter.landing.money.method1.title': '🚀 بداية سريعة (دقيقتان)',
    'chatter.landing.money.method1.time': 'اليوم',
    'chatter.landing.money.method1.desc': 'إنشاء حساب + ربط Telegram + الحصول على أكواد الشراكة الخاصة بك. هذا كل شيء. أنت جاهز للكسب.',
    'chatter.landing.money.method1.action': 'سجل الآن',

    'chatter.landing.money.method2.title': '📱 شارك رابطك (5 دقائق/يوم)',
    'chatter.landing.money.method2.time': 'الآن',
    'chatter.landing.money.method2.desc': 'انشر في مجموعات Facebook/Telegram/WhatsApp للمغتربين. نسخ ولصق بسيط. 1 مكالمة = 10$.',
    'chatter.landing.money.method2.action': 'قوالب جاهزة مقدمة',

    'chatter.landing.money.method3.title': '👥 بناء فريق (سلبي)',
    'chatter.landing.money.method3.time': 'دخل مدى الحياة',
    'chatter.landing.money.method3.desc': 'جنِّد متحدثين آخرين برمزك. 1$/مكالمة (المستوى 1) + 0.50$/مكالمة (المستوى 2). مجنَّدوك يعملون = أنت تكسب.',
    'chatter.landing.money.method3.action': 'MLM غير محدود',

    'chatter.landing.money.method4.title': '⚖️ تجنيد شركاء (5$/مكالمة)',
    'chatter.landing.money.method4.time': '900$/شريك',
    'chatter.landing.money.method4.desc': 'ابحث عن 1 محامي/مساعد مغترب. يجري 30 مكالمة/شهر × 5$ × 6 أشهر = 900$ سلبي لك. قابل للتكرار إلى ما لا نهاية.',
    'chatter.landing.money.method4.action': '10 شركاء = 9000$',

    'chatter.landing.money.reality.title': '💡 الواقع: أفضل المتحدثين يكسبون 500-5000$/شهر',
    'chatter.landing.money.reality.desc': 'مزيج من 4 طرق = دخل غير محدود. كلما شاركت + جنَّدت أكثر، كلما كسبت أكثر. إنها رياضيات.',
    'chatter.landing.money.reality.tag': 'سهل + سريع + سلبي',
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

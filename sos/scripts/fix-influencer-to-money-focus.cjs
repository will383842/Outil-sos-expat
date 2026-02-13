/**
 * FIX Influencer Landing - MONEY FOCUS (pas guide followers)
 * Comme Chatter : focus sur comment GAGNER
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    // Remplacer les clés VALUE existantes par MONEY FOCUS
    'influencer.landing.value.badge': '💰 Guide Gains',
    'influencer.landing.value.title': 'Comment GAGNER avec votre audience',
    'influencer.landing.value.subtitle': 'Pas de blabla. Voici EXACTEMENT comment monétiser vos followers ce mois-ci.',

    'influencer.landing.value.problem1.title': '🚀 Setup rapide (5 min)',
    'influencer.landing.value.problem1.desc': 'Créer compte + obtenir lien/bannières/QR codes. Prêt à promouvoir.',
    'influencer.landing.value.problem1.solution': 'Outils marketing fournis : bannières HD, widgets, templates posts. Tout est prêt.',

    'influencer.landing.value.problem2.title': '📱 Promouvoir (1 post/semaine)',
    'influencer.landing.value.problem2.desc': 'Story Instagram/TikTok/YouTube. Bio link. 1 follower appelle = 10$. Passif.',
    'influencer.landing.value.problem2.solution': 'Templates de posts fournis. Copier-coller. Vos followers économisent 5$ = win-win.',

    'influencer.landing.value.problem3.title': '👥 Recruter influenceurs (5$/appel)',
    'influencer.landing.value.problem3.desc': 'Recruter d\'autres influenceurs. Ils promeuvent = vous gagnez 5$/appel passif.',
    'influencer.landing.value.problem3.solution': '10 influenceurs × 50 appels/mois × 5$ = 2500$/mois PASSIFS pour vous.',

    'influencer.landing.value.problem4.title': '💎 Audience = Asset',
    'influencer.landing.value.problem4.desc': '10K followers bien ciblés (voyage/expat) = potentiel 500-2000$/mois récurrents.',
    'influencer.landing.value.problem4.solution': 'Plus votre audience grandit, plus vos revenus augmentent. Automatique.',

    'influencer.landing.value.winwin.title': '💡 Top influenceurs : 1000-5000$/mois avec audience moyenne',
    'influencer.landing.value.winwin.desc': 'Monétisation passive. Vos followers économisent 5$ + obtiennent aide pro. Vous gagnez 10$/appel. Tout le monde gagne.',
    'influencer.landing.value.winwin.tag': 'Passif + Récurrent + Scalable',
  },
  en: {
    'influencer.landing.value.badge': '💰 Earnings Guide',
    'influencer.landing.value.title': 'How to EARN with your audience',
    'influencer.landing.value.subtitle': 'No fluff. Here\'s EXACTLY how to monetize your followers this month.',

    'influencer.landing.value.problem1.title': '🚀 Quick setup (5 min)',
    'influencer.landing.value.problem1.desc': 'Create account + get link/banners/QR codes. Ready to promote.',
    'influencer.landing.value.problem1.solution': 'Marketing tools provided: HD banners, widgets, post templates. Everything ready.',

    'influencer.landing.value.problem2.title': '📱 Promote (1 post/week)',
    'influencer.landing.value.problem2.desc': 'Instagram/TikTok/YouTube story. Bio link. 1 follower calls = $10. Passive.',
    'influencer.landing.value.problem2.solution': 'Post templates provided. Copy-paste. Your followers save $5 = win-win.',

    'influencer.landing.value.problem3.title': '👥 Recruit influencers ($5/call)',
    'influencer.landing.value.problem3.desc': 'Recruit other influencers. They promote = you earn $5/call passive.',
    'influencer.landing.value.problem3.solution': '10 influencers × 50 calls/month × $5 = $2500/month PASSIVE for you.',

    'influencer.landing.value.problem4.title': '💎 Audience = Asset',
    'influencer.landing.value.problem4.desc': '10K well-targeted followers (travel/expat) = potential $500-2000/month recurring.',
    'influencer.landing.value.problem4.solution': 'As your audience grows, your income increases. Automatic.',

    'influencer.landing.value.winwin.title': '💡 Top influencers: $1000-5000/month with average audience',
    'influencer.landing.value.winwin.desc': 'Passive monetization. Your followers save $5 + get pro help. You earn $10/call. Everyone wins.',
    'influencer.landing.value.winwin.tag': 'Passive + Recurring + Scalable',
  },
  es: {
    'influencer.landing.value.badge': '💰 Guía de Ganancias',
    'influencer.landing.value.title': 'Cómo GANAR con tu audiencia',
    'influencer.landing.value.subtitle': 'Sin rodeos. Aquí está EXACTAMENTE cómo monetizar tus seguidores este mes.',

    'influencer.landing.value.problem1.title': '🚀 Configuración rápida (5 min)',
    'influencer.landing.value.problem1.desc': 'Crear cuenta + obtener enlace/banners/códigos QR. Listo para promover.',
    'influencer.landing.value.problem1.solution': 'Herramientas de marketing incluidas: banners HD, widgets, plantillas posts. Todo listo.',

    'influencer.landing.value.problem2.title': '📱 Promocionar (1 post/semana)',
    'influencer.landing.value.problem2.desc': 'Story Instagram/TikTok/YouTube. Link bio. 1 seguidor llama = 10$. Pasivo.',
    'influencer.landing.value.problem2.solution': 'Plantillas de posts incluidas. Copiar-pegar. Tus seguidores ahorran 5$ = ganar-ganar.',

    'influencer.landing.value.problem3.title': '👥 Reclutar influencers (5$/llamada)',
    'influencer.landing.value.problem3.desc': 'Reclutar otros influencers. Ellos promocionan = tú ganas 5$/llamada pasivo.',
    'influencer.landing.value.problem3.solution': '10 influencers × 50 llamadas/mes × 5$ = 2500$/mes PASIVOS para ti.',

    'influencer.landing.value.problem4.title': '💎 Audiencia = Activo',
    'influencer.landing.value.problem4.desc': '10K seguidores bien segmentados (viaje/expat) = potencial 500-2000$/mes recurrente.',
    'influencer.landing.value.problem4.solution': 'A medida que tu audiencia crece, tus ingresos aumentan. Automático.',

    'influencer.landing.value.winwin.title': '💡 Top influencers: 1000-5000$/mes con audiencia media',
    'influencer.landing.value.winwin.desc': 'Monetización pasiva. Tus seguidores ahorran 5$ + obtienen ayuda pro. Ganas 10$/llamada. Todos ganan.',
    'influencer.landing.value.winwin.tag': 'Pasivo + Recurrente + Escalable',
  },
  de: {
    'influencer.landing.value.badge': '💰 Verdienstleitfaden',
    'influencer.landing.value.title': 'Wie man mit seinem Publikum VERDIENT',
    'influencer.landing.value.subtitle': 'Kein Blabla. So monetarisieren Sie Ihre Follower diesen Monat GENAU.',

    'influencer.landing.value.problem1.title': '🚀 Schnelle Einrichtung (5 Min)',
    'influencer.landing.value.problem1.desc': 'Konto erstellen + Link/Banner/QR-Codes erhalten. Bereit zum Bewerben.',
    'influencer.landing.value.problem1.solution': 'Marketing-Tools bereitgestellt: HD-Banner, Widgets, Post-Vorlagen. Alles fertig.',

    'influencer.landing.value.problem2.title': '📱 Bewerben (1 Post/Woche)',
    'influencer.landing.value.problem2.desc': 'Instagram/TikTok/YouTube Story. Bio-Link. 1 Follower ruft an = 10$. Passiv.',
    'influencer.landing.value.problem2.solution': 'Post-Vorlagen bereitgestellt. Kopieren-Einfügen. Ihre Follower sparen 5$ = Win-Win.',

    'influencer.landing.value.problem3.title': '👥 Influencer rekrutieren (5$/Anruf)',
    'influencer.landing.value.problem3.desc': 'Andere Influencer rekrutieren. Sie bewerben = Sie verdienen 5$/Anruf passiv.',
    'influencer.landing.value.problem3.solution': '10 Influencer × 50 Anrufe/Monat × 5$ = 2500$/Monat PASSIV für Sie.',

    'influencer.landing.value.problem4.title': '💎 Publikum = Vermögenswert',
    'influencer.landing.value.problem4.desc': '10K gut ausgerichtete Follower (Reise/Expat) = Potenzial 500-2000$/Monat wiederkehrend.',
    'influencer.landing.value.problem4.solution': 'Je mehr Ihr Publikum wächst, desto mehr steigt Ihr Einkommen. Automatisch.',

    'influencer.landing.value.winwin.title': '💡 Top-Influencer: 1000-5000$/Monat mit durchschnittlichem Publikum',
    'influencer.landing.value.winwin.desc': 'Passive Monetarisierung. Ihre Follower sparen 5$ + erhalten professionelle Hilfe. Sie verdienen 10$/Anruf. Alle gewinnen.',
    'influencer.landing.value.winwin.tag': 'Passiv + Wiederkehrend + Skalierbar',
  },
  pt: {
    'influencer.landing.value.badge': '💰 Guia de Ganhos',
    'influencer.landing.value.title': 'Como GANHAR com sua audiência',
    'influencer.landing.value.subtitle': 'Sem enrolação. Aqui está EXATAMENTE como monetizar seus seguidores este mês.',

    'influencer.landing.value.problem1.title': '🚀 Configuração rápida (5 min)',
    'influencer.landing.value.problem1.desc': 'Criar conta + obter link/banners/códigos QR. Pronto para promover.',
    'influencer.landing.value.problem1.solution': 'Ferramentas de marketing fornecidas: banners HD, widgets, templates posts. Tudo pronto.',

    'influencer.landing.value.problem2.title': '📱 Promover (1 post/semana)',
    'influencer.landing.value.problem2.desc': 'Story Instagram/TikTok/YouTube. Link bio. 1 seguidor liga = 10$. Passivo.',
    'influencer.landing.value.problem2.solution': 'Templates de posts fornecidos. Copiar-colar. Seus seguidores economizam 5$ = ganha-ganha.',

    'influencer.landing.value.problem3.title': '👥 Recrutar influencers (5$/chamada)',
    'influencer.landing.value.problem3.desc': 'Recrutar outros influencers. Eles promovem = você ganha 5$/chamada passivo.',
    'influencer.landing.value.problem3.solution': '10 influencers × 50 chamadas/mês × 5$ = 2500$/mês PASSIVOS para você.',

    'influencer.landing.value.problem4.title': '💎 Audiência = Ativo',
    'influencer.landing.value.problem4.desc': '10K seguidores bem segmentados (viagem/expat) = potencial 500-2000$/mês recorrente.',
    'influencer.landing.value.problem4.solution': 'À medida que sua audiência cresce, sua renda aumenta. Automático.',

    'influencer.landing.value.winwin.title': '💡 Top influencers: 1000-5000$/mês com audiência média',
    'influencer.landing.value.winwin.desc': 'Monetização passiva. Seus seguidores economizam 5$ + obtêm ajuda profissional. Você ganha 10$/chamada. Todos ganham.',
    'influencer.landing.value.winwin.tag': 'Passivo + Recorrente + Escalável',
  },
  ru: {
    'influencer.landing.value.badge': '💰 Руководство по заработку',
    'influencer.landing.value.title': 'Как ЗАРАБАТЫВАТЬ с вашей аудиторией',
    'influencer.landing.value.subtitle': 'Без воды. Вот ТОЧНО как монетизировать ваших подписчиков в этом месяце.',

    'influencer.landing.value.problem1.title': '🚀 Быстрая настройка (5 мин)',
    'influencer.landing.value.problem1.desc': 'Создать аккаунт + получить ссылку/баннеры/QR-коды. Готов к продвижению.',
    'influencer.landing.value.problem1.solution': 'Маркетинговые инструменты предоставлены: HD-баннеры, виджеты, шаблоны постов. Все готово.',

    'influencer.landing.value.problem2.title': '📱 Продвигать (1 пост/неделю)',
    'influencer.landing.value.problem2.desc': 'Story Instagram/TikTok/YouTube. Ссылка в био. 1 подписчик звонит = 10$. Пассивно.',
    'influencer.landing.value.problem2.solution': 'Шаблоны постов предоставлены. Копировать-вставить. Ваши подписчики экономят 5$ = взаимная выгода.',

    'influencer.landing.value.problem3.title': '👥 Рекрутировать инфлюенсеров (5$/звонок)',
    'influencer.landing.value.problem3.desc': 'Рекрутировать других инфлюенсеров. Они продвигают = вы зарабатываете 5$/звонок пассивно.',
    'influencer.landing.value.problem3.solution': '10 инфлюенсеров × 50 звонков/месяц × 5$ = 2500$/месяц ПАССИВНО для вас.',

    'influencer.landing.value.problem4.title': '💎 Аудитория = Актив',
    'influencer.landing.value.problem4.desc': '10K хорошо сегментированных подписчиков (путешествия/экспаты) = потенциал 500-2000$/месяц регулярно.',
    'influencer.landing.value.problem4.solution': 'По мере роста вашей аудитории растет ваш доход. Автоматически.',

    'influencer.landing.value.winwin.title': '💡 Топ-инфлюенсеры: 1000-5000$/месяц со средней аудиторией',
    'influencer.landing.value.winwin.desc': 'Пассивная монетизация. Ваши подписчики экономят 5$ + получают профессиональную помощь. Вы зарабатываете 10$/звонок. Все выигрывают.',
    'influencer.landing.value.winwin.tag': 'Пассивно + Регулярно + Масштабируемо',
  },
  ch: {
    'influencer.landing.value.badge': '💰 收益指南',
    'influencer.landing.value.title': '如何用您的受众赚钱',
    'influencer.landing.value.subtitle': '不废话。这里准确告诉您本月如何将您的粉丝货币化。',

    'influencer.landing.value.problem1.title': '🚀 快速设置（5分钟）',
    'influencer.landing.value.problem1.desc': '创建帐户+获取链接/横幅/二维码。准备推广。',
    'influencer.landing.value.problem1.solution': '提供营销工具：高清横幅、小部件、帖子模板。一切就绪。',

    'influencer.landing.value.problem2.title': '📱 推广（1帖/周）',
    'influencer.landing.value.problem2.desc': 'Instagram/TikTok/YouTube故事。简介链接。1粉丝致电=10美元。被动。',
    'influencer.landing.value.problem2.solution': '提供帖子模板。复制粘贴。您的粉丝节省5美元=双赢。',

    'influencer.landing.value.problem3.title': '👥 招募影响者（5美元/通话）',
    'influencer.landing.value.problem3.desc': '招募其他影响者。他们推广=您被动赚取5美元/通话。',
    'influencer.landing.value.problem3.solution': '10个影响者×50通话/月×5美元=每月2500美元被动收入。',

    'influencer.landing.value.problem4.title': '💎 受众=资产',
    'influencer.landing.value.problem4.desc': '10K精准粉丝（旅行/外派）=潜在每月500-2000美元经常性收入。',
    'influencer.landing.value.problem4.solution': '随着您的受众增长，您的收入增加。自动。',

    'influencer.landing.value.winwin.title': '💡 顶级影响者：平均受众每月1000-5000美元',
    'influencer.landing.value.winwin.desc': '被动货币化。您的粉丝节省5美元+获得专业帮助。您每次通话赚取10美元。每个人都赢了。',
    'influencer.landing.value.winwin.tag': '被动+经常性+可扩展',
  },
  hi: {
    'influencer.landing.value.badge': '💰 कमाई गाइड',
    'influencer.landing.value.title': 'अपने दर्शकों के साथ कैसे कमाएं',
    'influencer.landing.value.subtitle': 'कोई बकवास नहीं। यहाँ EXACTLY बताया गया है कि इस महीने अपने अनुयायियों को कैसे मुद्रीकृत करें।',

    'influencer.landing.value.problem1.title': '🚀 त्वरित सेटअप (5 मिनट)',
    'influencer.landing.value.problem1.desc': 'खाता बनाएं + लिंक/बैनर/QR कोड प्राप्त करें। प्रचार के लिए तैयार।',
    'influencer.landing.value.problem1.solution': 'मार्केटिंग टूल प्रदान किए गए: एचडी बैनर, विजेट, पोस्ट टेम्पलेट। सब कुछ तैयार।',

    'influencer.landing.value.problem2.title': '📱 प्रचार करें (1 पोस्ट/सप्ताह)',
    'influencer.landing.value.problem2.desc': 'Instagram/TikTok/YouTube स्टोरी। बायो लिंक। 1 अनुयायी कॉल करता है = 10$। निष्क्रिय।',
    'influencer.landing.value.problem2.solution': 'पोस्ट टेम्पलेट प्रदान किए गए। कॉपी-पेस्ट। आपके अनुयायी 5$ बचाते हैं = विन-विन।',

    'influencer.landing.value.problem3.title': '👥 प्रभावकों की भर्ती (5$/कॉल)',
    'influencer.landing.value.problem3.desc': 'अन्य प्रभावकों को भर्ती करें। वे प्रचार करते हैं = आप 5$/कॉल निष्क्रिय कमाते हैं।',
    'influencer.landing.value.problem3.solution': '10 प्रभावक × 50 कॉल/माह × 5$ = आपके लिए 2500$/माह निष्क्रिय।',

    'influencer.landing.value.problem4.title': '💎 दर्शक = संपत्ति',
    'influencer.landing.value.problem4.desc': '10K अच्छी तरह से लक्षित अनुयायी (यात्रा/प्रवासी) = संभावित 500-2000$/माह आवर्ती।',
    'influencer.landing.value.problem4.solution': 'जैसे-जैसे आपके दर्शक बढ़ते हैं, आपकी आय बढ़ती है। स्वचालित।',

    'influencer.landing.value.winwin.title': '💡 शीर्ष प्रभावक: औसत दर्शकों के साथ 1000-5000$/माह',
    'influencer.landing.value.winwin.desc': 'निष्क्रिय मुद्रीकरण। आपके अनुयायी 5$ बचाते हैं + पेशेवर मदद प्राप्त करते हैं। आप 10$/कॉल कमाते हैं। सभी जीतते हैं।',
    'influencer.landing.value.winwin.tag': 'निष्क्रिय + आवर्ती + स्केलेबल',
  },
  ar: {
    'influencer.landing.value.badge': '💰 دليل الأرباح',
    'influencer.landing.value.title': 'كيف تكسب مع جمهورك',
    'influencer.landing.value.subtitle': 'لا كلام فارغ. إليك بالضبط كيفية تحقيق الدخل من متابعيك هذا الشهر.',

    'influencer.landing.value.problem1.title': '🚀 إعداد سريع (5 دقائق)',
    'influencer.landing.value.problem1.desc': 'إنشاء حساب + الحصول على رابط/لافتات/رموز QR. جاهز للترويج.',
    'influencer.landing.value.problem1.solution': 'أدوات تسويق مقدمة: لافتات عالية الدقة، ودجات، قوالب منشورات. كل شيء جاهز.',

    'influencer.landing.value.problem2.title': '📱 الترويج (منشور واحد/أسبوع)',
    'influencer.landing.value.problem2.desc': 'قصة Instagram/TikTok/YouTube. رابط السيرة الذاتية. 1 متابع يتصل = 10$. سلبي.',
    'influencer.landing.value.problem2.solution': 'قوالب منشورات مقدمة. نسخ ولصق. متابعوك يوفرون 5$ = فوز للجميع.',

    'influencer.landing.value.problem3.title': '👥 توظيف المؤثرين (5$/مكالمة)',
    'influencer.landing.value.problem3.desc': 'توظيف مؤثرين آخرين. يروجون = تكسب 5$/مكالمة سلبي.',
    'influencer.landing.value.problem3.solution': '10 مؤثرين × 50 مكالمة/شهر × 5$ = 2500$/شهر سلبي لك.',

    'influencer.landing.value.problem4.title': '💎 الجمهور = أصل',
    'influencer.landing.value.problem4.desc': '10K متابع مستهدف جيدًا (سفر/مغتربين) = إمكانية 500-2000$/شهر متكرر.',
    'influencer.landing.value.problem4.solution': 'مع نمو جمهورك، يزداد دخلك. تلقائي.',

    'influencer.landing.value.winwin.title': '💡 أفضل المؤثرين: 1000-5000$/شهر مع جمهور متوسط',
    'influencer.landing.value.winwin.desc': 'تحقيق الدخل السلبي. متابعوك يوفرون 5$ + يحصلون على مساعدة محترفة. تكسب 10$/مكالمة. الجميع يفوز.',
    'influencer.landing.value.winwin.tag': 'سلبي + متكرر + قابل للتوسع',
  },
};

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

function updateTranslations() {
  let totalUpdated = 0;
  const errors = [];

  for (const lang of LANGUAGES) {
    const filePath = path.join(__dirname, '..', 'src', 'helper', `${lang}.json`);

    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const updated = { ...existing, ...TRANSLATIONS[lang] };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

      const updatedCount = Object.keys(TRANSLATIONS[lang]).length;
      totalUpdated += updatedCount;
      console.log(`✅ ${lang.toUpperCase()}: Updated ${updatedCount} keys`);
    } catch (error) {
      const msg = `❌ ${lang.toUpperCase()}: ${error.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log(`\n📊 Summary: Updated ${totalUpdated} translation keys across ${LANGUAGES.length} languages`);

  if (errors.length > 0) {
    console.error(`\n⚠️ Errors occurred:\n${errors.join('\n')}`);
    process.exit(1);
  }

  console.log('\n✅ All translations updated successfully!');
}

updateTranslations();

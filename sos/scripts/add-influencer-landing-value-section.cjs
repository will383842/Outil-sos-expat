/**
 * Add Influencer Landing VALUE Section Translations
 * Montre que l'influencer apporte de la VRAIE valeur à ses followers
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'influencer.landing.value.badge': '🤝 Gagnant-Gagnant',
    'influencer.landing.value.title': 'Vous apportez de la VRAIE valeur',
    'influencer.landing.value.subtitle': 'Vous ne vendez pas, vous AIDEZ. Votre contenu guide vos followers dans leur vie d\'expat.',
    'influencer.landing.value.solution': 'Votre solution',

    'influencer.landing.value.problem1.title': 'Bloqué dans démarches visa',
    'influencer.landing.value.problem1.desc': 'Follower stressé : visa compliqué, ne comprend pas les documents, risque de refus.',
    'influencer.landing.value.problem1.solution': 'Votre vidéo explique les bases + lien vers avocat spécialisé pour aide détaillée. Follower guidé.',

    'influencer.landing.value.problem2.title': 'Nouveau expat perdu',
    'influencer.landing.value.problem2.desc': 'Follower vient d\'arriver dans nouveau pays, tout est flou, ne sait pas par où commencer.',
    'influencer.landing.value.problem2.solution': 'Votre content rassure + donne tips pratiques. Accès aide 24/7 + 5% réduction. Follower rassuré.',

    'influencer.landing.value.problem3.title': 'Urgence administrative',
    'influencer.landing.value.problem3.desc': 'Follower panique : contrôle demain, documents pas en règle, stress maximum.',
    'influencer.landing.value.problem3.solution': 'Vous partagez votre expérience. Communauté + experts accessibles via votre lien. Urgence résolue.',

    'influencer.landing.value.problem4.title': 'Budget serré',
    'influencer.landing.value.problem4.desc': 'Follower besoin aide légale mais cabinet classique = 500$/heure (trop cher).',
    'influencer.landing.value.problem4.solution': 'Tips gratuits dans vos vidéos + 5% réduction via VOTRE lien. Aide pro accessible. Follower reconnaissant.',

    'influencer.landing.value.winwin.title': '🎯 Vous créez du contenu utile. Vous aidez ET gagnez.',
    'influencer.landing.value.winwin.desc': 'Chaque follower aidé = problème résolu + tips gratuits + 5% économisés + 10$ gagnés pour vous. Tout le monde gagne.',
    'influencer.landing.value.winwin.tag': 'Contenu utile + Revenus récurrents',
  },
  en: {
    'influencer.landing.value.badge': '🤝 Win-Win',
    'influencer.landing.value.title': 'You provide REAL value',
    'influencer.landing.value.subtitle': 'You don\'t sell, you HELP. Your content guides your followers through their expat life.',
    'influencer.landing.value.solution': 'Your solution',

    'influencer.landing.value.problem1.title': 'Stuck in visa process',
    'influencer.landing.value.problem1.desc': 'Stressed follower: complicated visa, doesn\'t understand documents, risk of rejection.',
    'influencer.landing.value.problem1.solution': 'Your video explains basics + link to specialized lawyer for detailed help. Follower guided.',

    'influencer.landing.value.problem2.title': 'New expat lost',
    'influencer.landing.value.problem2.desc': 'Follower just arrived in new country, everything is blurry, doesn\'t know where to start.',
    'influencer.landing.value.problem2.solution': 'Your content reassures + gives practical tips. 24/7 help access + 5% discount. Follower reassured.',

    'influencer.landing.value.problem3.title': 'Administrative emergency',
    'influencer.landing.value.problem3.desc': 'Follower panics: check tomorrow, documents not ready, maximum stress.',
    'influencer.landing.value.problem3.solution': 'You share your experience. Community + experts accessible via your link. Emergency resolved.',

    'influencer.landing.value.problem4.title': 'Tight budget',
    'influencer.landing.value.problem4.desc': 'Follower needs legal help but classic firm = $500/hour (too expensive).',
    'influencer.landing.value.problem4.solution': 'Free tips in your videos + 5% discount via YOUR link. Pro help accessible. Grateful follower.',

    'influencer.landing.value.winwin.title': '🎯 You create useful content. You help AND earn.',
    'influencer.landing.value.winwin.desc': 'Each helped follower = problem solved + free tips + 5% saved + $10 earned for you. Everyone wins.',
    'influencer.landing.value.winwin.tag': 'Useful content + Recurring revenue',
  },
  es: {
    'influencer.landing.value.badge': '🤝 Ganar-Ganar',
    'influencer.landing.value.title': 'Aportas VALOR REAL',
    'influencer.landing.value.subtitle': 'No vendes, AYUDAS. Tu contenido guía a tus seguidores en su vida de expatriado.',
    'influencer.landing.value.solution': 'Tu solución',

    'influencer.landing.value.problem1.title': 'Atascado en trámites visa',
    'influencer.landing.value.problem1.desc': 'Seguidor estresado: visa complicada, no entiende documentos, riesgo de rechazo.',
    'influencer.landing.value.problem1.solution': 'Tu video explica lo básico + enlace a abogado especializado para ayuda detallada. Seguidor guiado.',

    'influencer.landing.value.problem2.title': 'Nuevo expatriado perdido',
    'influencer.landing.value.problem2.desc': 'Seguidor acaba de llegar a nuevo país, todo es borroso, no sabe por dónde empezar.',
    'influencer.landing.value.problem2.solution': 'Tu contenido tranquiliza + da consejos prácticos. Acceso ayuda 24/7 + 5% descuento. Seguidor tranquilo.',

    'influencer.landing.value.problem3.title': 'Emergencia administrativa',
    'influencer.landing.value.problem3.desc': 'Seguidor en pánico: control mañana, documentos no listos, estrés máximo.',
    'influencer.landing.value.problem3.solution': 'Compartes tu experiencia. Comunidad + expertos accesibles vía tu enlace. Emergencia resuelta.',

    'influencer.landing.value.problem4.title': 'Presupuesto ajustado',
    'influencer.landing.value.problem4.desc': 'Seguidor necesita ayuda legal pero bufete clásico = 500$/hora (muy caro).',
    'influencer.landing.value.problem4.solution': 'Consejos gratis en tus videos + 5% descuento vía TU enlace. Ayuda profesional accesible. Seguidor agradecido.',

    'influencer.landing.value.winwin.title': '🎯 Creas contenido útil. Ayudas Y ganas.',
    'influencer.landing.value.winwin.desc': 'Cada seguidor ayudado = problema resuelto + consejos gratis + 5% ahorrados + 10$ ganados para ti. Todos ganan.',
    'influencer.landing.value.winwin.tag': 'Contenido útil + Ingresos recurrentes',
  },
  de: {
    'influencer.landing.value.badge': '🤝 Win-Win',
    'influencer.landing.value.title': 'Sie bieten ECHTEN Mehrwert',
    'influencer.landing.value.subtitle': 'Sie verkaufen nicht, Sie HELFEN. Ihr Content führt Ihre Follower durch ihr Expat-Leben.',
    'influencer.landing.value.solution': 'Ihre Lösung',

    'influencer.landing.value.problem1.title': 'Fest im Visum-Prozess',
    'influencer.landing.value.problem1.desc': 'Gestresster Follower: kompliziertes Visum, versteht Dokumente nicht, Ablehnungsrisiko.',
    'influencer.landing.value.problem1.solution': 'Ihr Video erklärt Grundlagen + Link zu spezialisiertem Anwalt für detaillierte Hilfe. Follower geführt.',

    'influencer.landing.value.problem2.title': 'Neuer Expat verloren',
    'influencer.landing.value.problem2.desc': 'Follower gerade in neuem Land angekommen, alles ist unklar, weiß nicht wo anfangen.',
    'influencer.landing.value.problem2.solution': 'Ihr Content beruhigt + gibt praktische Tipps. 24/7 Hilfe-Zugang + 5% Rabatt. Follower beruhigt.',

    'influencer.landing.value.problem3.title': 'Administrativer Notfall',
    'influencer.landing.value.problem3.desc': 'Follower in Panik: Kontrolle morgen, Dokumente nicht bereit, maximaler Stress.',
    'influencer.landing.value.problem3.solution': 'Sie teilen Ihre Erfahrung. Community + Experten zugänglich via Ihr Link. Notfall gelöst.',

    'influencer.landing.value.problem4.title': 'Knappes Budget',
    'influencer.landing.value.problem4.desc': 'Follower braucht Rechtshilfe aber klassische Kanzlei = 500$/Stunde (zu teuer).',
    'influencer.landing.value.problem4.solution': 'Kostenlose Tipps in Ihren Videos + 5% Rabatt via IHR Link. Professionelle Hilfe zugänglich. Dankbarer Follower.',

    'influencer.landing.value.winwin.title': '🎯 Sie erstellen nützlichen Content. Sie helfen UND verdienen.',
    'influencer.landing.value.winwin.desc': 'Jeder geholfen Follower = Problem gelöst + kostenlose Tipps + 5% gespart + 10$ für Sie verdient. Alle gewinnen.',
    'influencer.landing.value.winwin.tag': 'Nützlicher Content + Wiederkehrende Einnahmen',
  },
  pt: {
    'influencer.landing.value.badge': '🤝 Ganha-Ganha',
    'influencer.landing.value.title': 'Você fornece valor REAL',
    'influencer.landing.value.subtitle': 'Você não vende, AJUDA. Seu conteúdo guia seus seguidores na vida de expatriado.',
    'influencer.landing.value.solution': 'Sua solução',

    'influencer.landing.value.problem1.title': 'Preso em processo de visto',
    'influencer.landing.value.problem1.desc': 'Seguidor estressado: visto complicado, não entende documentos, risco de rejeição.',
    'influencer.landing.value.problem1.solution': 'Seu vídeo explica o básico + link para advogado especializado para ajuda detalhada. Seguidor guiado.',

    'influencer.landing.value.problem2.title': 'Novo expatriado perdido',
    'influencer.landing.value.problem2.desc': 'Seguidor acabou de chegar em novo país, tudo é confuso, não sabe por onde começar.',
    'influencer.landing.value.problem2.solution': 'Seu conteúdo tranquiliza + dá dicas práticas. Acesso ajuda 24/7 + 5% desconto. Seguidor tranquilo.',

    'influencer.landing.value.problem3.title': 'Emergência administrativa',
    'influencer.landing.value.problem3.desc': 'Seguidor em pânico: controle amanhã, documentos não prontos, estresse máximo.',
    'influencer.landing.value.problem3.solution': 'Você compartilha sua experiência. Comunidade + especialistas acessíveis via seu link. Emergência resolvida.',

    'influencer.landing.value.problem4.title': 'Orçamento apertado',
    'influencer.landing.value.problem4.desc': 'Seguidor precisa ajuda jurídica mas escritório clássico = 500$/hora (muito caro).',
    'influencer.landing.value.problem4.solution': 'Dicas grátis em seus vídeos + 5% desconto via SEU link. Ajuda profissional acessível. Seguidor grato.',

    'influencer.landing.value.winwin.title': '🎯 Você cria conteúdo útil. Você ajuda E ganha.',
    'influencer.landing.value.winwin.desc': 'Cada seguidor ajudado = problema resolvido + dicas grátis + 5% economizados + 10$ ganhos para você. Todos ganham.',
    'influencer.landing.value.winwin.tag': 'Conteúdo útil + Receita recorrente',
  },
  ru: {
    'influencer.landing.value.badge': '🤝 Взаимная выгода',
    'influencer.landing.value.title': 'Вы даете РЕАЛЬНУЮ ценность',
    'influencer.landing.value.subtitle': 'Вы не продаете, вы ПОМОГАЕТЕ. Ваш контент ведет ваших подписчиков через их жизнь экспата.',
    'influencer.landing.value.solution': 'Ваше решение',

    'influencer.landing.value.problem1.title': 'Застрял в визовом процессе',
    'influencer.landing.value.problem1.desc': 'Напряженный подписчик: сложная виза, не понимает документы, риск отказа.',
    'influencer.landing.value.problem1.solution': 'Ваше видео объясняет основы + ссылка на специализированного юриста для подробной помощи. Подписчик направлен.',

    'influencer.landing.value.problem2.title': 'Новый экспат потерян',
    'influencer.landing.value.problem2.desc': 'Подписчик только что прибыл в новую страну, все неясно, не знает с чего начать.',
    'influencer.landing.value.problem2.solution': 'Ваш контент успокаивает + дает практические советы. Доступ к помощи 24/7 + скидка 5%. Подписчик успокоен.',

    'influencer.landing.value.problem3.title': 'Административная срочность',
    'influencer.landing.value.problem3.desc': 'Подписчик в панике: проверка завтра, документы не готовы, максимальный стресс.',
    'influencer.landing.value.problem3.solution': 'Вы делитесь своим опытом. Сообщество + эксперты доступны через вашу ссылку. Срочность решена.',

    'influencer.landing.value.problem4.title': 'Ограниченный бюджет',
    'influencer.landing.value.problem4.desc': 'Подписчику нужна юридическая помощь, но классическая фирма = 500$/час (слишком дорого).',
    'influencer.landing.value.problem4.solution': 'Бесплатные советы в ваших видео + скидка 5% через ВАШУ ссылку. Профессиональная помощь доступна. Благодарный подписчик.',

    'influencer.landing.value.winwin.title': '🎯 Вы создаете полезный контент. Вы помогаете И зарабатываете.',
    'influencer.landing.value.winwin.desc': 'Каждый помощь подписчику = проблема решена + бесплатные советы + 5% сэкономлено + 10$ заработано для вас. Все выигрывают.',
    'influencer.landing.value.winwin.tag': 'Полезный контент + Регулярный доход',
  },
  ch: {
    'influencer.landing.value.badge': '🤝 双赢',
    'influencer.landing.value.title': '您提供真正的价值',
    'influencer.landing.value.subtitle': '您不是在销售，而是在帮助。您的内容引导您的粉丝度过外派生活。',
    'influencer.landing.value.solution': '您的解决方案',

    'influencer.landing.value.problem1.title': '卡在签证流程中',
    'influencer.landing.value.problem1.desc': '压力大的粉丝：复杂的签证，不理解文件，拒绝风险。',
    'influencer.landing.value.problem1.solution': '您的视频解释基础知识+链接专业律师获得详细帮助。粉丝得到指导。',

    'influencer.landing.value.problem2.title': '新外派人员迷失',
    'influencer.landing.value.problem2.desc': '粉丝刚到新国家，一切都很模糊，不知从何开始。',
    'influencer.landing.value.problem2.solution': '您的内容安抚+给出实用技巧。24/7帮助访问+5%折扣。粉丝安心。',

    'influencer.landing.value.problem3.title': '行政紧急情况',
    'influencer.landing.value.problem3.desc': '粉丝恐慌：明天检查，文件未准备好，极度压力。',
    'influencer.landing.value.problem3.solution': '您分享您的经验。社区+专家通过您的链接可访问。紧急情况解决。',

    'influencer.landing.value.problem4.title': '预算紧张',
    'influencer.landing.value.problem4.desc': '粉丝需要法律帮助但经典律所=500美元/小时（太贵）。',
    'influencer.landing.value.problem4.solution': '您视频中的免费技巧+通过您的链接5%折扣。专业帮助触手可及。感激的粉丝。',

    'influencer.landing.value.winwin.title': '🎯 您创建有用的内容。您帮助并赚钱。',
    'influencer.landing.value.winwin.desc': '每个得到帮助的粉丝=问题解决+免费技巧+节省5%+为您赚取10美元。每个人都赢了。',
    'influencer.landing.value.winwin.tag': '有用的内容+经常性收入',
  },
  hi: {
    'influencer.landing.value.badge': '🤝 विन-विन',
    'influencer.landing.value.title': 'आप असली मूल्य प्रदान करते हैं',
    'influencer.landing.value.subtitle': 'आप बेचते नहीं हैं, आप मदद करते हैं। आपकी सामग्री आपके अनुयायियों को उनके प्रवासी जीवन में मार्गदर्शन करती है।',
    'influencer.landing.value.solution': 'आपका समाधान',

    'influencer.landing.value.problem1.title': 'वीजा प्रक्रिया में फंसे',
    'influencer.landing.value.problem1.desc': 'तनावग्रस्त अनुयायी: जटिल वीजा, दस्तावेज नहीं समझता, अस्वीकृति का जोखिम।',
    'influencer.landing.value.problem1.solution': 'आपका वीडियो बुनियादी बातें समझाता है + विस्तृत मदद के लिए विशेष वकील का लिंक। अनुयायी मार्गदर्शित।',

    'influencer.landing.value.problem2.title': 'नया प्रवासी खोया',
    'influencer.landing.value.problem2.desc': 'अनुयायी अभी नए देश में पहुंचा, सब कुछ धुंधला है, कहां से शुरू करें पता नहीं।',
    'influencer.landing.value.problem2.solution': 'आपकी सामग्री आश्वस्त करती है + व्यावहारिक सुझाव देती है। 24/7 मदद पहुंच + 5% छूट। अनुयायी आश्वस्त।',

    'influencer.landing.value.problem3.title': 'प्रशासनिक आपातकाल',
    'influencer.landing.value.problem3.desc': 'अनुयायी घबराया: कल जांच, दस्तावेज तैयार नहीं, अधिकतम तनाव।',
    'influencer.landing.value.problem3.solution': 'आप अपना अनुभव साझा करते हैं। समुदाय + विशेषज्ञ आपके लिंक के माध्यम से सुलभ। आपातकाल हल।',

    'influencer.landing.value.problem4.title': 'बजट तंग',
    'influencer.landing.value.problem4.desc': 'अनुयायी को कानूनी सहायता चाहिए लेकिन क्लासिक फर्म = 500$/घंटा (बहुत महंगा)।',
    'influencer.landing.value.problem4.solution': 'आपके वीडियो में मुफ्त सुझाव + आपके लिंक के माध्यम से 5% छूट। पेशेवर मदद सुलभ। आभारी अनुयायी।',

    'influencer.landing.value.winwin.title': '🎯 आप उपयोगी सामग्री बनाते हैं। आप मदद करते हैं और कमाते हैं।',
    'influencer.landing.value.winwin.desc': 'प्रत्येक सहायता प्राप्त अनुयायी = समस्या हल + मुफ्त सुझाव + 5% बचत + आपके लिए 10$ कमाई। सभी जीतते हैं।',
    'influencer.landing.value.winwin.tag': 'उपयोगी सामग्री + आवर्ती राजस्व',
  },
  ar: {
    'influencer.landing.value.badge': '🤝 الفوز للجميع',
    'influencer.landing.value.title': 'أنت تقدم قيمة حقيقية',
    'influencer.landing.value.subtitle': 'أنت لا تبيع، أنت تساعد. محتواك يوجه متابعيك خلال حياتهم كمغتربين.',
    'influencer.landing.value.solution': 'حلك',

    'influencer.landing.value.problem1.title': 'عالق في عملية التأشيرة',
    'influencer.landing.value.problem1.desc': 'متابع متوتر: تأشيرة معقدة، لا يفهم المستندات، خطر الرفض.',
    'influencer.landing.value.problem1.solution': 'فيديوك يشرح الأساسيات + رابط لمحامي متخصص للحصول على مساعدة مفصلة. متابع موجه.',

    'influencer.landing.value.problem2.title': 'مغترب جديد تائه',
    'influencer.landing.value.problem2.desc': 'متابع وصل للتو إلى بلد جديد، كل شيء غامض، لا يعرف من أين يبدأ.',
    'influencer.landing.value.problem2.solution': 'محتواك يطمئن + يعطي نصائح عملية. الوصول للمساعدة 24/7 + خصم 5%. متابع مطمئن.',

    'influencer.landing.value.problem3.title': 'طارئ إداري',
    'influencer.landing.value.problem3.desc': 'متابع في حالة ذعر: فحص غدا، المستندات غير جاهزة، ضغط أقصى.',
    'influencer.landing.value.problem3.solution': 'تشارك تجربتك. المجتمع + الخبراء متاحون عبر رابطك. الطارئ محلول.',

    'influencer.landing.value.problem4.title': 'ميزانية ضيقة',
    'influencer.landing.value.problem4.desc': 'متابع يحتاج مساعدة قانونية لكن مكتب كلاسيكي = 500$/ساعة (غالي جدا).',
    'influencer.landing.value.problem4.solution': 'نصائح مجانية في فيديوهاتك + خصم 5% عبر رابطك. مساعدة محترفة متاحة. متابع ممتن.',

    'influencer.landing.value.winwin.title': '🎯 أنت تنشئ محتوى مفيد. أنت تساعد وتكسب.',
    'influencer.landing.value.winwin.desc': 'كل متابع تمت مساعدته = مشكلة محلولة + نصائح مجانية + 5% موفرة + 10$ مكتسبة لك. الجميع يفوز.',
    'influencer.landing.value.winwin.tag': 'محتوى مفيد + دخل متكرر',
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

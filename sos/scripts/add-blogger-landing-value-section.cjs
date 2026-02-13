/**
 * Add Blogger Landing VALUE Section Translations
 * Montre que le blogger apporte de la VRAIE valeur à ses lecteurs
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'blogger.landing.value.badge': '🤝 Gagnant-Gagnant',
    'blogger.landing.value.title': 'Vous apportez de la VRAIE valeur',
    'blogger.landing.value.subtitle': 'Vous ne vendez pas, vous AIDEZ. Vos articles guident les expats dans leurs galères quotidiennes.',
    'blogger.landing.value.solution': 'Votre solution',

    'blogger.landing.value.problem1.title': 'Perdu dans les démarches',
    'blogger.landing.value.problem1.desc': 'Nouveau expat, ne sait pas par où commencer : visa, logement, banque, sécu...',
    'blogger.landing.value.problem1.solution': 'Votre article explique chaque étape en détail. Checklist complète + lien vers expert si besoin. Lecteur guidé.',

    'blogger.landing.value.problem2.title': 'Panique visa refusé',
    'blogger.landing.value.problem2.desc': 'Lecteur stressé : son visa a été refusé, ne sait pas quoi faire, risque d\'expulsion.',
    'blogger.landing.value.problem2.solution': 'Votre article rassure + donne solutions. Lien vers avocat spécialisé. Aide accessible. Problème résolu.',

    'blogger.landing.value.problem3.title': 'Seul dans nouveau pays',
    'blogger.landing.value.problem3.desc': 'Expatrié isolé, besoin de conseils mais personne à qui parler, tout est nouveau.',
    'blogger.landing.value.problem3.solution': 'Votre blog = communauté bienveillante. Conseils pratiques + aide 24/7 via votre lien. Plus seul.',

    'blogger.landing.value.problem4.title': 'Budget trop serré',
    'blogger.landing.value.problem4.desc': 'Besoin d\'aide pro mais cabinet d\'avocats trop cher (500$/heure = impossible).',
    'blogger.landing.value.problem4.solution': 'Articles gratuits + réduction 5$ via VOTRE lien. Aide pro accessible. Lecteur reconnaissant.',

    'blogger.landing.value.winwin.title': '🎯 Vous créez du contenu utile. Vous aidez ET gagnez.',
    'blogger.landing.value.winwin.desc': 'Chaque lecteur aidé = problème résolu + infos gratuites + 5$ économisés + 10$ gagnés pour vous. Tout le monde gagne.',
    'blogger.landing.value.winwin.tag': 'Contenu utile + Revenus passifs',
  },
  en: {
    'blogger.landing.value.badge': '🤝 Win-Win',
    'blogger.landing.value.title': 'You provide REAL value',
    'blogger.landing.value.subtitle': 'You don\'t sell, you HELP. Your articles guide expats through their daily struggles.',
    'blogger.landing.value.solution': 'Your solution',

    'blogger.landing.value.problem1.title': 'Lost in procedures',
    'blogger.landing.value.problem1.desc': 'New expat, doesn\'t know where to start: visa, housing, bank, insurance...',
    'blogger.landing.value.problem1.solution': 'Your article explains each step in detail. Complete checklist + link to expert if needed. Reader guided.',

    'blogger.landing.value.problem2.title': 'Visa denied panic',
    'blogger.landing.value.problem2.desc': 'Stressed reader: their visa was denied, doesn\'t know what to do, risk of deportation.',
    'blogger.landing.value.problem2.solution': 'Your article reassures + gives solutions. Link to specialized lawyer. Accessible help. Problem solved.',

    'blogger.landing.value.problem3.title': 'Alone in new country',
    'blogger.landing.value.problem3.desc': 'Isolated expat, needs advice but no one to talk to, everything is new.',
    'blogger.landing.value.problem3.solution': 'Your blog = caring community. Practical tips + 24/7 help via your link. Not alone anymore.',

    'blogger.landing.value.problem4.title': 'Budget too tight',
    'blogger.landing.value.problem4.desc': 'Needs pro help but law firm too expensive ($500/hour = impossible).',
    'blogger.landing.value.problem4.solution': 'Free articles + $5 discount via YOUR link. Pro help accessible. Grateful reader.',

    'blogger.landing.value.winwin.title': '🎯 You create useful content. You help AND earn.',
    'blogger.landing.value.winwin.desc': 'Each helped reader = problem solved + free info + $5 saved + $10 earned for you. Everyone wins.',
    'blogger.landing.value.winwin.tag': 'Useful content + Passive income',
  },
  es: {
    'blogger.landing.value.badge': '🤝 Ganar-Ganar',
    'blogger.landing.value.title': 'Aportas VALOR REAL',
    'blogger.landing.value.subtitle': 'No vendes, AYUDAS. Tus artículos guían a los expatriados en sus problemas diarios.',
    'blogger.landing.value.solution': 'Tu solución',

    'blogger.landing.value.problem1.title': 'Perdido en trámites',
    'blogger.landing.value.problem1.desc': 'Nuevo expatriado, no sabe por dónde empezar: visa, vivienda, banco, seguro...',
    'blogger.landing.value.problem1.solution': 'Tu artículo explica cada paso en detalle. Lista completa + enlace a experto si necesita. Lector guiado.',

    'blogger.landing.value.problem2.title': 'Pánico visa denegada',
    'blogger.landing.value.problem2.desc': 'Lector estresado: su visa fue denegada, no sabe qué hacer, riesgo de deportación.',
    'blogger.landing.value.problem2.solution': 'Tu artículo tranquiliza + da soluciones. Enlace a abogado especializado. Ayuda accesible. Problema resuelto.',

    'blogger.landing.value.problem3.title': 'Solo en nuevo país',
    'blogger.landing.value.problem3.desc': 'Expatriado aislado, necesita consejos pero nadie con quien hablar, todo es nuevo.',
    'blogger.landing.value.problem3.solution': 'Tu blog = comunidad solidaria. Consejos prácticos + ayuda 24/7 vía tu enlace. Ya no está solo.',

    'blogger.landing.value.problem4.title': 'Presupuesto muy ajustado',
    'blogger.landing.value.problem4.desc': 'Necesita ayuda profesional pero bufete demasiado caro (500$/hora = imposible).',
    'blogger.landing.value.problem4.solution': 'Artículos gratis + 5$ descuento vía TU enlace. Ayuda profesional accesible. Lector agradecido.',

    'blogger.landing.value.winwin.title': '🎯 Creas contenido útil. Ayudas Y ganas.',
    'blogger.landing.value.winwin.desc': 'Cada lector ayudado = problema resuelto + info gratis + 5$ ahorrados + 10$ ganados para ti. Todos ganan.',
    'blogger.landing.value.winwin.tag': 'Contenido útil + Ingresos pasivos',
  },
  de: {
    'blogger.landing.value.badge': '🤝 Win-Win',
    'blogger.landing.value.title': 'Sie bieten ECHTEN Mehrwert',
    'blogger.landing.value.subtitle': 'Sie verkaufen nicht, Sie HELFEN. Ihre Artikel führen Expats durch ihre täglichen Herausforderungen.',
    'blogger.landing.value.solution': 'Ihre Lösung',

    'blogger.landing.value.problem1.title': 'Verloren in Verfahren',
    'blogger.landing.value.problem1.desc': 'Neuer Expat, weiß nicht wo anfangen: Visum, Wohnung, Bank, Versicherung...',
    'blogger.landing.value.problem1.solution': 'Ihr Artikel erklärt jeden Schritt im Detail. Vollständige Checkliste + Link zu Experte bei Bedarf. Leser geführt.',

    'blogger.landing.value.problem2.title': 'Visum abgelehnt Panik',
    'blogger.landing.value.problem2.desc': 'Gestresster Leser: Visum wurde abgelehnt, weiß nicht was tun, Abschiebungsrisiko.',
    'blogger.landing.value.problem2.solution': 'Ihr Artikel beruhigt + gibt Lösungen. Link zu spezialisiertem Anwalt. Zugängliche Hilfe. Problem gelöst.',

    'blogger.landing.value.problem3.title': 'Allein in neuem Land',
    'blogger.landing.value.problem3.desc': 'Isolierter Expat, braucht Rat aber niemand zum Reden, alles ist neu.',
    'blogger.landing.value.problem3.solution': 'Ihr Blog = fürsorgliche Community. Praktische Tipps + 24/7 Hilfe via Ihr Link. Nicht mehr allein.',

    'blogger.landing.value.problem4.title': 'Budget zu knapp',
    'blogger.landing.value.problem4.desc': 'Braucht professionelle Hilfe aber Kanzlei zu teuer (500$/Stunde = unmöglich).',
    'blogger.landing.value.problem4.solution': 'Kostenlose Artikel + 5$ Rabatt via IHR Link. Professionelle Hilfe zugänglich. Dankbarer Leser.',

    'blogger.landing.value.winwin.title': '🎯 Sie erstellen nützliche Inhalte. Sie helfen UND verdienen.',
    'blogger.landing.value.winwin.desc': 'Jeder geholfen Leser = Problem gelöst + kostenlose Infos + 5$ gespart + 10$ für Sie verdient. Alle gewinnen.',
    'blogger.landing.value.winwin.tag': 'Nützlicher Inhalt + Passives Einkommen',
  },
  pt: {
    'blogger.landing.value.badge': '🤝 Ganha-Ganha',
    'blogger.landing.value.title': 'Você fornece valor REAL',
    'blogger.landing.value.subtitle': 'Você não vende, AJUDA. Seus artigos guiam expatriados em seus problemas diários.',
    'blogger.landing.value.solution': 'Sua solução',

    'blogger.landing.value.problem1.title': 'Perdido em procedimentos',
    'blogger.landing.value.problem1.desc': 'Novo expatriado, não sabe por onde começar: visto, moradia, banco, seguro...',
    'blogger.landing.value.problem1.solution': 'Seu artigo explica cada passo em detalhe. Checklist completa + link para especialista se precisar. Leitor guiado.',

    'blogger.landing.value.problem2.title': 'Pânico visto negado',
    'blogger.landing.value.problem2.desc': 'Leitor estressado: seu visto foi negado, não sabe o que fazer, risco de deportação.',
    'blogger.landing.value.problem2.solution': 'Seu artigo tranquiliza + dá soluções. Link para advogado especializado. Ajuda acessível. Problema resolvido.',

    'blogger.landing.value.problem3.title': 'Sozinho em novo país',
    'blogger.landing.value.problem3.desc': 'Expatriado isolado, precisa de conselhos mas ninguém para conversar, tudo é novo.',
    'blogger.landing.value.problem3.solution': 'Seu blog = comunidade acolhedora. Dicas práticas + ajuda 24/7 via seu link. Não mais sozinho.',

    'blogger.landing.value.problem4.title': 'Orçamento muito apertado',
    'blogger.landing.value.problem4.desc': 'Precisa de ajuda profissional mas escritório muito caro (500$/hora = impossível).',
    'blogger.landing.value.problem4.solution': 'Artigos grátis + 5$ desconto via SEU link. Ajuda profissional acessível. Leitor grato.',

    'blogger.landing.value.winwin.title': '🎯 Você cria conteúdo útil. Você ajuda E ganha.',
    'blogger.landing.value.winwin.desc': 'Cada leitor ajudado = problema resolvido + info grátis + 5$ economizados + 10$ ganhos para você. Todos ganham.',
    'blogger.landing.value.winwin.tag': 'Conteúdo útil + Renda passiva',
  },
  ru: {
    'blogger.landing.value.badge': '🤝 Взаимная выгода',
    'blogger.landing.value.title': 'Вы даете РЕАЛЬНУЮ ценность',
    'blogger.landing.value.subtitle': 'Вы не продаете, вы ПОМОГАЕТЕ. Ваши статьи ведут экспатов через их повседневные трудности.',
    'blogger.landing.value.solution': 'Ваше решение',

    'blogger.landing.value.problem1.title': 'Потерян в процедурах',
    'blogger.landing.value.problem1.desc': 'Новый экспат, не знает с чего начать: виза, жилье, банк, страховка...',
    'blogger.landing.value.problem1.solution': 'Ваша статья объясняет каждый шаг подробно. Полный чеклист + ссылка на эксперта при необходимости. Читатель направлен.',

    'blogger.landing.value.problem2.title': 'Паника отказа визы',
    'blogger.landing.value.problem2.desc': 'Напряженный читатель: его виза отклонена, не знает что делать, риск депортации.',
    'blogger.landing.value.problem2.solution': 'Ваша статья успокаивает + дает решения. Ссылка на специализированного юриста. Доступная помощь. Проблема решена.',

    'blogger.landing.value.problem3.title': 'Одинок в новой стране',
    'blogger.landing.value.problem3.desc': 'Изолированный экспат, нужен совет но не с кем поговорить, все новое.',
    'blogger.landing.value.problem3.solution': 'Ваш блог = заботливое сообщество. Практические советы + помощь 24/7 через вашу ссылку. Больше не один.',

    'blogger.landing.value.problem4.title': 'Бюджет слишком мал',
    'blogger.landing.value.problem4.desc': 'Нужна профессиональная помощь но юридическая фирма слишком дорога (500$/час = невозможно).',
    'blogger.landing.value.problem4.solution': 'Бесплатные статьи + скидка 5$ через ВАШУ ссылку. Профессиональная помощь доступна. Благодарный читатель.',

    'blogger.landing.value.winwin.title': '🎯 Вы создаете полезный контент. Вы помогаете И зарабатываете.',
    'blogger.landing.value.winwin.desc': 'Каждый помощь читателю = проблема решена + бесплатная информация + 5$ сэкономлено + 10$ заработано для вас. Все выигрывают.',
    'blogger.landing.value.winwin.tag': 'Полезный контент + Пассивный доход',
  },
  ch: {
    'blogger.landing.value.badge': '🤝 双赢',
    'blogger.landing.value.title': '您提供真正的价值',
    'blogger.landing.value.subtitle': '您不是在销售，而是在帮助。您的文章引导外派人员度过日常困难。',
    'blogger.landing.value.solution': '您的解决方案',

    'blogger.landing.value.problem1.title': '在程序中迷失',
    'blogger.landing.value.problem1.desc': '新外派人员，不知从何开始：签证、住房、银行、保险...',
    'blogger.landing.value.problem1.solution': '您的文章详细解释每个步骤。完整清单+如需可链接专家。读者得到指导。',

    'blogger.landing.value.problem2.title': '签证被拒恐慌',
    'blogger.landing.value.problem2.desc': '压力读者：签证被拒，不知道该怎么办，有驱逐风险。',
    'blogger.landing.value.problem2.solution': '您的文章安抚+给出解决方案。链接专业律师。可获得帮助。问题解决。',

    'blogger.landing.value.problem3.title': '在新国家独自一人',
    'blogger.landing.value.problem3.desc': '孤立的外派人员，需要建议但无人交谈，一切都是新的。',
    'blogger.landing.value.problem3.solution': '您的博客=关怀社区。实用建议+通过您的链接24/7帮助。不再孤单。',

    'blogger.landing.value.problem4.title': '预算太紧',
    'blogger.landing.value.problem4.desc': '需要专业帮助但律师事务所太贵（500美元/小时=不可能）。',
    'blogger.landing.value.problem4.solution': '免费文章+通过您的链接5美元折扣。专业帮助触手可及。感激的读者。',

    'blogger.landing.value.winwin.title': '🎯 您创建有用的内容。您帮助并赚钱。',
    'blogger.landing.value.winwin.desc': '每个得到帮助的读者=问题解决+免费信息+节省5美元+为您赚取10美元。每个人都赢了。',
    'blogger.landing.value.winwin.tag': '有用的内容+被动收入',
  },
  hi: {
    'blogger.landing.value.badge': '🤝 विन-विन',
    'blogger.landing.value.title': 'आप असली मूल्य प्रदान करते हैं',
    'blogger.landing.value.subtitle': 'आप बेचते नहीं हैं, आप मदद करते हैं। आपके लेख प्रवासियों को उनकी दैनिक समस्याओं में मार्गदर्शन करते हैं।',
    'blogger.landing.value.solution': 'आपका समाधान',

    'blogger.landing.value.problem1.title': 'प्रक्रियाओं में खोया',
    'blogger.landing.value.problem1.desc': 'नया प्रवासी, कहां से शुरू करें पता नहीं: वीजा, आवास, बैंक, बीमा...',
    'blogger.landing.value.problem1.solution': 'आपका लेख विस्तार से प्रत्येक चरण समझाता है। पूर्ण चेकलिस्ट + यदि आवश्यक हो तो विशेषज्ञ का लिंक। पाठक मार्गदर्शित।',

    'blogger.landing.value.problem2.title': 'वीजा अस्वीकृत घबराहट',
    'blogger.landing.value.problem2.desc': 'तनावग्रस्त पाठक: उनका वीजा अस्वीकृत हो गया, क्या करें पता नहीं, निर्वासन का जोखिम।',
    'blogger.landing.value.problem2.solution': 'आपका लेख आश्वस्त करता है + समाधान देता है। विशेष वकील का लिंक। सुलभ सहायता। समस्या हल।',

    'blogger.landing.value.problem3.title': 'नए देश में अकेला',
    'blogger.landing.value.problem3.desc': 'अलग-थलग प्रवासी, सलाह चाहिए लेकिन बात करने के लिए कोई नहीं, सब कुछ नया है।',
    'blogger.landing.value.problem3.solution': 'आपका ब्लॉग = देखभाल करने वाला समुदाय। व्यावहारिक सुझाव + आपके लिंक के माध्यम से 24/7 सहायता। अब अकेला नहीं।',

    'blogger.landing.value.problem4.title': 'बजट बहुत तंग',
    'blogger.landing.value.problem4.desc': 'पेशेवर सहायता चाहिए लेकिन कानूनी फर्म बहुत महंगी (500$/घंटा = असंभव)।',
    'blogger.landing.value.problem4.solution': 'मुफ्त लेख + आपके लिंक के माध्यम से 5$ छूट। पेशेवर सहायता सुलभ। आभारी पाठक।',

    'blogger.landing.value.winwin.title': '🎯 आप उपयोगी सामग्री बनाते हैं। आप मदद करते हैं और कमाते हैं।',
    'blogger.landing.value.winwin.desc': 'प्रत्येक सहायता प्राप्त पाठक = समस्या हल + मुफ्त जानकारी + 5$ बचत + आपके लिए 10$ कमाई। सभी जीतते हैं।',
    'blogger.landing.value.winwin.tag': 'उपयोगी सामग्री + निष्क्रिय आय',
  },
  ar: {
    'blogger.landing.value.badge': '🤝 الفوز للجميع',
    'blogger.landing.value.title': 'أنت تقدم قيمة حقيقية',
    'blogger.landing.value.subtitle': 'أنت لا تبيع، أنت تساعد. مقالاتك توجه المغتربين خلال صراعاتهم اليومية.',
    'blogger.landing.value.solution': 'حلك',

    'blogger.landing.value.problem1.title': 'تائه في الإجراءات',
    'blogger.landing.value.problem1.desc': 'مغترب جديد، لا يعرف من أين يبدأ: التأشيرة، السكن، البنك، التأمين...',
    'blogger.landing.value.problem1.solution': 'مقالك يشرح كل خطوة بالتفصيل. قائمة مراجعة كاملة + رابط للخبير إذا لزم الأمر. قارئ موجه.',

    'blogger.landing.value.problem2.title': 'ذعر رفض التأشيرة',
    'blogger.landing.value.problem2.desc': 'قارئ متوتر: تأشيرته رفضت، لا يعرف ماذا يفعل، خطر الترحيل.',
    'blogger.landing.value.problem2.solution': 'مقالك يطمئن + يعطي حلول. رابط لمحامي متخصص. مساعدة متاحة. مشكلة محلولة.',

    'blogger.landing.value.problem3.title': 'وحيد في بلد جديد',
    'blogger.landing.value.problem3.desc': 'مغترب معزول، يحتاج نصيحة لكن لا أحد للتحدث معه، كل شيء جديد.',
    'blogger.landing.value.problem3.solution': 'مدونتك = مجتمع يهتم. نصائح عملية + مساعدة 24/7 عبر رابطك. لم يعد وحيدا.',

    'blogger.landing.value.problem4.title': 'الميزانية ضيقة جدا',
    'blogger.landing.value.problem4.desc': 'يحتاج مساعدة محترفة لكن مكتب المحاماة غالي جدا (500$/ساعة = مستحيل).',
    'blogger.landing.value.problem4.solution': 'مقالات مجانية + خصم 5$ عبر رابطك. مساعدة محترفة متاحة. قارئ ممتن.',

    'blogger.landing.value.winwin.title': '🎯 أنت تنشئ محتوى مفيد. أنت تساعد وتكسب.',
    'blogger.landing.value.winwin.desc': 'كل قارئ تمت مساعدته = مشكلة محلولة + معلومات مجانية + 5$ موفرة + 10$ مكتسبة لك. الجميع يفوز.',
    'blogger.landing.value.winwin.tag': 'محتوى مفيد + دخل سلبي',
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

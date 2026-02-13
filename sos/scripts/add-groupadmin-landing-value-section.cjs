/**
 * Add GroupAdmin Landing VALUE Section
 * Montre qu'il apporte de la valeur réelle à sa communauté
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'groupAdmin.landing.value.badge': 'Gagnant-Gagnant',
    'groupAdmin.landing.value.title': 'Vous apportez de la VRAIE valeur',
    'groupAdmin.landing.value.subtitle': 'Vous ne vendez pas, vous AIDEZ. Vos membres obtiennent une aide concrète pour leurs problèmes d\'expat.',
    'groupAdmin.landing.value.solution': 'Votre solution',

    'groupAdmin.landing.value.problem1.title': 'Visa refusé, expulsion proche',
    'groupAdmin.landing.value.problem1.desc': 'Un membre panique : son visa a été refusé, il risque l\'expulsion dans 15 jours.',
    'groupAdmin.landing.value.problem1.solution': 'Appel immédiat avec un avocat spécialisé immigration. Conseils concrets + plan d\'action. Membre sauvé.',

    'groupAdmin.landing.value.problem2.title': 'Perdu dans les démarches',
    'groupAdmin.landing.value.problem2.desc': 'Nouvelle arrivée, ne parle pas la langue, ne comprend rien aux formulaires administratifs.',
    'groupAdmin.landing.value.problem2.solution': 'Expat helper bilingue explique étape par étape. Formulaires remplis correctement. Stress disparu.',

    'groupAdmin.landing.value.problem3.title': 'Urgence en pleine nuit',
    'groupAdmin.landing.value.problem3.desc': '22h, famille en détresse : contrôle police demain matin, documents pas prêts.',
    'groupAdmin.landing.value.problem3.solution': 'Aide 24/7 disponible. Expert appelle en 5 min, guide la préparation. Contrôle passé sans problème.',

    'groupAdmin.landing.value.problem4.title': 'Budget trop serré',
    'groupAdmin.landing.value.problem4.desc': 'Besoin d\'aide légale mais peut pas se payer un cabinet d\'avocats à 500$/heure.',
    'groupAdmin.landing.value.problem4.solution': 'Avec VOTRE lien = 5$ de réduction. Aide pro accessible. Membre reconnaissant.',

    'groupAdmin.landing.value.winwin.title': 'Vous ne vendez pas. Vous AIDEZ et gagnez.',
    'groupAdmin.landing.value.winwin.desc': 'Chaque membre aidé = problème résolu + 5$ économisés pour lui + 10$ gagnés pour vous. Tout le monde gagne.',
    'groupAdmin.landing.value.winwin.tag': 'Service utile + Revenus récurrents',
  },
  en: {
    'groupAdmin.landing.value.badge': 'Win-Win',
    'groupAdmin.landing.value.title': 'You provide REAL value',
    'groupAdmin.landing.value.subtitle': 'You\'re not selling, you\'re HELPING. Your members get concrete help for their expat problems.',
    'groupAdmin.landing.value.solution': 'Your solution',

    'groupAdmin.landing.value.problem1.title': 'Visa denied, deportation looming',
    'groupAdmin.landing.value.problem1.desc': 'A member panics: their visa was denied, they risk deportation in 15 days.',
    'groupAdmin.landing.value.problem1.solution': 'Immediate call with immigration specialist lawyer. Concrete advice + action plan. Member saved.',

    'groupAdmin.landing.value.problem2.title': 'Lost in paperwork',
    'groupAdmin.landing.value.problem2.desc': 'New arrival, doesn\'t speak the language, understands nothing about administrative forms.',
    'groupAdmin.landing.value.problem2.solution': 'Bilingual expat helper explains step by step. Forms filled correctly. Stress gone.',

    'groupAdmin.landing.value.problem3.title': 'Emergency at night',
    'groupAdmin.landing.value.problem3.desc': '10pm, family in distress: police check tomorrow morning, documents not ready.',
    'groupAdmin.landing.value.problem3.solution': '24/7 help available. Expert calls in 5 min, guides preparation. Check passed without problem.',

    'groupAdmin.landing.value.problem4.title': 'Budget too tight',
    'groupAdmin.landing.value.problem4.desc': 'Needs legal help but can\'t afford a law firm at $500/hour.',
    'groupAdmin.landing.value.problem4.solution': 'With YOUR link = $5 discount. Pro help accessible. Grateful member.',

    'groupAdmin.landing.value.winwin.title': 'You\'re not selling. You HELP and earn.',
    'groupAdmin.landing.value.winwin.desc': 'Each member helped = problem solved + $5 saved for them + $10 earned for you. Everyone wins.',
    'groupAdmin.landing.value.winwin.tag': 'Useful service + Recurring revenue',
  },
  es: {
    'groupAdmin.landing.value.badge': 'Ganar-Ganar',
    'groupAdmin.landing.value.title': 'Aportas VALOR REAL',
    'groupAdmin.landing.value.subtitle': 'No vendes, AYUDAS. Tus miembros obtienen ayuda concreta para sus problemas de expatriado.',
    'groupAdmin.landing.value.solution': 'Tu solución',

    'groupAdmin.landing.value.problem1.title': 'Visa denegada, deportación cercana',
    'groupAdmin.landing.value.problem1.desc': 'Un miembro en pánico: su visa fue denegada, riesgo de deportación en 15 días.',
    'groupAdmin.landing.value.problem1.solution': 'Llamada inmediata con abogado especializado en inmigración. Consejos concretos + plan de acción. Miembro salvado.',

    'groupAdmin.landing.value.problem2.title': 'Perdido en trámites',
    'groupAdmin.landing.value.problem2.desc': 'Recién llegado, no habla el idioma, no entiende nada de formularios administrativos.',
    'groupAdmin.landing.value.problem2.solution': 'Helper expat bilingüe explica paso a paso. Formularios llenados correctamente. Estrés desaparecido.',

    'groupAdmin.landing.value.problem3.title': 'Emergencia de noche',
    'groupAdmin.landing.value.problem3.desc': '22h, familia en apuros: control policial mañana, documentos no listos.',
    'groupAdmin.landing.value.problem3.solution': 'Ayuda 24/7 disponible. Experto llama en 5 min, guía la preparación. Control pasado sin problema.',

    'groupAdmin.landing.value.problem4.title': 'Presupuesto muy ajustado',
    'groupAdmin.landing.value.problem4.desc': 'Necesita ayuda legal pero no puede pagar un bufete a 500$/hora.',
    'groupAdmin.landing.value.problem4.solution': 'Con TU enlace = 5$ de descuento. Ayuda profesional accesible. Miembro agradecido.',

    'groupAdmin.landing.value.winwin.title': 'No vendes. AYUDAS y ganas.',
    'groupAdmin.landing.value.winwin.desc': 'Cada miembro ayudado = problema resuelto + 5$ ahorrados para él + 10$ ganados para ti. Todos ganan.',
    'groupAdmin.landing.value.winwin.tag': 'Servicio útil + Ingresos recurrentes',
  },
  de: {
    'groupAdmin.landing.value.badge': 'Win-Win',
    'groupAdmin.landing.value.title': 'Sie bieten ECHTEN Mehrwert',
    'groupAdmin.landing.value.subtitle': 'Sie verkaufen nicht, Sie HELFEN. Ihre Mitglieder erhalten konkrete Hilfe bei ihren Expat-Problemen.',
    'groupAdmin.landing.value.solution': 'Ihre Lösung',

    'groupAdmin.landing.value.problem1.title': 'Visum abgelehnt, Abschiebung droht',
    'groupAdmin.landing.value.problem1.desc': 'Ein Mitglied gerät in Panik: Visum wurde abgelehnt, Abschiebung in 15 Tagen droht.',
    'groupAdmin.landing.value.problem1.solution': 'Sofortiger Anruf mit Einwanderungsanwalt. Konkrete Beratung + Aktionsplan. Mitglied gerettet.',

    'groupAdmin.landing.value.problem2.title': 'Verloren im Papierkram',
    'groupAdmin.landing.value.problem2.desc': 'Neuankömmling, spricht die Sprache nicht, versteht nichts von Verwaltungsformularen.',
    'groupAdmin.landing.value.problem2.solution': 'Zweisprachiger Expat-Helfer erklärt Schritt für Schritt. Formulare korrekt ausgefüllt. Stress verschwunden.',

    'groupAdmin.landing.value.problem3.title': 'Notfall in der Nacht',
    'groupAdmin.landing.value.problem3.desc': '22 Uhr, Familie in Not: Polizeikontrolle morgen früh, Dokumente nicht bereit.',
    'groupAdmin.landing.value.problem3.solution': '24/7 Hilfe verfügbar. Experte ruft in 5 Min an, leitet Vorbereitung. Kontrolle problemlos bestanden.',

    'groupAdmin.landing.value.problem4.title': 'Budget zu knapp',
    'groupAdmin.landing.value.problem4.desc': 'Braucht Rechtshilfe, kann sich aber keine Kanzlei für 500$/Stunde leisten.',
    'groupAdmin.landing.value.problem4.solution': 'Mit IHREM Link = 5$ Rabatt. Professionelle Hilfe zugänglich. Dankbares Mitglied.',

    'groupAdmin.landing.value.winwin.title': 'Sie verkaufen nicht. Sie HELFEN und verdienen.',
    'groupAdmin.landing.value.winwin.desc': 'Jedes geholfen Mitglied = Problem gelöst + 5$ gespart + 10$ für Sie verdient. Alle gewinnen.',
    'groupAdmin.landing.value.winwin.tag': 'Nützlicher Service + Wiederkehrende Einnahmen',
  },
  pt: {
    'groupAdmin.landing.value.badge': 'Ganha-Ganha',
    'groupAdmin.landing.value.title': 'Você fornece valor REAL',
    'groupAdmin.landing.value.subtitle': 'Você não está vendendo, está AJUDANDO. Seus membros obtêm ajuda concreta para seus problemas de expatriado.',
    'groupAdmin.landing.value.solution': 'Sua solução',

    'groupAdmin.landing.value.problem1.title': 'Visto negado, deportação iminente',
    'groupAdmin.landing.value.problem1.desc': 'Um membro em pânico: seu visto foi negado, risco de deportação em 15 dias.',
    'groupAdmin.landing.value.problem1.solution': 'Chamada imediata com advogado especializado em imigração. Conselhos concretos + plano de ação. Membro salvo.',

    'groupAdmin.landing.value.problem2.title': 'Perdido na burocracia',
    'groupAdmin.landing.value.problem2.desc': 'Recém-chegado, não fala o idioma, não entende nada de formulários administrativos.',
    'groupAdmin.landing.value.problem2.solution': 'Ajudante expat bilíngue explica passo a passo. Formulários preenchidos corretamente. Estresse desapareceu.',

    'groupAdmin.landing.value.problem3.title': 'Emergência à noite',
    'groupAdmin.landing.value.problem3.desc': '22h, família em apuros: controle policial amanhã de manhã, documentos não prontos.',
    'groupAdmin.landing.value.problem3.solution': 'Ajuda 24/7 disponível. Especialista liga em 5 min, orienta preparação. Controle passou sem problema.',

    'groupAdmin.landing.value.problem4.title': 'Orçamento muito apertado',
    'groupAdmin.landing.value.problem4.desc': 'Precisa de ajuda jurídica mas não pode pagar escritório a 500$/hora.',
    'groupAdmin.landing.value.problem4.solution': 'Com SEU link = 5$ de desconto. Ajuda profissional acessível. Membro grato.',

    'groupAdmin.landing.value.winwin.title': 'Você não vende. Você AJUDA e ganha.',
    'groupAdmin.landing.value.winwin.desc': 'Cada membro ajudado = problema resolvido + 5$ economizados para ele + 10$ ganhos para você. Todos ganham.',
    'groupAdmin.landing.value.winwin.tag': 'Serviço útil + Receita recorrente',
  },
  ru: {
    'groupAdmin.landing.value.badge': 'Выиграли все',
    'groupAdmin.landing.value.title': 'Вы даете РЕАЛЬНУЮ ценность',
    'groupAdmin.landing.value.subtitle': 'Вы не продаете, вы ПОМОГАЕТЕ. Ваши участники получают конкретную помощь в решении проблем экспатов.',
    'groupAdmin.landing.value.solution': 'Ваше решение',

    'groupAdmin.landing.value.problem1.title': 'Виза отклонена, депортация близко',
    'groupAdmin.landing.value.problem1.desc': 'Участник в панике: виза отклонена, риск депортации через 15 дней.',
    'groupAdmin.landing.value.problem1.solution': 'Немедленный звонок с иммиграционным адвокатом. Конкретные советы + план действий. Участник спасен.',

    'groupAdmin.landing.value.problem2.title': 'Потерян в бумагах',
    'groupAdmin.landing.value.problem2.desc': 'Новый приезжий, не говорит на языке, ничего не понимает в административных формах.',
    'groupAdmin.landing.value.problem2.solution': 'Двуязычный помощник экспата объясняет шаг за шагом. Формы заполнены правильно. Стресс исчез.',

    'groupAdmin.landing.value.problem3.title': 'Срочно ночью',
    'groupAdmin.landing.value.problem3.desc': '22 часа, семья в бедствии: проверка полиции завтра утром, документы не готовы.',
    'groupAdmin.landing.value.problem3.solution': 'Помощь 24/7 доступна. Эксперт звонит за 5 мин, направляет подготовку. Проверка прошла без проблем.',

    'groupAdmin.landing.value.problem4.title': 'Бюджет слишком мал',
    'groupAdmin.landing.value.problem4.desc': 'Нужна юридическая помощь, но не может позволить себе юристов по 500$/час.',
    'groupAdmin.landing.value.problem4.solution': 'С ВАШЕЙ ссылкой = скидка 5$. Профессиональная помощь доступна. Благодарный участник.',

    'groupAdmin.landing.value.winwin.title': 'Вы не продаете. Вы ПОМОГАЕТЕ и зарабатываете.',
    'groupAdmin.landing.value.winwin.desc': 'Каждый помощь участнику = проблема решена + 5$ сэкономлено для него + 10$ заработано для вас. Все выигрывают.',
    'groupAdmin.landing.value.winwin.tag': 'Полезный сервис + Регулярный доход',
  },
  ch: {
    'groupAdmin.landing.value.badge': '双赢',
    'groupAdmin.landing.value.title': '您提供真正的价值',
    'groupAdmin.landing.value.subtitle': '您不是在销售，而是在帮助。您的成员可以获得具体的帮助来解决他们的外派问题。',
    'groupAdmin.landing.value.solution': '您的解决方案',

    'groupAdmin.landing.value.problem1.title': '签证被拒，驱逐在即',
    'groupAdmin.landing.value.problem1.desc': '一名成员恐慌：签证被拒，15天内面临驱逐风险。',
    'groupAdmin.landing.value.problem1.solution': '立即与移民专业律师通话。具体建议+行动计划。成员得救。',

    'groupAdmin.landing.value.problem2.title': '在手续中迷失',
    'groupAdmin.landing.value.problem2.desc': '新来者，不会说当地语言，对行政表格一无所知。',
    'groupAdmin.landing.value.problem2.solution': '双语外派助手逐步解释。表格正确填写。压力消失。',

    'groupAdmin.landing.value.problem3.title': '深夜紧急情况',
    'groupAdmin.landing.value.problem3.desc': '晚上10点，家庭陷入困境：明天早上警察检查，文件未准备好。',
    'groupAdmin.landing.value.problem3.solution': '24/7帮助可用。专家5分钟内致电，指导准备。检查顺利通过。',

    'groupAdmin.landing.value.problem4.title': '预算太紧',
    'groupAdmin.landing.value.problem4.desc': '需要法律帮助但负担不起每小时500美元的律师事务所。',
    'groupAdmin.landing.value.problem4.solution': '使用您的链接=5美元折扣。专业帮助触手可及。感激的成员。',

    'groupAdmin.landing.value.winwin.title': '您不是在销售。您在帮助并赚钱。',
    'groupAdmin.landing.value.winwin.desc': '每个帮助的成员=问题解决+为他们节省5美元+为您赚取10美元。每个人都赢了。',
    'groupAdmin.landing.value.winwin.tag': '有用的服务+经常性收入',
  },
  hi: {
    'groupAdmin.landing.value.badge': 'विन-विन',
    'groupAdmin.landing.value.title': 'आप असली मूल्य प्रदान करते हैं',
    'groupAdmin.landing.value.subtitle': 'आप बेच नहीं रहे हैं, आप मदद कर रहे हैं। आपके सदस्यों को उनकी प्रवासी समस्याओं के लिए ठोस सहायता मिलती है।',
    'groupAdmin.landing.value.solution': 'आपका समाधान',

    'groupAdmin.landing.value.problem1.title': 'वीज़ा अस्वीकृत, निर्वासन करीब',
    'groupAdmin.landing.value.problem1.desc': 'एक सदस्य घबराया हुआ है: उसका वीज़ा अस्वीकृत हो गया, 15 दिनों में निर्वासन का जोखिम।',
    'groupAdmin.landing.value.problem1.solution': 'आव्रजन विशेषज्ञ वकील के साथ तत्काल कॉल। ठोस सलाह + कार्य योजना। सदस्य बचाया गया।',

    'groupAdmin.landing.value.problem2.title': 'कागजी कार्रवाई में खोया',
    'groupAdmin.landing.value.problem2.desc': 'नया आगमन, भाषा नहीं बोलता, प्रशासनिक फॉर्म के बारे में कुछ नहीं समझता।',
    'groupAdmin.landing.value.problem2.solution': 'द्विभाषी प्रवासी सहायक कदम दर कदम समझाता है। फॉर्म सही भरे गए। तनाव गायब।',

    'groupAdmin.landing.value.problem3.title': 'रात में आपातकाल',
    'groupAdmin.landing.value.problem3.desc': 'रात 10 बजे, परिवार संकट में: कल सुबह पुलिस जांच, दस्तावेज तैयार नहीं।',
    'groupAdmin.landing.value.problem3.solution': '24/7 मदद उपलब्ध। विशेषज्ञ 5 मिनट में कॉल करता है, तैयारी का मार्गदर्शन करता है। जांच बिना समस्या पास हुई।',

    'groupAdmin.landing.value.problem4.title': 'बजट बहुत तंग',
    'groupAdmin.landing.value.problem4.desc': 'कानूनी सहायता की जरूरत है लेकिन 500$/घंटे पर कानूनी फर्म वहन नहीं कर सकता।',
    'groupAdmin.landing.value.problem4.solution': 'आपके लिंक के साथ = 5$ छूट। पेशेवर मदद सुलभ। आभारी सदस्य।',

    'groupAdmin.landing.value.winwin.title': 'आप बेच नहीं रहे हैं। आप मदद करते हैं और कमाते हैं।',
    'groupAdmin.landing.value.winwin.desc': 'प्रत्येक सदस्य की मदद = समस्या हल + उनके लिए 5$ बचत + आपके लिए 10$ कमाई। सभी जीतते हैं।',
    'groupAdmin.landing.value.winwin.tag': 'उपयोगी सेवा + आवर्ती राजस्व',
  },
  ar: {
    'groupAdmin.landing.value.badge': 'فوز للجميع',
    'groupAdmin.landing.value.title': 'أنت تقدم قيمة حقيقية',
    'groupAdmin.landing.value.subtitle': 'أنت لا تبيع، أنت تساعد. يحصل أعضاؤك على مساعدة ملموسة لمشاكل المغتربين.',
    'groupAdmin.landing.value.solution': 'حلك',

    'groupAdmin.landing.value.problem1.title': 'رفض التأشيرة، الترحيل وشيك',
    'groupAdmin.landing.value.problem1.desc': 'عضو في حالة ذعر: تم رفض تأشيرته، خطر الترحيل خلال 15 يومًا.',
    'groupAdmin.landing.value.problem1.solution': 'مكالمة فورية مع محامي متخصص في الهجرة. نصائح ملموسة + خطة عمل. العضو منقذ.',

    'groupAdmin.landing.value.problem2.title': 'ضائع في الإجراءات',
    'groupAdmin.landing.value.problem2.desc': 'وافد جديد، لا يتحدث اللغة، لا يفهم شيئًا عن النماذج الإدارية.',
    'groupAdmin.landing.value.problem2.solution': 'مساعد مغترب ثنائي اللغة يشرح خطوة بخطوة. النماذج مملوءة بشكل صحيح. التوتر اختفى.',

    'groupAdmin.landing.value.problem3.title': 'طارئ في الليل',
    'groupAdmin.landing.value.problem3.desc': 'الساعة 10 مساءً، عائلة في ضائقة: تفتيش الشرطة صباح الغد، الوثائق غير جاهزة.',
    'groupAdmin.landing.value.problem3.solution': 'مساعدة 24/7 متاحة. خبير يتصل في 5 دقائق، يوجه التحضير. التفتيش نجح بدون مشكلة.',

    'groupAdmin.landing.value.problem4.title': 'الميزانية ضيقة جدا',
    'groupAdmin.landing.value.problem4.desc': 'يحتاج إلى مساعدة قانونية لكن لا يستطيع تحمل تكلفة مكتب محاماة بـ 500$/ساعة.',
    'groupAdmin.landing.value.problem4.solution': 'مع رابطك = خصم 5$. المساعدة المهنية متاحة. عضو ممتن.',

    'groupAdmin.landing.value.winwin.title': 'أنت لا تبيع. أنت تساعد وتكسب.',
    'groupAdmin.landing.value.winwin.desc': 'كل عضو تم مساعدته = مشكلة محلولة + 5$ موفرة له + 10$ مكتسبة لك. الجميع يفوز.',
    'groupAdmin.landing.value.winwin.tag': 'خدمة مفيدة + دخل متكرر',
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

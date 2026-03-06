/**
 * Seed: Chatter Training Modules (5 modules, 9 languages, fun & concise)
 *
 * Usage: cd sos/firebase/functions && node scripts/seed-training-modules.cjs
 */

const admin = require("firebase-admin");
// Use Application Default Credentials (firebase login gives these)
const path = require("path");
const fs = require("fs");

// Try service account key first, then fall back to ADC
const saPath = path.resolve(__dirname, "../serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  console.log("Using serviceAccountKey.json\n");
} else {
  // Use firebase CLI credentials (gcloud ADC)
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
  console.log("Using Application Default Credentials\n");
}
const db = admin.firestore();
const now = admin.firestore.Timestamp.now;

// ============================================================================
// HELPER: multi-language object
// ============================================================================
function t(fr, en, es, pt, ar, de, ru, zh, hi) {
  return {
    value: fr,
    translations: { en, es, pt, ar, de, ru, zh, hi },
  };
}

// ============================================================================
// MODULE 1: C'est quoi SOS-Expat ?
// ============================================================================
const module1 = {
  order: 1,
  status: "published",
  category: "onboarding",
  estimatedMinutes: 5,
  isRequired: true,
  prerequisites: [],
  coverImageUrl: "",
  passingScore: 70,
  ...(() => {
    const title = t(
      "C'est quoi SOS-Expat ?",
      "What is SOS-Expat?",
      "Que es SOS-Expat?",
      "O que e SOS-Expat?",
      "ما هو SOS-Expat؟",
      "Was ist SOS-Expat?",
      "Что такое SOS-Expat?",
      "什么是SOS-Expat？",
      "SOS-Expat क्या है?"
    );
    const desc = t(
      "Decouvrez la plateforme en 5 minutes chrono !",
      "Discover the platform in 5 minutes!",
      "Descubre la plataforma en 5 minutos!",
      "Descubra a plataforma em 5 minutos!",
      "اكتشف المنصة في 5 دقائق!",
      "Entdecke die Plattform in 5 Minuten!",
      "Узнайте о платформе за 5 минут!",
      "5分钟了解平台！",
      "5 मिनट में प्लेटफ़ॉर्म जानें!"
    );
    return {
      title: title.value,
      titleTranslations: title.translations,
      description: desc.value,
      descriptionTranslations: desc.translations,
    };
  })(),
  slides: [
    {
      order: 0,
      type: "text",
      ...(() => {
        const title = t(
          "Le probleme qu'on resout",
          "The problem we solve",
          "El problema que resolvemos",
          "O problema que resolvemos",
          "المشكلة التي نحلها",
          "Das Problem, das wir loesen",
          "Проблема, которую мы решаем",
          "我们解决的问题",
          "हम जो समस्या हल करते हैं"
        );
        const content = t(
          "Les expatries galèrent.\n\n" +
          "Visa, impots, logement, sante...\n" +
          "Ils cherchent de l'aide mais ne savent pas a qui faire confiance.\n\n" +
          "SOS-Expat connecte ces personnes avec des pros qualifies en UN appel.",

          "Expats struggle.\n\n" +
          "Visa, taxes, housing, health...\n" +
          "They need help but don't know who to trust.\n\n" +
          "SOS-Expat connects them with qualified pros in ONE call.",

          "Los expatriados luchan.\n\n" +
          "Visa, impuestos, vivienda, salud...\n" +
          "Necesitan ayuda pero no saben en quien confiar.\n\n" +
          "SOS-Expat los conecta con profesionales en UNA llamada.",

          "Expatriados sofrem.\n\n" +
          "Visto, impostos, moradia, saude...\n" +
          "Precisam de ajuda mas nao sabem em quem confiar.\n\n" +
          "SOS-Expat conecta com profissionais em UMA ligacao.",

          "المغتربون يعانون.\n\n" +
          "تأشيرات، ضرائب، سكن، صحة...\n" +
          "يحتاجون مساعدة لكن لا يعرفون بمن يثقون.\n\n" +
          "SOS-Expat يربطهم بمحترفين في مكالمة واحدة.",

          "Expats haben es schwer.\n\n" +
          "Visum, Steuern, Wohnung, Gesundheit...\n" +
          "Sie brauchen Hilfe, wissen aber nicht, wem sie vertrauen koennen.\n\n" +
          "SOS-Expat verbindet sie mit Profis in EINEM Anruf.",

          "Экспатам тяжело.\n\n" +
          "Виза, налоги, жильё, здоровье...\n" +
          "Им нужна помощь, но они не знают, кому доверять.\n\n" +
          "SOS-Expat связывает их с профессионалами за ОДИН звонок.",

          "外籍人士很困难。\n\n" +
          "签证、税务、住房、健康...\n" +
          "他们需要帮助但不知道该信任谁。\n\n" +
          "SOS-Expat一个电话连接专业人士。",

          "प्रवासियों को परेशानी होती है।\n\n" +
          "वीज़ा, टैक्स, आवास, स्वास्थ्य...\n" +
          "उन्हें मदद चाहिए पर भरोसा किस पर करें?\n\n" +
          "SOS-Expat एक कॉल में विशेषज्ञों से जोड़ता है।"
        );
        return {
          title: title.value,
          titleTranslations: title.translations,
          content: content.value,
          contentTranslations: content.translations,
        };
      })(),
    },
    {
      order: 1,
      type: "checklist",
      ...(() => {
        const title = t(
          "Comment ca marche ?",
          "How does it work?",
          "Como funciona?",
          "Como funciona?",
          "كيف يعمل؟",
          "Wie funktioniert es?",
          "Как это работает?",
          "怎么运作？",
          "यह कैसे काम करता है?"
        );
        const content = t(
          "4 etapes ultra simples :",
          "4 super simple steps:",
          "4 pasos super simples:",
          "4 passos super simples:",
          "4 خطوات بسيطة جداً:",
          "4 ganz einfache Schritte:",
          "4 очень простых шага:",
          "4个超简单步骤：",
          "4 बेहद आसान कदम:"
        );
        return {
          title: title.value,
          titleTranslations: title.translations,
          content: content.value,
          contentTranslations: content.translations,
          checklistItems: [
            {
              text: "Le client clique sur votre lien",
              textTranslations: {
                en: "Client clicks your link",
                es: "El cliente hace clic en tu enlace",
                pt: "O cliente clica no seu link",
                ar: "العميل يضغط على رابطك",
                de: "Der Kunde klickt auf deinen Link",
                ru: "Клиент кликает по вашей ссылке",
                zh: "客户点击你的链接",
                hi: "ग्राहक आपके लिंक पर क्लिक करता है",
              },
            },
            {
              text: "Il choisit un type d'assistance",
              textTranslations: {
                en: "They choose an assistance type",
                es: "Elige un tipo de asistencia",
                pt: "Escolhe um tipo de assistencia",
                ar: "يختار نوع المساعدة",
                de: "Er waehlt eine Hilfsart",
                ru: "Выбирает тип помощи",
                zh: "选择服务类型",
                hi: "सहायता प्रकार चुनता है",
              },
            },
            {
              text: "Il paye et appelle un pro en direct",
              textTranslations: {
                en: "They pay and call a pro live",
                es: "Paga y llama a un profesional en vivo",
                pt: "Paga e liga para um profissional ao vivo",
                ar: "يدفع ويتصل بمحترف مباشرة",
                de: "Er bezahlt und ruft einen Profi live an",
                ru: "Платит и звонит профессионалу в прямом эфире",
                zh: "付款后实时通话专业人士",
                hi: "भुगतान करता है और लाइव प्रो से बात करता है",
              },
            },
            {
              text: "Vous gagnez votre commission automatiquement !",
              textTranslations: {
                en: "You earn your commission automatically!",
                es: "Ganas tu comision automaticamente!",
                pt: "Voce ganha sua comissao automaticamente!",
                ar: "تحصل على عمولتك تلقائياً!",
                de: "Du verdienst deine Provision automatisch!",
                ru: "Вы получаете комиссию автоматически!",
                zh: "你自动赚取佣金！",
                hi: "आपको कमीशन अपने-आप मिलता है!",
              },
            },
          ],
        };
      })(),
    },
    {
      order: 2,
      type: "tips",
      ...(() => {
        const title = t(
          "Pourquoi les clients adorent",
          "Why clients love it",
          "Por que les encanta a los clientes",
          "Por que os clientes adoram",
          "لماذا يحبه العملاء",
          "Warum Kunden es lieben",
          "Почему клиентам нравится",
          "客户为什么喜欢",
          "ग्राहक क्यों पसंद करते हैं"
        );
        const content = t("", "", "", "", "", "", "", "", "");
        return {
          title: title.value,
          titleTranslations: title.translations,
          content: content.value,
          contentTranslations: content.translations,
          tips: [
            {
              text: "Pas besoin de rendez-vous : appel instantane",
              textTranslations: {
                en: "No appointment needed: instant call",
                es: "Sin cita: llamada instantanea",
                pt: "Sem agendamento: chamada instantanea",
                ar: "لا حاجة لموعد: اتصال فوري",
                de: "Kein Termin noetig: sofortiger Anruf",
                ru: "Без записи: мгновенный звонок",
                zh: "无需预约：即时通话",
                hi: "अपॉइंटमेंट की ज़रूरत नहीं: तुरंत कॉल",
              },
            },
            {
              text: "Des pros verifies : avocats, comptables, experts",
              textTranslations: {
                en: "Verified pros: lawyers, accountants, experts",
                es: "Profesionales verificados: abogados, contadores",
                pt: "Profissionais verificados: advogados, contadores",
                ar: "محترفون معتمدون: محامون، محاسبون، خبراء",
                de: "Verifizierte Profis: Anwaelte, Steuerberater",
                ru: "Проверенные специалисты: юристы, бухгалтеры",
                zh: "认证专业人士：律师、会计师、专家",
                hi: "सत्यापित विशेषज्ञ: वकील, अकाउंटेंट",
              },
            },
            {
              text: "Disponible 7j/7, depuis n'importe quel pays",
              textTranslations: {
                en: "Available 24/7, from any country",
                es: "Disponible 24/7, desde cualquier pais",
                pt: "Disponivel 24/7, de qualquer pais",
                ar: "متاح 24/7 من أي بلد",
                de: "24/7 verfuegbar, aus jedem Land",
                ru: "Доступно 24/7, из любой страны",
                zh: "全天候服务，来自任何国家",
                hi: "24/7 उपलब्ध, किसी भी देश से",
              },
            },
          ],
        };
      })(),
    },
  ],
  quizQuestions: [
    {
      id: "m1q1",
      ...(() => {
        const q = t(
          "SOS-Expat sert a quoi ?",
          "What does SOS-Expat do?",
          "Para que sirve SOS-Expat?",
          "Para que serve o SOS-Expat?",
          "ما هي وظيفة SOS-Expat؟",
          "Wofuer ist SOS-Expat?",
          "Для чего нужен SOS-Expat?",
          "SOS-Expat是做什么的？",
          "SOS-Expat किसलिए है?"
        );
        return {
          question: q.value,
          questionTranslations: q.translations,
        };
      })(),
      options: [
        {
          id: "a",
          text: "Vendre des billets d'avion",
          textTranslations: {
            en: "Sell plane tickets", es: "Vender boletos de avion", pt: "Vender passagens aereas",
            ar: "بيع تذاكر طيران", de: "Flugtickets verkaufen", ru: "Продавать авиабилеты",
            zh: "卖机票", hi: "हवाई टिकट बेचना",
          },
        },
        {
          id: "b",
          text: "Connecter les expats avec des pros par telephone",
          textTranslations: {
            en: "Connect expats with pros by phone", es: "Conectar expatriados con profesionales por telefono",
            pt: "Conectar expatriados com profissionais por telefone", ar: "ربط المغتربين بمحترفين عبر الهاتف",
            de: "Expats telefonisch mit Profis verbinden", ru: "Связать экспатов с профессионалами по телефону",
            zh: "通过电话连接外籍人士与专业人士", hi: "फोन पर प्रवासियों को विशेषज्ञों से जोड़ना",
          },
        },
        {
          id: "c",
          text: "Proposer des cours de langue",
          textTranslations: {
            en: "Offer language courses", es: "Ofrecer cursos de idiomas", pt: "Oferecer cursos de idiomas",
            ar: "تقديم دورات لغوية", de: "Sprachkurse anbieten", ru: "Предлагать языковые курсы",
            zh: "提供语言课程", hi: "भाषा पाठ्यक्रम देना",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "SOS-Expat connecte les expatries avec des professionnels (avocats, comptables...) par telephone, instantanement.",
          "SOS-Expat connects expats with professionals (lawyers, accountants...) by phone, instantly.",
          "SOS-Expat conecta expatriados con profesionales por telefono, al instante.",
          "SOS-Expat conecta expatriados com profissionais por telefone, instantaneamente.",
          "SOS-Expat يربط المغتربين بالمحترفين عبر الهاتف فوراً.",
          "SOS-Expat verbindet Expats sofort telefonisch mit Profis.",
          "SOS-Expat мгновенно связывает экспатов с профессионалами по телефону.",
          "SOS-Expat通过电话即时连接外籍人士与专业人士。",
          "SOS-Expat प्रवासियों को फोन पर तुरंत विशेषज्ञों से जोड़ता है।"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
    {
      id: "m1q2",
      ...(() => {
        const q = t(
          "Quand recevez-vous votre commission ?",
          "When do you get your commission?",
          "Cuando recibes tu comision?",
          "Quando voce recebe sua comissao?",
          "متى تحصل على عمولتك؟",
          "Wann bekommst du deine Provision?",
          "Когда вы получаете комиссию?",
          "什么时候收到佣金？",
          "आपको कमीशन कब मिलता है?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a",
          text: "A la fin du mois",
          textTranslations: {
            en: "At the end of the month", es: "Al final del mes", pt: "No final do mes",
            ar: "في نهاية الشهر", de: "Am Monatsende", ru: "В конце месяца",
            zh: "月底", hi: "महीने के अंत में",
          },
        },
        {
          id: "b",
          text: "Automatiquement apres chaque appel payant",
          textTranslations: {
            en: "Automatically after each paid call", es: "Automaticamente despues de cada llamada",
            pt: "Automaticamente apos cada chamada paga", ar: "تلقائياً بعد كل مكالمة مدفوعة",
            de: "Automatisch nach jedem bezahlten Anruf", ru: "Автоматически после каждого платного звонка",
            zh: "每次付费通话后自动", hi: "हर पेड कॉल के बाद अपने-आप",
          },
        },
        {
          id: "c",
          text: "Jamais, c'est benevole",
          textTranslations: {
            en: "Never, it's volunteer work", es: "Nunca, es voluntariado", pt: "Nunca, e voluntario",
            ar: "أبداً، إنه تطوعي", de: "Nie, es ist ehrenamtlich", ru: "Никогда, это волонтёрство",
            zh: "从不，这是志愿工作", hi: "कभी नहीं, यह स्वैच्छिक है",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Chaque appel payant genere via votre lien = commission creditee automatiquement sur votre tirelire !",
          "Each paid call via your link = commission automatically credited to your piggy bank!",
          "Cada llamada pagada via tu enlace = comision acreditada automaticamente!",
          "Cada chamada paga via seu link = comissao creditada automaticamente!",
          "كل مكالمة مدفوعة عبر رابطك = عمولة تُضاف تلقائياً!",
          "Jeder bezahlte Anruf ueber deinen Link = Provision automatisch gutgeschrieben!",
          "Каждый платный звонок по вашей ссылке = комиссия автоматически начисляется!",
          "每次通过你链接的付费通话=佣金自动到账！",
          "आपके लिंक से हर पेड कॉल = कमीशन अपने-आप जमा!"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
  ],
  createdBy: "system",
  createdAt: now(),
  updatedAt: now(),
};

// ============================================================================
// MODULE 2: Votre role de Chatter
// ============================================================================
const module2 = {
  order: 2,
  status: "published",
  category: "onboarding",
  estimatedMinutes: 5,
  isRequired: true,
  prerequisites: [],
  coverImageUrl: "",
  passingScore: 70,
  ...(() => {
    const title = t(
      "Votre role de Chatter",
      "Your Role as a Chatter",
      "Tu rol como Chatter",
      "Seu papel como Chatter",
      "دورك كـ Chatter",
      "Deine Rolle als Chatter",
      "Ваша роль Chatter",
      "你的Chatter角色",
      "Chatter के रूप में आपकी भूमिका"
    );
    const desc = t(
      "Ce que vous faites, ce que vous gagnez !",
      "What you do, what you earn!",
      "Lo que haces, lo que ganas!",
      "O que voce faz, o que voce ganha!",
      "ماذا تفعل، وماذا تكسب!",
      "Was du machst, was du verdienst!",
      "Что вы делаете, что зарабатываете!",
      "你做什么，赚什么！",
      "आप क्या करते हैं, क्या कमाते हैं!"
    );
    return {
      title: title.value, titleTranslations: title.translations,
      description: desc.value, descriptionTranslations: desc.translations,
    };
  })(),
  slides: [
    {
      order: 0,
      type: "text",
      ...(() => {
        const title = t(
          "Votre mission",
          "Your mission",
          "Tu mision",
          "Sua missao",
          "مهمتك",
          "Deine Mission",
          "Ваша миссия",
          "你的使命",
          "आपका मिशन"
        );
        const content = t(
          "C'est simple :\n\nPartagez votre lien perso avec des expatries qui ont besoin d'aide.\n\nC'est TOUT.\n\nPas besoin de vendre, pas besoin de convaincre.\nJuste partager au bon endroit, au bon moment.",

          "It's simple:\n\nShare your personal link with expats who need help.\n\nThat's ALL.\n\nNo selling, no convincing needed.\nJust share in the right place, at the right time.",

          "Es simple:\n\nComparte tu enlace personal con expatriados que necesitan ayuda.\n\nEso es TODO.\n\nNo tienes que vender ni convencer.\nSolo compartir en el lugar y momento adecuados.",

          "E simples:\n\nCompartilhe seu link pessoal com expatriados que precisam de ajuda.\n\nIsso e TUDO.\n\nSem vender, sem convencer.\nSo compartilhar no lugar certo, na hora certa.",

          "الأمر بسيط:\n\nشارك رابطك الشخصي مع المغتربين الذين يحتاجون مساعدة.\n\nهذا كل شيء.\n\nلا بيع، لا إقناع.\nفقط شارك في المكان والوقت المناسبين.",

          "Es ist einfach:\n\nTeile deinen persoenlichen Link mit Expats, die Hilfe brauchen.\n\nDas ist ALLES.\n\nKein Verkaufen, kein Ueberzeugen.\nEinfach am richtigen Ort teilen.",

          "Всё просто:\n\nДелитесь вашей личной ссылкой с экспатами, которым нужна помощь.\n\nЭто ВСЁ.\n\nНе нужно продавать или убеждать.\nПросто делитесь в нужном месте в нужное время.",

          "很简单：\n\n将你的个人链接分享给需要帮助的外籍人士。\n\n就这样。\n\n不用销售，不用说服。\n只需在对的地方、对的时间分享。",

          "बहुत आसान है:\n\nअपना पर्सनल लिंक उन प्रवासियों के साथ शेयर करें जिन्हें मदद चाहिए।\n\nबस इतना ही।\n\nबेचना नहीं है, समझाना नहीं है।\nबस सही जगह, सही समय पर शेयर करें।"
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
        };
      })(),
    },
    {
      order: 1,
      type: "tips",
      ...(() => {
        const title = t(
          "Vos 2 liens magiques",
          "Your 2 magic links",
          "Tus 2 enlaces magicos",
          "Seus 2 links magicos",
          "رابطاك السحريان",
          "Deine 2 magischen Links",
          "Ваши 2 волшебные ссылки",
          "你的2个神奇链接",
          "आपके 2 जादुई लिंक"
        );
        const content = t(
          "Dans votre dashboard, vous trouverez :",
          "In your dashboard, you'll find:",
          "En tu panel, encontraras:",
          "No seu painel, voce encontrara:",
          "في لوحتك ستجد:",
          "In deinem Dashboard findest du:",
          "В вашей панели вы найдёте:",
          "在你的仪表板中你会找到：",
          "आपके डैशबोर्ड में आपको मिलेंगे："
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          tips: [
            {
              text: "Lien CLIENT : pour les gens qui ont besoin d'aide (vous gagnez une commission par appel)",
              textTranslations: {
                en: "CLIENT link: for people who need help (you earn a commission per call)",
                es: "Enlace CLIENTE: para personas que necesitan ayuda (ganas comision por llamada)",
                pt: "Link CLIENTE: para pessoas que precisam de ajuda (voce ganha comissao por chamada)",
                ar: "رابط العميل: للأشخاص الذين يحتاجون مساعدة (تكسب عمولة لكل مكالمة)",
                de: "KUNDEN-Link: fuer Leute die Hilfe brauchen (Provision pro Anruf)",
                ru: "Ссылка КЛИЕНТА: для людей, которым нужна помощь (комиссия за каждый звонок)",
                zh: "客户链接：给需要帮助的人（每通电话赚佣金）",
                hi: "क्लाइंट लिंक: मदद चाहने वालों के लिए (हर कॉल पर कमीशन)",
              },
            },
            {
              text: "Lien RECRUTEMENT : pour inviter d'autres chatters (vous gagnez aussi sur LEURS appels !)",
              textTranslations: {
                en: "RECRUITMENT link: to invite other chatters (you also earn from THEIR calls!)",
                es: "Enlace RECLUTAMIENTO: para invitar otros chatters (tambien ganas de SUS llamadas!)",
                pt: "Link RECRUTAMENTO: para convidar outros chatters (voce ganha das chamadas DELES!)",
                ar: "رابط التوظيف: لدعوة chatters آخرين (تكسب أيضاً من مكالماتهم!)",
                de: "RECRUITING-Link: um andere Chatter einzuladen (du verdienst auch an DEREN Anrufen!)",
                ru: "Ссылка РЕКРУТИНГА: для приглашения других chatter (вы зарабатываете и с ИХ звонков!)",
                zh: "招募链接：邀请其他chatter（你也能从他们的通话中赚钱！）",
                hi: "भर्ती लिंक: अन्य chatters को आमंत्रित करने के लिए (उनकी कॉल से भी कमाई!)",
              },
            },
          ],
        };
      })(),
    },
    {
      order: 2,
      type: "text",
      ...(() => {
        const title = t(
          "Combien vous gagnez ?",
          "How much do you earn?",
          "Cuanto ganas?",
          "Quanto voce ganha?",
          "كم تكسب؟",
          "Wie viel verdienst du?",
          "Сколько вы зарабатываете?",
          "你能赚多少？",
          "आप कितना कमाते हैं?"
        );
        const content = t(
          "Chaque appel payant via votre lien :\n\n" +
          "Lien client = commission directe\n" +
          "Lien recrutement = commission sur les appels de vos recrues\n\n" +
          "Plus vous partagez, plus vous gagnez.\nPas de limite. Pas de plafond.",

          "Each paid call via your link:\n\n" +
          "Client link = direct commission\n" +
          "Recruitment link = commission on your recruits' calls\n\n" +
          "The more you share, the more you earn.\nNo limit. No cap.",

          "Cada llamada pagada via tu enlace:\n\n" +
          "Enlace cliente = comision directa\n" +
          "Enlace reclutamiento = comision de llamadas de tus reclutas\n\n" +
          "Cuanto mas compartes, mas ganas.\nSin limites.",

          "Cada chamada paga via seu link:\n\n" +
          "Link cliente = comissao direta\n" +
          "Link recrutamento = comissao das chamadas dos seus recrutas\n\n" +
          "Quanto mais compartilha, mais ganha.\nSem limites.",

          "كل مكالمة مدفوعة عبر رابطك:\n\n" +
          "رابط العميل = عمولة مباشرة\n" +
          "رابط التوظيف = عمولة من مكالمات المُجنَّدين\n\n" +
          "كلما شاركت أكثر، كسبت أكثر.\nبلا حدود.",

          "Jeder bezahlte Anruf ueber deinen Link:\n\n" +
          "Kunden-Link = direkte Provision\n" +
          "Recruiting-Link = Provision von Anrufen deiner Rekruten\n\n" +
          "Je mehr du teilst, desto mehr verdienst du.\nKeine Grenzen.",

          "Каждый платный звонок по вашей ссылке:\n\n" +
          "Ссылка клиента = прямая комиссия\n" +
          "Ссылка рекрутинга = комиссия со звонков ваших рекрутов\n\n" +
          "Чем больше делитесь, тем больше зарабатываете.\nБез лимитов.",

          "每次通过你链接的付费通话：\n\n" +
          "客户链接 = 直接佣金\n" +
          "招募链接 = 你招募的人的通话佣金\n\n" +
          "分享越多，赚越多。\n没有上限。",

          "आपके लिंक से हर पेड कॉल:\n\n" +
          "क्लाइंट लिंक = सीधा कमीशन\n" +
          "भर्ती लिंक = आपके भर्ती किए लोगों की कॉल पर कमीशन\n\n" +
          "जितना शेयर करें, उतना कमाएं।\nकोई सीमा नहीं।"
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
        };
      })(),
    },
  ],
  quizQuestions: [
    {
      id: "m2q1",
      ...(() => {
        const q = t(
          "Que devez-vous faire en tant que chatter ?",
          "What do you need to do as a chatter?",
          "Que debes hacer como chatter?",
          "O que voce precisa fazer como chatter?",
          "ماذا عليك أن تفعل كـ chatter؟",
          "Was musst du als Chatter tun?",
          "Что вам нужно делать как chatter?",
          "作为chatter你需要做什么？",
          "Chatter के रूप में आपको क्या करना है?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a",
          text: "Repondre aux appels des clients",
          textTranslations: {
            en: "Answer client calls", es: "Responder llamadas", pt: "Atender chamadas",
            ar: "الرد على مكالمات العملاء", de: "Kundenanrufe beantworten", ru: "Отвечать на звонки",
            zh: "接客户电话", hi: "ग्राहक कॉल का जवाब देना",
          },
        },
        {
          id: "b",
          text: "Partager votre lien avec des expatries",
          textTranslations: {
            en: "Share your link with expats", es: "Compartir tu enlace con expatriados",
            pt: "Compartilhar seu link com expatriados", ar: "مشاركة رابطك مع المغتربين",
            de: "Deinen Link mit Expats teilen", ru: "Делиться ссылкой с экспатами",
            zh: "与外籍人士分享你的链接", hi: "प्रवासियों के साथ अपना लिंक शेयर करना",
          },
        },
        {
          id: "c",
          text: "Creer des articles de blog",
          textTranslations: {
            en: "Create blog articles", es: "Crear articulos de blog", pt: "Criar artigos de blog",
            ar: "كتابة مقالات مدونة", de: "Blog-Artikel erstellen", ru: "Создавать статьи для блога",
            zh: "创建博客文章", hi: "ब्लॉग लेख बनाना",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Votre seule mission : partager votre lien. Le reste (appels, paiements) est automatique !",
          "Your only mission: share your link. Everything else (calls, payments) is automatic!",
          "Tu unica mision: compartir tu enlace. Todo lo demas es automatico!",
          "Sua unica missao: compartilhar seu link. O resto e automatico!",
          "مهمتك الوحيدة: مشاركة رابطك. الباقي تلقائي!",
          "Deine einzige Mission: deinen Link teilen. Der Rest ist automatisch!",
          "Ваша единственная задача: делиться ссылкой. Остальное автоматически!",
          "你唯一的任务：分享你的链接。其他一切都是自动的！",
          "आपका एकमात्र काम: अपना लिंक शेयर करना। बाकी सब ऑटोमैटिक!"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
  ],
  createdBy: "system",
  createdAt: now(),
  updatedAt: now(),
};

// ============================================================================
// MODULE 3: Ou et comment partager
// ============================================================================
const module3 = {
  order: 3,
  status: "published",
  category: "promotion",
  estimatedMinutes: 7,
  isRequired: true,
  prerequisites: [],
  coverImageUrl: "",
  passingScore: 70,
  ...(() => {
    const title = t(
      "Ou et comment partager ?",
      "Where & how to share?",
      "Donde y como compartir?",
      "Onde e como compartilhar?",
      "اين وكيف تشارك؟",
      "Wo und wie teilen?",
      "Где и как делиться?",
      "在哪里以及如何分享？",
      "कहाँ और कैसे शेयर करें?"
    );
    const desc = t(
      "Les meilleurs endroits et les bonnes pratiques !",
      "Best places and best practices!",
      "Los mejores lugares y buenas practicas!",
      "Os melhores lugares e boas praticas!",
      "أفضل الأماكن والممارسات!",
      "Die besten Orte und Praktiken!",
      "Лучшие места и практики!",
      "最佳地点和最佳实践！",
      "सबसे अच्छी जगहें और तरीके!"
    );
    return {
      title: title.value, titleTranslations: title.translations,
      description: desc.value, descriptionTranslations: desc.translations,
    };
  })(),
  slides: [
    {
      order: 0,
      type: "checklist",
      ...(() => {
        const title = t(
          "Les meilleurs endroits",
          "Best places to share",
          "Los mejores lugares",
          "Os melhores lugares",
          "أفضل الأماكن",
          "Die besten Orte",
          "Лучшие места",
          "最佳分享地点",
          "सबसे अच्छी जगहें"
        );
        const content = t(
          "Partagez la ou les expats POSENT des questions :",
          "Share where expats ASK questions:",
          "Comparte donde los expats HACEN preguntas:",
          "Compartilhe onde os expats FAZEM perguntas:",
          "شارك حيث يطرح المغتربون أسئلة:",
          "Teile dort wo Expats FRAGEN stellen:",
          "Делитесь там где экспаты ЗАДАЮТ вопросы:",
          "在外籍人士提问的地方分享：",
          "वहाँ शेयर करें जहाँ प्रवासी सवाल पूछते हैं："
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          checklistItems: [
            {
              text: "Groupes Facebook d'expatries (\"Francais a Dubai\", \"Expats in Germany\"...)",
              textTranslations: {
                en: "Expat Facebook groups (\"French in Dubai\", \"Expats in Germany\"...)",
                es: "Grupos Facebook de expatriados", pt: "Grupos Facebook de expatriados",
                ar: "مجموعات فيسبوك للمغتربين", de: "Expat-Facebook-Gruppen",
                ru: "Facebook-группы экспатов", zh: "外籍人士Facebook群组", hi: "प्रवासी Facebook ग्रुप",
              },
            },
            {
              text: "Groupes WhatsApp & Telegram de communautes",
              textTranslations: {
                en: "Community WhatsApp & Telegram groups", es: "Grupos WhatsApp y Telegram",
                pt: "Grupos WhatsApp e Telegram", ar: "مجموعات واتساب وتلغرام",
                de: "Community WhatsApp- & Telegram-Gruppen", ru: "Группы WhatsApp и Telegram",
                zh: "社区WhatsApp和Telegram群", hi: "समुदाय WhatsApp और Telegram ग्रुप",
              },
            },
            {
              text: "Forums : Reddit, InterNations, Expat.com",
              textTranslations: {
                en: "Forums: Reddit, InterNations, Expat.com", es: "Foros: Reddit, InterNations, Expat.com",
                pt: "Forums: Reddit, InterNations, Expat.com", ar: "منتديات: Reddit, InterNations, Expat.com",
                de: "Foren: Reddit, InterNations, Expat.com", ru: "Форумы: Reddit, InterNations, Expat.com",
                zh: "论坛：Reddit, InterNations, Expat.com", hi: "फोरम: Reddit, InterNations, Expat.com",
              },
            },
            {
              text: "Vos propres reseaux : amis, famille, connaissances",
              textTranslations: {
                en: "Your own networks: friends, family, acquaintances", es: "Tus propias redes: amigos, familia",
                pt: "Suas proprias redes: amigos, familia", ar: "شبكاتك الخاصة: أصدقاء، عائلة",
                de: "Dein eigenes Netzwerk: Freunde, Familie", ru: "Ваши сети: друзья, семья",
                zh: "你自己的网络：朋友、家人", hi: "आपके अपने नेटवर्क: दोस्त, परिवार",
              },
            },
          ],
        };
      })(),
    },
    {
      order: 1,
      type: "text",
      ...(() => {
        const title = t(
          "Le message parfait",
          "The perfect message",
          "El mensaje perfecto",
          "A mensagem perfeita",
          "الرسالة المثالية",
          "Die perfekte Nachricht",
          "Идеальное сообщение",
          "完美的消息",
          "सही संदेश"
        );
        const content = t(
          "Un bon message, c'est :\n\n" +
          "COURT (2-3 phrases max)\n" +
          "UTILE (il aide quelqu'un)\n" +
          "NATUREL (pas de pub agressive)\n\n" +
          "Exemple :\n" +
          "\"Hey ! Si tu cherches un avocat pour tes papiers, j'ai decouvert ce service ou tu appelles directement un pro. Tiens : [ton lien]\"\n\n" +
          "A EVITER :\n" +
          "\"Inscris-toi sur ce lien je gagne de l'argent svp\"",

          "A good message is:\n\n" +
          "SHORT (2-3 sentences max)\n" +
          "HELPFUL (it helps someone)\n" +
          "NATURAL (no aggressive ads)\n\n" +
          "Example:\n" +
          "\"Hey! If you need a lawyer for your paperwork, I found this service where you call a pro directly. Here: [your link]\"\n\n" +
          "AVOID:\n" +
          "\"Sign up on this link I make money please\"",

          "Un buen mensaje es:\n\nCORTO (2-3 frases max)\nUTIL (ayuda a alguien)\nNATURAL (sin publicidad agresiva)\n\nEjemplo:\n\"Oye! Si necesitas un abogado, encontre este servicio. Mira: [tu enlace]\"\n\nEVITAR:\n\"Registrate en este enlace para que yo gane dinero\"",
          "Uma boa mensagem e:\n\nCURTA (2-3 frases max)\nUTIL (ajuda alguem)\nNATURAL (sem publicidade agressiva)\n\nExemplo:\n\"Oi! Se voce precisa de um advogado, encontrei esse servico. Olha: [seu link]\"\n\nEVITAR:\n\"Se inscreva nesse link pra eu ganhar dinheiro\"",
          "الرسالة الجيدة:\n\nقصيرة (2-3 جمل)\nمفيدة (تساعد شخصاً)\nطبيعية (بدون إعلانات مزعجة)\n\nمثال:\n\"مرحباً! إذا تحتاج محامي، وجدت هذه الخدمة. تفضل: [رابطك]\"\n\nتجنب:\n\"سجل من هذا الرابط عشان أكسب فلوس\"",
          "Eine gute Nachricht ist:\n\nKURZ (2-3 Saetze max)\nHILFREICH (sie hilft jemandem)\nNATUERLICH (keine aggressive Werbung)\n\nBeispiel:\n\"Hey! Wenn du einen Anwalt brauchst, hab ich diesen Service gefunden. Hier: [dein Link]\"\n\nVERMEIDE:\n\"Meld dich an damit ich Geld verdiene\"",
          "Хорошее сообщение:\n\nКОРОТКОЕ (2-3 предложения)\nПОЛЕЗНОЕ (помогает кому-то)\nЕСТЕСТВЕННОЕ (без агрессивной рекламы)\n\nПример:\n\"Привет! Нужен юрист? Нашёл сервис где можно позвонить напрямую. Вот: [ваша ссылка]\"\n\nИЗБЕГАЙТЕ:\n\"Зарегистрируйся по ссылке чтобы я заработал\"",
          "好消息应该是：\n\n短（最多2-3句）\n有用（帮助别人）\n自然（没有强硬广告）\n\n示例：\n\"嘿！如果你需要律师办手续，我发现了这个服务。看看：[你的链接]\"\n\n避免：\n\"注册这个链接让我赚钱\"",
          "अच्छा संदेश:\n\nछोटा (2-3 वाक्य)\nउपयोगी (किसी की मदद करे)\nस्वाभाविक (आक्रामक विज्ञापन नहीं)\n\nउदाहरण:\n\"अरे! अगर वकील चाहिए तो मैंने ये सर्विस देखी। देख: [आपका लिंक]\"\n\nबचें:\n\"इस लिंक से रजिस्टर करो मुझे पैसे मिलेंगे\""
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
        };
      })(),
    },
    {
      order: 2,
      type: "tips",
      ...(() => {
        const title = t(
          "Les regles d'or",
          "Golden rules",
          "Reglas de oro",
          "Regras de ouro",
          "القواعد الذهبية",
          "Goldene Regeln",
          "Золотые правила",
          "黄金法则",
          "सुनहरे नियम"
        );
        const content = t("", "", "", "", "", "", "", "", "");
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          tips: [
            {
              text: "Ne spammez JAMAIS. Un message par groupe suffit",
              textTranslations: {
                en: "NEVER spam. One message per group is enough",
                es: "NUNCA hagas spam. Un mensaje por grupo basta",
                pt: "NUNCA faca spam. Uma mensagem por grupo basta",
                ar: "لا ترسل رسائل مزعجة أبداً. رسالة واحدة لكل مجموعة",
                de: "NIEMALS spammen. Eine Nachricht pro Gruppe reicht",
                ru: "НИКОГДА не спамьте. Одного сообщения на группу достаточно",
                zh: "绝不发垃圾信息。每个群一条消息就够了",
                hi: "कभी स्पैम न करें। एक ग्रुप में एक मैसेज काफ़ी है",
              },
            },
            {
              text: "Repondez aux questions AVANT de poster votre lien",
              textTranslations: {
                en: "Answer questions BEFORE posting your link",
                es: "Responde preguntas ANTES de publicar tu enlace",
                pt: "Responda perguntas ANTES de postar seu link",
                ar: "أجب على الأسئلة قبل نشر رابطك",
                de: "Beantworte Fragen BEVOR du deinen Link postest",
                ru: "Отвечайте на вопросы ПЕРЕД публикацией ссылки",
                zh: "回答问题后再发链接",
                hi: "लिंक डालने से पहले सवालों का जवाब दें",
              },
            },
            {
              text: "Soyez regulier : 15-30 min/jour = resultats !",
              textTranslations: {
                en: "Be consistent: 15-30 min/day = results!",
                es: "Se constante: 15-30 min/dia = resultados!",
                pt: "Seja consistente: 15-30 min/dia = resultados!",
                ar: "كن منتظماً: 15-30 دقيقة/يوم = نتائج!",
                de: "Sei regelmaessig: 15-30 Min/Tag = Ergebnisse!",
                ru: "Будьте регулярны: 15-30 мин/день = результаты!",
                zh: "保持规律：每天15-30分钟=成果！",
                hi: "नियमित रहें: 15-30 मिनट/दिन = नतीजे!",
              },
            },
          ],
        };
      })(),
    },
  ],
  quizQuestions: [
    {
      id: "m3q1",
      ...(() => {
        const q = t(
          "Quel est le meilleur endroit pour partager ?",
          "What's the best place to share?",
          "Cual es el mejor lugar para compartir?",
          "Qual e o melhor lugar para compartilhar?",
          "ما أفضل مكان للمشاركة؟",
          "Wo teilt man am besten?",
          "Где лучше всего делиться?",
          "最好在哪里分享？",
          "शेयर करने की सबसे अच्छी जगह?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a",
          text: "Des groupes de recettes de cuisine",
          textTranslations: {
            en: "Cooking recipe groups", es: "Grupos de recetas", pt: "Grupos de receitas",
            ar: "مجموعات وصفات الطبخ", de: "Kochrezept-Gruppen", ru: "Группы с рецептами",
            zh: "烹饪食谱群", hi: "खाना पकाने के ग्रुप",
          },
        },
        {
          id: "b",
          text: "Des groupes ou les expats posent des questions (visa, admin...)",
          textTranslations: {
            en: "Groups where expats ask questions (visa, admin...)",
            es: "Grupos donde los expats preguntan (visa, tramites...)",
            pt: "Grupos onde expats perguntam (visto, admin...)",
            ar: "مجموعات يطرح فيها المغتربون أسئلة",
            de: "Gruppen wo Expats Fragen stellen (Visum, Admin...)",
            ru: "Группы где экспаты задают вопросы (виза, документы...)",
            zh: "外籍人士提问的群（签证、行政...）",
            hi: "ग्रुप जहाँ प्रवासी सवाल पूछते हैं (वीज़ा, एडमिन...)",
          },
        },
        {
          id: "c",
          text: "N'importe ou, le plus de groupes possible",
          textTranslations: {
            en: "Anywhere, as many groups as possible", es: "Donde sea, cuantos mas grupos mejor",
            pt: "Em qualquer lugar, quantos mais grupos melhor", ar: "في أي مكان، أكبر عدد من المجموعات",
            de: "Ueberall, so viele Gruppen wie moeglich", ru: "Везде, в как можно больше групп",
            zh: "任何地方，越多群越好", hi: "कहीं भी, जितने ज़्यादा ग्रुप हो सके",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Ciblez les groupes d'expatries ou les gens posent des questions concretes. Qualite > Quantite !",
          "Target expat groups where people ask concrete questions. Quality > Quantity!",
          "Apunta a grupos donde preguntan cosas concretas. Calidad > Cantidad!",
          "Mire grupos onde perguntam coisas concretas. Qualidade > Quantidade!",
          "استهدف مجموعات المغتربين التي تُطرح فيها أسئلة. الجودة > الكمية!",
          "Ziele auf Gruppen wo konkrete Fragen gestellt werden. Qualitaet > Quantitaet!",
          "Нацельтесь на группы где задают конкретные вопросы. Качество > Количество!",
          "瞄准提出具体问题的群。质量 > 数量！",
          "वो ग्रुप चुनें जहाँ लोग असली सवाल पूछते हैं। गुणवत्ता > मात्रा!"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
    {
      id: "m3q2",
      ...(() => {
        const q = t(
          "Quel message est le plus efficace ?",
          "Which message is most effective?",
          "Que mensaje es mas efectivo?",
          "Qual mensagem e mais eficaz?",
          "أي رسالة أكثر فعالية؟",
          "Welche Nachricht ist am effektivsten?",
          "Какое сообщение самое эффективное?",
          "哪条消息最有效？",
          "कौन सा संदेश सबसे प्रभावी है?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a",
          text: "\"Clique sur mon lien stp j'ai besoin d'argent\"",
          textTranslations: {
            en: "\"Click my link please I need money\"", es: "\"Haz clic en mi enlace necesito dinero\"",
            pt: "\"Clica no meu link preciso de dinheiro\"", ar: "\"اضغط على رابطي أحتاج المال\"",
            de: "\"Klick meinen Link bitte ich brauche Geld\"", ru: "\"Кликни по ссылке мне нужны деньги\"",
            zh: "\"点我链接我需要钱\"", hi: "\"मेरे लिंक पर क्लिक करो मुझे पैसे चाहिए\"",
          },
        },
        {
          id: "b",
          text: "\"Tu galeres avec tes papiers ? J'ai trouve ce service, tu appelles un pro direct : [lien]\"",
          textTranslations: {
            en: "\"Struggling with paperwork? I found this service, you call a pro directly: [link]\"",
            es: "\"Tienes problemas con tus papeles? Encontre este servicio: [enlace]\"",
            pt: "\"Problemas com papelada? Encontrei esse servico: [link]\"",
            ar: "\"تعاني من الأوراق؟ وجدت هذه الخدمة: [رابط]\"",
            de: "\"Probleme mit dem Papierkram? Hab diesen Service gefunden: [Link]\"",
            ru: "\"Проблемы с документами? Нашёл этот сервис: [ссылка]\"",
            zh: "\"手续有困难？我发现了这个服务：[链接]\"",
            hi: "\"कागज़ात से परेशान? मैंने ये सर्विस पाई: [लिंक]\"",
          },
        },
        {
          id: "c",
          text: "Un message de 500 mots expliquant tout le fonctionnement",
          textTranslations: {
            en: "A 500-word message explaining everything", es: "Un mensaje de 500 palabras explicandolo todo",
            pt: "Uma mensagem de 500 palavras explicando tudo", ar: "رسالة من 500 كلمة تشرح كل شيء",
            de: "Eine 500-Woerter-Nachricht die alles erklaert", ru: "Сообщение на 500 слов всё объясняющее",
            zh: "一条500字的消息解释一切", hi: "500 शब्दों का मैसेज सब कुछ समझाते हुए",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Court, utile, naturel. Aidez d'abord, partagez votre lien ensuite !",
          "Short, helpful, natural. Help first, share your link second!",
          "Corto, util, natural. Ayuda primero, comparte tu enlace despues!",
          "Curto, util, natural. Ajude primeiro, compartilhe o link depois!",
          "قصير، مفيد، طبيعي. ساعد أولاً، شارك رابطك ثانياً!",
          "Kurz, hilfreich, natuerlich. Erst helfen, dann Link teilen!",
          "Коротко, полезно, естественно. Сначала помогите, потом ссылку!",
          "简短、有用、自然。先帮忙，再分享链接！",
          "छोटा, उपयोगी, स्वाभाविक। पहले मदद करें, फिर लिंक शेयर करें!"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
  ],
  createdBy: "system",
  createdAt: now(),
  updatedAt: now(),
};

// ============================================================================
// MODULE 4: Votre Dashboard
// ============================================================================
const module4 = {
  order: 4,
  status: "published",
  category: "best_practices",
  estimatedMinutes: 5,
  isRequired: true,
  prerequisites: [],
  coverImageUrl: "",
  passingScore: 70,
  ...(() => {
    const title = t(
      "Votre Dashboard",
      "Your Dashboard",
      "Tu Panel",
      "Seu Painel",
      "لوحة التحكم",
      "Dein Dashboard",
      "Ваша панель",
      "你的仪表板",
      "आपका डैशबोर्ड"
    );
    const desc = t(
      "Maitrisez votre espace chatter en 5 min !",
      "Master your chatter space in 5 min!",
      "Domina tu espacio chatter en 5 min!",
      "Domine seu espaco chatter em 5 min!",
      "أتقن مساحة الـ chatter في 5 دقائق!",
      "Meistere deinen Chatter-Bereich in 5 Min!",
      "Освойте панель chatter за 5 минут!",
      "5分钟掌握你的chatter空间！",
      "5 मिनट में अपना chatter स्पेस सीखें!"
    );
    return {
      title: title.value, titleTranslations: title.translations,
      description: desc.value, descriptionTranslations: desc.translations,
    };
  })(),
  slides: [
    {
      order: 0,
      type: "checklist",
      ...(() => {
        const title = t(
          "Ce que vous voyez dans votre dashboard",
          "What you see in your dashboard",
          "Lo que ves en tu panel",
          "O que voce ve no seu painel",
          "ما تراه في لوحتك",
          "Was du in deinem Dashboard siehst",
          "Что вы видите в панели",
          "你在仪表板中看到什么",
          "डैशबोर्ड में आप क्या देखते हैं"
        );
        const content = t("", "", "", "", "", "", "", "", "");
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          checklistItems: [
            {
              text: "Vos liens (client + recrutement) a copier en 1 clic",
              textTranslations: {
                en: "Your links (client + recruitment) to copy in 1 click",
                es: "Tus enlaces para copiar en 1 clic", pt: "Seus links para copiar em 1 clique",
                ar: "روابطك لنسخها بنقرة واحدة", de: "Deine Links zum Kopieren mit 1 Klick",
                ru: "Ваши ссылки для копирования в 1 клик", zh: "一键复制你的链接",
                hi: "1 क्लिक में कॉपी करने के लिए आपके लिंक",
              },
            },
            {
              text: "Votre tirelire : combien vous avez gagne",
              textTranslations: {
                en: "Your piggy bank: how much you've earned", es: "Tu alcancia: cuanto has ganado",
                pt: "Seu cofrinho: quanto voce ganhou", ar: "حصالتك: كم كسبت",
                de: "Dein Sparschwein: wie viel du verdient hast", ru: "Ваша копилка: сколько вы заработали",
                zh: "你的存钱罐：赚了多少", hi: "आपकी गुल्लक: कितना कमाया",
              },
            },
            {
              text: "Vos stats : clics, appels, conversions",
              textTranslations: {
                en: "Your stats: clicks, calls, conversions", es: "Tus estadisticas: clics, llamadas, conversiones",
                pt: "Suas stats: cliques, chamadas, conversoes", ar: "إحصائياتك: نقرات، مكالمات، تحويلات",
                de: "Deine Stats: Klicks, Anrufe, Konversionen", ru: "Ваша статистика: клики, звонки, конверсии",
                zh: "你的数据：点击、通话、转化", hi: "आपके आँकड़े: क्लिक, कॉल, कन्वर्ज़न",
              },
            },
            {
              text: "Demande de retrait : recuperez votre argent !",
              textTranslations: {
                en: "Withdrawal request: get your money!", es: "Solicitud de retiro: recupera tu dinero!",
                pt: "Pedido de saque: pegue seu dinheiro!", ar: "طلب سحب: استلم أموالك!",
                de: "Auszahlung beantragen: hol dir dein Geld!", ru: "Запрос на вывод: получите свои деньги!",
                zh: "提款请求：拿到你的钱！", hi: "निकासी अनुरोध: अपना पैसा पाएं!",
              },
            },
          ],
        };
      })(),
    },
    {
      order: 1,
      type: "tips",
      ...(() => {
        const title = t(
          "Astuces pro",
          "Pro tips",
          "Consejos pro",
          "Dicas pro",
          "نصائح احترافية",
          "Profi-Tipps",
          "Профессиональные советы",
          "专业技巧",
          "प्रो टिप्स"
        );
        const content = t("", "", "", "", "", "", "", "", "");
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          tips: [
            {
              text: "Consultez vos stats chaque jour pour voir ce qui marche",
              textTranslations: {
                en: "Check your stats daily to see what works", es: "Revisa tus stats diariamente",
                pt: "Confira suas stats diariamente", ar: "تحقق من إحصائياتك يومياً",
                de: "Pruefe taeglich deine Stats", ru: "Проверяйте статистику каждый день",
                zh: "每天查看数据了解效果", hi: "रोज़ अपने आँकड़े देखें",
              },
            },
            {
              text: "Retrait possible a partir de $30 (frais : $3)",
              textTranslations: {
                en: "Withdrawal from $30 (fee: $3)", es: "Retiro desde $30 (comision: $3)",
                pt: "Saque a partir de $30 (taxa: $3)", ar: "سحب من 30$ (رسوم: 3$)",
                de: "Auszahlung ab $30 (Gebuehr: $3)", ru: "Вывод от $30 (комиссия: $3)",
                zh: "满$30可提款（手续费$3）", hi: "$30 से निकासी (शुल्क: $3)",
              },
            },
            {
              text: "Recrutez d'autres chatters pour des revenus passifs !",
              textTranslations: {
                en: "Recruit other chatters for passive income!", es: "Recluta otros chatters para ingresos pasivos!",
                pt: "Recrute outros chatters para renda passiva!", ar: "جنّد chatters آخرين لدخل سلبي!",
                de: "Rekrutiere andere Chatter fuer passives Einkommen!", ru: "Рекрутируйте других chatter для пассивного дохода!",
                zh: "招募其他chatter获取被动收入！", hi: "पैसिव इनकम के लिए और chatters भर्ती करें!",
              },
            },
          ],
        };
      })(),
    },
  ],
  quizQuestions: [
    {
      id: "m4q1",
      ...(() => {
        const q = t(
          "A partir de combien pouvez-vous demander un retrait ?",
          "What's the minimum amount for a withdrawal?",
          "Cual es el monto minimo para un retiro?",
          "Qual e o valor minimo para um saque?",
          "ما الحد الأدنى لطلب السحب؟",
          "Ab welchem Betrag kann man eine Auszahlung beantragen?",
          "Какая минимальная сумма для вывода?",
          "最低提款金额是多少？",
          "न्यूनतम निकासी राशि कितनी है?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a", text: "$10",
          textTranslations: { en: "$10", es: "$10", pt: "$10", ar: "10$", de: "$10", ru: "$10", zh: "$10", hi: "$10" },
        },
        {
          id: "b", text: "$30",
          textTranslations: { en: "$30", es: "$30", pt: "$30", ar: "30$", de: "$30", ru: "$30", zh: "$30", hi: "$30" },
        },
        {
          id: "c", text: "$100",
          textTranslations: { en: "$100", es: "$100", pt: "$100", ar: "100$", de: "$100", ru: "$100", zh: "$100", hi: "$100" },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Le seuil minimum de retrait est de $30 avec $3 de frais de traitement.",
          "Minimum withdrawal is $30 with a $3 processing fee.",
          "El retiro minimo es de $30 con $3 de tarifa.", "O saque minimo e $30 com $3 de taxa.",
          "الحد الأدنى للسحب 30$ مع رسوم 3$.", "Mindestauszahlung $30 mit $3 Gebuehr.",
          "Минимальный вывод $30 с комиссией $3.", "最低提款$30，手续费$3。", "न्यूनतम निकासी $30, शुल्क $3।"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
  ],
  createdBy: "system",
  createdAt: now(),
  updatedAt: now(),
};

// ============================================================================
// MODULE 5: Booster ses resultats
// ============================================================================
const module5 = {
  order: 5,
  status: "published",
  category: "conversion",
  estimatedMinutes: 5,
  isRequired: false,
  prerequisites: [],
  coverImageUrl: "",
  passingScore: 70,
  ...(() => {
    const title = t(
      "Booster ses resultats",
      "Boost your results",
      "Mejora tus resultados",
      "Melhore seus resultados",
      "عزز نتائجك",
      "Ergebnisse steigern",
      "Улучшите результаты",
      "提升你的成绩",
      "अपने नतीजे बढ़ाएं"
    );
    const desc = t(
      "Strategies avancees pour gagner plus !",
      "Advanced strategies to earn more!",
      "Estrategias avanzadas para ganar mas!",
      "Estrategias avancadas para ganhar mais!",
      "استراتيجيات متقدمة لكسب المزيد!",
      "Fortgeschrittene Strategien um mehr zu verdienen!",
      "Продвинутые стратегии чтобы зарабатывать больше!",
      "高级策略赚更多！",
      "ज़्यादा कमाने की उन्नत रणनीतियाँ!"
    );
    return {
      title: title.value, titleTranslations: title.translations,
      description: desc.value, descriptionTranslations: desc.translations,
    };
  })(),
  slides: [
    {
      order: 0,
      type: "tips",
      ...(() => {
        const title = t(
          "Le bon timing",
          "Perfect timing",
          "El momento perfecto",
          "O momento perfeito",
          "التوقيت المثالي",
          "Das perfekte Timing",
          "Идеальный момент",
          "完美时机",
          "सही समय"
        );
        const content = t(
          "Partagez au moment ou les gens ont BESOIN d'aide :",
          "Share when people NEED help:",
          "Comparte cuando la gente NECESITA ayuda:",
          "Compartilhe quando as pessoas PRECISAM de ajuda:",
          "شارك عندما يحتاج الناس مساعدة:",
          "Teile wenn Leute HILFE brauchen:",
          "Делитесь когда людям НУЖНА помощь:",
          "在人们需要帮助时分享：",
          "जब लोगों को मदद चाहिए तब शेयर करें："
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
          tips: [
            {
              text: "Quelqu'un demande \"connaissez-vous un avocat ?\" = partagez !",
              textTranslations: {
                en: "Someone asks \"do you know a lawyer?\" = share!",
                es: "Alguien pregunta \"conocen un abogado?\" = comparte!",
                pt: "Alguem pergunta \"conhecem um advogado?\" = compartilhe!",
                ar: "شخص يسأل \"هل تعرفون محامي؟\" = شارك!",
                de: "Jemand fragt \"kennt ihr einen Anwalt?\" = teile!",
                ru: "Кто-то спрашивает \"знаете юриста?\" = делитесь!",
                zh: "有人问\"你认识律师吗？\"= 分享！",
                hi: "कोई पूछे \"वकील जानते हो?\" = शेयर करें!",
              },
            },
            {
              text: "Debut de saison scolaire, renouvellement de visa = periodes chaudes !",
              textTranslations: {
                en: "School season start, visa renewal = hot periods!",
                es: "Inicio escolar, renovacion de visa = periodos calientes!",
                pt: "Inicio escolar, renovacao de visto = periodos quentes!",
                ar: "بداية العام الدراسي، تجديد التأشيرة = فترات حارة!",
                de: "Schulanfang, Visum-Erneuerung = heisse Phasen!",
                ru: "Начало учебного года, продление визы = горячие периоды!",
                zh: "开学季、签证续签 = 热门时期！",
                hi: "स्कूल सीज़न, वीज़ा रिन्यूअल = हॉट पीरियड!",
              },
            },
            {
              text: "Le soir et le weekend = plus de clics !",
              textTranslations: {
                en: "Evenings and weekends = more clicks!",
                es: "Noches y fines de semana = mas clics!",
                pt: "Noites e fins de semana = mais cliques!",
                ar: "المساء وعطلة نهاية الأسبوع = نقرات أكثر!",
                de: "Abends und am Wochenende = mehr Klicks!",
                ru: "Вечера и выходные = больше кликов!",
                zh: "晚上和周末 = 更多点击！",
                hi: "शाम और वीकेंड = ज़्यादा क्लिक!",
              },
            },
          ],
        };
      })(),
    },
    {
      order: 1,
      type: "text",
      ...(() => {
        const title = t(
          "Le pouvoir du recrutement",
          "The power of recruiting",
          "El poder del reclutamiento",
          "O poder do recrutamento",
          "قوة التوظيف",
          "Die Kraft des Recruitings",
          "Сила рекрутинга",
          "招募的力量",
          "भर्ती की शक्ति"
        );
        const content = t(
          "Imaginez :\n\n" +
          "Vous recrutez 5 chatters.\nChacun genere 10 appels/mois.\n= 50 commissions en PLUS pour vous.\nCHAQUE MOIS. Sans rien faire de plus.\n\n" +
          "C'est ca le vrai game changer.",

          "Imagine:\n\n" +
          "You recruit 5 chatters.\nEach generates 10 calls/month.\n= 50 EXTRA commissions for you.\nEVERY MONTH. Without extra work.\n\n" +
          "That's the real game changer.",

          "Imagina:\n\nReclutas 5 chatters.\nCada uno genera 10 llamadas/mes.\n= 50 comisiones EXTRA para ti.\nCADA MES. Sin trabajo extra.\n\nEso cambia el juego.",
          "Imagine:\n\nVoce recruta 5 chatters.\nCada um gera 10 chamadas/mes.\n= 50 comissoes EXTRAS para voce.\nTODO MES. Sem trabalho extra.\n\nIsso muda o jogo.",
          "تخيل:\n\nتجند 5 chatters.\nكل واحد يولد 10 مكالمات/شهر.\n= 50 عمولة إضافية لك.\nكل شهر. بدون عمل إضافي.\n\nهذا يغير اللعبة.",
          "Stell dir vor:\n\nDu rekrutierst 5 Chatter.\nJeder generiert 10 Anrufe/Monat.\n= 50 EXTRA Provisionen fuer dich.\nJEDEN MONAT. Ohne Mehrarbeit.\n\nDas ist der Game Changer.",
          "Представьте:\n\nВы набираете 5 chatter.\nКаждый генерирует 10 звонков/месяц.\n= 50 ДОПОЛНИТЕЛЬНЫХ комиссий для вас.\nКАЖДЫЙ МЕСЯЦ. Без лишней работы.\n\nВот что меняет игру.",
          "想象一下：\n\n你招募5个chatter。\n每人每月产生10个通话。\n= 每月多50个佣金。\n不需要额外工作。\n\n这才是真正的改变。",
          "सोचिए:\n\nआप 5 chatters भर्ती करें।\nहर एक 10 कॉल/महीना करे।\n= आपके लिए 50 अतिरिक्त कमीशन।\nहर महीने। बिना अतिरिक्त काम।\n\nयही असली गेम चेंजर है।"
        );
        return {
          title: title.value, titleTranslations: title.translations,
          content: content.value, contentTranslations: content.translations,
        };
      })(),
    },
  ],
  quizQuestions: [
    {
      id: "m5q1",
      ...(() => {
        const q = t(
          "Pourquoi recruter d'autres chatters ?",
          "Why recruit other chatters?",
          "Por que reclutar otros chatters?",
          "Por que recrutar outros chatters?",
          "لماذا تجند chatters آخرين؟",
          "Warum andere Chatter rekrutieren?",
          "Зачем рекрутировать других chatter?",
          "为什么要招募其他chatter？",
          "अन्य chatters को क्यों भर्ती करें?"
        );
        return { question: q.value, questionTranslations: q.translations };
      })(),
      options: [
        {
          id: "a",
          text: "Pour avoir moins de travail a faire",
          textTranslations: {
            en: "To have less work to do", es: "Para tener menos trabajo", pt: "Para ter menos trabalho",
            ar: "لتقليل العمل", de: "Um weniger Arbeit zu haben", ru: "Чтобы меньше работать",
            zh: "为了减少工作", hi: "कम काम करने के लिए",
          },
        },
        {
          id: "b",
          text: "Pour gagner des commissions sur leurs appels, chaque mois",
          textTranslations: {
            en: "To earn commissions on their calls, every month",
            es: "Para ganar comisiones de sus llamadas cada mes",
            pt: "Para ganhar comissoes das chamadas deles todo mes",
            ar: "لكسب عمولات من مكالماتهم كل شهر",
            de: "Um jeden Monat Provisionen von deren Anrufen zu verdienen",
            ru: "Чтобы зарабатывать комиссии с их звонков каждый месяц",
            zh: "每月从他们的通话中赚取佣金",
            hi: "हर महीने उनकी कॉल पर कमीशन कमाने के लिए",
          },
        },
        {
          id: "c",
          text: "Pour devenir administrateur de la plateforme",
          textTranslations: {
            en: "To become a platform admin", es: "Para ser administrador", pt: "Para se tornar administrador",
            ar: "لتصبح مدير المنصة", de: "Um Plattform-Admin zu werden", ru: "Чтобы стать админом платформы",
            zh: "成为平台管理员", hi: "प्लेटफ़ॉर्म एडमिन बनने के लिए",
          },
        },
      ],
      correctAnswerId: "b",
      ...(() => {
        const e = t(
          "Chaque appel genere par vos recrues vous rapporte une commission. C'est du revenu passif mensuel !",
          "Each call generated by your recruits earns you a commission. It's monthly passive income!",
          "Cada llamada de tus reclutas te da comision. Es ingreso pasivo mensual!",
          "Cada chamada dos seus recrutas te da comissao. E renda passiva mensal!",
          "كل مكالمة من مجنديك تكسبك عمولة. إنه دخل سلبي شهري!",
          "Jeder Anruf deiner Rekruten bringt dir Provision. Monatliches passives Einkommen!",
          "Каждый звонок ваших рекрутов приносит комиссию. Ежемесячный пассивный доход!",
          "招募的人每次通话都给你佣金。这是每月被动收入！",
          "आपकी भर्ती की हर कॉल पर कमीशन। मासिक पैसिव इनकम!"
        );
        return { explanation: e.value, explanationTranslations: e.translations };
      })(),
    },
  ],
  createdBy: "system",
  createdAt: now(),
  updatedAt: now(),
};

// ============================================================================
// SEED EXECUTION
// ============================================================================
const allModules = [module1, module2, module3, module4, module5];

async function seed() {
  // Check if modules already exist
  const existing = await db.collection("chatter_training_modules").get();
  if (!existing.empty) {
    console.log(`\n⚠️  ${existing.size} modules already exist. Deleting them first...`);
    const batch = db.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log("   Deleted.\n");
  }

  console.log("Seeding 5 chatter training modules (9 languages)...\n");

  for (const mod of allModules) {
    const ref = db.collection("chatter_training_modules").doc();
    await ref.set(mod);
    console.log(`  Module ${mod.order}: "${mod.title}" (${ref.id})`);
  }

  // Ensure chatter_config exists
  const configRef = db.collection("chatter_config").doc("current");
  const configDoc = await configRef.get();
  if (!configDoc.exists) {
    await configRef.set({ trainingEnabled: true, createdAt: now() });
    console.log("\n  chatter_config/current created (trainingEnabled: true)");
  } else {
    const data = configDoc.data();
    if (data.trainingEnabled === undefined || data.trainingEnabled === false) {
      await configRef.update({ trainingEnabled: true });
      console.log("\n  chatter_config/current: trainingEnabled set to true");
    } else {
      console.log("\n  chatter_config/current: already enabled");
    }
  }

  console.log("\nDone! 5 modules seeded.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

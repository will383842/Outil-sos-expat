#!/usr/bin/env node
/**
 * Script pour ajouter les 25 dernières clés manquantes
 * 2 Blogger + 23 Influencer
 */

const fs = require('fs');
const path = require('path');

const translationDir = path.join(__dirname, '../src/helper');
const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

const finalMissingKeys = {
  // ==========================================
  // BLOGGER (2 clés)
  // ==========================================
  "blogger.aria.cta.main": {
    fr: "Devenir Blogger Partenaire",
    en: "Become Partner Blogger",
    es: "Convertirse en Blogger Socio",
    de: "Partner-Blogger Werden",
    pt: "Tornar-se Blogger Parceiro",
    ru: "Стать Партнером-Блогером",
    ch: "成为合作博主",
    hi: "पार्टनर ब्लॉगर बनें",
    ar: "كن مدونًا شريكًا"
  },
  "blogger.hero.scroll": {
    fr: "Découvrir",
    en: "Discover",
    es: "Descubrir",
    de: "Entdecken",
    pt: "Descobrir",
    ru: "Узнать",
    ch: "发现",
    hi: "खोजें",
    ar: "اكتشف"
  },

  // ==========================================
  // INFLUENCER - CONTENT TYPES (16 clés)
  // ==========================================
  "influencer.content.visaguide": {
    fr: "Guide Visa & Immigration",
    en: "Visa & Immigration Guide",
    es: "Guía de Visa e Inmigración",
    de: "Visa- & Immigrationsleitfaden",
    pt: "Guia de Visto e Imigração",
    ru: "Руководство по Визам и Иммиграции",
    ch: "签证和移民指南",
    hi: "वीजा और आप्रवासन गाइड",
    ar: "دليل التأشيرة والهجرة"
  },
  "influencer.content.visaguide.desc": {
    fr: "Comment obtenir un visa, permis de résidence",
    en: "How to get a visa, residence permit",
    es: "Cómo obtener una visa, permiso de residencia",
    de: "Wie man ein Visum, eine Aufenthaltserlaubnis erhält",
    pt: "Como obter um visto, permissão de residência",
    ru: "Как получить визу, вид на жительство",
    ch: "如何获得签证、居留许可",
    hi: "वीजा, निवास परमिट कैसे प्राप्त करें",
    ar: "كيفية الحصول على تأشيرة، تصريح إقامة"
  },

  "influencer.content.qa": {
    fr: "Q&A Juridique",
    en: "Legal Q&A",
    es: "Preguntas y Respuestas Legales",
    de: "Rechtliche Fragen & Antworten",
    pt: "Perguntas e Respostas Jurídicas",
    ru: "Юридические Вопросы и Ответы",
    ch: "法律问答",
    hi: "कानूनी प्रश्नोत्तर",
    ar: "أسئلة وأجوبة قانونية"
  },
  "influencer.content.qa.desc": {
    fr: "Répondre aux questions juridiques courantes",
    en: "Answer common legal questions",
    es: "Responder preguntas legales comunes",
    de: "Häufige rechtliche Fragen beantworten",
    pt: "Responder perguntas jurídicas comuns",
    ru: "Ответы на распространенные юридические вопросы",
    ch: "回答常见法律问题",
    hi: "सामान्य कानूनी सवालों के जवाब दें",
    ar: "الإجابة على الأسئلة القانونية الشائعة"
  },

  "influencer.content.dayinlife": {
    fr: "Day in the Life",
    en: "Day in the Life",
    es: "Un Día en la Vida",
    de: "Ein Tag im Leben",
    pt: "Um Dia na Vida",
    ru: "День из Жизни",
    ch: "生活中的一天",
    hi: "जीवन में एक दिन",
    ar: "يوم في الحياة"
  },
  "influencer.content.dayinlife.desc": {
    fr: "Quotidien d'un expatrié à l'étranger",
    en: "Daily life of an expat abroad",
    es: "Vida diaria de un expatriado en el extranjero",
    de: "Alltag eines Expats im Ausland",
    pt: "Vida diária de um expatriado no exterior",
    ru: "Повседневная жизнь экспата за границей",
    ch: "外派人员在国外的日常生活",
    hi: "विदेश में एक प्रवासी का दैनिक जीवन",
    ar: "الحياة اليومية لمغترب في الخارج"
  },

  "influencer.content.tips": {
    fr: "Conseils Pratiques",
    en: "Practical Tips",
    es: "Consejos Prácticos",
    de: "Praktische Tipps",
    pt: "Dicas Práticas",
    ru: "Практические Советы",
    ch: "实用技巧",
    hi: "व्यावहारिक सुझाव",
    ar: "نصائح عملية"
  },
  "influencer.content.tips.desc": {
    fr: "Astuces pour vivre à l'étranger",
    en: "Tips for living abroad",
    es: "Consejos para vivir en el extranjero",
    de: "Tipps fürs Leben im Ausland",
    pt: "Dicas para viver no exterior",
    ru: "Советы по жизни за границей",
    ch: "海外生活技巧",
    hi: "विदेश में रहने के लिए सुझाव",
    ar: "نصائح للعيش في الخارج"
  },

  "influencer.content.moving": {
    fr: "Déménagement & Installation",
    en: "Moving & Settling In",
    es: "Mudanza e Instalación",
    de: "Umzug & Einleben",
    pt: "Mudança e Instalação",
    ru: "Переезд и Обустройство",
    ch: "搬家和安顿",
    hi: "स्थानांतरण और बसना",
    ar: "الانتقال والاستقرار"
  },
  "influencer.content.moving.desc": {
    fr: "Guide pour s'installer dans un nouveau pays",
    en: "Guide to settling in a new country",
    es: "Guía para establecerse en un nuevo país",
    de: "Leitfaden zum Einleben in einem neuen Land",
    pt: "Guia para se estabelecer em um novo país",
    ru: "Руководство по обустройству в новой стране",
    ch: "在新国家定居指南",
    hi: "नए देश में बसने के लिए गाइड",
    ar: "دليل للاستقرار في بلد جديد"
  },

  "influencer.content.costliving": {
    fr: "Coût de la Vie",
    en: "Cost of Living",
    es: "Costo de Vida",
    de: "Lebenshaltungskosten",
    pt: "Custo de Vida",
    ru: "Стоимость Жизни",
    ch: "生活成本",
    hi: "जीवन यापन की लागत",
    ar: "تكلفة المعيشة"
  },
  "influencer.content.costliving.desc": {
    fr: "Budget mensuel, prix des courses, loyer",
    en: "Monthly budget, grocery prices, rent",
    es: "Presupuesto mensual, precios de comestibles, alquiler",
    de: "Monatliches Budget, Lebensmittelpreise, Miete",
    pt: "Orçamento mensal, preços de compras, aluguel",
    ru: "Месячный бюджет, цены на продукты, аренда",
    ch: "月度预算、杂货价格、租金",
    hi: "मासिक बजट, किराने की कीमतें, किराया",
    ar: "الميزانية الشهرية، أسعار البقالة، الإيجار"
  },

  "influencer.content.emergency": {
    fr: "Situations d'Urgence",
    en: "Emergency Situations",
    es: "Situaciones de Emergencia",
    de: "Notsituationen",
    pt: "Situações de Emergência",
    ru: "Чрезвычайные Ситуации",
    ch: "紧急情况",
    hi: "आपातकालीन स्थितियाँ",
    ar: "حالات الطوارئ"
  },
  "influencer.content.emergency.desc": {
    fr: "Que faire en cas de problème urgent",
    en: "What to do in urgent situations",
    es: "Qué hacer en situaciones urgentes",
    de: "Was in dringenden Situationen zu tun ist",
    pt: "O que fazer em situações urgentes",
    ru: "Что делать в срочных ситуациях",
    ch: "紧急情况下该做什么",
    hi: "तत्काल स्थितियों में क्या करें",
    ar: "ماذا تفعل في الحالات العاجلة"
  },

  "influencer.content.storytime": {
    fr: "Story Time / Expériences",
    en: "Story Time / Experiences",
    es: "Hora del Cuento / Experiencias",
    de: "Geschichten / Erfahrungen",
    pt: "Hora da História / Experiências",
    ru: "Истории / Опыт",
    ch: "故事时间/经验",
    hi: "कहानी का समय / अनुभव",
    ar: "وقت القصة / التجارب"
  },
  "influencer.content.storytime.desc": {
    fr: "Raconter vos expériences personnelles",
    en: "Share your personal experiences",
    es: "Comparte tus experiencias personales",
    de: "Teilen Sie Ihre persönlichen Erfahrungen",
    pt: "Compartilhe suas experiências pessoais",
    ru: "Поделитесь своим личным опытом",
    ch: "分享您的个人经历",
    hi: "अपने व्यक्तिगत अनुभव साझा करें",
    ar: "شارك تجاربك الشخصية"
  },

  // ==========================================
  // INFLUENCER - FAQ (4 clés)
  // ==========================================
  "influencer.faq.q7": {
    fr: "Puis-je promouvoir sur plusieurs plateformes ?",
    en: "Can I promote across multiple platforms?",
    es: "¿Puedo promocionar en varias plataformas?",
    de: "Kann ich auf mehreren Plattformen werben?",
    pt: "Posso promover em várias plataformas?",
    ru: "Могу ли я продвигать на нескольких платформах?",
    ch: "我可以在多个平台上推广吗？",
    hi: "क्या मैं कई प्लेटफार्मों पर प्रचार कर सकता हूं?",
    ar: "هل يمكنني الترويج عبر منصات متعددة؟"
  },
  "influencer.faq.a7": {
    fr: "Oui ! Vous pouvez utiliser votre lien unique sur YouTube, Instagram, TikTok, votre blog, Facebook, Twitter, etc. Plus vous avez de points de contact, plus vous gagnez.",
    en: "Yes! You can use your unique link on YouTube, Instagram, TikTok, your blog, Facebook, Twitter, etc. The more touchpoints, the more you earn.",
    es: "¡Sí! Puede usar su enlace único en YouTube, Instagram, TikTok, su blog, Facebook, Twitter, etc. Cuantos más puntos de contacto, más gana.",
    de: "Ja! Sie können Ihren einzigartigen Link auf YouTube, Instagram, TikTok, Ihrem Blog, Facebook, Twitter usw. verwenden. Je mehr Berührungspunkte, desto mehr verdienen Sie.",
    pt: "Sim! Você pode usar seu link exclusivo no YouTube, Instagram, TikTok, seu blog, Facebook, Twitter, etc. Quanto mais pontos de contato, mais você ganha.",
    ru: "Да! Вы можете использовать свою уникальную ссылку на YouTube, Instagram, TikTok, своем блоге, Facebook, Twitter и т.д. Чем больше точек контакта, тем больше вы зарабатываете.",
    ch: "是的！您可以在YouTube、Instagram、TikTok、您的博客、Facebook、Twitter等上使用您的唯一链接。接触点越多，您赚得越多。",
    hi: "हाँ! आप YouTube, Instagram, TikTok, अपने ब्लॉग, Facebook, Twitter आदि पर अपने अनूठे लिंक का उपयोग कर सकते हैं। अधिक टचपॉइंट, अधिक आप कमाते हैं।",
    ar: "نعم! يمكنك استخدام رابطك الفريد على YouTube و Instagram و TikTok ومدونتك و Facebook و Twitter وما إلى ذلك. كلما زادت نقاط الاتصال، زادت أرباحك."
  },

  "influencer.faq.q8": {
    fr: "Y a-t-il un quota de clients à atteindre ?",
    en: "Is there a client quota to reach?",
    es: "¿Hay una cuota de clientes que alcanzar?",
    de: "Gibt es eine Kundenquote zu erreichen?",
    pt: "Existe uma cota de clientes a atingir?",
    ru: "Есть ли квота клиентов для достижения?",
    ch: "是否有需要达到的客户配额？",
    hi: "क्या पहुंचने के लिए कोई ग्राहक कोटा है?",
    ar: "هل هناك حصة عملاء للوصول إليها؟"
  },
  "influencer.faq.a8": {
    fr: "Non, il n'y a aucun quota. Vous gagnez 10$ par client, peu importe si c'est 1 ou 100 clients par mois. Pas de pression, vous progressez à votre rythme.",
    en: "No, there's no quota. You earn $10 per client, whether it's 1 or 100 clients per month. No pressure, progress at your own pace.",
    es: "No, no hay cuota. Gana $10 por cliente, ya sean 1 o 100 clientes por mes. Sin presión, progrese a su propio ritmo.",
    de: "Nein, es gibt keine Quote. Sie verdienen 10$ pro Kunde, egal ob es 1 oder 100 Kunden pro Monat sind. Kein Druck, arbeiten Sie in Ihrem eigenen Tempo.",
    pt: "Não, não há cota. Você ganha $10 por cliente, seja 1 ou 100 clientes por mês. Sem pressão, progrida no seu próprio ritmo.",
    ru: "Нет, квоты нет. Вы зарабатываете $10 за клиента, будь то 1 или 100 клиентов в месяц. Без давления, работайте в своем темпе.",
    ch: "不，没有配额。无论每月1个还是100个客户，您每个客户赚取10美元。没有压力，按您自己的节奏进展。",
    hi: "नहीं, कोई कोटा नहीं है। आप प्रति ग्राहक $10 कमाते हैं, चाहे वह प्रति माह 1 हो या 100 ग्राहक। कोई दबाव नहीं, अपनी गति से आगे बढ़ें।",
    ar: "لا، لا توجد حصة. تكسب 10 دولارات لكل عميل، سواء كان عميلًا واحدًا أو 100 عميل شهريًا. بدون ضغط، تقدم بوتيرتك الخاصة."
  },

  // ==========================================
  // INFLUENCER - NETWORK (2 clés)
  // ==========================================
  "influencer.network.lawyer": {
    fr: "Avocat",
    en: "Lawyer",
    es: "Abogado",
    de: "Anwalt",
    pt: "Advogado",
    ru: "Адвокат",
    ch: "律师",
    hi: "वकील",
    ar: "محامٍ"
  },
  "influencer.network.helper": {
    fr: "Aidant",
    en: "Helper",
    es: "Ayudante",
    de: "Helfer",
    pt: "Ajudante",
    ru: "Помощник",
    ch: "助手",
    hi: "सहायक",
    ar: "مساعد"
  },

  // ==========================================
  // INFLUENCER - NAVIGATION (1 clé)
  // ==========================================
  "influencer.scroll": {
    fr: "Découvrir",
    en: "Discover",
    es: "Descubrir",
    de: "Entdecken",
    pt: "Descobrir",
    ru: "Узнать",
    ch: "发现",
    hi: "खोजें",
    ar: "اكتشف"
  }
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
function addFinalMissingKeys() {
  console.log('🔧 Ajout des 25 dernières clés manquantes (2 Blogger + 23 Influencer)...\n');

  let totalAdded = 0;

  languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      let added = 0;

      Object.entries(finalMissingKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      fs.writeFileSync(
        filePath,
        JSON.stringify(translations, null, 2) + '\n',
        'utf8'
      );

      console.log(`✅ ${lang.toUpperCase()}: ${added} clés ajoutées`);
      totalAdded += added;

    } catch (error) {
      console.error(`❌ Erreur pour ${lang}.json:`, error.message);
    }
  });

  console.log(`\n✨ Total: ${totalAdded} clés ajoutées`);
  console.log('📦 Blogger: 2 clés (aria + scroll)');
  console.log('📦 Influencer Content: 16 clés (8 types × 2)');
  console.log('📦 Influencer FAQ: 4 clés (q7, q8, a7, a8)');
  console.log('📦 Influencer Network: 2 clés (lawyer, helper)');
  console.log('📦 Influencer Navigation: 1 clé (scroll)');
  console.log('📦 TOTAL: 25 clés × 9 langues = 225 traductions');
}

addFinalMissingKeys();

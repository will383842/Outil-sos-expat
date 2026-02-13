#!/usr/bin/env node
/**
 * Script pour ajouter les 30 clés manquantes identifiées par l'analyse
 * 6 clés Blogger + 24 clés Influencer
 */

const fs = require('fs');
const path = require('path');

const translationDir = path.join(__dirname, '../src/helper');
const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

// ==========================================
// BLOGGER - 6 CLÉS MANQUANTES
// ==========================================
const bloggerMissingKeys = {
  "blogger.hero.hot": {
    fr: "🔥 HOT",
    en: "🔥 HOT",
    es: "🔥 POPULAR",
    de: "🔥 BELIEBT",
    pt: "🔥 QUENTE",
    ru: "🔥 ПОПУЛЯРНО",
    ch: "🔥 热门",
    hi: "🔥 लोकप्रिय",
    ar: "🔥 رائج"
  },
  "blogger.hero.sources": {
    fr: "3 sources de revenus illimitées :",
    en: "3 unlimited revenue sources:",
    es: "3 fuentes de ingresos ilimitadas:",
    de: "3 unbegrenzte Einnahmequellen:",
    pt: "3 fontes de receita ilimitadas:",
    ru: "3 неограниченных источника дохода:",
    ch: "3个无限收入来源：",
    hi: "3 असीमित आय स्रोत:",
    ar: "3 مصادر دخل غير محدودة:"
  },
  "blogger.hero.source1": {
    fr: "par appel lecteur",
    en: "per reader call",
    es: "por llamada de lector",
    de: "pro Leseranruf",
    pt: "por chamada de leitor",
    ru: "за звонок читателя",
    ch: "每次读者通话",
    hi: "प्रति पाठक कॉल",
    ar: "لكل مكالمة قارئ"
  },
  "blogger.hero.source2": {
    fr: "trafic SEO passif",
    en: "passive SEO traffic",
    es: "tráfico SEO pasivo",
    de: "passiver SEO-Traffic",
    pt: "tráfego SEO passivo",
    ru: "пассивный SEO-трафик",
    ch: "被动SEO流量",
    hi: "निष्क्रिय SEO ट्रैफ़िक",
    ar: "حركة مرور SEO سلبية"
  },
  "blogger.hero.source3": {
    fr: "avec 10 partenaires",
    en: "with 10 partners",
    es: "con 10 socios",
    de: "mit 10 Partnern",
    pt: "com 10 parceiros",
    ru: "с 10 партнерами",
    ch: "与10个合作伙伴",
    hi: "10 साझेदारों के साथ",
    ar: "مع 10 شركاء"
  },
  "blogger.hero.partnerExample": {
    fr: "💡 1 partenaire qui reçoit 10 appels/mois = 50€/mois passifs !",
    en: "💡 1 partner receiving 10 calls/month = €50/month passive!",
    es: "💡 1 socio recibiendo 10 llamadas/mes = 50€/mes pasivos!",
    de: "💡 1 Partner mit 10 Anrufen/Monat = 50€/Monat passiv!",
    pt: "💡 1 parceiro recebendo 10 chamadas/mês = 50€/mês passivos!",
    ru: "💡 1 партнер получает 10 звонков/месяц = 50€/месяц пассивно!",
    ch: "💡 1个合作伙伴每月接收10个电话 = 每月50欧元被动收入！",
    hi: "💡 1 साझेदार 10 कॉल/महीना प्राप्त कर रहा है = €50/महीना निष्क्रिय!",
    ar: "💡 شريك واحد يتلقى 10 مكالمات/شهر = 50 يورو/شهر سلبي!"
  }
};

// ==========================================
// INFLUENCER - 24 CLÉS MANQUANTES
// ==========================================
const influencerMissingKeys = {
  // Calculatrice (7 clés)
  "influencer.calculator.title": {
    fr: "Calculez Votre Potentiel",
    en: "Calculate Your Potential",
    es: "Calcule Su Potencial",
    de: "Berechnen Sie Ihr Potenzial",
    pt: "Calcule Seu Potencial",
    ru: "Рассчитайте Свой Потенциал",
    ch: "计算您的潜力",
    hi: "अपनी क्षमता की गणना करें",
    ar: "احسب إمكاناتك"
  },
  "influencer.calculator.subtitle": {
    fr: "Ajustez les curseurs en fonction de votre fréquence de contenu et de votre audience",
    en: "Adjust the sliders based on your content frequency and audience",
    es: "Ajuste los controles según su frecuencia de contenido y audiencia",
    de: "Passen Sie die Regler an Ihre Inhaltsfrequenz und Ihr Publikum an",
    pt: "Ajuste os controles com base na frequência de conteúdo e público",
    ru: "Настройте ползунки в соответствии с частотой контента и аудиторией",
    ch: "根据您的内容频率和受众调整滑块",
    hi: "अपनी सामग्री आवृत्ति और दर्शकों के आधार पर स्लाइडर समायोजित करें",
    ar: "اضبط المنزلقات بناءً على تكرار المحتوى والجمهور"
  },
  "influencer.calculator.result": {
    fr: "Revenus mensuels estimés",
    en: "Estimated monthly earnings",
    es: "Ganancias mensuales estimadas",
    de: "Geschätzte monatliche Einnahmen",
    pt: "Ganhos mensais estimados",
    ru: "Предполагаемый месячный доход",
    ch: "预计月收入",
    hi: "अनुमानित मासिक कमाई",
    ar: "الأرباح الشهرية المقدرة"
  },
  "influencer.calculator.views.label": {
    fr: "vues",
    en: "views",
    es: "vistas",
    de: "Aufrufe",
    pt: "visualizações",
    ru: "просмотры",
    ch: "观看次数",
    hi: "दृश्य",
    ar: "مشاهدات"
  },
  "influencer.calculator.clicks": {
    fr: "clics",
    en: "clicks",
    es: "clics",
    de: "Klicks",
    pt: "cliques",
    ru: "клики",
    ch: "点击次数",
    hi: "क्लिक",
    ar: "نقرات"
  },
  "influencer.calculator.clients": {
    fr: "clients",
    en: "clients",
    es: "clientes",
    de: "Kunden",
    pt: "clientes",
    ru: "клиенты",
    ch: "客户",
    hi: "ग्राहक",
    ar: "عملاء"
  },
  "influencer.calculator.disclaimer": {
    fr: "Les résultats varient selon votre niche, engagement et qualité du contenu. Ceci est une estimation basée sur les moyennes.",
    en: "Results vary depending on your niche, engagement and content quality. This is an estimate based on averages.",
    es: "Los resultados varían según su nicho, participación y calidad del contenido. Esta es una estimación basada en promedios.",
    de: "Die Ergebnisse variieren je nach Nische, Engagement und Inhaltsqualität. Dies ist eine Schätzung auf Basis von Durchschnittswerten.",
    pt: "Os resultados variam de acordo com seu nicho, engajamento e qualidade do conteúdo. Esta é uma estimativa baseada em médias.",
    ru: "Результаты зависят от вашей ниши, вовлеченности и качества контента. Это оценка на основе средних значений.",
    ch: "结果因您的细分市场、参与度和内容质量而异。这是基于平均值的估计。",
    hi: "परिणाम आपके स्थान, जुड़ाव और सामग्री गुणवत्ता के आधार पर भिन्न होते हैं। यह औसत के आधार पर एक अनुमान है।",
    ar: "تختلف النتائج حسب مجالك والمشاركة وجودة المحتوى. هذا تقدير بناءً على المتوسطات."
  },

  // Contenu (3 clés)
  "influencer.content.title": {
    fr: "Les Contenus Qui Convertissent Le Mieux",
    en: "Content That Converts Best",
    es: "Contenido Que Convierte Mejor",
    de: "Inhalte Die Am Besten Konvertieren",
    pt: "Conteúdo Que Converte Melhor",
    ru: "Контент, Который Лучше Всего Конвертирует",
    ch: "转化效果最好的内容",
    hi: "सबसे अच्छी तरह से परिवर्तित होने वाली सामग्री",
    ar: "المحتوى الأفضل تحويلاً"
  },
  "influencer.content.subtitle": {
    fr: "Thèmes qui fonctionnent bien pour les références SOS-Expat",
    en: "Topics that work well for SOS-Expat referrals",
    es: "Temas que funcionan bien para referencias de SOS-Expat",
    de: "Themen, die gut für SOS-Expat-Empfehlungen funktionieren",
    pt: "Tópicos que funcionam bem para referências do SOS-Expat",
    ru: "Темы, которые хорошо работают для рекомендаций SOS-Expat",
    ch: "适合SOS-Expat推荐的主题",
    hi: "SOS-Expat रेफरल के लिए अच्छी तरह से काम करने वाले विषय",
    ar: "المواضيع التي تعمل بشكل جيد لإحالات SOS-Expat"
  },
  "influencer.content.recommended": {
    fr: "Haute conversion !",
    en: "High conversion!",
    es: "¡Alta conversión!",
    de: "Hohe Konversion!",
    pt: "Alta conversão!",
    ru: "Высокая конверсия!",
    ch: "高转化率！",
    hi: "उच्च रूपांतरण!",
    ar: "تحويل عالي!"
  },

  // Profils (3 clés)
  "influencer.profiles.title": {
    fr: "Qui Peut Rejoindre ?",
    en: "Who Can Join?",
    es: "¿Quién Puede Unirse?",
    de: "Wer Kann Beitreten?",
    pt: "Quem Pode Se Juntar?",
    ru: "Кто Может Присоединиться?",
    ch: "谁可以加入？",
    hi: "कौन शामिल हो सकता है?",
    ar: "من يمكنه الانضمام؟"
  },
  "influencer.profiles.subtitle": {
    fr: "YouTubers, Instagrammers, TikTokers et créateurs de contenu d'expatriés",
    en: "YouTubers, Instagrammers, TikTokers and expat content creators",
    es: "YouTubers, Instagrammers, TikTokers y creadores de contenido de expatriados",
    de: "YouTuber, Instagrammer, TikToker und Expat-Content-Ersteller",
    pt: "YouTubers, Instagrammers, TikTokers e criadores de conteúdo expatriado",
    ru: "YouTube-блогеры, Instagram-блогеры, TikTok-блогеры и создатели контента для экспатов",
    ch: "YouTube用户、Instagram用户、TikTok用户和外派内容创作者",
    hi: "YouTubers, Instagrammers, TikTokers और प्रवासी सामग्री निर्माता",
    ar: "مستخدمو YouTube و Instagram و TikTok ومنشئو محتوى المغتربين"
  },
  "influencer.profiles.why.title": {
    fr: "Pourquoi Vos Abonnés Ont Besoin de SOS-Expat",
    en: "Why Your Followers Need SOS-Expat",
    es: "Por Qué Sus Seguidores Necesitan SOS-Expat",
    de: "Warum Ihre Follower SOS-Expat Brauchen",
    pt: "Por Que Seus Seguidores Precisam do SOS-Expat",
    ru: "Почему Вашим Подписчикам Нужен SOS-Expat",
    ch: "为什么您的关注者需要SOS-Expat",
    hi: "आपके फॉलोअर्स को SOS-Expat की आवश्यकता क्यों है",
    ar: "لماذا يحتاج متابعوك إلى SOS-Expat"
  },

  // Étapes (3 clés)
  "influencer.step1.label": {
    fr: "ÉTAPE 1",
    en: "STEP 1",
    es: "PASO 1",
    de: "SCHRITT 1",
    pt: "PASSO 1",
    ru: "ШАГ 1",
    ch: "第1步",
    hi: "चरण 1",
    ar: "الخطوة 1"
  },
  "influencer.step2.label": {
    fr: "ÉTAPE 2",
    en: "STEP 2",
    es: "PASO 2",
    de: "SCHRITT 2",
    pt: "PASSO 2",
    ru: "ШАГ 2",
    ch: "第2步",
    hi: "चरण 2",
    ar: "الخطوة 2"
  },
  "influencer.step3.label": {
    fr: "ÉTAPE 3",
    en: "STEP 3",
    es: "PASO 3",
    de: "SCHRITT 3",
    pt: "PASSO 3",
    ru: "ШАГ 3",
    ch: "第3步",
    hi: "चरण 3",
    ar: "الخطوة 3"
  },

  // Réseau (6 clés)
  "influencer.network.title": {
    fr: "Construisez Votre Réseau, Gagnez Plus",
    en: "Build Your Network, Earn More",
    es: "Construya Su Red, Gane Más",
    de: "Bauen Sie Ihr Netzwerk Auf, Verdienen Sie Mehr",
    pt: "Construa Sua Rede, Ganhe Mais",
    ru: "Создавайте Свою Сеть, Зарабатывайте Больше",
    ch: "建立您的网络，赚取更多",
    hi: "अपना नेटवर्क बनाएं, अधिक कमाएं",
    ar: "بناء شبكتك، كسب المزيد"
  },
  "influencer.network.subtitle": {
    fr: "Recrutez des avocats et assistants expatriés. Gagnez 5€ par appel qu'ils reçoivent pendant 6 mois.",
    en: "Recruit lawyers and expat helpers. Earn €5 per call they receive for 6 months.",
    es: "Reclute abogados y asistentes de expatriados. Gane 5€ por llamada que reciban durante 6 meses.",
    de: "Rekrutieren Sie Anwälte und Expat-Helfer. Verdienen Sie 5€ pro Anruf, den sie 6 Monate lang erhalten.",
    pt: "Recrute advogados e assistentes expatriados. Ganhe 5€ por chamada que eles recebem por 6 meses.",
    ru: "Привлекайте юристов и помощников для экспатов. Зарабатывайте 5€ за звонок, который они получают в течение 6 месяцев.",
    ch: "招募律师和外派助手。他们收到的每个电话在6个月内赚取5欧元。",
    hi: "वकीलों और प्रवासी सहायकों की भर्ती करें। 6 महीने तक उन्हें प्राप्त होने वाली प्रत्येक कॉल के लिए € 5 कमाएं।",
    ar: "قم بتوظيف المحامين ومساعدي المغتربين. اكسب 5 يورو لكل مكالمة يتلقونها لمدة 6 أشهر."
  },
  "influencer.network.you": {
    fr: "VOUS",
    en: "YOU",
    es: "TÚ",
    de: "SIE",
    pt: "VOCÊ",
    ru: "ВЫ",
    ch: "您",
    hi: "आप",
    ar: "أنت"
  },
  "influencer.network.you.earn": {
    fr: "10€/client + 5€/appel des partenaires",
    en: "€10/client + €5/call from partners",
    es: "10€/cliente + 5€/llamada de socios",
    de: "10€/Kunde + 5€/Anruf von Partnern",
    pt: "10€/cliente + 5€/chamada de parceiros",
    ru: "10€/клиент + 5€/звонок от партнеров",
    ch: "每位客户10欧元 + 合作伙伴每次通话5欧元",
    hi: "€10/ग्राहक + साझेदारों से €5/कॉल",
    ar: "10 يورو/عميل + 5 يورو/مكالمة من الشركاء"
  },
  "influencer.network.example": {
    fr: "Exemple : 3 avocats/assistants recevant 10 appels/mois chacun =",
    en: "Example: 3 lawyers/helpers receiving 10 calls/month each =",
    es: "Ejemplo: 3 abogados/asistentes recibiendo 10 llamadas/mes cada uno =",
    de: "Beispiel: 3 Anwälte/Helfer erhalten jeweils 10 Anrufe/Monat =",
    pt: "Exemplo: 3 advogados/assistentes recebendo 10 chamadas/mês cada =",
    ru: "Пример: 3 юриста/помощника получают по 10 звонков/месяц каждый =",
    ch: "示例：3名律师/助手每人每月接收10个电话 =",
    hi: "उदाहरण: 3 वकील/सहायक प्रत्येक 10 कॉल/माह प्राप्त कर रहे हैं =",
    ar: "مثال: 3 محامين/مساعدين يتلقون 10 مكالمات/شهر لكل منهم ="
  },
  "influencer.network.passive": {
    fr: "de revenus passifs pendant 6 mois !",
    en: "passive income for 6 months!",
    es: "ingresos pasivos durante 6 meses!",
    de: "passives Einkommen für 6 Monate!",
    pt: "renda passiva por 6 meses!",
    ru: "пассивного дохода в течение 6 месяцев!",
    ch: "6个月的被动收入！",
    hi: "6 महीने के लिए निष्क्रिय आय!",
    ar: "دخل سلبي لمدة 6 أشهر!"
  },

  // Divers (2 clés)
  "influencer.faq.subtitle": {
    fr: "Tout ce que vous devez savoir",
    en: "Everything you need to know",
    es: "Todo lo que necesita saber",
    de: "Alles, was Sie wissen müssen",
    pt: "Tudo o que você precisa saber",
    ru: "Все, что вам нужно знать",
    ch: "您需要了解的一切",
    hi: "आपको जो कुछ भी जानने की जरूरत है",
    ar: "كل ما تحتاج إلى معرفته"
  },
  "influencer.final.footer": {
    fr: "Inscription gratuite • Commencez en 5 minutes",
    en: "Free registration • Start in 5 minutes",
    es: "Registro gratuito • Comience en 5 minutos",
    de: "Kostenlose Registrierung • Start in 5 Minuten",
    pt: "Cadastro gratuito • Comece em 5 minutos",
    ru: "Бесплатная регистрация • Начните через 5 минут",
    ch: "免费注册 • 5分钟开始",
    hi: "मुफ्त पंजीकरण • 5 मिनट में शुरू करें",
    ar: "تسجيل مجاني • ابدأ في 5 دقائق"
  }
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
function addMissingTranslations() {
  console.log('🔧 Ajout des 30 clés manquantes (6 Blogger + 24 Influencer)...\n');

  let totalAdded = 0;

  languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      let added = 0;

      // Ajouter les clés Blogger manquantes
      Object.entries(bloggerMissingKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      // Ajouter les clés Influencer manquantes
      Object.entries(influencerMissingKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      // Sauvegarder
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
  console.log('📦 Blogger: 6 clés');
  console.log('📦 Influencer: 24 clés');
}

addMissingTranslations();

#!/usr/bin/env node
/**
 * Script de propagation des corrections Blogger & Influencer
 * Corrige "per client" → "per call" et "lawyer/helper" → "lawyer or expat helper"
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;

// Traductions de référence FR
const frTranslations = {
  "blogger.earnings.partner": "Par appel à vos partenaires avocats ou expatriés aidants",
  "blogger.landing.seo.description": "Écrivez des articles sur la vie d'expatrié. Gagnez 10 $ par appel référé, 5 $ par appel à vos partenaires avocats ou expatriés aidants. Modèles, logos et ressources inclus. Retirez via Wise ou PayPal.",
  "influencer.earnings.partner": "Par appel à vos partenaires avocats ou expatriés aidants",
  "influencer.faq.a2": "Ça dépend de la taille de votre audience. 10 appels = $100. 50 appels = $500. Certains influenceurs gagnent $1000-5000/mois en trouvant des partenaires avocats ou expatriés aidants et en gagnant $5 par appel qu'ils reçoivent.",
  "influencer.landing.seo.description": "Faites la promotion de SOS-Expat sur YouTube, Instagram, TikTok. Gagnez $10 par appel référé, $5 par appel à vos partenaires avocats ou expatriés aidants. Outils promo inclus. Retirez via Wise ou PayPal."
};

// Traductions manuelles EN
const enTranslations = {
  "blogger.earnings.partner": "Per call to your lawyer or expat helper partners",
  "blogger.landing.seo.description": "Write articles about expat life. Earn $10 per call, $5 per call to lawyer or expat helper partners. Templates, logos, and resources included. Withdraw via Wise or PayPal.",
  "influencer.earnings.partner": "Per call to your lawyer or expat helper partners",
  "influencer.faq.a2": "It depends on your audience size. 10 calls = $100. 50 calls = $500. Some influencers earn $1000-5000/month by finding lawyer or expat helper partners and earning $5 per call they receive.",
  "influencer.landing.seo.description": "Promote SOS-Expat on YouTube, Instagram, TikTok. Earn $10 per call, $5 per call to lawyer or expat helper partners. Promo tools included. Withdraw via Wise or PayPal."
};

// Traductions manuelles ES
const esTranslations = {
  "blogger.earnings.partner": "Por llamada a tus socios abogados o ayudantes de expatriados",
  "blogger.landing.seo.description": "Escribe artículos sobre la vida de expatriado. Gana $10 por llamada referida, $5 por llamada a tus socios abogados o ayudantes de expatriados. Plantillas, logos y recursos incluidos. Retira vía Wise o PayPal.",
  "influencer.earnings.partner": "Por llamada a tus socios abogados o ayudantes de expatriados",
  "influencer.faq.a2": "Depende del tamaño de tu audiencia. 10 llamadas = $100. 50 llamadas = $500. Algunos influencers ganan $1000-5000/mes encontrando socios abogados o ayudantes de expatriados y ganando $5 por llamada que reciben.",
  "influencer.landing.seo.description": "Promociona SOS-Expat en YouTube, Instagram, TikTok. Gana $10 por llamada referida, $5 por llamada a tus socios abogados o ayudantes de expatriados. Herramientas promo incluidas. Retira vía Wise o PayPal."
};

// Traductions manuelles DE
const deTranslations = {
  "blogger.earnings.partner": "Pro Anruf an Ihre Anwalts- oder Expat-Helfer-Partner",
  "blogger.landing.seo.description": "Schreiben Sie Artikel über das Expat-Leben. Verdienen Sie $10 pro Anruf, $5 pro Anruf an Ihre Anwalts- oder Expat-Helfer-Partner. Vorlagen, Logos und Ressourcen enthalten. Auszahlung über Wise oder PayPal.",
  "influencer.earnings.partner": "Pro Anruf an Ihre Anwalts- oder Expat-Helfer-Partner",
  "influencer.faq.a2": "Es hängt von Ihrer Zielgruppengröße ab. 10 Anrufe = $100. 50 Anrufe = $500. Einige Influencer verdienen $1000-5000/Monat, indem sie Anwalts- oder Expat-Helfer-Partner finden und $5 pro Anruf verdienen, den sie erhalten.",
  "influencer.landing.seo.description": "Bewerben Sie SOS-Expat auf YouTube, Instagram, TikTok. Verdienen Sie $10 pro Anruf, $5 pro Anruf an Ihre Anwalts- oder Expat-Helfer-Partner. Promo-Tools enthalten. Auszahlung über Wise oder PayPal."
};

// Traductions manuelles PT
const ptTranslations = {
  "blogger.earnings.partner": "Por chamada para seus parceiros advogados ou assistentes de expatriados",
  "blogger.landing.seo.description": "Escreva artigos sobre a vida de expatriado. Ganhe $10 por chamada referida, $5 por chamada para seus parceiros advogados ou assistentes de expatriados. Modelos, logos e recursos incluídos. Levante via Wise ou PayPal.",
  "influencer.earnings.partner": "Por chamada para seus parceiros advogados ou assistentes de expatriados",
  "influencer.faq.a2": "Depende do tamanho da sua audiência. 10 chamadas = $100. 50 chamadas = $500. Alguns influencers ganham $1000-5000/mês encontrando parceiros advogados ou assistentes de expatriados e ganhando $5 por chamada que recebem.",
  "influencer.landing.seo.description": "Promova SOS-Expat no YouTube, Instagram, TikTok. Ganhe $10 por chamada referida, $5 por chamada para seus parceiros advogados ou assistentes de expatriados. Ferramentas promo incluídas. Levante via Wise ou PayPal."
};

// Traductions manuelles RU
const ruTranslations = {
  "blogger.earnings.partner": "За звонок вашим партнерам-юристам или помощникам экспатов",
  "blogger.landing.seo.description": "Пишите статьи о жизни экспатов. Зарабатывайте $10 за звонок, $5 за звонок вашим партнерам-юристам или помощникам экспатов. Шаблоны, логотипы и ресурсы включены. Вывод через Wise или PayPal.",
  "influencer.earnings.partner": "За звонок вашим партнерам-юристам или помощникам экспатов",
  "influencer.faq.a2": "Это зависит от размера вашей аудитории. 10 звонков = $100. 50 звонков = $500. Некоторые инфлюенсеры зарабатывают $1000-5000/месяц, находя партнеров-юристов или помощников экспатов и зарабатывая $5 за каждый звонок, который они получают.",
  "influencer.landing.seo.description": "Продвигайте SOS-Expat на YouTube, Instagram, TikTok. Зарабатывайте $10 за звонок, $5 за звонок вашим партнерам-юристам или помощникам экспатов. Промо-инструменты включены. Вывод через Wise или PayPal."
};

// Traductions manuelles ZH
const zhTranslations = {
  "blogger.earnings.partner": "每次致电您的律师或外派助手合作伙伴",
  "blogger.landing.seo.description": "撰写有关外派生活的文章。每次推荐电话赚取$10，每次致电您的律师或外派助手合作伙伴赚取$5。包含模板、标志和资源。通过Wise或PayPal提款。",
  "influencer.earnings.partner": "每次致电您的律师或外派助手合作伙伴",
  "influencer.faq.a2": "这取决于您的受众规模。10次通话 = $100。50次通话 = $500。一些网红通过寻找律师或外派助手合作伙伴并为他们接到的每次电话赚取$5，每月赚取$1000-5000。",
  "influencer.landing.seo.description": "在YouTube、Instagram、TikTok上推广SOS-Expat。每次推荐电话赚取$10，每次致电您的律师或外派助手合作伙伴赚取$5。包含促销工具。通过Wise或PayPal提款。"
};

// Traductions manuelles HI
const hiTranslations = {
  "blogger.earnings.partner": "आपके वकील या प्रवासी सहायक साझेदारों को प्रति कॉल",
  "blogger.landing.seo.description": "प्रवासी जीवन के बारे में लेख लिखें। प्रति कॉल $10 कमाएं, अपने वकील या प्रवासी सहायक साझेदारों को प्रति कॉल $5। टेम्पलेट, लोगो और संसाधन शामिल। Wise या PayPal के माध्यम से निकालें।",
  "influencer.earnings.partner": "आपके वकील या प्रवासी सहायक साझेदारों को प्रति कॉल",
  "influencer.faq.a2": "यह आपके दर्शकों के आकार पर निर्भर करता है। 10 कॉल = $100। 50 कॉल = $500। कुछ इन्फ्लुएंसर वकील या प्रवासी सहायक साझेदार ढूंढकर और उन्हें प्राप्त प्रति कॉल $5 कमाकर $1000-5000/माह कमाते हैं।",
  "influencer.landing.seo.description": "YouTube, Instagram, TikTok पर SOS-Expat का प्रचार करें। प्रति कॉल $10 कमाएं, अपने वकील या प्रवासी सहायक साझेदारों को प्रति कॉल $5। प्रोमो टूल शामिल। Wise या PayPal के माध्यम से निकालें।"
};

// Traductions manuelles AR
const arTranslations = {
  "blogger.earnings.partner": "لكل مكالمة لشركائك المحامين أو مساعدي المغتربين",
  "blogger.landing.seo.description": "اكتب مقالات عن حياة المغتربين. اربح 10 دولارات لكل مكالمة، 5 دولارات لكل مكالمة لشركائك المحامين أو مساعدي المغتربين. قوالب وشعارات وموارد متضمنة. السحب عبر Wise أو PayPal.",
  "influencer.earnings.partner": "لكل مكالمة لشركائك المحامين أو مساعدي المغتربين",
  "influencer.faq.a2": "يعتمد ذلك على حجم جمهورك. 10 مكالمات = 100 دولار. 50 مكالمة = 500 دولار. يربح بعض المؤثرين 1000-5000 دولار شهريًا من خلال العثور على شركاء محامين أو مساعدي مغتربين وكسب 5 دولارات لكل مكالمة يتلقونها.",
  "influencer.landing.seo.description": "قم بالترويج لـ SOS-Expat على YouTube وInstagram وTikTok. اربح 10 دولارات لكل مكالمة، 5 دولارات لكل مكالمة لشركائك المحامين أو مساعدي المغتربين. أدوات ترويجية متضمنة. السحب عبر Wise أو PayPal."
};

// Map de toutes les langues
const translationsMap = {
  'en': enTranslations,
  'es-es': esTranslations,
  'de-de': deTranslations,
  'pt-pt': ptTranslations,
  'ru-ru': ruTranslations,
  'zh-cn': zhTranslations,
  'hi-in': hiTranslations,
  'ar-sa': arTranslations
};

// Fonction pour mettre à jour un fichier JSON
function updateJsonFile(filePath, translations) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let updated = false;

    for (const [key, value] of Object.entries(translations)) {
      if (!data[key] || data[key] !== value) {
        data[key] = value;
        updated = true;
      }
    }

    if (updated) {
      // Trier les clés alphabétiquement
      const sortedData = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});

      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      return Object.keys(translations).length;
    }

    return 0;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de ${filePath}:`, error.message);
    return 0;
  }
}

// Main
let totalUpdates = 0;

for (const [lang, translations] of Object.entries(translationsMap)) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Fichier non trouvé : ${filePath}`);
    continue;
  }

  const count = updateJsonFile(filePath, translations);
  if (count > 0) {
    console.log(`✅ ${lang}: ${count} clés mises à jour`);
    totalUpdates += count;
  }
}

console.log(`\n🎉 Total: ${totalUpdates} traductions propagées sur 8 langues`);

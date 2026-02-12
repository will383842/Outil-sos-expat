#!/usr/bin/env node
/**
 * Script pour traduire les clés manquantes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = __dirname;

// Traductions manuelles des clés chatter.content.*
const translations = {
  'en': {
    "chatter.content.blog": "Blog/Website",
    "chatter.content.blog.name": "Your blog/website name",
    "chatter.content.instagram": "Instagram",
    "chatter.content.note": "If you have a blog or social media, add the URL to increase your approval chances.",
    "chatter.content.tiktok": "TikTok",
    "chatter.content.twitter": "X (Twitter)",
    "chatter.content.youtube": "YouTube",
    "chatter.dashboard.resourcesCta": "Get Resources",
    "chatter.dashboard.resourcesDesc": "Videos and content ready to share",
    "chatter.earnings.cta": "See Partner Tools",
    "chatter.earnings.perCall": "Per call to a lawyer or expat helper",
    "chatter.earnings.recruit": "Passive income via partners",
    "chatter.earnings.recruit.desc": "Find a lawyer or expat helper to join SOS-Expat. Every time they receive a call, you earn $5 passively!",
    "chatter.earnings.seo": "Long-term passive traffic",
    "chatter.earnings.seo.desc": "Your posts rank on Google and generate traffic for months or years. Post once, earn forever!",
    "chatter.faq.a6": "If you don't pass the quiz, you can retake it after 7 days. Use this time to review the training.",
    "chatter.faq.q6": "What if I don't pass the quiz?",
    "chatter.hero.trust.1": "Training videos",
    "chatter.hero.trust.2": "Practical guide",
    "chatter.hero.trust.3": "Promo content",
    "chatter.hero.trust.client": "per client",
    "chatter.hero.trust.partner": "per partner call"
  },
  'zh-cn': {
    "chatter.content.blog": "博客/网站",
    "chatter.content.blog.name": "您的博客/网站名称",
    "chatter.content.instagram": "Instagram",
    "chatter.content.note": "如果您有博客或社交媒体，请添加URL以增加批准机会。",
    "chatter.content.tiktok": "TikTok",
    "chatter.content.twitter": "X (Twitter)",
    "chatter.content.youtube": "YouTube",
    "chatter.dashboard.resourcesCta": "获取资源",
    "chatter.dashboard.resourcesDesc": "视频和内容准备分享",
    "chatter.earnings.cta": "查看合作伙伴工具",
    "chatter.earnings.perCall": "每次致电律师或外派助手",
    "chatter.earnings.recruit": "通过合作伙伴的被动收入",
    "chatter.earnings.recruit.desc": "找一位律师或外派助手加入SOS-Expat。每次他们接到电话，您就被动赚取$5！",
    "chatter.earnings.seo": "长期被动流量",
    "chatter.earnings.seo.desc": "您的帖子在Google上排名，并在数月或数年内产生流量。发布一次，永久赚取！",
    "chatter.faq.a6": "如果您没有通过测验，可以在7天后重考。利用这段时间复习培训。",
    "chatter.faq.q6": "如果我没有通过测验怎么办？",
    "chatter.hero.trust.1": "培训视频",
    "chatter.hero.trust.2": "实用指南",
    "chatter.hero.trust.3": "促销内容",
    "chatter.hero.trust.client": "每位客户",
    "chatter.hero.trust.partner": "每次合作伙伴通话"
  },
  'hi-in': {
    "chatter.content.blog": "ब्लॉग/वेबसाइट",
    "chatter.content.blog.name": "आपका ब्लॉग/वेबसाइट नाम",
    "chatter.content.instagram": "Instagram",
    "chatter.content.note": "यदि आपके पास ब्लॉग या सोशल मीडिया है, तो अनुमोदन की संभावना बढ़ाने के लिए URL जोड़ें।",
    "chatter.content.tiktok": "TikTok",
    "chatter.content.twitter": "X (Twitter)",
    "chatter.content.youtube": "YouTube",
    "chatter.dashboard.resourcesCta": "संसाधन प्राप्त करें",
    "chatter.dashboard.resourcesDesc": "साझा करने के लिए तैयार वीडियो और सामग्री",
    "chatter.earnings.cta": "साझेदार उपकरण देखें",
    "chatter.earnings.perCall": "वकील या प्रवासी सहायक को प्रति कॉल",
    "chatter.earnings.recruit": "साझेदारों के माध्यम से निष्क्रिय आय",
    "chatter.earnings.recruit.desc": "एक वकील या प्रवासी सहायक को SOS-Expat में शामिल होने के लिए खोजें। हर बार जब वे कॉल प्राप्त करते हैं, तो आप निष्क्रिय रूप से $5 कमाते हैं!",
    "chatter.earnings.seo": "दीर्घकालिक निष्क्रिय ट्रैफ़िक",
    "chatter.earnings.seo.desc": "आपकी पोस्ट Google पर रैंक करती हैं और महीनों या वर्षों तक ट्रैफ़िक उत्पन्न करती हैं। एक बार पोस्ट करें, हमेशा कमाएं!",
    "chatter.faq.a6": "यदि आप प्रश्नोत्तरी पास नहीं करते हैं, तो आप 7 दिनों के बाद फिर से प्रयास कर सकते हैं। इस समय का उपयोग प्रशिक्षण की समीक्षा करने के लिए करें।",
    "chatter.faq.q6": "यदि मैं प्रश्नोत्तरी पास नहीं करता तो क्या होगा?",
    "chatter.hero.trust.1": "प्रशिक्षण वीडियो",
    "chatter.hero.trust.2": "व्यावहारिक मार्गदर्शिका",
    "chatter.hero.trust.3": "प्रोमो सामग्री",
    "chatter.hero.trust.client": "प्रति ग्राहक",
    "chatter.hero.trust.partner": "प्रति साझेदार कॉल"
  },
  'es-es': {
    "chatter.landing.hero.partnerExample": "💡 1 socio (abogado/ayudante de expatriado) = 30 llamadas/mes × 5$ × 6 meses = {total} pasivos!"
  },
  'de-de': {
    "chatter.landing.hero.partnerExample": "💡 1 Partner (Anwalt/Expat-Helfer) = 30 Anrufe/Monat × 5$ × 6 Monate = {total} passiv!"
  },
  'pt-pt': {
    "chatter.landing.hero.partnerExample": "💡 1 parceiro (advogado/assistente de expatriado) = 30 chamadas/mês × 5$ × 6 meses = {total} passivos!"
  },
  'ru-ru': {
    "chatter.landing.hero.partnerExample": "💡 1 партнер (юрист/помощник экспата) = 30 звонков/мес × 5$ × 6 месяцев = {total} пассивно!"
  },
  'ar-sa': {
    "chatter.landing.hero.partnerExample": "💡 1 شريك (محامي/مساعد مغترب) = 30 مكالمة/شهر × 5$ × 6 أشهر = {total} سلبي!"
  }
};

// Fonction pour mettre à jour un fichier JSON
function updateJsonFile(lang, newTranslations) {
  const filePath = path.join(LOCALES_DIR, lang, 'common.json');

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let updated = 0;

    for (const [key, value] of Object.entries(newTranslations)) {
      if (data[key] && data[key] !== value) {
        data[key] = value;
        updated++;
      } else if (!data[key]) {
        data[key] = value;
        updated++;
      }
    }

    if (updated > 0) {
      // Trier les clés alphabétiquement
      const sortedData = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});

      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');
      return updated;
    }

    return 0;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de ${filePath}:`, error.message);
    return 0;
  }
}

// Main
let totalUpdated = 0;

for (const [lang, newTranslations] of Object.entries(translations)) {
  const count = updateJsonFile(lang, newTranslations);
  if (count > 0) {
    console.log(`✅ ${lang}: ${count} clés traduites`);
    totalUpdated += count;
  }
}

console.log(`\n🎉 Total: ${totalUpdated} clés traduites correctement`);

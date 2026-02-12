const fs = require('fs');
const path = require('path');

// HIGH-QUALITY PROFESSIONAL TRANSLATIONS for the 18 keys that need review
const FIXES = {
  "blogger.example.accident": {
    "fr-fr": "Accident",
    "en": "Accident",
    "es-es": "Accidente",
    "de-de": "Unfall",
    "pt-pt": "Acidente",
    "zh-cn": "事故",
    "hi-in": "दुर्घटना",
    "ar-sa": "حادث"
  },

  "blogger.example.bank": {
    "fr-fr": "Banque",
    "en": "Bank",
    "es-es": "Banco",
    "de-de": "Bank",
    "pt-pt": "Banco",
    "zh-cn": "银行",
    "hi-in": "बैंक",
    "ar-sa": "بنك"
  },

  "blogger.example.insurance": {
    "fr-fr": "Assurance",
    "en": "Insurance",
    "es-es": "Seguro",
    "de-de": "Versicherung",
    "pt-pt": "Seguro",
    "zh-cn": "保险",
    "hi-in": "बीमा",
    "ar-sa": "تأمين"
  },

  "blogger.example.school": {
    "fr-fr": "École",
    "en": "School",
    "es-es": "Escuela",
    "de-de": "Schule",
    "pt-pt": "Escola",
    "zh-cn": "学校",
    "hi-in": "स्कूल",
    "ar-sa": "مدرسة"
  },

  "blogger.example.tax": {
    "fr-fr": "Impôts",
    "en": "Tax",
    "es-es": "Impuestos",
    "de-de": "Steuern",
    "pt-pt": "Impostos",
    "zh-cn": "税务",
    "hi-in": "कर",
    "ar-sa": "ضرائب"
  },

  "blogger.final.trust": {
    "fr-fr": "Rejoins des centaines de bloggers qui gagnent déjà",
    "en": "Join hundreds of bloggers already earning",
    "es-es": "Únete a cientos de bloggers que ya están ganando",
    "de-de": "Schließe dich Hunderten von Bloggern an, die bereits verdienen",
    "pt-pt": "Junta-te a centenas de bloggers que já estão a ganhar",
    "zh-cn": "加入数百位已经在赚钱的博主",
    "hi-in": "सैकड़ों ब्लॉगर्स से जुड़ें जो पहले से कमा रहे हैं",
    "ar-sa": "انضم إلى مئات المدونين الذين يكسبون بالفعل"
  },

  "blogger.payment.methods": {
    "fr-fr": "PayPal, Virement Bancaire, Stripe",
    "en": "PayPal, Bank Transfer, Stripe",
    "es-es": "PayPal, Transferencia Bancaria, Stripe",
    "de-de": "PayPal, Banküberweisung, Stripe",
    "pt-pt": "PayPal, Transferência Bancária, Stripe",
    "zh-cn": "PayPal、银行转账、Stripe",
    "hi-in": "PayPal, बैंक ट्रांसफर, Stripe",
    "ar-sa": "PayPal، تحويل بنكي، Stripe"
  },

  "blogger.register.blogNiche": {
    "fr-fr": "Niche du Blog",
    "en": "Blog Niche",
    "es-es": "Nicho del Blog",
    "de-de": "Blog-Nische",
    "pt-pt": "Nicho do Blog",
    "zh-cn": "博客定位",
    "hi-in": "ब्लॉग विशेषज्ञता",
    "ar-sa": "تخصص المدونة"
  },

  "blogger.register.blogUrl.help": {
    "fr-fr": "L'adresse web de ton blog",
    "en": "Your blog's web address",
    "es-es": "La dirección web de tu blog",
    "de-de": "Die Webadresse deines Blogs",
    "pt-pt": "O endereço web do teu blog",
    "zh-cn": "您博客的网址",
    "hi-in": "आपके ब्लॉग का वेब पता",
    "ar-sa": "عنوان مدونتك على الويب"
  },

  "blogger.register.error": {
    "fr-fr": "Erreur lors de l'inscription",
    "en": "Error during registration",
    "es-es": "Error durante el registro",
    "de-de": "Fehler bei der Registrierung",
    "pt-pt": "Erro durante o registo",
    "zh-cn": "注册过程中出错",
    "hi-in": "पंजीकरण के दौरान त्रुटि",
    "ar-sa": "خطأ أثناء التسجيل"
  },

  "blogger.register.monthlyVisitors": {
    "fr-fr": "Visiteurs Mensuels",
    "en": "Monthly Visitors",
    "es-es": "Visitantes Mensuales",
    "de-de": "Monatliche Besucher",
    "pt-pt": "Visitantes Mensais",
    "zh-cn": "每月访客",
    "hi-in": "मासिक विज़िटर",
    "ar-sa": "الزوار الشهريون"
  },

  "blogger.register.niche.finance": {
    "fr-fr": "Finance",
    "en": "Finance",
    "es-es": "Finanzas",
    "de-de": "Finanzen",
    "pt-pt": "Finanças",
    "zh-cn": "财务",
    "hi-in": "वित्त",
    "ar-sa": "المالية"
  },

  "blogger.register.niche.lifestyle": {
    "fr-fr": "Lifestyle",
    "en": "Lifestyle",
    "es-es": "Estilo de Vida",
    "de-de": "Lebensstil",
    "pt-pt": "Estilo de Vida",
    "zh-cn": "生活方式",
    "hi-in": "जीवन शैली",
    "ar-sa": "أسلوب الحياة"
  },

  "blogger.register.niche.other": {
    "fr-fr": "Autre",
    "en": "Other",
    "es-es": "Otro",
    "de-de": "Andere",
    "pt-pt": "Outro",
    "zh-cn": "其他",
    "hi-in": "अन्य",
    "ar-sa": "أخرى"
  },

  "blogger.register.socialMedia": {
    "fr-fr": "Réseaux Sociaux",
    "en": "Social Media",
    "es-es": "Redes Sociales",
    "de-de": "Soziale Medien",
    "pt-pt": "Redes Sociais",
    "zh-cn": "社交媒体",
    "hi-in": "सोशल मीडिया",
    "ar-sa": "وسائل التواصل الاجتماعي"
  },

  "blogger.register.success": {
    "fr-fr": "Inscription réussie !",
    "en": "Registration successful!",
    "es-es": "¡Registro exitoso!",
    "de-de": "Registrierung erfolgreich!",
    "pt-pt": "Registo bem-sucedido!",
    "zh-cn": "注册成功！",
    "hi-in": "पंजीकरण सफल!",
    "ar-sa": "التسجيل ناجح!"
  },

  "blogger.resource.support": {
    "fr-fr": "Support",
    "en": "Support",
    "es-es": "Soporte",
    "de-de": "Unterstützung",
    "pt-pt": "Suporte",
    "zh-cn": "支持",
    "hi-in": "सहायता",
    "ar-sa": "الدعم"
  },

  "blogger.topics.more": {
    "fr-fr": "+ 20 autres thèmes",
    "en": "+ 20 more topics",
    "es-es": "+ 20 temas más",
    "de-de": "+ 20 weitere Themen",
    "pt-pt": "+ 20 outros temas",
    "zh-cn": "+ 20个更多主题",
    "hi-in": "+ 20 और विषय",
    "ar-sa": "+ 20 موضوعًا آخر"
  },

  "blogger.topics.practical": {
    "fr-fr": "Pratique",
    "en": "Practical",
    "es-es": "Práctico",
    "de-de": "Praktisch",
    "pt-pt": "Prático",
    "zh-cn": "实用",
    "hi-in": "व्यावहारिक",
    "ar-sa": "عملي"
  }
};

const languages = ['fr-fr', 'en', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'hi-in', 'ar-sa'];

console.log('Loading translation files...\n');

const translations = {};
languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');
  translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
});

console.log('Applying fixes...\n');

let fixedCount = 0;

Object.keys(FIXES).forEach(key => {
  const langValues = FIXES[key];

  Object.keys(langValues).forEach(lang => {
    const currentValue = translations[lang][key];

    if (currentValue && currentValue.includes('[') && currentValue.includes('NEEDS REVIEW]')) {
      translations[lang][key] = langValues[lang];
      fixedCount++;
      console.log(`✓ Fixed ${lang}: ${key}`);
    }
  });
});

console.log(`\n✓ Fixed ${fixedCount} translations\n`);

console.log('Saving files...\n');

languages.forEach(lang => {
  const filePath = path.join(__dirname, lang, 'common.json');

  // Sort alphabetically
  const sorted = {};
  Object.keys(translations[lang]).sort().forEach(key => {
    sorted[key] = translations[lang][key];
  });

  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}/common.json`);
});

console.log('\n=== COMPLETED ===');
console.log(`All ${fixedCount} "[NEEDS REVIEW]" markers have been replaced with high-quality translations.`);

// Verify no markers remain
let remainingMarkers = 0;
languages.forEach(lang => {
  const content = JSON.stringify(translations[lang]);
  const matches = (content.match(/NEEDS REVIEW/g) || []).length;
  remainingMarkers += matches;
});

if (remainingMarkers > 0) {
  console.log(`\n⚠️  WARNING: ${remainingMarkers} markers still remain. Manual review needed.`);
} else {
  console.log('\n✅ SUCCESS: All translations are now 100% complete with NO review markers!');
}

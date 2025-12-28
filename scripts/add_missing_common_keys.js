const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../sos/src/helper');
const langs = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'hi', 'ar', 'ch'];

// Charger tous les fichiers
const langData = {};
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  langData[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

// Traductions manquantes à ajouter
const missingTranslations = {
  'learnMore': {
    fr: 'En savoir plus', en: 'Learn more', de: 'Mehr erfahren',
    es: 'Saber más', pt: 'Saiba mais', ru: 'Узнать больше',
    hi: 'और जानें', ar: 'اعرف المزيد', ch: '了解更多'
  },
  'safetyBadge': {
    fr: 'Experts vérifiés et disponibles 24/7',
    en: 'Verified experts available 24/7',
    de: 'Verifizierte Experten 24/7 verfügbar',
    es: 'Expertos verificados disponibles 24/7',
    pt: 'Especialistas verificados e disponíveis 24/7',
    ru: 'Проверенные эксперты доступны 24/7',
    hi: '24/7 उपलब्ध सत्यापित विशेषज्ञ',
    ar: 'خبراء موثقون متاحون على مدار الساعة',
    ch: '认证专家全天候服务'
  },
  'safetyDescription': {
    fr: 'Tous nos experts sont vérifiés. Paiement 100% sécurisé.',
    en: 'All our experts are verified. 100% secure payment.',
    de: 'Alle unsere Experten sind verifiziert. 100% sichere Zahlung.',
    es: 'Todos nuestros expertos están verificados. Pago 100% seguro.',
    pt: 'Todos os nossos especialistas são verificados. Pagamento 100% seguro.',
    ru: 'Все наши эксперты проверены. 100% безопасная оплата.',
    hi: 'हमारे सभी विशेषज्ञ सत्यापित हैं। 100% सुरक्षित भुगतान।',
    ar: 'جميع خبرائنا موثقون. دفع آمن 100%.',
    ch: '我们所有专家均经过验证。100%安全支付。'
  },
  'safetyItem1': {
    fr: 'Vérification d\'identité et diplômes',
    en: 'Identity and diploma verification',
    de: 'Identitäts- und Diplomprüfung',
    es: 'Verificación de identidad y diplomas',
    pt: 'Verificação de identidade e diplomas',
    ru: 'Проверка личности и дипломов',
    hi: 'पहचान और डिप्लोमा सत्यापन',
    ar: 'التحقق من الهوية والشهادات',
    ch: '身份和文凭验证'
  },
  'safetyItem2': {
    fr: 'Paiement 100% sécurisé avec Stripe',
    en: '100% secure payment with Stripe',
    de: '100% sichere Zahlung mit Stripe',
    es: 'Pago 100% seguro con Stripe',
    pt: 'Pagamento 100% seguro com Stripe',
    ru: '100% безопасная оплата через Stripe',
    hi: 'Stripe के साथ 100% सुरक्षित भुगतान',
    ar: 'دفع آمن 100% مع Stripe',
    ch: '通过Stripe 100%安全支付'
  },
  'safetyItem3': {
    fr: 'Garantie de satisfaction',
    en: 'Satisfaction guarantee',
    de: 'Zufriedenheitsgarantie',
    es: 'Garantía de satisfacción',
    pt: 'Garantia de satisfação',
    ru: 'Гарантия удовлетворения',
    hi: 'संतुष्टि गारंटी',
    ar: 'ضمان الرضا',
    ch: '满意保证'
  },
  'safetyItem4': {
    fr: 'Données personnelles protégées',
    en: 'Protected personal data',
    de: 'Geschützte persönliche Daten',
    es: 'Datos personales protegidos',
    pt: 'Dados pessoais protegidos',
    ru: 'Защита персональных данных',
    hi: 'व्यक्तिगत डेटा सुरक्षित',
    ar: 'البيانات الشخصية محمية',
    ch: '个人数据受保护'
  },
  'safetyTitle': {
    fr: 'Votre sécurité est notre priorité',
    en: 'Your safety is our priority',
    de: 'Ihre Sicherheit ist unsere Priorität',
    es: 'Tu seguridad es nuestra prioridad',
    pt: 'Sua segurança é nossa prioridade',
    ru: 'Ваша безопасность - наш приоритет',
    hi: 'आपकी सुरक्षा हमारी प्राथमिकता है',
    ar: 'سلامتك هي أولويتنا',
    ch: '您的安全是我们的首要任务'
  },
  'testimonialsBadge': {
    fr: 'Ce qu\'ils disent de nous',
    en: 'What they say about us',
    de: 'Was sie über uns sagen',
    es: 'Lo que dicen de nosotros',
    pt: 'O que dizem sobre nós',
    ru: 'Что о нас говорят',
    hi: 'वे हमारे बारे में क्या कहते हैं',
    ar: 'ماذا يقولون عنا',
    ch: '他们怎么说我们'
  },
  'testimonialsDescription': {
    fr: 'Découvrez les avis de ceux qui ont utilisé nos services',
    en: 'Discover the reviews of those who used our services',
    de: 'Entdecken Sie die Bewertungen derjenigen, die unsere Dienste genutzt haben',
    es: 'Descubre las opiniones de quienes usaron nuestros servicios',
    pt: 'Descubra as avaliações daqueles que usaram nossos serviços',
    ru: 'Узнайте отзывы тех, кто воспользовался нашими услугами',
    hi: 'उन लोगों की समीक्षाएं देखें जिन्होंने हमारी सेवाओं का उपयोग किया',
    ar: 'اكتشف تقييمات من استخدموا خدماتنا',
    ch: '查看使用过我们服务的用户评价'
  },
  'testimonialsTitle': {
    fr: 'La confiance de milliers d\'expatriés',
    en: 'The trust of thousands of expats',
    de: 'Das Vertrauen von Tausenden von Expats',
    es: 'La confianza de miles de expatriados',
    pt: 'A confiança de milhares de expatriados',
    ru: 'Доверие тысяч экспатов',
    hi: 'हजारों प्रवासियों का भरोसा',
    ar: 'ثقة الآلاف من المغتربين',
    ch: '数千名外籍人士的信任'
  }
};

// Ajouter les traductions manquantes
let addedCount = 0;
Object.entries(missingTranslations).forEach(([key, translations]) => {
  langs.forEach(lang => {
    if (!langData[lang][key] && translations[lang]) {
      langData[lang][key] = translations[lang];
      addedCount++;
    }
  });
});

console.log(`${addedCount} traductions ajoutées`);

// Sauvegarder tous les fichiers (triés par clé)
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  const sortedKeys = Object.keys(langData[lang]).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = langData[lang][k]);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
});

console.log('✅ Traductions communes ajoutées');

// Stats finales
console.log('\nStats finales:');
const counts = {};
langs.forEach(lang => {
  counts[lang] = Object.keys(langData[lang]).length;
  console.log(`  ${lang}: ${counts[lang]} clés`);
});

// Vérifier l'égalité
const values = Object.values(counts);
if (values.every(c => c === values[0])) {
  console.log('\n✅ Toutes les langues ont le même nombre de clés!');
} else {
  console.log('\n⚠️ Différences détectées');
}

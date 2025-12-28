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

// Clés génériques mal formées à supprimer (pas de namespace)
const keysToRemove = [
  'cta1Label', 'cta2Label', 'ctaDescription', 'dashboardCta',
  'expatOfferDuration', 'expatOfferPrice', 'expertsAvailable',
  'faq', 'faqBadge', 'faqTitle', 'finalCtaBadge', 'finalCtaButtonEmergency',
  'finalCtaButtonExperts', 'finalCtaTitle', 'howItWorks', 'howItWorksBadge',
  'howItWorksTitle', 'lawyerOfferDuration', 'lawyerOfferPrice',
  'satisfactionValue', 'statsTitle', 'trustpilotValue'
];

console.log('Suppression des clés mal formées...');
let removedCount = 0;
keysToRemove.forEach(key => {
  langs.forEach(lang => {
    if (langData[lang][key]) {
      delete langData[lang][key];
      removedCount++;
    }
  });
});
console.log(`${removedCount} clés supprimées`);

// Ajouter les traductions testimonials manquantes
const testimonialTranslations = {
  'testimonials.cta.becomeExpert': {
    fr: 'Devenir expert', en: 'Become an expert', de: 'Experte werden',
    es: 'Convertirse en experto', pt: 'Tornar-se especialista', ru: 'Стать экспертом',
    hi: 'विशेषज्ञ बनें', ar: 'كن خبيراً', ch: '成为专家'
  },
  'testimonials.cta.countries150': {
    fr: '150+ pays couverts', en: '150+ countries covered', de: '150+ Länder abgedeckt',
    es: '150+ países cubiertos', pt: '150+ países cobertos', ru: '150+ стран охвачено',
    hi: '150+ देश कवर', ar: '150+ دولة مغطاة', ch: '覆盖150+国家'
  },
  'testimonials.cta.findExpert': {
    fr: 'Trouver un expert', en: 'Find an expert', de: 'Experten finden',
    es: 'Encontrar un experto', pt: 'Encontrar um especialista', ru: 'Найти эксперта',
    hi: 'विशेषज्ञ खोजें', ar: 'ابحث عن خبير', ch: '寻找专家'
  },
  'testimonials.cta.joinExperts': {
    fr: 'Rejoindre nos experts', en: 'Join our experts', de: 'Unseren Experten beitreten',
    es: 'Unirse a nuestros expertos', pt: 'Juntar-se aos nossos especialistas', ru: 'Присоединиться к экспертам',
    hi: 'हमारे विशेषज्ञों से जुड़ें', ar: 'انضم إلى خبرائنا', ch: '加入我们的专家'
  },
  'testimonials.cta.response5min': {
    fr: 'Réponse en 5 min', en: 'Response in 5 min', de: 'Antwort in 5 Min',
    es: 'Respuesta en 5 min', pt: 'Resposta em 5 min', ru: 'Ответ за 5 мин',
    hi: '5 मिनट में जवाब', ar: 'الرد خلال 5 دقائق', ch: '5分钟响应'
  },
  'testimonials.cta.secured': {
    fr: 'Paiement sécurisé', en: 'Secured payment', de: 'Sichere Zahlung',
    es: 'Pago seguro', pt: 'Pagamento seguro', ru: 'Безопасная оплата',
    hi: 'सुरक्षित भुगतान', ar: 'دفع آمن', ch: '安全支付'
  },
  'testimonials.cta.subtitle': {
    fr: 'Rejoignez notre communauté', en: 'Join our community', de: 'Treten Sie unserer Community bei',
    es: 'Únete a nuestra comunidad', pt: 'Junte-se à nossa comunidade', ru: 'Присоединяйтесь к сообществу',
    hi: 'हमारे समुदाय से जुड़ें', ar: 'انضم إلى مجتمعنا', ch: '加入我们的社区'
  },
  'testimonials.loading.adjustCriteria': {
    fr: 'Ajustez vos critères', en: 'Adjust your criteria', de: 'Passen Sie Ihre Kriterien an',
    es: 'Ajusta tus criterios', pt: 'Ajuste seus critérios', ru: 'Измените критерии',
    hi: 'अपने मानदंड समायोजित करें', ar: 'عدّل معاييرك', ch: '调整您的条件'
  },
  'testimonials.loading.clearSearch': {
    fr: 'Effacer la recherche', en: 'Clear search', de: 'Suche löschen',
    es: 'Borrar búsqueda', pt: 'Limpar pesquisa', ru: 'Очистить поиск',
    hi: 'खोज साफ़ करें', ar: 'مسح البحث', ch: '清除搜索'
  },
  'testimonials.loading.loadMore': {
    fr: 'Charger plus', en: 'Load more', de: 'Mehr laden',
    es: 'Cargar más', pt: 'Carregar mais', ru: 'Загрузить ещё',
    hi: 'और लोड करें', ar: 'تحميل المزيد', ch: '加载更多'
  },
  'testimonials.loading.noResults': {
    fr: 'Aucun résultat', en: 'No results', de: 'Keine Ergebnisse',
    es: 'Sin resultados', pt: 'Nenhum resultado', ru: 'Нет результатов',
    hi: 'कोई परिणाम नहीं', ar: 'لا توجد نتائج', ch: '暂无结果'
  },
  'testimonials.loading.testimonials': {
    fr: 'Chargement des témoignages...', en: 'Loading testimonials...', de: 'Lade Bewertungen...',
    es: 'Cargando testimonios...', pt: 'Carregando depoimentos...', ru: 'Загрузка отзывов...',
    hi: 'प्रशंसापत्र लोड हो रहे हैं...', ar: 'جاري تحميل الشهادات...', ch: '正在加载评价...'
  },
  'testimonials.stats.showing': {
    fr: 'Affichage de', en: 'Showing', de: 'Anzeige von',
    es: 'Mostrando', pt: 'Mostrando', ru: 'Показано',
    hi: 'दिखा रहा है', ar: 'عرض', ch: '显示'
  },
  'testimonials.stats.total': {
    fr: 'sur', en: 'of', de: 'von',
    es: 'de', pt: 'de', ru: 'из',
    hi: 'का', ar: 'من', ch: '共'
  }
};

console.log('\nAjout des traductions testimonials manquantes...');
let addedCount = 0;
Object.entries(testimonialTranslations).forEach(([key, translations]) => {
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

console.log('\n✅ Synchronisation finale terminée');

// Stats finales
console.log('\nStats finales:');
langs.forEach(lang => {
  console.log(`  ${lang}: ${Object.keys(langData[lang]).length} clés`);
});

// Vérifier que toutes les langues ont le même nombre de clés
const counts = langs.map(lang => Object.keys(langData[lang]).length);
const allEqual = counts.every(c => c === counts[0]);
if (allEqual) {
  console.log('\n✅ Toutes les langues ont exactement le même nombre de clés!');
} else {
  console.log('\n⚠️ Les langues n\'ont pas le même nombre de clés');
}

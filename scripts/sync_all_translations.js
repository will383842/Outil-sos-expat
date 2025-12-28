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

// Collecter toutes les clés uniques
const allKeys = new Set();
langs.forEach(lang => {
  Object.keys(langData[lang]).forEach(k => allKeys.add(k));
});

// Supprimer les clés parasites (comme ===== PWA =====)
const keysToRemove = [...allKeys].filter(k => k.startsWith('=====') || k.includes('==='));
console.log('Clés parasites à supprimer:', keysToRemove);

keysToRemove.forEach(key => {
  allKeys.delete(key);
  langs.forEach(lang => {
    delete langData[lang][key];
  });
});

// Dictionnaire de traductions de base pour les clés communes manquantes
const baseTranslations = {
  'badge.bonusLabel': {
    fr: 'Bonus', en: 'Bonus', de: 'Bonus', es: 'Bonus', pt: 'Bónus', ru: 'Бонус', hi: 'बोनस', ar: 'مكافأة', ch: '奖励'
  },
  'badge.multi': {
    fr: 'Multi', en: 'Multi', de: 'Multi', es: 'Multi', pt: 'Multi', ru: 'Мульти', hi: 'मल्टी', ar: 'متعدد', ch: '多重'
  },
  'og.title': {
    fr: 'SOS-Expat - Assistance juridique pour expatriés',
    en: 'SOS-Expat - Legal assistance for expats',
    de: 'SOS-Expat - Rechtliche Unterstützung für Expats',
    es: 'SOS-Expat - Asistencia legal para expatriados',
    pt: 'SOS-Expat - Assistência jurídica para expatriados',
    ru: 'SOS-Expat - Юридическая помощь экспатам',
    hi: 'SOS-Expat - प्रवासियों के लिए कानूनी सहायता',
    ar: 'SOS-Expat - المساعدة القانونية للمغتربين',
    ch: 'SOS-Expat - 外籍人士法律援助'
  },
  'og.description': {
    fr: 'Trouvez des avocats spécialisés et des expatriés expérimentés pour vous accompagner',
    en: 'Find specialized lawyers and experienced expats to help you',
    de: 'Finden Sie spezialisierte Anwälte und erfahrene Expats',
    es: 'Encuentre abogados especializados y expatriados experimentados',
    pt: 'Encontre advogados especializados e expatriados experientes',
    ru: 'Найдите специализированных адвокатов и опытных экспатов',
    hi: 'विशेष वकील और अनुभवी प्रवासी खोजें',
    ar: 'اعثر على محامين متخصصين ومغتربين ذوي خبرة',
    ch: '寻找专业律师和经验丰富的外籍人士'
  },
  'register.letsGo': {
    fr: "C'est parti !", en: "Let's go!", de: 'Los geht\'s!', es: '¡Vamos!', pt: 'Vamos!', ru: 'Поехали!', hi: 'चलो!', ar: 'هيا بنا!', ch: '开始吧！'
  },
  'register.loginAriaLabel': {
    fr: 'Aller à la page de connexion', en: 'Go to login page', de: 'Zur Anmeldeseite', es: 'Ir a la página de inicio de sesión', pt: 'Ir para a página de login', ru: 'Перейти на страницу входа', hi: 'लॉगिन पेज पर जाएं', ar: 'الذهاب إلى صفحة تسجيل الدخول', ch: '前往登录页面'
  },
  'register.loginPrompt': {
    fr: 'Déjà un compte ?', en: 'Already have an account?', de: 'Bereits ein Konto?', es: '¿Ya tienes cuenta?', pt: 'Já tem uma conta?', ru: 'Уже есть аккаунт?', hi: 'पहले से खाता है?', ar: 'لديك حساب بالفعل؟', ch: '已有账户？'
  },
  'register.orText': {
    fr: 'ou', en: 'or', de: 'oder', es: 'o', pt: 'ou', ru: 'или', hi: 'या', ar: 'أو', ch: '或'
  },
  'register.popularLabel': {
    fr: 'Populaire', en: 'Popular', de: 'Beliebt', es: 'Popular', pt: 'Popular', ru: 'Популярный', hi: 'लोकप्रिय', ar: 'شائع', ch: '热门'
  },
  'register.signUpAs': {
    fr: "S'inscrire en tant que", en: 'Sign up as', de: 'Registrieren als', es: 'Registrarse como', pt: 'Registar-se como', ru: 'Зарегистрироваться как', hi: 'के रूप में साइन अप करें', ar: 'التسجيل كـ', ch: '注册为'
  },
  'role.client': {
    fr: 'Client', en: 'Client', de: 'Kunde', es: 'Cliente', pt: 'Cliente', ru: 'Клиент', hi: 'ग्राहक', ar: 'عميل', ch: '客户'
  },
  'role.client.desc': {
    fr: 'Recherchez une assistance juridique', en: 'Looking for legal assistance', de: 'Rechtliche Unterstützung suchen', es: 'Buscar asistencia legal', pt: 'Procurar assistência jurídica', ru: 'Ищу юридическую помощь', hi: 'कानूनी सहायता की तलाश', ar: 'البحث عن مساعدة قانونية', ch: '寻求法律援助'
  },
  'role.client.f1': {
    fr: 'Accédez à des avocats vérifiés', en: 'Access verified lawyers', de: 'Zugang zu geprüften Anwälten', es: 'Acceso a abogados verificados', pt: 'Acesso a advogados verificados', ru: 'Доступ к проверенным адвокатам', hi: 'सत्यापित वकीलों तक पहुंच', ar: 'الوصول إلى محامين موثقين', ch: '访问认证律师'
  },
  'role.client.f2': {
    fr: 'Consultations en ligne sécurisées', en: 'Secure online consultations', de: 'Sichere Online-Beratungen', es: 'Consultas online seguras', pt: 'Consultas online seguras', ru: 'Безопасные онлайн-консультации', hi: 'सुरक्षित ऑनलाइन परामर्श', ar: 'استشارات آمنة عبر الإنترنت', ch: '安全的在线咨询'
  },
  'role.client.f3': {
    fr: 'Assistance IA 24/7', en: '24/7 AI assistance', de: '24/7 KI-Unterstützung', es: 'Asistencia IA 24/7', pt: 'Assistência IA 24/7', ru: 'Поддержка ИИ 24/7', hi: '24/7 AI सहायता', ar: 'مساعدة ذكاء اصطناعي على مدار الساعة', ch: '全天候AI助手'
  },
  'role.expat': {
    fr: 'Expatrié', en: 'Expat', de: 'Expat', es: 'Expatriado', pt: 'Expatriado', ru: 'Экспат', hi: 'प्रवासी', ar: 'مغترب', ch: '外籍人士'
  },
  'role.expat.desc': {
    fr: 'Partagez votre expérience', en: 'Share your experience', de: 'Teilen Sie Ihre Erfahrung', es: 'Comparta su experiencia', pt: 'Partilhe a sua experiência', ru: 'Поделитесь опытом', hi: 'अपना अनुभव साझा करें', ar: 'شارك تجربتك', ch: '分享您的经验'
  },
  'role.expat.f1': {
    fr: 'Aidez les nouveaux expatriés', en: 'Help new expats', de: 'Helfen Sie neuen Expats', es: 'Ayude a nuevos expatriados', pt: 'Ajude novos expatriados', ru: 'Помогайте новым экспатам', hi: 'नए प्रवासियों की मदद करें', ar: 'ساعد المغتربين الجدد', ch: '帮助新来的外籍人士'
  },
  'role.expat.f2': {
    fr: 'Gagnez un revenu complémentaire', en: 'Earn extra income', de: 'Zusätzliches Einkommen verdienen', es: 'Gane ingresos extra', pt: 'Ganhe renda extra', ru: 'Получайте дополнительный доход', hi: 'अतिरिक्त आय अर्जित करें', ar: 'اكسب دخلاً إضافياً', ch: '赚取额外收入'
  },
  'role.expat.f3': {
    fr: 'Horaires flexibles', en: 'Flexible schedule', de: 'Flexible Arbeitszeiten', es: 'Horarios flexibles', pt: 'Horários flexíveis', ru: 'Гибкий график', hi: 'लचीला समय', ar: 'جدول مرن', ch: '灵活的时间安排'
  },
  'role.lawyer': {
    fr: 'Avocat', en: 'Lawyer', de: 'Anwalt', es: 'Abogado', pt: 'Advogado', ru: 'Адвокат', hi: 'वकील', ar: 'محامي', ch: '律师'
  },
  'role.lawyer.desc': {
    fr: 'Proposez vos services juridiques', en: 'Offer your legal services', de: 'Bieten Sie Ihre Rechtsdienste an', es: 'Ofrezca sus servicios legales', pt: 'Ofereça seus serviços jurídicos', ru: 'Предлагайте юридические услуги', hi: 'अपनी कानूनी सेवाएं प्रदान करें', ar: 'قدم خدماتك القانونية', ch: '提供您的法律服务'
  },
  'role.lawyer.f1': {
    fr: 'Clientèle internationale', en: 'International clients', de: 'Internationale Kunden', es: 'Clientes internacionales', pt: 'Clientes internacionais', ru: 'Международные клиенты', hi: 'अंतर्राष्ट्रीय ग्राहक', ar: 'عملاء دوليون', ch: '国际客户'
  },
  'role.lawyer.f2': {
    fr: 'Plateforme sécurisée', en: 'Secure platform', de: 'Sichere Plattform', es: 'Plataforma segura', pt: 'Plataforma segura', ru: 'Безопасная платформа', hi: 'सुरक्षित प्लेटफॉर्म', ar: 'منصة آمنة', ch: '安全平台'
  },
  'role.lawyer.f3': {
    fr: 'Gestion simplifiée', en: 'Simplified management', de: 'Vereinfachte Verwaltung', es: 'Gestión simplificada', pt: 'Gestão simplificada', ru: 'Упрощённое управление', hi: 'सरलीकृत प्रबंधन', ar: 'إدارة مبسطة', ch: '简化管理'
  },
  'testimonials.aria.backToTop': {
    fr: 'Retour en haut', en: 'Back to top', de: 'Nach oben', es: 'Volver arriba', pt: 'Voltar ao topo', ru: 'Наверх', hi: 'ऊपर जाएं', ar: 'العودة للأعلى', ch: '返回顶部'
  },
  'testimonials.aria.languageSelector': {
    fr: 'Sélecteur de langue', en: 'Language selector', de: 'Sprachauswahl', es: 'Selector de idioma', pt: 'Seletor de idioma', ru: 'Выбор языка', hi: 'भाषा चयनकर्ता', ar: 'محدد اللغة', ch: '语言选择器'
  },
  'testimonials.aria.pageButton': {
    fr: 'Page', en: 'Page', de: 'Seite', es: 'Página', pt: 'Página', ru: 'Страница', hi: 'पेज', ar: 'صفحة', ch: '页面'
  },
  'testimonials.card.foundHelpful': {
    fr: 'personnes ont trouvé cet avis utile', en: 'people found this helpful', de: 'Personen fanden dies hilfreich', es: 'personas encontraron esto útil', pt: 'pessoas acharam útil', ru: 'человек нашли это полезным', hi: 'लोगों ने इसे उपयोगी पाया', ar: 'أشخاص وجدوا هذا مفيداً', ch: '人觉得有帮助'
  }
};

// Ajouter les clés de testimonials manquantes
const testimonialKeys = [
  'testimonials.aria.carousel',
  'testimonials.aria.nextReview',
  'testimonials.aria.prevReview',
  'testimonials.aria.review',
  'testimonials.aria.scrollIndicator',
  'testimonials.aria.viewProfile',
  'testimonials.card.duration',
  'testimonials.card.expertise',
  'testimonials.card.helpful',
  'testimonials.card.rating',
  'testimonials.card.response',
  'testimonials.card.reviewer',
  'testimonials.card.service',
  'testimonials.card.verified',
  'testimonials.card.viewProfile'
];

const testimonialTranslations = {
  'testimonials.aria.carousel': { fr: 'Carrousel de témoignages', en: 'Testimonials carousel', de: 'Bewertungskarussell', es: 'Carrusel de testimonios', pt: 'Carrossel de depoimentos', ru: 'Карусель отзывов', hi: 'प्रशंसापत्र कैरोसेल', ar: 'دوار الشهادات', ch: '评价轮播' },
  'testimonials.aria.nextReview': { fr: 'Avis suivant', en: 'Next review', de: 'Nächste Bewertung', es: 'Siguiente reseña', pt: 'Próxima avaliação', ru: 'Следующий отзыв', hi: 'अगली समीक्षा', ar: 'المراجعة التالية', ch: '下一条评价' },
  'testimonials.aria.prevReview': { fr: 'Avis précédent', en: 'Previous review', de: 'Vorherige Bewertung', es: 'Reseña anterior', pt: 'Avaliação anterior', ru: 'Предыдущий отзыв', hi: 'पिछली समीक्षा', ar: 'المراجعة السابقة', ch: '上一条评价' },
  'testimonials.aria.review': { fr: 'Avis', en: 'Review', de: 'Bewertung', es: 'Reseña', pt: 'Avaliação', ru: 'Отзыв', hi: 'समीक्षा', ar: 'مراجعة', ch: '评价' },
  'testimonials.aria.scrollIndicator': { fr: 'Indicateur de défilement', en: 'Scroll indicator', de: 'Scroll-Anzeige', es: 'Indicador de desplazamiento', pt: 'Indicador de rolagem', ru: 'Индикатор прокрутки', hi: 'स्क्रॉल संकेतक', ar: 'مؤشر التمرير', ch: '滚动指示器' },
  'testimonials.aria.viewProfile': { fr: 'Voir le profil', en: 'View profile', de: 'Profil ansehen', es: 'Ver perfil', pt: 'Ver perfil', ru: 'Посмотреть профиль', hi: 'प्रोफाइल देखें', ar: 'عرض الملف الشخصي', ch: '查看资料' },
  'testimonials.card.duration': { fr: 'Durée', en: 'Duration', de: 'Dauer', es: 'Duración', pt: 'Duração', ru: 'Длительность', hi: 'अवधि', ar: 'المدة', ch: '时长' },
  'testimonials.card.expertise': { fr: 'Expertise', en: 'Expertise', de: 'Fachgebiet', es: 'Especialidad', pt: 'Especialidade', ru: 'Экспертиза', hi: 'विशेषज्ञता', ar: 'الخبرة', ch: '专业领域' },
  'testimonials.card.helpful': { fr: 'Utile', en: 'Helpful', de: 'Hilfreich', es: 'Útil', pt: 'Útil', ru: 'Полезно', hi: 'उपयोगी', ar: 'مفيد', ch: '有帮助' },
  'testimonials.card.rating': { fr: 'Note', en: 'Rating', de: 'Bewertung', es: 'Calificación', pt: 'Avaliação', ru: 'Оценка', hi: 'रेटिंग', ar: 'التقييم', ch: '评分' },
  'testimonials.card.response': { fr: 'Réponse', en: 'Response', de: 'Antwort', es: 'Respuesta', pt: 'Resposta', ru: 'Ответ', hi: 'प्रतिक्रिया', ar: 'الرد', ch: '回复' },
  'testimonials.card.reviewer': { fr: 'Évaluateur', en: 'Reviewer', de: 'Bewerter', es: 'Evaluador', pt: 'Avaliador', ru: 'Рецензент', hi: 'समीक्षक', ar: 'المراجع', ch: '评价者' },
  'testimonials.card.service': { fr: 'Service', en: 'Service', de: 'Dienst', es: 'Servicio', pt: 'Serviço', ru: 'Услуга', hi: 'सेवा', ar: 'الخدمة', ch: '服务' },
  'testimonials.card.verified': { fr: 'Vérifié', en: 'Verified', de: 'Verifiziert', es: 'Verificado', pt: 'Verificado', ru: 'Проверено', hi: 'सत्यापित', ar: 'موثق', ch: '已验证' },
  'testimonials.card.viewProfile': { fr: 'Voir le profil', en: 'View profile', de: 'Profil ansehen', es: 'Ver perfil', pt: 'Ver perfil', ru: 'Посмотреть профиль', hi: 'प्रोफाइल देखें', ar: 'عرض الملف الشخصي', ch: '查看资料' }
};

Object.assign(baseTranslations, testimonialTranslations);

// Ajouter les traductions manquantes à chaque langue
let addedCount = 0;
Object.entries(baseTranslations).forEach(([key, translations]) => {
  langs.forEach(lang => {
    if (!langData[lang][key] && translations[lang]) {
      langData[lang][key] = translations[lang];
      addedCount++;
    }
  });
});

console.log(`\n${addedCount} traductions ajoutées`);

// Sauvegarder tous les fichiers (triés par clé)
langs.forEach(lang => {
  const filePath = path.join(basePath, `${lang}.json`);
  const sortedKeys = Object.keys(langData[lang]).sort();
  const sorted = {};
  sortedKeys.forEach(k => sorted[k] = langData[lang][k]);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
});

console.log('✅ Tous les fichiers de traduction ont été synchronisés');

// Afficher les stats finales
console.log('\nStats finales:');
langs.forEach(lang => {
  console.log(`  ${lang}: ${Object.keys(langData[lang]).length} clés`);
});

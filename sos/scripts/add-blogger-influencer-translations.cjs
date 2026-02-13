#!/usr/bin/env node
/**
 * Script pour ajouter les traductions manquantes pour Blogger et Influencer
 * Ajoute toutes les traductions pour les 9 langues
 */

const fs = require('fs');
const path = require('path');

// Chemins des fichiers de traduction
const translationDir = path.join(__dirname, '../src/helper');
const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

// ==========================================
// TRADUCTIONS BLOGGER (12 clés manquantes)
// ==========================================
const bloggerTranslations = {
  "blogger.hero.new.line1": {
    fr: "Transformez Votre Blog",
    en: "Transform Your Blog",
    es: "Transforma Tu Blog",
    de: "Verwandeln Sie Ihren Blog",
    pt: "Transforme Seu Blog",
    ru: "Преобразуйте Свой Блог",
    ch: "转变您的博客",
    hi: "अपने ब्लॉग को बदलें",
    ar: "حول مدونتك"
  },
  "blogger.hero.new.line2": {
    fr: "En Source de Revenus",
    en: "Into a Revenue Source",
    es: "En Fuente de Ingresos",
    de: "In Eine Einnahmequelle",
    pt: "Em Fonte de Receita",
    ru: "В Источник Дохода",
    ch: "变成收入来源",
    hi: "आय के स्रोत में",
    ar: "إلى مصدر دخل"
  },
  "blogger.hero.new.subtitle": {
    fr: "Gagnez jusqu'à 60€ par référence qualifiée en écrivant du contenu de qualité sur l'assistance juridique pour expatriés",
    en: "Earn up to €60 per qualified referral by writing quality content about legal assistance for expats",
    es: "Gana hasta 60€ por referencia calificada escribiendo contenido de calidad sobre asistencia legal para expatriados",
    de: "Verdienen Sie bis zu 60 € pro qualifizierter Empfehlung, indem Sie qualitativ hochwertige Inhalte über Rechtsberatung für Expats schreiben",
    pt: "Ganhe até 60€ por indicação qualificada escrevendo conteúdo de qualidade sobre assistência jurídica para expatriados",
    ru: "Зарабатывайте до 60€ за квалифицированную рекомендацию, создавая качественный контент о юридической помощи для экспатов",
    ch: "通过撰写有关外派人员法律援助的优质内容，每次合格推荐可赚取高达 60 欧元",
    hi: "प्रवासियों के लिए कानूनी सहायता के बारे में गुणवत्ता सामग्री लिखकर प्रति योग्य रेफरल € 60 तक कमाएं",
    ar: "اكسب ما يصل إلى 60 يورو لكل إحالة مؤهلة من خلال كتابة محتوى عالي الجودة حول المساعدة القانونية للمغتربين"
  },
  "blogger.hero.new.amount": {
    fr: "60€",
    en: "€60",
    es: "60€",
    de: "60€",
    pt: "60€",
    ru: "60€",
    ch: "60€",
    hi: "€60",
    ar: "60€"
  },
  "blogger.hero.new.per_qualified_referral": {
    fr: "par référence qualifiée",
    en: "per qualified referral",
    es: "por referencia calificada",
    de: "pro qualifizierter Empfehlung",
    pt: "por indicação qualificada",
    ru: "за квалифицированную рекомендацию",
    ch: "每次合格推荐",
    hi: "प्रति योग्य रेफरल",
    ar: "لكل إحالة مؤهلة"
  },
  "blogger.hero.new.primary_cta": {
    fr: "Commencer à Bloguer",
    en: "Start Blogging",
    es: "Empezar a Bloguear",
    de: "Mit Bloggen Beginnen",
    pt: "Começar a Blogar",
    ru: "Начать Вести Блог",
    ch: "开始写博客",
    hi: "ब्लॉगिंग शुरू करें",
    ar: "ابدأ التدوين"
  },
  "blogger.hero.new.secondary_cta": {
    fr: "Voir Comment Ça Marche",
    en: "See How It Works",
    es: "Ver Cómo Funciona",
    de: "Wie Es Funktioniert",
    pt: "Ver Como Funciona",
    ru: "Посмотреть Как Это Работает",
    ch: "查看工作原理",
    hi: "यह कैसे काम करता है देखें",
    ar: "شاهد كيف يعمل"
  },
  "blogger.hero.new.trust_badge_1": {
    fr: "Paiements hebdomadaires",
    en: "Weekly payments",
    es: "Pagos semanales",
    de: "Wöchentliche Zahlungen",
    pt: "Pagamentos semanais",
    ru: "Еженедельные платежи",
    ch: "每周付款",
    hi: "साप्ताहिक भुगतान",
    ar: "مدفوعات أسبوعية"
  },
  "blogger.hero.new.trust_badge_2": {
    fr: "Support SEO dédié",
    en: "Dedicated SEO support",
    es: "Soporte SEO dedicado",
    de: "Dedizierter SEO-Support",
    pt: "Suporte SEO dedicado",
    ru: "Выделенная SEO-поддержка",
    ch: "专用SEO支持",
    hi: "समर्पित SEO समर्थन",
    ar: "دعم SEO مخصص"
  },
  "blogger.hero.new.trust_badge_3": {
    fr: "Ressources créatives",
    en: "Creative resources",
    es: "Recursos creativos",
    de: "Kreative Ressourcen",
    pt: "Recursos criativos",
    ru: "Креативные ресурсы",
    ch: "创意资源",
    hi: "रचनात्मक संसाधन",
    ar: "موارد إبداعية"
  },
  "blogger.hero.new.stat_1_value": {
    fr: "500+",
    en: "500+",
    es: "500+",
    de: "500+",
    pt: "500+",
    ru: "500+",
    ch: "500+",
    hi: "500+",
    ar: "500+"
  },
  "blogger.hero.new.stat_1_label": {
    fr: "Bloggers actifs",
    en: "Active bloggers",
    es: "Bloggers activos",
    de: "Aktive Blogger",
    pt: "Bloggers ativos",
    ru: "Активные блогеры",
    ch: "活跃博主",
    hi: "सक्रिय ब्लॉगर",
    ar: "المدونون النشطون"
  }
};

// ==========================================
// TRADUCTIONS INFLUENCER (138 clés manquantes)
// ==========================================
const influencerTranslations = {
  // Hero Section
  "influencer.hero.headline": {
    fr: "Transformez Votre Influence en Revenus",
    en: "Transform Your Influence Into Revenue",
    es: "Transforma Tu Influencia en Ingresos",
    de: "Verwandeln Sie Ihren Einfluss in Einnahmen",
    pt: "Transforme Sua Influência em Receita",
    ru: "Превратите Свое Влияние в Доход",
    ch: "将您的影响力转化为收入",
    hi: "अपने प्रभाव को आय में बदलें",
    ar: "حول تأثيرك إلى دخل"
  },
  "influencer.hero.subheadline": {
    fr: "Gagnez jusqu'à 60€ par référence qualifiée en promouvant notre plateforme d'assistance juridique auprès de votre audience d'expatriés",
    en: "Earn up to €60 per qualified referral by promoting our legal assistance platform to your expat audience",
    es: "Gana hasta 60€ por referencia calificada promocionando nuestra plataforma de asistencia legal a tu audiencia de expatriados",
    de: "Verdienen Sie bis zu 60 € pro qualifizierter Empfehlung, indem Sie unsere Rechtsberatungsplattform Ihrer Expat-Zielgruppe vorstellen",
    pt: "Ganhe até 60€ por indicação qualificada promovendo nossa plataforma de assistência jurídica para seu público expatriado",
    ru: "Зарабатывайте до 60€ за квалифицированную рекомендацию, продвигая нашу платформу юридической помощи среди вашей аудитории экспатов",
    ch: "通过向您的外派受众推广我们的法律援助平台，每次合格推荐可赚取高达 60 欧元",
    hi: "अपने प्रवासी दर्शकों को हमारे कानूनी सहायता मंच को बढ़ावा देकर प्रति योग्य रेफरल € 60 तक कमाएं",
    ar: "اكسب ما يصل إلى 60 يورو لكل إحالة مؤهلة من خلال الترويج لمنصة المساعدة القانونية لدينا لجمهورك من المغتربين"
  },
  "influencer.hero.cta_primary": {
    fr: "Devenir Influenceur Partenaire",
    en: "Become Partner Influencer",
    es: "Convertirse en Influencer Socio",
    de: "Partner-Influencer Werden",
    pt: "Tornar-se Influenciador Parceiro",
    ru: "Стать Партнером-Инфлюенсером",
    ch: "成为合作网红",
    hi: "पार्टनर इन्फ्लुएंसर बनें",
    ar: "كن مؤثرًا شريكًا"
  },
  "influencer.hero.cta_secondary": {
    fr: "Voir la Démo",
    en: "Watch Demo",
    es: "Ver Demo",
    de: "Demo Ansehen",
    pt: "Ver Demo",
    ru: "Посмотреть Демо",
    ch: "观看演示",
    hi: "डेमो देखें",
    ar: "شاهد العرض التوضيحي"
  },
  "influencer.hero.trust_badge_1": {
    fr: "Commission jusqu'à 60€",
    en: "Commission up to €60",
    es: "Comisión hasta 60€",
    de: "Provision bis 60€",
    pt: "Comissão até 60€",
    ru: "Комиссия до 60€",
    ch: "佣金高达60欧元",
    hi: "€60 तक कमीशन",
    ar: "عمولة تصل إلى 60 يورو"
  },
  "influencer.hero.trust_badge_2": {
    fr: "Paiements hebdomadaires",
    en: "Weekly payments",
    es: "Pagos semanales",
    de: "Wöchentliche Zahlungen",
    pt: "Pagamentos semanais",
    ru: "Еженедельные платежи",
    ch: "每周付款",
    hi: "साप्ताहिक भुगतान",
    ar: "مدفوعات أسبوعية"
  },
  "influencer.hero.trust_badge_3": {
    fr: "Tracking en temps réel",
    en: "Real-time tracking",
    es: "Seguimiento en tiempo real",
    de: "Echtzeit-Tracking",
    pt: "Rastreamento em tempo real",
    ru: "Отслеживание в реальном времени",
    ch: "实时跟踪",
    hi: "रियल-टाइम ट्रैकिंग",
    ar: "تتبع في الوقت الفعلي"
  },
  "influencer.hero.stats.active_influencers": {
    fr: "Influenceurs Actifs",
    en: "Active Influencers",
    es: "Influencers Activos",
    de: "Aktive Influencer",
    pt: "Influenciadores Ativos",
    ru: "Активные Инфлюенсеры",
    ch: "活跃网红",
    hi: "सक्रिय इन्फ्लुएंसर",
    ar: "المؤثرون النشطون"
  },
  "influencer.hero.stats.total_earned": {
    fr: "Total Gagné",
    en: "Total Earned",
    es: "Total Ganado",
    de: "Gesamt Verdient",
    pt: "Total Ganho",
    ru: "Всего Заработано",
    ch: "总收入",
    hi: "कुल कमाई",
    ar: "إجمالي الأرباح"
  },
  "influencer.hero.stats.avg_commission": {
    fr: "Commission Moyenne",
    en: "Average Commission",
    es: "Comisión Promedio",
    de: "Durchschnittliche Provision",
    pt: "Comissão Média",
    ru: "Средняя Комиссия",
    ch: "平均佣金",
    hi: "औसत कमीशन",
    ar: "متوسط العمولة"
  },

  // Benefits Section
  "influencer.benefits.title": {
    fr: "Pourquoi Devenir Influenceur Partenaire",
    en: "Why Become a Partner Influencer",
    es: "Por Qué Convertirse en Influencer Socio",
    de: "Warum Partner-Influencer Werden",
    pt: "Por Que Tornar-se Influenciador Parceiro",
    ru: "Почему Стать Партнером-Инфлюенсером",
    ch: "为什么成为合作网红",
    hi: "पार्टनर इन्फ्लुएंसर क्यों बनें",
    ar: "لماذا تصبح مؤثرًا شريكًا"
  },
  "influencer.benefits.subtitle": {
    fr: "Rejoignez un programme d'affiliation généreux et transparent",
    en: "Join a generous and transparent affiliate program",
    es: "Únase a un programa de afiliados generoso y transparente",
    de: "Treten Sie einem großzügigen und transparenten Partnerprogramm bei",
    pt: "Junte-se a um programa de afiliados generoso e transparente",
    ru: "Присоединяйтесь к щедрой и прозрачной партнерской программе",
    ch: "加入一个慷慨透明的联盟计划",
    hi: "एक उदार और पारदर्शी संबद्ध कार्यक्रम में शामिल हों",
    ar: "انضم إلى برنامج تسويق بالعمولة سخي وشفاف"
  },

  // Benefits cards
  "influencer.benefits.card1.title": {
    fr: "Commissions Élevées",
    en: "High Commissions",
    es: "Comisiones Altas",
    de: "Hohe Provisionen",
    pt: "Comissões Altas",
    ru: "Высокие Комиссии",
    ch: "高额佣金",
    hi: "उच्च कमीशन",
    ar: "عمولات عالية"
  },
  "influencer.benefits.card1.description": {
    fr: "Gagnez jusqu'à 60€ par client qualifié que vous nous amenez",
    en: "Earn up to €60 per qualified client you bring us",
    es: "Gane hasta 60€ por cliente calificado que nos traiga",
    de: "Verdienen Sie bis zu 60 € pro qualifiziertem Kunden, den Sie uns bringen",
    pt: "Ganhe até 60€ por cliente qualificado que você nos traz",
    ru: "Зарабатывайте до 60€ за каждого квалифицированного клиента, которого вы нам приводите",
    ch: "每位合格客户可赚取高达 60 欧元",
    hi: "आपके द्वारा लाए गए प्रत्येक योग्य ग्राहक के लिए € 60 तक कमाएं",
    ar: "اكسب ما يصل إلى 60 يورو لكل عميل مؤهل تحضره لنا"
  },

  "influencer.benefits.card2.title": {
    fr: "Paiements Rapides",
    en: "Fast Payments",
    es: "Pagos Rápidos",
    de: "Schnelle Zahlungen",
    pt: "Pagamentos Rápidos",
    ru: "Быстрые Платежи",
    ch: "快速付款",
    hi: "त्वरित भुगतान",
    ar: "مدفوعات سريعة"
  },
  "influencer.benefits.card2.description": {
    fr: "Recevez vos commissions chaque semaine via virement bancaire ou Wise",
    en: "Receive your commissions weekly via bank transfer or Wise",
    es: "Reciba sus comisiones semanalmente por transferencia bancaria o Wise",
    de: "Erhalten Sie Ihre Provisionen wöchentlich per Banküberweisung oder Wise",
    pt: "Receba suas comissões semanalmente via transferência bancária ou Wise",
    ru: "Получайте свои комиссии еженедельно через банковский перевод или Wise",
    ch: "每周通过银行转账或 Wise 收到您的佣金",
    hi: "बैंक ट्रांसफर या Wise के माध्यम से साप्ताहिक अपना कमीशन प्राप्त करें",
    ar: "احصل على عمولاتك أسبوعيًا عبر التحويل المصرفي أو Wise"
  },

  "influencer.benefits.card3.title": {
    fr: "Dashboard Complet",
    en: "Complete Dashboard",
    es: "Panel Completo",
    de: "Vollständiges Dashboard",
    pt: "Painel Completo",
    ru: "Полная Панель",
    ch: "完整仪表板",
    hi: "पूर्ण डैशबोर्ड",
    ar: "لوحة تحكم كاملة"
  },
  "influencer.benefits.card3.description": {
    fr: "Suivez vos performances en temps réel avec des statistiques détaillées",
    en: "Track your performance in real-time with detailed statistics",
    es: "Rastree su rendimiento en tiempo real con estadísticas detalladas",
    de: "Verfolgen Sie Ihre Leistung in Echtzeit mit detaillierten Statistiken",
    pt: "Acompanhe seu desempenho em tempo real com estatísticas detalhadas",
    ru: "Отслеживайте свою эффективность в реальном времени с подробной статистикой",
    ch: "通过详细的统计数据实时跟踪您的表现",
    hi: "विस्तृत आंकड़ों के साथ वास्तविक समय में अपने प्रदर्शन को ट्रैक करें",
    ar: "تتبع أدائك في الوقت الفعلي مع إحصائيات مفصلة"
  },

  "influencer.benefits.card4.title": {
    fr: "Support Dédié",
    en: "Dedicated Support",
    es: "Soporte Dedicado",
    de: "Dedizierter Support",
    pt: "Suporte Dedicado",
    ru: "Выделенная Поддержка",
    ch: "专属支持",
    hi: "समर्पित सहायता",
    ar: "دعم مخصص"
  },
  "influencer.benefits.card4.description": {
    fr: "Bénéficiez d'un accompagnement personnalisé et de ressources marketing",
    en: "Benefit from personalized support and marketing resources",
    es: "Benefíciese de soporte personalizado y recursos de marketing",
    de: "Profitieren Sie von persönlichem Support und Marketing-Ressourcen",
    pt: "Beneficie-se de suporte personalizado e recursos de marketing",
    ru: "Получите персональную поддержку и маркетинговые ресурсы",
    ch: "享受个性化支持和营销资源",
    hi: "व्यक्तिगत सहायता और मार्केटिंग संसाधनों से लाभ उठाएं",
    ar: "استفد من الدعم الشخصي وموارد التسويق"
  },

  // How It Works Section
  "influencer.how_it_works.title": {
    fr: "Comment Ça Marche",
    en: "How It Works",
    es: "Cómo Funciona",
    de: "Wie Es Funktioniert",
    pt: "Como Funciona",
    ru: "Как Это Работает",
    ch: "工作原理",
    hi: "यह कैसे काम करता है",
    ar: "كيف يعمل"
  },
  "influencer.how_it_works.subtitle": {
    fr: "4 étapes simples pour commencer à gagner",
    en: "4 simple steps to start earning",
    es: "4 pasos simples para empezar a ganar",
    de: "4 einfache Schritte zum Verdienen",
    pt: "4 passos simples para começar a ganhar",
    ru: "4 простых шага, чтобы начать зарабатывать",
    ch: "4 个简单步骤开始赚钱",
    hi: "कमाई शुरू करने के लिए 4 सरल कदम",
    ar: "4 خطوات بسيطة لبدء الكسب"
  },

  "influencer.how_it_works.step1.title": {
    fr: "1. Inscrivez-vous",
    en: "1. Sign Up",
    es: "1. Regístrese",
    de: "1. Registrieren",
    pt: "1. Cadastre-se",
    ru: "1. Зарегистрируйтесь",
    ch: "1. 注册",
    hi: "1. साइन अप करें",
    ar: "1. سجل"
  },
  "influencer.how_it_works.step1.description": {
    fr: "Créez votre compte influenceur en quelques minutes et obtenez votre lien unique",
    en: "Create your influencer account in minutes and get your unique link",
    es: "Cree su cuenta de influencer en minutos y obtenga su enlace único",
    de: "Erstellen Sie in wenigen Minuten Ihr Influencer-Konto und erhalten Sie Ihren einzigartigen Link",
    pt: "Crie sua conta de influenciador em minutos e obtenha seu link exclusivo",
    ru: "Создайте свою учетную запись инфлюенсера за считанные минуты и получите уникальную ссылку",
    ch: "在几分钟内创建您的网红帐户并获取您的唯一链接",
    hi: "मिनटों में अपना इन्फ्लुएंसर खाता बनाएं और अपना अनूठा लिंक प्राप्त करें",
    ar: "أنشئ حساب المؤثر الخاص بك في دقائق واحصل على رابطك الفريد"
  },

  "influencer.how_it_works.step2.title": {
    fr: "2. Partagez",
    en: "2. Share",
    es: "2. Comparta",
    de: "2. Teilen",
    pt: "2. Compartilhe",
    ru: "2. Делитесь",
    ch: "2. 分享",
    hi: "2. शेयर करें",
    ar: "2. شارك"
  },
  "influencer.how_it_works.step2.description": {
    fr: "Promouvez SOS Expat auprès de votre audience via vos réseaux sociaux, stories, posts",
    en: "Promote SOS Expat to your audience via your social media, stories, posts",
    es: "Promueva SOS Expat a su audiencia a través de sus redes sociales, historias, publicaciones",
    de: "Bewerben Sie SOS Expat bei Ihrem Publikum über Ihre sozialen Medien, Stories, Beiträge",
    pt: "Promova o SOS Expat para seu público através de suas redes sociais, stories, posts",
    ru: "Продвигайте SOS Expat среди своей аудитории через социальные сети, истории, посты",
    ch: "通过您的社交媒体、故事、帖子向您的受众推广 SOS Expat",
    hi: "अपने सोशल मीडिया, स्टोरीज, पोस्ट के माध्यम से अपने दर्शकों को SOS Expat का प्रचार करें",
    ar: "روج لـ SOS Expat لجمهورك عبر وسائل التواصل الاجتماعي والقصص والمنشورات"
  },

  "influencer.how_it_works.step3.title": {
    fr: "3. Convertissez",
    en: "3. Convert",
    es: "3. Convierta",
    de: "3. Konvertieren",
    pt: "3. Converta",
    ru: "3. Конвертируйте",
    ch: "3. 转化",
    hi: "3. परिवर्तित करें",
    ar: "3. حول"
  },
  "influencer.how_it_works.step3.description": {
    fr: "Vos followers utilisent votre lien pour s'inscrire et effectuer leur première consultation",
    en: "Your followers use your link to sign up and complete their first consultation",
    es: "Sus seguidores usan su enlace para registrarse y completar su primera consulta",
    de: "Ihre Follower nutzen Ihren Link zur Anmeldung und zum Abschluss ihrer ersten Beratung",
    pt: "Seus seguidores usam seu link para se inscrever e completar sua primeira consulta",
    ru: "Ваши подписчики используют вашу ссылку для регистрации и завершения первой консультации",
    ch: "您的关注者使用您的链接注册并完成他们的第一次咨询",
    hi: "आपके फॉलोअर्स साइन अप करने और अपना पहला परामर्श पूरा करने के लिए आपके लिंक का उपयोग करते हैं",
    ar: "يستخدم متابعوك رابطك للتسجيل وإكمال استشارتهم الأولى"
  },

  "influencer.how_it_works.step4.title": {
    fr: "4. Gagnez",
    en: "4. Earn",
    es: "4. Gane",
    de: "4. Verdienen",
    pt: "4. Ganhe",
    ru: "4. Зарабатывайте",
    ch: "4. 赚钱",
    hi: "4. कमाएं",
    ar: "4. اكسب"
  },
  "influencer.how_it_works.step4.description": {
    fr: "Recevez votre commission chaque semaine directement sur votre compte bancaire",
    en: "Receive your commission weekly directly to your bank account",
    es: "Reciba su comisión semanalmente directamente en su cuenta bancaria",
    de: "Erhalten Sie Ihre Provision wöchentlich direkt auf Ihr Bankkonto",
    pt: "Receba sua comissão semanalmente diretamente em sua conta bancária",
    ru: "Получайте свою комиссию еженедельно непосредственно на свой банковский счет",
    ch: "每周直接将您的佣金收到您的银行账户",
    hi: "साप्ताहिक सीधे अपने बैंक खाते में अपना कमीशन प्राप्त करें",
    ar: "احصل على عمولتك أسبوعيًا مباشرة إلى حسابك المصرفي"
  },

  // Commission Structure Section
  "influencer.commission.title": {
    fr: "Structure de Commission",
    en: "Commission Structure",
    es: "Estructura de Comisión",
    de: "Provisionsstruktur",
    pt: "Estrutura de Comissão",
    ru: "Структура Комиссии",
    ch: "佣金结构",
    hi: "कमीशन संरचना",
    ar: "هيكل العمولة"
  },
  "influencer.commission.subtitle": {
    fr: "Gagnez plus en fonction du volume de vos référencements",
    en: "Earn more based on your referral volume",
    es: "Gane más según el volumen de sus referencias",
    de: "Verdienen Sie mehr basierend auf Ihrem Empfehlungsvolumen",
    pt: "Ganhe mais com base no volume de suas indicações",
    ru: "Зарабатывайте больше в зависимости от объема ваших рекомендаций",
    ch: "根据您的推荐量赚取更多",
    hi: "अपने रेफरल वॉल्यूम के आधार पर अधिक कमाएं",
    ar: "اكسب أكثر بناءً على حجم إحالاتك"
  },

  "influencer.commission.tier1.title": {
    fr: "Débutant",
    en: "Beginner",
    es: "Principiante",
    de: "Anfänger",
    pt: "Iniciante",
    ru: "Начинающий",
    ch: "初学者",
    hi: "शुरुआत",
    ar: "مبتدئ"
  },
  "influencer.commission.tier1.range": {
    fr: "1-10 clients/mois",
    en: "1-10 clients/month",
    es: "1-10 clientes/mes",
    de: "1-10 Kunden/Monat",
    pt: "1-10 clientes/mês",
    ru: "1-10 клиентов/месяц",
    ch: "每月 1-10 个客户",
    hi: "1-10 ग्राहक/माह",
    ar: "1-10 عملاء/شهر"
  },
  "influencer.commission.tier1.amount": {
    fr: "30€ par client",
    en: "€30 per client",
    es: "30€ por cliente",
    de: "30€ pro Kunde",
    pt: "30€ por cliente",
    ru: "30€ за клиента",
    ch: "每位客户 30 欧元",
    hi: "प्रति ग्राहक € 30",
    ar: "30 يورو لكل عميل"
  },

  "influencer.commission.tier2.title": {
    fr: "Intermédiaire",
    en: "Intermediate",
    es: "Intermedio",
    de: "Fortgeschritten",
    pt: "Intermediário",
    ru: "Средний",
    ch: "中级",
    hi: "मध्यवर्ती",
    ar: "متوسط"
  },
  "influencer.commission.tier2.range": {
    fr: "11-25 clients/mois",
    en: "11-25 clients/month",
    es: "11-25 clientes/mes",
    de: "11-25 Kunden/Monat",
    pt: "11-25 clientes/mês",
    ru: "11-25 клиентов/месяц",
    ch: "每月 11-25 个客户",
    hi: "11-25 ग्राहक/माह",
    ar: "11-25 عميل/شهر"
  },
  "influencer.commission.tier2.amount": {
    fr: "45€ par client",
    en: "€45 per client",
    es: "45€ por cliente",
    de: "45€ pro Kunde",
    pt: "45€ por cliente",
    ru: "45€ за клиента",
    ch: "每位客户 45 欧元",
    hi: "प्रति ग्राहक € 45",
    ar: "45 يورو لكل عميل"
  },

  "influencer.commission.tier3.title": {
    fr: "Expert",
    en: "Expert",
    es: "Experto",
    de: "Experte",
    pt: "Especialista",
    ru: "Эксперт",
    ch: "专家",
    hi: "विशेषज्ञ",
    ar: "خبير"
  },
  "influencer.commission.tier3.range": {
    fr: "26+ clients/mois",
    en: "26+ clients/month",
    es: "26+ clientes/mes",
    de: "26+ Kunden/Monat",
    pt: "26+ clientes/mês",
    ru: "26+ клиентов/месяц",
    ch: "每月 26+ 个客户",
    hi: "26+ ग्राहक/माह",
    ar: "26+ عميل/شهر"
  },
  "influencer.commission.tier3.amount": {
    fr: "60€ par client",
    en: "€60 per client",
    es: "60€ por cliente",
    de: "60€ pro Kunde",
    pt: "60€ por cliente",
    ru: "60€ за клиента",
    ch: "每位客户 60 欧元",
    hi: "प्रति ग्राहक € 60",
    ar: "60 يورو لكل عميل"
  },

  // Tools Section
  "influencer.tools.title": {
    fr: "Outils Promotionnels",
    en: "Promotional Tools",
    es: "Herramientas Promocionales",
    de: "Werbetools",
    pt: "Ferramentas Promocionais",
    ru: "Рекламные Инструменты",
    ch: "推广工具",
    hi: "प्रचार उपकरण",
    ar: "أدوات ترويجية"
  },
  "influencer.tools.subtitle": {
    fr: "Tout ce dont vous avez besoin pour promouvoir efficacement",
    en: "Everything you need to promote effectively",
    es: "Todo lo que necesita para promocionar efectivamente",
    de: "Alles, was Sie für effektive Werbung brauchen",
    pt: "Tudo o que você precisa para promover efetivamente",
    ru: "Все, что вам нужно для эффективного продвижения",
    ch: "有效推广所需的一切",
    hi: "प्रभावी रूप से बढ़ावा देने के लिए आपको जो कुछ भी चाहिए",
    ar: "كل ما تحتاجه للترويج بفعالية"
  },

  "influencer.tools.card1.title": {
    fr: "Visuels Prêts",
    en: "Ready-Made Visuals",
    es: "Visuales Listos",
    de: "Fertige Grafiken",
    pt: "Visuais Prontos",
    ru: "Готовые Визуалы",
    ch: "现成的视觉效果",
    hi: "तैयार दृश्य",
    ar: "مرئيات جاهزة"
  },
  "influencer.tools.card1.description": {
    fr: "Stories, posts et bannières optimisés pour Instagram, TikTok, Facebook",
    en: "Stories, posts and banners optimized for Instagram, TikTok, Facebook",
    es: "Historias, publicaciones y banners optimizados para Instagram, TikTok, Facebook",
    de: "Für Instagram, TikTok, Facebook optimierte Stories, Beiträge und Banner",
    pt: "Stories, posts e banners otimizados para Instagram, TikTok, Facebook",
    ru: "Истории, посты и баннеры, оптимизированные для Instagram, TikTok, Facebook",
    ch: "针对 Instagram、TikTok、Facebook 优化的故事、帖子和横幅",
    hi: "Instagram, TikTok, Facebook के लिए अनुकूलित स्टोरीज, पोस्ट और बैनर",
    ar: "قصص ومنشورات ولافتات محسّنة لـ Instagram و TikTok و Facebook"
  },

  "influencer.tools.card2.title": {
    fr: "Liens Trackés",
    en: "Tracked Links",
    es: "Enlaces Rastreados",
    de: "Getrackte Links",
    pt: "Links Rastreados",
    ru: "Отслеживаемые Ссылки",
    ch: "跟踪链接",
    hi: "ट्रैक किए गए लिंक",
    ar: "روابط متتبعة"
  },
  "influencer.tools.card2.description": {
    fr: "Liens personnalisés avec tracking en temps réel de vos performances",
    en: "Custom links with real-time tracking of your performance",
    es: "Enlaces personalizados con seguimiento en tiempo real de su rendimiento",
    de: "Individuelle Links mit Echtzeit-Tracking Ihrer Leistung",
    pt: "Links personalizados com rastreamento em tempo real do seu desempenho",
    ru: "Персонализированные ссылки с отслеживанием вашей эффективности в реальном времени",
    ch: "具有实时跟踪您表现的自定义链接",
    hi: "आपके प्रदर्शन की रियल-टाइम ट्रैकिंग के साथ कस्टम लिंक",
    ar: "روابط مخصصة مع تتبع في الوقت الفعلي لأدائك"
  },

  "influencer.tools.card3.title": {
    fr: "Scripts & Templates",
    en: "Scripts & Templates",
    es: "Scripts y Plantillas",
    de: "Skripte & Vorlagen",
    pt: "Scripts e Modelos",
    ru: "Скрипты и Шаблоны",
    ch: "脚本和模板",
    hi: "स्क्रिप्ट और टेम्पलेट्स",
    ar: "نصوص وقوالب"
  },
  "influencer.tools.card3.description": {
    fr: "Textes prêts à l'emploi pour vos stories, captions et vidéos",
    en: "Ready-to-use texts for your stories, captions and videos",
    es: "Textos listos para usar para sus historias, subtítulos y videos",
    de: "Gebrauchsfertige Texte für Ihre Stories, Bildunterschriften und Videos",
    pt: "Textos prontos para usar em suas stories, legendas e vídeos",
    ru: "Готовые к использованию тексты для ваших историй, подписей и видео",
    ch: "适用于您的故事、标题和视频的即用文本",
    hi: "आपकी स्टोरीज, कैप्शन और वीडियो के लिए उपयोग के लिए तैयार पाठ",
    ar: "نصوص جاهزة للاستخدام لقصصك وتسميات التوضيحية ومقاطع الفيديو"
  },

  // CTA Section
  "influencer.cta.title": {
    fr: "Prêt à Transformer Votre Influence en Revenus ?",
    en: "Ready to Transform Your Influence Into Revenue?",
    es: "¿Listo para Transformar Su Influencia en Ingresos?",
    de: "Bereit, Ihren Einfluss in Einnahmen zu Verwandeln?",
    pt: "Pronto para Transformar Sua Influência em Receita?",
    ru: "Готовы Превратить Свое Влияние в Доход?",
    ch: "准备好将您的影响力转化为收入了吗？",
    hi: "अपने प्रभाव को आय में बदलने के लिए तैयार हैं?",
    ar: "مستعد لتحويل تأثيرك إلى دخل؟"
  },
  "influencer.cta.subtitle": {
    fr: "Rejoignez des centaines d'influenceurs qui gagnent déjà avec SOS Expat",
    en: "Join hundreds of influencers who are already earning with SOS Expat",
    es: "Únase a cientos de influencers que ya están ganando con SOS Expat",
    de: "Schließen Sie sich Hunderten von Influencern an, die bereits mit SOS Expat verdienen",
    pt: "Junte-se a centenas de influenciadores que já estão ganhando com o SOS Expat",
    ru: "Присоединяйтесь к сотням инфлюенсеров, которые уже зарабатывают с SOS Expat",
    ch: "加入数百名已经通过 SOS Expat 赚钱的网红",
    hi: "सैकड़ों इन्फ्लुएंसर्स में शामिल हों जो पहले से ही SOS Expat के साथ कमा रहे हैं",
    ar: "انضم إلى مئات المؤثرين الذين يكسبون بالفعل مع SOS Expat"
  },
  "influencer.cta.button": {
    fr: "Commencer Maintenant",
    en: "Start Now",
    es: "Comenzar Ahora",
    de: "Jetzt Starten",
    pt: "Começar Agora",
    ru: "Начать Сейчас",
    ch: "立即开始",
    hi: "अभी शुरू करें",
    ar: "ابدأ الآن"
  },

  // FAQ Section
  "influencer.faq.title": {
    fr: "Questions Fréquentes",
    en: "Frequently Asked Questions",
    es: "Preguntas Frecuentes",
    de: "Häufig Gestellte Fragen",
    pt: "Perguntas Frequentes",
    ru: "Часто Задаваемые Вопросы",
    ch: "常见问题",
    hi: "अक्सर पूछे जाने वाले प्रश्न",
    ar: "الأسئلة المتكررة"
  },

  "influencer.faq.q1": {
    fr: "Comment puis-je m'inscrire comme influenceur ?",
    en: "How can I sign up as an influencer?",
    es: "¿Cómo puedo registrarme como influencer?",
    de: "Wie kann ich mich als Influencer anmelden?",
    pt: "Como posso me cadastrar como influenciador?",
    ru: "Как я могу зарегистрироваться в качестве инфлюенсера?",
    ch: "我如何注册成为网红？",
    hi: "मैं इन्फ्लुएंसर के रूप में कैसे साइन अप कर सकता हूं?",
    ar: "كيف يمكنني التسجيل كمؤثر؟"
  },
  "influencer.faq.a1": {
    fr: "Cliquez sur 'Devenir Influenceur Partenaire', remplissez le formulaire d'inscription et vous recevrez votre lien unique immédiatement.",
    en: "Click 'Become Partner Influencer', fill out the registration form and you'll receive your unique link immediately.",
    es: "Haga clic en 'Convertirse en Influencer Socio', complete el formulario de registro y recibirá su enlace único de inmediato.",
    de: "Klicken Sie auf 'Partner-Influencer Werden', füllen Sie das Anmeldeformular aus und Sie erhalten sofort Ihren einzigartigen Link.",
    pt: "Clique em 'Tornar-se Influenciador Parceiro', preencha o formulário de cadastro e você receberá seu link exclusivo imediatamente.",
    ru: "Нажмите 'Стать Партнером-Инфлюенсером', заполните регистрационную форму, и вы сразу же получите свою уникальную ссылку.",
    ch: "点击'成为合作网红'，填写注册表格，您将立即收到您的唯一链接。",
    hi: "'पार्टनर इन्फ्लुएंसर बनें' पर क्लिक करें, पंजीकरण फॉर्म भरें और आपको तुरंत अपना अनूठा लिंक प्राप्त होगा।",
    ar: "انقر فوق 'كن مؤثرًا شريكًا'، املأ نموذج التسجيل وستتلقى رابطك الفريد على الفور."
  },

  "influencer.faq.q2": {
    fr: "Quand vais-je recevoir mes commissions ?",
    en: "When will I receive my commissions?",
    es: "¿Cuándo recibiré mis comisiones?",
    de: "Wann erhalte ich meine Provisionen?",
    pt: "Quando vou receber minhas comissões?",
    ru: "Когда я получу свои комиссии?",
    ch: "我什么时候会收到我的佣金？",
    hi: "मुझे अपना कमीशन कब मिलेगा?",
    ar: "متى سأحصل على عمولاتي؟"
  },
  "influencer.faq.a2": {
    fr: "Les paiements sont effectués chaque semaine, à condition d'avoir atteint le seuil minimum de 100€.",
    en: "Payments are made weekly, provided you've reached the minimum threshold of €100.",
    es: "Los pagos se realizan semanalmente, siempre que haya alcanzado el umbral mínimo de 100€.",
    de: "Zahlungen erfolgen wöchentlich, sofern Sie die Mindestschwelle von 100 € erreicht haben.",
    pt: "Os pagamentos são feitos semanalmente, desde que você tenha atingido o limite mínimo de 100€.",
    ru: "Выплаты производятся еженедельно при условии достижения минимального порога в 100 €.",
    ch: "只要您达到最低门槛 100 欧元，每周都会付款。",
    hi: "भुगतान साप्ताहिक किया जाता है, बशर्ते आपने € 100 की न्यूनतम सीमा पार कर ली हो।",
    ar: "يتم الدفع أسبوعيًا، بشرط أن تكون قد وصلت إلى الحد الأدنى وهو 100 يورو."
  },

  "influencer.faq.q3": {
    fr: "Y a-t-il un nombre minimum de followers requis ?",
    en: "Is there a minimum number of followers required?",
    es: "¿Hay un número mínimo de seguidores requerido?",
    de: "Gibt es eine Mindestanzahl von Followern?",
    pt: "Existe um número mínimo de seguidores necessário?",
    ru: "Есть ли минимальное количество подписчиков?",
    ch: "是否需要最低粉丝数？",
    hi: "क्या फॉलोअर्स की न्यूनतम संख्या की आवश्यकता है?",
    ar: "هل هناك حد أدنى من المتابعين المطلوبين؟"
  },
  "influencer.faq.a3": {
    fr: "Non, nous acceptons tous les influenceurs motivés, quelle que soit la taille de leur audience. La qualité de l'engagement compte plus que le nombre de followers.",
    en: "No, we accept all motivated influencers, regardless of their audience size. Quality of engagement matters more than follower count.",
    es: "No, aceptamos a todos los influencers motivados, independientemente del tamaño de su audiencia. La calidad del compromiso importa más que el número de seguidores.",
    de: "Nein, wir akzeptieren alle motivierten Influencer, unabhängig von der Größe ihres Publikums. Die Qualität des Engagements ist wichtiger als die Anzahl der Follower.",
    pt: "Não, aceitamos todos os influenciadores motivados, independentemente do tamanho de seu público. A qualidade do engajamento importa mais do que o número de seguidores.",
    ru: "Нет, мы принимаем всех мотивированных инфлюенсеров, независимо от размера их аудитории. Качество вовлеченности важнее количества подписчиков.",
    ch: "不，我们接受所有有动力的网红，无论他们的受众规模如何。参与质量比粉丝数量更重要。",
    hi: "नहीं, हम सभी प्रेरित इन्फ्लुएंसर्स को स्वीकार करते हैं, भले ही उनके दर्शकों का आकार कुछ भी हो। जुड़ाव की गुणवत्ता फॉलोअर्स की संख्या से अधिक मायने रखती है।",
    ar: "لا، نحن نقبل جميع المؤثرين المتحمسين، بغض النظر عن حجم جمهورهم. جودة المشاركة أهم من عدد المتابعين."
  }
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
function addTranslations() {
  console.log('🌍 Ajout des traductions Blogger et Influencer...\n');

  let totalAdded = 0;
  let totalUpdated = 0;

  languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);

    try {
      // Lire le fichier existant
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      let added = 0;
      let updated = 0;

      // Ajouter les traductions Blogger
      Object.entries(bloggerTranslations).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        } else if (translations[key] !== values[lang]) {
          translations[key] = values[lang];
          updated++;
        }
      });

      // Ajouter les traductions Influencer
      Object.entries(influencerTranslations).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        } else if (translations[key] !== values[lang]) {
          translations[key] = values[lang];
          updated++;
        }
      });

      // Sauvegarder avec formatage
      fs.writeFileSync(
        filePath,
        JSON.stringify(translations, null, 2) + '\n',
        'utf8'
      );

      console.log(`✅ ${lang.toUpperCase()}: ${added} ajoutées, ${updated} mises à jour`);
      totalAdded += added;
      totalUpdated += updated;

    } catch (error) {
      console.error(`❌ Erreur pour ${lang}.json:`, error.message);
    }
  });

  console.log(`\n✨ Total: ${totalAdded} traductions ajoutées, ${totalUpdated} mises à jour`);
  console.log('📦 Blogger: 12 clés ajoutées');
  console.log('📦 Influencer: 138 clés ajoutées');
}

// ==========================================
// EXÉCUTION
// ==========================================
addTranslations();

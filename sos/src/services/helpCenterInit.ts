// src/services/helpCenterInit.ts
// Script d'initialisation COMPLET des catégories du centre d'aide
// Selon l'architecture définie dans la mission

import { createHelpCategory, listHelpCategories } from "./helpCenter";

// =============================================================================
// CATÉGORIES PRINCIPALES (5)
// =============================================================================
const MAIN_CATEGORIES = [
  {
    name: {
      fr: "Pour les Clients Expatriés",
      en: "For Expatriate Clients",
      es: "Para Clientes Expatriados",
      de: "Für Expatriate-Kunden",
      pt: "Para Clientes Expatriados",
      ru: "Для клиентов-экспатов",
      hi: "प्रवासी ग्राहकों के लिए",
      ar: "للعملاء المغتربين",
      ch: "外籍客户专区"
    },
    slug: {
      fr: "clients-expatries",
      en: "expatriate-clients",
      es: "clientes-expatriados",
      de: "expatriate-kunden",
      pt: "clientes-expatriados",
      ru: "klienty-ekspaty",
      hi: "pravasi-grahak",
      ar: "umala-mughtaribin",
      ch: "waiji-kehu"
    },
    icon: "users",
    order: 1,
    isPublished: true,
    locale: "fr"
  },
  {
    name: {
      fr: "Pour les Prestataires Avocats",
      en: "For Lawyer Providers",
      es: "Para Proveedores Abogados",
      de: "Für Anwälte als Anbieter",
      pt: "Para Advogados Prestadores",
      ru: "Для поставщиков-адвокатов",
      hi: "वकील प्रदाताओं के लिए",
      ar: "لمقدمي الخدمات المحامين",
      ch: "律师服务提供商专区"
    },
    slug: {
      fr: "prestataires-avocats",
      en: "lawyer-providers",
      es: "proveedores-abogados",
      de: "anwalt-anbieter",
      pt: "advogados-prestadores",
      ru: "postavshchiki-advokaty",
      hi: "vakil-pradaata",
      ar: "muqaddimi-khidmat-muhamin",
      ch: "lvshi-fuwu"
    },
    icon: "briefcase",
    order: 2,
    isPublished: true,
    locale: "fr"
  },
  {
    name: {
      fr: "Pour les Prestataires Expat Aidant",
      en: "For Expat Helper Providers",
      es: "Para Proveedores Expat Ayudante",
      de: "Für Expat-Helfer Anbieter",
      pt: "Para Prestadores Expat Ajudante",
      ru: "Для поставщиков-помощников экспатов",
      hi: "एक्सपैट हेल्पर प्रदाताओं के लिए",
      ar: "لمقدمي خدمات المغتربين المساعدين",
      ch: "外籍助手服务提供商专区"
    },
    slug: {
      fr: "prestataires-expat-aidant",
      en: "expat-helper-providers",
      es: "proveedores-expat-ayudante",
      de: "expat-helfer-anbieter",
      pt: "prestadores-expat-ajudante",
      ru: "postavshchiki-pomoshchniki",
      hi: "expat-helper-pradaata",
      ar: "muqaddimi-khidmat-mughtrbin",
      ch: "waiji-zhushou-fuwu"
    },
    icon: "heart-handshake",
    order: 3,
    isPublished: true,
    locale: "fr"
  },
  {
    name: {
      fr: "Comprendre SOS-Expat",
      en: "Understanding SOS-Expat",
      es: "Entender SOS-Expat",
      de: "SOS-Expat verstehen",
      pt: "Entender o SOS-Expat",
      ru: "Понимание SOS-Expat",
      hi: "SOS-Expat को समझें",
      ar: "فهم SOS-Expat",
      ch: "了解SOS-Expat"
    },
    slug: {
      fr: "comprendre-sos-expat",
      en: "understanding-sos-expat",
      es: "entender-sos-expat",
      de: "sos-expat-verstehen",
      pt: "entender-sos-expat",
      ru: "ponimanie-sos-expat",
      hi: "sos-expat-samjhe",
      ar: "fahm-sos-expat",
      ch: "liaojie-sos-expat"
    },
    icon: "info",
    order: 4,
    isPublished: true,
    locale: "fr"
  },
  {
    name: {
      fr: "Guides par Situation",
      en: "Guides by Situation",
      es: "Guías por Situación",
      de: "Leitfäden nach Situation",
      pt: "Guias por Situação",
      ru: "Руководства по ситуациям",
      hi: "स्थिति के अनुसार गाइड",
      ar: "أدلة حسب الموقف",
      ch: "情况指南"
    },
    slug: {
      fr: "guides-situations",
      en: "situation-guides",
      es: "guias-situaciones",
      de: "situations-leitfaden",
      pt: "guias-situacoes",
      ru: "rukovodstva-situatsii",
      hi: "sthiti-guide",
      ar: "adilla-mawaqif",
      ch: "qingkuang-zhinan"
    },
    icon: "map",
    order: 5,
    isPublished: true,
    locale: "fr"
  }
];

// =============================================================================
// SOUS-CATÉGORIES CLIENTS EXPATRIÉS (5)
// =============================================================================
const CLIENT_SUBCATEGORIES = [
  {
    name: {
      fr: "Urgences & Premiers Pas",
      en: "Emergencies & First Steps",
      es: "Emergencias y Primeros Pasos",
      de: "Notfälle & Erste Schritte",
      pt: "Emergências e Primeiros Passos",
      ru: "Экстренные ситуации и первые шаги",
      hi: "आपातकाल और पहले कदम",
      ar: "حالات الطوارئ والخطوات الأولى",
      ch: "紧急情况和第一步"
    },
    slug: {
      fr: "urgences-premiers-pas",
      en: "emergencies-first-steps",
      es: "emergencias-primeros-pasos",
      de: "notfaelle-erste-schritte",
      pt: "emergencias-primeiros-passos",
      ru: "ekstrennyye-pervyye-shagi",
      hi: "aapatkal-pehle-kadam",
      ar: "tawari-khutuwat-ula",
      ch: "jinji-diyibu"
    },
    icon: "alert-triangle",
    order: 11,
    isPublished: true,
    locale: "fr",
    parentSlug: "clients-expatries"
  },
  {
    name: {
      fr: "Paiements & Frais",
      en: "Payments & Fees",
      es: "Pagos y Tarifas",
      de: "Zahlungen & Gebühren",
      pt: "Pagamentos e Taxas",
      ru: "Платежи и сборы",
      hi: "भुगतान और शुल्क",
      ar: "المدفوعات والرسوم",
      ch: "付款和费用"
    },
    slug: {
      fr: "paiements-frais",
      en: "payments-fees",
      es: "pagos-tarifas",
      de: "zahlungen-gebuehren",
      pt: "pagamentos-taxas",
      ru: "platezhi-sbory",
      hi: "bhugtan-shulk",
      ar: "madfu'at-rusum",
      ch: "fukuan-feiyong"
    },
    icon: "credit-card",
    order: 12,
    isPublished: true,
    locale: "fr",
    parentSlug: "clients-expatries"
  },
  {
    name: {
      fr: "Mon Compte Client",
      en: "My Client Account",
      es: "Mi Cuenta de Cliente",
      de: "Mein Kundenkonto",
      pt: "Minha Conta de Cliente",
      ru: "Мой клиентский аккаунт",
      hi: "मेरा ग्राहक खाता",
      ar: "حسابي كعميل",
      ch: "我的客户账户"
    },
    slug: {
      fr: "mon-compte-client",
      en: "my-client-account",
      es: "mi-cuenta-cliente",
      de: "mein-kundenkonto",
      pt: "minha-conta-cliente",
      ru: "moy-klientskiy-akkaunt",
      hi: "mera-grahak-khata",
      ar: "hisabi-kamil",
      ch: "wode-kehu-zhanghu"
    },
    icon: "user",
    order: 13,
    isPublished: true,
    locale: "fr",
    parentSlug: "clients-expatries"
  },
  {
    name: {
      fr: "Évaluations & Qualité",
      en: "Reviews & Quality",
      es: "Evaluaciones y Calidad",
      de: "Bewertungen & Qualität",
      pt: "Avaliações e Qualidade",
      ru: "Отзывы и качество",
      hi: "मूल्यांकन और गुणवत्ता",
      ar: "التقييمات والجودة",
      ch: "评价和质量"
    },
    slug: {
      fr: "evaluations-qualite",
      en: "reviews-quality",
      es: "evaluaciones-calidad",
      de: "bewertungen-qualitaet",
      pt: "avaliacoes-qualidade",
      ru: "otzyvy-kachestvo",
      hi: "mulyankan-gunvatta",
      ar: "taqyimat-jawda",
      ch: "pingjia-zhiliang"
    },
    icon: "star",
    order: 14,
    isPublished: true,
    locale: "fr",
    parentSlug: "clients-expatries"
  },
  {
    name: {
      fr: "Sécurité & Confidentialité",
      en: "Security & Privacy",
      es: "Seguridad y Privacidad",
      de: "Sicherheit & Datenschutz",
      pt: "Segurança e Privacidade",
      ru: "Безопасность и конфиденциальность",
      hi: "सुरक्षा और गोपनीयता",
      ar: "الأمان والخصوصية",
      ch: "安全与隐私"
    },
    slug: {
      fr: "securite-confidentialite",
      en: "security-privacy",
      es: "seguridad-privacidad",
      de: "sicherheit-datenschutz",
      pt: "seguranca-privacidade",
      ru: "bezopasnost-konfidentsialnost",
      hi: "suraksha-gopniyata",
      ar: "aman-khususiya",
      ch: "anquan-yinsi"
    },
    icon: "shield",
    order: 15,
    isPublished: true,
    locale: "fr",
    parentSlug: "clients-expatries"
  }
];

// =============================================================================
// SOUS-CATÉGORIES PRESTATAIRES AVOCATS (5)
// =============================================================================
const LAWYER_SUBCATEGORIES = [
  {
    name: {
      fr: "Rejoindre SOS-Expat",
      en: "Join SOS-Expat",
      es: "Unirse a SOS-Expat",
      de: "SOS-Expat beitreten",
      pt: "Juntar-se ao SOS-Expat",
      ru: "Присоединиться к SOS-Expat",
      hi: "SOS-Expat से जुड़ें",
      ar: "انضم إلى SOS-Expat",
      ch: "加入SOS-Expat"
    },
    slug: {
      fr: "rejoindre-sos-expat-avocat",
      en: "join-sos-expat-lawyer",
      es: "unirse-sos-expat-abogado",
      de: "sos-expat-beitreten-anwalt",
      pt: "juntar-sos-expat-advogado",
      ru: "prisoedinitsya-advokat",
      hi: "sos-expat-jude-vakil",
      ar: "indam-sos-expat-muhami",
      ch: "jiaru-sos-expat-lvshi"
    },
    icon: "rocket",
    order: 21,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-avocats"
  },
  {
    name: {
      fr: "Gérer mes Missions",
      en: "Manage My Missions",
      es: "Gestionar mis Misiones",
      de: "Meine Aufträge verwalten",
      pt: "Gerir as minhas Missões",
      ru: "Управление моими миссиями",
      hi: "मेरे मिशन प्रबंधित करें",
      ar: "إدارة مهماتي",
      ch: "管理我的任务"
    },
    slug: {
      fr: "gerer-missions-avocat",
      en: "manage-missions-lawyer",
      es: "gestionar-misiones-abogado",
      de: "auftraege-verwalten-anwalt",
      pt: "gerir-missoes-advogado",
      ru: "upravlenie-missiyami-advokat",
      hi: "mission-prabandhan-vakil",
      ar: "idarat-muhimmat-muhami",
      ch: "guanli-renwu-lvshi"
    },
    icon: "briefcase",
    order: 22,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-avocats"
  },
  {
    name: {
      fr: "Paiements & Revenus Avocats",
      en: "Lawyer Payments & Earnings",
      es: "Pagos e Ingresos Abogados",
      de: "Anwalts-Zahlungen & Einnahmen",
      pt: "Pagamentos e Rendimentos Advogados",
      ru: "Платежи и доходы адвокатов",
      hi: "वकील भुगतान और आय",
      ar: "مدفوعات وإيرادات المحامين",
      ch: "律师付款和收入"
    },
    slug: {
      fr: "paiements-revenus-avocats",
      en: "payments-earnings-lawyers",
      es: "pagos-ingresos-abogados",
      de: "zahlungen-einnahmen-anwaelte",
      pt: "pagamentos-rendimentos-advogados",
      ru: "platezhi-dokhody-advokaty",
      hi: "bhugtan-aay-vakil",
      ar: "madfu'at-iradat-muhamin",
      ch: "fukuan-shouru-lvshi"
    },
    icon: "wallet",
    order: 23,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-avocats"
  },
  {
    name: {
      fr: "Performance & Visibilité",
      en: "Performance & Visibility",
      es: "Rendimiento y Visibilidad",
      de: "Leistung & Sichtbarkeit",
      pt: "Desempenho e Visibilidade",
      ru: "Производительность и видимость",
      hi: "प्रदर्शन और दृश्यता",
      ar: "الأداء والرؤية",
      ch: "性能和可见性"
    },
    slug: {
      fr: "performance-visibilite-avocat",
      en: "performance-visibility-lawyer",
      es: "rendimiento-visibilidad-abogado",
      de: "leistung-sichtbarkeit-anwalt",
      pt: "desempenho-visibilidade-advogado",
      ru: "proizvoditelnost-vidimost-advokat",
      hi: "pradarshan-drishyata-vakil",
      ar: "ada-ruya-muhami",
      ch: "xingneng-kejianxing-lvshi"
    },
    icon: "trending-up",
    order: 24,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-avocats"
  },
  {
    name: {
      fr: "Déontologie & Conformité",
      en: "Ethics & Compliance",
      es: "Deontología y Cumplimiento",
      de: "Berufsethik & Compliance",
      pt: "Deontologia e Conformidade",
      ru: "Этика и соответствие",
      hi: "नैतिकता और अनुपालन",
      ar: "الأخلاقيات والامتثال",
      ch: "职业道德与合规"
    },
    slug: {
      fr: "deontologie-conformite",
      en: "ethics-compliance",
      es: "deontologia-cumplimiento",
      de: "berufsethik-compliance",
      pt: "deontologia-conformidade",
      ru: "etika-sootvetstvie",
      hi: "naitikta-anuplan",
      ar: "akhlaqiyat-imtithal",
      ch: "zhiye-daode-hegui"
    },
    icon: "scale",
    order: 25,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-avocats"
  }
];

// =============================================================================
// SOUS-CATÉGORIES PRESTATAIRES EXPAT AIDANT (4)
// =============================================================================
const HELPER_SUBCATEGORIES = [
  {
    name: {
      fr: "Devenir Expat Aidant",
      en: "Become an Expat Helper",
      es: "Convertirse en Expat Ayudante",
      de: "Expat-Helfer werden",
      pt: "Tornar-se Expat Ajudante",
      ru: "Стать помощником экспатов",
      hi: "एक्सपैट हेल्पर बनें",
      ar: "كن مساعد مغتربين",
      ch: "成为外籍助手"
    },
    slug: {
      fr: "devenir-expat-aidant",
      en: "become-expat-helper",
      es: "convertirse-expat-ayudante",
      de: "expat-helfer-werden",
      pt: "tornar-expat-ajudante",
      ru: "stat-pomoshchnikom",
      hi: "expat-helper-bane",
      ar: "kun-musaid-mughtarib",
      ch: "chengwei-waiji-zhushou"
    },
    icon: "rocket",
    order: 31,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-expat-aidant"
  },
  {
    name: {
      fr: "Gérer mes Interventions",
      en: "Manage My Interventions",
      es: "Gestionar mis Intervenciones",
      de: "Meine Einsätze verwalten",
      pt: "Gerir as minhas Intervenções",
      ru: "Управление моими вмешательствами",
      hi: "मेरे हस्तक्षेप प्रबंधित करें",
      ar: "إدارة تدخلاتي",
      ch: "管理我的干预"
    },
    slug: {
      fr: "gerer-interventions",
      en: "manage-interventions",
      es: "gestionar-intervenciones",
      de: "einsaetze-verwalten",
      pt: "gerir-intervencoes",
      ru: "upravlenie-vmeshatelstvami",
      hi: "hastakshep-prabandhan",
      ar: "idarat-tadakhulat",
      ch: "guanli-ganyu"
    },
    icon: "clipboard-list",
    order: 32,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-expat-aidant"
  },
  {
    name: {
      fr: "Paiements & Revenus Aidants",
      en: "Helper Payments & Earnings",
      es: "Pagos e Ingresos Ayudantes",
      de: "Helfer-Zahlungen & Einnahmen",
      pt: "Pagamentos e Rendimentos Ajudantes",
      ru: "Платежи и доходы помощников",
      hi: "हेल्पर भुगतान और आय",
      ar: "مدفوعات وإيرادات المساعدين",
      ch: "助手付款和收入"
    },
    slug: {
      fr: "paiements-revenus-aidants",
      en: "payments-earnings-helpers",
      es: "pagos-ingresos-ayudantes",
      de: "zahlungen-einnahmen-helfer",
      pt: "pagamentos-rendimentos-ajudantes",
      ru: "platezhi-dokhody-pomoshchniki",
      hi: "bhugtan-aay-helper",
      ar: "madfu'at-iradat-musaidin",
      ch: "fukuan-shouru-zhushou"
    },
    icon: "wallet",
    order: 33,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-expat-aidant"
  },
  {
    name: {
      fr: "Développer votre Activité",
      en: "Grow Your Business",
      es: "Desarrollar su Actividad",
      de: "Ihr Geschäft entwickeln",
      pt: "Desenvolver a sua Atividade",
      ru: "Развивайте свой бизнес",
      hi: "अपना व्यवसाय बढ़ाएं",
      ar: "طور نشاطك",
      ch: "发展您的业务"
    },
    slug: {
      fr: "developper-activite",
      en: "grow-business",
      es: "desarrollar-actividad",
      de: "geschaeft-entwickeln",
      pt: "desenvolver-atividade",
      ru: "razvitie-biznesa",
      hi: "vyavsay-badhaye",
      ar: "tatwir-nashat",
      ch: "fazhan-yewu"
    },
    icon: "trending-up",
    order: 34,
    isPublished: true,
    locale: "fr",
    parentSlug: "prestataires-expat-aidant"
  }
];

// =============================================================================
// SOUS-CATÉGORIES COMPRENDRE SOS-EXPAT (4)
// =============================================================================
const UNDERSTAND_SUBCATEGORIES = [
  {
    name: {
      fr: "Présentation",
      en: "About Us",
      es: "Presentación",
      de: "Über uns",
      pt: "Apresentação",
      ru: "О нас",
      hi: "हमारे बारे में",
      ar: "نبذة عنا",
      ch: "关于我们"
    },
    slug: {
      fr: "presentation",
      en: "about-us",
      es: "presentacion",
      de: "ueber-uns",
      pt: "apresentacao",
      ru: "o-nas",
      hi: "hamare-bare-me",
      ar: "nabdha-anna",
      ch: "guanyu-women"
    },
    icon: "globe",
    order: 41,
    isPublished: true,
    locale: "fr",
    parentSlug: "comprendre-sos-expat"
  },
  {
    name: {
      fr: "FAQ Générale",
      en: "General FAQ",
      es: "FAQ General",
      de: "Allgemeine FAQ",
      pt: "FAQ Geral",
      ru: "Общие вопросы",
      hi: "सामान्य FAQ",
      ar: "الأسئلة الشائعة العامة",
      ch: "常见问题"
    },
    slug: {
      fr: "faq-generale",
      en: "general-faq",
      es: "faq-general",
      de: "allgemeine-faq",
      pt: "faq-geral",
      ru: "obshchie-voprosy",
      hi: "samanya-faq",
      ar: "asila-shaia-amma",
      ch: "changjian-wenti"
    },
    icon: "help-circle",
    order: 42,
    isPublished: true,
    locale: "fr",
    parentSlug: "comprendre-sos-expat"
  },
  {
    name: {
      fr: "Nous Contacter",
      en: "Contact Us",
      es: "Contáctenos",
      de: "Kontaktieren Sie uns",
      pt: "Contacte-nos",
      ru: "Свяжитесь с нами",
      hi: "संपर्क करें",
      ar: "اتصل بنا",
      ch: "联系我们"
    },
    slug: {
      fr: "nous-contacter",
      en: "contact-us",
      es: "contactenos",
      de: "kontaktieren-sie-uns",
      pt: "contacte-nos",
      ru: "svyazhites-s-nami",
      hi: "sampark-kare",
      ar: "itasil-bina",
      ch: "lianxi-women"
    },
    icon: "phone",
    order: 43,
    isPublished: true,
    locale: "fr",
    parentSlug: "comprendre-sos-expat"
  },
  {
    name: {
      fr: "Informations Légales",
      en: "Legal Information",
      es: "Información Legal",
      de: "Rechtliche Informationen",
      pt: "Informações Legais",
      ru: "Правовая информация",
      hi: "कानूनी जानकारी",
      ar: "المعلومات القانونية",
      ch: "法律信息"
    },
    slug: {
      fr: "informations-legales",
      en: "legal-information",
      es: "informacion-legal",
      de: "rechtliche-informationen",
      pt: "informacoes-legais",
      ru: "pravovaya-informatsiya",
      hi: "kanuni-jankari",
      ar: "malumat-qanuniya",
      ch: "falv-xinxi"
    },
    icon: "file-text",
    order: 44,
    isPublished: true,
    locale: "fr",
    parentSlug: "comprendre-sos-expat"
  }
];

// =============================================================================
// SOUS-CATÉGORIES GUIDES PAR SITUATION (2)
// =============================================================================
const SITUATION_SUBCATEGORIES = [
  {
    name: {
      fr: "Situations d'urgence",
      en: "Emergency Situations",
      es: "Situaciones de Emergencia",
      de: "Notfallsituationen",
      pt: "Situações de Emergência",
      ru: "Экстренные ситуации",
      hi: "आपातकालीन स्थितियां",
      ar: "حالات الطوارئ",
      ch: "紧急情况"
    },
    slug: {
      fr: "situations-urgence",
      en: "emergency-situations",
      es: "situaciones-emergencia",
      de: "notfallsituationen",
      pt: "situacoes-emergencia",
      ru: "ekstrennyye-situatsii",
      hi: "aapatkalin-sthitiyan",
      ar: "halat-tawari",
      ch: "jinji-qingkuang"
    },
    icon: "alert-circle",
    order: 51,
    isPublished: true,
    locale: "fr",
    parentSlug: "guides-situations"
  },
  {
    name: {
      fr: "Guides par Pays",
      en: "Country Guides",
      es: "Guías por País",
      de: "Länderführer",
      pt: "Guias por País",
      ru: "Руководства по странам",
      hi: "देश के अनुसार गाइड",
      ar: "أدلة حسب البلد",
      ch: "国家指南"
    },
    slug: {
      fr: "guides-pays",
      en: "country-guides",
      es: "guias-pais",
      de: "laenderfuehrer",
      pt: "guias-pais",
      ru: "rukovodstva-po-stranam",
      hi: "desh-guide",
      ar: "adilla-balad",
      ch: "guojia-zhinan"
    },
    icon: "map-pin",
    order: 52,
    isPublished: true,
    locale: "fr",
    parentSlug: "guides-situations"
  }
];

// =============================================================================
// TOUTES LES CATÉGORIES COMBINÉES
// =============================================================================
const ALL_CATEGORIES = [
  ...MAIN_CATEGORIES,
  ...CLIENT_SUBCATEGORIES,
  ...LAWYER_SUBCATEGORIES,
  ...HELPER_SUBCATEGORIES,
  ...UNDERSTAND_SUBCATEGORIES,
  ...SITUATION_SUBCATEGORIES
];

/**
 * Initialise TOUTES les catégories du centre d'aide (25 catégories au total)
 * @returns Le résultat de l'initialisation
 */
export async function initializeHelpCenterCategories(): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  total: number;
  errors: string[];
}> {
  const result = {
    success: true,
    created: 0,
    skipped: 0,
    total: ALL_CATEGORIES.length,
    errors: [] as string[]
  };

  try {
    // Vérifier si des catégories existent déjà
    const existingCategories = await listHelpCategories();
    const existingSlugs = new Set(
      existingCategories.map(c =>
        typeof c.slug === "string" ? c.slug : c.slug?.fr || ""
      )
    );

    console.log(`[initHelpCenter] ${existingCategories.length} catégories existantes, ${ALL_CATEGORIES.length} à créer`);

    for (const category of ALL_CATEGORIES) {
      const slugFr = category.slug.fr;

      if (existingSlugs.has(slugFr)) {
        result.skipped++;
        console.log(`[initHelpCenter] "${slugFr}" existe déjà, ignorée`);
        continue;
      }

      try {
        await createHelpCategory(category);
        result.created++;
        console.log(`[initHelpCenter] ✅ "${slugFr}" créée`);
      } catch (error) {
        const errorMsg = `Erreur "${slugFr}": ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(`[initHelpCenter] ❌ ${errorMsg}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`\n[initHelpCenter] TERMINÉ:`);
    console.log(`  - Total: ${result.total} catégories`);
    console.log(`  - Créées: ${result.created}`);
    console.log(`  - Ignorées: ${result.skipped}`);
    console.log(`  - Erreurs: ${result.errors.length}`);

  } catch (error) {
    result.success = false;
    result.errors.push(`Erreur globale: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Export des catégories pour référence
 */
export const HELP_CENTER_CATEGORIES = {
  main: MAIN_CATEGORIES,
  clientSubcategories: CLIENT_SUBCATEGORIES,
  lawyerSubcategories: LAWYER_SUBCATEGORIES,
  helperSubcategories: HELPER_SUBCATEGORIES,
  understandSubcategories: UNDERSTAND_SUBCATEGORIES,
  situationSubcategories: SITUATION_SUBCATEGORIES,
  all: ALL_CATEGORIES
};

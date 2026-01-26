// ========================================
// src/data/landing-pages/landing-slugs.ts
// Slugs traduits pour toutes les landing pages SEO
// 9 langues : FR, EN, ES, DE, PT, RU, ZH, AR, HI
// ========================================

export type LangCode = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi';

export interface TranslatedSlug {
  fr: string;
  en: string;
  es: string;
  de: string;
  pt: string;
  ru: string;
  zh: string;
  ar: string;
  hi: string;
}

// ========================================
// CATEGORIES AVOCATS (24 catégories)
// ========================================

export const LAWYER_CATEGORY_SLUGS: Record<string, TranslatedSlug> = {
  URG: {
    fr: "urgences",
    en: "emergencies",
    es: "emergencias",
    de: "notfaelle",
    pt: "emergencias",
    ru: "srochnye-sluchai",
    zh: "jinji-qingkuang",
    ar: "حالات-الطوارئ",
    hi: "aapatkaal"
  },
  CUR: {
    fr: "services-courants",
    en: "common-services",
    es: "servicios-corrientes",
    de: "laufende-dienstleistungen",
    pt: "servicos-correntes",
    ru: "tekushchie-uslugi",
    zh: "richang-fuwu",
    ar: "الخدمات-الجارية",
    hi: "vartaman-sevaen"
  },
  IMMI: {
    fr: "immigration-travail",
    en: "immigration-work",
    es: "inmigracion-trabajo",
    de: "einwanderung-arbeit",
    pt: "imigracao-trabalho",
    ru: "immigratsiya-rabota",
    zh: "yimin-gongzuo",
    ar: "الهجرة-والعمل",
    hi: "aapravasan-kaam"
  },
  TRAV: {
    fr: "droit-travail-international",
    en: "international-labor-law",
    es: "derecho-laboral-internacional",
    de: "internationales-arbeitsrecht",
    pt: "direito-trabalho-internacional",
    ru: "mezhdunarodnoe-trudovoe-pravo",
    zh: "guoji-laodongfa",
    ar: "قانون-العمل-الدولي",
    hi: "antarrashtriya-shram-kanoon"
  },
  IMMO: {
    fr: "immobilier",
    en: "real-estate",
    es: "inmobiliario",
    de: "immobilien",
    pt: "imobiliario",
    ru: "nedvizhimost",
    zh: "fangdichan",
    ar: "العقارات",
    hi: "achal-sampatti"
  },
  FISC: {
    fr: "fiscalite",
    en: "taxation",
    es: "fiscalidad",
    de: "besteuerung",
    pt: "fiscalidade",
    ru: "nalogooblozhenie",
    zh: "shuiwu",
    ar: "الضرائب",
    hi: "karadhaan"
  },
  FAM: {
    fr: "famille",
    en: "family",
    es: "familia",
    de: "familie",
    pt: "familia",
    ru: "semya",
    zh: "jiating",
    ar: "الأسرة",
    hi: "parivaar"
  },
  PATR: {
    fr: "patrimoine",
    en: "wealth-management",
    es: "patrimonio",
    de: "vermoegensverwaltung",
    pt: "patrimonio",
    ru: "upravlenie-aktivami",
    zh: "caifu-guanli",
    ar: "إدارة-الثروات",
    hi: "sampatti-prabandhan"
  },
  ENTR: {
    fr: "entreprise",
    en: "business",
    es: "empresa",
    de: "unternehmen",
    pt: "empresa",
    ru: "biznes",
    zh: "qiye",
    ar: "الأعمال",
    hi: "vyavsay"
  },
  ASSU: {
    fr: "assurances-protection",
    en: "insurance-protection",
    es: "seguros-proteccion",
    de: "versicherung-schutz",
    pt: "seguros-protecao",
    ru: "strakhovanie-zashchita",
    zh: "baoxian-baohu",
    ar: "التأمين-والحماية",
    hi: "beema-suraksha"
  },
  CONS: {
    fr: "consommation-services",
    en: "consumer-services",
    es: "consumo-servicios",
    de: "verbrauch-dienstleistungen",
    pt: "consumo-servicos",
    ru: "potreblenie-uslugi",
    zh: "xiaofei-fuwu",
    ar: "الاستهلاك-والخدمات",
    hi: "upbhog-sevaen"
  },
  BANK: {
    fr: "banque-finance",
    en: "banking-finance",
    es: "banca-finanzas",
    de: "bank-finanzwesen",
    pt: "banco-financas",
    ru: "bankovskoe-delo-finansy",
    zh: "yinhang-jinrong",
    ar: "الخدمات-المصرفية-والمالية",
    hi: "banking-vitt"
  },
  ARGT: {
    fr: "problemes-argent",
    en: "money-problems",
    es: "problemas-dinero",
    de: "geldprobleme",
    pt: "problemas-dinheiro",
    ru: "denezhnye-problemy",
    zh: "zijin-wenti",
    ar: "مشاكل-مالية",
    hi: "dhan-samasya"
  },
  RELA: {
    fr: "problemes-relationnels",
    en: "relationship-problems",
    es: "problemas-relacionales",
    de: "beziehungsprobleme",
    pt: "problemas-relacionais",
    ru: "problemy-v-otnosheniyakh",
    zh: "guanxi-wenti",
    ar: "مشاكل-العلاقات",
    hi: "sambandh-samasya"
  },
  TRAN: {
    fr: "transport",
    en: "transport",
    es: "transporte",
    de: "transport",
    pt: "transporte",
    ru: "transport",
    zh: "jiaotong",
    ar: "النقل",
    hi: "parivahan"
  },
  SANT: {
    fr: "sante",
    en: "health",
    es: "salud",
    de: "gesundheit",
    pt: "saude",
    ru: "zdorovye",
    zh: "jiankang",
    ar: "الصحة",
    hi: "swasthya"
  },
  NUM: {
    fr: "numerique",
    en: "digital",
    es: "digital",
    de: "digital",
    pt: "digital",
    ru: "tsifrovoy",
    zh: "shuzi",
    ar: "رقمي",
    hi: "digital"
  },
  VIO: {
    fr: "violences-discriminations",
    en: "violence-discrimination",
    es: "violencia-discriminacion",
    de: "gewalt-diskriminierung",
    pt: "violencia-discriminacao",
    ru: "nasilie-diskriminatsiya",
    zh: "baoli-qishi",
    ar: "العنف-والتمييز",
    hi: "hinsa-bhedbhav"
  },
  IP: {
    fr: "propriete-intellectuelle",
    en: "intellectual-property",
    es: "propiedad-intelectual",
    de: "geistiges-eigentum",
    pt: "propriedade-intelectual",
    ru: "intellektualnaya-sobstvennost",
    zh: "zhishi-chanquan",
    ar: "الملكية-الفكرية",
    hi: "bauddhik-sampada"
  },
  ENV: {
    fr: "environnement",
    en: "environment",
    es: "medio-ambiente",
    de: "umwelt",
    pt: "meio-ambiente",
    ru: "okruzhayushchaya-sreda",
    zh: "huanjing",
    ar: "البيئة",
    hi: "paryavaran"
  },
  COMP: {
    fr: "droit-compare-international",
    en: "international-comparative-law",
    es: "derecho-comparado-internacional",
    de: "internationales-rechtsvergleichung",
    pt: "direito-comparado-internacional",
    ru: "mezhdunarodnoe-sravnitelnoe-pravo",
    zh: "guoji-bijiao-fa",
    ar: "القانون-المقارن-الدولي",
    hi: "antarrashtriya-tulnatmak-kanoon"
  },
  EDUC: {
    fr: "education-reconnaissance",
    en: "education-recognition",
    es: "educacion-reconocimiento",
    de: "bildung-anerkennung",
    pt: "educacao-reconhecimento",
    ru: "obrazovanie-priznanie",
    zh: "jiaoyu-renke",
    ar: "التعليم-والاعتراف",
    hi: "shiksha-manyata"
  },
  RET: {
    fr: "retour-pays-origine",
    en: "return-home-country",
    es: "regreso-pais-origen",
    de: "rueckkehr-heimatland",
    pt: "retorno-pais-origem",
    ru: "vozvrashchenie-rodinu",
    zh: "huiguo",
    ar: "العودة-إلى-الوطن",
    hi: "swadesh-wapsi"
  },
  OTH: {
    fr: "autre",
    en: "other",
    es: "otro",
    de: "andere",
    pt: "outro",
    ru: "drugoe",
    zh: "qita",
    ar: "أخرى",
    hi: "anya"
  }
};

// ========================================
// SOUS-SPECIALITES AVOCATS (70 items)
// ========================================

export const LAWYER_SUBSPECIALTY_SLUGS: Record<string, TranslatedSlug> = {
  // === URGENCES ===
  URG_ASSISTANCE_PENALE_INTERNATIONALE: {
    fr: "assistance-penale-internationale",
    en: "international-criminal-assistance",
    es: "asistencia-penal-internacional",
    de: "internationale-strafrechtshilfe",
    pt: "assistencia-penal-internacional",
    ru: "mezhdunarodnaya-ugolovnaya-pomoshch",
    zh: "guoji-xingshi-yuanzhu",
    ar: "المساعدة-الجنائية-الدولية",
    hi: "antarrashtriya-aparadhik-sahayata"
  },
  URG_ACCIDENTS_RESPONSABILITE_CIVILE: {
    fr: "accidents-responsabilite-civile",
    en: "accidents-civil-liability",
    es: "accidentes-responsabilidad-civil",
    de: "unfaelle-haftpflicht",
    pt: "acidentes-responsabilidade-civil",
    ru: "neschastnye-sluchai-grazhdanskaya-otvetstvennost",
    zh: "shigu-minshi-zeren",
    ar: "الحوادث-والمسؤولية-المدنية",
    hi: "durghatna-nagrik-dayitva"
  },
  URG_RAPATRIEMENT_URGENCE: {
    fr: "rapatriement-urgence",
    en: "emergency-repatriation",
    es: "repatriacion-emergencia",
    de: "notfall-rueckfuehrung",
    pt: "repatriacao-emergencia",
    ru: "ekstrennaya-repatriatsiya",
    zh: "jinji-qianfan",
    ar: "الإعادة-الطارئة-إلى-الوطن",
    hi: "aapatkaalin-pratyavartan"
  },

  // === IMMIGRATION ===
  IMMI_VISAS_PERMIS_SEJOUR: {
    fr: "visas-permis-sejour",
    en: "visas-residence-permits",
    es: "visados-permisos-residencia",
    de: "visa-aufenthaltsgenehmigungen",
    pt: "vistos-autorizacoes-residencia",
    ru: "vizy-vid-zhitelstvo",
    zh: "qianzheng-juliu-xukezheng",
    ar: "التأشيرات-وتصاريح-الإقامة",
    hi: "visa-niwas-permit"
  },
  IMMI_CONTRATS_TRAVAIL_INTERNATIONAL: {
    fr: "contrats-travail-international",
    en: "international-employment-contracts",
    es: "contratos-trabajo-internacional",
    de: "internationale-arbeitsvertraege",
    pt: "contratos-trabalho-internacional",
    ru: "mezhdunarodnye-trudovye-dogovory",
    zh: "guoji-laodong-hetong",
    ar: "عقود-العمل-الدولية",
    hi: "antarrashtriya-rojgar-anubandh"
  },
  IMMI_NATURALISATION: {
    fr: "naturalisation",
    en: "naturalization",
    es: "naturalizacion",
    de: "einbuergerung",
    pt: "naturalizacao",
    ru: "naturalizatsiya",
    zh: "guihua",
    ar: "التجنس",
    hi: "nagrikta-praapti"
  },
  IMMI_VISA_ETUDIANT: {
    fr: "visa-etudiant",
    en: "student-visa",
    es: "visa-estudiante",
    de: "studentenvisum",
    pt: "visto-estudante",
    ru: "studencheskaya-viza",
    zh: "xuesheng-qianzheng",
    ar: "تأشيرة-طالب",
    hi: "chhatra-visa"
  },
  IMMI_VISA_INVESTISSEUR: {
    fr: "visa-investisseur-golden-visa",
    en: "investor-visa-golden-visa",
    es: "visa-inversor-golden-visa",
    de: "investorenvisum-golden-visa",
    pt: "visto-investidor-golden-visa",
    ru: "investorskaya-viza-zolotaya-viza",
    zh: "touzizhe-qianzheng-huangjin-qianzheng",
    ar: "تأشيرة-مستثمر-التأشيرة-الذهبية",
    hi: "niveshak-visa-golden-visa"
  },
  IMMI_VISA_RETRAITE: {
    fr: "visa-retraite",
    en: "retirement-visa",
    es: "visa-jubilado",
    de: "rentnervisum",
    pt: "visto-aposentado",
    ru: "pensionnaya-viza",
    zh: "tuixiu-qianzheng",
    ar: "تأشيرة-متقاعد",
    hi: "sevanivritti-visa"
  },
  IMMI_VISA_NOMADE_DIGITAL: {
    fr: "visa-nomade-digital",
    en: "digital-nomad-visa",
    es: "visa-nomada-digital",
    de: "visum-digitale-nomaden",
    pt: "visto-nomade-digital",
    ru: "viza-tsifrovogo-kochevnika",
    zh: "shuzi-youmin-qianzheng",
    ar: "تأشيرة-الرحالة-الرقمي",
    hi: "digital-nomad-visa"
  },
  IMMI_REGROUPEMENT_FAMILIAL: {
    fr: "regroupement-familial",
    en: "family-reunification",
    es: "reagrupacion-familiar",
    de: "familienzusammenfuehrung",
    pt: "reagrupamento-familiar",
    ru: "vossoedinenie-semi",
    zh: "jiating-tuanju",
    ar: "لم-شمل-الأسرة",
    hi: "parivar-punarmilan"
  },

  // === DROIT DU TRAVAIL ===
  TRAV_DROITS_TRAVAILLEURS: {
    fr: "droits-travailleurs-expatries",
    en: "expat-workers-rights",
    es: "derechos-trabajadores-expatriados",
    de: "rechte-arbeitnehmer-ausland",
    pt: "direitos-trabalhadores-expatriados",
    ru: "prava-rabotnikov-ekspatov",
    zh: "waipai-laogong-quanli",
    ar: "حقوق-العمال-المغتربين",
    hi: "pravasi-shramik-adhikaar"
  },
  TRAV_LICENCIEMENT_INTERNATIONAL: {
    fr: "licenciement-international",
    en: "international-dismissal",
    es: "despido-internacional",
    de: "internationale-kuendigung",
    pt: "despedimento-internacional",
    ru: "mezhdunarodnoe-uvolnenie",
    zh: "guoji-jiegu",
    ar: "الفصل-الدولي",
    hi: "antarrashtriya-barkhastagi"
  },
  TRAV_SECURITE_SOCIALE_INTERNATIONALE: {
    fr: "securite-sociale-internationale",
    en: "international-social-security",
    es: "seguridad-social-internacional",
    de: "internationale-sozialversicherung",
    pt: "seguranca-social-internacional",
    ru: "mezhdunarodnoe-sotsialnoe-strakhovanie",
    zh: "guoji-shehui-baozhang",
    ar: "الضمان-الاجتماعي-الدولي",
    hi: "antarrashtriya-samajik-suraksha"
  },
  TRAV_RETRAITE_INTERNATIONALE: {
    fr: "retraite-internationale",
    en: "international-retirement",
    es: "jubilacion-internacional",
    de: "internationale-rente",
    pt: "aposentadoria-internacional",
    ru: "mezhdunarodnaya-pensiya",
    zh: "guoji-yanglao",
    ar: "التقاعد-الدولي",
    hi: "antarrashtriya-sevanivritti"
  },
  TRAV_DETACHEMENT_EXPATRIATION: {
    fr: "detachement-expatriation",
    en: "secondment-expatriation",
    es: "destacamento-expatriacion",
    de: "entsendung-expatriierung",
    pt: "destacamento-expatriacao",
    ru: "komandirovanie-ekspatriatsiya",
    zh: "waipai-paiqian",
    ar: "الإعارة-والاغتراب",
    hi: "pratiniyukti-pravas"
  },
  TRAV_DISCRIMINATION_TRAVAIL: {
    fr: "discrimination-travail",
    en: "workplace-discrimination",
    es: "discriminacion-laboral",
    de: "arbeitsplatzdiskriminierung",
    pt: "discriminacao-trabalho",
    ru: "diskriminatsiya-rabochem-meste",
    zh: "zhichang-qishi",
    ar: "التمييز-في-العمل",
    hi: "karyasthal-bhedbhav"
  },

  // === IMMOBILIER ===
  IMMO_ACHAT_VENTE: {
    fr: "achat-vente-etranger",
    en: "purchase-sale-abroad",
    es: "compra-venta-extranjero",
    de: "kauf-verkauf-ausland",
    pt: "compra-venda-estrangeiro",
    ru: "pokupka-prodazha-za-granitsey",
    zh: "jingwai-maimai",
    ar: "الشراء-البيع-في-الخارج",
    hi: "videsh-kharid-bikri"
  },
  IMMO_LOCATION_BAUX: {
    fr: "location-baux",
    en: "rental-leases",
    es: "alquiler-arrendamientos",
    de: "vermietung-pachtvertraege",
    pt: "arrendamento-locacoes",
    ru: "arenda-dogovory-arendy",
    zh: "zulin-zuyue",
    ar: "الإيجار-والعقود",
    hi: "kiraya-patte"
  },
  IMMO_LITIGES_IMMOBILIERS: {
    fr: "litiges-immobiliers",
    en: "real-estate-disputes",
    es: "litigios-inmobiliarios",
    de: "immobilienstreitigkeiten",
    pt: "litigios-imobiliarios",
    ru: "spory-nedvizhimosti",
    zh: "fangdichan-jiufen",
    ar: "نزاعات-العقارات",
    hi: "sampatti-vivad"
  },

  // === FISCALITE ===
  FISC_DECLARATIONS_INTERNATIONALES: {
    fr: "declarations-fiscales-internationales",
    en: "international-tax-returns",
    es: "declaraciones-fiscales-internacionales",
    de: "internationale-steuererklaerungen",
    pt: "declaracoes-fiscais-internacionais",
    ru: "mezhdunarodnye-nalogovye-deklaratsii",
    zh: "guoji-shuiwu-shenbao",
    ar: "الإقرارات-الضريبية-الدولية",
    hi: "antarrashtriya-kar-return"
  },
  FISC_DOUBLE_IMPOSITION: {
    fr: "double-imposition",
    en: "double-taxation",
    es: "doble-imposicion",
    de: "doppelbesteuerung",
    pt: "dupla-tributacao",
    ru: "dvoynoe-nalogooblozhenie",
    zh: "shuangchong-zhengshui",
    ar: "الازدواج-الضريبي",
    hi: "dohra-karadhaan"
  },
  FISC_OPTIMISATION_EXPATRIES: {
    fr: "optimisation-fiscale-expatries",
    en: "expat-tax-optimization",
    es: "optimizacion-fiscal-expatriados",
    de: "steueroptimierung-expatriates",
    pt: "otimizacao-fiscal-expatriados",
    ru: "nalogovaya-optimizatsiya-ekspatov",
    zh: "waipai-shuiwu-youhua",
    ar: "تحسين-الضرائب-للمغتربين",
    hi: "pravasi-kar-anukoolit"
  },

  // === FAMILLE ===
  FAM_MARIAGE_DIVORCE: {
    fr: "mariage-divorce-international",
    en: "international-marriage-divorce",
    es: "matrimonio-divorcio-internacional",
    de: "internationale-ehe-scheidung",
    pt: "casamento-divorcio-internacional",
    ru: "mezhdunarodnyy-brak-razvod",
    zh: "guoji-hunyin-lihun",
    ar: "الزواج-الطلاق-الدولي",
    hi: "antarrashtriya-vivah-talak"
  },
  FAM_GARDE_ENFANTS_TRANSFRONTALIERE: {
    fr: "garde-enfants-transfrontaliere",
    en: "cross-border-child-custody",
    es: "custodia-ninos-transfronteriza",
    de: "grenzueberschreitendes-sorgerecht",
    pt: "guarda-criancas-transfronteirica",
    ru: "transgranichnaya-opeka-detmi",
    zh: "kuajing-ertong-jianhu",
    ar: "حضانة-الأطفال-عبر-الحدود",
    hi: "seema-paar-bal-hirasath"
  },
  FAM_SCOLARITE_INTERNATIONALE: {
    fr: "scolarite-internationale",
    en: "international-schooling",
    es: "escolaridad-internacional",
    de: "internationale-schulbildung",
    pt: "escolaridade-internacional",
    ru: "mezhdunarodnoe-obuchenie",
    zh: "guoji-jiaoyu",
    ar: "التعليم-الدولي",
    hi: "antarrashtriya-shiksha"
  },

  // === PATRIMOINE ===
  PATR_SUCCESSIONS_INTERNATIONALES: {
    fr: "successions-internationales",
    en: "international-inheritance",
    es: "sucesiones-internacionales",
    de: "internationale-erbschaften",
    pt: "sucessoes-internacionais",
    ru: "mezhdunarodnoe-nasledstvo",
    zh: "guoji-jicheng",
    ar: "الميراث-الدولي",
    hi: "antarrashtriya-uttaradhikar"
  },
  PATR_GESTION_PATRIMOINE: {
    fr: "gestion-patrimoine",
    en: "wealth-management",
    es: "gestion-patrimonial",
    de: "vermoegensverwaltung",
    pt: "gestao-patrimonial",
    ru: "upravlenie-kapitalom",
    zh: "zichan-guanli",
    ar: "إدارة-الأصول",
    hi: "sampatti-prabandhan"
  },
  PATR_TESTAMENTS: {
    fr: "testaments",
    en: "wills",
    es: "testamentos",
    de: "testamente",
    pt: "testamentos",
    ru: "zaveshchaniya",
    zh: "yizhu",
    ar: "الوصايا",
    hi: "vasiyat"
  },

  // === ENTREPRISE ===
  ENTR_CREATION_ENTREPRISE_ETRANGER: {
    fr: "creation-entreprise-etranger",
    en: "business-creation-abroad",
    es: "creacion-empresa-extranjero",
    de: "unternehmensgruendung-ausland",
    pt: "criacao-empresa-estrangeiro",
    ru: "sozdanie-biznesa-za-granitsey",
    zh: "jingwai-chuangye",
    ar: "إنشاء-شركة-في-الخارج",
    hi: "videsh-vyavsay-nirman"
  },
  ENTR_INVESTISSEMENTS: {
    fr: "investissements",
    en: "investments",
    es: "inversiones",
    de: "investitionen",
    pt: "investimentos",
    ru: "investitsii",
    zh: "touzi",
    ar: "الاستثمارات",
    hi: "nivesh"
  },
  ENTR_IMPORT_EXPORT: {
    fr: "import-export",
    en: "import-export",
    es: "importacion-exportacion",
    de: "import-export",
    pt: "importacao-exportacao",
    ru: "import-eksport",
    zh: "jinchukou",
    ar: "الاستيراد-التصدير",
    hi: "aayat-niryat"
  }
};

// ========================================
// SERVICES EXPATRIES (45 types)
// ========================================

export const EXPAT_SERVICE_SLUGS: Record<string, TranslatedSlug> = {
  INSTALLATION: {
    fr: "installation",
    en: "settling-in",
    es: "instalarse",
    de: "niederlassen",
    pt: "instalar-se",
    ru: "obustrojstvo",
    zh: "dingju",
    ar: "الاستقرار",
    hi: "basna"
  },
  DEMARCHES_ADMINISTRATIVES: {
    fr: "demarches-administratives",
    en: "administrative-procedures",
    es: "tramites-administrativos",
    de: "verwaltungsverfahren",
    pt: "procedimentos-administrativos",
    ru: "administrativnye-protsedury",
    zh: "xingzheng-shouxu",
    ar: "الإجراءات-الإدارية",
    hi: "prashasnik-prakriya"
  },
  RECHERCHE_LOGEMENT: {
    fr: "recherche-logement",
    en: "housing-search",
    es: "busqueda-vivienda",
    de: "wohnungssuche",
    pt: "procura-habitacao",
    ru: "poisk-zhilya",
    zh: "zhufang-sousu",
    ar: "البحث-عن-سكن",
    hi: "aawas-khoj"
  },
  OUVERTURE_COMPTE_BANCAIRE: {
    fr: "ouverture-compte-bancaire",
    en: "bank-account-opening",
    es: "apertura-cuenta-bancaria",
    de: "kontoeroeffnung",
    pt: "abertura-conta-bancaria",
    ru: "otkrytie-bankovskogo-scheta",
    zh: "kaili-yinhang-zhanghu",
    ar: "فتح-حساب-مصرفي",
    hi: "bank-khata-kholna"
  },
  SYSTEME_SANTE: {
    fr: "systeme-sante",
    en: "healthcare-system",
    es: "sistema-salud",
    de: "gesundheitssystem",
    pt: "sistema-saude",
    ru: "sistema-zdravookhraneniya",
    zh: "yiliao-xitong",
    ar: "نظام-الرعاية-الصحية",
    hi: "swasthya-pranali"
  },
  EDUCATION_ECOLES: {
    fr: "education-ecoles",
    en: "education-schools",
    es: "educacion-escuelas",
    de: "bildung-schulen",
    pt: "educacao-escolas",
    ru: "obrazovanie-shkoly",
    zh: "jiaoyu-xuexiao",
    ar: "التعليم-والمدارس",
    hi: "shiksha-vidyalay"
  },
  TRANSPORT: {
    fr: "transport",
    en: "transportation",
    es: "transporte",
    de: "transport",
    pt: "transporte",
    ru: "transport",
    zh: "jiaotong",
    ar: "النقل",
    hi: "parivahan"
  },
  RECHERCHE_EMPLOI: {
    fr: "recherche-emploi",
    en: "job-search",
    es: "busqueda-empleo",
    de: "jobsuche",
    pt: "procura-emprego",
    ru: "poisk-raboty",
    zh: "qiuzhi",
    ar: "البحث-عن-عمل",
    hi: "naukri-khoj"
  },
  CREATION_ENTREPRISE: {
    fr: "creation-entreprise",
    en: "business-creation",
    es: "creacion-empresa",
    de: "unternehmensgruendung",
    pt: "criacao-empresa",
    ru: "sozdanie-biznesa",
    zh: "chuangye",
    ar: "إنشاء-شركة",
    hi: "vyavsay-nirman"
  },
  FISCALITE_LOCALE: {
    fr: "fiscalite-locale",
    en: "local-taxation",
    es: "fiscalidad-local",
    de: "lokale-besteuerung",
    pt: "fiscalidade-local",
    ru: "mestnoe-nalogooblozhenie",
    zh: "difang-shuiwu",
    ar: "الضرائب-المحلية",
    hi: "sthaniya-karadhaan"
  },
  CULTURE_INTEGRATION: {
    fr: "culture-integration",
    en: "culture-integration",
    es: "cultura-integracion",
    de: "kultur-integration",
    pt: "cultura-integracao",
    ru: "kultura-integratsiya",
    zh: "wenhua-rongru",
    ar: "الثقافة-والاندماج",
    hi: "sanskriti-ekikaran"
  },
  VISA_IMMIGRATION: {
    fr: "visa-immigration",
    en: "visa-immigration",
    es: "visa-inmigracion",
    de: "visum-einwanderung",
    pt: "visto-imigracao",
    ru: "viza-immigratsiya",
    zh: "qianzheng-yimin",
    ar: "التأشيرة-والهجرة",
    hi: "visa-aapravasan"
  },
  ASSURANCES: {
    fr: "assurances",
    en: "insurance",
    es: "seguros",
    de: "versicherungen",
    pt: "seguros",
    ru: "strakhovanie",
    zh: "baoxian",
    ar: "التأمين",
    hi: "beema"
  },
  TELEPHONE_INTERNET: {
    fr: "telephone-internet",
    en: "phone-internet",
    es: "telefono-internet",
    de: "telefon-internet",
    pt: "telefone-internet",
    ru: "telefon-internet",
    zh: "dianhua-hulianwang",
    ar: "الهاتف-والإنترنت",
    hi: "phone-internet"
  },
  ALIMENTATION_COURSES: {
    fr: "alimentation-courses",
    en: "food-shopping",
    es: "alimentacion-compras",
    de: "lebensmittel-einkaufen",
    pt: "alimentacao-compras",
    ru: "pitanie-pokupki",
    zh: "shipin-gouwe",
    ar: "الطعام-والتسوق",
    hi: "bhojan-kharidari"
  },
  LOISIRS_SORTIES: {
    fr: "loisirs-sorties",
    en: "leisure-outings",
    es: "ocio-salidas",
    de: "freizeit-ausgehen",
    pt: "lazer-saidas",
    ru: "dosug-razvlecheniya",
    zh: "xiuxian-waichu",
    ar: "الترفيه-والخروج",
    hi: "manoranjan-bahar-jaana"
  },
  SPORTS_ACTIVITES: {
    fr: "sports-activites",
    en: "sports-activities",
    es: "deportes-actividades",
    de: "sport-aktivitaeten",
    pt: "desportos-atividades",
    ru: "sport-zanyatiya",
    zh: "yundong-huodong",
    ar: "الرياضة-والأنشطة",
    hi: "khel-gatividhi"
  },
  SECURITE: {
    fr: "securite",
    en: "security",
    es: "seguridad",
    de: "sicherheit",
    pt: "seguranca",
    ru: "bezopasnost",
    zh: "anquan",
    ar: "الأمن",
    hi: "suraksha"
  },
  URGENCES: {
    fr: "urgences",
    en: "emergencies",
    es: "emergencias",
    de: "notfaelle",
    pt: "emergencias",
    ru: "srochnye-sluchai",
    zh: "jinji-qingkuang",
    ar: "حالات-الطوارئ",
    hi: "aapatkaal"
  },
  PROBLEMES_ARGENT: {
    fr: "problemes-argent",
    en: "money-problems",
    es: "problemas-dinero",
    de: "geldprobleme",
    pt: "problemas-dinheiro",
    ru: "denezhnye-problemy",
    zh: "zijin-wenti",
    ar: "مشاكل-مالية",
    hi: "dhan-samasya"
  },
  PROBLEMES_RELATIONNELS: {
    fr: "problemes-relationnels",
    en: "relationship-problems",
    es: "problemas-relacionales",
    de: "beziehungsprobleme",
    pt: "problemas-relacionais",
    ru: "problemy-v-otnosheniyakh",
    zh: "guanxi-wenti",
    ar: "مشاكل-العلاقات",
    hi: "sambandh-samasya"
  },
  PROBLEMES_DIVERS: {
    fr: "problemes-divers",
    en: "various-problems",
    es: "problemas-diversos",
    de: "verschiedene-probleme",
    pt: "problemas-diversos",
    ru: "raznye-problemy",
    zh: "gezhong-wenti",
    ar: "مشاكل-متنوعة",
    hi: "vibhinn-samasya"
  },
  PARTIR_OU_RENTRER: {
    fr: "partir-ou-rentrer",
    en: "leaving-returning",
    es: "salir-volver",
    de: "abreisen-zurueckkehren",
    pt: "partir-voltar",
    ru: "uyezd-vozvrashchenie",
    zh: "likai-fanhui",
    ar: "المغادرة-أو-العودة",
    hi: "jaana-lauta-aana"
  },
  ARNAQUE_VOL: {
    fr: "arnaque-vol",
    en: "scam-theft",
    es: "estafa-robo",
    de: "betrug-diebstahl",
    pt: "fraude-roubo",
    ru: "moshennichestvo-krazha",
    zh: "zhapian-daoqie",
    ar: "احتيال-أو-سرقة",
    hi: "dhokha-chori"
  },
  PERTE_DOCUMENTS: {
    fr: "perte-documents",
    en: "lost-documents",
    es: "perdida-documentos",
    de: "verlorene-dokumente",
    pt: "perda-documentos",
    ru: "poterya-dokumentov",
    zh: "zhengjian-diushi",
    ar: "فقدان-الوثائق",
    hi: "dastavez-khoye"
  },
  ASSISTANCE_CONSULAIRE: {
    fr: "assistance-consulaire",
    en: "consular-assistance",
    es: "asistencia-consular",
    de: "konsular-hilfe",
    pt: "assistencia-consular",
    ru: "konsulskaya-pomoshch",
    zh: "lingshiguan-xiezzhu",
    ar: "المساعدة-القنصلية",
    hi: "vaanikya-sahayata"
  },
  HEBERGEMENT_URGENCE: {
    fr: "hebergement-urgence",
    en: "emergency-accommodation",
    es: "alojamiento-emergencia",
    de: "notunterkunft",
    pt: "alojamento-emergencia",
    ru: "ekstrennoe-zhilye",
    zh: "jinji-zhusuo",
    ar: "سكن-طوارئ",
    hi: "aapatkaalin-aawas"
  },
  TRADUCTION_INTERPRETATION: {
    fr: "traduction-interpretation",
    en: "translation-interpretation",
    es: "traduccion-interpretacion",
    de: "uebersetzung-dolmetschen",
    pt: "traducao-interpretacao",
    ru: "perevod-ustniy-perevod",
    zh: "fanyi-kouyi",
    ar: "الترجمة-والتفسير",
    hi: "anuvad-vyakhya"
  },
  PROBLEMES_VOYAGE: {
    fr: "problemes-voyage",
    en: "travel-problems",
    es: "problemas-viaje",
    de: "reiseprobleme",
    pt: "problemas-viagem",
    ru: "problemy-puteshestviyami",
    zh: "lvxing-wenti",
    ar: "مشاكل-السفر",
    hi: "yatra-samasya"
  },
  TRAVAIL_DISTANCE: {
    fr: "travail-distance-freelance",
    en: "remote-work-freelance",
    es: "trabajo-remoto-freelance",
    de: "remote-arbeit-freiberuflich",
    pt: "trabalho-remoto-freelancer",
    ru: "udalennaya-rabota-frilans",
    zh: "yuancheng-gongzuo-ziyouzhi",
    ar: "العمل-عن-بعد-العمل-الحر",
    hi: "door-kaam-freelance"
  },
  COWORKING_COLIVING: {
    fr: "coworking-coliving",
    en: "coworking-coliving",
    es: "coworking-coliving",
    de: "coworking-coliving",
    pt: "coworking-coliving",
    ru: "kovorking-koliving",
    zh: "gongxiang-bangong-gongju",
    ar: "العمل-المشترك-والسكن-المشترك",
    hi: "coworking-coliving"
  },
  FISCALITE_NOMADE: {
    fr: "fiscalite-nomade-digital",
    en: "digital-nomad-taxation",
    es: "fiscalidad-nomadas-digitales",
    de: "besteuerung-digitale-nomaden",
    pt: "fiscalidade-nomades-digitais",
    ru: "nalogooblozhenie-tsifrovykh-kochevnikov",
    zh: "shuzi-youmin-shuiwu",
    ar: "ضرائب-الرحالة-الرقميين",
    hi: "digital-nomad-karadhaan"
  },
  ETUDES_INTERNATIONALES: {
    fr: "etudes-etranger",
    en: "studying-abroad",
    es: "estudiar-extranjero",
    de: "studieren-ausland",
    pt: "estudar-estrangeiro",
    ru: "ucheba-za-granitsey",
    zh: "liuxue",
    ar: "الدراسة-في-الخارج",
    hi: "videsh-adhyayan"
  },
  LOGEMENT_ETUDIANT: {
    fr: "logement-etudiant",
    en: "student-housing",
    es: "alojamiento-estudiantil",
    de: "studentenwohnung",
    pt: "alojamento-estudantil",
    ru: "studencheskoe-zhilye",
    zh: "xuesheng-zhusuo",
    ar: "سكن-طلابي",
    hi: "chhatra-aawas"
  },
  BOURSE_FINANCEMENT: {
    fr: "bourses-financement",
    en: "scholarships-funding",
    es: "becas-financiacion",
    de: "stipendien-finanzierung",
    pt: "bolsas-financiamento",
    ru: "stipendii-finansirovanie",
    zh: "jiangxuejin-zizhu",
    ar: "المنح-الدراسية-والتمويل",
    hi: "chhatravritti-vittposhan"
  },
  STAGE_INTERNATIONAL: {
    fr: "stage-international",
    en: "international-internship",
    es: "practicas-internacionales",
    de: "internationales-praktikum",
    pt: "estagio-internacional",
    ru: "mezhdunarodnaya-stazhirovka",
    zh: "guoji-shixi",
    ar: "تدريب-دولي",
    hi: "antarrashtriya-internship"
  },
  RETRAITE_ETRANGER: {
    fr: "retraite-etranger",
    en: "retirement-abroad",
    es: "jubilacion-extranjero",
    de: "ruhestand-ausland",
    pt: "aposentadoria-estrangeiro",
    ru: "pensiya-za-granitsey",
    zh: "haiwai-tuixiu",
    ar: "التقاعد-في-الخارج",
    hi: "videsh-sevanivritti"
  },
  SANTE_SENIORS: {
    fr: "sante-seniors",
    en: "senior-health",
    es: "salud-mayores",
    de: "gesundheit-senioren",
    pt: "saude-idosos",
    ru: "zdorovye-pozhilykh",
    zh: "laonianren-jiankang",
    ar: "صحة-كبار-السن",
    hi: "vridh-swasthya"
  },
  PENSION_INTERNATIONALE: {
    fr: "pension-internationale",
    en: "international-pension",
    es: "pension-internacional",
    de: "internationale-rente",
    pt: "pensao-internacional",
    ru: "mezhdunarodnaya-pensiya",
    zh: "guoji-yanglao-jin",
    ar: "المعاش-الدولي",
    hi: "antarrashtriya-pension"
  },
  SCOLARITE_ENFANTS: {
    fr: "scolarite-enfants",
    en: "children-schooling",
    es: "escolarizacion-hijos",
    de: "schulbildung-kinder",
    pt: "escolaridade-filhos",
    ru: "obuchenie-detey",
    zh: "zinv-jiaoyu",
    ar: "تعليم-الأطفال",
    hi: "bachcho-ki-shiksha"
  },
  GARDE_ENFANTS: {
    fr: "garde-enfants",
    en: "childcare",
    es: "cuidado-ninos",
    de: "kinderbetreuung",
    pt: "cuidado-criancas",
    ru: "ukhod-za-detmi",
    zh: "tuoer-fuwu",
    ar: "رعاية-الأطفال",
    hi: "bal-dekhbhal"
  },
  ACTIVITES_ENFANTS: {
    fr: "activites-enfants",
    en: "children-activities",
    es: "actividades-ninos",
    de: "aktivitaeten-kinder",
    pt: "atividades-criancas",
    ru: "zanyatiya-detey",
    zh: "ertong-huodong",
    ar: "أنشطة-للأطفال",
    hi: "bachcho-ki-gatividhi"
  },
  DEMENAGEMENT_INTERNATIONAL: {
    fr: "demenagement-international",
    en: "international-moving",
    es: "mudanza-internacional",
    de: "internationaler-umzug",
    pt: "mudanca-internacional",
    ru: "mezhdunarodnyy-pereezd",
    zh: "guoji-banjia",
    ar: "النقل-الدولي",
    hi: "antarrashtriya-sthanantaran"
  },
  ANIMAUX_COMPAGNIE: {
    fr: "animaux-compagnie",
    en: "pets",
    es: "mascotas",
    de: "haustiere",
    pt: "animais-estimacao",
    ru: "domashnie-zhivotnye",
    zh: "chongwu",
    ar: "الحيوانات-الأليفة",
    hi: "paltoo-janwar"
  },
  PERMIS_CONDUIRE: {
    fr: "permis-conduire",
    en: "drivers-license",
    es: "permiso-conducir",
    de: "fuehrerschein",
    pt: "carta-conducao",
    ru: "voditelskie-prava",
    zh: "jiashi-zhizhao",
    ar: "رخصة-القيادة",
    hi: "driving-license"
  },
  COMMUNAUTE_EXPATRIES: {
    fr: "communaute-expatries",
    en: "expat-community",
    es: "comunidad-expatriados",
    de: "expat-gemeinschaft",
    pt: "comunidade-expatriados",
    ru: "soobshchestvo-ekspatov",
    zh: "waipai-shequ",
    ar: "مجتمع-المغتربين",
    hi: "pravasi-samuday"
  },
  SOUTIEN_PSYCHOLOGIQUE: {
    fr: "soutien-psychologique",
    en: "psychological-support",
    es: "apoyo-psicologico",
    de: "psychologische-unterstuetzung",
    pt: "apoio-psicologico",
    ru: "psikhologicheskaya-podderzhka",
    zh: "xinli-zhichi",
    ar: "الدعم-النفسي",
    hi: "manovaigyanik-sahayata"
  },
  AUTRE_PRECISER: {
    fr: "autre",
    en: "other",
    es: "otro",
    de: "andere",
    pt: "outro",
    ru: "drugoe",
    zh: "qita",
    ar: "أخرى",
    hi: "anya"
  }
};

// ========================================
// PAYS PRIORITAIRES (30 pays Tier 1 & 2)
// ========================================

export const COUNTRY_SLUGS: Record<string, TranslatedSlug> = {
  // === TIER 1 (10 pays prioritaires) ===
  gb: {
    fr: "royaume-uni",
    en: "united-kingdom",
    es: "reino-unido",
    de: "vereinigtes-koenigreich",
    pt: "reino-unido",
    ru: "velikobritaniya",
    zh: "yingguo",
    ar: "المملكة-المتحدة",
    hi: "britain"
  },
  fr: {
    fr: "france",
    en: "france",
    es: "francia",
    de: "frankreich",
    pt: "franca",
    ru: "frantsiya",
    zh: "faguo",
    ar: "فرنسا",
    hi: "france"
  },
  de: {
    fr: "allemagne",
    en: "germany",
    es: "alemania",
    de: "deutschland",
    pt: "alemanha",
    ru: "germaniya",
    zh: "deguo",
    ar: "ألمانيا",
    hi: "germany"
  },
  es: {
    fr: "espagne",
    en: "spain",
    es: "espana",
    de: "spanien",
    pt: "espanha",
    ru: "ispaniya",
    zh: "xibanya",
    ar: "إسبانيا",
    hi: "spain"
  },
  us: {
    fr: "etats-unis",
    en: "united-states",
    es: "estados-unidos",
    de: "vereinigte-staaten",
    pt: "estados-unidos",
    ru: "ssha",
    zh: "meiguo",
    ar: "الولايات-المتحدة",
    hi: "america"
  },
  ca: {
    fr: "canada",
    en: "canada",
    es: "canada",
    de: "kanada",
    pt: "canada",
    ru: "kanada",
    zh: "jianada",
    ar: "كندا",
    hi: "canada"
  },
  au: {
    fr: "australie",
    en: "australia",
    es: "australia",
    de: "australien",
    pt: "australia",
    ru: "avstraliya",
    zh: "aodaliya",
    ar: "أستراليا",
    hi: "australia"
  },
  ae: {
    fr: "emirats-arabes-unis",
    en: "united-arab-emirates",
    es: "emiratos-arabes-unidos",
    de: "vereinigte-arabische-emirate",
    pt: "emirados-arabes-unidos",
    ru: "oae",
    zh: "alianqiu",
    ar: "الإمارات",
    hi: "uae"
  },
  sg: {
    fr: "singapour",
    en: "singapore",
    es: "singapur",
    de: "singapur",
    pt: "singapura",
    ru: "singapur",
    zh: "xinjiapo",
    ar: "سنغافورة",
    hi: "singapore"
  },
  ch: {
    fr: "suisse",
    en: "switzerland",
    es: "suiza",
    de: "schweiz",
    pt: "suica",
    ru: "shveytsariya",
    zh: "ruishi",
    ar: "سويسرا",
    hi: "switzerland"
  },

  // === TIER 2 (20 pays haute priorité) ===
  it: {
    fr: "italie",
    en: "italy",
    es: "italia",
    de: "italien",
    pt: "italia",
    ru: "italiya",
    zh: "yidali",
    ar: "إيطاليا",
    hi: "italy"
  },
  nl: {
    fr: "pays-bas",
    en: "netherlands",
    es: "paises-bajos",
    de: "niederlande",
    pt: "paises-baixos",
    ru: "niderlandy",
    zh: "helan",
    ar: "هولندا",
    hi: "netherlands"
  },
  be: {
    fr: "belgique",
    en: "belgium",
    es: "belgica",
    de: "belgien",
    pt: "belgica",
    ru: "belgiya",
    zh: "bilishi",
    ar: "بلجيكا",
    hi: "belgium"
  },
  pt: {
    fr: "portugal",
    en: "portugal",
    es: "portugal",
    de: "portugal",
    pt: "portugal",
    ru: "portugaliya",
    zh: "putaoya",
    ar: "البرتغال",
    hi: "portugal"
  },
  jp: {
    fr: "japon",
    en: "japan",
    es: "japon",
    de: "japan",
    pt: "japao",
    ru: "yaponiya",
    zh: "riben",
    ar: "اليابان",
    hi: "japan"
  },
  kr: {
    fr: "coree-du-sud",
    en: "south-korea",
    es: "corea-del-sur",
    de: "suedkorea",
    pt: "coreia-do-sul",
    ru: "yuzhnaya-koreya",
    zh: "hanguo",
    ar: "كوريا-الجنوبية",
    hi: "south-korea"
  },
  cn: {
    fr: "chine",
    en: "china",
    es: "china",
    de: "china",
    pt: "china",
    ru: "kitay",
    zh: "zhongguo",
    ar: "الصين",
    hi: "china"
  },
  in: {
    fr: "inde",
    en: "india",
    es: "india",
    de: "indien",
    pt: "india",
    ru: "indiya",
    zh: "yindu",
    ar: "الهند",
    hi: "bharat"
  },
  br: {
    fr: "bresil",
    en: "brazil",
    es: "brasil",
    de: "brasilien",
    pt: "brasil",
    ru: "braziliya",
    zh: "baxi",
    ar: "البرازيل",
    hi: "brazil"
  },
  mx: {
    fr: "mexique",
    en: "mexico",
    es: "mexico",
    de: "mexiko",
    pt: "mexico",
    ru: "meksika",
    zh: "moxige",
    ar: "المكسيك",
    hi: "mexico"
  },
  th: {
    fr: "thailande",
    en: "thailand",
    es: "tailandia",
    de: "thailand",
    pt: "tailandia",
    ru: "tailand",
    zh: "taiguo",
    ar: "تايلاند",
    hi: "thailand"
  },
  my: {
    fr: "malaisie",
    en: "malaysia",
    es: "malasia",
    de: "malaysia",
    pt: "malasia",
    ru: "malayziya",
    zh: "malaixiya",
    ar: "ماليزيا",
    hi: "malaysia"
  },
  id: {
    fr: "indonesie",
    en: "indonesia",
    es: "indonesia",
    de: "indonesien",
    pt: "indonesia",
    ru: "indoneziya",
    zh: "yindunixiya",
    ar: "إندونيسيا",
    hi: "indonesia"
  },
  ph: {
    fr: "philippines",
    en: "philippines",
    es: "filipinas",
    de: "philippinen",
    pt: "filipinas",
    ru: "filippiny",
    zh: "feilvbin",
    ar: "الفلبين",
    hi: "philippines"
  },
  vn: {
    fr: "vietnam",
    en: "vietnam",
    es: "vietnam",
    de: "vietnam",
    pt: "vietna",
    ru: "vetnam",
    zh: "yuenan",
    ar: "فيتنام",
    hi: "vietnam"
  },
  za: {
    fr: "afrique-du-sud",
    en: "south-africa",
    es: "sudafrica",
    de: "suedafrika",
    pt: "africa-do-sul",
    ru: "yuzhnaya-afrika",
    zh: "nanfei",
    ar: "جنوب-أفريقيا",
    hi: "south-africa"
  },
  ma: {
    fr: "maroc",
    en: "morocco",
    es: "marruecos",
    de: "marokko",
    pt: "marrocos",
    ru: "marokko",
    zh: "moluoge",
    ar: "المغرب",
    hi: "morocco"
  },
  eg: {
    fr: "egypte",
    en: "egypt",
    es: "egipto",
    de: "aegypten",
    pt: "egito",
    ru: "egipet",
    zh: "aiji",
    ar: "مصر",
    hi: "egypt"
  },
  sa: {
    fr: "arabie-saoudite",
    en: "saudi-arabia",
    es: "arabia-saudita",
    de: "saudi-arabien",
    pt: "arabia-saudita",
    ru: "saudovskaya-araviya",
    zh: "shate",
    ar: "السعودية",
    hi: "saudi-arabia"
  },
  qa: {
    fr: "qatar",
    en: "qatar",
    es: "catar",
    de: "katar",
    pt: "catar",
    ru: "katar",
    zh: "kataer",
    ar: "قطر",
    hi: "qatar"
  }
};

// ========================================
// BESOINS CLIENTS (50 besoins)
// ========================================

export const CLIENT_NEED_SLUGS: Record<string, TranslatedSlug> = {
  // === URGENCES ===
  URGENCE_JURIDIQUE_ETRANGER: {
    fr: "urgence-juridique-etranger",
    en: "legal-emergency-abroad",
    es: "emergencia-juridica-extranjero",
    de: "rechtlicher-notfall-ausland",
    pt: "emergencia-juridica-estrangeiro",
    ru: "yuridicheskaya-pomoshch-za-granitsey",
    zh: "jingwai-falv-jinji",
    ar: "طوارئ-قانونية-في-الخارج",
    hi: "videsh-kanuni-aapatkaal"
  },
  ARRETE_POLICE_ETRANGER: {
    fr: "arrete-police-etranger",
    en: "arrested-abroad",
    es: "detenido-extranjero",
    de: "verhaftet-ausland",
    pt: "detido-estrangeiro",
    ru: "arestovan-za-granitsey",
    zh: "jingwai-beidaibu",
    ar: "اعتقال-في-الخارج",
    hi: "videsh-giraftari"
  },
  ACCIDENT_ETRANGER: {
    fr: "accident-etranger",
    en: "accident-abroad",
    es: "accidente-extranjero",
    de: "unfall-ausland",
    pt: "acidente-estrangeiro",
    ru: "neschastnyy-sluchay-za-granitsey",
    zh: "jingwai-shigu",
    ar: "حادث-في-الخارج",
    hi: "videsh-durghatna"
  },
  VICTIME_ARNAQUE: {
    fr: "victime-arnaque-etranger",
    en: "scam-victim-abroad",
    es: "victima-estafa-extranjero",
    de: "betrugsopfer-ausland",
    pt: "vitima-fraude-estrangeiro",
    ru: "zhertva-moshennichestva-za-granitsey",
    zh: "jingwai-zhapian-shouhaizhe",
    ar: "ضحية-احتيال-في-الخارج",
    hi: "videsh-dhokha-pidit"
  },

  // === IMMIGRATION ===
  OBTENIR_VISA: {
    fr: "obtenir-visa",
    en: "get-visa",
    es: "obtener-visa",
    de: "visum-erhalten",
    pt: "obter-visto",
    ru: "poluchit-vizu",
    zh: "huoqu-qianzheng",
    ar: "الحصول-على-تأشيرة",
    hi: "visa-prapt-karein"
  },
  VISA_REFUSE: {
    fr: "visa-refuse",
    en: "visa-denied",
    es: "visa-rechazada",
    de: "visum-abgelehnt",
    pt: "visto-recusado",
    ru: "viza-otkazana",
    zh: "qianzheng-jujue",
    ar: "رفض-التأشيرة",
    hi: "visa-astvikar"
  },
  PROBLEME_TITRE_SEJOUR: {
    fr: "probleme-titre-sejour",
    en: "residence-permit-problem",
    es: "problema-permiso-residencia",
    de: "aufenthaltsgenehmigung-problem",
    pt: "problema-autorizacao-residencia",
    ru: "problema-vid-zhitelstvo",
    zh: "juliu-xukezheng-wenti",
    ar: "مشكلة-تصريح-الإقامة",
    hi: "niwas-permit-samasya"
  },

  // === FAMILLE ===
  DIVORCE_INTERNATIONAL: {
    fr: "divorce-international",
    en: "international-divorce",
    es: "divorcio-internacional",
    de: "internationale-scheidung",
    pt: "divorcio-internacional",
    ru: "mezhdunarodnyy-razvod",
    zh: "guoji-lihun",
    ar: "الطلاق-الدولي",
    hi: "antarrashtriya-talak"
  },
  GARDE_ENFANTS_INTERNATIONAL: {
    fr: "garde-enfants-international",
    en: "international-child-custody",
    es: "custodia-internacional-ninos",
    de: "internationale-sorgerecht",
    pt: "guarda-internacional-criancas",
    ru: "mezhdunarodnaya-opeka-detey",
    zh: "guoji-zinv-jianhu",
    ar: "حضانة-الأطفال-الدولية",
    hi: "antarrashtriya-bal-hirasath"
  },
  ENLEVEMENT_ENFANT: {
    fr: "enlevement-parental-international",
    en: "international-child-abduction",
    es: "sustraccion-internacional-menores",
    de: "internationale-kindesentfuehrung",
    pt: "rapto-internacional-criancas",
    ru: "mezhdunarodnoe-pokhishchenie-detey",
    zh: "guoji-ertong-guaipian",
    ar: "اختطاف-الأطفال-الدولي",
    hi: "antarrashtriya-bal-apaharan"
  },

  // === IMMOBILIER ===
  ACHETER_BIEN_ETRANGER: {
    fr: "acheter-bien-immobilier-etranger",
    en: "buy-property-abroad",
    es: "comprar-propiedad-extranjero",
    de: "immobilie-ausland-kaufen",
    pt: "comprar-imovel-estrangeiro",
    ru: "kupit-nedvizhimost-za-granitsey",
    zh: "jingwai-goumai-fangdichan",
    ar: "شراء-عقار-في-الخارج",
    hi: "videsh-sampatti-kharidein"
  },
  VENDRE_BIEN_ETRANGER: {
    fr: "vendre-bien-immobilier-etranger",
    en: "sell-property-abroad",
    es: "vender-propiedad-extranjero",
    de: "immobilie-ausland-verkaufen",
    pt: "vender-imovel-estrangeiro",
    ru: "prodat-nedvizhimost-za-granitsey",
    zh: "jingwai-chushou-fangdichan",
    ar: "بيع-عقار-في-الخارج",
    hi: "videsh-sampatti-bechein"
  },

  // === ENTREPRISE ===
  CREER_ENTREPRISE_ETRANGER: {
    fr: "creer-entreprise-etranger",
    en: "start-business-abroad",
    es: "crear-empresa-extranjero",
    de: "unternehmen-ausland-gruenden",
    pt: "criar-empresa-estrangeiro",
    ru: "otkryt-biznes-za-granitsey",
    zh: "jingwai-chuangye",
    ar: "إنشاء-شركة-في-الخارج",
    hi: "videsh-vyavsay-shuru"
  },

  // === AIDE EXPATRIE ===
  AIDE_INSTALLATION: {
    fr: "aide-installation-pays",
    en: "help-settling-country",
    es: "ayuda-instalacion-pais",
    de: "hilfe-niederlassung-land",
    pt: "ajuda-instalacao-pais",
    ru: "pomoshch-obustroystve-strane",
    zh: "bangzhu-dingju-guojia",
    ar: "مساعدة-الاستقرار-في-بلد",
    hi: "desh-mein-basne-sahayata"
  },
  TROUVER_LOGEMENT: {
    fr: "trouver-logement-etranger",
    en: "find-housing-abroad",
    es: "encontrar-vivienda-extranjero",
    de: "wohnung-ausland-finden",
    pt: "encontrar-habitacao-estrangeiro",
    ru: "nayti-zhilye-za-granitsey",
    zh: "jingwai-zhaozu-zhufang",
    ar: "إيجاد-سكن-في-الخارج",
    hi: "videsh-aawas-khojein"
  },
  OUVRIR_COMPTE_BANCAIRE: {
    fr: "ouvrir-compte-bancaire-etranger",
    en: "open-bank-account-abroad",
    es: "abrir-cuenta-bancaria-extranjero",
    de: "bankkonto-ausland-eroeffnen",
    pt: "abrir-conta-bancaria-estrangeiro",
    ru: "otkryt-bankovskiy-schet-za-granitsey",
    zh: "jingwai-kaihu",
    ar: "فتح-حساب-بنكي-في-الخارج",
    hi: "videsh-bank-khata-kholein"
  }
};

// ========================================
// PAGES ACQUISITION
// ========================================

export const ACQUISITION_SLUGS: Record<string, TranslatedSlug> = {
  AFFILIATE_PROGRAM: {
    fr: "programme-affiliation",
    en: "affiliate-program",
    es: "programa-afiliados",
    de: "partnerprogramm",
    pt: "programa-afiliados",
    ru: "partnerskaya-programma",
    zh: "lianmeng-jihua",
    ar: "برنامج-الإحالة",
    hi: "sahbhagi-karyakram"
  },
  BUSINESS: {
    fr: "entreprises",
    en: "business",
    es: "empresas",
    de: "unternehmen",
    pt: "empresas",
    ru: "biznes",
    zh: "qiye",
    ar: "الشركات",
    hi: "vyavsay"
  },
  BLOGGERS_PARTNERS: {
    fr: "blogueurs-partenaires",
    en: "blogger-partners",
    es: "bloggers-socios",
    de: "blogger-partner",
    pt: "blogueiros-parceiros",
    ru: "blogery-partnery",
    zh: "boke-hezuo",
    ar: "المدونين-الشركاء",
    hi: "blogger-sathi"
  },
  PARTNERSHIPS: {
    fr: "partenariats",
    en: "partnerships",
    es: "asociaciones",
    de: "partnerschaften",
    pt: "parcerias",
    ru: "partnerstva",
    zh: "hezuo",
    ar: "الشراكات",
    hi: "saajedaari"
  }
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Obtient le slug traduit pour une catégorie avocat
 */
export const getLawyerCategorySlug = (code: string, lang: LangCode): string => {
  return LAWYER_CATEGORY_SLUGS[code]?.[lang] || code.toLowerCase();
};

/**
 * Obtient le slug traduit pour une sous-spécialité avocat
 */
export const getLawyerSubspecialtySlug = (code: string, lang: LangCode): string => {
  return LAWYER_SUBSPECIALTY_SLUGS[code]?.[lang] || code.toLowerCase();
};

/**
 * Obtient le slug traduit pour un service expatrié
 */
export const getExpatServiceSlug = (code: string, lang: LangCode): string => {
  return EXPAT_SERVICE_SLUGS[code]?.[lang] || code.toLowerCase();
};

/**
 * Obtient le slug traduit pour un pays
 */
export const getCountrySlug = (countryCode: string, lang: LangCode): string => {
  return COUNTRY_SLUGS[countryCode.toLowerCase()]?.[lang] || countryCode.toLowerCase();
};

/**
 * Obtient le slug traduit pour un besoin client
 */
export const getClientNeedSlug = (code: string, lang: LangCode): string => {
  return CLIENT_NEED_SLUGS[code]?.[lang] || code.toLowerCase();
};

/**
 * Obtient le slug traduit pour une page acquisition
 */
export const getAcquisitionSlug = (code: string, lang: LangCode): string => {
  return ACQUISITION_SLUGS[code]?.[lang] || code.toLowerCase();
};

/**
 * Trouve le code à partir d'un slug
 */
export const findCodeBySlug = (
  slugMap: Record<string, TranslatedSlug>,
  slug: string,
  lang: LangCode
): string | null => {
  for (const [code, slugs] of Object.entries(slugMap)) {
    if (slugs[lang] === slug) {
      return code;
    }
  }
  return null;
};

// ========================================
// STATISTIQUES
// ========================================

export const LANDING_PAGES_STATS = {
  lawyerCategories: Object.keys(LAWYER_CATEGORY_SLUGS).length,        // 24
  lawyerSubspecialties: Object.keys(LAWYER_SUBSPECIALTY_SLUGS).length, // 70+
  expatServices: Object.keys(EXPAT_SERVICE_SLUGS).length,              // 45
  countries: Object.keys(COUNTRY_SLUGS).length,                        // 30 (tier 1&2)
  clientNeeds: Object.keys(CLIENT_NEED_SLUGS).length,                  // 50
  acquisitionPages: Object.keys(ACQUISITION_SLUGS).length,             // 4
  languages: 9,

  get totalLawyerCategoryPages() { return this.lawyerCategories * this.languages; },
  get totalLawyerSubspecialtyPages() { return this.lawyerSubspecialties * this.languages; },
  get totalExpatServicePages() { return this.expatServices * this.languages; },
  get totalCountryPages() { return this.countries * this.languages * 2; }, // avocat + expat
  get totalClientNeedPages() { return this.clientNeeds * this.languages; },
  get totalAcquisitionPages() { return this.acquisitionPages * this.languages; },

  get grandTotal() {
    return this.totalLawyerCategoryPages
         + this.totalLawyerSubspecialtyPages
         + this.totalExpatServicePages
         + this.totalCountryPages
         + this.totalClientNeedPages
         + this.totalAcquisitionPages;
  }
} as const;

// ========================================
// src/data/lawyer-specialities.ts — Catégories & spécialités juridiques
// Traduit dans 9 langues : FR, EN, ES, DE, PT, RU, ZH, AR, HI
// ========================================

export interface LawyerSpecialityItem {
  code: string;
  labelFr: string;
  labelEn: string;
  labelEs: string;
  labelDe: string;
  labelPt: string;
  labelRu: string;
  labelZh: string;
  labelAr: string;
  labelHi: string;
}

export interface LawyerSpecialityGroup {
  code: string;
  labelFr: string;
  labelEn: string;
  labelEs: string;
  labelDe: string;
  labelPt: string;
  labelRu: string;
  labelZh: string;
  labelAr: string;
  labelHi: string;
  items: LawyerSpecialityItem[];
  priority?: number;
  disabled?: boolean;
}

export const lawyerSpecialitiesData: LawyerSpecialityGroup[] = [
  // ========================================
  // URGENCES
  // ========================================
  { 
    code: "URG",
    labelFr: "Urgences",
    labelEn: "Emergencies",
    labelEs: "Emergencias",
    labelDe: "Notfälle",
    labelPt: "Emergências",
    labelRu: "Срочные случаи",
    labelZh: "紧急情况",
    labelAr: "حالات الطوارئ",
    labelHi: "आपातकाल",
    items: [
      {
        code: "URG_ASSISTANCE_PENALE_INTERNATIONALE",
        labelFr: "Assistance pénale internationale",
        labelEn: "International criminal assistance",
        labelEs: "Asistencia penal internacional",
        labelDe: "Internationale Strafrechtshilfe",
        labelPt: "Assistência penal internacional",
        labelRu: "Международная уголовная помощь",
        labelZh: "国际刑事援助",
        labelAr: "المساعدة الجنائية الدولية",
        labelHi: "अंतर्राष्ट्रीय आपराधिक सहायता"
      },
      {
        code: "URG_ACCIDENTS_RESPONSABILITE_CIVILE",
        labelFr: "Accidents et responsabilité civile",
        labelEn: "Accidents and civil liability",
        labelEs: "Accidentes y responsabilidad civil",
        labelDe: "Unfälle und Haftpflicht",
        labelPt: "Acidentes e responsabilidade civil",
        labelRu: "Несчастные случаи и гражданская ответственность",
        labelZh: "事故和民事责任",
        labelAr: "الحوادث والمسؤولية المدنية",
        labelHi: "दुर्घटनाएं और नागरिक दायित्व"
      },
      {
        code: "URG_RAPATRIEMENT_URGENCE",
        labelFr: "Rapatriement d'urgence",
        labelEn: "Emergency repatriation",
        labelEs: "Repatriación de emergencia",
        labelDe: "Notfall-Rückführung",
        labelPt: "Repatriação de emergência",
        labelRu: "Экстренная репатриация",
        labelZh: "紧急遣返",
        labelAr: "الإعادة الطارئة إلى الوطن",
        labelHi: "आपातकालीन प्रत्यावर्तन"
      }
    ]
  },

  // ========================================
  // SERVICES COURANTS
  // ========================================
  {
    code: "CUR",
    labelFr: "Services courants",
    labelEn: "Current services",
    labelEs: "Servicios corrientes",
    labelDe: "Laufende Dienstleistungen",
    labelPt: "Serviços correntes",
    labelRu: "Текущие услуги",
    labelZh: "日常服务",
    labelAr: "الخدمات الجارية",
    labelHi: "वर्तमान सेवाएं",
    items: [
      {
        code: "CUR_TRADUCTIONS_LEGALISATIONS",
        labelFr: "Traductions et légalisations",
        labelEn: "Translations and legalizations",
        labelEs: "Traducciones y legalizaciones",
        labelDe: "Übersetzungen und Beglaubigungen",
        labelPt: "Traduções e legalizações",
        labelRu: "Переводы и легализация",
        labelZh: "翻译和公证",
        labelAr: "الترجمات والتصديقات",
        labelHi: "अनुवाद और वैधीकरण"
      },
      {
        code: "CUR_RECLAMATIONS_LITIGES_MINEURS",
        labelFr: "Réclamations et litiges mineurs",
        labelEn: "Claims and minor disputes",
        labelEs: "Reclamaciones y litigios menores",
        labelDe: "Beschwerden und kleinere Streitigkeiten",
        labelPt: "Reclamações e litígios menores",
        labelRu: "Претензии и мелкие споры",
        labelZh: "索赔和小额纠纷",
        labelAr: "المطالبات والنزاعات الصغيرة",
        labelHi: "दावे और छोटे विवाद"
      },
      {
        code: "CUR_DEMARCHES_ADMINISTRATIVES",
        labelFr: "Démarches administratives",
        labelEn: "Administrative procedures",
        labelEs: "Trámites administrativos",
        labelDe: "Verwaltungsverfahren",
        labelPt: "Procedimentos administrativos",
        labelRu: "Административные процедуры",
        labelZh: "行政手续",
        labelAr: "الإجراءات الإدارية",
        labelHi: "प्रशासनिक प्रक्रियाएं"
      }
    ]
  },

  // ========================================
  // IMMIGRATION ET TRAVAIL
  // ========================================
  {
    code: "IMMI",
    labelFr: "Immigration et travail",
    labelEn: "Immigration and work",
    labelEs: "Inmigración y trabajo",
    labelDe: "Einwanderung und Arbeit",
    labelPt: "Imigração e trabalho",
    labelRu: "Иммиграция и работа",
    labelZh: "移民和工作",
    labelAr: "الهجرة والعمل",
    labelHi: "आप्रवासन और कार्य",
    items: [
      {
        code: "IMMI_VISAS_PERMIS_SEJOUR",
        labelFr: "Visas et permis de séjour",
        labelEn: "Visas and residence permits",
        labelEs: "Visados y permisos de residencia",
        labelDe: "Visa und Aufenthaltsgenehmigungen",
        labelPt: "Vistos e autorizações de residência",
        labelRu: "Визы и вид на жительство",
        labelZh: "签证和居留许可",
        labelAr: "التأشيرات وتصاريح الإقامة",
        labelHi: "वीज़ा और निवास परमिट"
      },
      {
        code: "IMMI_CONTRATS_TRAVAIL_INTERNATIONAL",
        labelFr: "Contrats de travail international",
        labelEn: "International employment contracts",
        labelEs: "Contratos de trabajo internacional",
        labelDe: "Internationale Arbeitsverträge",
        labelPt: "Contratos de trabalho internacional",
        labelRu: "Международные трудовые договоры",
        labelZh: "国际劳动合同",
        labelAr: "عقود العمل الدولية",
        labelHi: "अंतर्राष्ट्रीय रोजगार अनुबंध"
      },
      {
        code: "IMMI_NATURALISATION",
        labelFr: "Naturalisation",
        labelEn: "Naturalization",
        labelEs: "Naturalización",
        labelDe: "Einbürgerung",
        labelPt: "Naturalização",
        labelRu: "Натурализация",
        labelZh: "入籍",
        labelAr: "التجنس",
        labelHi: "नागरिकता प्राप्ति"
      }
    ]
  },

  // ========================================
  // IMMOBILIER
  // ========================================
  {
    code: "IMMO",
    labelFr: "Immobilier",
    labelEn: "Real estate",
    labelEs: "Inmobiliario",
    labelDe: "Immobilien",
    labelPt: "Imobiliário",
    labelRu: "Недвижимость",
    labelZh: "房地产",
    labelAr: "العقارات",
    labelHi: "अचल संपत्ति",
    items: [
      {
        code: "IMMO_ACHAT_VENTE",
        labelFr: "Achat/vente à l'étranger",
        labelEn: "Purchase/sale abroad",
        labelEs: "Compra/venta en el extranjero",
        labelDe: "Kauf/Verkauf im Ausland",
        labelPt: "Compra/venda no estrangeiro",
        labelRu: "Покупка/продажа за границей",
        labelZh: "境外买卖",
        labelAr: "الشراء/البيع في الخارج",
        labelHi: "विदेश में खरीद/बिक्री"
      },
      {
        code: "IMMO_LOCATION_BAUX",
        labelFr: "Location et baux",
        labelEn: "Rental and leases",
        labelEs: "Alquiler y arrendamientos",
        labelDe: "Vermietung und Pachtverträge",
        labelPt: "Arrendamento e locações",
        labelRu: "Аренда и договоры аренды",
        labelZh: "租赁和租约",
        labelAr: "الإيجار والعقود",
        labelHi: "किराया और पट्टे"
      },
      {
        code: "IMMO_LITIGES_IMMOBILIERS",
        labelFr: "Litiges immobiliers",
        labelEn: "Real estate disputes",
        labelEs: "Litigios inmobiliarios",
        labelDe: "Immobilienstreitigkeiten",
        labelPt: "Litígios imobiliários",
        labelRu: "Споры по недвижимости",
        labelZh: "房地产纠纷",
        labelAr: "نزاعات العقارات",
        labelHi: "अचल संपत्ति विवाद"
      }
    ]
  },

  // ========================================
  // FISCALITÉ
  // ========================================
  {
    code: "FISC",
    labelFr: "Fiscalité",
    labelEn: "Taxation",
    labelEs: "Fiscalidad",
    labelDe: "Besteuerung",
    labelPt: "Fiscalidade",
    labelRu: "Налогообложение",
    labelZh: "税务",
    labelAr: "الضرائب",
    labelHi: "कराधान",
    items: [
      {
        code: "FISC_DECLARATIONS_INTERNATIONALES",
        labelFr: "Déclarations fiscales internationales",
        labelEn: "International tax returns",
        labelEs: "Declaraciones fiscales internacionales",
        labelDe: "Internationale Steuererklärungen",
        labelPt: "Declarações fiscais internacionais",
        labelRu: "Международные налоговые декларации",
        labelZh: "国际税务申报",
        labelAr: "الإقرارات الضريبية الدولية",
        labelHi: "अंतर्राष्ट्रीय कर रिटर्न"
      },
      {
        code: "FISC_DOUBLE_IMPOSITION",
        labelFr: "Double imposition",
        labelEn: "Double taxation",
        labelEs: "Doble imposición",
        labelDe: "Doppelbesteuerung",
        labelPt: "Dupla tributação",
        labelRu: "Двойное налогообложение",
        labelZh: "双重征税",
        labelAr: "الازدواج الضريبي",
        labelHi: "दोहरा कराधान"
      },
      {
        code: "FISC_OPTIMISATION_EXPATRIES",
        labelFr: "Optimisation fiscale expatriés",
        labelEn: "Expat tax optimization",
        labelEs: "Optimización fiscal expatriados",
        labelDe: "Steueroptimierung für Expatriates",
        labelPt: "Otimização fiscal expatriados",
        labelRu: "Налоговая оптимизация для экспатов",
        labelZh: "外派人员税务优化",
        labelAr: "تحسين الضرائب للمغتربين",
        labelHi: "प्रवासी कर अनुकूलन"
      }
    ]
  },

  // ========================================
  // FAMILLE
  // ========================================
  {
    code: "FAM",
    labelFr: "Famille",
    labelEn: "Family",
    labelEs: "Familia",
    labelDe: "Familie",
    labelPt: "Família",
    labelRu: "Семья",
    labelZh: "家庭",
    labelAr: "الأسرة",
    labelHi: "परिवार",
    items: [
      {
        code: "FAM_MARIAGE_DIVORCE",
        labelFr: "Mariage/divorce international",
        labelEn: "International marriage/divorce",
        labelEs: "Matrimonio/divorcio internacional",
        labelDe: "Internationale Ehe/Scheidung",
        labelPt: "Casamento/divórcio internacional",
        labelRu: "Международный брак/развод",
        labelZh: "国际婚姻/离婚",
        labelAr: "الزواج/الطلاق الدولي",
        labelHi: "अंतर्राष्ट्रीय विवाह/तलाक"
      },
      {
        code: "FAM_GARDE_ENFANTS_TRANSFRONTALIERE",
        labelFr: "Garde d'enfants transfrontalière",
        labelEn: "Cross-border child custody",
        labelEs: "Custodia de niños transfronteriza",
        labelDe: "Grenzüberschreitendes Sorgerecht",
        labelPt: "Guarda de crianças transfronteiriça",
        labelRu: "Трансграничная опека над детьми",
        labelZh: "跨境儿童监护",
        labelAr: "حضانة الأطفال عبر الحدود",
        labelHi: "सीमा-पार बाल हिरासत"
      },
      {
        code: "FAM_SCOLARITE_INTERNATIONALE",
        labelFr: "Scolarité internationale",
        labelEn: "International schooling",
        labelEs: "Escolaridad internacional",
        labelDe: "Internationale Schulbildung",
        labelPt: "Escolaridade internacional",
        labelRu: "Международное обучение",
        labelZh: "国际教育",
        labelAr: "التعليم الدولي",
        labelHi: "अंतर्राष्ट्रीय शिक्षा"
      }
    ]
  },

  // ========================================
  // PATRIMOINE
  // ========================================
  {
    code: "PATR",
    labelFr: "Patrimoine",
    labelEn: "Wealth management",
    labelEs: "Patrimonio",
    labelDe: "Vermögensverwaltung",
    labelPt: "Patrimônio",
    labelRu: "Управление активами",
    labelZh: "财富管理",
    labelAr: "إدارة الثروات",
    labelHi: "संपत्ति प्रबंधन",
    items: [
      {
        code: "PATR_SUCCESSIONS_INTERNATIONALES",
        labelFr: "Successions internationales",
        labelEn: "International inheritance",
        labelEs: "Sucesiones internacionales",
        labelDe: "Internationale Erbschaften",
        labelPt: "Sucessões internacionais",
        labelRu: "Международное наследство",
        labelZh: "国际继承",
        labelAr: "الميراث الدولي",
        labelHi: "अंतर्राष्ट्रीय उत्तराधिकार"
      },
      {
        code: "PATR_GESTION_PATRIMOINE",
        labelFr: "Gestion de patrimoine",
        labelEn: "Wealth management",
        labelEs: "Gestión patrimonial",
        labelDe: "Vermögensverwaltung",
        labelPt: "Gestão patrimonial",
        labelRu: "Управление капиталом",
        labelZh: "资产管理",
        labelAr: "إدارة الأصول",
        labelHi: "संपत्ति प्रबंधन"
      },
      {
        code: "PATR_TESTAMENTS",
        labelFr: "Testaments",
        labelEn: "Wills",
        labelEs: "Testamentos",
        labelDe: "Testamente",
        labelPt: "Testamentos",
        labelRu: "Завещания",
        labelZh: "遗嘱",
        labelAr: "الوصايا",
        labelHi: "वसीयत"
      }
    ]
  },

  // ========================================
  // ENTREPRISE
  // ========================================
  {
    code: "ENTR",
    labelFr: "Entreprise",
    labelEn: "Business",
    labelEs: "Empresa",
    labelDe: "Unternehmen",
    labelPt: "Empresa",
    labelRu: "Бизнес",
    labelZh: "企业",
    labelAr: "الأعمال",
    labelHi: "व्यवसाय",
    items: [
      {
        code: "ENTR_CREATION_ENTREPRISE_ETRANGER",
        labelFr: "Création d'entreprise à l'étranger",
        labelEn: "Business creation abroad",
        labelEs: "Creación de empresa en el extranjero",
        labelDe: "Unternehmensgründung im Ausland",
        labelPt: "Criação de empresa no estrangeiro",
        labelRu: "Создание бизнеса за границей",
        labelZh: "境外创业",
        labelAr: "إنشاء شركة في الخارج",
        labelHi: "विदेश में व्यवसाय निर्माण"
      },
      {
        code: "ENTR_INVESTISSEMENTS",
        labelFr: "Investissements",
        labelEn: "Investments",
        labelEs: "Inversiones",
        labelDe: "Investitionen",
        labelPt: "Investimentos",
        labelRu: "Инвестиции",
        labelZh: "投资",
        labelAr: "الاستثمارات",
        labelHi: "निवेश"
      },
      {
        code: "ENTR_IMPORT_EXPORT",
        labelFr: "Import/export",
        labelEn: "Import/export",
        labelEs: "Importación/exportación",
        labelDe: "Import/Export",
        labelPt: "Importação/exportação",
        labelRu: "Импорт/экспорт",
        labelZh: "进出口",
        labelAr: "الاستيراد/التصدير",
        labelHi: "आयात/निर्यात"
      }
    ]
  },

  // ========================================
  // ASSURANCES ET PROTECTION
  // ========================================
  {
    code: "ASSU",
    labelFr: "Assurances et protection",
    labelEn: "Insurance and protection",
    labelEs: "Seguros y protección",
    labelDe: "Versicherung und Schutz",
    labelPt: "Seguros e proteção",
    labelRu: "Страхование и защита",
    labelZh: "保险和保护",
    labelAr: "التأمين والحماية",
    labelHi: "बीमा और सुरक्षा",
    items: [
      {
        code: "ASSU_ASSURANCES_INTERNATIONALES",
        labelFr: "Assurances internationales",
        labelEn: "International insurance",
        labelEs: "Seguros internacionales",
        labelDe: "Internationale Versicherungen",
        labelPt: "Seguros internacionais",
        labelRu: "Международное страхование",
        labelZh: "国际保险",
        labelAr: "التأمين الدولي",
        labelHi: "अंतर्राष्ट्रीय बीमा"
      },
      {
        code: "ASSU_PROTECTION_DONNEES",
        labelFr: "Protection des données",
        labelEn: "Data protection",
        labelEs: "Protección de datos",
        labelDe: "Datenschutz",
        labelPt: "Proteção de dados",
        labelRu: "Защита данных",
        labelZh: "数据保护",
        labelAr: "حماية البيانات",
        labelHi: "डेटा सुरक्षा"
      },
      {
        code: "ASSU_CONTENTIEUX_ADMINISTRATIFS",
        labelFr: "Contentieux administratifs",
        labelEn: "Administrative litigation",
        labelEs: "Litigios administrativos",
        labelDe: "Verwaltungsstreitigkeiten",
        labelPt: "Contencioso administrativo",
        labelRu: "Административные споры",
        labelZh: "行政诉讼",
        labelAr: "النزاعات الإدارية",
        labelHi: "प्रशासनिक मुकदमेबाजी"
      }
    ]
  },

  // ========================================
  // CONSOMMATION ET SERVICES
  // ========================================
  {
    code: "CONS",
    labelFr: "Consommation et services",
    labelEn: "Consumer and services",
    labelEs: "Consumo y servicios",
    labelDe: "Verbrauch und Dienstleistungen",
    labelPt: "Consumo e serviços",
    labelRu: "Потребление и услуги",
    labelZh: "消费和服务",
    labelAr: "الاستهلاك والخدمات",
    labelHi: "उपभोग और सेवाएं",
    items: [
      {
        code: "CONS_ACHATS_DEFECTUEUX_ETRANGER",
        labelFr: "Achats défectueux à l'étranger",
        labelEn: "Defective purchases abroad",
        labelEs: "Compras defectuosas en el extranjero",
        labelDe: "Fehlerhafte Käufe im Ausland",
        labelPt: "Compras defeituosas no estrangeiro",
        labelRu: "Дефектные покупки за границей",
        labelZh: "境外有缺陷的购买",
        labelAr: "مشتريات معيبة في الخارج",
        labelHi: "विदेश में दोषपूर्ण खरीदारी"
      },
      {
        code: "CONS_SERVICES_NON_CONFORMES",
        labelFr: "Services non conformes",
        labelEn: "Non-compliant services",
        labelEs: "Servicios no conformes",
        labelDe: "Nicht konforme Dienstleistungen",
        labelPt: "Serviços não conformes",
        labelRu: "Несоответствующие услуги",
        labelZh: "不合规服务",
        labelAr: "خدمات غير مطابقة",
        labelHi: "गैर-अनुपालक सेवाएं"
      },
      {
        code: "CONS_ECOMMERCE_INTERNATIONAL",
        labelFr: "E-commerce international",
        labelEn: "International e-commerce",
        labelEs: "Comercio electrónico internacional",
        labelDe: "Internationaler E-Commerce",
        labelPt: "Comércio eletrônico internacional",
        labelRu: "Международная электронная коммерция",
        labelZh: "国际电子商务",
        labelAr: "التجارة الإلكترونية الدولية",
        labelHi: "अंतर्राष्ट्रीय ई-कॉमर्स"
      }
    ]
  },

  // ========================================
  // BANQUE ET FINANCE
  // ========================================
  {
    code: "BANK",
    labelFr: "Banque et finance",
    labelEn: "Banking and finance",
    labelEs: "Banca y finanzas",
    labelDe: "Bank- und Finanzwesen",
    labelPt: "Banco e finanças",
    labelRu: "Банковское дело и финансы",
    labelZh: "银行和金融",
    labelAr: "الخدمات المصرفية والمالية",
    labelHi: "बैंकिंग और वित्त",
    items: [
      {
        code: "BANK_PROBLEMES_COMPTES_BANCAIRES",
        labelFr: "Problèmes de comptes bancaires",
        labelEn: "Bank account issues",
        labelEs: "Problemas de cuentas bancarias",
        labelDe: "Probleme mit Bankkonten",
        labelPt: "Problemas de contas bancárias",
        labelRu: "Проблемы с банковскими счетами",
        labelZh: "银行账户问题",
        labelAr: "مشاكل الحسابات المصرفية",
        labelHi: "बैंक खाते की समस्याएं"
      },
      {
        code: "BANK_VIREMENTS_CREDITS",
        labelFr: "Virements et crédits",
        labelEn: "Transfers and credits",
        labelEs: "Transferencias y créditos",
        labelDe: "Überweisungen und Kredite",
        labelPt: "Transferências e créditos",
        labelRu: "Переводы и кредиты",
        labelZh: "转账和信贷",
        labelAr: "التحويلات والقروض",
        labelHi: "स्थानांतरण और ऋण"
      },
      {
        code: "BANK_SERVICES_FINANCIERS",
        labelFr: "Services financiers",
        labelEn: "Financial services",
        labelEs: "Servicios financieros",
        labelDe: "Finanzdienstleistungen",
        labelPt: "Serviços financeiros",
        labelRu: "Финансовые услуги",
        labelZh: "金融服务",
        labelAr: "الخدمات المالية",
        labelHi: "वित्तीय सेवाएं"
      }
    ]
  },

  // ========================================
  // PROBLÈMES D'ARGENT
  // ========================================
  {
    code: "ARGT",
    labelFr: "Problèmes d'argent",
    labelEn: "Money problems",
    labelEs: "Problemas de dinero",
    labelDe: "Geldprobleme",
    labelPt: "Problemas de dinheiro",
    labelRu: "Денежные проблемы",
    labelZh: "资金问题",
    labelAr: "مشاكل مالية",
    labelHi: "धन की समस्याएं",
    items: [
      {
        code: "ARGT_RETARDS_SALAIRE_IMPAYES",
        labelFr: "Retards de salaire et impayés",
        labelEn: "Salary delays and unpaid wages",
        labelEs: "Retrasos salariales e impagos",
        labelDe: "Gehaltsverzögerungen und unbezahlte Löhne",
        labelPt: "Atrasos salariais e não pagos",
        labelRu: "Задержки зарплаты и невыплаты",
        labelZh: "工资延迟和未付",
        labelAr: "تأخير الرواتب والأجور غير المدفوعة",
        labelHi: "वेतन में देरी और अवैतनिक मजदूरी"
      },
      {
        code: "ARGT_ARNAQUES_ESCROQUERIES",
        labelFr: "Arnaques et escroqueries financières",
        labelEn: "Scams and financial fraud",
        labelEs: "Estafas y fraudes financieros",
        labelDe: "Betrug und Finanzbetrug",
        labelPt: "Fraudes e golpes financeiros",
        labelRu: "Мошенничество и финансовые махинации",
        labelZh: "诈骗和金融欺诈",
        labelAr: "عمليات الاحتيال المالي",
        labelHi: "घोटाले और वित्तीय धोखाधड़ी"
      },
      {
        code: "ARGT_SURENDETTEMENT_PLANS",
        labelFr: "Surendettement et plans de remboursement",
        labelEn: "Over-indebtedness and repayment plans",
        labelEs: "Sobreendeudamiento y planes de pago",
        labelDe: "Überschuldung und Rückzahlungspläne",
        labelPt: "Superendividamento e planos de pagamento",
        labelRu: "Чрезмерная задолженность и планы погашения",
        labelZh: "过度负债和还款计划",
        labelAr: "الإفراط في المديونية وخطط السداد",
        labelHi: "अत्यधिक ऋणग्रस्तता और पुनर्भुगतान योजनाएं"
      },
      {
        code: "ARGT_FRAIS_BANCAIRES_ABUSIFS",
        labelFr: "Frais bancaires abusifs",
        labelEn: "Excessive bank fees",
        labelEs: "Comisiones bancarias abusivas",
        labelDe: "Überhöhte Bankgebühren",
        labelPt: "Taxas bancárias abusivas",
        labelRu: "Чрезмерные банковские сборы",
        labelZh: "过高的银行费用",
        labelAr: "رسوم مصرفية مفرطة",
        labelHi: "अत्यधिक बैंक शुल्क"
      },
      {
        code: "ARGT_LITIGES_ETABLISSEMENTS_CREDIT",
        labelFr: "Litiges avec établissements de crédit",
        labelEn: "Disputes with credit institutions",
        labelEs: "Litigios con entidades de crédito",
        labelDe: "Streitigkeiten mit Kreditinstituten",
        labelPt: "Litígios com instituições de crédito",
        labelRu: "Споры с кредитными учреждениями",
        labelZh: "与信贷机构的纠纷",
        labelAr: "نزاعات مع مؤسسات الائتمان",
        labelHi: "ऋण संस्थानों के साथ विवाद"
      }
    ]
  },

  // ========================================
  // PROBLÈMES RELATIONNELS
  // ========================================
  {
    code: "RELA",
    labelFr: "Problèmes relationnels",
    labelEn: "Relationship problems",
    labelEs: "Problemas relacionales",
    labelDe: "Beziehungsprobleme",
    labelPt: "Problemas relacionais",
    labelRu: "Проблемы в отношениях",
    labelZh: "关系问题",
    labelAr: "مشاكل العلاقات",
    labelHi: "संबंध समस्याएं",
    items: [
      {
        code: "RELA_CONFLITS_VOISINAGE",
        labelFr: "Conflits de voisinage",
        labelEn: "Neighborhood disputes",
        labelEs: "Conflictos vecinales",
        labelDe: "Nachbarschaftskonflikte",
        labelPt: "Conflitos de vizinhança",
        labelRu: "Споры с соседями",
        labelZh: "邻里纠纷",
        labelAr: "نزاعات الجيرة",
        labelHi: "पड़ोसी विवाद"
      },
      {
        code: "RELA_CONFLITS_TRAVAIL",
        labelFr: "Conflits au travail",
        labelEn: "Workplace conflicts",
        labelEs: "Conflictos laborales",
        labelDe: "Konflikte am Arbeitsplatz",
        labelPt: "Conflitos no trabalho",
        labelRu: "Конфликты на работе",
        labelZh: "工作场所冲突",
        labelAr: "صراعات العمل",
        labelHi: "कार्यस्थल संघर्ष"
      },
      {
        code: "RELA_CONFLITS_FAMILIAUX",
        labelFr: "Conflits familiaux",
        labelEn: "Family conflicts",
        labelEs: "Conflictos familiares",
        labelDe: "Familienkonflikte",
        labelPt: "Conflitos familiares",
        labelRu: "Семейные конфликты",
        labelZh: "家庭冲突",
        labelAr: "صراعات عائلية",
        labelHi: "पारिवारिक संघर्ष"
      },
      {
        code: "RELA_MEDIATION_RESOLUTION_AMIABLE",
        labelFr: "Médiation et résolution amiable",
        labelEn: "Mediation and amicable resolution",
        labelEs: "Mediación y resolución amistosa",
        labelDe: "Mediation und gütliche Einigung",
        labelPt: "Mediação e resolução amigável",
        labelRu: "Посредничество и мирное урегулирование",
        labelZh: "调解和友好解决",
        labelAr: "الوساطة والتسوية الودية",
        labelHi: "मध्यस्थता और सौहार्दपूर्ण समाधान"
      },
      {
        code: "RELA_DIFFAMATION_REPUTATION",
        labelFr: "Diffamation et atteinte à la réputation",
        labelEn: "Defamation and reputation damage",
        labelEs: "Difamación y daño a la reputación",
        labelDe: "Verleumdung und Rufschädigung",
        labelPt: "Difamação e dano à reputação",
        labelRu: "Клевета и ущерб репутации",
        labelZh: "诽谤和声誉损害",
        labelAr: "التشهير والإضرار بالسمعة",
        labelHi: "मानहानि और प्रतिष्ठा क्षति"
      }
    ]
  },

  // ========================================
  // TRANSPORT
  // ========================================
  {
    code: "TRAN",
    labelFr: "Transport",
    labelEn: "Transport",
    labelEs: "Transporte",
    labelDe: "Transport",
    labelPt: "Transporte",
    labelRu: "Транспорт",
    labelZh: "交通运输",
    labelAr: "النقل",
    labelHi: "परिवहन",
    items: [
      {
        code: "TRAN_PROBLEMES_AERIENS",
        labelFr: "Problèmes aériens",
        labelEn: "Flight problems",
        labelEs: "Problemas aéreos",
        labelDe: "Flugprobleme",
        labelPt: "Problemas aéreos",
        labelRu: "Проблемы с авиарейсами",
        labelZh: "航班问题",
        labelAr: "مشاكل الطيران",
        labelHi: "उड़ान की समस्याएं"
      },
      {
        code: "TRAN_BAGAGES_PERDUS_ENDOMMAGES",
        labelFr: "Bagages perdus/endommagés",
        labelEn: "Lost/damaged luggage",
        labelEs: "Equipaje perdido/dañado",
        labelDe: "Verlorenes/beschädigtes Gepäck",
        labelPt: "Bagagem perdida/danificada",
        labelRu: "Утерянный/поврежденный багаж",
        labelZh: "行李丢失/损坏",
        labelAr: "أمتعة مفقودة/تالفة",
        labelHi: "खोया/क्षतिग्रस्त सामान"
      },
      {
        code: "TRAN_ACCIDENTS_TRANSPORT",
        labelFr: "Accidents de transport",
        labelEn: "Transport accidents",
        labelEs: "Accidentes de transporte",
        labelDe: "Transportunfälle",
        labelPt: "Acidentes de transporte",
        labelRu: "Транспортные происшествия",
        labelZh: "交通事故",
        labelAr: "حوادث النقل",
        labelHi: "परिवहन दुर्घटनाएं"
      }
    ]
  },

  // ========================================
  // SANTÉ
  // ========================================
  {
    code: "SANT",
    labelFr: "Santé",
    labelEn: "Health",
    labelEs: "Salud",
    labelDe: "Gesundheit",
    labelPt: "Saúde",
    labelRu: "Здоровье",
    labelZh: "健康",
    labelAr: "الصحة",
    labelHi: "स्वास्थ्य",
    items: [
      {
        code: "SANT_ERREURS_MEDICALES",
        labelFr: "Erreurs médicales",
        labelEn: "Medical errors",
        labelEs: "Errores médicos",
        labelDe: "Medizinische Fehler",
        labelPt: "Erros médicos",
        labelRu: "Медицинские ошибки",
        labelZh: "医疗错误",
        labelAr: "الأخطاء الطبية",
        labelHi: "चिकित्सा त्रुटियां"
      },
      {
        code: "SANT_REMBOURSEMENTS_SOINS",
        labelFr: "Remboursements de soins",
        labelEn: "Healthcare reimbursements",
        labelEs: "Reembolsos de atención médica",
        labelDe: "Erstattung von Gesundheitskosten",
        labelPt: "Reembolsos de cuidados de saúde",
        labelRu: "Возмещение медицинских расходов",
        labelZh: "医疗费用报销",
        labelAr: "تعويضات الرعاية الصحية",
        labelHi: "स्वास्थ्य देखभाल प्रतिपूर्ति"
      },
      {
        code: "SANT_DROIT_MEDICAL",
        labelFr: "Droit médical",
        labelEn: "Medical law",
        labelEs: "Derecho médico",
        labelDe: "Medizinrecht",
        labelPt: "Direito médico",
        labelRu: "Медицинское право",
        labelZh: "医疗法",
        labelAr: "القانون الطبي",
        labelHi: "चिकित्सा कानून"
      }
    ]
  },

  // ========================================
  // NUMÉRIQUE
  // ========================================
  {
    code: "NUM",
    labelFr: "Numérique",
    labelEn: "Digital",
    labelEs: "Digital",
    labelDe: "Digital",
    labelPt: "Digital",
    labelRu: "Цифровой",
    labelZh: "数字",
    labelAr: "رقمي",
    labelHi: "डिजिटल",
    items: [
      {
        code: "NUM_CYBERCRIMINALITE",
        labelFr: "Cybercriminalité",
        labelEn: "Cybercrime",
        labelEs: "Ciberdelincuencia",
        labelDe: "Cyberkriminalität",
        labelPt: "Cibercrime",
        labelRu: "Киберпреступность",
        labelZh: "网络犯罪",
        labelAr: "الجرائم الإلكترونية",
        labelHi: "साइबर अपराध"
      },
      {
        code: "NUM_CONTRATS_EN_LIGNE",
        labelFr: "Contrats en ligne",
        labelEn: "Online contracts",
        labelEs: "Contratos en línea",
        labelDe: "Online-Verträge",
        labelPt: "Contratos online",
        labelRu: "Онлайн-контракты",
        labelZh: "在线合同",
        labelAr: "العقود عبر الإنترنت",
        labelHi: "ऑनलाइन अनुबंध"
      },
      {
        code: "NUM_PROTECTION_NUMERIQUE",
        labelFr: "Protection numérique",
        labelEn: "Digital protection",
        labelEs: "Protección digital",
        labelDe: "Digitaler Schutz",
        labelPt: "Proteção digital",
        labelRu: "Цифровая защита",
        labelZh: "数字保护",
        labelAr: "الحماية الرقمية",
        labelHi: "डिजिटल सुरक्षा"
      }
    ]
  },

  // ========================================
  // VIOLENCES ET DISCRIMINATIONS
  // ========================================
  {
    code: "VIO",
    labelFr: "Violences et discriminations",
    labelEn: "Violence and discrimination",
    labelEs: "Violencia y discriminación",
    labelDe: "Gewalt und Diskriminierung",
    labelPt: "Violência e discriminação",
    labelRu: "Насилие и дискриминация",
    labelZh: "暴力和歧视",
    labelAr: "العنف والتمييز",
    labelHi: "हिंसा और भेदभाव",
    items: [
      {
        code: "VIO_HARCELEMENT",
        labelFr: "Harcèlement",
        labelEn: "Harassment",
        labelEs: "Acoso",
        labelDe: "Belästigung",
        labelPt: "Assédio",
        labelRu: "Преследование",
        labelZh: "骚扰",
        labelAr: "المضايقة",
        labelHi: "उत्पीड़न"
      },
      {
        code: "VIO_VIOLENCES_DOMESTIQUES",
        labelFr: "Violences domestiques",
        labelEn: "Domestic violence",
        labelEs: "Violencia doméstica",
        labelDe: "Häusliche Gewalt",
        labelPt: "Violência doméstica",
        labelRu: "Домашнее насилие",
        labelZh: "家庭暴力",
        labelAr: "العنف المنزلي",
        labelHi: "घरेलू हिंसा"
      },
      {
        code: "VIO_DISCRIMINATIONS",
        labelFr: "Discriminations",
        labelEn: "Discrimination",
        labelEs: "Discriminación",
        labelDe: "Diskriminierung",
        labelPt: "Discriminação",
        labelRu: "Дискриминация",
        labelZh: "歧视",
        labelAr: "التمييز",
        labelHi: "भेदभाव"
      }
    ]
  },

  // ========================================
  // PROPRIÉTÉ INTELLECTUELLE
  // ========================================
  {
    code: "IP",
    labelFr: "Propriété intellectuelle",
    labelEn: "Intellectual property",
    labelEs: "Propiedad intelectual",
    labelDe: "Geistiges Eigentum",
    labelPt: "Propriedade intelectual",
    labelRu: "Интеллектуальная собственность",
    labelZh: "知识产权",
    labelAr: "الملكية الفكرية",
    labelHi: "बौद्धिक संपदा",
    items: [
      {
        code: "IP_CONTREFACONS",
        labelFr: "Contrefaçons",
        labelEn: "Counterfeiting",
        labelEs: "Falsificaciones",
        labelDe: "Fälschungen",
        labelPt: "Contrafações",
        labelRu: "Подделки",
        labelZh: "假冒",
        labelAr: "التزييف",
        labelHi: "जालसाजी"
      },
      {
        code: "IP_BREVETS_MARQUES",
        labelFr: "Brevets et marques",
        labelEn: "Patents and trademarks",
        labelEs: "Patentes y marcas",
        labelDe: "Patente und Marken",
        labelPt: "Patentes e marcas",
        labelRu: "Патенты и товарные знаки",
        labelZh: "专利和商标",
        labelAr: "براءات الاختراع والعلامات التجارية",
        labelHi: "पेटेंट और ट्रेडमार्क"
      },
      {
        code: "IP_DROITS_AUTEUR",
        labelFr: "Droits d'auteur",
        labelEn: "Copyrights",
        labelEs: "Derechos de autor",
        labelDe: "Urheberrechte",
        labelPt: "Direitos autorais",
        labelRu: "Авторские права",
        labelZh: "版权",
        labelAr: "حقوق النشر",
        labelHi: "कॉपीराइट"
      }
    ]
  },

  // ========================================
  // ENVIRONNEMENT
  // ========================================
  {
    code: "ENV",
    labelFr: "Environnement",
    labelEn: "Environment",
    labelEs: "Medio ambiente",
    labelDe: "Umwelt",
    labelPt: "Meio ambiente",
    labelRu: "Окружающая среда",
    labelZh: "环境",
    labelAr: "البيئة",
    labelHi: "पर्यावरण",
    items: [
      {
        code: "ENV_NUISANCES",
        labelFr: "Nuisances",
        labelEn: "Nuisances",
        labelEs: "Molestias",
        labelDe: "Belästigungen",
        labelPt: "Incômodos",
        labelRu: "Неудобства",
        labelZh: "滋扰",
        labelAr: "المضايقات",
        labelHi: "उपद्रव"
      },
      {
        code: "ENV_PERMIS_CONSTRUIRE",
        labelFr: "Permis de construire",
        labelEn: "Building permits",
        labelEs: "Permisos de construcción",
        labelDe: "Baugenehmigungen",
        labelPt: "Licenças de construção",
        labelRu: "Разрешения на строительство",
        labelZh: "建筑许可",
        labelAr: "تصاريح البناء",
        labelHi: "निर्माण परमिट"
      },
      {
        code: "ENV_DROIT_URBANISME",
        labelFr: "Droit de l'urbanisme",
        labelEn: "Urban planning law",
        labelEs: "Derecho urbanístico",
        labelDe: "Städtebaurecht",
        labelPt: "Direito urbanístico",
        labelRu: "Градостроительное право",
        labelZh: "城市规划法",
        labelAr: "قانون التخطيط العمراني",
        labelHi: "शहरी नियोजन कानून"
      }
    ]
  },

  // ========================================
  // RETOUR EN FRANCE
  // ========================================
  {
    code: "RET",
    labelFr: "Retour en France",
    labelEn: "Return to France",
    labelEs: "Regreso a Francia",
    labelDe: "Rückkehr nach Frankreich",
    labelPt: "Retorno à França",
    labelRu: "Возвращение во Францию",
    labelZh: "返回法国",
    labelAr: "العودة إلى فرنسا",
    labelHi: "फ्रांस में वापसी",
    items: [
      {
        code: "RET_RAPATRIEMENT_BIENS",
        labelFr: "Rapatriement de biens",
        labelEn: "Repatriation of goods",
        labelEs: "Repatriación de bienes",
        labelDe: "Rückführung von Gütern",
        labelPt: "Repatriação de bens",
        labelRu: "Репатриация имущества",
        labelZh: "财产遣返",
        labelAr: "إعادة الممتلكات",
        labelHi: "संपत्ति की प्रत्यावर्तन"
      },
      {
        code: "RET_REINTEGRATION_FISCALE_SOCIALE",
        labelFr: "Réintégration fiscale et sociale",
        labelEn: "Fiscal and social reintegration",
        labelEs: "Reintegración fiscal y social",
        labelDe: "Steuerliche und soziale Wiedereingliederung",
        labelPt: "Reintegração fiscal e social",
        labelRu: "Налоговая и социальная реинтеграция",
        labelZh: "财税和社会重新融入",
        labelAr: "إعادة الإدماج المالي والاجتماعي",
        labelHi: "राजकोषीय और सामाजिक पुन: एकीकरण"
      }
    ]
  },

  // ========================================
  // AUTRE
  // ========================================
  {
    code: "OTH",
    labelFr: "Autre",
    labelEn: "Other",
    labelEs: "Otro",
    labelDe: "Andere",
    labelPt: "Outro",
    labelRu: "Другое",
    labelZh: "其他",
    labelAr: "أخرى",
    labelHi: "अन्य",
    items: [
      {
        code: "OTH_PRECISER_BESOIN",
        labelFr: "Précisez votre besoin",
        labelEn: "Specify your need",
        labelEs: "Especifique su necesidad",
        labelDe: "Geben Sie Ihren Bedarf an",
        labelPt: "Especifique sua necessidade",
        labelRu: "Укажите вашу потребность",
        labelZh: "说明您的需求",
        labelAr: "حدد احتياجك",
        labelHi: "अपनी आवश्यकता बताएं"
      }
    ]
  },
];

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Aplatit la structure pour obtenir toutes les spécialités avec leur groupe
 */
export const flattenLawyerSpecialities = () =>
  lawyerSpecialitiesData.flatMap(g => 
    g.items.map(i => ({ ...i, groupCode: g.code }))
  );

/**
 * Obtient le label d'un groupe dans une langue donnée
 */
export const getLawyerGroupLabel = (
  groupCode: string,
  locale: 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi' = 'fr'
): string => {
  const group = lawyerSpecialitiesData.find(g => g.code === groupCode);
  if (!group) return groupCode;
  
  const labelKey = `label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof LawyerSpecialityGroup;
  return group[labelKey] as string || group.labelFr;
};

/**
 * Obtient le label d'une spécialité dans une langue donnée
 */
export const getLawyerSpecialityLabel = (
  itemCode: string,
  locale: 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi' = 'fr'
): string => {
  const allItems = flattenLawyerSpecialities();
  const item = allItems.find(i => i.code === itemCode);
  if (!item) return itemCode;
  
  const labelKey = `label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof LawyerSpecialityItem;
  return item[labelKey] as string || item.labelFr;
};

// ========================================
// TYPES TYPESCRIPT
// ========================================

export type LawyerSpecialityCode = typeof lawyerSpecialitiesData[number]['items'][number]['code'];
export type LawyerSpecialityGroupCode = typeof lawyerSpecialitiesData[number]['code'];
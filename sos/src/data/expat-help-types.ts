// ========================================
// src/data/expat-help-types.ts — Types d'aide pour expatriés
// - Liste plate (catégories), ordre métier conservé
// - 9 langues : FR, EN, ES, DE, PT, RU, ZH, AR, HI
// - Codes stables (UPPER_SNAKE)
// - "AUTRE_PRECISER" a un flag requiresDetails = true
// ========================================

export interface ExpatHelpType {
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
  requiresDetails?: boolean;
  priority?: number;
  disabled?: boolean;
}

export const expatHelpTypesData: ExpatHelpType[] = [
  {
    code: "INSTALLATION",
    labelFr: "S'installer",
    labelEn: "Settling in",
    labelEs: "Instalarse",
    labelDe: "Sich niederlassen",
    labelPt: "Instalar-se",
    labelRu: "Обустройство",
    labelZh: "定居",
    labelAr: "الاستقرار",
    labelHi: "बसना"
  },
  {
    code: "DEMARCHES_ADMINISTRATIVES",
    labelFr: "Démarches administratives",
    labelEn: "Administrative procedures",
    labelEs: "Trámites administrativos",
    labelDe: "Verwaltungsverfahren",
    labelPt: "Procedimentos administrativos",
    labelRu: "Административные процедуры",
    labelZh: "行政手续",
    labelAr: "الإجراءات الإدارية",
    labelHi: "प्रशासनिक प्रक्रियाएं"
  },
  {
    code: "RECHERCHE_LOGEMENT",
    labelFr: "Recherche de logement",
    labelEn: "Housing search",
    labelEs: "Búsqueda de vivienda",
    labelDe: "Wohnungssuche",
    labelPt: "Procura de habitação",
    labelRu: "Поиск жилья",
    labelZh: "寻找住房",
    labelAr: "البحث عن سكن",
    labelHi: "आवास खोज"
  },
  {
    code: "OUVERTURE_COMPTE_BANCAIRE",
    labelFr: "Ouverture de compte bancaire",
    labelEn: "Bank account opening",
    labelEs: "Apertura de cuenta bancaria",
    labelDe: "Kontoeröffnung",
    labelPt: "Abertura de conta bancária",
    labelRu: "Открытие банковского счета",
    labelZh: "开设银行账户",
    labelAr: "فتح حساب مصرفي",
    labelHi: "बैंक खाता खोलना"
  },
  {
    code: "SYSTEME_SANTE",
    labelFr: "Système de santé",
    labelEn: "Healthcare system",
    labelEs: "Sistema de salud",
    labelDe: "Gesundheitssystem",
    labelPt: "Sistema de saúde",
    labelRu: "Система здравоохранения",
    labelZh: "医疗系统",
    labelAr: "نظام الرعاية الصحية",
    labelHi: "स्वास्थ्य प्रणाली"
  },
  {
    code: "EDUCATION_ECOLES",
    labelFr: "Éducation et écoles",
    labelEn: "Education and schools",
    labelEs: "Educación y escuelas",
    labelDe: "Bildung und Schulen",
    labelPt: "Educação e escolas",
    labelRu: "Образование и школы",
    labelZh: "教育和学校",
    labelAr: "التعليم والمدارس",
    labelHi: "शिक्षा और विद्यालय"
  },
  {
    code: "TRANSPORT",
    labelFr: "Transport",
    labelEn: "Transportation",
    labelEs: "Transporte",
    labelDe: "Transport",
    labelPt: "Transporte",
    labelRu: "Транспорт",
    labelZh: "交通",
    labelAr: "النقل",
    labelHi: "परिवहन"
  },
  {
    code: "RECHERCHE_EMPLOI",
    labelFr: "Recherche d'emploi",
    labelEn: "Job search",
    labelEs: "Búsqueda de empleo",
    labelDe: "Jobsuche",
    labelPt: "Procura de emprego",
    labelRu: "Поиск работы",
    labelZh: "求职",
    labelAr: "البحث عن عمل",
    labelHi: "नौकरी खोज"
  },
  {
    code: "CREATION_ENTREPRISE",
    labelFr: "Création d'entreprise",
    labelEn: "Business creation",
    labelEs: "Creación de empresa",
    labelDe: "Unternehmensgründung",
    labelPt: "Criação de empresa",
    labelRu: "Создание бизнеса",
    labelZh: "创业",
    labelAr: "إنشاء شركة",
    labelHi: "व्यवसाय निर्माण"
  },
  {
    code: "FISCALITE_LOCALE",
    labelFr: "Fiscalité locale",
    labelEn: "Local taxation",
    labelEs: "Fiscalidad local",
    labelDe: "Lokale Besteuerung",
    labelPt: "Fiscalidade local",
    labelRu: "Местное налогообложение",
    labelZh: "地方税务",
    labelAr: "الضرائب المحلية",
    labelHi: "स्थानीय कराधान"
  },
  {
    code: "CULTURE_INTEGRATION",
    labelFr: "Culture et intégration",
    labelEn: "Culture and integration",
    labelEs: "Cultura e integración",
    labelDe: "Kultur und Integration",
    labelPt: "Cultura e integração",
    labelRu: "Культура и интеграция",
    labelZh: "文化和融入",
    labelAr: "الثقافة والاندماج",
    labelHi: "संस्कृति और एकीकरण"
  },
  {
    code: "VISA_IMMIGRATION",
    labelFr: "Visa et immigration",
    labelEn: "Visa and immigration",
    labelEs: "Visa e inmigración",
    labelDe: "Visum und Einwanderung",
    labelPt: "Visto e imigração",
    labelRu: "Виза и иммиграция",
    labelZh: "签证和移民",
    labelAr: "التأشيرة والهجرة",
    labelHi: "वीजा और आप्रवासन"
  },
  {
    code: "ASSURANCES",
    labelFr: "Assurances",
    labelEn: "Insurance",
    labelEs: "Seguros",
    labelDe: "Versicherungen",
    labelPt: "Seguros",
    labelRu: "Страхование",
    labelZh: "保险",
    labelAr: "التأمين",
    labelHi: "बीमा"
  },
  {
    code: "TELEPHONE_INTERNET",
    labelFr: "Téléphone et internet",
    labelEn: "Phone and internet",
    labelEs: "Teléfono e internet",
    labelDe: "Telefon und Internet",
    labelPt: "Telefone e internet",
    labelRu: "Телефон и интернет",
    labelZh: "电话和互联网",
    labelAr: "الهاتف والإنترنت",
    labelHi: "फोन और इंटरनेट"
  },
  {
    code: "ALIMENTATION_COURSES",
    labelFr: "Alimentation et courses",
    labelEn: "Food and shopping",
    labelEs: "Alimentación y compras",
    labelDe: "Lebensmittel und Einkaufen",
    labelPt: "Alimentação e compras",
    labelRu: "Питание и покупки",
    labelZh: "食品和购物",
    labelAr: "الطعام والتسوق",
    labelHi: "भोजन और खरीदारी"
  },
  {
    code: "LOISIRS_SORTIES",
    labelFr: "Loisirs et sorties",
    labelEn: "Leisure and outings",
    labelEs: "Ocio y salidas",
    labelDe: "Freizeit und Ausgehen",
    labelPt: "Lazer e saídas",
    labelRu: "Досуг и развлечения",
    labelZh: "休闲和外出",
    labelAr: "الترفيه والخروج",
    labelHi: "मनोरंजन और बाहर जाना"
  },
  {
    code: "SPORTS_ACTIVITES",
    labelFr: "Sports et activités",
    labelEn: "Sports and activities",
    labelEs: "Deportes y actividades",
    labelDe: "Sport und Aktivitäten",
    labelPt: "Desportos e atividades",
    labelRu: "Спорт и занятия",
    labelZh: "运动和活动",
    labelAr: "الرياضة والأنشطة",
    labelHi: "खेल और गतिविधियां"
  },
  {
    code: "SECURITE",
    labelFr: "Sécurité",
    labelEn: "Security",
    labelEs: "Seguridad",
    labelDe: "Sicherheit",
    labelPt: "Segurança",
    labelRu: "Безопасность",
    labelZh: "安全",
    labelAr: "الأمن",
    labelHi: "सुरक्षा"
  },
  {
    code: "URGENCES",
    labelFr: "Urgences",
    labelEn: "Emergencies",
    labelEs: "Emergencias",
    labelDe: "Notfälle",
    labelPt: "Emergências",
    labelRu: "Срочные случаи",
    labelZh: "紧急情况",
    labelAr: "حالات الطوارئ",
    labelHi: "आपातकाल"
  },
  {
    code: "PROBLEMES_ARGENT",
    labelFr: "Problèmes d'argent",
    labelEn: "Money problems",
    labelEs: "Problemas de dinero",
    labelDe: "Geldprobleme",
    labelPt: "Problemas de dinheiro",
    labelRu: "Денежные проблемы",
    labelZh: "资金问题",
    labelAr: "مشاكل مالية",
    labelHi: "धन की समस्याएं"
  },
  {
    code: "PROBLEMES_RELATIONNELS",
    labelFr: "Problèmes relationnels",
    labelEn: "Relationship problems",
    labelEs: "Problemas relacionales",
    labelDe: "Beziehungsprobleme",
    labelPt: "Problemas relacionais",
    labelRu: "Проблемы в отношениях",
    labelZh: "关系问题",
    labelAr: "مشاكل العلاقات",
    labelHi: "संबंध समस्याएं"
  },
  {
    code: "PROBLEMES_DIVERS",
    labelFr: "Problèmes divers",
    labelEn: "Various problems",
    labelEs: "Problemas diversos",
    labelDe: "Verschiedene Probleme",
    labelPt: "Problemas diversos",
    labelRu: "Различные проблемы",
    labelZh: "各种问题",
    labelAr: "مشاكل متنوعة",
    labelHi: "विभिन्न समस्याएं"
  },
  {
    code: "PARTIR_OU_RENTRER",
    labelFr: "Partir ou rentrer",
    labelEn: "Leaving or returning",
    labelEs: "Salir o volver",
    labelDe: "Abreisen oder zurückkehren",
    labelPt: "Partir ou voltar",
    labelRu: "Уезд или возвращение",
    labelZh: "离开或返回",
    labelAr: "المغادرة أو العودة",
    labelHi: "जाना या लौटना"
  },
  {
    code: "AUTRE_PRECISER",
    labelFr: "Autre (précisez)",
    labelEn: "Other (specify)",
    labelEs: "Otro (especificar)",
    labelDe: "Andere (angeben)",
    labelPt: "Outro (especificar)",
    labelRu: "Другое (уточните)",
    labelZh: "其他（请说明）",
    labelAr: "أخرى (حدد)",
    labelHi: "अन्य (निर्दिष्ट करें)",
    requiresDetails: true
  }
];

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Obtient le label d'un type d'aide dans une langue donnée
 */
export const getExpatHelpTypeLabel = (
  code: string,
  locale: 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi' = 'fr'
): string => {
  const item = expatHelpTypesData.find(t => t.code === code);
  if (!item) return code;
  
  const labelKey = `label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof ExpatHelpType;
  return item[labelKey] as string || item.labelFr;
};

/**
 * Obtient tous les types d'aide traduits dans une langue donnée
 */
export const getExpatHelpTypesForLocale = (
  locale: 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi' = 'fr'
) => {
  return expatHelpTypesData.map(item => ({
    code: item.code,
    label: getExpatHelpTypeLabel(item.code, locale),
    requiresDetails: item.requiresDetails
  }));
};

// ========================================
// TYPES TYPESCRIPT
// ========================================

export type ExpatHelpTypeCode = typeof expatHelpTypesData[number]['code'];

export const getExpatHelpType = (code: ExpatHelpTypeCode) =>
  expatHelpTypesData.find(t => t.code === code) ?? null;

export const EXPAT_HELP_TYPES_STATS = {
  total: expatHelpTypesData.filter(t => !t.disabled).length,
  requiresDetails: expatHelpTypesData.filter(t => t.requiresDetails && !t.disabled).map(t => t.code)
} as const;
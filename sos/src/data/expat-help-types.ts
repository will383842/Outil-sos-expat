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

  // ========================================
  // VOYAGEURS ET TOURISTES
  // ========================================
  {
    code: "ARNAQUE_VOL",
    labelFr: "Arnaque ou vol",
    labelEn: "Scam or theft",
    labelEs: "Estafa o robo",
    labelDe: "Betrug oder Diebstahl",
    labelPt: "Fraude ou roubo",
    labelRu: "Мошенничество или кража",
    labelZh: "诈骗或盗窃",
    labelAr: "احتيال أو سرقة",
    labelHi: "धोखाधड़ी या चोरी"
  },
  {
    code: "PERTE_DOCUMENTS",
    labelFr: "Perte de documents (passeport, carte d'identité)",
    labelEn: "Lost documents (passport, ID card)",
    labelEs: "Pérdida de documentos (pasaporte, DNI)",
    labelDe: "Verlorene Dokumente (Reisepass, Ausweis)",
    labelPt: "Perda de documentos (passaporte, BI)",
    labelRu: "Потеря документов (паспорт, удостоверение)",
    labelZh: "证件丢失（护照、身份证）",
    labelAr: "فقدان الوثائق (جواز السفر، بطاقة الهوية)",
    labelHi: "दस्तावेज़ खोना (पासपोर्ट, आईडी कार्ड)"
  },
  {
    code: "ASSISTANCE_CONSULAIRE",
    labelFr: "Assistance consulaire et ambassade",
    labelEn: "Consular and embassy assistance",
    labelEs: "Asistencia consular y embajada",
    labelDe: "Konsular- und Botschaftshilfe",
    labelPt: "Assistência consular e embaixada",
    labelRu: "Консульская помощь и посольство",
    labelZh: "领事馆和大使馆协助",
    labelAr: "المساعدة القنصلية والسفارة",
    labelHi: "कांसुलर और दूतावास सहायता"
  },
  {
    code: "HEBERGEMENT_URGENCE",
    labelFr: "Hébergement d'urgence",
    labelEn: "Emergency accommodation",
    labelEs: "Alojamiento de emergencia",
    labelDe: "Notunterkunft",
    labelPt: "Alojamento de emergência",
    labelRu: "Экстренное жилье",
    labelZh: "紧急住宿",
    labelAr: "سكن طوارئ",
    labelHi: "आपातकालीन आवास"
  },
  {
    code: "TRADUCTION_INTERPRETATION",
    labelFr: "Traduction et interprétation",
    labelEn: "Translation and interpretation",
    labelEs: "Traducción e interpretación",
    labelDe: "Übersetzung und Dolmetschen",
    labelPt: "Tradução e interpretação",
    labelRu: "Перевод и устный перевод",
    labelZh: "翻译和口译",
    labelAr: "الترجمة التحريرية والشفوية",
    labelHi: "अनुवाद और व्याख्या"
  },
  {
    code: "PROBLEMES_VOYAGE",
    labelFr: "Problèmes de voyage (vol annulé, retards)",
    labelEn: "Travel problems (cancelled flights, delays)",
    labelEs: "Problemas de viaje (vuelos cancelados, retrasos)",
    labelDe: "Reiseprobleme (Flugausfälle, Verspätungen)",
    labelPt: "Problemas de viagem (voos cancelados, atrasos)",
    labelRu: "Проблемы с путешествиями (отмены, задержки)",
    labelZh: "旅行问题（航班取消、延误）",
    labelAr: "مشاكل السفر (إلغاء الرحلات، التأخير)",
    labelHi: "यात्रा समस्याएं (उड़ान रद्द, देरी)"
  },

  // ========================================
  // NOMADES DIGITAUX
  // ========================================
  {
    code: "TRAVAIL_DISTANCE",
    labelFr: "Travail à distance / Freelance",
    labelEn: "Remote work / Freelance",
    labelEs: "Trabajo remoto / Freelance",
    labelDe: "Remote-Arbeit / Freiberuflich",
    labelPt: "Trabalho remoto / Freelancer",
    labelRu: "Удаленная работа / Фриланс",
    labelZh: "远程工作 / 自由职业",
    labelAr: "العمل عن بُعد / العمل الحر",
    labelHi: "दूरस्थ कार्य / फ्रीलांस"
  },
  {
    code: "COWORKING_COLIVING",
    labelFr: "Coworking et coliving",
    labelEn: "Coworking and coliving",
    labelEs: "Coworking y coliving",
    labelDe: "Coworking und Coliving",
    labelPt: "Coworking e coliving",
    labelRu: "Коворкинг и коливинг",
    labelZh: "共享办公和共居",
    labelAr: "العمل المشترك والسكن المشترك",
    labelHi: "कोवर्किंग और कोलिविंग"
  },
  {
    code: "FISCALITE_NOMADE",
    labelFr: "Fiscalité nomade digital",
    labelEn: "Digital nomad taxation",
    labelEs: "Fiscalidad de nómadas digitales",
    labelDe: "Besteuerung für digitale Nomaden",
    labelPt: "Fiscalidade de nômades digitais",
    labelRu: "Налогообложение цифровых кочевников",
    labelZh: "数字游民税务",
    labelAr: "ضرائب الرحالة الرقميين",
    labelHi: "डिजिटल नोमैड कराधान"
  },

  // ========================================
  // ÉTUDIANTS INTERNATIONAUX
  // ========================================
  {
    code: "ETUDES_INTERNATIONALES",
    labelFr: "Études à l'étranger",
    labelEn: "Studying abroad",
    labelEs: "Estudiar en el extranjero",
    labelDe: "Studieren im Ausland",
    labelPt: "Estudar no estrangeiro",
    labelRu: "Учеба за границей",
    labelZh: "留学",
    labelAr: "الدراسة في الخارج",
    labelHi: "विदेश में पढ़ाई"
  },
  {
    code: "LOGEMENT_ETUDIANT",
    labelFr: "Logement étudiant",
    labelEn: "Student housing",
    labelEs: "Alojamiento estudiantil",
    labelDe: "Studentenwohnung",
    labelPt: "Alojamento estudantil",
    labelRu: "Студенческое жилье",
    labelZh: "学生住宿",
    labelAr: "سكن طلابي",
    labelHi: "छात्र आवास"
  },
  {
    code: "BOURSE_FINANCEMENT",
    labelFr: "Bourses et financement études",
    labelEn: "Scholarships and study funding",
    labelEs: "Becas y financiación de estudios",
    labelDe: "Stipendien und Studienfinanzierung",
    labelPt: "Bolsas e financiamento de estudos",
    labelRu: "Стипендии и финансирование обучения",
    labelZh: "奖学金和学习资助",
    labelAr: "المنح الدراسية وتمويل الدراسة",
    labelHi: "छात्रवृत्ति और अध्ययन वित्तपोषण"
  },
  {
    code: "STAGE_INTERNATIONAL",
    labelFr: "Stage à l'international",
    labelEn: "International internship",
    labelEs: "Prácticas internacionales",
    labelDe: "Internationales Praktikum",
    labelPt: "Estágio internacional",
    labelRu: "Международная стажировка",
    labelZh: "国际实习",
    labelAr: "تدريب دولي",
    labelHi: "अंतर्राष्ट्रीय इंटर्नशिप"
  },

  // ========================================
  // RETRAITÉS EXPATRIÉS
  // ========================================
  {
    code: "RETRAITE_ETRANGER",
    labelFr: "Retraite à l'étranger",
    labelEn: "Retirement abroad",
    labelEs: "Jubilación en el extranjero",
    labelDe: "Ruhestand im Ausland",
    labelPt: "Aposentadoria no estrangeiro",
    labelRu: "Пенсия за границей",
    labelZh: "海外退休",
    labelAr: "التقاعد في الخارج",
    labelHi: "विदेश में सेवानिवृत्ति"
  },
  {
    code: "SANTE_SENIORS",
    labelFr: "Santé et soins pour seniors",
    labelEn: "Senior health and care",
    labelEs: "Salud y cuidados para mayores",
    labelDe: "Gesundheit und Pflege für Senioren",
    labelPt: "Saúde e cuidados para idosos",
    labelRu: "Здоровье и уход за пожилыми",
    labelZh: "老年人健康和护理",
    labelAr: "صحة ورعاية كبار السن",
    labelHi: "वरिष्ठ स्वास्थ्य और देखभाल"
  },
  {
    code: "PENSION_INTERNATIONALE",
    labelFr: "Pension et retraite internationale",
    labelEn: "International pension",
    labelEs: "Pensión internacional",
    labelDe: "Internationale Rente",
    labelPt: "Pensão internacional",
    labelRu: "Международная пенсия",
    labelZh: "国际养老金",
    labelAr: "المعاش الدولي",
    labelHi: "अंतर्राष्ट्रीय पेंशन"
  },

  // ========================================
  // FAMILLES EXPATRIÉES
  // ========================================
  {
    code: "SCOLARITE_ENFANTS",
    labelFr: "Scolarité des enfants",
    labelEn: "Children's schooling",
    labelEs: "Escolarización de los hijos",
    labelDe: "Schulbildung der Kinder",
    labelPt: "Escolaridade dos filhos",
    labelRu: "Обучение детей",
    labelZh: "子女教育",
    labelAr: "تعليم الأطفال",
    labelHi: "बच्चों की शिक्षा"
  },
  {
    code: "GARDE_ENFANTS",
    labelFr: "Garde d'enfants (nounou, crèche)",
    labelEn: "Childcare (nanny, daycare)",
    labelEs: "Cuidado de niños (niñera, guardería)",
    labelDe: "Kinderbetreuung (Kindermädchen, Krippe)",
    labelPt: "Cuidado de crianças (babá, creche)",
    labelRu: "Уход за детьми (няня, ясли)",
    labelZh: "托儿服务（保姆、托儿所）",
    labelAr: "رعاية الأطفال (مربية، حضانة)",
    labelHi: "बच्चों की देखभाल (आया, क्रेच)"
  },
  {
    code: "ACTIVITES_ENFANTS",
    labelFr: "Activités pour enfants",
    labelEn: "Children's activities",
    labelEs: "Actividades para niños",
    labelDe: "Aktivitäten für Kinder",
    labelPt: "Atividades para crianças",
    labelRu: "Занятия для детей",
    labelZh: "儿童活动",
    labelAr: "أنشطة للأطفال",
    labelHi: "बच्चों की गतिविधियां"
  },

  // ========================================
  // SERVICES SPÉCIALISÉS
  // ========================================
  {
    code: "DEMENAGEMENT_INTERNATIONAL",
    labelFr: "Déménagement international",
    labelEn: "International moving",
    labelEs: "Mudanza internacional",
    labelDe: "Internationaler Umzug",
    labelPt: "Mudança internacional",
    labelRu: "Международный переезд",
    labelZh: "国际搬家",
    labelAr: "النقل الدولي",
    labelHi: "अंतर्राष्ट्रीय स्थानांतरण"
  },
  {
    code: "ANIMAUX_COMPAGNIE",
    labelFr: "Animaux de compagnie (import, vétérinaire)",
    labelEn: "Pets (import, veterinarian)",
    labelEs: "Mascotas (importación, veterinario)",
    labelDe: "Haustiere (Import, Tierarzt)",
    labelPt: "Animais de estimação (importação, veterinário)",
    labelRu: "Домашние животные (ввоз, ветеринар)",
    labelZh: "宠物（进口、兽医）",
    labelAr: "الحيوانات الأليفة (الاستيراد، البيطري)",
    labelHi: "पालतू जानवर (आयात, पशु चिकित्सक)"
  },
  {
    code: "PERMIS_CONDUIRE",
    labelFr: "Permis de conduire (échange, obtention)",
    labelEn: "Driver's license (exchange, obtaining)",
    labelEs: "Permiso de conducir (canje, obtención)",
    labelDe: "Führerschein (Umtausch, Erwerb)",
    labelPt: "Carta de condução (troca, obtenção)",
    labelRu: "Водительские права (обмен, получение)",
    labelZh: "驾驶执照（更换、获取）",
    labelAr: "رخصة القيادة (التبديل، الحصول)",
    labelHi: "ड्राइविंग लाइसेंस (विनिमय, प्राप्त करना)"
  },
  {
    code: "COMMUNAUTE_EXPATRIES",
    labelFr: "Communauté d'expatriés",
    labelEn: "Expat community",
    labelEs: "Comunidad de expatriados",
    labelDe: "Expat-Gemeinschaft",
    labelPt: "Comunidade de expatriados",
    labelRu: "Сообщество экспатов",
    labelZh: "外籍人士社区",
    labelAr: "مجتمع المغتربين",
    labelHi: "प्रवासी समुदाय"
  },
  {
    code: "SOUTIEN_PSYCHOLOGIQUE",
    labelFr: "Soutien psychologique (adaptation, isolement)",
    labelEn: "Psychological support (adaptation, isolation)",
    labelEs: "Apoyo psicológico (adaptación, aislamiento)",
    labelDe: "Psychologische Unterstützung (Anpassung, Isolation)",
    labelPt: "Apoio psicológico (adaptação, isolamento)",
    labelRu: "Психологическая поддержка (адаптация, изоляция)",
    labelZh: "心理支持（适应、孤立）",
    labelAr: "الدعم النفسي (التكيف، العزلة)",
    labelHi: "मनोवैज्ञानिक सहायता (अनुकूलन, अलगाव)"
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
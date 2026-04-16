/**
 * 🎯 GÉNÉRATEUR DE FEATURED SNIPPETS (Position 0)
 * =================================================
 * 
 * Génère automatiquement des structured data optimisés pour
 * les Featured Snippets Google pour chaque prestataire.
 * 
 * Couvre :
 * - 197 pays
 * - 9 langues (fr, en, es, de, pt, ru, zh, ar, hi)
 * - Avocats + Expats
 * - Toutes spécialités
 */

import { formatPublicName } from './slugGenerator';
import { getCountryName } from './formatters';
import { getLawyerSpecialityLabel } from '../data/lawyer-specialties';
import { getExpatHelpTypeLabel } from '../data/expat-help-types';
import { getSpecialtyLabel, mapLanguageToLocale } from './specialtyMapper';

// ==========================================
// 📊 TYPES
// ==========================================

export interface SnippetProvider {
  firstName: string;
  lastName: string;
  type: 'lawyer' | 'expat';
  country: string;
  city?: string;
  languages: string[];
  specialties: string[];
  helpTypes?: string[];
  yearsOfExperience: number;
  yearsAsExpat?: number;
  rating: number;
  reviewCount: number;
  successRate?: number;
  totalCalls?: number;
  description?: string;
}

export interface SnippetConfig {
  locale: string;
  includePrice?: boolean;
  includeFAQ?: boolean;
  includeHowTo?: boolean;
  includeReviews?: boolean;
  /** Prix dynamique en EUR depuis Firestore (admin_config/pricing). Si absent, fallback sur 49/19. */
  priceEur?: number;
}

export interface GeneratedSnippet {
  faqSchema: object;
  howToSchema?: object;
  breadcrumbSchema: object;
  metaDescription: string;
  h1: string;
  h2List: string[];
  faqContent: Array<{ question: string; answer: string }>;
  howToContent?: Array<{ step: string; description: string }>;
}

// ==========================================
// 📝 TEMPLATES DE QUESTIONS PAR LANGUE
// ==========================================

const FAQ_TEMPLATES: Record<string, {
  lawyer: Array<{ question: string; answer: string }>;
  expat: Array<{ question: string; answer: string }>;
}> = {
  fr: {
    lawyer: [
      {
        question: "Comment contacter {name} ?",
        answer: "{name} est disponible sur SOS Expat & Travelers pour des consultations en ligne. Vous pouvez réserver un appel téléphonique sécurisé directement depuis son profil. {pronounHe} parle {languages} et {pronounIs} spécialisé{eAgreement} en {specialties}."
      },
      {
        question: "Quelles sont les spécialités de {name} ?",
        answer: "{name} est {title} en {country} avec {years} ans d'expérience. {pronounHis} spécialités incluent : {specialties}. {pronounHe} a traité {calls} dossiers avec un taux de réussite de {successRate}%."
      },
      {
        question: "Combien coûte une consultation avec {name} ?",
        answer: "Une consultation téléphonique de 20 minutes avec {name} coûte {price}. Le paiement est sécurisé et vous pouvez réserver un créneau immédiatement si {pronounHe} est disponible en ligne."
      },
      {
        question: "Dans quels pays {name} peut-il intervenir ?",
        answer: "{name} intervient principalement en {country}{cityInfo}. {pronounHe} est également en mesure de vous conseiller sur des questions internationales liées à {specialties}."
      },
      {
        question: "Quels avis ont les clients de {name} ?",
        answer: "{name} a une note moyenne de {rating}/5 basée sur {reviewCount} avis clients. {pronounHis} clients apprécient particulièrement {pronounHis} expertise en {specialties} et {pronounHis} disponibilité."
      },
      {
        question: "Pourquoi choisir {name} comme avocat en {country} ?",
        answer: "Avec {years} ans d'expérience en {country}, {name} combine expertise juridique et connaissance approfondie du contexte local. {pronounHe} parle couramment {languages}, facilitant la communication avec les clients francophones et internationaux."
      }
    ],
    expat: [
      {
        question: "Comment {name} peut-il aider les expatriés en {country} ?",
        answer: "{name} est {title} en {country} avec {years} ans d'expérience d'expatriation. {pronounHe} peut vous aider sur : {helpTypes}. {pronounHe} parle {languages} et comprend parfaitement les défis de l'expatriation."
      },
      {
        question: "Quels services propose {name} aux expatriés ?",
        answer: "{name} propose des consultations personnalisées pour les expatriés, voyageurs et vacanciers en {country}. {pronounHis} domaines d'expertise incluent : {helpTypes}. {pronounHe} partage {pronounHis} expérience pratique acquise pendant {years} ans."
      },
      {
        question: "Combien coûte une consultation avec {name} ?",
        answer: "Une session de conseil de 30 minutes avec {name} coûte {price}. Vous bénéficiez de conseils pratiques basés sur {pronounHis} expérience personnelle de {years} ans en {country}."
      },
      {
        question: "Pourquoi faire appel à {name} pour s'expatrier en {country} ?",
        answer: "Ayant vécu {years} ans en {country}, {name} connaît tous les aspects pratiques de l'expatriation. {pronounHe} peut vous éviter les erreurs courantes et vous faire gagner un temps précieux sur : {helpTypes}."
      },
      {
        question: "Quels avis ont les expatriés sur {name} ?",
        answer: "{name} a aidé {calls} expatriés avec une satisfaction de {successRate}%. Les clients apprécient particulièrement {pronounHis} conseils pratiques sur {helpTypes} et {pronounHis} disponibilité pour répondre aux questions."
      },
      {
        question: "Dans quelle langue {name} peut-il conseiller ?",
        answer: "{name} parle couramment {languages}, ce qui permet de communiquer facilement avec les expatriés de différentes nationalités en {country}. Cette polyglossie est un atout majeur pour comprendre les nuances culturelles."
      }
    ]
  },
  en: {
    lawyer: [
      {
        question: "How to contact {name}?",
        answer: "{name} is available on SOS Expat & Travelers for online consultations. You can book a secure phone call directly from {pronounHis} profile. {pronounHe} speaks {languages} and specializes in {specialties}."
      },
      {
        question: "What are {name}'s specialties?",
        answer: "{name} is {title} in {country} with {years} years of experience. {pronounHis} specialties include: {specialties}. {pronounHe} has handled {calls} cases with a {successRate}% success rate."
      },
      {
        question: "How much does a consultation with {name} cost?",
        answer: "A 20-minute phone consultation with {name} costs {price}. Payment is secure and you can book a slot immediately if {pronounHe} is available online."
      },
      {
        question: "In which countries can {name} intervene?",
        answer: "{name} primarily operates in {country}{cityInfo}. {pronounHe} can also advise you on international matters related to {specialties}."
      },
      {
        question: "What reviews do {name}'s clients give?",
        answer: "{name} has an average rating of {rating}/5 based on {reviewCount} client reviews. Clients particularly appreciate {pronounHis} expertise in {specialties} and availability."
      },
      {
        question: "Why choose {name} as a lawyer in {country}?",
        answer: "With {years} years of experience in {country}, {name} combines legal expertise with deep local context knowledge. {pronounHe} speaks {languages} fluently, facilitating communication with francophone and international clients."
      }
    ],
    expat: [
      {
        question: "How can {name} help expats in {country}?",
        answer: "{name} is {title} in {country} with {years} years of expatriation experience. {pronounHe} can help you with: {helpTypes}. {pronounHe} speaks {languages} and understands expat challenges perfectly."
      },
      {
        question: "What services does {name} offer to expats?",
        answer: "{name} offers personalized consultations for expats, travelers, and vacationers in {country}. {pronounHis} areas of expertise include: {helpTypes}. {pronounHe} shares practical experience gained over {years} years."
      },
      {
        question: "How much does a consultation with {name} cost?",
        answer: "A 30-minute advice session with {name} costs {price}. You benefit from practical advice based on {pronounHis} {years} years of personal experience in {country}."
      },
      {
        question: "Why use {name} to relocate to {country}?",
        answer: "Having lived {years} years in {country}, {name} knows all practical aspects of expatriation. {pronounHe} can help you avoid common mistakes and save precious time on: {helpTypes}."
      },
      {
        question: "What reviews do expats give about {name}?",
        answer: "{name} has helped {calls} expats with {successRate}% satisfaction. Clients particularly appreciate {pronounHis} practical advice on {helpTypes} and availability to answer questions."
      },
      {
        question: "In what language can {name} advise?",
        answer: "{name} speaks {languages} fluently, which allows easy communication with expats of different nationalities in {country}. This multilingualism is a major asset for understanding cultural nuances."
      }
    ]
  },
  es: {
    lawyer: [
      {
        question: "¿Cómo contactar a {name}?",
        answer: "{name} está disponible en SOS Expat & Travelers para consultas en línea. Puede reservar una llamada telefónica segura directamente desde su perfil. Habla {languages} y se especializa en {specialties}."
      },
      {
        question: "¿Cuáles son las especialidades de {name}?",
        answer: "{name} es {title} en {country} con {years} años de experiencia. Sus especialidades incluyen: {specialties}. Ha manejado {calls} casos con una tasa de éxito del {successRate}%."
      },
      {
        question: "¿Cuánto cuesta una consulta con {name}?",
        answer: "Una consulta telefónica de 20 minutos con {name} cuesta {price}. El pago es seguro y puede reservar inmediatamente si está disponible en línea."
      },
      {
        question: "¿En qué países puede intervenir {name}?",
        answer: "{name} opera principalmente en {country}{cityInfo}. También puede asesorarle sobre asuntos internacionales relacionados con {specialties}."
      },
      {
        question: "¿Qué opiniones tienen los clientes de {name}?",
        answer: "{name} tiene una calificación promedio de {rating}/5 basada en {reviewCount} opiniones de clientes. Los clientes aprecian especialmente su experiencia en {specialties} y disponibilidad."
      },
      {
        question: "¿Por qué elegir a {name} como abogado en {country}?",
        answer: "Con {years} años de experiencia en {country}, {name} combina experiencia legal con conocimiento profundo del contexto local. Habla {languages} con fluidez, facilitando la comunicación con clientes internacionales."
      }
    ],
    expat: [
      {
        question: "¿Cómo puede {name} ayudar a los expatriados en {country}?",
        answer: "{name} es {title} en {country} con {years} años de experiencia de expatriación. Puede ayudarle con: {helpTypes}. Habla {languages} y entiende perfectamente los desafíos de la expatriación."
      },
      {
        question: "¿Qué servicios ofrece {name} a los expatriados?",
        answer: "{name} ofrece consultas personalizadas para expatriados, viajeros y vacacionistas en {country}. Sus áreas de experiencia incluyen: {helpTypes}. Comparte experiencia práctica adquirida durante {years} años."
      },
      {
        question: "¿Cuánto cuesta una consulta con {name}?",
        answer: "Una sesión de asesoramiento de 30 minutos con {name} cuesta {price}. Obtiene consejos prácticos basados en {years} años de experiencia personal en {country}."
      },
      {
        question: "¿Por qué recurrir a {name} para expatriarse a {country}?",
        answer: "Habiendo vivido {years} años en {country}, {name} conoce todos los aspectos prácticos de la expatriación. Puede ayudarle a evitar errores comunes y ahorrar tiempo valioso en: {helpTypes}."
      },
      {
        question: "¿Qué opiniones tienen los expatriados sobre {name}?",
        answer: "{name} ha ayudado a {calls} expatriados con una satisfacción del {successRate}%. Los clientes aprecian especialmente sus consejos prácticos sobre {helpTypes} y su disponibilidad."
      },
      {
        question: "¿En qué idioma puede asesorar {name}?",
        answer: "{name} habla {languages} con fluidez, lo que permite una comunicación fácil con expatriados de diferentes nacionalidades en {country}. Este multilingüismo es una ventaja importante."
      }
    ]
  },
  de: {
    lawyer: [
      {
        question: "Wie kann ich {name} kontaktieren?",
        answer: "{name} ist auf SOS Expat & Travelers für Online-Beratungen verfügbar. Sie können direkt über sein Profil einen sicheren Telefonanruf buchen. Er spricht {languages} und ist spezialisiert auf {specialties}."
      },
      {
        question: "Was sind die Spezialgebiete von {name}?",
        answer: "{name} ist {title} in {country} mit {years} Jahren Erfahrung. Seine Spezialgebiete umfassen: {specialties}. Er hat {calls} Fälle mit einer Erfolgsquote von {successRate}% bearbeitet."
      },
      {
        question: "Wie viel kostet eine Beratung mit {name}?",
        answer: "Eine 20-minütige Telefonberatung mit {name} kostet {price}. Die Zahlung ist sicher und Sie können sofort einen Termin buchen, wenn er online verfügbar ist."
      },
      {
        question: "In welchen Ländern kann {name} tätig werden?",
        answer: "{name} ist hauptsächlich in {country}{cityInfo} tätig. Er kann Sie auch zu internationalen Angelegenheiten im Zusammenhang mit {specialties} beraten."
      },
      {
        question: "Welche Bewertungen geben die Kunden von {name}?",
        answer: "{name} hat eine Durchschnittsbewertung von {rating}/5 basierend auf {reviewCount} Kundenbewertungen. Kunden schätzen besonders seine Expertise in {specialties} und Verfügbarkeit."
      },
      {
        question: "Warum {name} als Anwalt in {country} wählen?",
        answer: "Mit {years} Jahren Erfahrung in {country} kombiniert {name} juristische Expertise mit tiefem lokalen Kontextwissen. Er spricht fließend {languages}, was die Kommunikation mit internationalen Kunden erleichtert."
      }
    ],
    expat: [
      {
        question: "Wie kann {name} Expats in {country} helfen?",
        answer: "{name} ist {title} in {country} mit {years} Jahren Expat-Erfahrung. Er kann Ihnen helfen bei: {helpTypes}. Er spricht {languages} und versteht die Herausforderungen der Expatriierung perfekt."
      },
      {
        question: "Welche Dienstleistungen bietet {name} Expats an?",
        answer: "{name} bietet personalisierte Beratungen für Expats, Reisende und Urlauber in {country} an. Seine Fachgebiete umfassen: {helpTypes}. Er teilt praktische Erfahrungen aus {years} Jahren."
      },
      {
        question: "Wie viel kostet eine Beratung mit {name}?",
        answer: "Eine 30-minütige Beratungssitzung mit {name} kostet {price}. Sie profitieren von praktischen Ratschlägen basierend auf {years} Jahren persönlicher Erfahrung in {country}."
      },
      {
        question: "Warum {name} für die Auswanderung nach {country} nutzen?",
        answer: "Nach {years} Jahren in {country} kennt {name} alle praktischen Aspekte der Expatriierung. Er kann Ihnen helfen, häufige Fehler zu vermeiden und wertvolle Zeit zu sparen bei: {helpTypes}."
      },
      {
        question: "Welche Bewertungen geben Expats über {name}?",
        answer: "{name} hat {calls} Expats mit {successRate}% Zufriedenheit geholfen. Kunden schätzen besonders seine praktischen Ratschläge zu {helpTypes} und seine Verfügbarkeit."
      },
      {
        question: "In welcher Sprache kann {name} beraten?",
        answer: "{name} spricht fließend {languages}, was eine einfache Kommunikation mit Expats verschiedener Nationalitäten in {country} ermöglicht. Diese Mehrsprachigkeit ist ein großer Vorteil."
      }
    ]
  },
  pt: {
    lawyer: [
      {
        question: "Como contactar {name}?",
        answer: "{name} está disponível no SOS Expat & Travelers para consultas online. Pode reservar uma chamada telefónica segura diretamente do seu perfil. Fala {languages} e é especializado em {specialties}."
      },
      {
        question: "Quais são as especialidades de {name}?",
        answer: "{name} é {title} em {country} com {years} anos de experiência. As suas especialidades incluem: {specialties}. Tratou {calls} casos com uma taxa de sucesso de {successRate}%."
      },
      {
        question: "Quanto custa uma consulta com {name}?",
        answer: "Uma consulta telefónica de 20 minutos com {name} custa {price}. O pagamento é seguro e pode reservar imediatamente se estiver disponível online."
      },
      {
        question: "Em que países {name} pode intervir?",
        answer: "{name} opera principalmente em {country}{cityInfo}. Também pode aconselhá-lo sobre assuntos internacionais relacionados com {specialties}."
      },
      {
        question: "Que avaliações os clientes de {name} dão?",
        answer: "{name} tem uma classificação média de {rating}/5 com base em {reviewCount} avaliações de clientes. Os clientes apreciam especialmente a sua experiência em {specialties} e disponibilidade."
      },
      {
        question: "Por que escolher {name} como advogado em {country}?",
        answer: "Com {years} anos de experiência em {country}, {name} combina expertise jurídica com conhecimento profundo do contexto local. Fala fluentemente {languages}, facilitando a comunicação com clientes internacionais."
      }
    ],
    expat: [
      {
        question: "Como {name} pode ajudar expatriados em {country}?",
        answer: "{name} é {title} em {country} com {years} anos de experiência de expatriação. Pode ajudá-lo com: {helpTypes}. Fala {languages} e compreende perfeitamente os desafios da expatriação."
      },
      {
        question: "Que serviços {name} oferece aos expatriados?",
        answer: "{name} oferece consultas personalizadas para expatriados, viajantes e turistas em {country}. As suas áreas de especialização incluem: {helpTypes}. Partilha experiência prática adquirida durante {years} anos."
      },
      {
        question: "Quanto custa uma consulta com {name}?",
        answer: "Uma sessão de aconselhamento de 30 minutos com {name} custa {price}. Beneficia de conselhos práticos baseados em {years} anos de experiência pessoal em {country}."
      },
      {
        question: "Por que recorrer a {name} para expatriar-se para {country}?",
        answer: "Tendo vivido {years} anos em {country}, {name} conhece todos os aspectos práticos da expatriação. Pode ajudá-lo a evitar erros comuns e poupar tempo precioso em: {helpTypes}."
      },
      {
        question: "Que avaliações os expatriados dão sobre {name}?",
        answer: "{name} ajudou {calls} expatriados com {successRate}% de satisfação. Os clientes apreciam especialmente os seus conselhos práticos sobre {helpTypes} e disponibilidade."
      },
      {
        question: "Em que língua {name} pode aconselhar?",
        answer: "{name} fala fluentemente {languages}, o que permite comunicação fácil com expatriados de diferentes nacionalidades em {country}. Este multilinguismo é uma grande vantagem."
      }
    ]
  },
  ru: {
    lawyer: [
      {
        question: "Как связаться с {name}?",
        answer: "{name} доступен на SOS Expat & Travelers для онлайн-консультаций. Вы можете забронировать безопасный телефонный звонок прямо из его профиля. Он говорит на {languages} и специализируется на {specialties}."
      },
      {
        question: "Какие специализации у {name}?",
        answer: "{name} - {title} в {country} с опытом {years} лет. Его специализации включают: {specialties}. Он рассмотрел {calls} дел с показателем успеха {successRate}%."
      },
      {
        question: "Сколько стоит консультация с {name}?",
        answer: "20-минутная телефонная консультация с {name} стоит {price}. Оплата безопасна, и вы можете забронировать сразу, если он доступен онлайн."
      },
      {
        question: "В каких странах {name} может оказать помощь?",
        answer: "{name} работает в основном в {country}{cityInfo}. Он также может консультировать по международным вопросам, связанным с {specialties}."
      },
      {
        question: "Какие отзывы у клиентов {name}?",
        answer: "У {name} средний рейтинг {rating}/5 на основе {reviewCount} отзывов клиентов. Клиенты особенно ценят его опыт в {specialties} и доступность."
      },
      {
        question: "Почему выбрать {name} в качестве юриста в {country}?",
        answer: "С опытом {years} лет в {country}, {name} сочетает юридический опыт с глубоким знанием местного контекста. Он свободно говорит на {languages}, облегчая общение с международными клиентами."
      }
    ],
    expat: [
      {
        question: "Как {name} может помочь экспатам в {country}?",
        answer: "{name} - {title} в {country} с опытом экспатриации {years} лет. Он может помочь вам с: {helpTypes}. Он говорит на {languages} и прекрасно понимает проблемы экспатриации."
      },
      {
        question: "Какие услуги {name} предлагает экспатам?",
        answer: "{name} предлагает персонализированные консультации для экспатов, путешественников и отдыхающих в {country}. Его области экспертизы включают: {helpTypes}. Он делится практическим опытом, полученным за {years} лет."
      },
      {
        question: "Сколько стоит консультация с {name}?",
        answer: "30-минутная консультация с {name} стоит {price}. Вы получаете практические советы, основанные на {years} годах личного опыта в {country}."
      },
      {
        question: "Почему обратиться к {name} для переезда в {country}?",
        answer: "Прожив {years} лет в {country}, {name} знает все практические аспекты экспатриации. Он может помочь избежать типичных ошибок и сэкономить время на: {helpTypes}."
      },
      {
        question: "Какие отзывы экспаты дают о {name}?",
        answer: "{name} помог {calls} экспатам с удовлетворенностью {successRate}%. Клиенты особенно ценят его практические советы по {helpTypes} и доступность."
      },
      {
        question: "На каком языке {name} может консультировать?",
        answer: "{name} свободно говорит на {languages}, что позволяет легко общаться с экспатами разных национальностей в {country}. Это многоязычие - большое преимущество."
      }
    ]
  },
  // 中文 (Chinois)
  ch: {
    lawyer: [
      {
        question: "如何联系{name}？",
        answer: "{name}可在SOS Expat & Travelers平台进行在线咨询。您可以直接从其个人资料预约安全电话咨询。{pronounHe}会说{languages}，专攻{specialties}。"
      },
      {
        question: "{name}的专业领域是什么？",
        answer: "{name}是{country}的{title}，拥有{years}年经验。专业领域包括：{specialties}。已处理{calls}个案件，成功率{successRate}%。"
      },
      {
        question: "与{name}咨询费用是多少？",
        answer: "与{name}进行20分钟电话咨询费用为{price}。支付安全，如果在线可立即预约。"
      },
      {
        question: "{name}可以在哪些国家提供服务？",
        answer: "{name}主要在{country}{cityInfo}执业。也可就{specialties}相关的国际事务提供咨询。"
      },
      {
        question: "{name}的客户评价如何？",
        answer: "{name}基于{reviewCount}条客户评价，平均评分为{rating}/5。客户特别赞赏其在{specialties}方面的专业知识和可用性。"
      },
      {
        question: "为什么选择{name}作为{country}的律师？",
        answer: "凭借在{country}{years}年的经验，{name}将法律专业知识与深厚的当地背景知识相结合。精通{languages}，便于与国际客户沟通。"
      }
    ],
    expat: [
      {
        question: "{name}如何帮助在{country}的外籍人士？",
        answer: "{name}是{country}的{title}，拥有{years}年外派经验。可以帮助您：{helpTypes}。会说{languages}，完全理解外派挑战。"
      },
      {
        question: "{name}为外籍人士提供哪些服务？",
        answer: "{name}为{country}的外籍人士、旅行者和度假者提供个性化咨询。专业领域包括：{helpTypes}。分享{years}年积累的实践经验。"
      },
      {
        question: "与{name}咨询费用是多少？",
        answer: "与{name}进行30分钟咨询费用为{price}。您将获得基于其在{country}{years}年个人经验的实用建议。"
      },
      {
        question: "为什么选择{name}帮助移居{country}？",
        answer: "在{country}生活了{years}年，{name}了解外派的所有实际方面。可以帮助您避免常见错误，节省宝贵时间：{helpTypes}。"
      },
      {
        question: "外籍人士对{name}的评价如何？",
        answer: "{name}已帮助{calls}位外籍人士，满意度{successRate}%。客户特别赞赏其在{helpTypes}方面的实用建议和可用性。"
      },
      {
        question: "{name}可以用什么语言提供咨询？",
        answer: "{name}精通{languages}，可以轻松与{country}不同国籍的外籍人士沟通。这种多语言能力是理解文化差异的重要优势。"
      }
    ]
  },
  // العربية (Arabe)
  ar: {
    lawyer: [
      {
        question: "كيف يمكنني التواصل مع {name}؟",
        answer: "{name} متاح على SOS Expat & Travelers للاستشارات عبر الإنترنت. يمكنك حجز مكالمة هاتفية آمنة مباشرة من ملفه الشخصي. يتحدث {languages} ومتخصص في {specialties}."
      },
      {
        question: "ما هي تخصصات {name}؟",
        answer: "{name} هو {title} في {country} مع {years} سنوات من الخبرة. تشمل تخصصاته: {specialties}. تعامل مع {calls} قضية بمعدل نجاح {successRate}%."
      },
      {
        question: "كم تكلفة الاستشارة مع {name}؟",
        answer: "استشارة هاتفية لمدة 20 دقيقة مع {name} تكلف {price}. الدفع آمن ويمكنك الحجز فوراً إذا كان متاحاً."
      },
      {
        question: "في أي دول يمكن لـ {name} تقديم خدماته؟",
        answer: "يعمل {name} بشكل رئيسي في {country}{cityInfo}. يمكنه أيضاً تقديم المشورة في المسائل الدولية المتعلقة بـ {specialties}."
      },
      {
        question: "ما هي تقييمات عملاء {name}؟",
        answer: "يحصل {name} على تقييم متوسط {rating}/5 بناءً على {reviewCount} تقييم. يقدر العملاء خبرته في {specialties} وتوافره."
      },
      {
        question: "لماذا تختار {name} كمحامي في {country}؟",
        answer: "مع {years} سنوات من الخبرة في {country}، يجمع {name} بين الخبرة القانونية والمعرفة العميقة بالسياق المحلي. يتحدث {languages} بطلاقة."
      }
    ],
    expat: [
      {
        question: "كيف يمكن لـ {name} مساعدة المغتربين في {country}؟",
        answer: "{name} هو {title} في {country} مع {years} سنوات من الخبرة في الاغتراب. يمكنه مساعدتك في: {helpTypes}. يتحدث {languages} ويفهم تحديات الاغتراب تماماً."
      },
      {
        question: "ما الخدمات التي يقدمها {name} للمغتربين؟",
        answer: "يقدم {name} استشارات شخصية للمغتربين والمسافرين في {country}. تشمل مجالات خبرته: {helpTypes}. يشارك خبرته العملية المكتسبة خلال {years} سنوات."
      },
      {
        question: "كم تكلفة الاستشارة مع {name}؟",
        answer: "جلسة استشارية لمدة 30 دقيقة مع {name} تكلف {price}. ستحصل على نصائح عملية بناءً على {years} سنوات من خبرته الشخصية في {country}."
      },
      {
        question: "لماذا تستعين بـ {name} للانتقال إلى {country}؟",
        answer: "بعد أن عاش {years} سنوات في {country}، يعرف {name} جميع الجوانب العملية للاغتراب. يمكنه مساعدتك في تجنب الأخطاء الشائعة وتوفير وقتك في: {helpTypes}."
      },
      {
        question: "ما تقييمات المغتربين عن {name}؟",
        answer: "ساعد {name} {calls} مغترب بنسبة رضا {successRate}%. يقدر العملاء نصائحه العملية حول {helpTypes} وتوافره."
      },
      {
        question: "بأي لغة يمكن لـ {name} تقديم الاستشارة؟",
        answer: "يتحدث {name} {languages} بطلاقة، مما يسهل التواصل مع المغتربين من جنسيات مختلفة في {country}. هذه القدرة اللغوية ميزة كبيرة."
      }
    ]
  },
  // हिन्दी (Hindi)
  hi: {
    lawyer: [
      {
        question: "{name} से कैसे संपर्क करें?",
        answer: "{name} SOS Expat & Travelers पर ऑनलाइन परामर्श के लिए उपलब्ध हैं। आप उनकी प्रोफ़ाइल से सीधे सुरक्षित फ़ोन कॉल बुक कर सकते हैं। वे {languages} बोलते हैं और {specialties} में विशेषज्ञ हैं।"
      },
      {
        question: "{name} की विशेषज्ञताएं क्या हैं?",
        answer: "{name} {country} में {title} हैं जिनके पास {years} वर्षों का अनुभव है। उनकी विशेषज्ञताओं में शामिल हैं: {specialties}। उन्होंने {successRate}% सफलता दर के साथ {calls} मामले संभाले हैं।"
      },
      {
        question: "{name} के साथ परामर्श की लागत कितनी है?",
        answer: "{name} के साथ 20 मिनट की फ़ोन परामर्श की लागत {price} है। भुगतान सुरक्षित है और यदि वे ऑनलाइन उपलब्ध हैं तो आप तुरंत बुक कर सकते हैं।"
      },
      {
        question: "{name} किन देशों में सेवा दे सकते हैं?",
        answer: "{name} मुख्य रूप से {country}{cityInfo} में काम करते हैं। वे {specialties} से संबंधित अंतरराष्ट्रीय मामलों पर भी सलाह दे सकते हैं।"
      },
      {
        question: "{name} के ग्राहकों की समीक्षाएं कैसी हैं?",
        answer: "{name} की {reviewCount} ग्राहक समीक्षाओं के आधार पर औसत रेटिंग {rating}/5 है। ग्राहक विशेष रूप से {specialties} में उनकी विशेषज्ञता की सराहना करते हैं।"
      },
      {
        question: "{country} में वकील के रूप में {name} को क्यों चुनें?",
        answer: "{country} में {years} वर्षों के अनुभव के साथ, {name} कानूनी विशेषज्ञता को स्थानीय संदर्भ की गहरी समझ के साथ जोड़ते हैं। वे {languages} धाराप्रवाह बोलते हैं।"
      }
    ],
    expat: [
      {
        question: "{name} {country} में प्रवासियों की कैसे मदद कर सकते हैं?",
        answer: "{name} {country} में {title} हैं जिनके पास {years} वर्षों का प्रवास अनुभव है। वे इनमें आपकी मदद कर सकते हैं: {helpTypes}। वे {languages} बोलते हैं और प्रवास की चुनौतियों को पूरी तरह समझते हैं।"
      },
      {
        question: "{name} प्रवासियों को कौन सी सेवाएं प्रदान करते हैं?",
        answer: "{name} {country} में प्रवासियों, यात्रियों के लिए व्यक्तिगत परामर्श प्रदान करते हैं। उनकी विशेषज्ञता में शामिल हैं: {helpTypes}। वे {years} वर्षों में अर्जित व्यावहारिक अनुभव साझा करते हैं।"
      },
      {
        question: "{name} के साथ परामर्श की लागत कितनी है?",
        answer: "{name} के साथ 30 मिनट की सलाह सत्र की लागत {price} है। आपको {country} में उनके {years} वर्षों के व्यक्तिगत अनुभव पर आधारित व्यावहारिक सलाह मिलेगी।"
      },
      {
        question: "{country} जाने के लिए {name} की मदद क्यों लें?",
        answer: "{country} में {years} वर्ष रहने के बाद, {name} प्रवास के सभी व्यावहारिक पहलुओं को जानते हैं। वे आपको सामान्य गलतियों से बचने में मदद कर सकते हैं: {helpTypes}।"
      },
      {
        question: "प्रवासी {name} के बारे में क्या कहते हैं?",
        answer: "{name} ने {successRate}% संतुष्टि के साथ {calls} प्रवासियों की मदद की है। ग्राहक {helpTypes} पर उनकी व्यावहारिक सलाह की सराहना करते हैं।"
      },
      {
        question: "{name} किस भाषा में परामर्श दे सकते हैं?",
        answer: "{name} {languages} धाराप्रवाह बोलते हैं, जिससे {country} में विभिन्न राष्ट्रीयताओं के प्रवासियों के साथ आसान संवाद होता है। यह बहुभाषी क्षमता एक बड़ा फायदा है।"
      }
    ]
  }
};

// ==========================================
// 🔧 FONCTIONS UTILITAIRES
// ==========================================

/**
 * Traductions des types de prestataires pour les 9 langues
 */
const PROVIDER_TYPE_LABELS: Record<string, { lawyer: string; expat: string }> = {
  fr: { lawyer: 'avocat', expat: 'expert expatrié' },
  en: { lawyer: 'lawyer', expat: 'expat expert' },
  es: { lawyer: 'abogado', expat: 'experto expatriado' },
  de: { lawyer: 'Anwalt', expat: 'Expat-Experte' },
  pt: { lawyer: 'advogado', expat: 'especialista em expatriação' },
  ru: { lawyer: 'адвокат', expat: 'эксперт по экспатриации' },
  ch: { lawyer: '律师', expat: '外派专家' },
  hi: { lawyer: 'वकील', expat: 'प्रवासी विशेषज्ञ' },
  ar: { lawyer: 'محامي', expat: 'خبير المغتربين' },
};

/**
 * Obtient le label du type de prestataire traduit
 */
function getProviderTypeLabel(type: 'lawyer' | 'expat', locale: string): string {
  // Normalize: 'zh' or 'zh-cn' → 'ch' (internal code)
  const normalizedLocale = locale === 'zh' || locale.startsWith('zh-') ? 'ch' : locale.split('-')[0];
  const labels = PROVIDER_TYPE_LABELS[normalizedLocale] || PROVIDER_TYPE_LABELS[locale] || PROVIDER_TYPE_LABELS['en'];
  return labels[type];
}

/**
 * Obtient les pronoms selon le genre (par défaut neutre/masculin)
 */
function getPronouns(locale: string): {
  pronounHe: string;
  pronounHis: string;
  pronounIs: string;
  eAgreement: string;
} {
  const pronouns: Record<string, any> = {
    fr: { pronounHe: 'Il', pronounHis: 'Ses', pronounIs: 'est', eAgreement: '' },
    en: { pronounHe: 'He', pronounHis: 'His', pronounIs: 'is', eAgreement: '' },
    es: { pronounHe: 'Él', pronounHis: 'Sus', pronounIs: 'está', eAgreement: 'o' },
    de: { pronounHe: 'Er', pronounHis: 'Seine', pronounIs: 'ist', eAgreement: '' },
    pt: { pronounHe: 'Ele', pronounHis: 'Seus', pronounIs: 'está', eAgreement: '' },
    ru: { pronounHe: 'Он', pronounHis: 'Его', pronounIs: 'является', eAgreement: '' },
    ch: { pronounHe: '他', pronounHis: '他的', pronounIs: '是', eAgreement: '' },
    ar: { pronounHe: 'هو', pronounHis: 'له', pronounIs: 'يكون', eAgreement: '' },
    hi: { pronounHe: 'वे', pronounHis: 'उनके', pronounIs: 'हैं', eAgreement: '' },
  };
  // Normalize: 'zh' or 'zh-cn' → 'ch' (internal code)
  const normalizedLocale = locale === 'zh' || locale.startsWith('zh-') ? 'ch' : locale.split('-')[0];
  return pronouns[normalizedLocale] || pronouns[locale] || pronouns['en'];
}

/**
 * Remplace les placeholders dans un template
 */
function replacePlaceholders(
  template: string,
  provider: SnippetProvider,
  locale: string,
  additionalVars: Record<string, string> = {}
): string {
  const name = formatPublicName(provider);
  const country = getCountryName(provider.country, locale as any);
  const pronouns = getPronouns(locale);
  
  const title = getProviderTypeLabel(provider.type, locale);
  
  const languages = provider.languages.join(', ');
  
  // ✅ CORRECTION BUG 3 : Traduire les codes en labels (avec mapping camelCase → SCREAMING_SNAKE_CASE)
  const mappedLocale = mapLanguageToLocale(locale);
  const specialties = (provider.specialties || [])
    .map(code => getSpecialtyLabel(code, mappedLocale))
    .join(', ');

  const helpTypes = (provider.helpTypes || [])
    .map(code => getExpatHelpTypeLabel(code.toUpperCase(), locale as any))
    .join(', ');
  
  const years = provider.yearsAsExpat || provider.yearsOfExperience || 0;
  const rating = provider.rating || 5.0; // 5.0 par défaut si pas d'avis
  const reviewCount = provider.reviewCount || 0;
  const successRate = provider.successRate || 100; // 100% par défaut pour profils AAA
  const calls = provider.totalCalls || 0;
  const cityInfo = provider.city ? ` (${provider.city})` : '';
  
  let result = template
    .replace(/{name}/g, name)
    .replace(/{country}/g, country)
    .replace(/{title}/g, title)
    .replace(/{languages}/g, languages)
    .replace(/{specialties}/g, specialties)
    .replace(/{helpTypes}/g, helpTypes)
    .replace(/{years}/g, String(years))
    .replace(/{rating}/g, String(rating.toFixed(1)))
    .replace(/{reviewCount}/g, String(reviewCount))
    .replace(/{successRate}/g, String(successRate))
    .replace(/{calls}/g, String(calls))
    .replace(/{cityInfo}/g, cityInfo)
    .replace(/{pronounHe}/g, pronouns.pronounHe)
    .replace(/{pronounHis}/g, pronouns.pronounHis)
    .replace(/{pronounIs}/g, pronouns.pronounIs)
    .replace(/{eAgreement}/g, pronouns.eAgreement);
  
  // Remplacer les variables additionnelles
  Object.keys(additionalVars).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), additionalVars[key]);
  });
  
  return result;
}

// ==========================================
// 🎯 GÉNÉRATION DES SNIPPETS
// ==========================================

/**
 * Génère tous les snippets optimisés pour un prestataire
 */
export function generateSnippets(
  provider: SnippetProvider,
  config: SnippetConfig
): GeneratedSnippet {
  const { locale, includePrice = true, includeFAQ = true, priceEur } = config;
  
  const rawLang = locale.split('-')[0];
  // Normalize: 'zh' (ISO standard in URLs) → 'ch' (internal code used in FAQ_TEMPLATES)
  const baseLang = rawLang === 'zh' ? 'ch' : rawLang;
  const templates = FAQ_TEMPLATES[baseLang] || FAQ_TEMPLATES['en'];
  const providerTemplates = provider.type === 'lawyer' ? templates.lawyer : templates.expat;
  
  // Prix dynamique : depuis Firestore via priceEur, sinon fallback 49/19
  const fallbackPrice = provider.type === 'lawyer' ? 49 : 19;
  const resolvedPriceEur = priceEur ?? fallbackPrice;
  const dynamicPrice = `${Math.round(resolvedPriceEur)}€`;

  // Générer les FAQ
  const faqContent = providerTemplates.map(template => ({
    question: replacePlaceholders(template.question, provider, baseLang),
    answer: replacePlaceholders(template.answer, provider, baseLang, {
      price: includePrice ? dynamicPrice : 'contactez-nous'
    })
  }));
  
  // FAQPage Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqContent.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
  
  // Breadcrumb Schema — translated per language
  const name = formatPublicName(provider);
  const country = getCountryName(provider.country, baseLang as any);
  const breadcrumbTranslations: Record<string, { home: string; lawyers: string; expats: string }> = {
    fr: { home: 'Accueil', lawyers: 'Avocats', expats: 'Expatriés' },
    en: { home: 'Home', lawyers: 'Lawyers', expats: 'Expats' },
    es: { home: 'Inicio', lawyers: 'Abogados', expats: 'Expatriados' },
    de: { home: 'Startseite', lawyers: 'Anwälte', expats: 'Expats' },
    pt: { home: 'Início', lawyers: 'Advogados', expats: 'Expatriados' },
    ru: { home: 'Главная', lawyers: 'Адвокаты', expats: 'Экспаты' },
    ch: { home: '首页', lawyers: '律师', expats: '外籍专家' },
    ar: { home: 'الرئيسية', lawyers: 'محامون', expats: 'مغتربون' },
    hi: { home: 'होम', lawyers: 'वकील', expats: 'प्रवासी' },
  };
  const bcT = breadcrumbTranslations[baseLang] || breadcrumbTranslations['en'];
  const CANONICAL_LOCALES: Record<string, string> = {
    fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', ru: 'ru-ru',
    pt: 'pt-pt', ch: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
  };
  const bcLocale = CANONICAL_LOCALES[baseLang] || 'en-us';
  const ROLE_SLUGS: Record<string, Record<string, string>> = {
    lawyer: { fr: 'avocats', en: 'lawyers', es: 'abogados', de: 'anwaelte', pt: 'advogados', ru: 'advokaty', ch: 'lushi', hi: 'vakil', ar: 'muhamun' },
    expat: { fr: 'expatries', en: 'expats', es: 'expatriados', de: 'expats', pt: 'expatriados', ru: 'expaty', ch: 'haiwai', hi: 'videshi', ar: 'mughtaribun' },
  };
  const bcRoleSlug = ROLE_SLUGS[provider.type]?.[baseLang] || (provider.type === 'lawyer' ? 'lawyers' : 'expats');
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": bcT.home,
        "item": `https://sos-expat.com/${bcLocale}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": provider.type === 'lawyer' ? bcT.lawyers : bcT.expats,
        "item": `https://sos-expat.com/${bcLocale}/${bcRoleSlug}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": country,
        "item": `https://sos-expat.com/${bcLocale}/${bcRoleSlug}/${provider.country.toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": name
      }
    ]
  };
  
  // Meta Description optimisée
  const metaDescription = faqContent[0]?.answer.slice(0, 160) || '';
  
  // H1 optimisé — localisé en 9 langues
  const h1Translations: Record<string, { lawyer: string; expat: string; inWord: string }> = {
    fr: { lawyer: 'Avocat', expat: 'Expert Expatrié', inWord: 'en' },
    en: { lawyer: 'Lawyer', expat: 'Expat Expert', inWord: 'in' },
    es: { lawyer: 'Abogado', expat: 'Experto en Expatriación', inWord: 'en' },
    de: { lawyer: 'Anwalt', expat: 'Expat-Experte', inWord: 'in' },
    pt: { lawyer: 'Advogado', expat: 'Especialista em Expatriação', inWord: 'em' },
    ru: { lawyer: 'Адвокат', expat: 'Эксперт по экспатриации', inWord: 'в' },
    ch: { lawyer: '律师', expat: '外籍专家', inWord: '在' },
    ar: { lawyer: 'محامي', expat: 'خبير المغتربين', inWord: 'في' },
    hi: { lawyer: 'वकील', expat: 'प्रवासी विशेषज्ञ', inWord: 'में' },
  };
  const h1T = h1Translations[baseLang] || h1Translations['en'];
  const h1 = `${name} - ${provider.type === 'lawyer' ? h1T.lawyer : h1T.expat} ${h1T.inWord} ${country}`;

  // H2 optimisés — localisés en 9 langues
  const h2Translations: Record<string, string[]> = {
    fr: [`Spécialités de ${name}`, `Pourquoi choisir ${name} ?`, `Avis clients`, `Réserver une consultation`, `Questions fréquentes`],
    en: [`${name}'s Specialties`, `Why choose ${name}?`, `Client Reviews`, `Book a Consultation`, `Frequently Asked Questions`],
    es: [`Especialidades de ${name}`, `¿Por qué elegir a ${name}?`, `Opiniones de clientes`, `Reservar una consulta`, `Preguntas frecuentes`],
    de: [`Fachgebiete von ${name}`, `Warum ${name} wählen?`, `Kundenbewertungen`, `Beratung buchen`, `Häufig gestellte Fragen`],
    pt: [`Especialidades de ${name}`, `Por que escolher ${name}?`, `Avaliações de clientes`, `Agendar uma consulta`, `Perguntas frequentes`],
    ru: [`Специализации ${name}`, `Почему выбрать ${name}?`, `Отзывы клиентов`, `Записаться на консультацию`, `Часто задаваемые вопросы`],
    ch: [`${name}的专业领域`, `为什么选择${name}？`, `客户评价`, `预约咨询`, `常见问题`],
    ar: [`تخصصات ${name}`, `لماذا تختار ${name}؟`, `آراء العملاء`, `حجز استشارة`, `أسئلة شائعة`],
    hi: [`${name} की विशेषज्ञता`, `${name} को क्यों चुनें?`, `ग्राहक समीक्षाएं`, `परामर्श बुक करें`, `अक्सर पूछे जाने वाले प्रश्न`],
  };
  const h2List = h2Translations[baseLang] || h2Translations['en'];
  
  return {
    faqSchema,
    breadcrumbSchema,
    metaDescription,
    h1,
    h2List,
    faqContent
  };
}

/**
 * Génère le JSON-LD complet pour injection dans <head>
 */
export function generateJSONLD(provider: SnippetProvider, config: SnippetConfig): string {
  const snippets = generateSnippets(provider, config);
  
  const jsonLDArray = [
    snippets.faqSchema,
    snippets.breadcrumbSchema
  ];
  
  return JSON.stringify(jsonLDArray);
}
#!/usr/bin/env node
/**
 * Script pour ajouter les 24 clés manquantes de la section profiles d'Influencer
 */

const fs = require('fs');
const path = require('path');

const translationDir = path.join(__dirname, '../src/helper');
const languages = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

// ==========================================
// INFLUENCER PROFILES - 24 CLÉS
// ==========================================
const influencerProfilesKeys = {
  // YouTuber
  "influencer.profiles.youtuber.title": {
    fr: "YouTuber Expatrié",
    en: "Expat YouTuber",
    es: "YouTuber Expatriado",
    de: "Expat-YouTuber",
    pt: "YouTuber Expatriado",
    ru: "YouTube-блогер Экспат",
    ch: "外派YouTuber",
    hi: "प्रवासी YouTuber",
    ar: "يوتيوبر مغترب"
  },
  "influencer.profiles.youtuber.desc": {
    fr: "Créez des vidéos sur la vie à l'étranger, conseils pratiques, démarches administratives",
    en: "Create videos about life abroad, practical tips, administrative procedures",
    es: "Cree videos sobre la vida en el extranjero, consejos prácticos, trámites administrativos",
    de: "Erstellen Sie Videos über das Leben im Ausland, praktische Tipps, Verwaltungsverfahren",
    pt: "Crie vídeos sobre a vida no exterior, dicas práticas, procedimentos administrativos",
    ru: "Создавайте видео о жизни за границей, практических советах, административных процедурах",
    ch: "制作关于海外生活、实用技巧、行政程序的视频",
    hi: "विदेश में जीवन, व्यावहारिक सुझाव, प्रशासनिक प्रक्रियाओं के बारे में वीडियो बनाएं",
    ar: "أنشئ مقاطع فيديو حول الحياة في الخارج والنصائح العملية والإجراءات الإدارية"
  },

  // Expat Vlogger
  "influencer.profiles.expatvlogger.title": {
    fr: "Vlogger Voyage & Expat",
    en: "Travel & Expat Vlogger",
    es: "Vlogger de Viajes y Expatriados",
    de: "Reise- & Expat-Vlogger",
    pt: "Vlogger de Viagens e Expatriados",
    ru: "Тревел и Экспат-Влогер",
    ch: "旅行和外派视频博主",
    hi: "यात्रा और प्रवासी व्लॉगर",
    ar: "مدون فيديو السفر والمغتربين"
  },
  "influencer.profiles.expatvlogger.desc": {
    fr: "Partagez votre expérience d'expatriation, vos voyages et découvertes culturelles",
    en: "Share your expat experience, travels and cultural discoveries",
    es: "Comparta su experiencia de expatriación, viajes y descubrimientos culturales",
    de: "Teilen Sie Ihre Expat-Erfahrung, Reisen und kulturellen Entdeckungen",
    pt: "Compartilhe sua experiência de expatriação, viagens e descobertas culturais",
    ru: "Делитесь своим опытом экспата, путешествиями и культурными открытиями",
    ch: "分享您的外派经历、旅行和文化发现",
    hi: "अपने प्रवासी अनुभव, यात्राओं और सांस्कृतिक खोजों को साझा करें",
    ar: "شارك تجربتك في الاغتراب ورحلاتك واكتشافاتك الثقافية"
  },

  // Nomad
  "influencer.profiles.nomad.title": {
    fr: "Digital Nomad",
    en: "Digital Nomad",
    es: "Nómada Digital",
    de: "Digitaler Nomade",
    pt: "Nômade Digital",
    ru: "Цифровой Кочевник",
    ch: "数字游民",
    hi: "डिजिटल खानाबदोश",
    ar: "الرحال الرقمي"
  },
  "influencer.profiles.nomad.desc": {
    fr: "Conseils pour travailler en remote, visas nomade digital, meilleures destinations",
    en: "Tips for remote work, digital nomad visas, best destinations",
    es: "Consejos para trabajar en remoto, visas de nómada digital, mejores destinos",
    de: "Tipps für Remote-Arbeit, Digital-Nomaden-Visa, beste Reiseziele",
    pt: "Dicas para trabalho remoto, vistos de nômade digital, melhores destinos",
    ru: "Советы по удаленной работе, визы цифрового кочевника, лучшие направления",
    ch: "远程工作技巧、数字游民签证、最佳目的地",
    hi: "रिमोट कार्य के लिए सुझाव, डिजिटल खानाबदोश वीजा, सर्वोत्तम गंतव्य",
    ar: "نصائح للعمل عن بُعد، تأشيرات الرحال الرقمي، أفضل الوجهات"
  },

  // Photographer
  "influencer.profiles.photographer.title": {
    fr: "Photographe Voyageur",
    en: "Travel Photographer",
    es: "Fotógrafo Viajero",
    de: "Reisefotograf",
    pt: "Fotógrafo Viajante",
    ru: "Фотограф-Путешественник",
    ch: "旅行摄影师",
    hi: "यात्रा फोटोग्राफर",
    ar: "مصور السفر"
  },
  "influencer.profiles.photographer.desc": {
    fr: "Capturez la vie à l'étranger en photos et partagez les coulisses de l'expatriation",
    en: "Capture life abroad in photos and share the behind-the-scenes of expat life",
    es: "Capture la vida en el extranjero en fotos y comparta los detrás de escena de la expatriación",
    de: "Halten Sie das Leben im Ausland in Fotos fest und teilen Sie die Hintergründe des Expat-Lebens",
    pt: "Capture a vida no exterior em fotos e compartilhe os bastidores da expatriação",
    ru: "Запечатлейте жизнь за границей на фотографиях и поделитесь закулисьем жизни экспата",
    ch: "用照片捕捉海外生活，分享外派生活的幕后故事",
    hi: "विदेश में जीवन को तस्वीरों में कैद करें और प्रवासी जीवन के पर्दे के पीछे साझा करें",
    ar: "التقط الحياة في الخارج في الصور وشارك ما وراء الكواليس لحياة المغتربين"
  },

  // Advisor
  "influencer.profiles.advisor.title": {
    fr: "Conseiller Expatriation",
    en: "Expat Advisor",
    es: "Asesor de Expatriación",
    de: "Expat-Berater",
    pt: "Consultor de Expatriação",
    ru: "Консультант по Экспатриации",
    ch: "外派顾问",
    hi: "प्रवासी सलाहकार",
    ar: "مستشار الاغتراب"
  },
  "influencer.profiles.advisor.desc": {
    fr: "Guides pratiques, tutoriels administratifs, conseils juridiques pour expatriés",
    en: "Practical guides, administrative tutorials, legal advice for expats",
    es: "Guías prácticas, tutoriales administrativos, consejos legales para expatriados",
    de: "Praktische Anleitungen, Verwaltungstutorials, Rechtsberatung für Expats",
    pt: "Guias práticos, tutoriais administrativos, conselhos jurídicos para expatriados",
    ru: "Практические руководства, административные учебники, юридические консультации для экспатов",
    ch: "实用指南、行政教程、外派人员法律建议",
    hi: "व्यावहारिक मार्गदर्शिकाएँ, प्रशासनिक ट्यूटोरियल, प्रवासियों के लिए कानूनी सलाह",
    ar: "أدلة عملية، دروس إدارية، مشورة قانونية للمغتربين"
  },

  // Lifestyle
  "influencer.profiles.lifestyle.title": {
    fr: "Lifestyle à l'Étranger",
    en: "Lifestyle Abroad",
    es: "Estilo de Vida en el Extranjero",
    de: "Lifestyle im Ausland",
    pt: "Estilo de Vida no Exterior",
    ru: "Образ Жизни за Границей",
    ch: "海外生活方式",
    hi: "विदेश में जीवनशैली",
    ar: "نمط الحياة في الخارج"
  },
  "influencer.profiles.lifestyle.desc": {
    fr: "Mode de vie, culture locale, gastronomie, bons plans pour vivre à l'étranger",
    en: "Lifestyle, local culture, gastronomy, tips for living abroad",
    es: "Estilo de vida, cultura local, gastronomía, consejos para vivir en el extranjero",
    de: "Lebensstil, lokale Kultur, Gastronomie, Tipps für das Leben im Ausland",
    pt: "Estilo de vida, cultura local, gastronomia, dicas para viver no exterior",
    ru: "Образ жизни, местная культура, гастрономия, советы по жизни за границей",
    ch: "生活方式、当地文化、美食、海外生活技巧",
    hi: "जीवनशैली, स्थानीय संस्कृति, गैस्ट्रोनॉमी, विदेश में रहने के लिए सुझाव",
    ar: "نمط الحياة، الثقافة المحلية، فن الطهي، نصائح للعيش في الخارج"
  },

  // Country
  "influencer.profiles.country.title": {
    fr: "Expert Pays Spécifique",
    en: "Country-Specific Expert",
    es: "Experto en País Específico",
    de: "Länderspezifischer Experte",
    pt: "Especialista em País Específico",
    ru: "Эксперт по Конкретной Стране",
    ch: "特定国家专家",
    hi: "विशिष्ट देश विशेषज्ञ",
    ar: "خبير في بلد معين"
  },
  "influencer.profiles.country.desc": {
    fr: "Spécialisé sur un pays (Thaïlande, Espagne, Portugal, Dubaï...), ses lois et démarches",
    en: "Specialized in one country (Thailand, Spain, Portugal, Dubai...), its laws and procedures",
    es: "Especializado en un país (Tailandia, España, Portugal, Dubái...), sus leyes y trámites",
    de: "Spezialisiert auf ein Land (Thailand, Spanien, Portugal, Dubai...), seine Gesetze und Verfahren",
    pt: "Especializado em um país (Tailândia, Espanha, Portugal, Dubai...), suas leis e procedimentos",
    ru: "Специализируется на одной стране (Таиланд, Испания, Португалия, Дубай...), ее законах и процедурах",
    ch: "专门研究一个国家（泰国、西班牙、葡萄牙、迪拜...）的法律和程序",
    hi: "एक देश (थाईलैंड, स्पेन, पुर्तगाल, दुबई...) में विशेषज्ञ, इसके कानून और प्रक्रियाएं",
    ar: "متخصص في بلد واحد (تايلاند، إسبانيا، البرتغال، دبي...)، قوانينه وإجراءاته"
  },

  // Micro
  "influencer.profiles.micro.title": {
    fr: "Micro-Influenceur Engagé",
    en: "Engaged Micro-Influencer",
    es: "Micro-Influencer Comprometido",
    de: "Engagierter Mikro-Influencer",
    pt: "Micro-Influenciador Engajado",
    ru: "Вовлеченный Микро-Инфлюенсер",
    ch: "参与度高的微型网红",
    hi: "संलग्न सूक्ष्म-प्रभावशाली",
    ar: "مؤثر صغير ملتزم"
  },
  "influencer.profiles.micro.desc": {
    fr: "Petite communauté mais très engagée sur le thème de l'expatriation",
    en: "Small but highly engaged community on the expat theme",
    es: "Pequeña pero muy comprometida comunidad sobre el tema de la expatriación",
    de: "Kleine, aber sehr engagierte Community zum Expat-Thema",
    pt: "Comunidade pequena mas muito engajada no tema de expatriação",
    ru: "Небольшое, но очень вовлеченное сообщество на тему экспатов",
    ch: "关于外派主题的小型但高度参与的社区",
    hi: "प्रवासी विषय पर छोटा लेकिन अत्यधिक संलग्न समुदाय",
    ar: "مجتمع صغير ولكن شديد الالتزام حول موضوع الاغتراب"
  },

  // Why sections
  "influencer.profiles.why1.title": {
    fr: "Problèmes Juridiques Urgents",
    en: "Urgent Legal Issues",
    es: "Problemas Legales Urgentes",
    de: "Dringende Rechtsfragen",
    pt: "Problemas Jurídicos Urgentes",
    ru: "Срочные Юридические Вопросы",
    ch: "紧急法律问题",
    hi: "तत्काल कानूनी मुद्दे",
    ar: "قضايا قانونية عاجلة"
  },
  "influencer.profiles.why1.desc": {
    fr: "Visa refusé, expulsion, problème avec la police locale, accident... Vos followers ont besoin d'aide juridique rapide.",
    en: "Visa denied, deportation, issue with local police, accident... Your followers need quick legal help.",
    es: "Visa denegada, expulsión, problema con la policía local, accidente... Sus seguidores necesitan ayuda legal rápida.",
    de: "Visum abgelehnt, Abschiebung, Problem mit der örtlichen Polizei, Unfall... Ihre Follower brauchen schnelle Rechtshilfe.",
    pt: "Visto negado, deportação, problema com a polícia local, acidente... Seus seguidores precisam de ajuda jurídica rápida.",
    ru: "Отказ в визе, депортация, проблемы с местной полицией, несчастный случай... Вашим подписчикам нужна быстрая юридическая помощь.",
    ch: "签证被拒、驱逐出境、与当地警察的问题、事故...您的关注者需要快速法律帮助。",
    hi: "वीजा अस्वीकृत, निर्वासन, स्थानीय पुलिस के साथ समस्या, दुर्घटना... आपके फॉलोअर्स को त्वरित कानूनी सहायता की आवश्यकता है।",
    ar: "رفض التأشيرة، الترحيل، مشكلة مع الشرطة المحلية، حادث... يحتاج متابعوك إلى مساعدة قانونية سريعة."
  },

  "influencer.profiles.why2.title": {
    fr: "Procédures Complexes",
    en: "Complex Procedures",
    es: "Procedimientos Complejos",
    de: "Komplexe Verfahren",
    pt: "Procedimentos Complexos",
    ru: "Сложные Процедуры",
    ch: "复杂程序",
    hi: "जटिल प्रक्रियाएं",
    ar: "إجراءات معقدة"
  },
  "influencer.profiles.why2.desc": {
    fr: "Permis de résidence, création d'entreprise, achat immobilier à l'étranger... Un avocat local simplifie tout.",
    en: "Residence permit, business creation, real estate purchase abroad... A local lawyer simplifies everything.",
    es: "Permiso de residencia, creación de empresa, compra de inmuebles en el extranjero... Un abogado local lo simplifica todo.",
    de: "Aufenthaltserlaubnis, Unternehmensgründung, Immobilienkauf im Ausland... Ein lokaler Anwalt vereinfacht alles.",
    pt: "Permissão de residência, criação de empresa, compra de imóveis no exterior... Um advogado local simplifica tudo.",
    ru: "Вид на жительство, создание бизнеса, покупка недвижимости за границей... Местный адвокат упрощает все.",
    ch: "居留许可、创业、海外房地产购买...当地律师简化一切。",
    hi: "निवास परमिट, व्यवसाय निर्माण, विदेश में अचल संपत्ति खरीद... एक स्थानीय वकील सब कुछ सरल बनाता है।",
    ar: "تصريح الإقامة، إنشاء الأعمال، شراء العقارات في الخارج... محامٍ محلي يبسط كل شيء."
  },

  "influencer.profiles.why3.title": {
    fr: "Langue & Culture Locales",
    en: "Local Language & Culture",
    es: "Idioma y Cultura Locales",
    de: "Lokale Sprache & Kultur",
    pt: "Idioma e Cultura Locais",
    ru: "Местный Язык и Культура",
    ch: "当地语言和文化",
    hi: "स्थानीय भाषा और संस्कृति",
    ar: "اللغة والثقافة المحلية"
  },
  "influencer.profiles.why3.desc": {
    fr: "Barrière linguistique, incompréhension culturelle... Un avocat bilingue qui connaît les deux systèmes est indispensable.",
    en: "Language barrier, cultural misunderstanding... A bilingual lawyer who knows both systems is essential.",
    es: "Barrera del idioma, malentendido cultural... Un abogado bilingüe que conozca ambos sistemas es esencial.",
    de: "Sprachbarriere, kulturelles Missverständnis... Ein zweisprachiger Anwalt, der beide Systeme kennt, ist unerlässlich.",
    pt: "Barreira linguística, mal-entendido cultural... Um advogado bilíngue que conhece ambos os sistemas é essencial.",
    ru: "Языковой барьер, культурное недопонимание... Двуязычный адвокат, знающий обе системы, необходим.",
    ch: "语言障碍、文化误解...了解两种系统的双语律师至关重要。",
    hi: "भाषा बाधा, सांस्कृतिक गलतफहमी... दोनों प्रणालियों को जानने वाला द्विभाषी वकील आवश्यक है।",
    ar: "حاجز اللغة، سوء الفهم الثقافي... المحامي ثنائي اللغة الذي يعرف النظامين ضروري."
  },

  "influencer.profiles.why4.title": {
    fr: "Économie de Temps & Argent",
    en: "Save Time & Money",
    es: "Ahorro de Tiempo y Dinero",
    de: "Zeit & Geld Sparen",
    pt: "Economia de Tempo e Dinheiro",
    ru: "Экономия Времени и Денег",
    ch: "节省时间和金钱",
    hi: "समय और धन की बचत",
    ar: "توفير الوقت والمال"
  },
  "influencer.profiles.why4.desc": {
    fr: "Éviter les erreurs coûteuses, les refus de visa, les amendes... Un bon conseil juridique coûte moins cher qu'un problème.",
    en: "Avoid costly mistakes, visa rejections, fines... Good legal advice costs less than a problem.",
    es: "Evite errores costosos, rechazos de visa, multas... Un buen consejo legal cuesta menos que un problema.",
    de: "Vermeiden Sie kostspielige Fehler, Visa-Ablehnungen, Bußgelder... Gute Rechtsberatung kostet weniger als ein Problem.",
    pt: "Evite erros caros, rejeições de visto, multas... Um bom conselho jurídico custa menos do que um problema.",
    ru: "Избегайте дорогостоящих ошибок, отказов в визе, штрафов... Хороший юридический совет стоит меньше, чем проблема.",
    ch: "避免代价高昂的错误、签证拒签、罚款...好的法律建议比问题便宜。",
    hi: "महंगी गलतियों, वीजा अस्वीकृति, जुर्माने से बचें... अच्छी कानूनी सलाह समस्या से कम खर्चीली होती है।",
    ar: "تجنب الأخطاء المكلفة، رفض التأشيرات، الغرامات... المشورة القانونية الجيدة تكلف أقل من المشكلة."
  }
};

// ==========================================
// FONCTION PRINCIPALE
// ==========================================
function addInfluencerProfilesTranslations() {
  console.log('🔧 Ajout des 24 clés manquantes de la section Influencer Profiles...\n');

  let totalAdded = 0;

  languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const translations = JSON.parse(content);

      let added = 0;

      Object.entries(influencerProfilesKeys).forEach(([key, values]) => {
        if (!translations[key]) {
          translations[key] = values[lang];
          added++;
        }
      });

      fs.writeFileSync(
        filePath,
        JSON.stringify(translations, null, 2) + '\n',
        'utf8'
      );

      console.log(`✅ ${lang.toUpperCase()}: ${added} clés ajoutées`);
      totalAdded += added;

    } catch (error) {
      console.error(`❌ Erreur pour ${lang}.json:`, error.message);
    }
  });

  console.log(`\n✨ Total: ${totalAdded} clés ajoutées`);
  console.log('📦 Influencer Profiles: 8 types de profils × 2 (title + desc) = 16 clés');
  console.log('📦 Influencer Why: 4 raisons × 2 (title + desc) = 8 clés');
  console.log('📦 TOTAL: 24 clés × 9 langues = 216 traductions');
}

addInfluencerProfilesTranslations();

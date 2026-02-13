/**
 * FIX Blogger Landing - VOYAGEURS (pas juste expats)
 * Élargir de "expats" à "voyageurs/vacanciers"
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = {
  fr: {
    'blogger.landing.value.subtitle': 'Vous ne vendez pas, vous AIDEZ. Vos articles guident les voyageurs dans leurs galères à l\'étranger.',

    'blogger.landing.value.problem1.title': 'Perdu dans un pays étranger',
    'blogger.landing.value.problem1.desc': 'Voyageur/vacancier perdu : visa touristique, logement, transport, urgence médicale...',

    'blogger.landing.value.problem2.title': 'Urgence voyage - stress maximum',
    'blogger.landing.value.problem2.desc': 'Lecteur en vacances : problème visa, vol annulé, besoin aide juridique urgente.',

    'blogger.landing.value.problem3.title': 'Voyage solo - besoin conseils',
    'blogger.landing.value.problem3.desc': 'Voyageur seul, première fois à l\'étranger, besoin conseils pratiques et sécurité.',

    'blogger.landing.value.problem4.title': 'Budget voyage serré',
    'blogger.landing.value.problem4.desc': 'Voyageur besoin aide pro (avocat/guide) mais budget vacances limité.',

    'blogger.landing.value.winwin.desc': 'Chaque voyageur aidé = problème résolu + infos gratuites + 5$ économisés + 10$ gagnés pour vous. Tout le monde gagne.',
  },
  en: {
    'blogger.landing.value.subtitle': 'You don\'t sell, you HELP. Your articles guide travelers through their struggles abroad.',

    'blogger.landing.value.problem1.title': 'Lost in foreign country',
    'blogger.landing.value.problem1.desc': 'Traveler/vacationer lost: tourist visa, accommodation, transport, medical emergency...',

    'blogger.landing.value.problem2.title': 'Travel emergency - maximum stress',
    'blogger.landing.value.problem2.desc': 'Reader on vacation: visa problem, flight canceled, needs urgent legal help.',

    'blogger.landing.value.problem3.title': 'Solo travel - needs advice',
    'blogger.landing.value.problem3.desc': 'Solo traveler, first time abroad, needs practical tips and safety advice.',

    'blogger.landing.value.problem4.title': 'Travel budget tight',
    'blogger.landing.value.problem4.desc': 'Traveler needs pro help (lawyer/guide) but vacation budget limited.',

    'blogger.landing.value.winwin.desc': 'Each traveler helped = problem solved + free info + $5 saved + $10 earned for you. Everyone wins.',
  },
  es: {
    'blogger.landing.value.subtitle': 'No vendes, AYUDAS. Tus artículos guían a los viajeros en sus problemas en el extranjero.',

    'blogger.landing.value.problem1.title': 'Perdido en país extranjero',
    'blogger.landing.value.problem1.desc': 'Viajero/vacacionista perdido: visa turística, alojamiento, transporte, emergencia médica...',

    'blogger.landing.value.problem2.title': 'Emergencia de viaje - estrés máximo',
    'blogger.landing.value.problem2.desc': 'Lector de vacaciones: problema de visa, vuelo cancelado, necesita ayuda legal urgente.',

    'blogger.landing.value.problem3.title': 'Viaje solo - necesita consejos',
    'blogger.landing.value.problem3.desc': 'Viajero solo, primera vez en el extranjero, necesita consejos prácticos y seguridad.',

    'blogger.landing.value.problem4.title': 'Presupuesto de viaje ajustado',
    'blogger.landing.value.problem4.desc': 'Viajero necesita ayuda profesional (abogado/guía) pero presupuesto de vacaciones limitado.',

    'blogger.landing.value.winwin.desc': 'Cada viajero ayudado = problema resuelto + info gratis + 5$ ahorrados + 10$ ganados para ti. Todos ganan.',
  },
  de: {
    'blogger.landing.value.subtitle': 'Sie verkaufen nicht, Sie HELFEN. Ihre Artikel führen Reisende durch ihre Probleme im Ausland.',

    'blogger.landing.value.problem1.title': 'Verloren im Ausland',
    'blogger.landing.value.problem1.desc': 'Reisender/Urlauber verloren: Touristenvisum, Unterkunft, Transport, medizinischer Notfall...',

    'blogger.landing.value.problem2.title': 'Reisenotfall - maximaler Stress',
    'blogger.landing.value.problem2.desc': 'Leser im Urlaub: Visumproblem, Flug storniert, braucht dringende Rechtshilfe.',

    'blogger.landing.value.problem3.title': 'Alleinreise - braucht Rat',
    'blogger.landing.value.problem3.desc': 'Alleinreisender, erstes Mal im Ausland, braucht praktische Tipps und Sicherheit.',

    'blogger.landing.value.problem4.title': 'Reisebudget knapp',
    'blogger.landing.value.problem4.desc': 'Reisender braucht professionelle Hilfe (Anwalt/Führer) aber Urlaubsbudget begrenzt.',

    'blogger.landing.value.winwin.desc': 'Jeder geholfen Reisende = Problem gelöst + kostenlose Infos + 5$ gespart + 10$ für Sie verdient. Alle gewinnen.',
  },
  pt: {
    'blogger.landing.value.subtitle': 'Você não vende, AJUDA. Seus artigos guiam os viajantes em seus problemas no exterior.',

    'blogger.landing.value.problem1.title': 'Perdido em país estrangeiro',
    'blogger.landing.value.problem1.desc': 'Viajante/turista perdido: visto turístico, acomodação, transporte, emergência médica...',

    'blogger.landing.value.problem2.title': 'Emergência de viagem - estresse máximo',
    'blogger.landing.value.problem2.desc': 'Leitor de férias: problema de visto, voo cancelado, precisa ajuda jurídica urgente.',

    'blogger.landing.value.problem3.title': 'Viagem solo - precisa conselhos',
    'blogger.landing.value.problem3.desc': 'Viajante sozinho, primeira vez no exterior, precisa dicas práticas e segurança.',

    'blogger.landing.value.problem4.title': 'Orçamento de viagem apertado',
    'blogger.landing.value.problem4.desc': 'Viajante precisa ajuda profissional (advogado/guia) mas orçamento de férias limitado.',

    'blogger.landing.value.winwin.desc': 'Cada viajante ajudado = problema resolvido + info grátis + 5$ economizados + 10$ ganhos para você. Todos ganham.',
  },
  ru: {
    'blogger.landing.value.subtitle': 'Вы не продаете, вы ПОМОГАЕТЕ. Ваши статьи ведут путешественников через их трудности за границей.',

    'blogger.landing.value.problem1.title': 'Потерян в чужой стране',
    'blogger.landing.value.problem1.desc': 'Путешественник/отдыхающий потерян: туристическая виза, жилье, транспорт, медицинская срочность...',

    'blogger.landing.value.problem2.title': 'Срочность в путешествии - максимальный стресс',
    'blogger.landing.value.problem2.desc': 'Читатель в отпуске: проблема с визой, рейс отменен, нужна срочная юридическая помощь.',

    'blogger.landing.value.problem3.title': 'Сольное путешествие - нужен совет',
    'blogger.landing.value.problem3.desc': 'Одинокий путешественник, первый раз за границей, нужны практические советы и безопасность.',

    'blogger.landing.value.problem4.title': 'Бюджет путешествия ограничен',
    'blogger.landing.value.problem4.desc': 'Путешественнику нужна профессиональная помощь (юрист/гид), но бюджет отпуска ограничен.',

    'blogger.landing.value.winwin.desc': 'Каждый помощь путешественнику = проблема решена + бесплатная информация + 5$ сэкономлено + 10$ заработано для вас. Все выигрывают.',
  },
  ch: {
    'blogger.landing.value.subtitle': '您不是在销售，而是在帮助。您的文章引导旅行者度过国外的困难。',

    'blogger.landing.value.problem1.title': '在外国迷失',
    'blogger.landing.value.problem1.desc': '旅行者/度假者迷失：旅游签证、住宿、交通、医疗紧急情况...',

    'blogger.landing.value.problem2.title': '旅行紧急情况 - 极度压力',
    'blogger.landing.value.problem2.desc': '度假中的读者：签证问题、航班取消、需要紧急法律帮助。',

    'blogger.landing.value.problem3.title': '独自旅行 - 需要建议',
    'blogger.landing.value.problem3.desc': '独自旅行者，第一次出国，需要实用建议和安全。',

    'blogger.landing.value.problem4.title': '旅行预算紧张',
    'blogger.landing.value.problem4.desc': '旅行者需要专业帮助（律师/导游）但假期预算有限。',

    'blogger.landing.value.winwin.desc': '每个得到帮助的旅行者=问题解决+免费信息+节省5美元+为您赚取10美元。每个人都赢了。',
  },
  hi: {
    'blogger.landing.value.subtitle': 'आप बेचते नहीं हैं, आप मदद करते हैं। आपके लेख विदेश में यात्रियों की समस्याओं में मार्गदर्शन करते हैं।',

    'blogger.landing.value.problem1.title': 'विदेश में खोया',
    'blogger.landing.value.problem1.desc': 'यात्री/छुट्टियां मनाने वाला खोया: पर्यटक वीजा, आवास, परिवहन, चिकित्सा आपातकाल...',

    'blogger.landing.value.problem2.title': 'यात्रा आपातकाल - अधिकतम तनाव',
    'blogger.landing.value.problem2.desc': 'छुट्टी पर पाठक: वीजा समस्या, उड़ान रद्द, तत्काल कानूनी सहायता की जरूरत।',

    'blogger.landing.value.problem3.title': 'एकल यात्रा - सलाह चाहिए',
    'blogger.landing.value.problem3.desc': 'एकल यात्री, पहली बार विदेश में, व्यावहारिक सुझाव और सुरक्षा चाहिए।',

    'blogger.landing.value.problem4.title': 'यात्रा बजट तंग',
    'blogger.landing.value.problem4.desc': 'यात्री को पेशेवर सहायता (वकील/गाइड) चाहिए लेकिन छुट्टी का बजट सीमित।',

    'blogger.landing.value.winwin.desc': 'प्रत्येक यात्री की मदद = समस्या हल + मुफ्त जानकारी + 5$ बचत + आपके लिए 10$ कमाई। सभी जीतते हैं।',
  },
  ar: {
    'blogger.landing.value.subtitle': 'أنت لا تبيع، أنت تساعد. مقالاتك توجه المسافرين خلال مشاكلهم في الخارج.',

    'blogger.landing.value.problem1.title': 'ضائع في بلد أجنبي',
    'blogger.landing.value.problem1.desc': 'مسافر/سائح ضائع: تأشيرة سياحية، سكن، نقل، طارئ طبي...',

    'blogger.landing.value.problem2.title': 'طارئ سفر - ضغط أقصى',
    'blogger.landing.value.problem2.desc': 'قارئ في إجازة: مشكلة تأشيرة، رحلة ملغاة، يحتاج مساعدة قانونية عاجلة.',

    'blogger.landing.value.problem3.title': 'سفر منفرد - يحتاج نصيحة',
    'blogger.landing.value.problem3.desc': 'مسافر منفرد، أول مرة في الخارج، يحتاج نصائح عملية وأمان.',

    'blogger.landing.value.problem4.title': 'ميزانية السفر ضيقة',
    'blogger.landing.value.problem4.desc': 'مسافر يحتاج مساعدة محترفة (محامي/مرشد) لكن ميزانية الإجازة محدودة.',

    'blogger.landing.value.winwin.desc': 'كل مسافر تمت مساعدته = مشكلة محلولة + معلومات مجانية + 5$ موفرة + 10$ مكتسبة لك. الجميع يفوز.',
  },
};

const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

function updateTranslations() {
  let totalUpdated = 0;
  const errors = [];

  for (const lang of LANGUAGES) {
    const filePath = path.join(__dirname, '..', 'src', 'helper', `${lang}.json`);

    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const updated = { ...existing, ...TRANSLATIONS[lang] };
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

      const updatedCount = Object.keys(TRANSLATIONS[lang]).length;
      totalUpdated += updatedCount;
      console.log(`✅ ${lang.toUpperCase()}: Updated ${updatedCount} keys`);
    } catch (error) {
      const msg = `❌ ${lang.toUpperCase()}: ${error.message}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log(`\n📊 Summary: Updated ${totalUpdated} translation keys across ${LANGUAGES.length} languages`);

  if (errors.length > 0) {
    console.error(`\n⚠️ Errors occurred:\n${errors.join('\n')}`);
    process.exit(1);
  }

  console.log('\n✅ All translations updated successfully!');
}

updateTranslations();

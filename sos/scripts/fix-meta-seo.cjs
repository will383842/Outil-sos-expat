const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const HTML_DIR = 'C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/communiqués de presse/SOS-Expat_HTML_27fichiers/press_kit_html';
const sa = require('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/serviceAccount.json');
admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: 'sos-urgently-ac307.firebasestorage.app' });
const bucket = admin.storage().bucket();
const db = admin.firestore();

const TITLES = {
  CP1: {
    FR: 'SOS-Expat.com — Communiqué de Presse — Grand Public & Médias',
    EN: 'SOS-Expat.com — Press Release — General Public & Media',
    ES: 'SOS-Expat.com — Comunicado de Prensa — Público General & Medios',
    DE: 'SOS-Expat.com — Pressemitteilung — Allgemeine Öffentlichkeit & Medien',
    PT: 'SOS-Expat.com — Comunicado de Imprensa — Grande Público & Média',
    RU: 'SOS-Expat.com — Пресс-релиз — Общественность и СМИ',
    ZH: 'SOS-Expat.com — 新闻稿 — 大众与媒体',
    HI: 'SOS-Expat.com — प्रेस विज्ञप्ति — आम जनता और मीडिया',
    AR: 'SOS-Expat.com — بيان صحفي — الجمهور العام والإعلام',
  },
  CP2: {
    FR: 'SOS-Expat.com — Communiqué de Presse — Économie & Innovation',
    EN: 'SOS-Expat.com — Press Release — Economy & Innovation',
    ES: 'SOS-Expat.com — Comunicado de Prensa — Economía & Innovación',
    DE: 'SOS-Expat.com — Pressemitteilung — Wirtschaft & Innovation',
    PT: 'SOS-Expat.com — Comunicado de Imprensa — Economia & Inovação',
    RU: 'SOS-Expat.com — Пресс-релиз — Экономика и Инновации',
    ZH: 'SOS-Expat.com — 新闻稿 — 经济与创新',
    HI: 'SOS-Expat.com — प्रेस विज्ञप्ति — अर्थव्यवस्था और नवाचार',
    AR: 'SOS-Expat.com — بيان صحفي — الاقتصاد والابتكار',
  },
  CP3: {
    FR: 'SOS-Expat.com — Communiqué de Presse — Partenaires',
    EN: 'SOS-Expat.com — Press Release — Partners',
    ES: 'SOS-Expat.com — Comunicado de Prensa — Socios',
    DE: 'SOS-Expat.com — Pressemitteilung — Partner',
    PT: 'SOS-Expat.com — Comunicado de Imprensa — Parceiros',
    RU: 'SOS-Expat.com — Пресс-релиз — Партнёры',
    ZH: 'SOS-Expat.com — 新闻稿 — 合作伙伴',
    HI: 'SOS-Expat.com — प्रेस विज्ञप्ति — भागीदार',
    AR: 'SOS-Expat.com — بيان صحفي — الشركاء',
  },
};

const DESCS = {
  CP1: {
    FR: 'SOS-Expat lance aide immédiate pour expatriés dans 197 pays. Connexion en moins de 5 minutes avec avocat local, dans votre langue, 24h/24.',
    EN: 'SOS-Expat launches instant help for expatriates in 197 countries. Connection in under 5 minutes with a local lawyer, in your language, 24/7.',
    ES: 'SOS-Expat lanza ayuda inmediata para expatriados en 197 países. Conexión en menos de 5 minutos con abogado local, 24/7.',
    DE: 'SOS-Expat startet Sofort-Hilfe für Expatriates in 197 Ländern. Verbindung unter 5 Minuten mit lokalem Anwalt, 24/7.',
    PT: 'SOS-Expat lança ajuda imediata para expatriados em 197 países. Ligação em menos de 5 minutos com advogado local, 24/7.',
    RU: 'SOS-Expat запускает немедленную помощь для экспатов в 197 странах. Связь за 5 минут с местным адвокатом, 24/7.',
    ZH: 'SOS-Expat在197个国家提供即时援助。5分钟内联系当地律师，全天候服务。',
    HI: 'SOS-Expat 197 देशों में तत्काल सहायता। 5 मिनट में स्थानीय वकील से संपर्क, 24/7।',
    AR: 'SOS-Expat تطلق مساعدة فورية للمغتربين في 197 دولة. تواصل في أقل من 5 دقائق مع محامٍ محلي، 24/7.',
  },
  CP2: {
    FR: 'Modèle économique SOS-Expat: commission à l appel, zéro abonnement, 304 millions d expatriés adressables. Analyse marché pour investisseurs.',
    EN: 'SOS-Expat business model: per-call commission, zero subscription, 304 million expatriates. Market analysis for investors and economic media.',
    ES: 'Modelo SOS-Expat: comisión por llamada, cero suscripción, 304 millones de expatriados. Análisis de mercado para inversores.',
    DE: 'SOS-Expat Modell: Provision pro Anruf, kein Abonnement, 304 Millionen Expatriates. Marktanalyse für Investoren.',
    PT: 'Modelo SOS-Expat: comissão por chamada, zero subscrição, 304 milhões de expatriados. Análise de mercado para investidores.',
    RU: 'Модель SOS-Expat: комиссия со звонка, нулевая подписка, 304 миллиона экспатов. Анализ рынка для инвесторов.',
    ZH: 'SOS-Expat商业模式：按通话佣金，零订阅，3.04亿海外用户。为投资者的市场分析。',
    HI: 'SOS-Expat मॉडल: प्रति कॉल कमीशन, शून्य सदस्यता, 304 मिलियन प्रवासी। निवेशकों के लिए विश्लेषण।',
    AR: 'نموذج SOS-Expat: عمولة لكل مكالمة، بدون اشتراك، 304 مليون مغترب. تحليل السوق للمستثمرين.',
  },
  CP3: {
    FR: 'SOS-Expat recrute avocats et experts dans 197 pays. Inscription gratuite, paiement immédiat, liberté totale. Vos clients vous appartiennent.',
    EN: 'SOS-Expat recruits lawyers and experts in 197 countries. Free registration, immediate payment, total freedom. Your clients belong to you.',
    ES: 'SOS-Expat recluta abogados y expertos en 197 países. Registro gratuito, pago inmediato, libertad total.',
    DE: 'SOS-Expat rekrutiert Anwälte und Experten in 197 Ländern. Kostenlose Registrierung, sofortige Zahlung, vollständige Freiheit.',
    PT: 'SOS-Expat recruta advogados e especialistas em 197 países. Registo gratuito, pagamento imediato, liberdade total.',
    RU: 'SOS-Expat набирает адвокатов и специалистов в 197 странах. Бесплатная регистрация, мгновенная оплата, полная свобода.',
    ZH: 'SOS-Expat在197个国家招募律师和专家。免费注册，即时付款，完全自由。',
    HI: 'SOS-Expat 197 देशों में वकीलों की भर्ती। निःशुल्क पंजीकरण, तत्काल भुगतान, पूर्ण स्वतंत्रता।',
    AR: 'SOS-Expat تجند محامين وخبراء في 197 دولة. تسجيل مجاني، دفع فوري، حرية كاملة.',
  },
};

const PRESS_PAGES = {
  FR:'fr-fr/presse', EN:'en-us/press', ES:'es-es/prensa', DE:'de-de/presse',
  PT:'pt-pt/imprensa', RU:'ru-ru/pressa', ZH:'zh-cn/xinwen', HI:'hi-in/press', AR:'ar-sa/sahafa',
};
const LANG_CODE = {FR:'fr',EN:'en',ES:'es',DE:'de',PT:'pt',RU:'ru',ZH:'ch',HI:'hi',AR:'ar'};
const CP_INFO = [
  { key:'CP1', prefix:'SOS-Expat_CP1_Grand_Public', id:'uikhjACKxs078QrHHyps' },
  { key:'CP2', prefix:'SOS-Expat_CP2_Economie_Innovation', id:'kEo4A0SnJPPxf7lBhXZC' },
  { key:'CP3', prefix:'SOS-Expat_CP3_Partenaires', id:'hIODtFZQYzFLhVpvEduS' },
];
const LANGS = ['FR','EN','ES','DE','PT','RU','ZH','HI','AR'];

async function main() {
  let count = 0;
  for (const cp of CP_INFO) {
    const htmlUrl = {};
    for (const lang of LANGS) {
      const langCode = LANG_CODE[lang];
      const fp = path.join(HTML_DIR, cp.prefix + '_' + lang + '.html');
      let html = fs.readFileSync(fp, 'utf8');
      const title = TITLES[cp.key][lang];
      const desc = DESCS[cp.key][lang];
      const pressUrl = 'https://sos-expat.com/' + PRESS_PAGES[lang];
      const seoBlock = [
        '<meta name="robots" content="noindex, nofollow">',
        '<meta name="description" content="' + desc + '">',
        '<link rel="canonical" href="' + pressUrl + '">',
        '<meta property="og:title" content="' + title + '">',
        '<meta property="og:description" content="' + desc + '">',
        '<meta property="og:type" content="article">',
        '<meta property="og:url" content="' + pressUrl + '">',
        '<meta property="og:image" content="https://sos-expat.com/sos-logo.webp">',
        '<meta property="og:site_name" content="SOS-Expat">',
        '<meta name="twitter:card" content="summary">',
        '<meta name="twitter:title" content="' + title + '">',
        '<meta name="twitter:description" content="' + desc + '">',
      ].join('\n');
      html = html.replace(/<title>.*?<\/title>/, '<title>' + title + '</title>');
      if (!html.includes('meta name="robots"')) {
        html = html.replace(/(<meta name="viewport"[^>]+>)/, '$1\n' + seoBlock);
      }
      fs.writeFileSync(fp, html, 'utf8');
      const file = bucket.file('press/releases/' + cp.id + '/html/' + langCode + '.html');
      await file.save(Buffer.from(html, 'utf8'), { contentType: 'text/html; charset=utf-8', metadata: { cacheControl: 'public, max-age=86400', 'x-robots-tag': 'noindex' } });
      const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2030' });
      htmlUrl[langCode] = url;
      count++;
      console.log('[' + cp.key + '/' + lang + '] title+desc+og+robots OK');
    }
    await db.collection('press_releases').doc(cp.id).update({ htmlUrl });
    console.log('  => Firestore updated for ' + cp.key);
  }
  console.log('\n✅ ' + count + '/27 fichiers mis à jour avec SEO complet');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

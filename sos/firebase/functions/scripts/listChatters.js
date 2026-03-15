/**
 * List all chatters with phone, country, and expected WhatsApp group
 * Usage: node scripts/listChatters.js
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

// ── Country → Continent mapping ──
const COUNTRY_TO_CONTINENT = {
  DZ:'AF',AO:'AF',BJ:'AF',BW:'AF',BF:'AF',BI:'AF',CV:'AF',CM:'AF',CF:'AF',TD:'AF',KM:'AF',CG:'AF',CD:'AF',CI:'AF',
  DJ:'AF',EG:'AF',GQ:'AF',ER:'AF',SZ:'AF',ET:'AF',GA:'AF',GM:'AF',GH:'AF',GN:'AF',GW:'AF',KE:'AF',LS:'AF',LR:'AF',
  LY:'AF',MG:'AF',MW:'AF',ML:'AF',MR:'AF',MU:'AF',MA:'AF',MZ:'AF',NA:'AF',NE:'AF',NG:'AF',RW:'AF',ST:'AF',SN:'AF',
  SC:'AF',SL:'AF',SO:'AF',ZA:'AF',SS:'AF',SD:'AF',TZ:'AF',TG:'AF',TN:'AF',UG:'AF',ZM:'AF',ZW:'AF',
  AF:'AS',AM:'AS',AZ:'AS',BD:'AS',BT:'AS',BN:'AS',KH:'AS',CN:'AS',GE:'AS',IN:'AS',ID:'AS',JP:'AS',KZ:'AS',KG:'AS',
  LA:'AS',MY:'AS',MV:'AS',MN:'AS',MM:'AS',NP:'AS',KP:'AS',KR:'AS',PK:'AS',PH:'AS',SG:'AS',LK:'AS',TW:'AS',TJ:'AS',
  TH:'AS',TL:'AS',TM:'AS',UZ:'AS',VN:'AS',HK:'AS',MO:'AS',
  AL:'EU',AD:'EU',AT:'EU',BY:'EU',BE:'EU',BA:'EU',BG:'EU',HR:'EU',CY:'EU',CZ:'EU',DK:'EU',EE:'EU',FI:'EU',FR:'EU',
  DE:'EU',GR:'EU',HU:'EU',IS:'EU',IE:'EU',IT:'EU',LV:'EU',LI:'EU',LT:'EU',LU:'EU',MT:'EU',MD:'EU',MC:'EU',ME:'EU',
  NL:'EU',MK:'EU',NO:'EU',PL:'EU',PT:'EU',RO:'EU',RU:'EU',SM:'EU',RS:'EU',SK:'EU',SI:'EU',ES:'EU',SE:'EU',CH:'EU',
  UA:'EU',GB:'EU',VA:'EU',
  AG:'NA',BS:'NA',BB:'NA',BZ:'NA',CA:'NA',CR:'NA',CU:'NA',DM:'NA',DO:'NA',SV:'NA',GD:'NA',GT:'NA',HT:'NA',HN:'NA',
  JM:'NA',MX:'NA',NI:'NA',PA:'NA',KN:'NA',LC:'NA',VC:'NA',TT:'NA',US:'NA',
  AR:'SA',BO:'SA',BR:'SA',CL:'SA',CO:'SA',EC:'SA',GY:'SA',PY:'SA',PE:'SA',SR:'SA',UY:'SA',VE:'SA',
  AU:'OC',FJ:'OC',KI:'OC',MH:'OC',FM:'OC',NR:'OC',NZ:'OC',PW:'OC',PG:'OC',WS:'OC',SB:'OC',TO:'OC',TV:'OC',VU:'OC',
  BH:'ME',IR:'ME',IQ:'ME',IL:'ME',JO:'ME',KW:'ME',LB:'ME',OM:'ME',PS:'ME',QA:'ME',SA:'ME',SY:'ME',TR:'ME',AE:'ME',YE:'ME',
};

// ── Country → Language mapping ──
const COUNTRY_TO_LANGUAGE = {
  FR:'fr',BE:'fr',CH:'fr',CA:'fr',LU:'fr',MA:'fr',TN:'fr',DZ:'fr',SN:'fr',CM:'fr',CI:'fr',CD:'fr',CG:'fr',MG:'fr',
  ML:'fr',BF:'fr',NE:'fr',TD:'fr',GN:'fr',BJ:'fr',TG:'fr',GA:'fr',DJ:'fr',KM:'fr',CF:'fr',RW:'fr',BI:'fr',MU:'fr',
  SC:'fr',HT:'fr',MC:'fr',GQ:'fr',
  US:'en',GB:'en',AU:'en',NZ:'en',IE:'en',NG:'en',GH:'en',KE:'en',ZA:'en',TZ:'en',UG:'en',ZW:'en',ZM:'en',BW:'en',
  NA:'en',JM:'en',TT:'en',SG:'en',PH:'en',UA:'en',PK:'en',BD:'en',LK:'en',MY:'en',SL:'en',LR:'en',MW:'en',GM:'en',
  FJ:'en',MT:'en',TH:'en',VN:'en',KH:'en',MM:'en',LA:'en',ID:'en',JP:'en',KR:'en',TR:'en',IL:'en',ET:'en',SS:'en',
  ER:'en',SZ:'en',LS:'en',PG:'en',SR:'en',GY:'en',BN:'en',MV:'en',IT:'en',NL:'en',PL:'en',RO:'en',CZ:'en',GR:'en',
  SE:'en',HU:'en',DK:'en',FI:'en',NO:'en',SK:'en',HR:'en',RS:'en',BG:'en',BA:'en',AL:'en',SI:'en',MK:'en',ME:'en',
  IS:'en',CY:'en',EE:'en',LV:'en',LT:'en',AD:'en',SM:'en',VA:'en',
  ES:'es',MX:'es',AR:'es',CO:'es',PE:'es',CL:'es',EC:'es',VE:'es',GT:'es',CU:'es',BO:'es',DO:'es',HN:'es',PY:'es',
  SV:'es',NI:'es',CR:'es',PA:'es',UY:'es',
  BR:'pt',PT:'pt',AO:'pt',MZ:'pt',CV:'pt',GW:'pt',ST:'pt',TL:'pt',
  DE:'de',AT:'de',LI:'de',
  RU:'ru',BY:'ru',KZ:'ru',KG:'ru',TJ:'ru',UZ:'ru',TM:'ru',MD:'ru',
  SA:'ar',AE:'ar',EG:'ar',IQ:'ar',JO:'ar',LB:'ar',SY:'ar',YE:'ar',OM:'ar',KW:'ar',BH:'ar',QA:'ar',LY:'ar',SD:'ar',
  SO:'ar',MR:'ar',PS:'ar',AF:'ar',IR:'ar',
  IN:'hi',NP:'hi',
  CN:'zh',TW:'zh',HK:'zh',MO:'zh',
  AZ:'ru',BT:'en',MN:'en',KP:'en',GE:'en',AM:'en',
  AG:'en',BS:'en',BB:'en',BZ:'en',DM:'en',GD:'en',KN:'en',LC:'en',VC:'en',
  KI:'en',MH:'en',FM:'en',NR:'en',PW:'en',WS:'en',SB:'en',TO:'en',TV:'en',VU:'en',
};

const CONTINENT_NAMES = {
  AF: 'Afrique', AS: 'Asie', EU: 'Europe', NA: 'Am. Nord', SA: 'Am. Sud', OC: 'Oceanie', ME: 'Moyen-Orient'
};

// ── WhatsApp group resolution (same logic as frontend) ──
const CHATTER_GROUPS = [
  { id: "chatter_af_fr", continent: "AF", lang: "fr", name: "Chatter Afrique FR" },
  { id: "chatter_af_en", continent: "AF", lang: "en", name: "Chatter Afrique EN" },
  { id: "chatter_as_fr", continent: "AS", lang: "fr", name: "Chatter Asie FR" },
  { id: "chatter_as_en", continent: "AS", lang: "en", name: "Chatter Asie EN" },
  { id: "chatter_eu_fr", continent: "EU", lang: "fr", name: "Chatter Europe FR" },
  { id: "chatter_eu_en", continent: "EU", lang: "en", name: "Chatter Europe EN" },
  { id: "chatter_na_fr", continent: "NA", lang: "fr", name: "Chatter Am.Nord FR" },
  { id: "chatter_na_en", continent: "NA", lang: "en", name: "Chatter Am.Nord EN" },
  { id: "chatter_sa_fr", continent: "SA", lang: "fr", name: "Chatter Am.Sud FR" },
  { id: "chatter_sa_en", continent: "SA", lang: "en", name: "Chatter Am.Sud EN" },
  { id: "chatter_oc_fr", continent: "OC", lang: "fr", name: "Chatter Oceanie FR" },
  { id: "chatter_oc_en", continent: "OC", lang: "en", name: "Chatter Oceanie EN" },
  { id: "chatter_me_fr", continent: "ME", lang: "fr", name: "Chatter Moyen-Orient FR" },
  { id: "chatter_me_en", continent: "ME", lang: "en", name: "Chatter Moyen-Orient EN" },
];

function findGroupForChatter(language, country) {
  const lang = language === 'ch' ? 'zh' : (language || 'fr');
  const upper = (country || '').toUpperCase();
  const continent = COUNTRY_TO_CONTINENT[upper];
  const countryLang = COUNTRY_TO_LANGUAGE[upper];

  if (continent) {
    // 1. Continent + exact language
    let match = CHATTER_GROUPS.find(g => g.continent === continent && g.lang === lang);
    if (match) return match.name;
    // 2. Continent + language from country
    if (countryLang && countryLang !== lang) {
      match = CHATTER_GROUPS.find(g => g.continent === continent && g.lang === countryLang);
      if (match) return match.name;
    }
    // 3. Continent + EN fallback
    if (lang !== 'en') {
      match = CHATTER_GROUPS.find(g => g.continent === continent && g.lang === 'en');
      if (match) return match.name;
    }
    // 4. Continent + FR fallback
    if (lang !== 'fr' && lang !== 'en') {
      match = CHATTER_GROUPS.find(g => g.continent === continent && g.lang === 'fr');
      if (match) return match.name;
    }
  }
  return "Chatter Europe EN (default)";
}

async function main() {
  console.log("Chargement des chatters...\n");
  const snap = await db.collection("chatters").get();

  const chatters = [];
  snap.forEach(doc => {
    const d = doc.data();
    const country = (d.country || '').toUpperCase();
    const lang = d.language || 'fr';
    const group = findGroupForChatter(lang, country);

    chatters.push({
      uid: doc.id,
      name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || '(sans nom)',
      email: d.email || '',
      phone: d.phone || d.whatsapp || '(aucun)',
      whatsapp: d.whatsapp || '',
      country: country || '(inconnu)',
      language: lang,
      status: d.status || '?',
      group,
      createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString().split('T')[0] : '') : '',
      whatsappGroupClicked: d.whatsappGroupClicked || false,
      whatsappGroupId: d.whatsappGroupId || '',
    });
  });

  // Sort by country then name
  chatters.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));

  console.log(`Total: ${chatters.length} chatters\n`);
  console.log("=".repeat(160));
  console.log(
    "Nom".padEnd(25) +
    "Email".padEnd(30) +
    "Téléphone".padEnd(20) +
    "WhatsApp".padEnd(20) +
    "Pays".padEnd(6) +
    "Langue".padEnd(8) +
    "Status".padEnd(10) +
    "Groupe WhatsApp".padEnd(30) +
    "Inscrit".padEnd(12) +
    "A rejoint?"
  );
  console.log("=".repeat(160));

  for (const c of chatters) {
    console.log(
      c.name.substring(0, 24).padEnd(25) +
      c.email.substring(0, 29).padEnd(30) +
      c.phone.substring(0, 19).padEnd(20) +
      c.whatsapp.substring(0, 19).padEnd(20) +
      c.country.padEnd(6) +
      c.language.padEnd(8) +
      c.status.padEnd(10) +
      c.group.substring(0, 29).padEnd(30) +
      c.createdAt.padEnd(12) +
      (c.whatsappGroupClicked ? `OUI (${c.whatsappGroupId})` : 'NON')
    );
  }

  // Summary by group
  console.log("\n\n" + "=".repeat(80));
  console.log("RÉSUMÉ PAR GROUPE WHATSAPP");
  console.log("=".repeat(80));
  const byGroup = {};
  for (const c of chatters) {
    if (!byGroup[c.group]) byGroup[c.group] = [];
    byGroup[c.group].push(c);
  }
  for (const [group, members] of Object.entries(byGroup).sort()) {
    const joined = members.filter(m => m.whatsappGroupClicked).length;
    console.log(`\n${group}: ${members.length} chatters (${joined} ont rejoint)`);
    for (const m of members) {
      console.log(`  - ${m.name} (${m.country}) ${m.phone} ${m.whatsappGroupClicked ? '✓' : '✗'}`);
    }
  }

  // Summary by country
  console.log("\n\n" + "=".repeat(80));
  console.log("RÉSUMÉ PAR PAYS");
  console.log("=".repeat(80));
  const byCountry = {};
  for (const c of chatters) {
    if (!byCountry[c.country]) byCountry[c.country] = 0;
    byCountry[c.country]++;
  }
  for (const [country, count] of Object.entries(byCountry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${country}: ${count} chatters`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Erreur:", err);
  process.exit(1);
});

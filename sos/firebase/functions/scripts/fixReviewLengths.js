/**
 * Replace the shortest review per profile with a long detailed review
 * to improve length diversity
 */
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const SPEC = {
  'IMMI_VISAS_PERMIS_SEJOUR': 'visas et permis de séjour', 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL': 'contrats de travail',
  'IMMI_NATURALISATION': 'naturalisation', 'FAM_MARIAGE_DIVORCE': 'droit familial',
  'FAM_GARDE_ENFANTS_TRANSFRONTALIERE': 'garde d\'enfants', 'FAM_SCOLARITE_INTERNATIONALE': 'scolarité internationale',
  'FISC_DECLARATIONS_INTERNATIONALES': 'déclarations fiscales', 'FISC_OPTIMISATION_EXPATRIES': 'optimisation fiscale',
  'ENTR_CREATION_ENTREPRISE_ETRANGER': 'création d\'entreprise', 'ENTR_INVESTISSEMENTS': 'investissements',
  'TRAV_SECURITE_SOCIALE_INTERNATIONALE': 'sécurité sociale', 'TRAV_RETRAITE_INTERNATIONALE': 'retraite internationale',
  'URG_ASSISTANCE_PENALE_INTERNATIONALE': 'assistance pénale', 'URG_ACCIDENTS_RESPONSABILITE_CIVILE': 'responsabilité civile',
  'IMMO_ACHAT_VENTE': 'immobilier', 'IMMO_LOCATION_BAUX': 'baux et locations', 'IMMO_LITIGES_IMMOBILIERS': 'litiges immobiliers',
  'PATR_SUCCESSIONS_INTERNATIONALES': 'successions', 'PATR_TESTAMENTS': 'testaments',
  'ASSU_ASSURANCES_INTERNATIONALES': 'assurances', 'BANK_PROBLEMES_COMPTES_BANCAIRES': 'problèmes bancaires',
  'CUR_DEMARCHES_ADMINISTRATIVES': 'démarches administratives', 'CUR_TRADUCTIONS_LEGALISATIONS': 'traductions et légalisations',
  'CUR_RECLAMATIONS_LITIGES_MINEURS': 'réclamations', 'CONS_ACHATS_DEFECTUEUX_ETRANGER': 'achats défectueux',
  'SANT_DROIT_MEDICAL': 'droit médical', 'SANT_REMBOURSEMENTS_SOINS': 'remboursements de soins',
  'TRAN_PROBLEMES_AERIENS': 'problèmes aériens', 'TRAN_BAGAGES_PERDUS_ENDOMMAGES': 'bagages perdus',
  'VIO_DISCRIMINATIONS': 'discriminations', 'VIO_VIOLENCES_DOMESTIQUES': 'violences domestiques',
  'ARGT_SURENDETTEMENT_PLANS': 'surendettement', 'ARGT_FRAIS_BANCAIRES_ABUSIFS': 'frais bancaires abusifs',
  'ARGT_ARNAQUES_ESCROQUERIES': 'arnaques', 'FISC_DOUBLE_IMPOSITION': 'double imposition',
  'ENTR_IMPORT_EXPORT': 'import-export', 'BANK_VIREMENTS_CREDITS': 'virements bancaires',
  'CONS_SERVICES_NON_CONFORMES': 'services non conformes', 'IMMI_VISA_NOMADE_DIGITAL': 'visa nomade digital',
  'OTH_PRECISER_BESOIN': 'assistance juridique', 'COMP_DROIT_AFRICAIN': 'droit africain',
  'COMP_DROIT_ASIATIQUE': 'droit asiatique',
};
const C = {'FR':'France','BE':'Belgique','CH':'Suisse','MX':'Mexique','SG':'Singapour','MU':'Maurice','SE':'Suède','IT':'Italie','PL':'Pologne','CZ':'République tchèque','IE':'Irlande','TR':'Turquie','GA':'Gabon','KE':'Kenya','DJ':'Djibouti','KW':'Koweït','US':'États-Unis','DO':'République dominicaine','ZA':'Afrique du Sud','AE':'Émirats arabes unis','GF':'Guyane française','HK':'Hong Kong','JP':'Japon','IN':'Inde','KZ':'Kazakhstan','AU':'Australie','HT':'Haïti','AL':'Albanie','EE':'Estonie','GB':'Royaume-Uni','KR':'Corée du Sud','RO':'Roumanie','LB':'Liban','TH':'Thaïlande','HR':'Croatie','CO':'Colombie','ET':'Éthiopie','GH':'Ghana','TT':'Trinidad-et-Tobago','PF':'Polynésie française','AR':'Argentine','EG':'Égypte','AO':'Angola','ZM':'Zambie','ES':'Espagne','MD':'Moldavie','GP':'Guadeloupe','MA':'Maroc','CI':'Côte d\'Ivoire','CM':'Cameroun','TN':'Tunisie','SN':'Sénégal'};

function spec(code) { return SPEC[code] || 'questions juridiques'; }
function country(code) { return C[code] || code; }

// Long review templates for lawyers
function longLawyerReview(p) {
  const { firstName, lastName, gender, countryName, s1, s2, yrs } = p;
  const e = gender === 'female' ? 'e' : '';
  const pron = gender === 'female' ? 'elle' : 'il';
  const Pron = gender === 'female' ? 'Elle' : 'Il';
  const roleW = gender === 'female' ? 'avocate' : 'avocat';
  const templates = [
    `Je tiens à exprimer ma profonde gratitude envers Maître ${lastName}. Quand je me suis retrouvé${e} confronté${e} à un problème de ${s1} en ${countryName}, je ne savais absolument pas par où commencer. ${Pron} a pris le temps d'analyser ma situation dans les moindres détails, m'a expliqué les différentes options qui s'offraient à moi, et m'a guidé${e} pas à pas dans les démarches. Ce qui m'a particulièrement impressionné${e}, c'est sa maîtrise du droit local en matière de ${s2}. Avec ${yrs} ans d'expérience, on sent qu'${pron} connaît parfaitement le terrain. Un${e} ${roleW} exceptionnel${e} que je recommande sans la moindre hésitation.`,
    `Je ne pensais pas qu'un simple appel pourrait autant changer ma situation. Maître ${lastName} m'a écouté${e} attentivement, a immédiatement identifié les points clés de mon problème de ${s1}, et m'a proposé une stratégie claire et réaliste. ${Pron} ne s'est pas contenté${e} de répondre à mes questions, ${pron} a anticipé des problèmes que je n'avais même pas envisagés. Sa connaissance approfondie du système juridique en ${countryName} est remarquable. J'ai enfin pu avancer sereinement dans mes démarches de ${s2}. Je recommande vivement ${gender === 'female' ? 'cette avocate' : 'cet avocat'} à tout expatrié qui se retrouve dans une situation juridique complexe.`,
    `Après des semaines d'angoisse face à mon problème de ${s1} en ${countryName}, j'ai décidé de contacter Maître ${lastName} et je ne regrette absolument pas. Dès les premières minutes de notre échange, ${pron} a su me rassurer avec des explications claires et précises. ${Pron} m'a détaillé chaque étape de la procédure, les délais à prévoir, et les documents à préparer. ${Pron} a même pris l'initiative de me rappeler pour vérifier que tout avançait bien. Ses ${yrs} années d'expérience en ${s2} se ressentent dans chacun de ses conseils. Un${e} professionnel${e} remarquable, humain${e} et véritablement investi${e} pour ses clients.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Long review templates for expats
function longExpatReview(p) {
  const { firstName, gender, countryName, s1, s2, yrs } = p;
  const e = gender === 'female' ? 'e' : '';
  const pron = gender === 'female' ? 'elle' : 'il';
  const Pron = gender === 'female' ? 'Elle' : 'Il';
  const templates = [
    `Mon arrivée en ${countryName} aurait été un véritable cauchemar sans l'aide de ${firstName}. Je me retrouvais submergé${e} par les ${s1}, les formulaires incompréhensibles et les administrations locales. ${firstName} a pris le temps de tout m'expliquer avec patience, m'a accompagné${e} dans chaque démarche, et m'a même partagé des contacts de confiance sur place. Ce qui fait vraiment la différence, c'est qu'${pron} vit ${gender === 'female' ? 'elle-même' : 'lui-même'} en ${countryName} depuis ${yrs} ans et connaît les réalités du terrain comme personne. ${Pron} m'a aussi donné des conseils précieux pour ${s2}. Un${e} allié${e} inestimable pour tout nouvel expatrié.`,
    `Je recommande ${firstName} les yeux fermés à tout francophone qui s'installe en ${countryName}. ${Pron} m'a aidé${e} à naviguer dans le labyrinthe des ${s1} avec une patience et une expertise remarquables. Chaque conseil était précis, pratique et adapté à ma situation personnelle. ${Pron} ne se contente pas de donner des informations génériques : ${pron} prend le temps de comprendre votre contexte et propose des solutions sur mesure. Ses ${yrs} années d'expatriation en ${countryName} lui donnent une perspective unique. ${Pron} m'a également orienté${e} pour ${s2}, ce qui m'a évité de nombreuses erreurs coûteuses. Un service humain et professionnel qui fait toute la différence.`,
    `Franchement, je ne sais pas comment j'aurais fait sans ${firstName}. Quand je suis arrivé${e} en ${countryName}, tout était nouveau et intimidant. Les ${s1}, c'est un vrai casse-tête quand on ne connaît pas le système local. ${firstName} a tout simplifié pour moi : ${pron} m'a expliqué les procédures, m'a dit exactement quels documents préparer, et m'a même accompagné${e} dans certaines démarches. Le plus appréciable, c'est ${gender === 'female' ? 'sa' : 'son'} disponibilité et ${gender === 'female' ? 'sa' : 'son'} réactivité. En ${yrs} ans sur place, ${pron} a développé un réseau incroyable. ${Pron} m'a aussi conseillé${e} sur ${s2}. Bref, un${e} vrai${e} guide pour l'expatriation.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

async function run() {
  const snap = await db.collection('sos_profiles').where('isAAA', '==', true).get();
  let updated = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const gender = data.gender || 'male';
    const role = data.type || data.role || 'lawyer';
    const firstName = data.fullName.split(' ')[0];
    const lastName = data.fullName.split(' ').pop();
    const countryName = country(data.country);
    const specs = data.specialties || data.helpTypes || [];
    const s1 = spec(specs[0] || 'OTH_PRECISER_BESOIN');
    const s2 = spec(specs[1] || specs[0] || 'OTH_PRECISER_BESOIN');
    const yrs = data.yearsOfExperience || data.yearsAsExpat || 5;

    const p = { firstName, lastName, gender, countryName, s1, s2, yrs };

    // Get all reviews, find shortest
    const revSnap = await db.collection('reviews')
      .where('providerId', '==', d.id)
      .where('status', '==', 'published')
      .get();

    let shortest = null;
    let shortestLen = Infinity;
    for (const r of revSnap.docs) {
      const len = (r.data().comment || '').length;
      if (len < shortestLen) { shortestLen = len; shortest = r; }
    }

    if (!shortest || shortestLen > 200) continue;

    const longReview = role === 'lawyer' ? longLawyerReview(p) : longExpatReview(p);

    await db.collection('reviews').doc(shortest.id).update({ comment: longReview });
    updated++;
    console.log(`✅ ${data.fullName} (${shortestLen} → ${longReview.length} car)`);
  }

  console.log(`\n✅ Done! Updated ${updated} reviews with longer versions`);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });

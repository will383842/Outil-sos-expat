#!/usr/bin/env node
/**
 * DRY RUN: Preview slug migration changes without applying them
 * Run: node scripts/dry-run-slug-migration.cjs
 * Run with --apply to actually apply changes: node scripts/dry-run-slug-migration.cjs --apply
 */
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'sos-urgently-ac307' });
const db = admin.firestore();

const APPLY = process.argv.includes('--apply');

const LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ch', 'ar', 'hi'];
const ROLE_TRANSLATIONS = {
  lawyer: { fr: 'avocat', en: 'lawyer', es: 'abogado', pt: 'advogado', de: 'anwalt', ru: 'advokat', zh: 'lushi', ar: 'muhami', hi: 'vakil' },
  expat: { fr: 'expatrie', en: 'expat', es: 'expatriado', pt: 'expatriado', de: 'expat', ru: 'expat', zh: 'haiwai', ar: 'wafid', hi: 'videshi' },
};
const DEFAULT_LOCALES = { fr: 'fr', en: 'us', de: 'de', es: 'es', pt: 'pt', ru: 'ru', ch: 'cn', ar: 'sa', hi: 'in' };

// French name → ISO code mapping (for Firestore values that aren't ISO codes)
const NAME_TO_ISO = {
  'Thaïlande': 'TH', 'Thailand': 'TH', 'Algérie': 'DZ', 'Algeria': 'DZ',
  'France': 'FR', 'Allemagne': 'DE', 'Germany': 'DE', 'Espagne': 'ES', 'Spain': 'ES',
  'États-Unis': 'US', 'United States': 'US', 'USA': 'US',
  'Belgique': 'BE', 'Belgium': 'BE', 'Suisse': 'CH', 'Switzerland': 'CH',
  'Royaume-Uni': 'GB', 'United Kingdom': 'GB', 'Italie': 'IT', 'Italy': 'IT',
  'Maroc': 'MA', 'Morocco': 'MA', 'Tunisie': 'TN', 'Tunisia': 'TN',
  'Émirats Arabes Unis': 'AE', 'UAE': 'AE',
  'Arabie Saoudite': 'SA', 'Saudi Arabia': 'SA',
  'Croatie': 'HR', 'Croatia': 'HR', 'Portugal': 'PT', 'Brésil': 'BR', 'Brazil': 'BR',
  'Canada': 'CA', 'Australie': 'AU', 'Australia': 'AU', 'Japon': 'JP', 'Japan': 'JP',
  'Pologne': 'PL', 'Poland': 'PL', 'Suède': 'SE', 'Sweden': 'SE',
  'Turquie': 'TR', 'Turkey': 'TR', 'Égypte': 'EG', 'Egypt': 'EG',
  'Mexique': 'MX', 'Mexico': 'MX', 'Singapour': 'SG', 'Singapore': 'SG',
};

function normalizeCountryCode(country) {
  if (!country) return 'FR';
  // Already ISO code (2 uppercase letters)?
  if (/^[A-Z]{2}$/.test(country)) return country;
  // Try name mapping
  if (NAME_TO_ISO[country]) return NAME_TO_ISO[country];
  // Try uppercase
  const upper = country.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  // Fallback
  return country.substring(0, 2).toUpperCase();
}

// Complete country translations (ISO code → 9-language slugs)
const COUNTRY_TRANSLATIONS = {
  FR: { fr: 'france', en: 'france', es: 'francia', pt: 'franca', de: 'frankreich', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'phrans' },
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', pt: 'tailandia', de: 'thailand', ru: 'tailand', zh: 'taiguo', ar: 'tailanda', hi: 'thailand' },
  DE: { fr: 'allemagne', en: 'germany', es: 'alemania', pt: 'alemanha', de: 'deutschland', ru: 'germaniya', zh: 'deguo', ar: 'almania', hi: 'jarmani' },
  ES: { fr: 'espagne', en: 'spain', es: 'espana', pt: 'espanha', de: 'spanien', ru: 'ispaniya', zh: 'xibanya', ar: 'isbania', hi: 'spen' },
  BE: { fr: 'belgique', en: 'belgium', es: 'belgica', pt: 'belgica', de: 'belgien', ru: 'belgiya', zh: 'bilishi', ar: 'baljika', hi: 'belgium' },
  CH: { fr: 'suisse', en: 'switzerland', es: 'suiza', pt: 'suica', de: 'schweiz', ru: 'shveytsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  US: { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'usa', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'amerika' },
  GB: { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', pt: 'reino-unido', de: 'grossbritannien', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britania', hi: 'briten' },
  MA: { fr: 'maroc', en: 'morocco', es: 'marruecos', pt: 'marrocos', de: 'marokko', ru: 'marokko', zh: 'moluoge', ar: 'maghrib', hi: 'morocco' },
  TN: { fr: 'tunisie', en: 'tunisia', es: 'tunez', pt: 'tunisia', de: 'tunesien', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia' },
  AE: { fr: 'emirats', en: 'uae', es: 'emiratos', pt: 'emirados', de: 'vae', ru: 'oae', zh: 'alianqiu', ar: 'alemarat', hi: 'uae' },
  SA: { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', pt: 'arabia-saudita', de: 'saudi-arabien', ru: 'saudovskaya', zh: 'shate', ar: 'saudia', hi: 'saudi' },
  HR: { fr: 'croatie', en: 'croatia', es: 'croacia', pt: 'croacia', de: 'kroatien', ru: 'khorvatiya', zh: 'keluodiya', ar: 'kruwatia', hi: 'croatia' },
  IT: { fr: 'italie', en: 'italy', es: 'italia', pt: 'italia', de: 'italien', ru: 'italiya', zh: 'yidali', ar: 'italia', hi: 'itali' },
  PT: { fr: 'portugal', en: 'portugal', es: 'portugal', pt: 'portugal', de: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'burtugal', hi: 'purtugal' },
  BR: { fr: 'bresil', en: 'brazil', es: 'brasil', pt: 'brasil', de: 'brasilien', ru: 'braziliya', zh: 'baxi', ar: 'brazil', hi: 'brazil' },
  CA: { fr: 'canada', en: 'canada', es: 'canada', pt: 'canada', de: 'kanada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'kanada' },
  AU: { fr: 'australie', en: 'australia', es: 'australia', pt: 'australia', de: 'australien', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia' },
  JP: { fr: 'japon', en: 'japan', es: 'japon', pt: 'japao', de: 'japan', ru: 'yaponiya', zh: 'riben', ar: 'yaban', hi: 'japan' },
  NI: { fr: 'nicaragua', en: 'nicaragua', es: 'nicaragua', pt: 'nicaragua', de: 'nicaragua', ru: 'nikaragua', zh: 'nijialagua', ar: 'nikaragwa', hi: 'nicaragua' },
  TT: { fr: 'trinite-tobago', en: 'trinidad-tobago', es: 'trinidad-tobago', pt: 'trindade-tobago', de: 'trinidad-tobago', ru: 'trinidad-tobago', zh: 'telinidate', ar: 'trinidad', hi: 'trinidad' },
  EE: { fr: 'estonie', en: 'estonia', es: 'estonia', pt: 'estonia', de: 'estland', ru: 'estoniya', zh: 'aisheniya', ar: 'istunia', hi: 'estonia' },
  DZ: { fr: 'algerie', en: 'algeria', es: 'argelia', pt: 'argelia', de: 'algerien', ru: 'alzhir', zh: 'aerjiliya', ar: 'jazair', hi: 'algeria' },
  KH: { fr: 'cambodge', en: 'cambodia', es: 'camboya', pt: 'camboja', de: 'kambodscha', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambudya', hi: 'cambodia' },
  MX: { fr: 'mexique', en: 'mexico', es: 'mexico', pt: 'mexico', de: 'mexiko', ru: 'meksika', zh: 'moxige', ar: 'maksik', hi: 'meksiko' },
  NL: { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', pt: 'holanda', de: 'niederlande', ru: 'niderlandy', zh: 'helan', ar: 'holanda', hi: 'netherlands' },
  PL: { fr: 'pologne', en: 'poland', es: 'polonia', pt: 'polonia', de: 'polen', ru: 'polsha', zh: 'bolan', ar: 'bolanda', hi: 'poland' },
  SE: { fr: 'suede', en: 'sweden', es: 'suecia', pt: 'suecia', de: 'schweden', ru: 'shvetsiya', zh: 'ruidian', ar: 'swid', hi: 'sweden' },
  TR: { fr: 'turquie', en: 'turkey', es: 'turquia', pt: 'turquia', de: 'tuerkei', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkia', hi: 'turkey' },
  EG: { fr: 'egypte', en: 'egypt', es: 'egipto', pt: 'egito', de: 'aegypten', ru: 'yegipet', zh: 'aiji', ar: 'misr', hi: 'misr' },
  SG: { fr: 'singapour', en: 'singapore', es: 'singapur', pt: 'singapura', de: 'singapur', ru: 'singapur', zh: 'xinjiapo', ar: 'singhafura', hi: 'singapore' },
  IN: { fr: 'inde', en: 'india', es: 'india', pt: 'india', de: 'indien', ru: 'indiya', zh: 'yindu', ar: 'alhind', hi: 'bharat' },
  HK: { fr: 'hong-kong', en: 'hong-kong', es: 'hong-kong', pt: 'hong-kong', de: 'hongkong', ru: 'gonkong', zh: 'xianggang', ar: 'hongkong', hi: 'hongkong' },
  IE: { fr: 'irlande', en: 'ireland', es: 'irlanda', pt: 'irlanda', de: 'irland', ru: 'irlandiya', zh: 'aierlan', ar: 'irlanda', hi: 'ireland' },
  ZA: { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', pt: 'africa-do-sul', de: 'suedafrika', ru: 'yuar', zh: 'nanfei', ar: 'janubafrika', hi: 'southafrica' },
  KE: { fr: 'kenya', en: 'kenya', es: 'kenia', pt: 'quenia', de: 'kenia', ru: 'keniya', zh: 'kenniya', ar: 'kinya', hi: 'kenya' },
  GH: { fr: 'ghana', en: 'ghana', es: 'ghana', pt: 'gana', de: 'ghana', ru: 'gana', zh: 'jiana', ar: 'ghana', hi: 'ghana' },
  RO: { fr: 'roumanie', en: 'romania', es: 'rumania', pt: 'romenia', de: 'rumaenien', ru: 'ruminiya', zh: 'luomaniya', ar: 'rumania', hi: 'romania' },
  CZ: { fr: 'tchequie', en: 'czech-republic', es: 'chequia', pt: 'tcheca', de: 'tschechien', ru: 'chekhiya', zh: 'jieke', ar: 'tshik', hi: 'czech' },
  IL: { fr: 'israel', en: 'israel', es: 'israel', pt: 'israel', de: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  KR: { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', pt: 'coreia-do-sul', de: 'suedkorea', ru: 'koreya', zh: 'hanguo', ar: 'koria', hi: 'korea' },
  // African countries found in Firestore
  AL: { fr: 'albanie', en: 'albania', es: 'albania', pt: 'albania', de: 'albanien', ru: 'albaniya', zh: 'aerbaniya', ar: 'albania', hi: 'albania' },
  AO: { fr: 'angola', en: 'angola', es: 'angola', pt: 'angola', de: 'angola', ru: 'angola', zh: 'angola', ar: 'angola', hi: 'angola' },
  AR: { fr: 'argentine', en: 'argentina', es: 'argentina', pt: 'argentina', de: 'argentinien', ru: 'argentina', zh: 'agenting', ar: 'arjantin', hi: 'argentina' },
  CI: { fr: 'cote-divoire', en: 'ivory-coast', es: 'costa-marfil', pt: 'costa-marfim', de: 'elfenbeinkueste', ru: 'kot-divuar', zh: 'ketediwael', ar: 'kotdifwar', hi: 'ivory-coast' },
  CM: { fr: 'cameroun', en: 'cameroon', es: 'camerun', pt: 'camaroes', de: 'kamerun', ru: 'kamerun', zh: 'kamailong', ar: 'kamirun', hi: 'cameroon' },
  CO: { fr: 'colombie', en: 'colombia', es: 'colombia', pt: 'colombia', de: 'kolumbien', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kolumbia', hi: 'colombia' },
  DJ: { fr: 'djibouti', en: 'djibouti', es: 'yibuti', pt: 'djibuti', de: 'dschibuti', ru: 'dzhibuti', zh: 'jibuti', ar: 'jibuti', hi: 'djibouti' },
  DO: { fr: 'republique-dominicaine', en: 'dominican-republic', es: 'republica-dominicana', pt: 'republica-dominicana', de: 'dominikanische-republik', ru: 'dominikana', zh: 'duominijia', ar: 'dominikan', hi: 'dominican' },
  ET: { fr: 'ethiopie', en: 'ethiopia', es: 'etiopia', pt: 'etiopia', de: 'aethiopien', ru: 'efiopiya', zh: 'aiseibiya', ar: 'ithyubya', hi: 'ethiopia' },
  GA: { fr: 'gabon', en: 'gabon', es: 'gabon', pt: 'gabao', de: 'gabun', ru: 'gabon', zh: 'jiapeng', ar: 'gabun', hi: 'gabon' },
  GF: { fr: 'guyane', en: 'french-guiana', es: 'guayana', pt: 'guiana', de: 'guayana', ru: 'gviana', zh: 'guiana', ar: 'giana', hi: 'guiana' },
  GP: { fr: 'guadeloupe', en: 'guadeloupe', es: 'guadalupe', pt: 'guadalupe', de: 'guadeloupe', ru: 'gvadelupa', zh: 'guadelupu', ar: 'gwadalub', hi: 'guadeloupe' },
  HT: { fr: 'haiti', en: 'haiti', es: 'haiti', pt: 'haiti', de: 'haiti', ru: 'gaiti', zh: 'haidi', ar: 'hayti', hi: 'haiti' },
  KW: { fr: 'koweit', en: 'kuwait', es: 'kuwait', pt: 'kuwait', de: 'kuwait', ru: 'kuveyt', zh: 'keweite', ar: 'kuwait', hi: 'kuwait' },
  KZ: { fr: 'kazakhstan', en: 'kazakhstan', es: 'kazajistan', pt: 'cazaquistao', de: 'kasachstan', ru: 'kazakhstan', zh: 'hasakesite', ar: 'kazkhstan', hi: 'kazakhstan' },
  LB: { fr: 'liban', en: 'lebanon', es: 'libano', pt: 'libano', de: 'libanon', ru: 'livan', zh: 'libanen', ar: 'lubnan', hi: 'lebanon' },
  MD: { fr: 'moldavie', en: 'moldova', es: 'moldavia', pt: 'moldavia', de: 'moldawien', ru: 'moldaviya', zh: 'moerdowa', ar: 'moldofa', hi: 'moldova' },
  MU: { fr: 'maurice', en: 'mauritius', es: 'mauricio', pt: 'mauricia', de: 'mauritius', ru: 'mavrikiy', zh: 'maoliqiusi', ar: 'murishyus', hi: 'mauritius' },
  PF: { fr: 'polynesie', en: 'french-polynesia', es: 'polinesia', pt: 'polinesia', de: 'polynesien', ru: 'polineziya', zh: 'bolinixiya', ar: 'bulinizya', hi: 'polynesia' },
  SN: { fr: 'senegal', en: 'senegal', es: 'senegal', pt: 'senegal', de: 'senegal', ru: 'senegal', zh: 'saineijiaer', ar: 'sinigal', hi: 'senegal' },
  ZM: { fr: 'zambie', en: 'zambia', es: 'zambia', pt: 'zambia', de: 'sambia', ru: 'zambiya', zh: 'zanbiya', ar: 'zambya', hi: 'zambia' },
};

// Specialty short slug mappings
const SPECIALTY_SLUGS = {
  'URG_ASSISTANCE_PENALE_INTERNATIONALE': { fr: 'penal', en: 'criminal', es: 'penal', de: 'strafrecht', pt: 'penal', ru: 'ugolovnoe', zh: 'xingshi', ar: 'jinai', hi: 'aparadh' },
  'URG_ACCIDENTS_RESPONSABILITE_CIVILE': { fr: 'accidents', en: 'accidents', es: 'accidentes', de: 'unfaelle', pt: 'acidentes', ru: 'dtp', zh: 'shigu', ar: 'hawadith', hi: 'durghatna' },
  'URG_RAPATRIEMENT_URGENCE': { fr: 'rapatriement', en: 'repatriation', es: 'repatriacion', de: 'rueckfuehrung', pt: 'repatriacao', ru: 'repatriatsiya', zh: 'qianfan', ar: 'iada', hi: 'pratyavartan' },
  'IMMI_VISAS_PERMIS_SEJOUR': { fr: 'visa', en: 'visa', es: 'visa', de: 'visum', pt: 'visto', ru: 'viza', zh: 'qianzheng', ar: 'tashira', hi: 'visa' },
  'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL': { fr: 'travail', en: 'work', es: 'trabajo', de: 'arbeit', pt: 'trabalho', ru: 'rabota', zh: 'gongzuo', ar: 'amal', hi: 'kaam' },
  'IMMI_NATURALISATION': { fr: 'nationalite', en: 'citizenship', es: 'ciudadania', de: 'einbuergerung', pt: 'cidadania', ru: 'grazhdanstvo', zh: 'ruji', ar: 'tajnis', hi: 'nagrikta' },
  'IMMI_REGROUPEMENT_FAMILIAL': { fr: 'famille', en: 'family', es: 'familia', de: 'familie', pt: 'familia', ru: 'semya', zh: 'jiating', ar: 'aila', hi: 'parivar' },
  'IMMI_VISA_ETUDIANT': { fr: 'etudiant', en: 'student', es: 'estudiante', de: 'student', pt: 'estudante', ru: 'student', zh: 'xuesheng', ar: 'talib', hi: 'chhatra' },
  'IMMI_VISA_INVESTISSEUR': { fr: 'investisseur', en: 'investor', es: 'inversor', de: 'investor', pt: 'investidor', ru: 'investor', zh: 'touzhe', ar: 'mustathmir', hi: 'niveshak' },
  'IMMI_VISA_RETRAITE': { fr: 'retraite', en: 'retirement', es: 'jubilacion', de: 'rente', pt: 'aposentadoria', ru: 'pensiya', zh: 'tuixiu', ar: 'taqaud', hi: 'sevanivrutti' },
  'IMMI_VISA_NOMADE_DIGITAL': { fr: 'nomade', en: 'digital-nomad', es: 'nomada', de: 'nomade', pt: 'nomade', ru: 'nomad', zh: 'youmin', ar: 'rahhal', hi: 'nomad' },
  'FAM_MARIAGE_DIVORCE': { fr: 'divorce', en: 'divorce', es: 'divorcio', de: 'scheidung', pt: 'divorcio', ru: 'razvod', zh: 'lihun', ar: 'talaq', hi: 'talak' },
  'FAM_GARDE_ENFANTS_TRANSFRONTALIERE': { fr: 'garde-enfants', en: 'child-custody', es: 'custodia', de: 'sorgerecht', pt: 'guarda', ru: 'opeka', zh: 'yangguan', ar: 'hidana', hi: 'hirasata' },
  'FAM_SCOLARITE_INTERNATIONALE': { fr: 'scolarite', en: 'schooling', es: 'escolaridad', de: 'schulbildung', pt: 'escolaridade', ru: 'obuchenie', zh: 'jiaoyu', ar: 'talim', hi: 'shiksha' },
  'FISC_DECLARATIONS_INTERNATIONALES': { fr: 'fiscal', en: 'tax', es: 'fiscal', de: 'steuer', pt: 'fiscal', ru: 'nalog', zh: 'shuiwu', ar: 'dariba', hi: 'kar' },
  'FISC_DOUBLE_IMPOSITION': { fr: 'double-imposition', en: 'double-tax', es: 'doble-imposicion', de: 'doppelbesteuerung', pt: 'dupla-tributacao', ru: 'dvoinoi-nalog', zh: 'shuangchong', ar: 'izdiwaj', hi: 'dahra-kar' },
  'FISC_OPTIMISATION_EXPATRIES': { fr: 'optimisation', en: 'tax-planning', es: 'optimizacion', de: 'steuerplanung', pt: 'otimizacao', ru: 'optimizatsiya', zh: 'youhua', ar: 'tahsin', hi: 'anukul' },
  'IMMO_ACHAT_VENTE': { fr: 'immobilier', en: 'real-estate', es: 'inmobiliario', de: 'immobilien', pt: 'imobiliario', ru: 'nedvizhimost', zh: 'fangdichan', ar: 'aqarat', hi: 'sampatti' },
  'IMMO_LOCATION_BAUX': { fr: 'location', en: 'rental', es: 'alquiler', de: 'miete', pt: 'aluguel', ru: 'arenda', zh: 'zulin', ar: 'ijar', hi: 'kiraya' },
  'ENTR_CREATION_ENTREPRISE_ETRANGER': { fr: 'entreprise', en: 'business', es: 'empresa', de: 'unternehmen', pt: 'empresa', ru: 'biznes', zh: 'chuangye', ar: 'sharika', hi: 'vyavsay' },
  'ENTR_INVESTISSEMENTS': { fr: 'investissement', en: 'investment', es: 'inversion', de: 'investition', pt: 'investimento', ru: 'investitsii', zh: 'touzi', ar: 'istithmar', hi: 'nivesh' },
  'ENTR_IMPORT_EXPORT': { fr: 'import-export', en: 'trade', es: 'comercio', de: 'handel', pt: 'comercio', ru: 'torgovlya', zh: 'maoyi', ar: 'tijara', hi: 'vyapar' },
  'CUR_TRADUCTIONS_LEGALISATIONS': { fr: 'traductions', en: 'translations', es: 'traducciones', de: 'uebersetzungen', pt: 'traducoes', ru: 'perevody', zh: 'fanyi', ar: 'tarjama', hi: 'anuvad' },
  'CUR_RECLAMATIONS_LITIGES_MINEURS': { fr: 'litiges', en: 'disputes', es: 'litigios', de: 'streitigkeiten', pt: 'litigios', ru: 'spory', zh: 'jiufen', ar: 'niza', hi: 'vivad' },
  'CUR_DEMARCHES_ADMINISTRATIVES': { fr: 'administratif', en: 'administrative', es: 'administrativo', de: 'verwaltung', pt: 'administrativo', ru: 'administrativnoe', zh: 'xingzheng', ar: 'idari', hi: 'prashasnik' },
  'PATR_SUCCESSIONS_INTERNATIONALES': { fr: 'succession', en: 'inheritance', es: 'sucesion', de: 'erbschaft', pt: 'sucessao', ru: 'nasledstvo', zh: 'jicheng', ar: 'mirath', hi: 'uttaradhikar' },
  'PATR_GESTION_PATRIMOINE': { fr: 'patrimoine', en: 'wealth', es: 'patrimonio', de: 'vermoegen', pt: 'patrimonio', ru: 'aktivy', zh: 'caifu', ar: 'tharwa', hi: 'sampada' },
  'PATR_TESTAMENTS': { fr: 'testament', en: 'will', es: 'testamento', de: 'testament', pt: 'testamento', ru: 'zaveshchanie', zh: 'yizhu', ar: 'wasiya', hi: 'vasiyat' },
  'TRAV_DROITS_TRAVAILLEURS': { fr: 'droit-travail', en: 'labor-rights', es: 'derechos', de: 'arbeitsrecht', pt: 'direitos', ru: 'trudovoe', zh: 'laodong', ar: 'huquq', hi: 'shramik' },
  'TRAV_LICENCIEMENT_INTERNATIONAL': { fr: 'licenciement', en: 'dismissal', es: 'despido', de: 'kuendigung', pt: 'demissao', ru: 'uvolnenie', zh: 'jiegu', ar: 'fasl', hi: 'barkhaastagi' },
  'VIO_VIOLENCES_DOMESTIQUES': { fr: 'violences', en: 'domestic-violence', es: 'violencia', de: 'gewalt', pt: 'violencia', ru: 'nasilie', zh: 'baoli', ar: 'unf', hi: 'hinsa' },
  'VIO_HARCELEMENT': { fr: 'harcelement', en: 'harassment', es: 'acoso', de: 'belaestigung', pt: 'assedio', ru: 'domogatelstvo', zh: 'saorao', ar: 'taharrush', hi: 'utpidan' },
  'ASSU_ASSURANCES_INTERNATIONALES': { fr: 'assurance', en: 'insurance', es: 'seguro', de: 'versicherung', pt: 'seguro', ru: 'strakhovanie', zh: 'baoxian', ar: 'tamin', hi: 'bima' },
  'COMP_DROIT_AFRICAIN': { fr: 'droit-africain', en: 'african-law', es: 'derecho-africano', de: 'afrikanisches-recht', pt: 'direito-africano', ru: 'afrikanskoe', zh: 'feizhou-fa', ar: 'qanun-ifriqi', hi: 'afriki-kanun' },
  'COMP_DROIT_ISLAMIQUE': { fr: 'droit-islamique', en: 'islamic-law', es: 'derecho-islamico', de: 'islamisches-recht', pt: 'direito-islamico', ru: 'islamskoe', zh: 'yisilan-fa', ar: 'sharia', hi: 'islami-kanun' },
  'COMP_COMMON_LAW': { fr: 'common-law', en: 'common-law', es: 'common-law', de: 'common-law', pt: 'common-law', ru: 'obshchee-pravo', zh: 'putongfa', ar: 'qanun-am', hi: 'common-law' },
  'OTH_PRECISER_BESOIN': { fr: 'conseil', en: 'advice', es: 'consejo', de: 'beratung', pt: 'conselho', ru: 'konsultatsiya', zh: 'zixun', ar: 'nashiha', hi: 'salah' },
  // Expat help types
  'INSTALLATION': { fr: 'installation', en: 'settling', es: 'instalacion', de: 'einrichtung', pt: 'instalacao', ru: 'obustroistvo', zh: 'dingju', ar: 'istiqrar', hi: 'sthapna' },
  'DEMARCHES_ADMINISTRATIVES': { fr: 'administratif', en: 'administrative', es: 'administrativo', de: 'verwaltung', pt: 'administrativo', ru: 'administrativnoe', zh: 'xingzheng', ar: 'idari', hi: 'prashasnik' },
  'RECHERCHE_LOGEMENT': { fr: 'logement', en: 'housing', es: 'vivienda', de: 'wohnung', pt: 'habitacao', ru: 'zhilye', zh: 'zhufang', ar: 'sakan', hi: 'aawas' },
  'VISA_IMMIGRATION': { fr: 'visa', en: 'visa', es: 'visa', de: 'visum', pt: 'visto', ru: 'viza', zh: 'qianzheng', ar: 'tashira', hi: 'visa' },
  'CREATION_ENTREPRISE': { fr: 'entreprise', en: 'business', es: 'empresa', de: 'unternehmen', pt: 'empresa', ru: 'biznes', zh: 'chuangye', ar: 'sharika', hi: 'vyavsay' },
  'SYSTEME_SANTE': { fr: 'sante', en: 'health', es: 'salud', de: 'gesundheit', pt: 'saude', ru: 'zdorovye', zh: 'yiliao', ar: 'sihha', hi: 'swasthya' },
  'EDUCATION_ECOLES': { fr: 'education', en: 'education', es: 'educacion', de: 'bildung', pt: 'educacao', ru: 'obrazovanie', zh: 'jiaoyu', ar: 'talim', hi: 'shiksha' },
  'RECHERCHE_EMPLOI': { fr: 'emploi', en: 'jobs', es: 'empleo', de: 'arbeit', pt: 'emprego', ru: 'rabota', zh: 'gongzuo', ar: 'amal', hi: 'naukri' },
  'FISCALITE_LOCALE': { fr: 'fiscal', en: 'tax', es: 'fiscal', de: 'steuer', pt: 'fiscal', ru: 'nalog', zh: 'shuiwu', ar: 'dariba', hi: 'kar' },
  'ASSURANCES': { fr: 'assurance', en: 'insurance', es: 'seguro', de: 'versicherung', pt: 'seguro', ru: 'strakhovanie', zh: 'baoxian', ar: 'tamin', hi: 'bima' },
  'TRANSPORT': { fr: 'transport', en: 'transport', es: 'transporte', de: 'transport', pt: 'transporte', ru: 'transport', zh: 'jiaotong', ar: 'naql', hi: 'parivahan' },
  'CULTURE_INTEGRATION': { fr: 'integration', en: 'integration', es: 'integracion', de: 'integration', pt: 'integracao', ru: 'integratsiya', zh: 'ronghe', ar: 'indimaj', hi: 'ekikaran' },
  'RETRAITE_ETRANGER': { fr: 'retraite', en: 'retirement', es: 'jubilacion', de: 'rente', pt: 'aposentadoria', ru: 'pensiya', zh: 'tuixiu', ar: 'taqaud', hi: 'sevanivrutti' },
  'OUVERTURE_COMPTE_BANCAIRE': { fr: 'banque', en: 'bank', es: 'banco', de: 'bank', pt: 'banco', ru: 'bank', zh: 'yinhang', ar: 'masrif', hi: 'bank' },
  // Transport specialties that appear in Firestore
  'TRAN_PROBLEMES_AERIENS': { fr: 'aerien', en: 'flights', es: 'aereo', de: 'flug', pt: 'aereo', ru: 'aviaperelety', zh: 'hangkong', ar: 'tayaran', hi: 'udaan' },
  'AUTRE_PRECISER': { fr: 'conseil', en: 'advice', es: 'consejo', de: 'beratung', pt: 'conselho', ru: 'konsultatsiya', zh: 'zixun', ar: 'nashiha', hi: 'salah' },
  'TRAN_BAGAGES_PERDUS_ENDOMMAGES': { fr: 'bagages', en: 'luggage', es: 'equipaje', de: 'gepaeck', pt: 'bagagem', ru: 'bagazh', zh: 'xingli', ar: 'amtia', hi: 'saman' },
};

function slugify(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function getSpecialtySlug(code, lang) {
  const tl = lang === 'ch' ? 'zh' : lang;
  // Try exact match
  if (SPECIALTY_SLUGS[code]?.[tl]) return SPECIALTY_SLUGS[code][tl];
  // Try normalized (camelCase → SCREAMING_SNAKE_CASE)
  const normalized = code.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  if (SPECIALTY_SLUGS[normalized]?.[tl]) return SPECIALTY_SLUGS[normalized][tl];
  // Fallback: slugify first 12 chars
  return slugify(code).substring(0, 12) || 'conseil';
}

function generateSlugs(profile, shortId) {
  const slugs = {};
  const firstName = profile.firstName || profile.fullName?.split(' ')[0] || 'provider';
  const role = profile.role || profile.type || 'lawyer';
  const countryCode = normalizeCountryCode(profile.country);
  const providerType = (role === 'expat' || role === 'expatrie') ? 'expat' : 'lawyer';
  const specialtyCode = providerType === 'lawyer'
    ? (Array.isArray(profile.specialties) ? profile.specialties[0] : '')
    : (Array.isArray(profile.helpTypes) ? profile.helpTypes[0] : '');
  const nameSlug = slugify(firstName);

  for (const lang of LANGUAGES) {
    const tl = lang === 'ch' ? 'zh' : lang;
    const urlLang = lang === 'ch' ? 'zh' : lang;
    const roleWord = ROLE_TRANSLATIONS[providerType]?.[tl] || providerType;
    const countryWord = COUNTRY_TRANSLATIONS[countryCode]?.[tl] || slugify(countryCode);
    const locale = DEFAULT_LOCALES[lang];
    const roleCountry = `${roleWord}-${countryWord}`;
    const specialtySlug = specialtyCode ? getSpecialtySlug(specialtyCode, lang) : '';

    let namePart;
    if (specialtySlug) {
      const full = `${nameSlug}-${specialtySlug}-${shortId}`;
      namePart = (`${roleCountry}/${full}`).length > 50 ? `${nameSlug}-${shortId}` : full;
    } else {
      namePart = `${nameSlug}-${shortId}`;
    }
    slugs[lang] = `${urlLang}-${locale}/${roleCountry}/${namePart}`;
  }
  return slugs;
}

async function main() {
  const snapshot = await db.collection('sos_profiles').get();
  console.log(`\n📊 Total profiles: ${snapshot.docs.length}\n`);

  let totalChanged = 0;
  let totalSkipped = 0;
  const examples = [];
  const missingCountries = new Set();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.shortId) { totalSkipped++; continue; }

    const countryCode = normalizeCountryCode(data.country);
    if (!COUNTRY_TRANSLATIONS[countryCode]) missingCountries.add(`${data.country} → ${countryCode}`);

    const newSlugs = generateSlugs(data, data.shortId);
    const oldSlugFr = data.slugs?.fr || '';
    if (oldSlugFr !== newSlugs.fr) {
      totalChanged++;
      if (examples.length < 10) {
        examples.push({
          name: data.firstName || 'N/A',
          type: data.type || data.role || 'N/A',
          country: data.country,
          specialty: (data.specialties || data.helpTypes || [])[0] || 'none',
          old: oldSlugFr,
          newFr: newSlugs.fr,
          newEn: newSlugs.en,
          newAr: newSlugs.ar,
        });
      }
    }
  }

  if (missingCountries.size > 0) {
    console.log(`⚠️  Missing country translations: ${[...missingCountries].join(', ')}\n`);
  }

  console.log(`🔄 Would change: ${totalChanged} / ${snapshot.docs.length} (${totalSkipped} skipped)\n`);

  for (const ex of examples) {
    console.log(`👤 ${ex.name} (${ex.type}) — ${ex.country} — ${ex.specialty}`);
    console.log(`   OLD FR: ${ex.old}`);
    console.log(`   NEW FR: ${ex.newFr}`);
    console.log(`   NEW EN: ${ex.newEn}`);
    console.log(`   NEW AR: ${ex.newAr}`);
    console.log('');
  }

  if (APPLY) {
    console.log('\n🚀 APPLYING MIGRATION...\n');
    let batch = db.batch();
    let batchCount = 0;
    let applied = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.shortId) continue;

      const newSlugs = generateSlugs(data, data.shortId);
      const oldSlugFr = data.slugs?.fr || '';
      if (oldSlugFr === newSlugs.fr) continue;

      const updates = { slugs: newSlugs, slugVersion: (data.slugVersion || 1) + 1 };

      // Save old slugs for 301 redirects
      if (data.slugs && Object.keys(data.slugs).length > 0) {
        const previousSlugs = data.previousSlugs || [];
        previousSlugs.push({
          slugs: data.slugs,
          migratedAt: new Date().toISOString(),
          version: data.slugVersion || 1,
        });
        updates.previousSlugs = previousSlugs;
      }

      batch.update(doc.ref, updates);
      batchCount++;
      applied++;

      if (batchCount >= 400) {
        await batch.commit();
        console.log(`   ✅ Committed batch of ${batchCount}`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✅ Committed final batch of ${batchCount}`);
    }

    console.log(`\n✅ Migration complete: ${applied} profiles updated`);
  } else {
    console.log('ℹ️  DRY RUN — no changes applied. Run with --apply to apply.');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

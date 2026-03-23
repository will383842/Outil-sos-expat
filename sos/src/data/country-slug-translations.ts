/**
 * Country slug translations for SEO-friendly URLs
 * Used to generate URLs like /fr-fr/avocats-en-thailande/
 *
 * Format: ISO country code -> { lang: "url-slug" }
 * All slugs are lowercase, accents removed (NFD normalized), spaces -> hyphens
 * zh/ar/hi use romanized names (pinyin, romanized Arabic, romanized Hindi)
 *
 * Covers 62+ Firestore countries + 50+ major countries for future growth
 */

export const COUNTRY_SLUG_TRANSLATIONS: Record<string, Record<string, string>> = {
  // =============================================
  // FIRESTORE COUNTRIES (62 active)
  // =============================================

  AE: {
    fr: 'emirats-arabes-unis', en: 'united-arab-emirates', es: 'emiratos-arabes', de: 'vae',
    pt: 'emirados-arabes', ru: 'oae', zh: 'alianqiu', ar: 'al-imarat', hi: 'sanyukt-arab',
  },
  AL: {
    fr: 'albanie', en: 'albania', es: 'albania', de: 'albanien',
    pt: 'albania', ru: 'albaniya', zh: 'aerbaniya', ar: 'albania', hi: 'albaniya',
  },
  AO: {
    fr: 'angola', en: 'angola', es: 'angola', de: 'angola',
    pt: 'angola', ru: 'angola', zh: 'angola', ar: 'angola', hi: 'angola',
  },
  AR: {
    fr: 'argentine', en: 'argentina', es: 'argentina', de: 'argentinien',
    pt: 'argentina', ru: 'argentina', zh: 'agenting', ar: 'al-arjantin', hi: 'arjantina',
  },
  AU: {
    fr: 'australie', en: 'australia', es: 'australia', de: 'australien',
    pt: 'australia', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia',
  },
  BE: {
    fr: 'belgique', en: 'belgium', es: 'belgica', de: 'belgien',
    pt: 'belgica', ru: 'belgiya', zh: 'bilishi', ar: 'beljika', hi: 'beljiyam',
  },
  BR: {
    fr: 'bresil', en: 'brazil', es: 'brasil', de: 'brasilien',
    pt: 'brasil', ru: 'braziliya', zh: 'baxi', ar: 'al-brazil', hi: 'brazil',
  },
  CA: {
    fr: 'canada', en: 'canada', es: 'canada', de: 'kanada',
    pt: 'canada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'kanada',
  },
  CH: {
    fr: 'suisse', en: 'switzerland', es: 'suiza', de: 'schweiz',
    pt: 'suica', ru: 'shveytsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland',
  },
  CI: {
    fr: 'cote-d-ivoire', en: 'ivory-coast', es: 'costa-de-marfil', de: 'elfenbeinkueste',
    pt: 'costa-do-marfim', ru: 'kot-divuar', zh: 'ketediwa', ar: 'kot-difuar', hi: 'ivory-coast',
  },
  CM: {
    fr: 'cameroun', en: 'cameroon', es: 'camerun', de: 'kamerun',
    pt: 'camaroes', ru: 'kamerun', zh: 'kamailong', ar: 'al-kamirun', hi: 'kamerun',
  },
  CO: {
    fr: 'colombie', en: 'colombia', es: 'colombia', de: 'kolumbien',
    pt: 'colombia', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kulumbiya', hi: 'kolambiya',
  },
  CZ: {
    fr: 'tchequie', en: 'czech-republic', es: 'chequia', de: 'tschechien',
    pt: 'tchequie', ru: 'chekhiya', zh: 'jieke', ar: 'tshik', hi: 'chek-ganatantra',
  },
  DE: {
    fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland',
    pt: 'alemanha', ru: 'germaniya', zh: 'deguo', ar: 'almanya', hi: 'jarmani',
  },
  DJ: {
    fr: 'djibouti', en: 'djibouti', es: 'yibuti', de: 'dschibuti',
    pt: 'djibuti', ru: 'dzhibuti', zh: 'jibuti', ar: 'jibuti', hi: 'jibuti',
  },
  DO: {
    fr: 'republique-dominicaine', en: 'dominican-republic', es: 'rep-dominicana', de: 'dominikanische-rep',
    pt: 'rep-dominicana', ru: 'dominikana', zh: 'duominijia', ar: 'al-dominikan', hi: 'dominikan',
  },
  DZ: {
    fr: 'algerie', en: 'algeria', es: 'argelia', de: 'algerien',
    pt: 'argelia', ru: 'alzhir', zh: 'aerjiliya', ar: 'al-jazair', hi: 'aljeriya',
  },
  EE: {
    fr: 'estonie', en: 'estonia', es: 'estonia', de: 'estland',
    pt: 'estonia', ru: 'estoniya', zh: 'aishaniya', ar: 'istunia', hi: 'estoniya',
  },
  EG: {
    fr: 'egypte', en: 'egypt', es: 'egipto', de: 'aegypten',
    pt: 'egito', ru: 'yegipet', zh: 'aiji', ar: 'misr', hi: 'misr',
  },
  ES: {
    fr: 'espagne', en: 'spain', es: 'espana', de: 'spanien',
    pt: 'espanha', ru: 'ispaniya', zh: 'xibanya', ar: 'isbanya', hi: 'spain',
  },
  ET: {
    fr: 'ethiopie', en: 'ethiopia', es: 'etiopia', de: 'aethiopien',
    pt: 'etiopia', ru: 'efiopiya', zh: 'aisaiobiya', ar: 'ithyubya', hi: 'ithiyopiya',
  },
  FR: {
    fr: 'france', en: 'france', es: 'francia', de: 'frankreich',
    pt: 'franca', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'phrans',
  },
  GA: {
    fr: 'gabon', en: 'gabon', es: 'gabon', de: 'gabun',
    pt: 'gabao', ru: 'gabon', zh: 'jiapeng', ar: 'al-gabun', hi: 'gabon',
  },
  GB: {
    fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', de: 'vereinigtes-koenigreich',
    pt: 'reino-unido', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britaniya', hi: 'britain',
  },
  GF: {
    fr: 'guyane-francaise', en: 'french-guiana', es: 'guayana-francesa', de: 'franz-guayana',
    pt: 'guiana-francesa', ru: 'fr-gviana', zh: 'faguiana', ar: 'ghiyana-fr', hi: 'french-guiana',
  },
  GH: {
    fr: 'ghana', en: 'ghana', es: 'ghana', de: 'ghana',
    pt: 'gana', ru: 'gana', zh: 'jiana', ar: 'ghana', hi: 'ghana',
  },
  GP: {
    fr: 'guadeloupe', en: 'guadeloupe', es: 'guadalupe', de: 'guadeloupe',
    pt: 'guadalupe', ru: 'gvadelupa', zh: 'guadeluopu', ar: 'ghuadalub', hi: 'guadeloupe',
  },
  HK: {
    fr: 'hong-kong', en: 'hong-kong', es: 'hong-kong', de: 'hongkong',
    pt: 'hong-kong', ru: 'gonkong', zh: 'xianggang', ar: 'hung-kung', hi: 'hong-kong',
  },
  HR: {
    fr: 'croatie', en: 'croatia', es: 'croacia', de: 'kroatien',
    pt: 'croacia', ru: 'khorvatiya', zh: 'keluodiya', ar: 'kurwatiya', hi: 'kroeshiya',
  },
  HT: {
    fr: 'haiti', en: 'haiti', es: 'haiti', de: 'haiti',
    pt: 'haiti', ru: 'gaiti', zh: 'haidi', ar: 'hayti', hi: 'haiti',
  },
  IE: {
    fr: 'irlande', en: 'ireland', es: 'irlanda', de: 'irland',
    pt: 'irlanda', ru: 'irlandiya', zh: 'aierlan', ar: 'irlanda', hi: 'ayarland',
  },
  IL: {
    fr: 'israel', en: 'israel', es: 'israel', de: 'israel',
    pt: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel',
  },
  IN: {
    fr: 'inde', en: 'india', es: 'india', de: 'indien',
    pt: 'india', ru: 'indiya', zh: 'yindu', ar: 'al-hind', hi: 'bharat',
  },
  IT: {
    fr: 'italie', en: 'italy', es: 'italia', de: 'italien',
    pt: 'italia', ru: 'italiya', zh: 'yidali', ar: 'italiya', hi: 'italy',
  },
  JP: {
    fr: 'japon', en: 'japan', es: 'japon', de: 'japan',
    pt: 'japao', ru: 'yaponiya', zh: 'riben', ar: 'al-yaban', hi: 'japan',
  },
  KE: {
    fr: 'kenya', en: 'kenya', es: 'kenia', de: 'kenia',
    pt: 'quenia', ru: 'keniya', zh: 'kenniya', ar: 'kinya', hi: 'kenya',
  },
  KH: {
    fr: 'cambodge', en: 'cambodia', es: 'camboya', de: 'kambodscha',
    pt: 'camboja', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambodya', hi: 'kambodia',
  },
  KR: {
    fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', de: 'suedkorea',
    pt: 'coreia-do-sul', ru: 'yuzh-koreya', zh: 'hanguo', ar: 'kurya-janub', hi: 'dakshin-koriya',
  },
  KW: {
    fr: 'koweit', en: 'kuwait', es: 'kuwait', de: 'kuwait',
    pt: 'kuwait', ru: 'kuveyt', zh: 'keweite', ar: 'al-kuwayt', hi: 'kuwait',
  },
  KZ: {
    fr: 'kazakhstan', en: 'kazakhstan', es: 'kazajistan', de: 'kasachstan',
    pt: 'cazaquistao', ru: 'kazakhstan', zh: 'hasakesitan', ar: 'kazakhistan', hi: 'kazakhstan',
  },
  LB: {
    fr: 'liban', en: 'lebanon', es: 'libano', de: 'libanon',
    pt: 'libano', ru: 'livan', zh: 'libanen', ar: 'lubnan', hi: 'lebanon',
  },
  MA: {
    fr: 'maroc', en: 'morocco', es: 'marruecos', de: 'marokko',
    pt: 'marrocos', ru: 'marokko', zh: 'moluoge', ar: 'al-maghrib', hi: 'morocco',
  },
  MD: {
    fr: 'moldavie', en: 'moldova', es: 'moldavia', de: 'moldawien',
    pt: 'moldavia', ru: 'moldaviya', zh: 'moerdowa', ar: 'muldufa', hi: 'moldova',
  },
  MU: {
    fr: 'maurice', en: 'mauritius', es: 'mauricio', de: 'mauritius',
    pt: 'mauricio', ru: 'mavrikiy', zh: 'maoliqiusi', ar: 'muritus', hi: 'mauritius',
  },
  MX: {
    fr: 'mexique', en: 'mexico', es: 'mexico', de: 'mexiko',
    pt: 'mexico', ru: 'meksika', zh: 'moxige', ar: 'al-maksik', hi: 'mexico',
  },
  NI: {
    fr: 'nicaragua', en: 'nicaragua', es: 'nicaragua', de: 'nicaragua',
    pt: 'nicaragua', ru: 'nikaragua', zh: 'nilajia', ar: 'nikaragwa', hi: 'nicaragua',
  },
  NL: {
    fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', de: 'niederlande',
    pt: 'paises-baixos', ru: 'niderlandy', zh: 'helan', ar: 'hulanda', hi: 'netherlands',
  },
  PF: {
    fr: 'polynesie-francaise', en: 'french-polynesia', es: 'polinesia-francesa', de: 'franz-polynesien',
    pt: 'polinesia-francesa', ru: 'fr-polineziya', zh: 'fa-bolinixiya', ar: 'bulinizya-fr', hi: 'french-polynesia',
  },
  PL: {
    fr: 'pologne', en: 'poland', es: 'polonia', de: 'polen',
    pt: 'polonia', ru: 'polsha', zh: 'bolan', ar: 'bulanda', hi: 'poland',
  },
  PT: {
    fr: 'portugal', en: 'portugal', es: 'portugal', de: 'portugal',
    pt: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'al-burtughal', hi: 'portugal',
  },
  RO: {
    fr: 'roumanie', en: 'romania', es: 'rumania', de: 'rumaenien',
    pt: 'romenia', ru: 'ruminiya', zh: 'luomaniya', ar: 'rumaniya', hi: 'romania',
  },
  SA: {
    fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', de: 'saudi-arabien',
    pt: 'arabia-saudita', ru: 'saud-araviya', zh: 'shate', ar: 'as-saudiya', hi: 'saudi-arab',
  },
  SE: {
    fr: 'suede', en: 'sweden', es: 'suecia', de: 'schweden',
    pt: 'suecia', ru: 'shvetsiya', zh: 'ruidian', ar: 'as-suwayd', hi: 'sweden',
  },
  SG: {
    fr: 'singapour', en: 'singapore', es: 'singapur', de: 'singapur',
    pt: 'singapura', ru: 'singapur', zh: 'xinjiapo', ar: 'singhafura', hi: 'singapore',
  },
  SN: {
    fr: 'senegal', en: 'senegal', es: 'senegal', de: 'senegal',
    pt: 'senegal', ru: 'senegal', zh: 'saineijiaer', ar: 'as-sinighal', hi: 'senegal',
  },
  TH: {
    fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand',
    pt: 'tailandia', ru: 'tailand', zh: 'taiguo', ar: 'tailand', hi: 'thailand',
  },
  TN: {
    fr: 'tunisie', en: 'tunisia', es: 'tunez', de: 'tunesien',
    pt: 'tunisia', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia',
  },
  TR: {
    fr: 'turquie', en: 'turkey', es: 'turquia', de: 'tuerkei',
    pt: 'turquia', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkiya', hi: 'turkey',
  },
  TT: {
    fr: 'trinite-et-tobago', en: 'trinidad-and-tobago', es: 'trinidad-y-tobago', de: 'trinidad-tobago',
    pt: 'trinidad-e-tobago', ru: 'trinidad-tobago', zh: 'telinida', ar: 'trinidad', hi: 'trinidad-tobago',
  },
  US: {
    fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', de: 'usa',
    pt: 'estados-unidos', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'america',
  },
  ZA: {
    fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', de: 'suedafrika',
    pt: 'africa-do-sul', ru: 'yuar', zh: 'nanfei', ar: 'janub-ifriqya', hi: 'dakshin-africa',
  },
  ZM: {
    fr: 'zambie', en: 'zambia', es: 'zambia', de: 'sambia',
    pt: 'zambia', ru: 'zambiya', zh: 'zanbiya', ar: 'zambiya', hi: 'zambia',
  },

  // =============================================
  // 50+ ADDITIONAL MAJOR COUNTRIES (future growth)
  // =============================================

  AF: {
    fr: 'afghanistan', en: 'afghanistan', es: 'afganistan', de: 'afghanistan',
    pt: 'afeganistao', ru: 'afganistan', zh: 'afuhan', ar: 'afghanistan', hi: 'afghanistan',
  },
  AT: {
    fr: 'autriche', en: 'austria', es: 'austria', de: 'oesterreich',
    pt: 'austria', ru: 'avstriya', zh: 'aodili', ar: 'an-nimsa', hi: 'austria',
  },
  AZ: {
    fr: 'azerbaidjan', en: 'azerbaijan', es: 'azerbaiyan', de: 'aserbaidschan',
    pt: 'azerbaijao', ru: 'azerbaydzhan', zh: 'asetbaijiang', ar: 'azerbayjan', hi: 'azerbaijan',
  },
  BD: {
    fr: 'bangladesh', en: 'bangladesh', es: 'bangladesh', de: 'bangladesch',
    pt: 'bangladesh', ru: 'bangladesh', zh: 'mengjiala', ar: 'bangladesh', hi: 'bangladesh',
  },
  BF: {
    fr: 'burkina-faso', en: 'burkina-faso', es: 'burkina-faso', de: 'burkina-faso',
    pt: 'burkina-faso', ru: 'burkina-faso', zh: 'bujina', ar: 'burkina-fasu', hi: 'burkina-faso',
  },
  BG: {
    fr: 'bulgarie', en: 'bulgaria', es: 'bulgaria', de: 'bulgarien',
    pt: 'bulgaria', ru: 'bolgariya', zh: 'baojialiya', ar: 'bulgharia', hi: 'bulgaria',
  },
  BH: {
    fr: 'bahrein', en: 'bahrain', es: 'barein', de: 'bahrain',
    pt: 'bahrein', ru: 'bakhreyn', zh: 'balin', ar: 'al-bahrayn', hi: 'bahrain',
  },
  BO: {
    fr: 'bolivie', en: 'bolivia', es: 'bolivia', de: 'bolivien',
    pt: 'bolivia', ru: 'boliviya', zh: 'boliweiya', ar: 'bulifya', hi: 'bolivia',
  },
  BY: {
    fr: 'bielorussie', en: 'belarus', es: 'bielorrusia', de: 'belarus',
    pt: 'bielorrussia', ru: 'belarus', zh: 'baieluosi', ar: 'bilarusia', hi: 'belarus',
  },
  CD: {
    fr: 'rd-congo', en: 'dr-congo', es: 'rd-congo', de: 'dr-kongo',
    pt: 'rd-congo', ru: 'dr-kongo', zh: 'gangguomin', ar: 'al-kungu-dim', hi: 'dr-congo',
  },
  CG: {
    fr: 'congo', en: 'congo', es: 'congo', de: 'kongo',
    pt: 'congo', ru: 'kongo', zh: 'ganguo', ar: 'al-kungu', hi: 'congo',
  },
  CL: {
    fr: 'chili', en: 'chile', es: 'chile', de: 'chile',
    pt: 'chile', ru: 'chili', zh: 'zhili', ar: 'tshili', hi: 'chile',
  },
  CN: {
    fr: 'chine', en: 'china', es: 'china', de: 'china',
    pt: 'china', ru: 'kitay', zh: 'zhongguo', ar: 'as-sin', hi: 'chin',
  },
  CR: {
    fr: 'costa-rica', en: 'costa-rica', es: 'costa-rica', de: 'costa-rica',
    pt: 'costa-rica', ru: 'kosta-rika', zh: 'gesidalijia', ar: 'kusta-rika', hi: 'costa-rica',
  },
  CU: {
    fr: 'cuba', en: 'cuba', es: 'cuba', de: 'kuba',
    pt: 'cuba', ru: 'kuba', zh: 'guba', ar: 'kuba', hi: 'cuba',
  },
  CY: {
    fr: 'chypre', en: 'cyprus', es: 'chipre', de: 'zypern',
    pt: 'chipre', ru: 'kipr', zh: 'saipulusi', ar: 'qubrus', hi: 'cyprus',
  },
  DK: {
    fr: 'danemark', en: 'denmark', es: 'dinamarca', de: 'daenemark',
    pt: 'dinamarca', ru: 'daniya', zh: 'danmai', ar: 'ad-danimark', hi: 'denmark',
  },
  EC: {
    fr: 'equateur', en: 'ecuador', es: 'ecuador', de: 'ecuador',
    pt: 'equador', ru: 'ekvador', zh: 'eguaduoer', ar: 'ikwadur', hi: 'ecuador',
  },
  FI: {
    fr: 'finlande', en: 'finland', es: 'finlandia', de: 'finnland',
    pt: 'finlandia', ru: 'finlyandiya', zh: 'fenlan', ar: 'finlanda', hi: 'finland',
  },
  GE: {
    fr: 'georgie', en: 'georgia', es: 'georgia', de: 'georgien',
    pt: 'georgia', ru: 'gruziya', zh: 'gelu-jiya', ar: 'jurjiya', hi: 'georgia',
  },
  GN: {
    fr: 'guinee', en: 'guinea', es: 'guinea', de: 'guinea',
    pt: 'guine', ru: 'gvineya', zh: 'jineiya', ar: 'ghiniya', hi: 'guinea',
  },
  GR: {
    fr: 'grece', en: 'greece', es: 'grecia', de: 'griechenland',
    pt: 'grecia', ru: 'gretsiya', zh: 'xila', ar: 'al-yunan', hi: 'greece',
  },
  GT: {
    fr: 'guatemala', en: 'guatemala', es: 'guatemala', de: 'guatemala',
    pt: 'guatemala', ru: 'gvatemala', zh: 'guadimala', ar: 'ghwatimala', hi: 'guatemala',
  },
  HN: {
    fr: 'honduras', en: 'honduras', es: 'honduras', de: 'honduras',
    pt: 'honduras', ru: 'gonduras', zh: 'hongdulasi', ar: 'hunduras', hi: 'honduras',
  },
  HU: {
    fr: 'hongrie', en: 'hungary', es: 'hungria', de: 'ungarn',
    pt: 'hungria', ru: 'vengriya', zh: 'xiongyali', ar: 'al-majar', hi: 'hungary',
  },
  ID: {
    fr: 'indonesie', en: 'indonesia', es: 'indonesia', de: 'indonesien',
    pt: 'indonesia', ru: 'indoneziya', zh: 'yindunixiya', ar: 'indunisya', hi: 'indonesia',
  },
  IQ: {
    fr: 'irak', en: 'iraq', es: 'irak', de: 'irak',
    pt: 'iraque', ru: 'irak', zh: 'yilake', ar: 'al-iraq', hi: 'iraq',
  },
  IR: {
    fr: 'iran', en: 'iran', es: 'iran', de: 'iran',
    pt: 'irao', ru: 'iran', zh: 'yilang', ar: 'iran', hi: 'iran',
  },
  IS: {
    fr: 'islande', en: 'iceland', es: 'islandia', de: 'island',
    pt: 'islandia', ru: 'islandiya', zh: 'bingdao', ar: 'ayslanda', hi: 'iceland',
  },
  JM: {
    fr: 'jamaique', en: 'jamaica', es: 'jamaica', de: 'jamaika',
    pt: 'jamaica', ru: 'yamayka', zh: 'yamaijia', ar: 'jamayka', hi: 'jamaica',
  },
  JO: {
    fr: 'jordanie', en: 'jordan', es: 'jordania', de: 'jordanien',
    pt: 'jordania', ru: 'iordaniya', zh: 'yuedan', ar: 'al-urdun', hi: 'jordan',
  },
  LK: {
    fr: 'sri-lanka', en: 'sri-lanka', es: 'sri-lanka', de: 'sri-lanka',
    pt: 'sri-lanka', ru: 'shri-lanka', zh: 'silanka', ar: 'sri-lanka', hi: 'shri-lanka',
  },
  LT: {
    fr: 'lituanie', en: 'lithuania', es: 'lituania', de: 'litauen',
    pt: 'lituania', ru: 'litva', zh: 'litaowan', ar: 'litwanya', hi: 'lithuania',
  },
  LU: {
    fr: 'luxembourg', en: 'luxembourg', es: 'luxemburgo', de: 'luxemburg',
    pt: 'luxemburgo', ru: 'lyuksemburg', zh: 'lusenbao', ar: 'luksumburg', hi: 'luxembourg',
  },
  LV: {
    fr: 'lettonie', en: 'latvia', es: 'letonia', de: 'lettland',
    pt: 'letonia', ru: 'latviya', zh: 'latweiya', ar: 'latfiya', hi: 'latvia',
  },
  LY: {
    fr: 'libye', en: 'libya', es: 'libia', de: 'libyen',
    pt: 'libia', ru: 'liviya', zh: 'libiya', ar: 'libiya', hi: 'libya',
  },
  MG: {
    fr: 'madagascar', en: 'madagascar', es: 'madagascar', de: 'madagaskar',
    pt: 'madagascar', ru: 'madagaskar', zh: 'madajiasijia', ar: 'madaghashqar', hi: 'madagascar',
  },
  ML: {
    fr: 'mali', en: 'mali', es: 'mali', de: 'mali',
    pt: 'mali', ru: 'mali', zh: 'mali', ar: 'mali', hi: 'mali',
  },
  MM: {
    fr: 'myanmar', en: 'myanmar', es: 'myanmar', de: 'myanmar',
    pt: 'mianmar', ru: 'myanma', zh: 'miandian', ar: 'myanmar', hi: 'myanmar',
  },
  MN: {
    fr: 'mongolie', en: 'mongolia', es: 'mongolia', de: 'mongolei',
    pt: 'mongolia', ru: 'mongoliya', zh: 'menggu', ar: 'mughuliya', hi: 'mongolia',
  },
  MY: {
    fr: 'malaisie', en: 'malaysia', es: 'malasia', de: 'malaysia',
    pt: 'malasia', ru: 'malayziya', zh: 'malaixiya', ar: 'malizya', hi: 'malaysia',
  },
  MZ: {
    fr: 'mozambique', en: 'mozambique', es: 'mozambique', de: 'mosambik',
    pt: 'mocambique', ru: 'mozambik', zh: 'mosangbike', ar: 'muzambiq', hi: 'mozambique',
  },
  NE: {
    fr: 'niger', en: 'niger', es: 'niger', de: 'niger',
    pt: 'niger', ru: 'niger', zh: 'nirier', ar: 'an-nijar', hi: 'niger',
  },
  NG: {
    fr: 'nigeria', en: 'nigeria', es: 'nigeria', de: 'nigeria',
    pt: 'nigeria', ru: 'nigeriya', zh: 'niriliya', ar: 'nijirya', hi: 'nigeria',
  },
  NO: {
    fr: 'norvege', en: 'norway', es: 'noruega', de: 'norwegen',
    pt: 'noruega', ru: 'norvegiya', zh: 'nuowei', ar: 'an-nurwij', hi: 'norway',
  },
  NP: {
    fr: 'nepal', en: 'nepal', es: 'nepal', de: 'nepal',
    pt: 'nepal', ru: 'nepal', zh: 'niboer', ar: 'nibal', hi: 'nepal',
  },
  NZ: {
    fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', de: 'neuseeland',
    pt: 'nova-zelandia', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'nyuzilenda', hi: 'new-zealand',
  },
  OM: {
    fr: 'oman', en: 'oman', es: 'oman', de: 'oman',
    pt: 'oma', ru: 'oman', zh: 'aman', ar: 'uman', hi: 'oman',
  },
  PA: {
    fr: 'panama', en: 'panama', es: 'panama', de: 'panama',
    pt: 'panama', ru: 'panama', zh: 'banama', ar: 'banama', hi: 'panama',
  },
  PE: {
    fr: 'perou', en: 'peru', es: 'peru', de: 'peru',
    pt: 'peru', ru: 'peru', zh: 'bilu', ar: 'biru', hi: 'peru',
  },
  PH: {
    fr: 'philippines', en: 'philippines', es: 'filipinas', de: 'philippinen',
    pt: 'filipinas', ru: 'filippiny', zh: 'feilvbin', ar: 'al-filibin', hi: 'philippines',
  },
  PK: {
    fr: 'pakistan', en: 'pakistan', es: 'pakistan', de: 'pakistan',
    pt: 'paquistao', ru: 'pakistan', zh: 'bajisitan', ar: 'bakistan', hi: 'pakistan',
  },
  PY: {
    fr: 'paraguay', en: 'paraguay', es: 'paraguay', de: 'paraguay',
    pt: 'paraguai', ru: 'paragvay', zh: 'balaguai', ar: 'barghway', hi: 'paraguay',
  },
  QA: {
    fr: 'qatar', en: 'qatar', es: 'catar', de: 'katar',
    pt: 'catar', ru: 'katar', zh: 'kataer', ar: 'qatar', hi: 'qatar',
  },
  RS: {
    fr: 'serbie', en: 'serbia', es: 'serbia', de: 'serbien',
    pt: 'servia', ru: 'serbiya', zh: 'saierweiya', ar: 'sirbya', hi: 'serbia',
  },
  RU: {
    fr: 'russie', en: 'russia', es: 'rusia', de: 'russland',
    pt: 'russia', ru: 'rossiya', zh: 'eluosi', ar: 'rusya', hi: 'russia',
  },
  RW: {
    fr: 'rwanda', en: 'rwanda', es: 'ruanda', de: 'ruanda',
    pt: 'ruanda', ru: 'ruanda', zh: 'luwanda', ar: 'ruwanda', hi: 'rwanda',
  },
  SD: {
    fr: 'soudan', en: 'sudan', es: 'sudan', de: 'sudan',
    pt: 'sudao', ru: 'sudan', zh: 'sudan', ar: 'as-sudan', hi: 'sudan',
  },
  SI: {
    fr: 'slovenie', en: 'slovenia', es: 'eslovenia', de: 'slowenien',
    pt: 'eslovenia', ru: 'sloveniya', zh: 'siluowenniya', ar: 'slufinia', hi: 'slovenia',
  },
  SK: {
    fr: 'slovaquie', en: 'slovakia', es: 'eslovaquia', de: 'slowakei',
    pt: 'eslovaquia', ru: 'slovakiya', zh: 'siluofake', ar: 'slufakya', hi: 'slovakia',
  },
  SY: {
    fr: 'syrie', en: 'syria', es: 'siria', de: 'syrien',
    pt: 'siria', ru: 'siriya', zh: 'xuliya', ar: 'suriya', hi: 'syria',
  },
  TD: {
    fr: 'tchad', en: 'chad', es: 'chad', de: 'tschad',
    pt: 'chade', ru: 'chad', zh: 'zhade', ar: 'tshad', hi: 'chad',
  },
  TG: {
    fr: 'togo', en: 'togo', es: 'togo', de: 'togo',
    pt: 'togo', ru: 'togo', zh: 'duoge', ar: 'tughu', hi: 'togo',
  },
  TW: {
    fr: 'taiwan', en: 'taiwan', es: 'taiwan', de: 'taiwan',
    pt: 'taiwan', ru: 'tayvan', zh: 'taiwan', ar: 'taywan', hi: 'taiwan',
  },
  TZ: {
    fr: 'tanzanie', en: 'tanzania', es: 'tanzania', de: 'tansania',
    pt: 'tanzania', ru: 'tanzaniya', zh: 'tansaniya', ar: 'tanzania', hi: 'tanzania',
  },
  UA: {
    fr: 'ukraine', en: 'ukraine', es: 'ucrania', de: 'ukraine',
    pt: 'ucrania', ru: 'ukraina', zh: 'wukelan', ar: 'ukraniya', hi: 'ukraine',
  },
  UG: {
    fr: 'ouganda', en: 'uganda', es: 'uganda', de: 'uganda',
    pt: 'uganda', ru: 'uganda', zh: 'wuganda', ar: 'ughanda', hi: 'uganda',
  },
  UY: {
    fr: 'uruguay', en: 'uruguay', es: 'uruguay', de: 'uruguay',
    pt: 'uruguai', ru: 'urugvay', zh: 'wulagui', ar: 'urughway', hi: 'uruguay',
  },
  UZ: {
    fr: 'ouzbekistan', en: 'uzbekistan', es: 'uzbekistan', de: 'usbekistan',
    pt: 'uzbequistao', ru: 'uzbekistan', zh: 'wuzibieke', ar: 'uzbakistan', hi: 'uzbekistan',
  },
  VE: {
    fr: 'venezuela', en: 'venezuela', es: 'venezuela', de: 'venezuela',
    pt: 'venezuela', ru: 'venesuela', zh: 'weineiruila', ar: 'finzwila', hi: 'venezuela',
  },
  VN: {
    fr: 'vietnam', en: 'vietnam', es: 'vietnam', de: 'vietnam',
    pt: 'vietna', ru: 'vyetnam', zh: 'yuenan', ar: 'fitnam', hi: 'vietnam',
  },
  ZW: {
    fr: 'zimbabwe', en: 'zimbabwe', es: 'zimbabue', de: 'simbabwe',
    pt: 'zimbabue', ru: 'zimbabve', zh: 'jinbabuwei', ar: 'zimbabwi', hi: 'zimbabwe',
  },
};

/**
 * Get translated country slug for a given ISO code and language.
 * Falls back to English name, then to lowercase country code.
 *
 * @param countryCode - ISO 3166-1 alpha-2 code (e.g. "FR", "TH")
 * @param lang - Language code (fr, en, es, de, pt, ru, zh, ar, hi). "ch" is aliased to "zh".
 */
export function getCountrySlug(countryCode: string, lang: string): string {
  const tl = lang === 'ch' ? 'zh' : lang;
  return (
    COUNTRY_SLUG_TRANSLATIONS[countryCode?.toUpperCase()]?.[tl] ||
    COUNTRY_SLUG_TRANSLATIONS[countryCode?.toUpperCase()]?.['en'] ||
    countryCode?.toLowerCase() ||
    'unknown'
  );
}

/**
 * Reverse lookup: find country code from a slug in any language.
 * Used for URL parsing: "thailande" -> "TH", "etats-unis" -> "US"
 *
 * @param slug - URL slug to look up (e.g. "thailande", "germany")
 * @returns ISO country code or null if not found
 */
export function getCountryCodeFromSlug(slug: string): string | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  for (const [code, translations] of Object.entries(COUNTRY_SLUG_TRANSLATIONS)) {
    for (const translatedSlug of Object.values(translations)) {
      if (translatedSlug === normalized) {
        return code;
      }
    }
  }

  // Fallback: check if slug is itself a valid country code
  const upper = normalized.toUpperCase();
  if (COUNTRY_SLUG_TRANSLATIONS[upper]) {
    return upper;
  }

  return null;
}

/**
 * Get all slugs for a country (all languages).
 * Useful for generating alternate URL hreflang tags.
 */
export function getAllSlugsForCountry(countryCode: string): Record<string, string> | null {
  return COUNTRY_SLUG_TRANSLATIONS[countryCode?.toUpperCase()] || null;
}

/**
 * Get all available country codes.
 */
export function getAvailableCountryCodes(): string[] {
  return Object.keys(COUNTRY_SLUG_TRANSLATIONS);
}

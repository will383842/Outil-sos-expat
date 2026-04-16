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
  BA: {
    fr: 'bosnie-herzegovine', en: 'bosnia-and-herzegovina', es: 'bosnia-y-herzegovina', de: 'bosnien-herzegowina',
    pt: 'bosnia-herzegovina', ru: 'bosniya', zh: 'bosniya', ar: 'al-busna', hi: 'bosnia',
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

  // =============================================
  // REMAINING COUNTRIES & TERRITORIES (to reach 197+)
  // =============================================

  AD: {
    fr: 'andorre', en: 'andorra', es: 'andorra', de: 'andorra',
    pt: 'andorra', ru: 'andorra', zh: 'andaoer', ar: 'andura', hi: 'andorra',
  },
  AG: {
    fr: 'antigua-et-barbuda', en: 'antigua-and-barbuda', es: 'antigua-y-barbuda', de: 'antigua-barbuda',
    pt: 'antigua-e-barbuda', ru: 'antigua-barbuda', zh: 'antigua', ar: 'antigua', hi: 'antigua-barbuda',
  },
  AI: {
    fr: 'anguilla', en: 'anguilla', es: 'anguila', de: 'anguilla',
    pt: 'anguilla', ru: 'angilya', zh: 'anguila', ar: 'anghila', hi: 'anguilla',
  },
  AM: {
    fr: 'armenie', en: 'armenia', es: 'armenia', de: 'armenien',
    pt: 'armenia', ru: 'armeniya', zh: 'yameinniya', ar: 'arminiya', hi: 'armenia',
  },
  AQ: {
    fr: 'antarctique', en: 'antarctica', es: 'antartida', de: 'antarktis',
    pt: 'antartida', ru: 'antarktida', zh: 'nanji', ar: 'antartika', hi: 'antarctica',
  },
  AS: {
    fr: 'samoa-americaines', en: 'american-samoa', es: 'samoa-americana', de: 'amerik-samoa',
    pt: 'samoa-americana', ru: 'amer-samoa', zh: 'mei-samoya', ar: 'samwa-amrik', hi: 'american-samoa',
  },
  AW: {
    fr: 'aruba', en: 'aruba', es: 'aruba', de: 'aruba',
    pt: 'aruba', ru: 'aruba', zh: 'aluba', ar: 'aruba', hi: 'aruba',
  },
  AX: {
    fr: 'iles-aland', en: 'aland-islands', es: 'islas-aland', de: 'alandinseln',
    pt: 'ilhas-aland', ru: 'alandy', zh: 'aolan', ar: 'juzur-aland', hi: 'aland',
  },
  BB: {
    fr: 'barbade', en: 'barbados', es: 'barbados', de: 'barbados',
    pt: 'barbados', ru: 'barbados', zh: 'babaduosi', ar: 'barbadus', hi: 'barbados',
  },
  BI: {
    fr: 'burundi', en: 'burundi', es: 'burundi', de: 'burundi',
    pt: 'burundi', ru: 'burundi', zh: 'bulongdi', ar: 'burundi', hi: 'burundi',
  },
  BJ: {
    fr: 'benin', en: 'benin', es: 'benin', de: 'benin',
    pt: 'benim', ru: 'benin', zh: 'beining', ar: 'binin', hi: 'benin',
  },
  BL: {
    fr: 'saint-barthelemy', en: 'saint-barthelemy', es: 'san-bartolome', de: 'saint-barthelemy',
    pt: 'sao-bartolomeu', ru: 'sen-bartelemi', zh: 'shengbatailemi', ar: 'san-bartilimi', hi: 'saint-barthelemy',
  },
  BM: {
    fr: 'bermudes', en: 'bermuda', es: 'bermudas', de: 'bermuda',
    pt: 'bermudas', ru: 'bermudskiye', zh: 'baimuda', ar: 'bermuda', hi: 'bermuda',
  },
  BN: {
    fr: 'brunei', en: 'brunei', es: 'brunei', de: 'brunei',
    pt: 'brunei', ru: 'bruney', zh: 'wenlai', ar: 'brunay', hi: 'brunei',
  },
  BQ: {
    fr: 'bonaire', en: 'bonaire', es: 'bonaire', de: 'bonaire',
    pt: 'bonaire', ru: 'boner', zh: 'bonaire', ar: 'bunir', hi: 'bonaire',
  },
  BS: {
    fr: 'bahamas', en: 'bahamas', es: 'bahamas', de: 'bahamas',
    pt: 'bahamas', ru: 'bagamy', zh: 'bahama', ar: 'al-bahama', hi: 'bahamas',
  },
  BT: {
    fr: 'bhoutan', en: 'bhutan', es: 'butan', de: 'bhutan',
    pt: 'butao', ru: 'butan', zh: 'budan', ar: 'bhutan', hi: 'bhutan',
  },
  BV: {
    fr: 'ile-bouvet', en: 'bouvet-island', es: 'isla-bouvet', de: 'bouvetinsel',
    pt: 'ilha-bouvet', ru: 'ostrov-buve', zh: 'buwei', ar: 'jazirat-bufi', hi: 'bouvet-island',
  },
  BW: {
    fr: 'botswana', en: 'botswana', es: 'botsuana', de: 'botswana',
    pt: 'botsuana', ru: 'botsvana', zh: 'bociwana', ar: 'butswana', hi: 'botswana',
  },
  BZ: {
    fr: 'belize', en: 'belize', es: 'belice', de: 'belize',
    pt: 'belize', ru: 'beliz', zh: 'bolizi', ar: 'biliz', hi: 'belize',
  },
  CC: {
    fr: 'iles-cocos', en: 'cocos-islands', es: 'islas-cocos', de: 'kokosinseln',
    pt: 'ilhas-cocos', ru: 'kokosovye', zh: 'kekesi', ar: 'juzur-kukus', hi: 'cocos-islands',
  },
  CF: {
    fr: 'centrafrique', en: 'central-african-rep', es: 'rep-centroafricana', de: 'zentralafrika',
    pt: 'rep-centro-africana', ru: 'tsar', zh: 'zhongfei', ar: 'ifriqya-wusta', hi: 'central-africa',
  },
  CK: {
    fr: 'iles-cook', en: 'cook-islands', es: 'islas-cook', de: 'cookinseln',
    pt: 'ilhas-cook', ru: 'ostr-kuka', zh: 'kuke', ar: 'juzur-kuk', hi: 'cook-islands',
  },
  CV: {
    fr: 'cap-vert', en: 'cape-verde', es: 'cabo-verde', de: 'kap-verde',
    pt: 'cabo-verde', ru: 'kabo-verde', zh: 'fode', ar: 'al-ras-akhdar', hi: 'cape-verde',
  },
  CW: {
    fr: 'curacao', en: 'curacao', es: 'curazao', de: 'curacao',
    pt: 'curacao', ru: 'kyurasao', zh: 'kulasuo', ar: 'kurasao', hi: 'curacao',
  },
  CX: {
    fr: 'ile-christmas', en: 'christmas-island', es: 'isla-navidad', de: 'weihnachtsinsel',
    pt: 'ilha-christmas', ru: 'ostr-rozhdestva', zh: 'shengdan', ar: 'jazirat-krismus', hi: 'christmas-island',
  },
  DM: {
    fr: 'dominique', en: 'dominica', es: 'dominica', de: 'dominica',
    pt: 'dominica', ru: 'dominika', zh: 'duominike', ar: 'duminika', hi: 'dominica',
  },
  ER: {
    fr: 'erythree', en: 'eritrea', es: 'eritrea', de: 'eritrea',
    pt: 'eritreia', ru: 'eritreya', zh: 'eliteliya', ar: 'iritrya', hi: 'eritrea',
  },
  FJ: {
    fr: 'fidji', en: 'fiji', es: 'fiyi', de: 'fidschi',
    pt: 'fiji', ru: 'fidzhi', zh: 'feiji', ar: 'fiji', hi: 'fiji',
  },
  FK: {
    fr: 'iles-malouines', en: 'falkland-islands', es: 'islas-malvinas', de: 'falklandinseln',
    pt: 'ilhas-malvinas', ru: 'folklendskie', zh: 'fukelan', ar: 'juzur-fulkland', hi: 'falkland-islands',
  },
  FM: {
    fr: 'micronesie', en: 'micronesia', es: 'micronesia', de: 'mikronesien',
    pt: 'micronesia', ru: 'mikroneziya', zh: 'mikeluo', ar: 'mikrunizya', hi: 'micronesia',
  },
  FO: {
    fr: 'iles-feroe', en: 'faroe-islands', es: 'islas-feroe', de: 'faeroeer',
    pt: 'ilhas-faroe', ru: 'farery', zh: 'faluo', ar: 'juzur-faru', hi: 'faroe-islands',
  },
  GD: {
    fr: 'grenade', en: 'grenada', es: 'granada', de: 'grenada',
    pt: 'granada', ru: 'grenada', zh: 'gelinada', ar: 'ghrinada', hi: 'grenada',
  },
  GG: {
    fr: 'guernesey', en: 'guernsey', es: 'guernsey', de: 'guernsey',
    pt: 'guernsey', ru: 'gernsi', zh: 'genxi', ar: 'ghirnzi', hi: 'guernsey',
  },
  GI: {
    fr: 'gibraltar', en: 'gibraltar', es: 'gibraltar', de: 'gibraltar',
    pt: 'gibraltar', ru: 'gibraltar', zh: 'zhibuluotuo', ar: 'jabal-tariq', hi: 'gibraltar',
  },
  GL: {
    fr: 'groenland', en: 'greenland', es: 'groenlandia', de: 'groenland',
    pt: 'groenlandia', ru: 'grenlandiya', zh: 'gelinlan', ar: 'ghrinland', hi: 'greenland',
  },
  GM: {
    fr: 'gambie', en: 'gambia', es: 'gambia', de: 'gambia',
    pt: 'gambia', ru: 'gambiya', zh: 'gangbiya', ar: 'ghambiya', hi: 'gambia',
  },
  GQ: {
    fr: 'guinee-equatoriale', en: 'equatorial-guinea', es: 'guinea-ecuatorial', de: 'aequatorialguinea',
    pt: 'guine-equatorial', ru: 'ekv-gvineya', zh: 'chidao-jineiya', ar: 'ghiniya-ist', hi: 'eq-guinea',
  },
  GS: {
    fr: 'georgie-du-sud', en: 'south-georgia', es: 'georgia-del-sur', de: 'suedgeorgien',
    pt: 'georgia-do-sul', ru: 'yuzh-georgiya', zh: 'nan-qiaozhiya', ar: 'jurjya-janub', hi: 'south-georgia',
  },
  GU: {
    fr: 'guam', en: 'guam', es: 'guam', de: 'guam',
    pt: 'guam', ru: 'guam', zh: 'guandao', ar: 'ghwam', hi: 'guam',
  },
  GW: {
    fr: 'guinee-bissau', en: 'guinea-bissau', es: 'guinea-bisau', de: 'guinea-bissau',
    pt: 'guine-bissau', ru: 'gvineya-bisau', zh: 'jineiya-bisao', ar: 'ghiniya-bisau', hi: 'guinea-bissau',
  },
  GY: {
    fr: 'guyana', en: 'guyana', es: 'guyana', de: 'guyana',
    pt: 'guiana', ru: 'gayana', zh: 'guiyana', ar: 'ghayana', hi: 'guyana',
  },
  HM: {
    fr: 'iles-heard', en: 'heard-island', es: 'isla-heard', de: 'heard-mcdonald',
    pt: 'ilha-heard', ru: 'ostr-kherd', zh: 'hede', ar: 'jazirat-hird', hi: 'heard-island',
  },
  IM: {
    fr: 'ile-de-man', en: 'isle-of-man', es: 'isla-de-man', de: 'insel-man',
    pt: 'ilha-de-man', ru: 'ostr-men', zh: 'mandao', ar: 'jazirat-man', hi: 'isle-of-man',
  },
  IO: {
    fr: 'terr-brit-ocean-ind', en: 'british-indian-ocean', es: 'terr-brit-oceano', de: 'brit-ind-ozean',
    pt: 'terr-brit-oceano', ru: 'brit-ind-okean', zh: 'yindu-yang', ar: 'muhit-hindi-brit', hi: 'british-indian',
  },
  JE: {
    fr: 'jersey', en: 'jersey', es: 'jersey', de: 'jersey',
    pt: 'jersey', ru: 'dzhersi', zh: 'zexi', ar: 'jirzi', hi: 'jersey',
  },
  KG: {
    fr: 'kirghizistan', en: 'kyrgyzstan', es: 'kirguistan', de: 'kirgisistan',
    pt: 'quirguistao', ru: 'kirgiziya', zh: 'jierjisi', ar: 'qirghizstan', hi: 'kyrgyzstan',
  },
  KI: {
    fr: 'kiribati', en: 'kiribati', es: 'kiribati', de: 'kiribati',
    pt: 'kiribati', ru: 'kiribati', zh: 'jilibasi', ar: 'kiribati', hi: 'kiribati',
  },
  KM: {
    fr: 'comores', en: 'comoros', es: 'comoras', de: 'komoren',
    pt: 'comores', ru: 'komory', zh: 'kemoluo', ar: 'juzur-qamar', hi: 'comoros',
  },
  KN: {
    fr: 'saint-kitts', en: 'saint-kitts-nevis', es: 'san-cristobal', de: 'st-kitts-nevis',
    pt: 'sao-cristovao', ru: 'sent-kits', zh: 'shengji', ar: 'sant-kits', hi: 'saint-kitts',
  },
  KP: {
    fr: 'coree-du-nord', en: 'north-korea', es: 'corea-del-norte', de: 'nordkorea',
    pt: 'coreia-do-norte', ru: 'sev-koreya', zh: 'chaoxian', ar: 'kurya-shamal', hi: 'uttar-koriya',
  },
  LA: {
    fr: 'laos', en: 'laos', es: 'laos', de: 'laos',
    pt: 'laos', ru: 'laos', zh: 'laowo', ar: 'lawus', hi: 'laos',
  },
  LC: {
    fr: 'sainte-lucie', en: 'saint-lucia', es: 'santa-lucia', de: 'st-lucia',
    pt: 'santa-lucia', ru: 'sent-lyusiya', zh: 'shengluxiya', ar: 'sant-lusiya', hi: 'saint-lucia',
  },
  LI: {
    fr: 'liechtenstein', en: 'liechtenstein', es: 'liechtenstein', de: 'liechtenstein',
    pt: 'liechtenstein', ru: 'likhtenshtein', zh: 'liezhidun', ar: 'likhtnshtayn', hi: 'liechtenstein',
  },
  LR: {
    fr: 'liberia', en: 'liberia', es: 'liberia', de: 'liberia',
    pt: 'liberia', ru: 'liberiya', zh: 'libiliya', ar: 'librya', hi: 'liberia',
  },
  LS: {
    fr: 'lesotho', en: 'lesotho', es: 'lesoto', de: 'lesotho',
    pt: 'lesoto', ru: 'lesoto', zh: 'laisotuo', ar: 'lisuthu', hi: 'lesotho',
  },
  MC: {
    fr: 'monaco', en: 'monaco', es: 'monaco', de: 'monaco',
    pt: 'monaco', ru: 'monako', zh: 'monage', ar: 'munaku', hi: 'monaco',
  },
  ME: {
    fr: 'montenegro', en: 'montenegro', es: 'montenegro', de: 'montenegro',
    pt: 'montenegro', ru: 'chernogoriya', zh: 'heishang', ar: 'al-jabal-aswad', hi: 'montenegro',
  },
  MF: {
    fr: 'saint-martin', en: 'saint-martin', es: 'san-martin', de: 'saint-martin',
    pt: 'sao-martinho', ru: 'sen-marten', zh: 'shengmading', ar: 'san-martin', hi: 'saint-martin',
  },
  MH: {
    fr: 'iles-marshall', en: 'marshall-islands', es: 'islas-marshall', de: 'marshallinseln',
    pt: 'ilhas-marshall', ru: 'marshallovy', zh: 'mashaoer', ar: 'juzur-marshal', hi: 'marshall-islands',
  },
  MK: {
    fr: 'macedoine-du-nord', en: 'north-macedonia', es: 'macedonia-norte', de: 'nordmazedonien',
    pt: 'macedonia-norte', ru: 'sev-makedoniya', zh: 'bei-masidun', ar: 'maqdunya-shamal', hi: 'north-macedonia',
  },
  MO: {
    fr: 'macao', en: 'macao', es: 'macao', de: 'macau',
    pt: 'macau', ru: 'makao', zh: 'aomen', ar: 'makaw', hi: 'macao',
  },
  MP: {
    fr: 'iles-mariannes', en: 'northern-mariana', es: 'islas-marianas', de: 'nordmariannen',
    pt: 'ilhas-marianas', ru: 'sev-mariany', zh: 'bei-maliana', ar: 'juzur-maryana', hi: 'north-mariana',
  },
  MQ: {
    fr: 'martinique', en: 'martinique', es: 'martinica', de: 'martinique',
    pt: 'martinica', ru: 'martinika', zh: 'matinike', ar: 'martinik', hi: 'martinique',
  },
  MR: {
    fr: 'mauritanie', en: 'mauritania', es: 'mauritania', de: 'mauretanien',
    pt: 'mauritania', ru: 'mavritaniya', zh: 'maolitaniya', ar: 'muritanya', hi: 'mauritania',
  },
  MS: {
    fr: 'montserrat', en: 'montserrat', es: 'montserrat', de: 'montserrat',
    pt: 'montserrat', ru: 'montserrat', zh: 'mengsailate', ar: 'muntsarat', hi: 'montserrat',
  },
  MT: {
    fr: 'malte', en: 'malta', es: 'malta', de: 'malta',
    pt: 'malta', ru: 'malta', zh: 'maerta', ar: 'malta', hi: 'malta',
  },
  MV: {
    fr: 'maldives', en: 'maldives', es: 'maldivas', de: 'malediven',
    pt: 'maldivas', ru: 'maldivy', zh: 'maerdaifu', ar: 'al-maldif', hi: 'maldives',
  },
  MW: {
    fr: 'malawi', en: 'malawi', es: 'malaui', de: 'malawi',
    pt: 'malawi', ru: 'malavi', zh: 'malawei', ar: 'malawi', hi: 'malawi',
  },
  NA: {
    fr: 'namibie', en: 'namibia', es: 'namibia', de: 'namibia',
    pt: 'namibia', ru: 'namibiya', zh: 'namibiya', ar: 'namibya', hi: 'namibia',
  },
  NC: {
    fr: 'nouvelle-caledonie', en: 'new-caledonia', es: 'nueva-caledonia', de: 'neukaledonien',
    pt: 'nova-caledonia', ru: 'novaya-kaledon', zh: 'xin-kaleduo', ar: 'kalidunya-jadid', hi: 'new-caledonia',
  },
  NF: {
    fr: 'ile-norfolk', en: 'norfolk-island', es: 'isla-norfolk', de: 'norfolkinsel',
    pt: 'ilha-norfolk', ru: 'ostr-norfolk', zh: 'nuofuke', ar: 'jazirat-nurfulk', hi: 'norfolk-island',
  },
  NR: {
    fr: 'nauru', en: 'nauru', es: 'nauru', de: 'nauru',
    pt: 'nauru', ru: 'nauru', zh: 'naolu', ar: 'nawru', hi: 'nauru',
  },
  NU: {
    fr: 'niue', en: 'niue', es: 'niue', de: 'niue',
    pt: 'niue', ru: 'niue', zh: 'niuai', ar: 'niyu', hi: 'niue',
  },
  PG: {
    fr: 'papouasie-nv-guinee', en: 'papua-new-guinea', es: 'papua-nueva-guinea', de: 'papua-neuguinea',
    pt: 'papua-nova-guine', ru: 'papua-n-gvineya', zh: 'baxin-jineiya', ar: 'babwa-ghiniya', hi: 'papua-new-guinea',
  },
  PM: {
    fr: 'saint-pierre', en: 'saint-pierre', es: 'san-pedro', de: 'saint-pierre',
    pt: 'sao-pedro', ru: 'sen-pyer', zh: 'shengpiyer', ar: 'san-byir', hi: 'saint-pierre',
  },
  PN: {
    fr: 'pitcairn', en: 'pitcairn', es: 'pitcairn', de: 'pitcairninseln',
    pt: 'pitcairn', ru: 'pitkern', zh: 'pitkaien', ar: 'bitkairn', hi: 'pitcairn',
  },
  PR: {
    fr: 'porto-rico', en: 'puerto-rico', es: 'puerto-rico', de: 'puerto-rico',
    pt: 'porto-rico', ru: 'puerto-riko', zh: 'boetolige', ar: 'burtu-riku', hi: 'puerto-rico',
  },
  PS: {
    fr: 'palestine', en: 'palestine', es: 'palestina', de: 'palaestina',
    pt: 'palestina', ru: 'palestina', zh: 'balesitan', ar: 'filastin', hi: 'palestine',
  },
  PW: {
    fr: 'palaos', en: 'palau', es: 'palaos', de: 'palau',
    pt: 'palau', ru: 'palau', zh: 'belao', ar: 'balaw', hi: 'palau',
  },
  RE: {
    fr: 'la-reunion', en: 'reunion', es: 'reunion', de: 'reunion',
    pt: 'reuniao', ru: 'reunion', zh: 'liuliwang', ar: 'riyunyun', hi: 'reunion',
  },
  SB: {
    fr: 'iles-salomon', en: 'solomon-islands', es: 'islas-salomon', de: 'salomonen',
    pt: 'ilhas-salomao', ru: 'solomonovy', zh: 'suoluomen', ar: 'juzur-suliman', hi: 'solomon-islands',
  },
  SC: {
    fr: 'seychelles', en: 'seychelles', es: 'seychelles', de: 'seychellen',
    pt: 'seicheles', ru: 'seyshely', zh: 'saisheer', ar: 'sayshil', hi: 'seychelles',
  },
  SH: {
    fr: 'sainte-helene', en: 'saint-helena', es: 'santa-elena', de: 'st-helena',
    pt: 'santa-helena', ru: 'sv-yeleny', zh: 'shenghelena', ar: 'sant-hilina', hi: 'saint-helena',
  },
  SJ: {
    fr: 'svalbard', en: 'svalbard', es: 'svalbard', de: 'svalbard',
    pt: 'svalbard', ru: 'shpitsbergen', zh: 'siwaerbade', ar: 'sfalbar', hi: 'svalbard',
  },
  SL: {
    fr: 'sierra-leone', en: 'sierra-leone', es: 'sierra-leona', de: 'sierra-leone',
    pt: 'serra-leoa', ru: 'sierra-leone', zh: 'sailaliang', ar: 'sira-lyun', hi: 'sierra-leone',
  },
  SM: {
    fr: 'saint-marin', en: 'san-marino', es: 'san-marino', de: 'san-marino',
    pt: 'sao-marinho', ru: 'san-marino', zh: 'shengmalino', ar: 'san-marinu', hi: 'san-marino',
  },
  SO: {
    fr: 'somalie', en: 'somalia', es: 'somalia', de: 'somalia',
    pt: 'somalia', ru: 'somali', zh: 'suomali', ar: 'as-sumal', hi: 'somalia',
  },
  SR: {
    fr: 'suriname', en: 'suriname', es: 'surinam', de: 'suriname',
    pt: 'suriname', ru: 'surinam', zh: 'sulinan', ar: 'surinam', hi: 'suriname',
  },
  SS: {
    fr: 'soudan-du-sud', en: 'south-sudan', es: 'sudan-del-sur', de: 'suedsudan',
    pt: 'sudao-do-sul', ru: 'yuzh-sudan', zh: 'nan-sudan', ar: 'sudan-janub', hi: 'south-sudan',
  },
  ST: {
    fr: 'sao-tome-et-principe', en: 'sao-tome-principe', es: 'santo-tome', de: 'sao-tome',
    pt: 'sao-tome-principe', ru: 'san-tome', zh: 'shengtome', ar: 'saw-tumi', hi: 'sao-tome',
  },
  SV: {
    fr: 'el-salvador', en: 'el-salvador', es: 'el-salvador', de: 'el-salvador',
    pt: 'el-salvador', ru: 'salvador', zh: 'saerwaduo', ar: 'as-salfadur', hi: 'el-salvador',
  },
  SX: {
    fr: 'sint-maarten', en: 'sint-maarten', es: 'sint-maarten', de: 'sint-maarten',
    pt: 'sint-maarten', ru: 'sint-marten', zh: 'shengmading-nl', ar: 'sint-martan', hi: 'sint-maarten',
  },
  SZ: {
    fr: 'eswatini', en: 'eswatini', es: 'esuatini', de: 'eswatini',
    pt: 'eswatini', ru: 'esvantini', zh: 'esiwadini', ar: 'iswatini', hi: 'eswatini',
  },
  TC: {
    fr: 'iles-turques', en: 'turks-and-caicos', es: 'islas-turcas', de: 'turks-caicos',
    pt: 'ilhas-turcas', ru: 'terks-kaykos', zh: 'teke-kaike', ar: 'turks-kaykus', hi: 'turks-caicos',
  },
  TF: {
    fr: 'terres-australes-fr', en: 'french-southern', es: 'tierras-australes', de: 'franz-suedgebiete',
    pt: 'terras-austr-fr', ru: 'fr-yuzhn-terr', zh: 'fa-nan-lingdi', ar: 'aradi-janub-fr', hi: 'french-southern',
  },
  TJ: {
    fr: 'tadjikistan', en: 'tajikistan', es: 'tayikistan', de: 'tadschikistan',
    pt: 'tajiquistao', ru: 'tadzhikistan', zh: 'tajikesitan', ar: 'tajikistan', hi: 'tajikistan',
  },
  TK: {
    fr: 'tokelau', en: 'tokelau', es: 'tokelau', de: 'tokelau',
    pt: 'tokelau', ru: 'tokelau', zh: 'tuokelao', ar: 'tukilaw', hi: 'tokelau',
  },
  TL: {
    fr: 'timor-oriental', en: 'timor-leste', es: 'timor-oriental', de: 'osttimor',
    pt: 'timor-leste', ru: 'vost-timor', zh: 'dongdiwen', ar: 'timur-sharq', hi: 'timor-leste',
  },
  TM: {
    fr: 'turkmenistan', en: 'turkmenistan', es: 'turkmenistan', de: 'turkmenistan',
    pt: 'turquemenistao', ru: 'turkmenistan', zh: 'tukumansitan', ar: 'turkmanistan', hi: 'turkmenistan',
  },
  TO: {
    fr: 'tonga', en: 'tonga', es: 'tonga', de: 'tonga',
    pt: 'tonga', ru: 'tonga', zh: 'tangjia', ar: 'tungha', hi: 'tonga',
  },
  TV: {
    fr: 'tuvalu', en: 'tuvalu', es: 'tuvalu', de: 'tuvalu',
    pt: 'tuvalu', ru: 'tuvalu', zh: 'tuwalu', ar: 'tufalu', hi: 'tuvalu',
  },
  UM: {
    fr: 'iles-mineures-us', en: 'us-minor-islands', es: 'islas-menores-us', de: 'us-kleinere-inseln',
    pt: 'ilhas-menores-us', ru: 'malye-ostr-us', zh: 'mei-xiao-dao', ar: 'juzur-amrik', hi: 'us-minor-islands',
  },
  VA: {
    fr: 'vatican', en: 'vatican', es: 'vaticano', de: 'vatikanstadt',
    pt: 'vaticano', ru: 'vatikan', zh: 'fandigang', ar: 'al-fatikan', hi: 'vatican',
  },
  VC: {
    fr: 'saint-vincent', en: 'saint-vincent', es: 'san-vicente', de: 'st-vincent',
    pt: 'sao-vicente', ru: 'sent-vinsent', zh: 'shengwensente', ar: 'sant-finsint', hi: 'saint-vincent',
  },
  VG: {
    fr: 'iles-vierges-brit', en: 'british-virgin-isl', es: 'islas-virgenes-br', de: 'brit-jungfernins',
    pt: 'ilhas-virgens-br', ru: 'brit-virg-ostr', zh: 'ying-weier', ar: 'juzur-brit', hi: 'brit-virgin-isl',
  },
  VI: {
    fr: 'iles-vierges-us', en: 'us-virgin-islands', es: 'islas-virgenes-us', de: 'us-jungferninseln',
    pt: 'ilhas-virgens-us', ru: 'amer-virg-ostr', zh: 'mei-weier', ar: 'juzur-amrik', hi: 'us-virgin-isl',
  },
  VU: {
    fr: 'vanuatu', en: 'vanuatu', es: 'vanuatu', de: 'vanuatu',
    pt: 'vanuatu', ru: 'vanuatu', zh: 'wanuatu', ar: 'fanwatu', hi: 'vanuatu',
  },
  WF: {
    fr: 'wallis-et-futuna', en: 'wallis-and-futuna', es: 'wallis-y-futuna', de: 'wallis-futuna',
    pt: 'wallis-e-futuna', ru: 'uollis-futuna', zh: 'walisi', ar: 'walis-futuna', hi: 'wallis-futuna',
  },
  WS: {
    fr: 'samoa', en: 'samoa', es: 'samoa', de: 'samoa',
    pt: 'samoa', ru: 'samoa', zh: 'samoya', ar: 'samwa', hi: 'samoa',
  },
  XK: {
    fr: 'kosovo', en: 'kosovo', es: 'kosovo', de: 'kosovo',
    pt: 'kosovo', ru: 'kosovo', zh: 'kesuowo', ar: 'kusufu', hi: 'kosovo',
  },
  YE: {
    fr: 'yemen', en: 'yemen', es: 'yemen', de: 'jemen',
    pt: 'iemen', ru: 'yemen', zh: 'yemen', ar: 'al-yaman', hi: 'yemen',
  },
  YT: {
    fr: 'mayotte', en: 'mayotte', es: 'mayotte', de: 'mayotte',
    pt: 'maiote', ru: 'mayotta', zh: 'mayuete', ar: 'mayut', hi: 'mayotte',
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

/**
 * 🌍 GÉNÉRATEUR DE SLUG SEO UNIVERSEL - 197 PAYS
 * =================================================
 * 
 * Structure : /{locale}/{category-country}/{name-specialty}
 * Maximum : 70 caractères garantis
 * 
 * ⚠️ RÈGLE STRICTE : PRÉNOM SEUL dans les slugs (pas de nom de famille)
 * 
 * Exemples :
 * - /fr-th/avocat-thailande/pierre-ecommerce
 * - /en-us/lawyer-thailand/john-immigration
 * - /ar-ae/lawyer-thailand/fawad-business
 * - /fr/avocat-thailande/pierre-ecommerce (fallback)
 */

// ==========================================
// 🌐 LOCALES COMPOSÉES (langue-pays)
// ==========================================

/**
 * Format : {langueDeLinterface}-{paysDeResidence}
 * Ex: fr-th = Interface en français, utilisateur en Thaïlande
 */
export const VALID_LOCALES = [
  // Français dans différents pays
  'fr-fr', 'fr-be', 'fr-ch', 'fr-ca', 'fr-ma', 'fr-dz', 'fr-tn',
  'fr-sn', 'fr-ci', 'fr-cm', 'fr-mg', 'fr-ht', 'fr-lu', 'fr-mc',
  'fr-th', 'fr-vn', 'fr-cn', 'fr-jp', 'fr-kr', 'fr-us', 'fr-gb',
  'fr-de', 'fr-es', 'fr-it', 'fr-pt', 'fr-ae', 'fr-sa', 'fr-eg',
  
  // Anglais dans différents pays
  'en-us', 'en-gb', 'en-ca', 'en-au', 'en-nz', 'en-ie', 'en-za',
  'en-in', 'en-sg', 'en-ae', 'en-hk', 'en-my', 'en-ph', 'en-ng',
  'en-ke', 'en-tz', 'en-ug', 'en-gh', 'en-zw', 'en-bw', 'en-na',
  'en-th', 'en-vn', 'en-cn', 'en-jp', 'en-kr', 'en-fr', 'en-de',
  'en-es', 'en-it', 'en-pt', 'en-br', 'en-mx', 'en-ar', 'en-cl',
  
  // Espagnol
  'es-es', 'es-mx', 'es-ar', 'es-co', 'es-cl', 'es-pe', 'es-ve',
  'es-ec', 'es-gt', 'es-cu', 'es-bo', 'es-do', 'es-hn', 'es-py',
  'es-uy', 'es-cr', 'es-pa', 'es-sv', 'es-ni', 'es-us', 'es-fr',
  'es-th', 'es-cn', 'es-jp', 'es-de', 'es-gb', 'es-it', 'es-pt',
  
  // Allemand
  'de-de', 'de-at', 'de-ch', 'de-li', 'de-be', 'de-lu',
  'de-th', 'de-cn', 'de-jp', 'de-us', 'de-gb', 'de-fr', 'de-es',
  'de-it', 'de-pt', 'de-ae', 'de-au', 'de-nz', 'de-ca', 'de-br',
  
  // Portugais
  'pt-pt', 'pt-br', 'pt-ao', 'pt-mz', 'pt-gw', 'pt-tl', 'pt-cv',
  'pt-st', 'pt-th', 'pt-cn', 'pt-jp', 'pt-us', 'pt-gb', 'pt-fr',
  'pt-de', 'pt-es', 'pt-it', 'pt-ae', 'pt-ch', 'pt-ca', 'pt-au',
  
  // Russe
  'ru-ru', 'ru-by', 'ru-kz', 'ru-kg', 'ru-ua', 'ru-md', 'ru-tj',
  'ru-uz', 'ru-tm', 'ru-am', 'ru-ge', 'ru-az', 'ru-th', 'ru-cn',
  'ru-ae', 'ru-tr', 'ru-de', 'ru-es', 'ru-it', 'ru-fr', 'ru-us',
  
  // Arabe
  'ar-sa', 'ar-ae', 'ar-eg', 'ar-ma', 'ar-dz', 'ar-tn', 'ar-ly',
  'ar-iq', 'ar-sy', 'ar-jo', 'ar-lb', 'ar-ye', 'ar-kw', 'ar-qa',
  'ar-om', 'ar-bh', 'ar-sd', 'ar-mr', 'ar-so', 'ar-dj', 'ar-km',
  'ar-th', 'ar-cn', 'ar-fr', 'ar-de', 'ar-gb', 'ar-us', 'ar-es',
  
  // Chinois
  'zh-cn', 'zh-tw', 'zh-hk', 'zh-sg', 'zh-my', 'zh-th', 'zh-vn',
  'zh-jp', 'zh-kr', 'zh-us', 'zh-ca', 'zh-au', 'zh-nz', 'zh-gb',
  'zh-fr', 'zh-de', 'zh-es', 'zh-it', 'zh-ae', 'zh-id', 'zh-ph',
  
  // Hindi
  'hi-in', 'hi-pk', 'hi-np', 'hi-bd', 'hi-ae', 'hi-sa', 'hi-qa',
  'hi-kw', 'hi-om', 'hi-bh', 'hi-th', 'hi-sg', 'hi-my', 'hi-us',
  'hi-gb', 'hi-ca', 'hi-au', 'hi-nz', 'hi-de', 'hi-fr', 'hi-es',
] as const;

export type ValidLocale = typeof VALID_LOCALES[number];

// ==========================================
// 🗺️ PAYS → CODE ISO 2 LETTRES
// ==========================================

const COUNTRY_TO_ISO_CODE: Record<string, string> = {
  // Europe (44 pays)
  'France': 'fr', 'Allemagne': 'de', 'Royaume-Uni': 'gb', 'Italie': 'it',
  'Espagne': 'es', 'Pays-Bas': 'nl', 'Belgique': 'be', 'Suisse': 'ch',
  'Autriche': 'at', 'Portugal': 'pt', 'Grèce': 'el', 'Suède': 'se',
  'Norvège': 'no', 'Danemark': 'dk', 'Finlande': 'fi', 'Irlande': 'ie',
  'Pologne': 'pl', 'République Tchèque': 'cz', 'Tchéquie': 'cz', 'Hongrie': 'hu',
  'Roumanie': 'ro', 'Bulgarie': 'bg', 'Slovaquie': 'sk', 'Croatie': 'hr',
  'Slovénie': 'si', 'Lituanie': 'lt', 'Lettonie': 'lv', 'Estonie': 'ee',
  'Serbie': 'rs', 'Bosnie-Herzégovine': 'ba', 'Albanie': 'al',
  'Macédoine du Nord': 'mk', 'Monténégro': 'me', 'Kosovo': 'xk',
  'Islande': 'is', 'Luxembourg': 'lu', 'Malte': 'mt', 'Chypre': 'cy',
  'Monaco': 'mc', 'Liechtenstein': 'li', 'Andorre': 'ad', 'Saint-Marin': 'sm',
  'Vatican': 'va', 'Moldavie': 'md', 'Biélorussie': 'by', 'Ukraine': 'ua',

  // Asie (48 pays)
  'Chine': 'cn', 'Japon': 'jp', 'Inde': 'in', 'Thaïlande': 'th',
  'Corée du Sud': 'kr', 'Indonésie': 'id', 'Malaisie': 'my', 'Singapour': 'sg',
  'Vietnam': 'vn', 'Philippines': 'ph', 'Pakistan': 'pk', 'Bangladesh': 'bd',
  'Turquie': 'tr', 'Israël': 'il', 'Émirats Arabes Unis': 'ae',
  'Arabie Saoudite': 'sa', 'Qatar': 'qa', 'Koweït': 'kw', 'Bahreïn': 'bh',
  'Oman': 'om', 'Jordanie': 'jo', 'Liban': 'lb', 'Irak': 'iq', 'Iran': 'ir',
  'Afghanistan': 'af', 'Syrie': 'sy', 'Yémen': 'ye', 'Cambodge': 'kh',
  'Laos': 'la', 'Myanmar': 'mm', 'Népal': 'np', 'Sri Lanka': 'lk',
  'Brunei': 'bn', 'Mongolie': 'mn', 'Tadjikistan': 'tj', 'Kirghizistan': 'kg',
  'Ouzbékistan': 'uz', 'Turkménistan': 'tm', 'Kazakhstan': 'kz',
  'Azerbaïdjan': 'az', 'Géorgie': 'ge', 'Arménie': 'am', 'Bhoutan': 'bt',
  'Maldives': 'mv', 'Corée du Nord': 'kp', 'Timor Oriental': 'tl',
  'Palestine': 'ps', 'Hong Kong': 'hk', 'Macao': 'mo', 'Taïwan': 'tw',

  // Afrique (54 pays)
  'Afrique du Sud': 'za', 'Égypte': 'eg', 'Maroc': 'ma', 'Kenya': 'ke',
  'Tanzanie': 'tz', 'Éthiopie': 'et', 'Ghana': 'gh', 'Nigeria': 'ng',
  'Sénégal': 'sn', "Côte d'Ivoire": 'ci', 'Tunisie': 'tn', 'Algérie': 'dz',
  'Libye': 'ly', 'Soudan': 'sd', 'Ouganda': 'ug', 'Rwanda': 'rw',
  'Mozambique': 'mz', 'Zimbabwe': 'zw', 'Botswana': 'bw', 'Namibie': 'na',
  'Madagascar': 'mg', 'Maurice': 'mu', 'Seychelles': 'sc', 'Angola': 'ao',
  'Cameroun': 'cm', 'Congo': 'cg', 'RD Congo': 'cd', 'République démocratique du Congo': 'cd',
  'Gabon': 'ga', 'Guinée Équatoriale': 'gq', 'Tchad': 'td', 'Niger': 'ne',
  'Mali': 'ml', 'Burkina Faso': 'bf', 'Bénin': 'bj', 'Togo': 'tg',
  'Guinée': 'gn', 'Guinée-Bissau': 'gw', 'Sierra Leone': 'sl', 'Liberia': 'lr',
  'Mauritanie': 'mr', 'Gambie': 'gm', 'Cap-Vert': 'cv',
  'Sao Tomé-et-Principe': 'st', 'São Tomé-et-Príncipe': 'st',
  'Zambie': 'zm', 'Malawi': 'mw', 'Eswatini': 'sz', 'Lesotho': 'ls',
  'Djibouti': 'dj', 'Érythrée': 'er', 'Somalie': 'so', 'Soudan du Sud': 'ss',
  'Burundi': 'bi', 'Comores': 'km',

  // Amérique du Nord (23 pays)
  'États-Unis': 'us', 'Canada': 'ca', 'Mexique': 'mx', 'Cuba': 'cu',
  'République Dominicaine': 'do', 'Jamaïque': 'jm', 'Haïti': 'ht',
  'Bahamas': 'bs', 'Trinité-et-Tobago': 'tt', 'Barbade': 'bb',
  'Sainte-Lucie': 'lc', 'Saint-Vincent-et-les-Grenadines': 'vc',
  'Grenade': 'gd', 'Antigua-et-Barbuda': 'ag', 'Dominique': 'dm',
  'Saint-Christophe-et-Niévès': 'kn', 'Belize': 'bz', 'Costa Rica': 'cr',
  'Panama': 'pa', 'Guatemala': 'gt', 'Honduras': 'hn', 'Nicaragua': 'ni',
  'Salvador': 'sv', 'El Salvador': 'sv',

  // Amérique du Sud (12 pays)
  'Brésil': 'br', 'Argentine': 'ar', 'Chili': 'cl', 'Colombie': 'co',
  'Pérou': 'pe', 'Venezuela': 've', 'Équateur': 'ec', 'Bolivie': 'bo',
  'Paraguay': 'py', 'Uruguay': 'uy', 'Guyane': 'gy', 'Guyana': 'gy',
  'Suriname': 'sr', 'Guyane française': 'gf',

  // Océanie (14 pays)
  'Australie': 'au', 'Nouvelle-Zélande': 'nz', 'Fidji': 'fj',
  'Papouasie-Nouvelle-Guinée': 'pg', 'Samoa': 'ws', 'Îles Salomon': 'sb',
  'Vanuatu': 'vu', 'Tonga': 'to', 'Kiribati': 'ki', 'Micronésie': 'fm',
  'Palaos': 'pw', 'Palau': 'pw', 'Îles Marshall': 'mh', 'Nauru': 'nr',
  'Tuvalu': 'tv',

  // Russie (transcontinental)
  'Russie': 'ru',
};

// ==========================================
// 🗺️ LANGUES À ENCODAGE URL
// ==========================================

const ENCODED_LANGUAGES = new Set([
  'ar', 'zh', 'ja', 'ko', 'th', 'hi', 'he', 'fa', 'bn', 'ur',
  'vi', 'km', 'lo', 'my', 'dz', 'si', 'ta', 'te', 'ml', 'ne', 'am', 'ti',
]);

// ==========================================
// 🗺️ MAPPING LANGUE → CODE ISO
// ==========================================

const LANGUAGE_TO_I18N: Record<string, string> = {
  // Langues latines
  'Français': 'fr', 'Anglais': 'en', 'Espagnol': 'es', 'Portugais': 'pt',
  'Allemand': 'de', 'Italien': 'it', 'Néerlandais': 'nl', 'Suédois': 'sv',
  'Norvégien': 'no', 'Danois': 'da', 'Finnois': 'fi', 'Polonais': 'pl',
  'Roumain': 'ro', 'Hongrois': 'hu', 'Tchèque': 'cs', 'Slovaque': 'sk',
  'Croate': 'hr', 'Serbe': 'sr', 'Slovène': 'sl', 'Bosniaque': 'bs',
  'Lituanien': 'lt', 'Letton': 'lv', 'Estonien': 'et', 'Turc': 'tr',
  'Albanais': 'sq', 'Islandais': 'is', 'Indonésien': 'id', 'Malais': 'ms',
  'Tagalog': 'tl',
  
  // Langues cyrilliques
  'Russe': 'ru', 'Ukrainien': 'uk', 'Biélorusse': 'be', 'Bulgare': 'bg',
  'Macédonien': 'mk', 'Monténégrin': 'sr',
  
  // Langues grecques
  'Grec': 'el',
  
  // Langues caucasiennes
  'Arménien': 'hy', 'Géorgien': 'ka', 'Azéri': 'az',
  
  // Langues mongoles
  'Mongol': 'mn',
  
  // Langues à ENCODAGE URL
  'Arabe': 'ar', 'Thaï': 'th', 'Chinois': 'zh', 'Japonais': 'ja',
  'Coréen': 'ko', 'Hindi': 'hi', 'Vietnamien': 'vi', 'Hébreu': 'he',
  'Persan': 'fa', 'Bengali': 'bn', 'Ourdou': 'ur', 'Khmer': 'km',
  'Lao': 'lo', 'Birman': 'my', 'Népalais': 'ne', 'Cinghalais': 'si',
  'Tamoul': 'ta', 'Télougou': 'te', 'Malayalam': 'ml', 'Amharique': 'am',
  'Tigrigna': 'ti', 'Dzongkha': 'dz', 'Somali': 'so',
  'Dari': 'fa', 'Tadjik': 'tg', 'Ouzbek': 'uz', 'Turkmène': 'tk',
  'Maldivien': 'dv',
};

// ==========================================
// 🗺️ PAYS → LANGUE PRINCIPALE
// ==========================================

export const COUNTRY_TO_MAIN_LANGUAGE: Record<string, string> = {
  // Europe francophone
  'France': 'Français', 'Belgique': 'Français', 'Suisse': 'Français', 'Luxembourg': 'Français',
  'Monaco': 'Français',
  
  // Europe anglophone
  'Royaume-Uni': 'Anglais', 'Irlande': 'Anglais', 'Malte': 'Anglais',
  
  // Europe hispanophone
  'Espagne': 'Espagnol',
  
  // Europe lusophone
  'Portugal': 'Portugais',
  
  // Europe germanophone
  'Allemagne': 'Allemand', 'Autriche': 'Allemand', 'Liechtenstein': 'Allemand',
  
  // Europe italophone
  'Italie': 'Italien', 'Vatican': 'Italien', 'Saint-Marin': 'Italien',
  
  // Europe néerlandophone
  'Pays-Bas': 'Néerlandais',
  
  // Europe nordique
  'Suède': 'Suédois', 'Norvège': 'Norvégien', 'Danemark': 'Danois', 'Finlande': 'Finnois',
  'Islande': 'Islandais',
  
  // Europe centrale et orientale
  'Pologne': 'Polonais', 'Tchéquie': 'Tchèque', 'Slovaquie': 'Slovaque', 'Hongrie': 'Hongrois',
  'Roumanie': 'Roumain', 'Bulgarie': 'Bulgare', 'Croatie': 'Croate', 'Slovénie': 'Slovène',
  'Serbie': 'Serbe', 'Bosnie-Herzégovine': 'Bosniaque', 'Monténégro': 'Serbe',
  'Macédoine du Nord': 'Macédonien', 'Albanie': 'Albanais', 'Kosovo': 'Albanais',
  'Lituanie': 'Lituanien', 'Lettonie': 'Letton', 'Estonie': 'Estonien',
  
  // Europe orientale
  'Russie': 'Russe', 'Ukraine': 'Ukrainien', 'Biélorussie': 'Biélorusse', 'Moldavie': 'Roumain',
  
  // Caucase
  'Géorgie': 'Géorgien', 'Arménie': 'Arménien', 'Azerbaïdjan': 'Azéri',
  
  // Méditerranée orientale
  'Grèce': 'Grec', 'Chypre': 'Grec', 'Turquie': 'Turc',
  
  // Asie du Sud-Est
  'Thaïlande': 'Thaï', 'Vietnam': 'Vietnamien', 'Cambodge': 'Khmer', 'Laos': 'Lao',
  'Myanmar': 'Birman', 'Malaisie': 'Malais', 'Singapour': 'Anglais', 'Indonésie': 'Indonésien',
  'Philippines': 'Tagalog', 'Brunei': 'Malais', 'Timor oriental': 'Portugais',
  
  // Asie de l'Est
  'Chine': 'Chinois', 'Japon': 'Japonais', 'Corée du Sud': 'Coréen', 'Corée du Nord': 'Coréen',
  'Taïwan': 'Chinois', 'Hong Kong': 'Chinois', 'Macao': 'Chinois', 'Mongolie': 'Mongol',
  
  // Asie du Sud
  'Inde': 'Hindi', 'Pakistan': 'Ourdou', 'Bangladesh': 'Bengali', 'Sri Lanka': 'Cinghalais',
  'Népal': 'Népalais', 'Bhoutan': 'Dzongkha', 'Maldives': 'Maldivien', 'Afghanistan': 'Dari',
  
  // Asie centrale
  'Kazakhstan': 'Russe', 'Ouzbékistan': 'Ouzbek', 'Turkménistan': 'Turkmène',
  'Tadjikistan': 'Tadjik', 'Kirghizistan': 'Russe',
  
  // Moyen-Orient
  'Arabie saoudite': 'Arabe', 'Émirats arabes unis': 'Arabe', 'Qatar': 'Arabe', 'Koweït': 'Arabe',
  'Bahreïn': 'Arabe', 'Oman': 'Arabe', 'Yémen': 'Arabe', 'Irak': 'Arabe', 'Syrie': 'Arabe',
  'Jordanie': 'Arabe', 'Liban': 'Arabe', 'Palestine': 'Arabe', 'Israël': 'Hébreu', 'Iran': 'Persan',
  
  // Amérique du Nord
  'États-Unis': 'Anglais', 'Canada': 'Anglais', 'Mexique': 'Espagnol',
  
  // Amérique centrale
  'Guatemala': 'Espagnol', 'Belize': 'Anglais', 'Honduras': 'Espagnol', 'El Salvador': 'Espagnol',
  'Nicaragua': 'Espagnol', 'Costa Rica': 'Espagnol', 'Panama': 'Espagnol',
  
  // Caraïbes
  'Cuba': 'Espagnol', 'Jamaïque': 'Anglais', 'Haïti': 'Français', 'République dominicaine': 'Espagnol',
  'Porto Rico': 'Espagnol', 'Bahamas': 'Anglais', 'Barbade': 'Anglais', 'Trinité-et-Tobago': 'Anglais',
  'Grenade': 'Anglais', 'Saint-Vincent-et-les-Grenadines': 'Anglais', 'Antigua-et-Barbuda': 'Anglais',
  'Sainte-Lucie': 'Anglais',
  
  // Amérique du Sud
  'Brésil': 'Portugais', 'Argentine': 'Espagnol', 'Colombie': 'Espagnol', 'Pérou': 'Espagnol',
  'Venezuela': 'Espagnol', 'Chili': 'Espagnol', 'Équateur': 'Espagnol', 'Bolivie': 'Espagnol',
  'Paraguay': 'Espagnol', 'Uruguay': 'Espagnol', 'Guyana': 'Anglais', 'Suriname': 'Néerlandais',
  'Guyane française': 'Français',
  
  // Afrique du Nord
  'Maroc': 'Arabe', 'Algérie': 'Arabe', 'Tunisie': 'Arabe', 'Libye': 'Arabe', 'Égypte': 'Arabe',
  'Soudan': 'Arabe', 'Soudan du Sud': 'Anglais',
  
  // Afrique de l'Ouest
  'Mauritanie': 'Arabe', 'Sénégal': 'Français', 'Mali': 'Français', 'Burkina Faso': 'Français',
  'Niger': 'Français', 'Nigéria': 'Anglais', 'Tchad': 'Français', 'Guinée': 'Français',
  'Guinée-Bissau': 'Portugais', 'Sierra Leone': 'Anglais', 'Liberia': 'Anglais', 'Côte d\'Ivoire': 'Français',
  'Ghana': 'Anglais', 'Togo': 'Français', 'Bénin': 'Français', 'Gambie': 'Anglais',
  
  // Afrique centrale
  'Cameroun': 'Français', 'République centrafricaine': 'Français', 'Congo': 'Français',
  'République démocratique du Congo': 'Français', 'Gabon': 'Français',
  'Guinée équatoriale': 'Espagnol', 'São Tomé-et-Príncipe': 'Portugais',
  
  // Afrique de l'Est
  'Éthiopie': 'Amharique', 'Érythrée': 'Tigrigna', 'Somalie': 'Somali', 'Djibouti': 'Français',
  'Kenya': 'Anglais', 'Ouganda': 'Anglais', 'Tanzanie': 'Anglais', 'Rwanda': 'Français',
  'Burundi': 'Français',
  
  // Afrique australe
  'Angola': 'Portugais', 'Zambie': 'Anglais', 'Malawi': 'Anglais', 'Mozambique': 'Portugais',
  'Zimbabwe': 'Anglais', 'Botswana': 'Anglais', 'Namibie': 'Anglais', 'Afrique du Sud': 'Anglais',
  'Lesotho': 'Anglais', 'Eswatini': 'Anglais',
  
  // Îles africaines
  'Madagascar': 'Français', 'Maurice': 'Anglais', 'Seychelles': 'Anglais', 'Comores': 'Français',
  'Cap-Vert': 'Portugais',
  
  // Océanie
  'Australie': 'Anglais', 'Nouvelle-Zélande': 'Anglais', 'Papouasie-Nouvelle-Guinée': 'Anglais',
  'Fidji': 'Anglais', 'Samoa': 'Anglais', 'Tonga': 'Anglais', 'Vanuatu': 'Français',
  'Îles Salomon': 'Anglais', 'Kiribati': 'Anglais', 'Micronésie': 'Anglais', 'Palaos': 'Anglais',
  'Îles Marshall': 'Anglais', 'Nauru': 'Anglais', 'Tuvalu': 'Anglais',
};

// ==========================================
// 🗺️ TRADUCTIONS DE RÔLES
// ==========================================

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  lawyer: {
    fr: 'avocat', en: 'lawyer', es: 'abogado', pt: 'advogado', de: 'anwalt',
    it: 'avvocato', nl: 'advocaat', sv: 'advokat', no: 'advokat', da: 'advokat',
    fi: 'asianajaja', pl: 'prawnik', ro: 'avocat', hu: 'ugyvéd', cs: 'pravnik',
    sk: 'pravnik', hr: 'odvjetnik', sr: 'advokat', sl: 'odvetnik', bs: 'advokat',
    lt: 'advokatas', lv: 'advokats', et: 'advokaat', tr: 'avukat',
    sq: 'avokat', is: 'logmadur', id: 'pengacara', ms: 'peguam', tl: 'abogado',
    ru: 'advokat', uk: 'advokat', be: 'advakat', bg: 'advokat', mk: 'advokat',
    el: 'dikigoros', hy: 'pastaaban', ka: 'advokati', az: 'vekil', mn: 'huulch',
  },
  expat: {
    fr: 'expatrie', en: 'expat', es: 'expatriado', pt: 'expatriado', de: 'expat',
    it: 'espatriato', nl: 'expat', sv: 'expat', no: 'expat', da: 'expat',
    fi: 'expat', pl: 'expat', ro: 'expat', hu: 'expat', cs: 'expat',
    sk: 'expat', hr: 'expat', sr: 'expat', sl: 'expat', bs: 'expat',
    lt: 'expat', lv: 'expat', et: 'expat', tr: 'expat', sq: 'expat',
    is: 'expat', id: 'expat', ms: 'expat', tl: 'expat',
    ru: 'expat', uk: 'expat', be: 'expat', bg: 'expat', mk: 'expat',
    el: 'expat', hy: 'expat', ka: 'expat', az: 'expat', mn: 'expat',
  }
};

// ==========================================
// 🗺️ TRADUCTIONS DE PAYS (197 PAYS)
// ==========================================

const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Europe (44 pays)
  'France': { fr: 'france', en: 'france', es: 'francia', pt: 'franca', de: 'frankreich', it: 'francia', ru: 'frantsiya', el: 'gallia', bg: 'frantsiya' },
  'Allemagne': { fr: 'allemagne', en: 'germany', es: 'alemania', pt: 'alemanha', de: 'deutschland', it: 'germania', ru: 'germaniya', el: 'germania', bg: 'germaniya' },
  'Royaume-Uni': { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', pt: 'reino-unido', de: 'vereinigtes-koenigreich', it: 'regno-unito', ru: 'velikobritaniya', el: 'inomeno-vasilejo', bg: 'obedineno-kralstvo' },
  'Italie': { fr: 'italie', en: 'italy', es: 'italia', pt: 'italia', de: 'italien', it: 'italia', ru: 'italiya', el: 'italia', bg: 'italiya' },
  'Espagne': { fr: 'espagne', en: 'spain', es: 'espana', pt: 'espanha', de: 'spanien', it: 'spagna', ru: 'ispaniya', el: 'ispania', bg: 'ispaniya' },
  'Pays-Bas': { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', pt: 'paises-baixos', de: 'niederlande', it: 'paesi-bassi', ru: 'niderlandy', el: 'olandia', bg: 'niderlandiya' },
  'Belgique': { fr: 'belgique', en: 'belgium', es: 'belgica', pt: 'belgica', de: 'belgien', it: 'belgio', ru: 'belgiya', el: 'velgio', bg: 'belgiya' },
  'Suisse': { fr: 'suisse', en: 'switzerland', es: 'suiza', pt: 'suica', de: 'schweiz', it: 'svizzera', ru: 'shveitsariya', el: 'elvetia', bg: 'shveitsariya' },
  'Autriche': { fr: 'autriche', en: 'austria', es: 'austria', pt: 'austria', de: 'oesterreich', it: 'austria', ru: 'avstriya', el: 'afstria', bg: 'avstriya' },
  'Portugal': { fr: 'portugal', en: 'portugal', es: 'portugal', pt: 'portugal', de: 'portugal', it: 'portogallo', ru: 'portugaliya', el: 'portogalia', bg: 'portugaliya' },
  'Grèce': { fr: 'grece', en: 'greece', es: 'grecia', pt: 'grecia', de: 'griechenland', it: 'grecia', ru: 'gretsiya', el: 'ellada', bg: 'gartsia' },
  'Suède': { fr: 'suede', en: 'sweden', es: 'suecia', pt: 'suecia', de: 'schweden', it: 'svezia', ru: 'shvetsiya', el: 'souidia', bg: 'shvetsiya' },
  'Norvège': { fr: 'norvege', en: 'norway', es: 'noruega', pt: 'noruega', de: 'norwegen', it: 'norvegia', ru: 'norvegiya', el: 'norvigia', bg: 'norvegiya' },
  'Danemark': { fr: 'danemark', en: 'denmark', es: 'dinamarca', pt: 'dinamarca', de: 'daenemark', it: 'danimarca', ru: 'daniya', el: 'dania', bg: 'daniya' },
  'Finlande': { fr: 'finlande', en: 'finland', es: 'finlandia', pt: 'finlandia', de: 'finnland', it: 'finlandia', ru: 'finlyandiya', el: 'finlandia', bg: 'finlandiya' },
  'Irlande': { fr: 'irlande', en: 'ireland', es: 'irlanda', pt: 'irlanda', de: 'irland', it: 'irlanda', ru: 'irlandiya', el: 'irlandia', bg: 'irlandiya' },
  'Pologne': { fr: 'pologne', en: 'poland', es: 'polonia', pt: 'polonia', de: 'polen', it: 'polonia', ru: 'polsha', el: 'polonia', bg: 'polsha' },
  'République Tchèque': { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', pt: 'republica-tcheca', de: 'tschechien', it: 'repubblica-ceca', ru: 'chekhiya', el: 'tsehiki-dimokratia', bg: 'chehiya' },
  'Tchéquie': { fr: 'tchequie', en: 'czechia', es: 'chequia', pt: 'tchequia', de: 'tschechien', it: 'cechia', ru: 'chekhiya', el: 'tsekhia', bg: 'chehiya' },
  'Hongrie': { fr: 'hongrie', en: 'hungary', es: 'hungria', pt: 'hungria', de: 'ungarn', it: 'ungheria', ru: 'vengriya', el: 'ougaria', bg: 'ungariya' },
  'Roumanie': { fr: 'roumanie', en: 'romania', es: 'rumania', pt: 'romenia', de: 'rumaenien', it: 'romania', ru: 'rumyniya', el: 'roumania', bg: 'rumuniya' },
  'Bulgarie': { fr: 'bulgarie', en: 'bulgaria', es: 'bulgaria', pt: 'bulgaria', de: 'bulgarien', it: 'bulgaria', ru: 'bolgariya', el: 'vulgaria', bg: 'balgariya' },
  'Slovaquie': { fr: 'slovaquie', en: 'slovakia', es: 'eslovaquia', pt: 'eslovaquia', de: 'slowakei', it: 'slovacchia', ru: 'slovakiya', el: 'slovakia', bg: 'slovakiya' },
  'Croatie': { fr: 'croatie', en: 'croatia', es: 'croacia', pt: 'croacia', de: 'kroatien', it: 'croazia', ru: 'horvatiya', el: 'kroatia', bg: 'harvatiya' },
  'Slovénie': { fr: 'slovenie', en: 'slovenia', es: 'eslovenia', pt: 'eslovenia', de: 'slowenien', it: 'slovenia', ru: 'sloveniya', el: 'slovenia', bg: 'sloveniya' },
  'Lituanie': { fr: 'lituanie', en: 'lithuania', es: 'lituania', pt: 'lituania', de: 'litauen', it: 'lituania', ru: 'litva', el: 'lithouania', bg: 'litva' },
  'Lettonie': { fr: 'lettonie', en: 'latvia', es: 'letonia', pt: 'letonia', de: 'lettland', it: 'lettonia', ru: 'latviya', el: 'lettonia', bg: 'latviya' },
  'Estonie': { fr: 'estonie', en: 'estonia', es: 'estonia', pt: 'estonia', de: 'estland', it: 'estonia', ru: 'estoniya', el: 'esthonia', bg: 'estoniya' },
  'Serbie': { fr: 'serbie', en: 'serbia', es: 'serbia', pt: 'servia', de: 'serbien', it: 'serbia', ru: 'serbiya', el: 'servia', bg: 'sarbiya' },
  'Bosnie-Herzégovine': { fr: 'bosnie-herzegovine', en: 'bosnia-herzegovina', es: 'bosnia-herzegovina', pt: 'bosnia-herzegovina', de: 'bosnien-herzegowina', it: 'bosnia-erzegovina', ru: 'bosniya-i-gertsegovina', el: 'vosnio-erzegobini', bg: 'bosniya-i-hertsegovina' },
  'Albanie': { fr: 'albanie', en: 'albania', es: 'albania', pt: 'albania', de: 'albanien', it: 'albania', ru: 'albaniya', el: 'alvania', bg: 'albaniya' },
  'Macédoine du Nord': { fr: 'macedoine-du-nord', en: 'north-macedonia', es: 'macedonia-del-norte', pt: 'macedonia-do-norte', de: 'nordmazedonien', it: 'macedonia-del-nord', ru: 'severnaya-makedoniya', el: 'boreia-makedonia', bg: 'severna-makedoniya' },
  'Monténégro': { fr: 'montenegro', en: 'montenegro', es: 'montenegro', pt: 'montenegro', de: 'montenegro', it: 'montenegro', ru: 'chernogoriya', el: 'mautrobounio', bg: 'cherna-gora' },
  'Kosovo': { fr: 'kosovo', en: 'kosovo', es: 'kosovo', pt: 'kosovo', de: 'kosovo', it: 'kosovo', ru: 'kosovo', el: 'kosovo', bg: 'kosovo' },
  'Islande': { fr: 'islande', en: 'iceland', es: 'islandia', pt: 'islandia', de: 'island', it: 'islanda', ru: 'islandiya', el: 'islandia', bg: 'islandiya' },
  'Luxembourg': { fr: 'luxembourg', en: 'luxembourg', es: 'luxemburgo', pt: 'luxemburgo', de: 'luxemburg', it: 'lussemburgo', ru: 'lyuksemburg', el: 'louxemvourgo', bg: 'lyuksemburg' },
  'Malte': { fr: 'malte', en: 'malta', es: 'malta', pt: 'malta', de: 'malta', it: 'malta', ru: 'malta', el: 'malti', bg: 'malta' },
  'Chypre': { fr: 'chypre', en: 'cyprus', es: 'chipre', pt: 'chipre', de: 'zypern', it: 'cipro', ru: 'kipr', el: 'kipros', bg: 'kipar' },
  'Monaco': { fr: 'monaco', en: 'monaco', es: 'monaco', pt: 'monaco', de: 'monaco', it: 'monaco', ru: 'monako', el: 'monako', bg: 'monako' },
  'Liechtenstein': { fr: 'liechtenstein', en: 'liechtenstein', es: 'liechtenstein', pt: 'liechtenstein', de: 'liechtenstein', it: 'liechtenstein', ru: 'likhtenshtein', el: 'lihtenstain', bg: 'lihtenshtein' },
  'Andorre': { fr: 'andorre', en: 'andorra', es: 'andorra', pt: 'andorra', de: 'andorra', it: 'andorra', ru: 'andorra', el: 'andora', bg: 'andora' },
  'Saint-Marin': { fr: 'saint-marin', en: 'san-marino', es: 'san-marino', pt: 'san-marino', de: 'san-marino', it: 'san-marino', ru: 'san-marino', el: 'san-marino', bg: 'san-marino' },
  'Vatican': { fr: 'vatican', en: 'vatican', es: 'vaticano', pt: 'vaticano', de: 'vatikan', it: 'vaticano', ru: 'vatikan', el: 'vatikano', bg: 'vatikan' },
  'Moldavie': { fr: 'moldavie', en: 'moldova', es: 'moldavia', pt: 'moldavia', de: 'moldawien', it: 'moldavia', ru: 'moldova', el: 'moldavia', bg: 'moldova' },
  'Biélorussie': { fr: 'bielorussie', en: 'belarus', es: 'bielorrusia', pt: 'bielorrussia', de: 'weissrussland', it: 'bielorussia', ru: 'belarus', el: 'lefkorosia', bg: 'belarus' },
  'Ukraine': { fr: 'ukraine', en: 'ukraine', es: 'ucrania', pt: 'ucrania', de: 'ukraine', it: 'ucraina', ru: 'ukraina', el: 'oukrania', bg: 'ukraina' },

  // Asie (48 pays)
  'Chine': { fr: 'chine', en: 'china', es: 'china', pt: 'china', de: 'china', it: 'cina', ru: 'kitai', el: 'kina', bg: 'kitai' },
  'Japon': { fr: 'japon', en: 'japan', es: 'japon', pt: 'japao', de: 'japan', it: 'giappone', ru: 'yaponiya', el: 'iaponia', bg: 'yaponiya' },
  'Inde': { fr: 'inde', en: 'india', es: 'india', pt: 'india', de: 'indien', it: 'india', ru: 'indiya', el: 'india', bg: 'indiya' },
  'Thaïlande': { fr: 'thailande', en: 'thailand', es: 'tailandia', pt: 'tailandia', de: 'thailand', it: 'thailandia', ru: 'tailand', el: 'tailandi', bg: 'tailand' },
  'Corée du Sud': { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', pt: 'coreia-do-sul', de: 'suedkorea', it: 'corea-del-sud', ru: 'yuzhnaya-koreya', el: 'notia-korea', bg: 'yuzhna-koreya' },
  'Indonésie': { fr: 'indonesie', en: 'indonesia', es: 'indonesia', pt: 'indonesia', de: 'indonesien', it: 'indonesia', ru: 'indoneziya', el: 'indonisia', bg: 'indoneziya' },
  'Malaisie': { fr: 'malaisie', en: 'malaysia', es: 'malasia', pt: 'malasia', de: 'malaysia', it: 'malesia', ru: 'malaiziya', el: 'malaisia', bg: 'malaiziya' },
  'Singapour': { fr: 'singapour', en: 'singapore', es: 'singapur', pt: 'singapura', de: 'singapur', it: 'singapore', ru: 'singapur', el: 'singapoura', bg: 'singapur' },
  'Vietnam': { fr: 'vietnam', en: 'vietnam', es: 'vietnam', pt: 'vietna', de: 'vietnam', it: 'vietnam', ru: 'vetnam', el: 'vietnam', bg: 'vietnam' },
  'Philippines': { fr: 'philippines', en: 'philippines', es: 'filipinas', pt: 'filipinas', de: 'philippinen', it: 'filippine', ru: 'filippiny', el: 'filippines', bg: 'filipini' },
  'Pakistan': { fr: 'pakistan', en: 'pakistan', es: 'pakistan', pt: 'paquistao', de: 'pakistan', it: 'pakistan', ru: 'pakistan', el: 'pakistan', bg: 'pakistan' },
  'Bangladesh': { fr: 'bangladesh', en: 'bangladesh', es: 'bangladesh', pt: 'bangladesh', de: 'bangladesch', it: 'bangladesh', ru: 'bangladesh', el: 'bangladesh', bg: 'bangladesh' },
  'Turquie': { fr: 'turquie', en: 'turkey', es: 'turquia', pt: 'turquia', de: 'tuerkei', it: 'turchia', ru: 'turtsiya', el: 'tourkia', bg: 'turtsiya' },
  'Israël': { fr: 'israel', en: 'israel', es: 'israel', pt: 'israel', de: 'israel', it: 'israele', ru: 'izrail', el: 'israil', bg: 'izrael' },
  'Émirats Arabes Unis': { fr: 'emirats-arabes-unis', en: 'united-arab-emirates', es: 'emiratos-arabes-unidos', pt: 'emirados-arabes-unidos', de: 'vereinigte-arabische-emirate', it: 'emirati-arabi-uniti', ru: 'obedinennye-arabskie-emiraty', el: 'inomena-aravika-emirata', bg: 'obedineni-arabski-emirstva' },
  'Arabie Saoudite': { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', pt: 'arabia-saudita', de: 'saudi-arabien', it: 'arabia-saudita', ru: 'saudovskaya-araviya', el: 'saoydiki-aravia', bg: 'saudiska-arabiya' },
  'Qatar': { fr: 'qatar', en: 'qatar', es: 'qatar', pt: 'catar', de: 'katar', it: 'qatar', ru: 'katar', el: 'katar', bg: 'katar' },
  'Koweït': { fr: 'koweit', en: 'kuwait', es: 'kuwait', pt: 'kuwait', de: 'kuwait', it: 'kuwait', ru: 'kuveit', el: 'koubeit', bg: 'kuveit' },
  'Bahreïn': { fr: 'bahrein', en: 'bahrain', es: 'bahrein', pt: 'bahrein', de: 'bahrain', it: 'bahrein', ru: 'bahrain', el: 'mpahrein', bg: 'bahrain' },
  'Oman': { fr: 'oman', en: 'oman', es: 'oman', pt: 'oma', de: 'oman', it: 'oman', ru: 'oman', el: 'oman', bg: 'oman' },
  'Jordanie': { fr: 'jordanie', en: 'jordan', es: 'jordania', pt: 'jordania', de: 'jordanien', it: 'giordania', ru: 'iordaniya', el: 'iordania', bg: 'yordaniya' },
  'Liban': { fr: 'liban', en: 'lebanon', es: 'libano', pt: 'libano', de: 'libanon', it: 'libano', ru: 'livan', el: 'livanos', bg: 'livan' },
  'Irak': { fr: 'irak', en: 'iraq', es: 'irak', pt: 'iraque', de: 'irak', it: 'iraq', ru: 'irak', el: 'irak', bg: 'irak' },
  'Iran': { fr: 'iran', en: 'iran', es: 'iran', pt: 'ira', de: 'iran', it: 'iran', ru: 'iran', el: 'iran', bg: 'iran' },
  'Afghanistan': { fr: 'afghanistan', en: 'afghanistan', es: 'afganistan', pt: 'afeganistao', de: 'afghanistan', it: 'afghanistan', ru: 'afganistan', el: 'afganistan', bg: 'afganistan' },
  'Syrie': { fr: 'syrie', en: 'syria', es: 'siria', pt: 'siria', de: 'syrien', it: 'siria', ru: 'siriya', el: 'siria', bg: 'siriya' },
  'Yémen': { fr: 'yemen', en: 'yemen', es: 'yemen', pt: 'iemen', de: 'jemen', it: 'yemen', ru: 'yemen', el: 'iemen', bg: 'iemen' },
  'Cambodge': { fr: 'cambodge', en: 'cambodia', es: 'camboya', pt: 'camboja', de: 'kambodscha', it: 'cambogia', ru: 'kambodzha', el: 'kampotzi', bg: 'kambodzha' },
  'Laos': { fr: 'laos', en: 'laos', es: 'laos', pt: 'laos', de: 'laos', it: 'laos', ru: 'laos', el: 'laos', bg: 'laos' },
  'Myanmar': { fr: 'myanmar', en: 'myanmar', es: 'myanmar', pt: 'myanmar', de: 'myanmar', it: 'myanmar', ru: 'myanma', el: 'mianmar', bg: 'mianmar' },
  'Népal': { fr: 'nepal', en: 'nepal', es: 'nepal', pt: 'nepal', de: 'nepal', it: 'nepal', ru: 'nepal', el: 'nepal', bg: 'nepal' },
  'Sri Lanka': { fr: 'sri-lanka', en: 'sri-lanka', es: 'sri-lanka', pt: 'sri-lanka', de: 'sri-lanka', it: 'sri-lanka', ru: 'shri-lanka', el: 'sri-lanka', bg: 'shri-lanka' },
  'Brunei': { fr: 'brunei', en: 'brunei', es: 'brunei', pt: 'brunei', de: 'brunei', it: 'brunei', ru: 'brunei', el: 'vrounei', bg: 'brunei' },
  'Mongolie': { fr: 'mongolie', en: 'mongolia', es: 'mongolia', pt: 'mongolia', de: 'mongolei', it: 'mongolia', ru: 'mongoliya', el: 'mogolia', bg: 'mongoliya' },
  'Tadjikistan': { fr: 'tadjikistan', en: 'tajikistan', es: 'tayikistan', pt: 'tajiquistao', de: 'tadschikistan', it: 'tagikistan', ru: 'tadzhikistan', el: 'tatzikistan', bg: 'tadzhikistan' },
  'Kirghizistan': { fr: 'kirghizistan', en: 'kyrgyzstan', es: 'kirguistan', pt: 'quirguistao', de: 'kirgisistan', it: 'kirghizistan', ru: 'kyrgyzstan', el: 'kirgizistan', bg: 'kirgizstan' },
  'Ouzbékistan': { fr: 'ouzbekistan', en: 'uzbekistan', es: 'uzbekistan', pt: 'uzbequistao', de: 'usbekistan', it: 'uzbekistan', ru: 'uzbekistan', el: 'ouzmpekistan', bg: 'uzbekistan' },
  'Turkménistan': { fr: 'turkmenistan', en: 'turkmenistan', es: 'turkmenistan', pt: 'turcomenistao', de: 'turkmenistan', it: 'turkmenistan', ru: 'turkmenistan', el: 'tourkmenia', bg: 'turkmenistan' },
  'Kazakhstan': { fr: 'kazakhstan', en: 'kazakhstan', es: 'kazajistan', pt: 'cazaquistao', de: 'kasachstan', it: 'kazakistan', ru: 'kazakhstan', el: 'kazakstan', bg: 'kazahstan' },
  'Azerbaïdjan': { fr: 'azerbaidjan', en: 'azerbaijan', es: 'azerbaiyan', pt: 'azerbaijao', de: 'aserbaidschan', it: 'azerbaigian', ru: 'azerbaidzhan', el: 'azermpaigian', bg: 'azerbaydzhan' },
  'Géorgie': { fr: 'georgie', en: 'georgia', es: 'georgia', pt: 'georgia', de: 'georgien', it: 'georgia', ru: 'gruziya', el: 'georgia', bg: 'gruziya' },
  'Arménie': { fr: 'armenie', en: 'armenia', es: 'armenia', pt: 'armenia', de: 'armenien', it: 'armenia', ru: 'armeniya', el: 'armenia', bg: 'armeniya' },
  'Bhoutan': { fr: 'bhoutan', en: 'bhutan', es: 'butan', pt: 'butao', de: 'bhutan', it: 'bhutan', ru: 'butan', el: 'mpoutan', bg: 'butan' },
  'Maldives': { fr: 'maldives', en: 'maldives', es: 'maldivas', pt: 'maldivas', de: 'malediven', it: 'maldive', ru: 'maldivy', el: 'maldives', bg: 'maldivi' },
  'Corée du Nord': { fr: 'coree-du-nord', en: 'north-korea', es: 'corea-del-norte', pt: 'coreia-do-norte', de: 'nordkorea', it: 'corea-del-nord', ru: 'severnaya-koreya', el: 'boreia-korea', bg: 'severna-koreya' },
  'Timor Oriental': { fr: 'timor-oriental', en: 'east-timor', es: 'timor-oriental', pt: 'timor-leste', de: 'osttimor', it: 'timor-est', ru: 'vostochnyi-timor', el: 'anatoliko-timor', bg: 'iztchen-timor' },
  'Palestine': { fr: 'palestine', en: 'palestine', es: 'palestina', pt: 'palestina', de: 'palaestina', it: 'palestina', ru: 'palestina', el: 'palaistini', bg: 'palestina' },

  // Afrique (54 pays)
  'Afrique du Sud': { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', pt: 'africa-do-sul', de: 'suedafrika', it: 'sudafrica', ru: 'yuzhnaya-afrika', el: 'notia-afriki', bg: 'yuzhna-afrika' },
  'Égypte': { fr: 'egypte', en: 'egypt', es: 'egipto', pt: 'egito', de: 'aegypten', it: 'egitto', ru: 'egipet', el: 'aigiptos', bg: 'egipet' },
  'Maroc': { fr: 'maroc', en: 'morocco', es: 'marruecos', pt: 'marrocos', de: 'marokko', it: 'marocco', ru: 'marokko', el: 'maroko', bg: 'maroko' },
  'Kenya': { fr: 'kenya', en: 'kenya', es: 'kenia', pt: 'quenia', de: 'kenia', it: 'kenya', ru: 'keniya', el: 'kenia', bg: 'keniya' },
  'Tanzanie': { fr: 'tanzanie', en: 'tanzania', es: 'tanzania', pt: 'tanzania', de: 'tansania', it: 'tanzania', ru: 'tanzaniya', el: 'tanzania', bg: 'tanzaniya' },
  'Éthiopie': { fr: 'ethiopie', en: 'ethiopia', es: 'etiopia', pt: 'etiopia', de: 'aethiopien', it: 'etiopia', ru: 'efiopiya', el: 'aithiopia', bg: 'etiopiya' },
  'Ghana': { fr: 'ghana', en: 'ghana', es: 'ghana', pt: 'gana', de: 'ghana', it: 'ghana', ru: 'gana', el: 'gana', bg: 'gana' },
  'Nigeria': { fr: 'nigeria', en: 'nigeria', es: 'nigeria', pt: 'nigeria', de: 'nigeria', it: 'nigeria', ru: 'nigeriya', el: 'nigeria', bg: 'nigeriya' },
  'Sénégal': { fr: 'senegal', en: 'senegal', es: 'senegal', pt: 'senegal', de: 'senegal', it: 'senegal', ru: 'senegal', el: 'senegalos', bg: 'senegal' },
  "Côte d'Ivoire": { fr: 'cote-ivoire', en: 'ivory-coast', es: 'costa-de-marfil', pt: 'costa-do-marfim', de: 'elfenbeinkueste', it: 'costa-avorio', ru: 'kot-d-ivuar', el: 'akti-elefantostou', bg: 'kot-divоar' },
  'Tunisie': { fr: 'tunisie', en: 'tunisia', es: 'tunez', pt: 'tunisia', de: 'tunesien', it: 'tunisia', ru: 'tunis', el: 'tinisia', bg: 'tunis' },
  'Algérie': { fr: 'algerie', en: 'algeria', es: 'argelia', pt: 'argelia', de: 'algerien', it: 'algeria', ru: 'alzhir', el: 'algeria', bg: 'alzhir' },
  'Libye': { fr: 'libye', en: 'libya', es: 'libia', pt: 'libia', de: 'libyen', it: 'libia', ru: 'liviya', el: 'livia', bg: 'liviya' },
  'Soudan': { fr: 'soudan', en: 'sudan', es: 'sudan', pt: 'sudao', de: 'sudan', it: 'sudan', ru: 'sudan', el: 'souda', bg: 'sudan' },
  'Ouganda': { fr: 'ouganda', en: 'uganda', es: 'uganda', pt: 'uganda', de: 'uganda', it: 'uganda', ru: 'uganda', el: 'ougada', bg: 'uganda' },
  'Rwanda': { fr: 'rwanda', en: 'rwanda', es: 'ruanda', pt: 'ruanda', de: 'ruanda', it: 'ruanda', ru: 'ruanda', el: 'rouada', bg: 'ruanda' },
  'Mozambique': { fr: 'mozambique', en: 'mozambique', es: 'mozambique', pt: 'mocambique', de: 'mosambik', it: 'mozambico', ru: 'mozambik', el: 'mozambiki', bg: 'mozambik' },
  'Zimbabwe': { fr: 'zimbabwe', en: 'zimbabwe', es: 'zimbabue', pt: 'zimbabue', de: 'simbabwe', it: 'zimbabwe', ru: 'zimbabve', el: 'zimbaboue', bg: 'zimbabve' },
  'Botswana': { fr: 'botswana', en: 'botswana', es: 'botsuana', pt: 'botsuana', de: 'botswana', it: 'botswana', ru: 'botsvana', el: 'mpotsouana', bg: 'botsvana' },
  'Namibie': { fr: 'namibie', en: 'namibia', es: 'namibia', pt: 'namibia', de: 'namibia', it: 'namibia', ru: 'namibiya', el: 'namibia', bg: 'namibiya' },
  'Madagascar': { fr: 'madagascar', en: 'madagascar', es: 'madagascar', pt: 'madagascar', de: 'madagaskar', it: 'madagascar', ru: 'madagaskar', el: 'madagaskari', bg: 'madagaskar' },
  'Maurice': { fr: 'maurice', en: 'mauritius', es: 'mauricio', pt: 'mauricio', de: 'mauritius', it: 'mauritius', ru: 'mavrikii', el: 'mafrikios', bg: 'mavrikiy' },
  'Seychelles': { fr: 'seychelles', en: 'seychelles', es: 'seychelles', pt: 'seychelles', de: 'seychellen', it: 'seychelles', ru: 'seishely', el: 'seyseles', bg: 'seisheli' },
  'Angola': { fr: 'angola', en: 'angola', es: 'angola', pt: 'angola', de: 'angola', it: 'angola', ru: 'angola', el: 'angola', bg: 'angola' },
  'Cameroun': { fr: 'cameroun', en: 'cameroon', es: 'camerun', pt: 'camaroes', de: 'kamerun', it: 'camerun', ru: 'kamerun', el: 'kameroun', bg: 'kamerun' },
  'Congo': { fr: 'congo', en: 'congo', es: 'congo', pt: 'congo', de: 'kongo', it: 'congo', ru: 'kongo', el: 'kongo', bg: 'kongo' },
  'RD Congo': { fr: 'rd-congo', en: 'dr-congo', es: 'rd-congo', pt: 'rd-congo', de: 'dr-kongo', it: 'rd-congo', ru: 'dr-kongo', el: 'dld-kongo', bg: 'dr-kongo' },
  'République démocratique du Congo': { fr: 'rd-congo', en: 'dr-congo', es: 'rd-congo', pt: 'rd-congo', de: 'dr-kongo', it: 'rd-congo', ru: 'dr-kongo', el: 'dld-kongo', bg: 'dr-kongo' },
  'Gabon': { fr: 'gabon', en: 'gabon', es: 'gabon', pt: 'gabao', de: 'gabun', it: 'gabon', ru: 'gabon', el: 'gampo', bg: 'gabon' },
  'Guinée Équatoriale': { fr: 'guinee-equatoriale', en: 'equatorial-guinea', es: 'guinea-ecuatorial', pt: 'guine-equatorial', de: 'aequatorialguinea', it: 'guinea-equatoriale', ru: 'ekvatorialnaya-gvineya', el: 'isimeriaki-goinea', bg: 'ekvatorialna-gvineya' },
  'Tchad': { fr: 'tchad', en: 'chad', es: 'chad', pt: 'chade', de: 'tschad', it: 'ciad', ru: 'chad', el: 'tsant', bg: 'chad' },
  'Niger': { fr: 'niger', en: 'niger', es: 'niger', pt: 'niger', de: 'niger', it: 'niger', ru: 'niger', el: 'niger', bg: 'niger' },
  'Mali': { fr: 'mali', en: 'mali', es: 'mali', pt: 'mali', de: 'mali', it: 'mali', ru: 'mali', el: 'mali', bg: 'mali' },
  'Burkina Faso': { fr: 'burkina-faso', en: 'burkina-faso', es: 'burkina-faso', pt: 'burkina-faso', de: 'burkina-faso', it: 'burkina-faso', ru: 'burkina-faso', el: 'mpourkina-faso', bg: 'burkina-faso' },
  'Bénin': { fr: 'benin', en: 'benin', es: 'benin', pt: 'benim', de: 'benin', it: 'benin', ru: 'benin', el: 'mpenin', bg: 'benin' },
  'Togo': { fr: 'togo', en: 'togo', es: 'togo', pt: 'togo', de: 'togo', it: 'togo', ru: 'togo', el: 'togo', bg: 'togo' },
  'Guinée': { fr: 'guinee', en: 'guinea', es: 'guinea', pt: 'guine', de: 'guinea', it: 'guinea', ru: 'gvineya', el: 'goinea', bg: 'gvineya' },
  'Guinée-Bissau': { fr: 'guinee-bissau', en: 'guinea-bissau', es: 'guinea-bissau', pt: 'guine-bissau', de: 'guinea-bissau', it: 'guinea-bissau', ru: 'gvineya-bisau', el: 'goinea-mpissao', bg: 'gvineya-bisau' },
  'Sierra Leone': { fr: 'sierra-leone', en: 'sierra-leone', es: 'sierra-leona', pt: 'serra-leoa', de: 'sierra-leone', it: 'sierra-leone', ru: 'syerra-leone', el: 'siera-leone', bg: 'siera-leone' },
  'Liberia': { fr: 'liberia', en: 'liberia', es: 'liberia', pt: 'liberia', de: 'liberia', it: 'liberia', ru: 'liberiya', el: 'liveria', bg: 'liberiya' },
  'Mauritanie': { fr: 'mauritanie', en: 'mauritania', es: 'mauritania', pt: 'mauritania', de: 'mauretanien', it: 'mauritania', ru: 'mavritaniya', el: 'maouritania', bg: 'mavritaniya' },
  'Gambie': { fr: 'gambie', en: 'gambia', es: 'gambia', pt: 'gambia', de: 'gambia', it: 'gambia', ru: 'gambiya', el: 'gampia', bg: 'gambiya' },
  'Cap-Vert': { fr: 'cap-vert', en: 'cape-verde', es: 'cabo-verde', pt: 'cabo-verde', de: 'kap-verde', it: 'capo-verde', ru: 'kabo-verde', el: 'prasi-verde', bg: 'kabo-verde' },
  'Sao Tomé-et-Principe': { fr: 'sao-tome-et-principe', en: 'sao-tome-and-principe', es: 'santo-tome-y-principe', pt: 'sao-tome-e-principe', de: 'sao-tome-und-principe', it: 'sao-tome-e-principe', ru: 'san-tome-i-prinsipi', el: 'sao-tome-ke-prinsipe', bg: 'sao-tome-i-prinsipi' },
  'São Tomé-et-Príncipe': { fr: 'sao-tome-et-principe', en: 'sao-tome-and-principe', es: 'santo-tome-y-principe', pt: 'sao-tome-e-principe', de: 'sao-tome-und-principe', it: 'sao-tome-e-principe', ru: 'san-tome-i-prinsipi', el: 'sao-tome-ke-prinsipe', bg: 'sao-tome-i-prinsipi' },
  'Zambie': { fr: 'zambie', en: 'zambia', es: 'zambia', pt: 'zambia', de: 'sambia', it: 'zambia', ru: 'zambiya', el: 'zampia', bg: 'zambiya' },
  'Malawi': { fr: 'malawi', en: 'malawi', es: 'malaui', pt: 'malawi', de: 'malawi', it: 'malawi', ru: 'malavi', el: 'malaoui', bg: 'malavi' },
  'Eswatini': { fr: 'eswatini', en: 'eswatini', es: 'esuatini', pt: 'eswatini', de: 'eswatini', it: 'eswatini', ru: 'esvatini', el: 'esouatini', bg: 'esvatini' },
  'Lesotho': { fr: 'lesotho', en: 'lesotho', es: 'lesoto', pt: 'lesoto', de: 'lesotho', it: 'lesotho', ru: 'lesoto', el: 'lesotho', bg: 'lesoto' },
  'Djibouti': { fr: 'djibouti', en: 'djibouti', es: 'yibuti', pt: 'djibuti', de: 'dschibuti', it: 'gibuti', ru: 'dzhibuti', el: 'tzimouti', bg: 'dzhibuti' },
  'Érythrée': { fr: 'erythree', en: 'eritrea', es: 'eritrea', pt: 'eritreia', de: 'eritrea', it: 'eritrea', ru: 'eritreya', el: 'erithrea', bg: 'eritreya' },
  'Somalie': { fr: 'somalie', en: 'somalia', es: 'somalia', pt: 'somalia', de: 'somalia', it: 'somalia', ru: 'somali', el: 'somalia', bg: 'somali' },
  'Soudan du Sud': { fr: 'soudan-du-sud', en: 'south-sudan', es: 'sudan-del-sur', pt: 'sudao-do-sul', de: 'suedsudan', it: 'sudan-del-sud', ru: 'yuzhnyi-sudan', el: 'notio-souda', bg: 'yuzhen-sudan' },
  'Burundi': { fr: 'burundi', en: 'burundi', es: 'burundi', pt: 'burundi', de: 'burundi', it: 'burundi', ru: 'burundi', el: 'mpourounti', bg: 'burundi' },
  'Comores': { fr: 'comores', en: 'comoros', es: 'comoras', pt: 'comores', de: 'komoren', it: 'comore', ru: 'komory', el: 'komores', bg: 'komori' },

  // Amérique du Nord (23 pays)
  'États-Unis': { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'vereinigte-staaten', it: 'stati-uniti', ru: 'soedinennye-shtaty', el: 'inomenes-politeies', bg: 'sashtineni-shtati' },
  'Canada': { fr: 'canada', en: 'canada', es: 'canada', pt: 'canada', de: 'kanada', it: 'canada', ru: 'kanada', el: 'kanadas', bg: 'kanada' },
  'Mexique': { fr: 'mexique', en: 'mexico', es: 'mexico', pt: 'mexico', de: 'mexiko', it: 'messico', ru: 'meksika', el: 'mexiko', bg: 'meksiko' },
  'Cuba': { fr: 'cuba', en: 'cuba', es: 'cuba', pt: 'cuba', de: 'kuba', it: 'cuba', ru: 'kuba', el: 'kouba', bg: 'kuba' },
  'République Dominicaine': { fr: 'republique-dominicaine', en: 'dominican-republic', es: 'republica-dominicana', pt: 'republica-dominicana', de: 'dominikanische-republik', it: 'repubblica-dominicana', ru: 'dominikanskaya-respublika', el: 'dominikani-dimokratia', bg: 'dominikanska-republika' },
  'Jamaïque': { fr: 'jamaique', en: 'jamaica', es: 'jamaica', pt: 'jamaica', de: 'jamaika', it: 'giamaica', ru: 'yamaika', el: 'tzamaika', bg: 'yamayka' },
  'Haïti': { fr: 'haiti', en: 'haiti', es: 'haiti', pt: 'haiti', de: 'haiti', it: 'haiti', ru: 'gaiti', el: 'aiti', bg: 'haiti' },
  'Bahamas': { fr: 'bahamas', en: 'bahamas', es: 'bahamas', pt: 'bahamas', de: 'bahamas', it: 'bahamas', ru: 'bagamy', el: 'mpachames', bg: 'bahami' },
  'Trinité-et-Tobago': { fr: 'trinite-et-tobago', en: 'trinidad-and-tobago', es: 'trinidad-y-tobago', pt: 'trindade-e-tobago', de: 'trinidad-und-tobago', it: 'trinidad-e-tobago', ru: 'trinidad-i-tobago', el: 'trinidad-ke-toumpago', bg: 'trinidad-i-tobago' },
  'Barbade': { fr: 'barbade', en: 'barbados', es: 'barbados', pt: 'barbados', de: 'barbados', it: 'barbados', ru: 'barbados', el: 'mparmpantos', bg: 'barbados' },
  'Sainte-Lucie': { fr: 'sainte-lucie', en: 'saint-lucia', es: 'santa-lucia', pt: 'santa-lucia', de: 'saint-lucia', it: 'santa-lucia', ru: 'sent-lyusiya', el: 'agia-loukia', bg: 'senta-lusiya' },
  'Saint-Vincent-et-les-Grenadines': { fr: 'saint-vincent-et-les-grenadines', en: 'saint-vincent-and-the-grenadines', es: 'san-vicente-y-las-granadinas', pt: 'sao-vicente-e-granadinas', de: 'saint-vincent-und-die-grenadinen', it: 'saint-vincent-e-grenadine', ru: 'sent-vinsent-i-grenadiny', el: 'agios-vikentios-ke-grenadines', bg: 'sent-vinsent-i-grenadinite' },
  'Grenade': { fr: 'grenade', en: 'grenada', es: 'granada', pt: 'granada', de: 'grenada', it: 'grenada', ru: 'grenada', el: 'grenada', bg: 'grenada' },
  'Antigua-et-Barbuda': { fr: 'antigua-et-barbuda', en: 'antigua-and-barbuda', es: 'antigua-y-barbuda', pt: 'antigua-e-barbuda', de: 'antigua-und-barbuda', it: 'antigua-e-barbuda', ru: 'antigua-i-barbuda', el: 'antigkua-ke-mparmounta', bg: 'antigua-i-barbuda' },
  'Dominique': { fr: 'dominique', en: 'dominica', es: 'dominica', pt: 'dominica', de: 'dominica', it: 'dominica', ru: 'dominika', el: 'dominika', bg: 'dominika' },
  'Saint-Christophe-et-Niévès': { fr: 'saint-christophe-et-nieves', en: 'saint-kitts-and-nevis', es: 'san-cristobal-y-nieves', pt: 'sao-cristovao-e-nevis', de: 'saint-kitts-und-nevis', it: 'saint-kitts-e-nevis', ru: 'sent-kits-i-nevis', el: 'agios-kristoforos-ke-nevis', bg: 'sent-kits-i-nevis' },
  'Belize': { fr: 'belize', en: 'belize', es: 'belice', pt: 'belize', de: 'belize', it: 'belize', ru: 'beliz', el: 'melize', bg: 'beliz' },
  'Costa Rica': { fr: 'costa-rica', en: 'costa-rica', es: 'costa-rica', pt: 'costa-rica', de: 'costa-rica', it: 'costa-rica', ru: 'kosta-rika', el: 'kosta-rika', bg: 'kosta-rika' },
  'Panama': { fr: 'panama', en: 'panama', es: 'panama', pt: 'panama', de: 'panama', it: 'panama', ru: 'panama', el: 'panama', bg: 'panama' },
  'Guatemala': { fr: 'guatemala', en: 'guatemala', es: 'guatemala', pt: 'guatemala', de: 'guatemala', it: 'guatemala', ru: 'gvatemala', el: 'gouatemala', bg: 'gvatemala' },
  'Honduras': { fr: 'honduras', en: 'honduras', es: 'honduras', pt: 'honduras', de: 'honduras', it: 'honduras', ru: 'gonduras', el: 'ondouras', bg: 'honduras' },
  'Nicaragua': { fr: 'nicaragua', en: 'nicaragua', es: 'nicaragua', pt: 'nicaragua', de: 'nicaragua', it: 'nicaragua', ru: 'nikaragua', el: 'nikaragoua', bg: 'nikaragua' },
  'Salvador': { fr: 'salvador', en: 'el-salvador', es: 'el-salvador', pt: 'el-salvador', de: 'el-salvador', it: 'el-salvador', ru: 'salvador', el: 'el-salvador', bg: 'el-salvador' },
  'El Salvador': { fr: 'salvador', en: 'el-salvador', es: 'el-salvador', pt: 'el-salvador', de: 'el-salvador', it: 'el-salvador', ru: 'salvador', el: 'el-salvador', bg: 'el-salvador' },

  // Amérique du Sud (12 pays)
  'Brésil': { fr: 'bresil', en: 'brazil', es: 'brasil', pt: 'brasil', de: 'brasilien', it: 'brasile', ru: 'braziliya', el: 'vrazilia', bg: 'braziliya' },
  'Argentine': { fr: 'argentine', en: 'argentina', es: 'argentina', pt: 'argentina', de: 'argentinien', it: 'argentina', ru: 'argentina', el: 'argentina', bg: 'argentina' },
  'Chili': { fr: 'chili', en: 'chile', es: 'chile', pt: 'chile', de: 'chile', it: 'cile', ru: 'chili', el: 'hili', bg: 'chili' },
  'Colombie': { fr: 'colombie', en: 'colombia', es: 'colombia', pt: 'colombia', de: 'kolumbien', it: 'colombia', ru: 'kolumbiya', el: 'kolomvia', bg: 'kolumbiya' },
  'Pérou': { fr: 'perou', en: 'peru', es: 'peru', pt: 'peru', de: 'peru', it: 'peru', ru: 'peru', el: 'perou', bg: 'peru' },
  'Venezuela': { fr: 'venezuela', en: 'venezuela', es: 'venezuela', pt: 'venezuela', de: 'venezuela', it: 'venezuela', ru: 'venesuela', el: 'venezouela', bg: 'venesuela' },
  'Équateur': { fr: 'equateur', en: 'ecuador', es: 'ecuador', pt: 'equador', de: 'ecuador', it: 'ecuador', ru: 'ekvador', el: 'ekouantor', bg: 'ekvador' },
  'Bolivie': { fr: 'bolivie', en: 'bolivia', es: 'bolivia', pt: 'bolivia', de: 'bolivien', it: 'bolivia', ru: 'boliviya', el: 'volivia', bg: 'boliviya' },
  'Paraguay': { fr: 'paraguay', en: 'paraguay', es: 'paraguay', pt: 'paraguai', de: 'paraguay', it: 'paraguay', ru: 'paragvai', el: 'paragouai', bg: 'paragvay' },
  'Uruguay': { fr: 'uruguay', en: 'uruguay', es: 'uruguay', pt: 'uruguai', de: 'uruguay', it: 'uruguay', ru: 'urugvai', el: 'ourougouai', bg: 'urugvay' },
  'Guyane': { fr: 'guyane', en: 'guyana', es: 'guyana', pt: 'guiana', de: 'guyana', it: 'guyana', ru: 'gaiana', el: 'gouiana', bg: 'gayana' },
  'Guyana': { fr: 'guyane', en: 'guyana', es: 'guyana', pt: 'guiana', de: 'guyana', it: 'guyana', ru: 'gaiana', el: 'gouiana', bg: 'gayana' },
  'Suriname': { fr: 'suriname', en: 'suriname', es: 'surinam', pt: 'suriname', de: 'suriname', it: 'suriname', ru: 'surinam', el: 'sourinam', bg: 'surinam' },

  // Océanie (14 pays)
  'Australie': { fr: 'australie', en: 'australia', es: 'australia', pt: 'australia', de: 'australien', it: 'australia', ru: 'avstraliya', el: 'afstralia', bg: 'avstraliya' },
  'Nouvelle-Zélande': { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', pt: 'nova-zelandia', de: 'neuseeland', it: 'nuova-zelanda', ru: 'novaya-zelandiya', el: 'nea-zilandia', bg: 'nova-zelandiya' },
  'Fidji': { fr: 'fidji', en: 'fiji', es: 'fiyi', pt: 'fiji', de: 'fidschi', it: 'figi', ru: 'fidzhi', el: 'fitzi', bg: 'fidzhi' },
  'Papouasie-Nouvelle-Guinée': { fr: 'papouasie-nouvelle-guinee', en: 'papua-new-guinea', es: 'papua-nueva-guinea', pt: 'papua-nova-guine', de: 'papua-neuguinea', it: 'papua-nuova-guinea', ru: 'papua-novaya-gvineya', el: 'papoua-nea-goinea', bg: 'papua-nova-gvineya' },
  'Samoa': { fr: 'samoa', en: 'samoa', es: 'samoa', pt: 'samoa', de: 'samoa', it: 'samoa', ru: 'samoa', el: 'samoa', bg: 'samoa' },
  'Îles Salomon': { fr: 'iles-salomon', en: 'solomon-islands', es: 'islas-salomon', pt: 'ilhas-salomao', de: 'salomonen', it: 'isole-salomone', ru: 'solomonovy-ostrova', el: 'nisoі-solomontos', bg: 'solomonovi-ostrovi' },
  'Vanuatu': { fr: 'vanuatu', en: 'vanuatu', es: 'vanuatu', pt: 'vanuatu', de: 'vanuatu', it: 'vanuatu', ru: 'vanuatu', el: 'vanouatou', bg: 'vanuatu' },
  'Tonga': { fr: 'tonga', en: 'tonga', es: 'tonga', pt: 'tonga', de: 'tonga', it: 'tonga', ru: 'tonga', el: 'tonga', bg: 'tonga' },
  'Kiribati': { fr: 'kiribati', en: 'kiribati', es: 'kiribati', pt: 'kiribati', de: 'kiribati', it: 'kiribati', ru: 'kiribati', el: 'kiribati', bg: 'kiribati' },
  'Micronésie': { fr: 'micronesie', en: 'micronesia', es: 'micronesia', pt: 'micronesia', de: 'mikronesien', it: 'micronesia', ru: 'mikroneziya', el: 'mikronisia', bg: 'mikroneziya' },
  'Palaos': { fr: 'palaos', en: 'palau', es: 'palaos', pt: 'palau', de: 'palau', it: 'palau', ru: 'palau', el: 'palaou', bg: 'palau' },
  'Palau': { fr: 'palaos', en: 'palau', es: 'palaos', pt: 'palau', de: 'palau', it: 'palau', ru: 'palau', el: 'palaou', bg: 'palau' },
  'Îles Marshall': { fr: 'iles-marshall', en: 'marshall-islands', es: 'islas-marshall', pt: 'ilhas-marshall', de: 'marshallinseln', it: 'isole-marshall', ru: 'marshallovy-ostrova', el: 'nisoi-marsal', bg: 'marshallovi-ostrovi' },
  'Nauru': { fr: 'nauru', en: 'nauru', es: 'nauru', pt: 'nauru', de: 'nauru', it: 'nauru', ru: 'nauru', el: 'naourou', bg: 'nauru' },
  'Tuvalu': { fr: 'tuvalu', en: 'tuvalu', es: 'tuvalu', pt: 'tuvalu', de: 'tuvalu', it: 'tuvalu', ru: 'tuvalu', el: 'toubaloи', bg: 'tuvalu' },

  // Russie (1 pays - transcontinental)
  'Russie': { fr: 'russie', en: 'russia', es: 'rusia', pt: 'russia', de: 'russland', it: 'russia', ru: 'rossiya', el: 'rosia', bg: 'rusiya' }
};

export default COUNTRY_TRANSLATIONS;
// ✅ Alias pour compatibilité
export const COUNTRY_TO_I18N = COUNTRY_TRANSLATIONS;

// ==========================================
// 🔧 FONCTIONS UTILITAIRES PRINCIPALES
// ==========================================

/**
 * Slugifie une chaîne (nettoyage, normalisation, lowercase)
 */
export const slugify = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

/**
 * Tronque une chaîne à la dernière limite de mot
 */
const truncateAtWordBoundary = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastDash = truncated.lastIndexOf('-');
  if (lastDash > maxLength * 0.6) return text.substring(0, lastDash);
  return truncated;
};

/**
 * Récupère le code langue depuis le nom
 */
export const getLanguageCode = (languageName: string): string => {
  return LANGUAGE_TO_I18N[languageName] || 'en';
};

/**
 * Récupère le code pays ISO 2 lettres depuis le nom
 */
export const getCountryCode = (countryName: string): string => {
  return COUNTRY_TO_ISO_CODE[countryName] || slugify(countryName).substring(0, 2);
};

/**
 * Vérifie si une langue nécessite l'encodage URL
 */
export const isEncodedLanguage = (langCode: string): boolean => {
  return ENCODED_LANGUAGES.has(langCode);
};

/**
 * Traduit le rôle (lawyer/expat) selon la locale
 */
export const getRoleTranslation = (role: 'lawyer' | 'expat', locale: string): string => {
  if (isEncodedLanguage(locale)) {
    return role === 'lawyer' ? 'lawyer' : 'expat';
  }
  return ROLE_TRANSLATIONS[role]?.[locale] || (role === 'lawyer' ? 'lawyer' : 'expat');
};

/**
 * Traduit le nom du pays selon la locale
 */
export const getCountryTranslation = (country: string, locale: string): string => {
  if (isEncodedLanguage(locale)) {
    const englishTranslation = COUNTRY_TRANSLATIONS[country]?.['en'];
    if (englishTranslation) return englishTranslation;
    return slugify(country);
  }
  const translation = COUNTRY_TRANSLATIONS[country]?.[locale];
  if (translation) return translation;
  return slugify(country);
};

// ==========================================
// 🌐 FONCTIONS DE GESTION DES LOCALES
// ==========================================

/**
 * 🔍 Parse une locale depuis un path
 * 
 * @example
 * parseLocaleFromPath('/fr-th/avocat/...')
 * // → { locale: 'fr-th', lang: 'fr', country: 'th' }
 */
export function parseLocaleFromPath(path: string): {
  locale: string | null;
  lang: string | null;
  country: string | null;
} {
  const parts = path.split('/').filter(Boolean);
  const firstPart = parts[0];
  
  if (!firstPart) {
    return { locale: null, lang: null, country: null };
  }
  
  // Vérifier si c'est une locale composée valide
  if (VALID_LOCALES.includes(firstPart as ValidLocale)) {
    const [lang, country] = firstPart.split('-');
    return { locale: firstPart, lang, country };
  }
  
  // Fallback sur langue simple
  const simpleLangs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'];
  if (simpleLangs.includes(firstPart)) {
    return { locale: firstPart, lang: firstPart, country: null };
  }
  
  return { locale: null, lang: null, country: null };
}

/**
 * 🏷️ Construit une locale depuis langue + pays
 * 
 * @example
 * buildLocale('fr', 'th') // → 'fr-th'
 * buildLocale('xx', 'yy') // → 'xx' (fallback)
 */
export function buildLocale(lang: string, country: string): ValidLocale | string {
  const candidate = `${lang}-${country}`.toLowerCase() as ValidLocale;
  return VALID_LOCALES.includes(candidate) ? candidate : lang;
}

/**
 * ✅ Valide qu'une locale est supportée
 */
export function isValidLocale(locale: string): locale is ValidLocale {
  return VALID_LOCALES.includes(locale as ValidLocale);
}

/**
 * 📋 Récupère la liste des locales valides pour une langue donnée
 */
export function getLocalesForLanguage(lang: string): ValidLocale[] {
  return VALID_LOCALES.filter(locale => locale.startsWith(`${lang}-`));
}

/**
 * 📋 Récupère la liste des locales valides pour un pays donné
 */
export function getLocalesForCountry(country: string): ValidLocale[] {
  return VALID_LOCALES.filter(locale => locale.endsWith(`-${country}`));
}

// ==========================================
// 🎯 FONCTIONS PRINCIPALES
// ==========================================

export interface GenerateSlugOptions {
  firstName: string;
  lastName: string;
  role: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  specialties: string[];
  locale?: string;
  userCountry?: string;
}

/**
 * 🌍 GÉNÈRE UN SLUG SEO (MAX 70 CARACTÈRES)
 * 
 * ⚠️ PRÉNOM SEUL dans le slug (protection vie privée)
 * 
 * @example
 * generateSlug({
 *   firstName: 'Pierre',
 *   lastName: 'Dupont',
 *   role: 'lawyer',
 *   country: 'Thaïlande',
 *   languages: ['Français'],
 *   specialties: ['E-commerce'],
 *   locale: 'fr',
 *   userCountry: 'Thaïlande'
 * })
 * // Retourne : "fr-th/avocat-thailande/pierre-ecommerce"
 */
export function generateSlug(options: GenerateSlugOptions): string {
  const { 
    firstName, 
    role, 
    country, 
    languages, 
    specialties, 
    locale: providedLocale,
    userCountry 
  } = options;
  
  // Déterminer la locale (simple ou composée)
  const userLanguage = languages[0] || 'Français';
  const userLangCode = getLanguageCode(userLanguage);
  
  let locale = providedLocale || userLangCode;
  
  // Si on a un pays utilisateur, essayer de créer une locale composée
  if (userCountry && !locale.includes('-')) {
    const countryCode = getCountryCode(userCountry);
    const composedLocale = buildLocale(locale, countryCode);
    if (isValidLocale(composedLocale)) {
      locale = composedLocale;
    }
  }
  
  // Extraire la langue de base pour les traductions
  const baseLang = locale.split('-')[0];
  
  const roleWord = getRoleTranslation(role, baseLang);
  const countryWord = getCountryTranslation(country, baseLang);
  const categoryCountry = `${roleWord}-${countryWord}`;
  
  // ✅ PRÉNOM SEUL (pas de nom de famille)
  const firstNameSlug = slugify(firstName);
  const specialtySlug = specialties.length > 0 ? slugify(specialties[0]) : '';
  
  const basePath = `${locale}/${categoryCountry}`;
  const maxFinalPartLength = 70 - basePath.length - 1;
  
  let finalPart = specialtySlug ? `${firstNameSlug}-${specialtySlug}` : firstNameSlug;
  
  if (finalPart.length > maxFinalPartLength) {
    const maxSpecialtyLength = maxFinalPartLength - firstNameSlug.length - 1;
    if (maxSpecialtyLength >= 5 && specialtySlug) {
      const truncatedSpecialty = truncateAtWordBoundary(specialtySlug, maxSpecialtyLength);
      finalPart = `${firstNameSlug}-${truncatedSpecialty}`;
    } else {
      finalPart = firstNameSlug;
    }
  }
  
  const finalSlug = `${basePath}/${finalPart}`;
  return finalSlug.length > 70 ? finalSlug.substring(0, 70) : finalSlug;
}

/**
 * 🏷️ NOM PUBLIC AFFICHÉ (prénom + initiale)
 * Ex: "Pierre Dupont" → "Pierre D."
 */
export function getPublicDisplayName(firstName: string, lastName: string): string {
  if (!firstName || !lastName) return firstName || lastName || 'Profil';
  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

/**
 * ✅ Wrapper pour objets provider
 */
export function formatPublicName(provider: { 
  firstName?: string; 
  lastName?: string; 
  fullName?: string 
}): string {
  if (provider.firstName && provider.lastName) {
    return getPublicDisplayName(provider.firstName, provider.lastName);
  }
  if (provider.fullName) {
    const parts = provider.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
    }
    return parts[0];
  }
  return 'Profil';
}

/**
 * 📊 STATISTIQUES DU SLUG
 */
export function getSlugStats(slug: string): {
  length: number;
  remainingChars: number;
  parts: string[];
  isValid: boolean;
  hasLocale: boolean;
  locale?: string;
} {
  const parts = slug.split('/').filter(Boolean);
  const firstPart = parts[0];
  const hasLocale = isValidLocale(firstPart) || ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'].includes(firstPart);
  
  return {
    length: slug.length,
    remainingChars: 70 - slug.length,
    parts,
    isValid: slug.length <= 70 && parts.length === 3,
    hasLocale,
    locale: hasLocale ? firstPart : undefined
  };
}

// ==========================================
// 🧪 EXPORTS FINAUX
// ==========================================

export {
  LANGUAGE_TO_I18N,
  ENCODED_LANGUAGES,
  COUNTRY_TRANSLATIONS,
  ROLE_TRANSLATIONS,
  COUNTRY_TO_ISO_CODE,
};
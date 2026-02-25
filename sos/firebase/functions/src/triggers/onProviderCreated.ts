/**
 * =============================================================================
 * ON PROVIDER CREATED - AUTOMATIC PAYMENT ACCOUNT SETUP (STRIPE OR PAYPAL)
 * =============================================================================
 *
 * Ce trigger configure automatiquement le compte de paiement lorsqu'un provider
 * (lawyer ou expat) est créé dans la collection sos_profiles.
 *
 * FONCTIONNALITÉS:
 *
 * STRIPE (46 pays supportés):
 * - Création automatique du compte Stripe Express après inscription
 * - Configuration des capabilities (card_payments, transfers)
 * - Sauvegarde du stripeAccountId dans Firestore
 * - Status initial: stripeAccountStatus = 'pending_verification'
 * - Provider NON visible jusqu'à approbation admin (isVisible = false)
 *
 * PAYPAL (151+ pays non supportés par Stripe):
 * - Pas de création automatique de compte
 * - Provider NON visible jusqu'à connexion PayPal
 * - Status initial: paypalAccountStatus = 'not_connected'
 * - Rappels envoyés pour inciter à connecter PayPal
 *
 * ARCHITECTURE:
 * - Trigger sur: sos_profiles/{uid}
 * - Condition: type = 'lawyer' ou 'expat'
 * - Détermination gateway: basée sur le pays du provider
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { getStorage } from "firebase-admin/storage";
import { META_CAPI_TOKEN, trackCAPILead, UserData } from "../metaConversionsApi";
// P0 FIX: Import validation function for country codes
import { getRecommendedPaymentGateway, isValidCountryCode } from "../lib/paymentCountries";
// P0 FIX: Use centralized secrets - NEVER call defineSecret() in multiple files
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  getStripeSecretKey,
  getStripeMode,
} from "../lib/secrets";

// =============================================================================
// SLUG GENERATION UTILITIES (SEO URLs)
// =============================================================================

const SHORT_ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';

function generateShortId(firebaseUid: string): string {
  let hash = 0;
  for (let i = 0; i < firebaseUid.length; i++) {
    const char = firebaseUid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  let shortId = '';
  let remaining = absHash;
  for (let i = 0; i < 6; i++) {
    shortId += SHORT_ID_CHARS[remaining % SHORT_ID_CHARS.length];
    remaining = Math.floor(remaining / SHORT_ID_CHARS.length);
  }
  return shortId;
}

function slugify(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  lawyer: {
    fr: 'avocat', en: 'lawyer', es: 'abogado', pt: 'advogado', de: 'anwalt',
    ru: 'advokat', zh: 'lushi', ar: 'muhami', hi: 'vakil'
  },
  expat: {
    fr: 'expatrie', en: 'expat', es: 'expatriado', pt: 'expatriado', de: 'expat',
    ru: 'expat', zh: 'haiwai', ar: 'wafid', hi: 'videshi'
  },
};

// Traductions des pays pour les 9 langues supportées
// Format: { 'NomPays': { lang: 'slug-romanise', ... } }
const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  // France
  'France': { fr: 'france', en: 'france', es: 'francia', pt: 'franca', de: 'frankreich', ru: 'frantsiya', zh: 'faguo', ar: 'faransa', hi: 'frans' },
  // Thailand
  'Thaïlande': { fr: 'thailande', en: 'thailand', es: 'tailandia', pt: 'tailandia', de: 'thailand', ru: 'tailand', zh: 'taiguo', ar: 'tailand', hi: 'thailand' },
  'Thailand': { fr: 'thailande', en: 'thailand', es: 'tailandia', pt: 'tailandia', de: 'thailand', ru: 'tailand', zh: 'taiguo', ar: 'tailand', hi: 'thailand' },
  // Germany
  'Allemagne': { fr: 'allemagne', en: 'germany', es: 'alemania', pt: 'alemanha', de: 'deutschland', ru: 'germaniya', zh: 'deguo', ar: 'almania', hi: 'jarmani' },
  'Germany': { fr: 'allemagne', en: 'germany', es: 'alemania', pt: 'alemanha', de: 'deutschland', ru: 'germaniya', zh: 'deguo', ar: 'almania', hi: 'jarmani' },
  // Spain
  'Espagne': { fr: 'espagne', en: 'spain', es: 'espana', pt: 'espanha', de: 'spanien', ru: 'ispaniya', zh: 'xibanya', ar: 'isbania', hi: 'spain' },
  'Spain': { fr: 'espagne', en: 'spain', es: 'espana', pt: 'espanha', de: 'spanien', ru: 'ispaniya', zh: 'xibanya', ar: 'isbania', hi: 'spain' },
  // USA
  'États-Unis': { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'usa', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'america' },
  'United States': { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'usa', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'america' },
  'USA': { fr: 'etats-unis', en: 'united-states', es: 'estados-unidos', pt: 'estados-unidos', de: 'usa', ru: 'ssha', zh: 'meiguo', ar: 'amrika', hi: 'america' },
  // UK
  'Royaume-Uni': { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', pt: 'reino-unido', de: 'grossbritannien', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britania', hi: 'britain' },
  'United Kingdom': { fr: 'royaume-uni', en: 'united-kingdom', es: 'reino-unido', pt: 'reino-unido', de: 'grossbritannien', ru: 'velikobritaniya', zh: 'yingguo', ar: 'britania', hi: 'britain' },
  // Canada
  'Canada': { fr: 'canada', en: 'canada', es: 'canada', pt: 'canada', de: 'kanada', ru: 'kanada', zh: 'jianada', ar: 'kanada', hi: 'canada' },
  // Morocco
  'Maroc': { fr: 'maroc', en: 'morocco', es: 'marruecos', pt: 'marrocos', de: 'marokko', ru: 'marokko', zh: 'moluoge', ar: 'maghrib', hi: 'morocco' },
  'Morocco': { fr: 'maroc', en: 'morocco', es: 'marruecos', pt: 'marrocos', de: 'marokko', ru: 'marokko', zh: 'moluoge', ar: 'maghrib', hi: 'morocco' },
  // Japan
  'Japon': { fr: 'japon', en: 'japan', es: 'japon', pt: 'japao', de: 'japan', ru: 'yaponiya', zh: 'riben', ar: 'yaban', hi: 'japan' },
  'Japan': { fr: 'japon', en: 'japan', es: 'japon', pt: 'japao', de: 'japan', ru: 'yaponiya', zh: 'riben', ar: 'yaban', hi: 'japan' },
  // China
  'Chine': { fr: 'chine', en: 'china', es: 'china', pt: 'china', de: 'china', ru: 'kitai', zh: 'zhongguo', ar: 'sin', hi: 'china' },
  'China': { fr: 'chine', en: 'china', es: 'china', pt: 'china', de: 'china', ru: 'kitai', zh: 'zhongguo', ar: 'sin', hi: 'china' },
  // India
  'Inde': { fr: 'inde', en: 'india', es: 'india', pt: 'india', de: 'indien', ru: 'indiya', zh: 'yindu', ar: 'hind', hi: 'bharat' },
  'India': { fr: 'inde', en: 'india', es: 'india', pt: 'india', de: 'indien', ru: 'indiya', zh: 'yindu', ar: 'hind', hi: 'bharat' },
  // Saudi Arabia
  'Arabie Saoudite': { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', pt: 'arabia-saudita', de: 'saudi-arabien', ru: 'saudovskaya-araviya', zh: 'shate', ar: 'saudia', hi: 'saudi' },
  'Saudi Arabia': { fr: 'arabie-saoudite', en: 'saudi-arabia', es: 'arabia-saudita', pt: 'arabia-saudita', de: 'saudi-arabien', ru: 'saudovskaya-araviya', zh: 'shate', ar: 'saudia', hi: 'saudi' },
  // UAE
  'Émirats Arabes Unis': { fr: 'emirats-arabes-unis', en: 'uae', es: 'emiratos-arabes', pt: 'emirados-arabes', de: 'vae', ru: 'oae', zh: 'alianqiu', ar: 'emarat', hi: 'uae' },
  'UAE': { fr: 'emirats-arabes-unis', en: 'uae', es: 'emiratos-arabes', pt: 'emirados-arabes', de: 'vae', ru: 'oae', zh: 'alianqiu', ar: 'emarat', hi: 'uae' },
  // Brazil
  'Brésil': { fr: 'bresil', en: 'brazil', es: 'brasil', pt: 'brasil', de: 'brasilien', ru: 'braziliya', zh: 'baxi', ar: 'brazil', hi: 'brazil' },
  'Brazil': { fr: 'bresil', en: 'brazil', es: 'brasil', pt: 'brasil', de: 'brasilien', ru: 'braziliya', zh: 'baxi', ar: 'brazil', hi: 'brazil' },
  // Australia
  'Australie': { fr: 'australie', en: 'australia', es: 'australia', pt: 'australia', de: 'australien', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia' },
  'Australia': { fr: 'australie', en: 'australia', es: 'australia', pt: 'australia', de: 'australien', ru: 'avstraliya', zh: 'aodaliya', ar: 'ustralia', hi: 'australia' },
  // Russia
  'Russie': { fr: 'russie', en: 'russia', es: 'rusia', pt: 'russia', de: 'russland', ru: 'rossiya', zh: 'eluosi', ar: 'rusia', hi: 'russia' },
  'Russia': { fr: 'russie', en: 'russia', es: 'rusia', pt: 'russia', de: 'russland', ru: 'rossiya', zh: 'eluosi', ar: 'rusia', hi: 'russia' },
  // Italy
  'Italie': { fr: 'italie', en: 'italy', es: 'italia', pt: 'italia', de: 'italien', ru: 'italiya', zh: 'yidali', ar: 'italia', hi: 'italy' },
  'Italy': { fr: 'italie', en: 'italy', es: 'italia', pt: 'italia', de: 'italien', ru: 'italiya', zh: 'yidali', ar: 'italia', hi: 'italy' },
  // Portugal
  'Portugal': { fr: 'portugal', en: 'portugal', es: 'portugal', pt: 'portugal', de: 'portugal', ru: 'portugaliya', zh: 'putaoya', ar: 'burtugal', hi: 'portugal' },
  // Netherlands
  'Pays-Bas': { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', pt: 'holanda', de: 'niederlande', ru: 'niderlandy', zh: 'helan', ar: 'hulanda', hi: 'netherlands' },
  'Netherlands': { fr: 'pays-bas', en: 'netherlands', es: 'paises-bajos', pt: 'holanda', de: 'niederlande', ru: 'niderlandy', zh: 'helan', ar: 'hulanda', hi: 'netherlands' },
  // Belgium
  'Belgique': { fr: 'belgique', en: 'belgium', es: 'belgica', pt: 'belgica', de: 'belgien', ru: 'belgiya', zh: 'bilishi', ar: 'beljika', hi: 'belgium' },
  'Belgium': { fr: 'belgique', en: 'belgium', es: 'belgica', pt: 'belgica', de: 'belgien', ru: 'belgiya', zh: 'bilishi', ar: 'beljika', hi: 'belgium' },
  // Switzerland
  'Suisse': { fr: 'suisse', en: 'switzerland', es: 'suiza', pt: 'suica', de: 'schweiz', ru: 'shveitsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  'Switzerland': { fr: 'suisse', en: 'switzerland', es: 'suiza', pt: 'suica', de: 'schweiz', ru: 'shveitsariya', zh: 'ruishi', ar: 'swisra', hi: 'switzerland' },
  // Mexico
  'Mexique': { fr: 'mexique', en: 'mexico', es: 'mexico', pt: 'mexico', de: 'mexiko', ru: 'meksika', zh: 'moxige', ar: 'maksik', hi: 'mexico' },
  'Mexico': { fr: 'mexique', en: 'mexico', es: 'mexico', pt: 'mexico', de: 'mexiko', ru: 'meksika', zh: 'moxige', ar: 'maksik', hi: 'mexico' },
  // Singapore
  'Singapour': { fr: 'singapour', en: 'singapore', es: 'singapur', pt: 'singapura', de: 'singapur', ru: 'singapur', zh: 'xinjiapo', ar: 'singafura', hi: 'singapore' },
  'Singapore': { fr: 'singapour', en: 'singapore', es: 'singapur', pt: 'singapura', de: 'singapur', ru: 'singapur', zh: 'xinjiapo', ar: 'singafura', hi: 'singapore' },
  // Hong Kong
  'Hong Kong': { fr: 'hong-kong', en: 'hong-kong', es: 'hong-kong', pt: 'hong-kong', de: 'hongkong', ru: 'gonkong', zh: 'xianggang', ar: 'hongkong', hi: 'hongkong' },
  // Vietnam
  'Vietnam': { fr: 'vietnam', en: 'vietnam', es: 'vietnam', pt: 'vietna', de: 'vietnam', ru: 'vetnam', zh: 'yuenan', ar: 'fitnam', hi: 'vietnam' },
  // South Korea
  'Corée du Sud': { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', pt: 'coreia-do-sul', de: 'suedkorea', ru: 'yuzhnaya-koreya', zh: 'hanguo', ar: 'kuria', hi: 'korea' },
  'South Korea': { fr: 'coree-du-sud', en: 'south-korea', es: 'corea-del-sur', pt: 'coreia-do-sul', de: 'suedkorea', ru: 'yuzhnaya-koreya', zh: 'hanguo', ar: 'kuria', hi: 'korea' },
  // Egypt
  'Égypte': { fr: 'egypte', en: 'egypt', es: 'egipto', pt: 'egito', de: 'aegypten', ru: 'egipet', zh: 'aiji', ar: 'misr', hi: 'egypt' },
  'Egypt': { fr: 'egypte', en: 'egypt', es: 'egipto', pt: 'egito', de: 'aegypten', ru: 'egipet', zh: 'aiji', ar: 'misr', hi: 'egypt' },
  // Tunisia
  'Tunisie': { fr: 'tunisie', en: 'tunisia', es: 'tunez', pt: 'tunisia', de: 'tunesien', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia' },
  'Tunisia': { fr: 'tunisie', en: 'tunisia', es: 'tunez', pt: 'tunisia', de: 'tunesien', ru: 'tunis', zh: 'tunisi', ar: 'tunis', hi: 'tunisia' },
  // Algeria
  'Algérie': { fr: 'algerie', en: 'algeria', es: 'argelia', pt: 'argelia', de: 'algerien', ru: 'alzhir', zh: 'aerjiliya', ar: 'jazair', hi: 'algeria' },
  'Algeria': { fr: 'algerie', en: 'algeria', es: 'argelia', pt: 'argelia', de: 'algerien', ru: 'alzhir', zh: 'aerjiliya', ar: 'jazair', hi: 'algeria' },
  // Indonesia
  'Indonésie': { fr: 'indonesie', en: 'indonesia', es: 'indonesia', pt: 'indonesia', de: 'indonesien', ru: 'indoneziya', zh: 'yindunixiya', ar: 'indunisia', hi: 'indonesia' },
  'Indonesia': { fr: 'indonesie', en: 'indonesia', es: 'indonesia', pt: 'indonesia', de: 'indonesien', ru: 'indoneziya', zh: 'yindunixiya', ar: 'indunisia', hi: 'indonesia' },
  // Malaysia
  'Malaisie': { fr: 'malaisie', en: 'malaysia', es: 'malasia', pt: 'malasia', de: 'malaysia', ru: 'malayziya', zh: 'malaixiya', ar: 'malizia', hi: 'malaysia' },
  'Malaysia': { fr: 'malaisie', en: 'malaysia', es: 'malasia', pt: 'malasia', de: 'malaysia', ru: 'malayziya', zh: 'malaixiya', ar: 'malizia', hi: 'malaysia' },
  // Philippines
  'Philippines': { fr: 'philippines', en: 'philippines', es: 'filipinas', pt: 'filipinas', de: 'philippinen', ru: 'filipiny', zh: 'feilvbin', ar: 'filipin', hi: 'philippines' },
  // Norway
  'Norvège': { fr: 'norvege', en: 'norway', es: 'noruega', pt: 'noruega', de: 'norwegen', ru: 'norvegiya', zh: 'nuowei', ar: 'nurwij', hi: 'norway' },
  'Norway': { fr: 'norvege', en: 'norway', es: 'noruega', pt: 'noruega', de: 'norwegen', ru: 'norvegiya', zh: 'nuowei', ar: 'nurwij', hi: 'norway' },
  // Sweden
  'Suède': { fr: 'suede', en: 'sweden', es: 'suecia', pt: 'suecia', de: 'schweden', ru: 'shvetsiya', zh: 'ruidian', ar: 'swid', hi: 'sweden' },
  'Sweden': { fr: 'suede', en: 'sweden', es: 'suecia', pt: 'suecia', de: 'schweden', ru: 'shvetsiya', zh: 'ruidian', ar: 'swid', hi: 'sweden' },
  // Denmark
  'Danemark': { fr: 'danemark', en: 'denmark', es: 'dinamarca', pt: 'dinamarca', de: 'daenemark', ru: 'daniya', zh: 'danmai', ar: 'danmark', hi: 'denmark' },
  'Denmark': { fr: 'danemark', en: 'denmark', es: 'dinamarca', pt: 'dinamarca', de: 'daenemark', ru: 'daniya', zh: 'danmai', ar: 'danmark', hi: 'denmark' },
  // Poland
  'Pologne': { fr: 'pologne', en: 'poland', es: 'polonia', pt: 'polonia', de: 'polen', ru: 'polsha', zh: 'bolan', ar: 'bulanda', hi: 'poland' },
  'Poland': { fr: 'pologne', en: 'poland', es: 'polonia', pt: 'polonia', de: 'polen', ru: 'polsha', zh: 'bolan', ar: 'bulanda', hi: 'poland' },
  // Greece
  'Grèce': { fr: 'grece', en: 'greece', es: 'grecia', pt: 'grecia', de: 'griechenland', ru: 'gretsiya', zh: 'xila', ar: 'yunan', hi: 'greece' },
  'Greece': { fr: 'grece', en: 'greece', es: 'grecia', pt: 'grecia', de: 'griechenland', ru: 'gretsiya', zh: 'xila', ar: 'yunan', hi: 'greece' },
  // Turkey
  'Turquie': { fr: 'turquie', en: 'turkey', es: 'turquia', pt: 'turquia', de: 'tuerkei', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkia', hi: 'turkey' },
  'Turkey': { fr: 'turquie', en: 'turkey', es: 'turquia', pt: 'turquia', de: 'tuerkei', ru: 'turtsiya', zh: 'tuerqi', ar: 'turkia', hi: 'turkey' },
  // Israel
  'Israël': { fr: 'israel', en: 'israel', es: 'israel', pt: 'israel', de: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  'Israel': { fr: 'israel', en: 'israel', es: 'israel', pt: 'israel', de: 'israel', ru: 'izrail', zh: 'yiselie', ar: 'israil', hi: 'israel' },
  // South Africa
  'Afrique du Sud': { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', pt: 'africa-do-sul', de: 'suedafrika', ru: 'yuzhnaya-afrika', zh: 'nanfei', ar: 'janub-afriqia', hi: 'south-africa' },
  'South Africa': { fr: 'afrique-du-sud', en: 'south-africa', es: 'sudafrica', pt: 'africa-do-sul', de: 'suedafrika', ru: 'yuzhnaya-afrika', zh: 'nanfei', ar: 'janub-afriqia', hi: 'south-africa' },
  // Nigeria
  'Nigéria': { fr: 'nigeria', en: 'nigeria', es: 'nigeria', pt: 'nigeria', de: 'nigeria', ru: 'nigeriya', zh: 'niriliya', ar: 'nijeria', hi: 'nigeria' },
  'Nigeria': { fr: 'nigeria', en: 'nigeria', es: 'nigeria', pt: 'nigeria', de: 'nigeria', ru: 'nigeriya', zh: 'niriliya', ar: 'nijeria', hi: 'nigeria' },
  // Argentina
  'Argentine': { fr: 'argentine', en: 'argentina', es: 'argentina', pt: 'argentina', de: 'argentinien', ru: 'argentina', zh: 'agenting', ar: 'arjentin', hi: 'argentina' },
  'Argentina': { fr: 'argentine', en: 'argentina', es: 'argentina', pt: 'argentina', de: 'argentinien', ru: 'argentina', zh: 'agenting', ar: 'arjentin', hi: 'argentina' },
  // Chile
  'Chili': { fr: 'chili', en: 'chile', es: 'chile', pt: 'chile', de: 'chile', ru: 'chili', zh: 'zhili', ar: 'tshili', hi: 'chile' },
  'Chile': { fr: 'chili', en: 'chile', es: 'chile', pt: 'chile', de: 'chile', ru: 'chili', zh: 'zhili', ar: 'tshili', hi: 'chile' },
  // Colombia
  'Colombie': { fr: 'colombie', en: 'colombia', es: 'colombia', pt: 'colombia', de: 'kolumbien', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kulumbia', hi: 'colombia' },
  'Colombia': { fr: 'colombie', en: 'colombia', es: 'colombia', pt: 'colombia', de: 'kolumbien', ru: 'kolumbiya', zh: 'gelunbiya', ar: 'kulumbia', hi: 'colombia' },
  // Peru
  'Pérou': { fr: 'perou', en: 'peru', es: 'peru', pt: 'peru', de: 'peru', ru: 'peru', zh: 'bilu', ar: 'biru', hi: 'peru' },
  'Peru': { fr: 'perou', en: 'peru', es: 'peru', pt: 'peru', de: 'peru', ru: 'peru', zh: 'bilu', ar: 'biru', hi: 'peru' },
  // New Zealand
  'Nouvelle-Zélande': { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', pt: 'nova-zelandia', de: 'neuseeland', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'niuzilandi', hi: 'new-zealand' },
  'New Zealand': { fr: 'nouvelle-zelande', en: 'new-zealand', es: 'nueva-zelanda', pt: 'nova-zelandia', de: 'neuseeland', ru: 'novaya-zelandiya', zh: 'xinxilan', ar: 'niuzilandi', hi: 'new-zealand' },
  // Ireland
  'Irlande': { fr: 'irlande', en: 'ireland', es: 'irlanda', pt: 'irlanda', de: 'irland', ru: 'irlandiya', zh: 'aierlan', ar: 'irlandia', hi: 'ireland' },
  'Ireland': { fr: 'irlande', en: 'ireland', es: 'irlanda', pt: 'irlanda', de: 'irland', ru: 'irlandiya', zh: 'aierlan', ar: 'irlandia', hi: 'ireland' },
  // Austria
  'Autriche': { fr: 'autriche', en: 'austria', es: 'austria', pt: 'austria', de: 'oesterreich', ru: 'avstriya', zh: 'aodili', ar: 'nimsa', hi: 'austria' },
  'Austria': { fr: 'autriche', en: 'austria', es: 'austria', pt: 'austria', de: 'oesterreich', ru: 'avstriya', zh: 'aodili', ar: 'nimsa', hi: 'austria' },
  // Czech Republic
  'République tchèque': { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', pt: 'republica-tcheca', de: 'tschechien', ru: 'chekhiya', zh: 'jieke', ar: 'tshik', hi: 'czech' },
  'Czech Republic': { fr: 'republique-tcheque', en: 'czech-republic', es: 'republica-checa', pt: 'republica-tcheca', de: 'tschechien', ru: 'chekhiya', zh: 'jieke', ar: 'tshik', hi: 'czech' },
  // Hungary
  'Hongrie': { fr: 'hongrie', en: 'hungary', es: 'hungria', pt: 'hungria', de: 'ungarn', ru: 'vengriya', zh: 'xiongyali', ar: 'hungharia', hi: 'hungary' },
  'Hungary': { fr: 'hongrie', en: 'hungary', es: 'hungria', pt: 'hungria', de: 'ungarn', ru: 'vengriya', zh: 'xiongyali', ar: 'hungharia', hi: 'hungary' },
  // Romania
  'Roumanie': { fr: 'roumanie', en: 'romania', es: 'rumania', pt: 'romenia', de: 'rumaenien', ru: 'ruminiya', zh: 'luomaniya', ar: 'rumania', hi: 'romania' },
  'Romania': { fr: 'roumanie', en: 'romania', es: 'rumania', pt: 'romenia', de: 'rumaenien', ru: 'ruminiya', zh: 'luomaniya', ar: 'rumania', hi: 'romania' },
  // Ukraine
  'Ukraine': { fr: 'ukraine', en: 'ukraine', es: 'ucrania', pt: 'ucrania', de: 'ukraine', ru: 'ukraina', zh: 'wukelan', ar: 'ukrania', hi: 'ukraine' },
  // Pakistan
  'Pakistan': { fr: 'pakistan', en: 'pakistan', es: 'pakistan', pt: 'paquistao', de: 'pakistan', ru: 'pakistan', zh: 'bajisitan', ar: 'bakistan', hi: 'pakistan' },
  // Bangladesh
  'Bangladesh': { fr: 'bangladesh', en: 'bangladesh', es: 'bangladesh', pt: 'bangladesh', de: 'bangladesch', ru: 'bangladesh', zh: 'mengjiala', ar: 'bangladesh', hi: 'bangladesh' },
  // Sri Lanka
  'Sri Lanka': { fr: 'sri-lanka', en: 'sri-lanka', es: 'sri-lanka', pt: 'sri-lanka', de: 'sri-lanka', ru: 'shri-lanka', zh: 'silanka', ar: 'sirilanka', hi: 'srilanka' },
  // Nepal
  'Népal': { fr: 'nepal', en: 'nepal', es: 'nepal', pt: 'nepal', de: 'nepal', ru: 'nepal', zh: 'niboer', ar: 'nepal', hi: 'nepal' },
  'Nepal': { fr: 'nepal', en: 'nepal', es: 'nepal', pt: 'nepal', de: 'nepal', ru: 'nepal', zh: 'niboer', ar: 'nepal', hi: 'nepal' },
  // Cambodia
  'Cambodge': { fr: 'cambodge', en: 'cambodia', es: 'camboya', pt: 'camboja', de: 'kambodscha', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambodia', hi: 'cambodia' },
  'Cambodia': { fr: 'cambodge', en: 'cambodia', es: 'camboya', pt: 'camboja', de: 'kambodscha', ru: 'kambodzha', zh: 'jianpuzhai', ar: 'kambodia', hi: 'cambodia' },
  // Qatar
  'Qatar': { fr: 'qatar', en: 'qatar', es: 'qatar', pt: 'catar', de: 'katar', ru: 'katar', zh: 'kataer', ar: 'qatar', hi: 'qatar' },
  // Kuwait
  'Koweït': { fr: 'koweit', en: 'kuwait', es: 'kuwait', pt: 'kuwait', de: 'kuwait', ru: 'kuveyt', zh: 'keweite', ar: 'kuwait', hi: 'kuwait' },
  'Kuwait': { fr: 'koweit', en: 'kuwait', es: 'kuwait', pt: 'kuwait', de: 'kuwait', ru: 'kuveyt', zh: 'keweite', ar: 'kuwait', hi: 'kuwait' },
  // Bahrain
  'Bahreïn': { fr: 'bahrein', en: 'bahrain', es: 'bahrein', pt: 'bahrein', de: 'bahrain', ru: 'bakhreyn', zh: 'balin', ar: 'bahrain', hi: 'bahrain' },
  'Bahrain': { fr: 'bahrein', en: 'bahrain', es: 'bahrein', pt: 'bahrein', de: 'bahrain', ru: 'bakhreyn', zh: 'balin', ar: 'bahrain', hi: 'bahrain' },
  // Oman
  'Oman': { fr: 'oman', en: 'oman', es: 'oman', pt: 'oma', de: 'oman', ru: 'oman', zh: 'aman', ar: 'oman', hi: 'oman' },
  // Jordan
  'Jordanie': { fr: 'jordanie', en: 'jordan', es: 'jordania', pt: 'jordania', de: 'jordanien', ru: 'iordaniya', zh: 'yuedan', ar: 'urdun', hi: 'jordan' },
  'Jordan': { fr: 'jordanie', en: 'jordan', es: 'jordania', pt: 'jordania', de: 'jordanien', ru: 'iordaniya', zh: 'yuedan', ar: 'urdun', hi: 'jordan' },
  // Lebanon
  'Liban': { fr: 'liban', en: 'lebanon', es: 'libano', pt: 'libano', de: 'libanon', ru: 'livan', zh: 'libanen', ar: 'lubnan', hi: 'lebanon' },
  'Lebanon': { fr: 'liban', en: 'lebanon', es: 'libano', pt: 'libano', de: 'libanon', ru: 'livan', zh: 'libanen', ar: 'lubnan', hi: 'lebanon' },
  // Senegal
  'Sénégal': { fr: 'senegal', en: 'senegal', es: 'senegal', pt: 'senegal', de: 'senegal', ru: 'senegal', zh: 'sainaijiaer', ar: 'sinighal', hi: 'senegal' },
  'Senegal': { fr: 'senegal', en: 'senegal', es: 'senegal', pt: 'senegal', de: 'senegal', ru: 'senegal', zh: 'sainaijiaer', ar: 'sinighal', hi: 'senegal' },
  // Ivory Coast
  'Côte d\'Ivoire': { fr: 'cote-divoire', en: 'ivory-coast', es: 'costa-de-marfil', pt: 'costa-do-marfim', de: 'elfenbeinkueste', ru: 'kot-divuar', zh: 'ketediwa', ar: 'kotdifwar', hi: 'ivory-coast' },
  'Ivory Coast': { fr: 'cote-divoire', en: 'ivory-coast', es: 'costa-de-marfil', pt: 'costa-do-marfim', de: 'elfenbeinkueste', ru: 'kot-divuar', zh: 'ketediwa', ar: 'kotdifwar', hi: 'ivory-coast' },
  // Cameroon
  'Cameroun': { fr: 'cameroun', en: 'cameroon', es: 'camerun', pt: 'camaroes', de: 'kamerun', ru: 'kamerun', zh: 'kaimelongREBR', ar: 'kamerun', hi: 'cameroon' },
  'Cameroon': { fr: 'cameroun', en: 'cameroon', es: 'camerun', pt: 'camaroes', de: 'kamerun', ru: 'kamerun', zh: 'kaimelongREBR', ar: 'kamerun', hi: 'cameroon' },
  // Kenya
  'Kenya': { fr: 'kenya', en: 'kenya', es: 'kenia', pt: 'quenia', de: 'kenia', ru: 'keniya', zh: 'kenniya', ar: 'kinya', hi: 'kenya' },
  // Ghana
  'Ghana': { fr: 'ghana', en: 'ghana', es: 'ghana', pt: 'gana', de: 'ghana', ru: 'gana', zh: 'jiana', ar: 'ghana', hi: 'ghana' },
  // Tanzania
  'Tanzanie': { fr: 'tanzanie', en: 'tanzania', es: 'tanzania', pt: 'tanzania', de: 'tansania', ru: 'tanzaniya', zh: 'tansangniya', ar: 'tanzania', hi: 'tanzania' },
  'Tanzania': { fr: 'tanzanie', en: 'tanzania', es: 'tanzania', pt: 'tanzania', de: 'tansania', ru: 'tanzaniya', zh: 'tansangniya', ar: 'tanzania', hi: 'tanzania' },
  // Luxembourg
  'Luxembourg': { fr: 'luxembourg', en: 'luxembourg', es: 'luxemburgo', pt: 'luxemburgo', de: 'luxemburg', ru: 'lyuksemburg', zh: 'lusenbao', ar: 'luksemburg', hi: 'luxembourg' },
  // Monaco
  'Monaco': { fr: 'monaco', en: 'monaco', es: 'monaco', pt: 'monaco', de: 'monaco', ru: 'monako', zh: 'monage', ar: 'munaku', hi: 'monaco' },
  // Andorra
  'Andorre': { fr: 'andorre', en: 'andorra', es: 'andorra', pt: 'andorra', de: 'andorra', ru: 'andorra', zh: 'andaoer', ar: 'andura', hi: 'andorra' },
  'Andorra': { fr: 'andorre', en: 'andorra', es: 'andorra', pt: 'andorra', de: 'andorra', ru: 'andorra', zh: 'andaoer', ar: 'andura', hi: 'andorra' },
};

const DEFAULT_LOCALES: Record<string, string> = {
  'fr': 'fr', 'en': 'us', 'es': 'es', 'de': 'de', 'pt': 'br',
  'ru': 'ru', 'zh': 'cn', 'ar': 'sa', 'hi': 'in'
};

function getRoleTranslation(role: string, lang: string): string {
  return ROLE_TRANSLATIONS[role]?.[lang] || (role === 'lawyer' ? 'lawyer' : 'expat');
}

function getCountryTranslation(country: string, lang: string): string {
  return COUNTRY_TRANSLATIONS[country]?.[lang] || slugify(country);
}

function generateSlugForLang(firstName: string, role: string, country: string, specialty: string, shortId: string, translationLang: string, outputLang?: string): string {
  // translationLang: language code for looking up translations (e.g., 'zh' for Chinese)
  // outputLang: language code for the URL prefix (e.g., 'ch' for Chinese) - defaults to translationLang
  const urlLang = outputLang || translationLang;
  const roleWord = getRoleTranslation(role, translationLang);
  const countryWord = getCountryTranslation(country, translationLang);
  const categoryCountry = `${roleWord}-${countryWord}`;
  const firstNameSlug = slugify(firstName);
  const specialtySlug = slugify(specialty).substring(0, 15);
  const localeRegion = DEFAULT_LOCALES[translationLang] || urlLang;
  const langLocale = `${urlLang}-${localeRegion}`;
  let namePart = specialtySlug ? `${firstNameSlug}-${specialtySlug}` : firstNameSlug;
  const maxNameLength = 70 - langLocale.length - categoryCountry.length - shortId.length - 4;
  if (namePart.length > maxNameLength) namePart = firstNameSlug;
  return `${langLocale}/${categoryCountry}/${namePart}-${shortId}`;
}

function generateMultilingualSlugs(firstName: string, role: string, country: string, specialty: string, shortId: string): Record<string, string> {
  // IMPORTANT: Use 'ch' for Chinese (internal convention) - NOT 'zh'
  // This must match the LANGUAGES array in sitemaps.ts
  const langs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'ar', 'hi'];
  const slugs: Record<string, string> = {};
  for (const lang of langs) {
    // Map 'ch' to 'zh' for translations lookup (ROLE_TRANSLATIONS and COUNTRY_TRANSLATIONS use 'zh')
    const translationLang = lang === 'ch' ? 'zh' : lang;
    slugs[lang] = generateSlugForLang(firstName, role, country, specialty, shortId, translationLang, lang);
  }
  return slugs;
}

// Interface pour les données du profil provider
interface ProviderProfileData {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  type?: "lawyer" | "expat" | string;
  role?: string;
  country?: string;
  currentCountry?: string;
  residenceCountry?: string;
  // Specialties
  specialties?: string[];
  helpTypes?: string[];
  // Photo fields
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  // Contact fields
  phone?: string;
  phoneNumber?: string;
  city?: string;
  // Stripe fields (peuvent déjà exister si créé manuellement)
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  // PayPal fields (peuvent déjà exister si créé manuellement)
  paypalMerchantId?: string;
  paypalAccountStatus?: string;
  // Business info
  businessName?: string;
  // Language preferences
  preferredLanguage?: string;
  lang?: string;
  // AAA Profile fields (profils gérés en interne)
  isAAA?: boolean;
  isTestProfile?: boolean;
  isSOS?: boolean;
  aaaPayoutMode?: string;
  kycDelegated?: boolean;
  // Meta/Facebook tracking fields
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

// Mapping pays vers code Stripe
const COUNTRY_CODE_MAP: Record<string, string> = {
  "france": "FR",
  "germany": "DE",
  "spain": "ES",
  "italy": "IT",
  "portugal": "PT",
  "belgium": "BE",
  "netherlands": "NL",
  "switzerland": "CH",
  "austria": "AT",
  "united kingdom": "GB",
  "uk": "GB",
  "ireland": "IE",
  "poland": "PL",
  "czech republic": "CZ",
  "hungary": "HU",
  "romania": "RO",
  "bulgaria": "BG",
  "croatia": "HR",
  "greece": "GR",
  "sweden": "SE",
  "norway": "NO",
  "denmark": "DK",
  "finland": "FI",
  "luxembourg": "LU",
  "united states": "US",
  "usa": "US",
  "canada": "CA",
  "australia": "AU",
  "new zealand": "NZ",
  "japan": "JP",
  "singapore": "SG",
  "hong kong": "HK",
  "india": "IN",
  "brazil": "BR",
  "mexico": "MX",
};

// ✅ P0 FIX: Les listes de pays sont maintenant centralisées dans lib/paymentCountries.ts
// Cela évite la duplication et assure la cohérence entre tous les fichiers

/**
 * Migre l'image de profil de registration_temp vers profilePhotos/{userId}
 * - Copie le fichier vers le nouvel emplacement
 * - Met à jour les URLs dans Firestore
 * - Supprime l'ancien fichier
 *
 * @returns La nouvelle URL ou null si pas de migration nécessaire
 */
async function migrateProfileImage(
  uid: string,
  photoUrl: string | undefined,
  providerType: string
): Promise<string | null> {
  // Vérifier si migration nécessaire
  if (!photoUrl || !photoUrl.includes("registration_temp")) {
    console.log(`[migrateProfileImage] Pas de migration nécessaire pour ${uid}`);
    return null;
  }

  console.log(`[migrateProfileImage] Migration de l'image pour ${uid}...`);

  try {
    const bucket = getStorage().bucket();

    // Extraire le chemin du fichier depuis l'URL Firebase Storage
    // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?...
    const urlObj = new URL(photoUrl);
    const encodedPath = urlObj.pathname.split("/o/")[1]?.split("?")[0];

    if (!encodedPath) {
      console.error(`[migrateProfileImage] Impossible d'extraire le chemin depuis: ${photoUrl}`);
      return null;
    }

    const oldPath = decodeURIComponent(encodedPath);
    const fileName = oldPath.split("/").pop();

    if (!fileName) {
      console.error(`[migrateProfileImage] Impossible d'extraire le nom de fichier depuis: ${oldPath}`);
      return null;
    }

    const newPath = `profilePhotos/${uid}/${fileName}`;

    console.log(`[migrateProfileImage] Copie: ${oldPath} -> ${newPath}`);

    // Vérifier que le fichier source existe
    const [sourceExists] = await bucket.file(oldPath).exists();
    if (!sourceExists) {
      console.warn(`[migrateProfileImage] Fichier source introuvable: ${oldPath}`);
      return null;
    }

    // Copier le fichier vers le nouvel emplacement
    await bucket.file(oldPath).copy(bucket.file(newPath));

    // Rendre le nouveau fichier public (comme l'ancien)
    await bucket.file(newPath).makePublic();

    // Construire la nouvelle URL
    const bucketName = bucket.name;
    const newUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(newPath)}?alt=media`;

    console.log(`[migrateProfileImage] Nouvelle URL: ${newUrl}`);

    // Mettre à jour Firestore avec la nouvelle URL
    const updateData = {
      profilePhoto: newUrl,
      photoURL: newUrl,
      avatar: newUrl,
      profilePhotoMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = admin.firestore().batch();

    // Mettre à jour sos_profiles
    batch.update(admin.firestore().collection("sos_profiles").doc(uid), updateData);

    // Mettre à jour la collection spécifique (lawyers ou expats)
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
    batch.set(
      admin.firestore().collection(collectionName).doc(uid),
      updateData,
      { merge: true }
    );

    // Mettre à jour users
    batch.set(
      admin.firestore().collection("users").doc(uid),
      updateData,
      { merge: true }
    );

    await batch.commit();

    console.log(`[migrateProfileImage] Firestore mis à jour pour ${uid}`);

    // Supprimer l'ancien fichier (en arrière-plan, sans bloquer)
    bucket.file(oldPath).delete().then(() => {
      console.log(`[migrateProfileImage] Ancien fichier supprimé: ${oldPath}`);
    }).catch((err) => {
      // Log mais ne pas échouer si la suppression échoue
      console.warn(`[migrateProfileImage] Échec suppression ancien fichier: ${oldPath}`, err);
    });

    console.log(`[migrateProfileImage] ✅ Migration réussie pour ${uid}`);
    return newUrl;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[migrateProfileImage] ❌ Erreur migration pour ${uid}: ${errorMessage}`, error);
    // Ne pas échouer le trigger entier si la migration échoue
    // L'ancienne URL fonctionne toujours
    return null;
  }
}

// ✅ P0 FIX: La fonction getPaymentGateway est maintenant importée de lib/paymentCountries.ts
// Voir getRecommendedPaymentGateway() importé en haut du fichier

/**
 * Normalise le code pays pour Stripe
 */
function normalizeCountryCode(country?: string): string {
  if (!country) return "FR"; // Default: France

  // Si déjà un code ISO à 2 lettres
  if (country.length === 2) {
    return country.toUpperCase();
  }

  // Chercher dans le mapping
  const normalized = country.toLowerCase().trim();
  return COUNTRY_CODE_MAP[normalized] || "FR";
}

/**
 * Détermine le business_type basé sur le type de provider
 */
function getBusinessType(providerType?: string): Stripe.AccountCreateParams.BusinessType {
  // Les lawyers sont généralement des professionnels indépendants
  // Les expats peuvent être des particuliers ou indépendants
  switch (providerType) {
    case "lawyer":
      return "individual"; // Avocat = professionnel individuel
    case "expat":
      return "individual"; // Expat = particulier
    default:
      return "individual";
  }
}

/**
 * Initialise Stripe avec la bonne clé selon le mode - P0 FIX: Use centralized secrets
 */
function initStripe(): Stripe | null {
  const secretKey = getStripeSecretKey();
  const mode = getStripeMode();

  if (!secretKey || !secretKey.startsWith("sk_")) {
    console.error("[onProviderCreated] Stripe secret key not configured or invalid");
    return null;
  }

  console.log(`🔑 [onProviderCreated] Stripe initialized in ${mode.toUpperCase()} mode`);

  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });
}

/**
 * Trigger: sos_profiles/{uid} - onCreate
 * Crée automatiquement un compte Stripe Express pour les nouveaux providers
 */
export const onProviderCreated = onDocumentCreated(
  {
    document: "sos_profiles/{uid}",
    region: "europe-west3",
    memory: "256MiB",      // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB (Stripe API works fine with 256MiB)
    cpu: 0.083,
    timeoutSeconds: 300,   // P1 FIX: Explicit 5-min timeout (Stripe account creation can be slow)
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, META_CAPI_TOKEN],
  },
  async (event) => {
    const uid = event.params.uid;
    const data = event.data?.data() as ProviderProfileData | undefined;

    console.log(`[onProviderCreated] Nouveau profil créé: ${uid}`);

    if (!data) {
      console.warn("[onProviderCreated] Pas de données pour:", uid);
      return;
    }

    // Vérifier le type de provider
    const providerType = data.type || data.role;
    if (providerType !== "lawyer" && providerType !== "expat") {
      console.log(`[onProviderCreated] Type non éligible: ${providerType} pour: ${uid}`);
      return;
    }

    // ========== P0 FIX: IDEMPOTENCY CHECK ==========
    // Empêcher la double exécution du trigger en cas de retry Firebase
    // Vérifie si les comptes de paiement existent déjà AVANT toute autre opération
    const hasExistingStripeAccount = !!data.stripeAccountId;
    const hasExistingPayPalAccount = !!data.paypalMerchantId;
    const hasPaymentAccountSetup = hasExistingStripeAccount || hasExistingPayPalAccount ||
      data.stripeAccountStatus === 'pending_verification' ||
      data.paypalAccountStatus === 'not_connected';

    if (hasPaymentAccountSetup) {
      console.log(`[onProviderCreated] ⚠️ P0 IDEMPOTENCY: Provider ${uid} already has payment setup:`);
      console.log(`  - stripeAccountId: ${data.stripeAccountId || 'none'}`);
      console.log(`  - paypalMerchantId: ${data.paypalMerchantId || 'none'}`);
      console.log(`  - stripeAccountStatus: ${data.stripeAccountStatus || 'none'}`);
      console.log(`  - paypalAccountStatus: ${data.paypalAccountStatus || 'none'}`);
      console.log(`[onProviderCreated] Skipping duplicate trigger execution for: ${uid}`);
      return;
    }
    // ========== END P0 FIX ==========

    // ========== META CAPI TRACKING ==========
    // Track Lead event for provider signup (lawyer or expat registration)
    try {
      const userData: UserData = {
        external_id: uid,
      };

      // Email
      if (data.email) {
        userData.em = data.email.toLowerCase().trim();
      }

      // Phone
      if (data.phone || data.phoneNumber) {
        userData.ph = (data.phone || data.phoneNumber)?.replace(/[^0-9+]/g, "");
      }

      // Names
      if (data.firstName) {
        userData.fn = data.firstName.toLowerCase().trim();
      }
      if (data.lastName) {
        userData.ln = data.lastName.toLowerCase().trim();
      }

      // Location
      if (data.country || data.residenceCountry || data.currentCountry) {
        userData.country = (data.country || data.residenceCountry || data.currentCountry)?.toLowerCase().trim();
      }
      if (data.city) {
        userData.ct = data.city.toLowerCase().trim();
      }

      // Facebook identifiers (if captured during registration)
      if (data.fbp) userData.fbp = data.fbp;
      if (data.fbc) userData.fbc = data.fbc;
      if (data.fbclid) userData.fbc = `fb.1.${Date.now()}.${data.fbclid}`;

      const capiResult = await trackCAPILead({
        userData,
        contentName: `${providerType}_signup`,
        contentCategory: providerType,
        eventSourceUrl: "https://sos-expat.com/become-provider",
      });

      if (capiResult.success) {
        console.log(`✅ [CAPI Provider] Lead tracked for ${providerType} ${uid}`, {
          eventId: capiResult.eventId,
        });

        // Store CAPI tracking info
        await admin.firestore().collection("sos_profiles").doc(uid).update({
          "capiTracking.signupLeadEventId": capiResult.eventId,
          "capiTracking.signupTrackedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.warn(`⚠️ [CAPI Provider] Failed to track lead for ${uid}:`, capiResult.error);
      }
    } catch (capiError) {
      // Don't fail the trigger if CAPI tracking fails
      console.error(`❌ [CAPI Provider] Error tracking lead for ${uid}:`, capiError);
    }
    // ========== END META CAPI TRACKING ==========

    // ⚠️ CORRECTION CRITIQUE: Définir les Custom Claims Firebase pour le provider
    // Sans cela, les Firestore Rules qui utilisent request.auth.token.role ne fonctionnent pas
    try {
      await admin.auth().setCustomUserClaims(uid, { role: providerType });
      console.log(`[onProviderCreated] ✅ Custom Claims définis: role=${providerType} pour: ${uid}`);
    } catch (claimsError) {
      console.error(`[onProviderCreated] ❌ Erreur définition Custom Claims pour ${uid}:`, claimsError);
      // Continuer même si les claims échouent - on peut les définir manuellement plus tard
    }

    // 🔗 GÉNÉRATION AUTOMATIQUE DES SLUGS SEO
    // Format: {lang}-{locale}/{role-pays}/{prenom-specialite-shortid}
    try {
      const shortId = generateShortId(uid);
      const specialty = providerType === 'lawyer'
        ? (Array.isArray(data.specialties) ? data.specialties[0] : '')
        : (Array.isArray(data.helpTypes) ? data.helpTypes[0] : '');
      const slugs = generateMultilingualSlugs(
        data.firstName || 'profil',
        providerType,
        data.country || data.residenceCountry || '',
        specialty || '',
        shortId
      );
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        shortId,
        slugs,
        slugsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[onProviderCreated] ✅ Slugs SEO générés pour: ${uid}`);
      console.log(`[onProviderCreated] 🇫🇷 FR: ${slugs.fr}`);
      console.log(`[onProviderCreated] 🇺🇸 EN: ${slugs.en}`);
    } catch (slugError) {
      console.error(`[onProviderCreated] ❌ Erreur génération slugs pour ${uid}:`, slugError);
      // Non-bloquant: le profil peut fonctionner sans slugs SEO
    }

    // 📸 Migrer l'image de profil de registration_temp vers profilePhotos/{userId}
    // Cette opération est non-bloquante : si elle échoue, l'ancienne URL fonctionne toujours
    const photoUrl = data.profilePhoto || data.photoURL || data.avatar;
    await migrateProfileImage(uid, photoUrl, providerType);

    // 🤖 INITIALISATION ESSAI IA GRATUIT (non-bloquant, idempotent)
    // Donne automatiquement 3 appels d'essai gratuits à chaque nouveau prestataire
    // Sans cela, le frontend voit "no_subscription" et redirige vers les plans payants
    try {
      const subscriptionRef = admin.firestore().doc(`subscriptions/${uid}`);
      const existingSub = await subscriptionRef.get();

      if (!existingSub.exists) {
        const now = admin.firestore.Timestamp.now();
        const MAX_AI_TRIAL_CALLS = 3; // Sync avec DEFAULT_TRIAL_CONFIG.maxAiCalls dans subscription/constants.ts

        const trialBatch = admin.firestore().batch();

        trialBatch.set(subscriptionRef, {
          providerId: uid,
          planId: "trial",
          tier: "trial",
          status: "trialing",
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          currency: "EUR",
          billingPeriod: null,
          currentPeriodStart: now,
          currentPeriodEnd: null,      // Pas de limite de temps
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialStartedAt: now,
          trialEndsAt: null,           // Pas de limite de temps
          aiCallsLimit: MAX_AI_TRIAL_CALLS,
          aiAccessEnabled: true,
          providerType: providerType,
          createdAt: now,
          updatedAt: now,
        });

        trialBatch.set(admin.firestore().doc(`ai_usage/${uid}`), {
          providerId: uid,
          subscriptionId: uid,
          currentPeriodCalls: 0,
          trialCallsUsed: 0,
          totalCallsAllTime: 0,
          aiCallsLimit: MAX_AI_TRIAL_CALLS,
          currentPeriodStart: now,
          currentPeriodEnd: null,
          createdAt: now,
          updatedAt: now,
        });

        await trialBatch.commit();

        // Synchroniser le statut dans sos_profiles et users (non-bloquant)
        await Promise.all([
          admin.firestore().doc(`sos_profiles/${uid}`).set({
            subscriptionStatus: "trialing",
            hasActiveSubscription: true,
            aiCallsLimit: MAX_AI_TRIAL_CALLS,
            aiCallsUsed: 0,
            updatedAt: now,
          }, { merge: true }),
          admin.firestore().doc(`users/${uid}`).set({
            subscriptionStatus: "trialing",
            hasActiveSubscription: true,
            updatedAt: now,
          }, { merge: true }),
        ]);

        console.log(`[onProviderCreated] ✅ Essai IA initialisé: ${uid} → ${MAX_AI_TRIAL_CALLS} appels gratuits (sans limite de temps)`);
      } else {
        console.log(`[onProviderCreated] ⚠️ Abonnement IA déjà existant pour ${uid}, skip init essai`);
      }
    } catch (trialError) {
      // Non-bloquant: l'inscription continue même si l'init trial échoue
      console.error(`[onProviderCreated] ❌ Init essai IA échoué (non-bloquant) pour ${uid}:`, trialError);
    }
    // 🤖 FIN INITIALISATION ESSAI IA

    // ⚠️ PROFILS AAA: Ignorer la création automatique de compte Stripe/PayPal
    // Les profils AAA (gérés en interne par SOS-Expat) utilisent le système de paiement consolidé
    // Ils ont kycDelegated=true et kycStatus='not_required'
    const isAaaProfile = data.isAAA === true ||
                         data.isTestProfile === true ||
                         data.isSOS === true ||
                         uid.startsWith("aaa_");
    if (isAaaProfile) {
      console.log(`[onProviderCreated] ⚠️ Profil AAA détecté: ${uid} - Skip création compte paiement automatique`);
      console.log(`[onProviderCreated] ✅ Profil AAA prêt avec système de paiement consolidé`);
      return;
    }

    // Vérifier si un compte Stripe existe déjà
    if (data.stripeAccountId) {
      console.log(`[onProviderCreated] Compte Stripe déjà existant: ${data.stripeAccountId} pour: ${uid}`);
      return;
    }

    // Vérifier l'email
    if (!data.email) {
      console.error(`[onProviderCreated] Email manquant pour: ${uid}`);
      // Marquer le profil comme nécessitant attention
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        stripeAccountStatus: "error_missing_email",
        stripeError: "Email is required to create Stripe account",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Initialiser Stripe
    const stripe = initStripe();
    if (!stripe) {
      console.error("[onProviderCreated] Stripe non configuré");
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        stripeAccountStatus: "error_stripe_config",
        stripeError: "Stripe is not configured",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Normaliser le pays
    const countryCode = normalizeCountryCode(data.country || data.currentCountry);
    console.log(`[onProviderCreated] Pays normalisé: ${countryCode}`);

    // ✅ P0 FIX: Valider le code pays contre la whitelist
    if (!isValidCountryCode(countryCode)) {
      console.error(`[onProviderCreated] ❌ P0 VALIDATION: Code pays invalide ou non supporté: ${countryCode} pour: ${uid}`);
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        paymentAccountStatus: "error_invalid_country",
        paymentError: `Country code "${countryCode}" is not supported`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Déterminer le gateway de paiement approprié
    // ✅ P0 FIX: Utiliser la fonction centralisée (country already validated)
    const paymentGateway = getRecommendedPaymentGateway(countryCode);
    console.log(`[onProviderCreated] Gateway de paiement: ${paymentGateway} pour ${providerType}: ${uid}`);

    // Déterminer la collection spécifique
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";

    if (paymentGateway === "stripe") {
      // ===== STRIPE: Création automatique du compte Express =====
      await handleStripeProvider(uid, data, providerType, countryCode, collectionName, stripe);
    } else {
      // ===== PAYPAL: Pas de création automatique, provider non visible =====
      await handlePayPalProvider(uid, data, providerType, countryCode, collectionName);
    }
  }
);

/**
 * Gère la création d'un provider Stripe
 * - Crée automatiquement le compte Stripe Express
 * - Provider visible immédiatement
 */
async function handleStripeProvider(
  uid: string,
  data: ProviderProfileData,
  providerType: string,
  countryCode: string,
  collectionName: string,
  stripe: Stripe
): Promise<void> {
  try {
    console.log(`[onProviderCreated] Création compte Stripe Express pour ${providerType}: ${uid}`);

    // Créer le compte Stripe Express
    // Pre-fill with registration data to simplify onboarding (provider can still modify)
    const phoneNumber = data.phone || data.phoneNumber;

    const account = await stripe.accounts.create({
      type: "express",
      country: countryCode,
      email: data.email!,
      business_type: getBusinessType(providerType),
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Pre-fill business profile to simplify onboarding
      business_profile: {
        url: "https://sos-expat.com",
        mcc: "8999", // Professional Services - covers lawyers and expat consultants
        product_description: "Services de conseil juridique et assistance aux expatriés via la plateforme SOS Expat",
      },
      // Pre-fill individual info from registration data (provider can still modify in Stripe form)
      individual: {
        email: data.email,
        ...(data.firstName && { first_name: data.firstName }),
        ...(data.lastName && { last_name: data.lastName }),
        ...(phoneNumber && { phone: phoneNumber }),
        // Pre-fill address with country (city if available)
        address: {
          country: countryCode,
          ...(data.city && { city: data.city }),
        },
      },
      metadata: {
        platform: "sos-expat",
        userId: uid,
        userType: providerType,
        createdBy: "onProviderCreated_trigger",
        createdAt: new Date().toISOString(),
      },
      settings: {
        payouts: {
          schedule: {
            interval: "manual", // Les payouts seront déclenchés manuellement par la plateforme
          },
        },
      },
    });

    console.log(`[onProviderCreated] Compte Stripe créé avec succès: ${account.id}`);

    // Données Stripe à sauvegarder
    // ⚠️ CORRECTION: isVisible = false jusqu'à approbation admin
    // Les providers ne doivent pas être visibles avant validation manuelle
    const stripeData = {
      stripeAccountId: account.id,
      stripeAccountType: "express",
      stripeAccountStatus: "pending_verification",
      kycStatus: "not_started",
      stripeOnboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      paymentGateway: "stripe" as const,
      isVisible: false, // ⚠️ Provider NON visible jusqu'à approbation admin
      stripeCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Mettre à jour toutes les collections pertinentes
    const batch = admin.firestore().batch();

    // 1. sos_profiles (source)
    batch.update(admin.firestore().collection("sos_profiles").doc(uid), stripeData);

    // 2. Collection spécifique (lawyers ou expats)
    batch.set(
      admin.firestore().collection(collectionName).doc(uid),
      {
        ...stripeData,
        email: data.email,
        type: providerType,
      },
      { merge: true }
    );

    // 3. users (si existe)
    batch.set(
      admin.firestore().collection("users").doc(uid),
      stripeData,
      { merge: true }
    );

    await batch.commit();

    console.log(`[onProviderCreated] Données Stripe sauvegardées dans sos_profiles, ${collectionName}, et users pour: ${uid}`);

    // Log d'audit
    await admin.firestore().collection("stripe_account_logs").add({
      userId: uid,
      stripeAccountId: account.id,
      action: "created",
      providerType: providerType,
      country: countryCode,
      trigger: "onProviderCreated",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[onProviderCreated] Compte Stripe Express créé avec succès pour ${providerType}: ${uid}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const stripeErrorCode = (error as any)?.code || "unknown";

    console.error(`[onProviderCreated] Erreur création compte Stripe: ${errorMessage}`, error);

    // Sauvegarder l'erreur dans le profil
    await admin.firestore().collection("sos_profiles").doc(uid).update({
      stripeAccountStatus: "error",
      stripeError: errorMessage,
      stripeErrorCode: stripeErrorCode,
      stripeErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log d'erreur
    await admin.firestore().collection("stripe_account_logs").add({
      userId: uid,
      action: "creation_failed",
      error: errorMessage,
      errorCode: stripeErrorCode,
      providerType: providerType,
      trigger: "onProviderCreated",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Gère la configuration d'un provider PayPal
 * SIMPLIFIÉ: Enregistre automatiquement l'email PayPal (comme Stripe Express)
 * - Email PayPal = email principal du provider (ou email PayPal spécifique si fourni)
 * - Prêt pour PayPal Payouts API
 * - Provider NON visible jusqu'à approbation admin (même logique que Stripe)
 */
async function handlePayPalProvider(
  uid: string,
  data: ProviderProfileData,
  providerType: string,
  countryCode: string,
  collectionName: string
): Promise<void> {
  console.log(`[onProviderCreated] 📧 Configuration PayPal automatique pour ${providerType}: ${uid} (pays: ${countryCode})`);

  // Utiliser l'email principal comme email PayPal par défaut
  // L'utilisateur pourra le modifier dans son dashboard si besoin
  const paypalEmail = (data as any).paypalEmail || data.email;

  console.log(`[onProviderCreated] Email PayPal enregistré: ${paypalEmail}`);

  // Données PayPal à sauvegarder
  // ✅ SIMPLIFIÉ: Juste l'email PayPal, pas de Partner Referrals complexes
  const paypalData = {
    paymentGateway: "paypal" as const,
    paypalEmail: paypalEmail, // 🆕 Email PayPal pour Payouts API
    paypalAccountStatus: "active", // 🆕 Actif automatiquement (pas besoin de vérification Partner)
    paypalEmailVerified: false, // À vérifier lors du premier payout
    isVisible: false, // ⚠️ Provider NON visible jusqu'à approbation admin (comme Stripe)
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Mettre à jour toutes les collections pertinentes
  const batch = admin.firestore().batch();

  // 1. sos_profiles (source)
  batch.update(admin.firestore().collection("sos_profiles").doc(uid), paypalData);

  // 2. Collection spécifique (lawyers ou expats)
  batch.set(
    admin.firestore().collection(collectionName).doc(uid),
    {
      ...paypalData,
      email: data.email,
      type: providerType,
    },
    { merge: true }
  );

  // 3. users (si existe)
  batch.set(
    admin.firestore().collection("users").doc(uid),
    paypalData,
    { merge: true }
  );

  await batch.commit();

  console.log(`[onProviderCreated] Données PayPal sauvegardées dans sos_profiles, ${collectionName}, et users pour: ${uid}`);

  // Log d'audit
  await admin.firestore().collection("paypal_account_logs").add({
    userId: uid,
    action: "paypal_email_registered",
    paypalEmail: paypalEmail,
    providerType: providerType,
    country: countryCode,
    trigger: "onProviderCreated",
    message: "PayPal email automatically registered (simplified system)",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[onProviderCreated] ✅ Email PayPal enregistré avec succès pour ${providerType}: ${uid}`);
}

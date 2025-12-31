// src/utils/specialtyMapper.ts
// Utilitaire pour mapper les codes de spécialités Firestore vers les codes de traduction

import {
  getLawyerSpecialityLabel,
  flattenLawyerSpecialities,
  type LawyerSpecialityItem,
} from '../data/lawyer-specialties';

type LocaleType = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'ar' | 'hi';

/**
 * Convertit un code camelCase vers SCREAMING_SNAKE_CASE
 * Ex: "drtContratsTravailEtrangers" → "DRT_CONTRATS_TRAVAIL_ETRANGERS"
 */
function camelToSnake(str: string): string {
  return str
    // Insère underscore avant chaque majuscule
    .replace(/([A-Z])/g, '_$1')
    // Convertit en majuscules
    .toUpperCase()
    // Retire underscore initial si présent
    .replace(/^_/, '');
}

/**
 * Mapping explicite des codes Firestore vers les codes de traduction
 * pour les cas qui ne suivent pas la règle camelCase → SCREAMING_SNAKE_CASE
 */
const SPECIALTY_CODE_MAPPING: Record<string, string> = {
  // Urgences
  'urgAssistancePenaleInternationale': 'URG_ASSISTANCE_PENALE_INTERNATIONALE',
  'urgGardeAVueEtranger': 'URG_GARDE_A_VUE_ETRANGER',
  'urgExpulsionUrgente': 'URG_EXPULSION_URGENTE',
  'urgAccidentsResponsabiliteCivile': 'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'urgRapatriementUrgence': 'URG_RAPATRIEMENT_URGENCE',

  // Visas / Immigration
  'visVisaTravail': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'visVisaEntrepreneur': 'IMMI_VISAS_PERMIS_SEJOUR',
  'visVisaInvestisseur': 'IMMI_VISAS_PERMIS_SEJOUR',
  'visVisaEtudiant': 'IMMI_VISAS_PERMIS_SEJOUR',
  'visRegroupementFamilial': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'visNaturalisation': 'IMMI_NATURALISATION',
  'visCarteSejour': 'IMMI_VISAS_PERMIS_SEJOUR',
  'visAsileRefugies': 'IMMI_VISAS_PERMIS_SEJOUR',
  'immiVisasPermisSejour': 'IMMI_VISAS_PERMIS_SEJOUR',
  'immiContratsTravailInternational': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'immiNaturalisation': 'IMMI_NATURALISATION',

  // Droit du travail
  'drtDroitTravailInternational': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'drtContratsTravailEtrangers': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'drtLicenciementEtranger': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',

  // Famille
  'famDivorceInternational': 'FAM_MARIAGE_DIVORCE',
  'famGardeEnfantsInternationale': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'famPensionAlimentaire': 'FAM_MARIAGE_DIVORCE',
  'famMariageMixte': 'FAM_MARIAGE_DIVORCE',
  'famAdoptionInternationale': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'famMariageDivorce': 'FAM_MARIAGE_DIVORCE',
  'famGardeEnfantsTransfrontaliere': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'famScolariteInternationale': 'FAM_SCOLARITE_INTERNATIONALE',

  // Fiscalité
  'fiscFiscaliteExpats': 'FISC_OPTIMISATION_EXPATRIES',
  'fiscDoubleImposition': 'FISC_DOUBLE_IMPOSITION',
  'fiscOptimisationFiscale': 'FISC_OPTIMISATION_EXPATRIES',
  'fiscSuccessionInternationale': 'PATR_SUCCESSIONS_INTERNATIONALES',
  'fiscDeclarationsInternationales': 'FISC_DECLARATIONS_INTERNATIONALES',
  'fiscOptimisationExpatries': 'FISC_OPTIMISATION_EXPATRIES',

  // Immobilier
  'immAchatImmobilierEtranger': 'IMMO_ACHAT_VENTE',
  'immBailCommercialInternational': 'IMMO_LOCATION_BAUX',
  'immLitigeImmobilier': 'IMMO_LITIGES_IMMOBILIERS',
  'immoAchatVente': 'IMMO_ACHAT_VENTE',
  'immoLocationBaux': 'IMMO_LOCATION_BAUX',
  'immoLitigesImmobiliers': 'IMMO_LITIGES_IMMOBILIERS',

  // Entreprise
  'entCreationSociete': 'ENTR_CREATION_ENTREPRISE_ETRANGER',
  'entDroitCommercialInternational': 'ENTR_INVESTISSEMENTS',
  'entFusionAcquisition': 'ENTR_INVESTISSEMENTS',
  'entrCreationEntrepriseEtranger': 'ENTR_CREATION_ENTREPRISE_ETRANGER',
  'entrInvestissements': 'ENTR_INVESTISSEMENTS',
  'entrImportExport': 'ENTR_IMPORT_EXPORT',

  // Civil / Responsabilité
  'civAccidentsEtranger': 'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'civResponsabiliteCivile': 'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'civAssuranceInternationale': 'ASSU_ASSURANCES_INTERNATIONALES',

  // Successions
  'sucTestamentInternational': 'PATR_TESTAMENTS',
  'sucHeraitageTransfrontalier': 'PATR_SUCCESSIONS_INTERNATIONALES',
  'sucHeritageTransfrontalier': 'PATR_SUCCESSIONS_INTERNATIONALES',
  'patrSuccessionsInternationales': 'PATR_SUCCESSIONS_INTERNATIONALES',
  'patrGestionPatrimoine': 'PATR_GESTION_PATRIMOINE',
  'patrTestaments': 'PATR_TESTAMENTS',

  // Assurances
  'assuAssurancesInternationales': 'ASSU_ASSURANCES_INTERNATIONALES',
  'assuProtectionDonnees': 'ASSU_PROTECTION_DONNEES',
  'assuContentieuxAdministratifs': 'ASSU_CONTENTIEUX_ADMINISTRATIFS',

  // Services courants
  'curTraductionsLegalisations': 'CUR_TRADUCTIONS_LEGALISATIONS',
  'curReclamationsLitigesMineurs': 'CUR_RECLAMATIONS_LITIGES_MINEURS',
  'curDemarchesAdministratives': 'CUR_DEMARCHES_ADMINISTRATIVES',

  // Banque
  'bankProblemesComptesBancaires': 'BANK_PROBLEMES_COMPTES_BANCAIRES',
  'bankVirementsCredits': 'BANK_VIREMENTS_CREDITS',
  'bankServicesFinanciers': 'BANK_SERVICES_FINANCIERS',

  // Argent
  'argtRetardsSalaireImpayes': 'ARGT_RETARDS_SALAIRE_IMPAYES',
  'argtArnaquesEscroqueries': 'ARGT_ARNAQUES_ESCROQUERIES',
  'argtSurendettementPlans': 'ARGT_SURENDETTEMENT_PLANS',
  'argtFraisBancairesAbusifs': 'ARGT_FRAIS_BANCAIRES_ABUSIFS',
  'argtLitigesEtablissementsCredit': 'ARGT_LITIGES_ETABLISSEMENTS_CREDIT',

  // Relations
  'relaConflitsVoisinage': 'RELA_CONFLITS_VOISINAGE',
  'relaConflitsTravail': 'RELA_CONFLITS_TRAVAIL',
  'relaConflitsFamiliaux': 'RELA_CONFLITS_FAMILIAUX',
  'relaMediationResolutionAmiable': 'RELA_MEDIATION_RESOLUTION_AMIABLE',
  'relaDiffamationReputation': 'RELA_DIFFAMATION_REPUTATION',

  // Transport
  'tranProblemesAeriens': 'TRAN_PROBLEMES_AERIENS',
  'tranBagagesPerdusEndommages': 'TRAN_BAGAGES_PERDUS_ENDOMMAGES',
  'tranAccidentsTransport': 'TRAN_ACCIDENTS_TRANSPORT',

  // Santé
  'santErreursMedicales': 'SANT_ERREURS_MEDICALES',
  'santRemboursementsSoins': 'SANT_REMBOURSEMENTS_SOINS',
  'santDroitMedical': 'SANT_DROIT_MEDICAL',

  // Numérique
  'numCybercriminalite': 'NUM_CYBERCRIMINALITE',
  'numContratsEnLigne': 'NUM_CONTRATS_EN_LIGNE',
  'numProtectionNumerique': 'NUM_PROTECTION_NUMERIQUE',

  // Violence
  'vioHarcelement': 'VIO_HARCELEMENT',
  'vioViolencesDomestiques': 'VIO_VIOLENCES_DOMESTIQUES',
  'vioDiscriminations': 'VIO_DISCRIMINATIONS',

  // Propriété intellectuelle
  'ipContrefacons': 'IP_CONTREFACONS',
  'ipBrevetsMarques': 'IP_BREVETS_MARQUES',
  'ipDroitsAuteur': 'IP_DROITS_AUTEUR',

  // Environnement
  'envNuisances': 'ENV_NUISANCES',
  'envPermisConstruire': 'ENV_PERMIS_CONSTRUIRE',
  'envDroitUrbanisme': 'ENV_DROIT_URBANISME',

  // Retour France
  'retRapatriementBiens': 'RET_RAPATRIEMENT_BIENS',
  'retReintegrationFiscaleSociale': 'RET_REINTEGRATION_FISCALE_SOCIALE',

  // Consommation
  'consAchatsDefectueuxEtranger': 'CONS_ACHATS_DEFECTUEUX_ETRANGER',
  'consServicesNonConformes': 'CONS_SERVICES_NON_CONFORMES',
  'consEcommerceInternational': 'CONS_ECOMMERCE_INTERNATIONAL',

  // Autre
  'othPreciserBesoin': 'OTH_PRECISER_BESOIN',
};

// Cache pour les recherches de spécialités
let allSpecialtiesCache: ReturnType<typeof flattenLawyerSpecialities> | null = null;

function getAllSpecialties() {
  if (!allSpecialtiesCache) {
    allSpecialtiesCache = flattenLawyerSpecialities();
  }
  return allSpecialtiesCache;
}

/**
 * Trouve le code de traduction correspondant à un code Firestore
 */
function findTranslationCode(firestoreCode: string): string | null {
  // 1. Vérifier le mapping explicite
  if (SPECIALTY_CODE_MAPPING[firestoreCode]) {
    return SPECIALTY_CODE_MAPPING[firestoreCode];
  }

  // 2. Essayer la conversion directe camelCase → SCREAMING_SNAKE_CASE
  const snakeCode = camelToSnake(firestoreCode);
  const allSpecs = getAllSpecialties();
  if (allSpecs.find(s => s.code === snakeCode)) {
    return snakeCode;
  }

  // 3. Essayer en majuscules directement
  const upperCode = firestoreCode.toUpperCase();
  if (allSpecs.find(s => s.code === upperCode)) {
    return upperCode;
  }

  // 4. Essayer avec le code tel quel (peut-être déjà au bon format)
  if (allSpecs.find(s => s.code === firestoreCode)) {
    return firestoreCode;
  }

  return null;
}

/**
 * Obtient le label traduit d'une spécialité à partir d'un code Firestore
 * @param firestoreCode - Code de spécialité stocké dans Firestore (camelCase ou autre)
 * @param locale - Langue cible pour la traduction
 * @returns Label traduit ou formatage lisible du code si pas de traduction
 */
export function getSpecialtyLabel(
  firestoreCode: string,
  locale: LocaleType = 'fr'
): string {
  // Chercher le code de traduction correspondant
  const translationCode = findTranslationCode(firestoreCode);

  if (translationCode) {
    const label = getLawyerSpecialityLabel(translationCode, locale);
    if (label !== translationCode) {
      return label;
    }
  }

  // Fallback: formater le code de façon lisible
  return formatSpecialtyCodeReadable(firestoreCode, locale);
}

/**
 * Formate un code de spécialité de façon lisible (fallback)
 */
function formatSpecialtyCodeReadable(code: string, locale: LocaleType): string {
  // Labels localisés pour les préfixes
  const prefixLabels: Record<string, Record<LocaleType, string>> = {
    'urg': { fr: 'Urgence', en: 'Emergency', es: 'Urgencia', de: 'Notfall', pt: 'Urgência', ru: 'Срочно', zh: '紧急', ar: 'طوارئ', hi: 'आपातकाल' },
    'drt': { fr: 'Droit', en: 'Law', es: 'Derecho', de: 'Recht', pt: 'Direito', ru: 'Право', zh: '法律', ar: 'قانون', hi: 'कानून' },
    'civ': { fr: 'Civil', en: 'Civil', es: 'Civil', de: 'Zivil', pt: 'Civil', ru: 'Гражданский', zh: '民事', ar: 'مدني', hi: 'सिविल' },
    'immi': { fr: 'Immigration', en: 'Immigration', es: 'Inmigración', de: 'Einwanderung', pt: 'Imigração', ru: 'Иммиграция', zh: '移民', ar: 'هجرة', hi: 'आप्रवासन' },
    'vis': { fr: 'Visa', en: 'Visa', es: 'Visa', de: 'Visum', pt: 'Visto', ru: 'Виза', zh: '签证', ar: 'تأشيرة', hi: 'वीज़ा' },
    'fisc': { fr: 'Fiscal', en: 'Tax', es: 'Fiscal', de: 'Steuer', pt: 'Fiscal', ru: 'Налог', zh: '税务', ar: 'ضريبة', hi: 'कर' },
    'fam': { fr: 'Famille', en: 'Family', es: 'Familia', de: 'Familie', pt: 'Família', ru: 'Семья', zh: '家庭', ar: 'عائلة', hi: 'परिवार' },
    'immo': { fr: 'Immobilier', en: 'Real Estate', es: 'Inmobiliario', de: 'Immobilien', pt: 'Imobiliário', ru: 'Недвижимость', zh: '房产', ar: 'عقارات', hi: 'अचल संपत्ति' },
    'imm': { fr: 'Immobilier', en: 'Real Estate', es: 'Inmobiliario', de: 'Immobilien', pt: 'Imobiliário', ru: 'Недвижимость', zh: '房产', ar: 'عقارات', hi: 'अचल संपत्ति' },
    'patr': { fr: 'Patrimoine', en: 'Wealth', es: 'Patrimonio', de: 'Vermögen', pt: 'Patrimônio', ru: 'Наследство', zh: '财产', ar: 'تركة', hi: 'विरासत' },
    'entr': { fr: 'Entreprise', en: 'Business', es: 'Empresa', de: 'Unternehmen', pt: 'Empresa', ru: 'Бизнес', zh: '企业', ar: 'شركة', hi: 'व्यापार' },
    'ent': { fr: 'Entreprise', en: 'Business', es: 'Empresa', de: 'Unternehmen', pt: 'Empresa', ru: 'Бизнес', zh: '企业', ar: 'شركة', hi: 'व्यापार' },
    'assu': { fr: 'Assurance', en: 'Insurance', es: 'Seguro', de: 'Versicherung', pt: 'Seguro', ru: 'Страхование', zh: '保险', ar: 'تأمين', hi: 'बीमा' },
    'cons': { fr: 'Consommation', en: 'Consumer', es: 'Consumo', de: 'Verbraucher', pt: 'Consumo', ru: 'Потребитель', zh: '消费', ar: 'استهلاك', hi: 'उपभोक्ता' },
    'bank': { fr: 'Banque', en: 'Banking', es: 'Banca', de: 'Bank', pt: 'Banco', ru: 'Банк', zh: '银行', ar: 'مصرف', hi: 'बैंक' },
    'argt': { fr: 'Argent', en: 'Money', es: 'Dinero', de: 'Geld', pt: 'Dinheiro', ru: 'Деньги', zh: '金钱', ar: 'مال', hi: 'पैसा' },
    'rela': { fr: 'Relations', en: 'Relations', es: 'Relaciones', de: 'Beziehungen', pt: 'Relações', ru: 'Отношения', zh: '关系', ar: 'علاقات', hi: 'संबंध' },
    'tran': { fr: 'Transport', en: 'Transport', es: 'Transporte', de: 'Transport', pt: 'Transporte', ru: 'Транспорт', zh: '交通', ar: 'نقل', hi: 'परिवहन' },
    'sant': { fr: 'Santé', en: 'Health', es: 'Salud', de: 'Gesundheit', pt: 'Saúde', ru: 'Здоровье', zh: '健康', ar: 'صحة', hi: 'स्वास्थ्य' },
    'num': { fr: 'Numérique', en: 'Digital', es: 'Digital', de: 'Digital', pt: 'Digital', ru: 'Цифровой', zh: '数字', ar: 'رقمي', hi: 'डिजिटल' },
    'vio': { fr: 'Violence', en: 'Violence', es: 'Violencia', de: 'Gewalt', pt: 'Violência', ru: 'Насилие', zh: '暴力', ar: 'عنف', hi: 'हिंसा' },
    'ip': { fr: 'Propriété intellectuelle', en: 'Intellectual Property', es: 'Propiedad Intelectual', de: 'Geistiges Eigentum', pt: 'Propriedade Intelectual', ru: 'Интеллектуальная собственность', zh: '知识产权', ar: 'ملكية فكرية', hi: 'बौद्धिक संपदा' },
    'env': { fr: 'Environnement', en: 'Environment', es: 'Medio Ambiente', de: 'Umwelt', pt: 'Meio Ambiente', ru: 'Окружающая среда', zh: '环境', ar: 'بيئة', hi: 'पर्यावरण' },
    'ret': { fr: 'Retour', en: 'Return', es: 'Retorno', de: 'Rückkehr', pt: 'Retorno', ru: 'Возврат', zh: '返回', ar: 'عودة', hi: 'वापसी' },
    'cur': { fr: 'Services', en: 'Services', es: 'Servicios', de: 'Dienste', pt: 'Serviços', ru: 'Услуги', zh: '服务', ar: 'خدمات', hi: 'सेवाएं' },
    'suc': { fr: 'Succession', en: 'Inheritance', es: 'Sucesión', de: 'Erbschaft', pt: 'Sucessão', ru: 'Наследство', zh: '继承', ar: 'وراثة', hi: 'उत्तराधिकार' },
  };

  // Extraire le préfixe (tout ce qui est en minuscules au début)
  const prefixMatch = code.match(/^([a-z]+)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';

  // Obtenir le reste du code après le préfixe
  const rest = code.slice(prefix.length);

  // Formater le reste: camelCase/SCREAMING_SNAKE → mots séparés
  const words = rest
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(w => w.length > 0);

  // Construire le label final
  const prefixLabel = prefixLabels[prefix]?.[locale] || prefixLabels[prefix]?.['fr'] || '';

  if (words.length === 0) {
    return prefixLabel || code;
  }

  // Combiner préfixe + mots
  const wordsFormatted = words.join(' ');
  if (prefixLabel) {
    return `${prefixLabel} ${wordsFormatted}`;
  }

  // Capitaliser la première lettre
  return wordsFormatted.charAt(0).toUpperCase() + wordsFormatted.slice(1);
}

/**
 * Formate une liste de spécialités pour affichage
 * @param specialties - Liste des codes de spécialités
 * @param locale - Langue cible
 * @param maxDisplay - Nombre max de spécialités à afficher (défaut: 2)
 * @returns Chaîne formatée avec les spécialités
 */
export function formatSpecialties(
  specialties: string[] | undefined,
  locale: LocaleType = 'fr',
  maxDisplay: number = 2
): string {
  if (!specialties || specialties.length === 0) {
    return '';
  }

  const labels = specialties.slice(0, maxDisplay).map(spec => getSpecialtyLabel(spec, locale));
  let result = labels.join(' • ');

  if (specialties.length > maxDisplay) {
    result += ` +${specialties.length - maxDisplay}`;
  }

  return result;
}

/**
 * Mapping des codes de langue de l'application vers le format de locale
 */
export function mapLanguageToLocale(language: string): LocaleType {
  const langMap: Record<string, LocaleType> = {
    fr: 'fr', en: 'en', es: 'es', de: 'de', pt: 'pt',
    ru: 'ru', ch: 'zh', zh: 'zh', ar: 'ar', hi: 'hi'
  };
  return langMap[language] || 'fr';
}

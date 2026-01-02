/**
 * Script de migration des codes de spécialités
 * =============================================
 *
 * Ce script convertit les codes de spécialités en format camelCase
 * vers le format SCREAMING_SNAKE_CASE dans Firebase.
 *
 * Exemple: "visVisaTravail" → "IMMI_VISAS_PERMIS_SEJOUR"
 *
 * Usage depuis la console du navigateur (dans l'admin):
 *   import { migrateAllSpecialtyCodes, previewMigration } from './scripts/migrateSpecialtyCodes';
 *
 *   // D'abord prévisualiser les changements
 *   await previewMigration();
 *
 *   // Puis exécuter la migration
 *   await migrateAllSpecialtyCodes();
 */

import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// =============================================
// MAPPING INTELLIGENT POUR CODES INVALIDES
// =============================================

// Mapping des codes invalides vers des codes valides pour les AVOCATS
// ✅ CORRIGÉ: Tous les codes cibles existent dans lawyer-specialties.ts
const INVALID_LAWYER_CODE_MAPPING: Record<string, string> = {
  // Texte libre → spécialités valides
  'multitasking': 'CUR_DEMARCHES_ADMINISTRATIVES',
  'hard_working': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'Intellectual Property': 'IP_BREVETS_MARQUES',
  'intellectual property': 'IP_BREVETS_MARQUES',
  'intellectual_property': 'IP_BREVETS_MARQUES',
  'INTELLECTUAL_PROPERTY': 'IP_BREVETS_MARQUES',
  'INTELLECTUAL _PROPERTY': 'IP_BREVETS_MARQUES',
  'property': 'IMMO_ACHAT_VENTE',
  'immigration': 'IMMI_VISAS_PERMIS_SEJOUR',
  'family': 'FAM_MARIAGE_DIVORCE',
  'tax': 'FISC_OPTIMISATION_EXPATRIES',
  'business': 'ENTR_CREATION_ENTREPRISE_ETRANGER',
  'criminal': 'URG_ASSISTANCE_PENALE_INTERNATIONALE', // ✅ Corrigé: URG_GARDE_A_VUE_ETRANGER n'existe pas
  'labor': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'labour': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'work': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'visa': 'IMMI_VISAS_PERMIS_SEJOUR',
  'divorce': 'FAM_MARIAGE_DIVORCE',
  'real estate': 'IMMO_ACHAT_VENTE',
  'contract': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'corporate': 'ENTR_CREATION_ENTREPRISE_ETRANGER',

  // =============================================
  // CODES AAA GÉNÉRÉS AVEC ANCIENS NOMS
  // =============================================

  // Anciens codes URG obsolètes
  'URG_GARDE_A_VUE_ETRANGER': 'URG_ASSISTANCE_PENALE_INTERNATIONALE',
  'URG_EXPULSION_URGENTE': 'URG_RAPATRIEMENT_URGENCE',

  // Visas / Immigration
  'VIS_NATURALISATION': 'IMMI_NATURALISATION',
  'VIS_VISA_TRAVAIL': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'VIS_VISA_ENTREPRENEUR': 'IMMI_VISAS_PERMIS_SEJOUR',
  'VIS_VISA_INVESTISSEUR': 'IMMI_VISAS_PERMIS_SEJOUR',
  'VIS_VISA_ETUDIANT': 'IMMI_VISAS_PERMIS_SEJOUR',
  'VIS_CARTE_SEJOUR': 'IMMI_VISAS_PERMIS_SEJOUR',
  'VIS_ASILE_REFUGIES': 'IMMI_VISAS_PERMIS_SEJOUR',
  'VIS_REGROUPEMENT_FAMILIAL': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',

  // Droit du travail
  'DRT_DROIT_TRAVAIL_INTERNATIONAL': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'DRT_CONTRATS_TRAVAIL_ETRANGERS': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',
  'DRT_LICENCIEMENT_ETRANGER': 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL',

  // Famille
  'FAM_DIVORCE_INTERNATIONAL': 'FAM_MARIAGE_DIVORCE',
  'FAM_GARDE_ENFANTS_INTERNATIONALE': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',
  'FAM_PENSION_ALIMENTAIRE': 'FAM_MARIAGE_DIVORCE',
  'FAM_MARIAGE_MIXTE': 'FAM_MARIAGE_DIVORCE',
  'FAM_ADOPTION_INTERNATIONALE': 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE',

  // Fiscalité
  'FISC_FISCALITE_EXPATS': 'FISC_OPTIMISATION_EXPATRIES',
  'FISC_OPTIMISATION_FISCALE': 'FISC_OPTIMISATION_EXPATRIES',
  'FISC_SUCCESSION_INTERNATIONALE': 'PATR_SUCCESSIONS_INTERNATIONALES',

  // Immobilier
  'IMM_ACHAT_IMMOBILIER_ETRANGER': 'IMMO_ACHAT_VENTE',
  'IMM_BAIL_COMMERCIAL_INTERNATIONAL': 'IMMO_LOCATION_BAUX',
  'IMM_LITIGE_IMMOBILIER': 'IMMO_LITIGES_IMMOBILIERS',

  // Entreprise
  'ENT_CREATION_SOCIETE': 'ENTR_CREATION_ENTREPRISE_ETRANGER',
  'ENT_DROIT_COMMERCIAL_INTERNATIONAL': 'ENTR_INVESTISSEMENTS',
  'ENT_FUSION_ACQUISITION': 'ENTR_INVESTISSEMENTS',

  // Civil / Responsabilité
  'CIV_ACCIDENTS_ETRANGER': 'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'CIV_RESPONSABILITE_CIVILE': 'URG_ACCIDENTS_RESPONSABILITE_CIVILE',
  'CIV_ASSURANCE_INTERNATIONALE': 'ASSU_ASSURANCES_INTERNATIONALES',

  // Successions
  'SUC_TESTAMENT_INTERNATIONAL': 'PATR_TESTAMENTS',
  'SUC_HERITAGE_TRANSFRONTALIER': 'PATR_SUCCESSIONS_INTERNATIONALES',
};

// Mapping des codes invalides vers des codes valides pour les EXPATRIÉS
// ✅ CORRIGÉ: Tous les codes cibles existent maintenant dans expat-help-types.ts
const INVALID_EXPAT_CODE_MAPPING: Record<string, string> = {
  // Texte libre anglais → codes valides
  'Phone & internet': 'TELEPHONE_INTERNET',
  'phone & internet': 'TELEPHONE_INTERNET',
  'phone': 'TELEPHONE_INTERNET',
  'internet': 'TELEPHONE_INTERNET',
  'housing': 'RECHERCHE_LOGEMENT',
  'bank': 'OUVERTURE_COMPTE_BANCAIRE',
  'banking': 'OUVERTURE_COMPTE_BANCAIRE',
  'health': 'SYSTEME_SANTE',
  'healthcare': 'SYSTEME_SANTE',
  'school': 'EDUCATION_ECOLES',
  'education': 'EDUCATION_ECOLES',
  'transport': 'TRANSPORT',
  'job': 'RECHERCHE_EMPLOI',
  'work': 'RECHERCHE_EMPLOI',
  'employment': 'RECHERCHE_EMPLOI',
  'insurance': 'ASSURANCES',
  'tax': 'FISCALITE_LOCALE',
  'taxes': 'FISCALITE_LOCALE',
  'legal': 'DEMARCHES_ADMINISTRATIVES',
  'language': 'CULTURE_INTEGRATION',
  'culture': 'CULTURE_INTEGRATION',
  'moving': 'INSTALLATION',
  'relocation': 'INSTALLATION',
  'settling': 'INSTALLATION',
  'admin': 'DEMARCHES_ADMINISTRATIVES',
  'administration': 'DEMARCHES_ADMINISTRATIVES',
  'other': 'AUTRE_PRECISER',
  'security': 'SECURITE',
  'emergency': 'URGENCES',
  'money': 'PROBLEMES_ARGENT',
  'food': 'ALIMENTATION_COURSES',
  'shopping': 'ALIMENTATION_COURSES',
  'leisure': 'LOISIRS_SORTIES',
  'sports': 'SPORTS_ACTIVITES',
  'visa': 'VISA_IMMIGRATION',
  'business': 'CREATION_ENTREPRISE',

  // Anciens codes obsolètes → codes valides actuels
  'FISCALITE': 'FISCALITE_LOCALE',
  'AIDE_JURIDIQUE': 'DEMARCHES_ADMINISTRATIVES',
  'COURS_LANGUE': 'CULTURE_INTEGRATION',
  'INTEGRATION_CULTURELLE': 'CULTURE_INTEGRATION',
  'DEMENAGEMENT': 'INSTALLATION',
  'VIE_QUOTIDIENNE': 'ALIMENTATION_COURSES',
  'LOISIRS': 'LOISIRS_SORTIES',
  'TRAVAIL': 'RECHERCHE_EMPLOI',
  'FAMILLE': 'PROBLEMES_RELATIONNELS',
  'SANTE': 'SYSTEME_SANTE',

  // Codes avocat utilisés par erreur pour expats
  'OTH_PRECISER_BESOIN': 'AUTRE_PRECISER',
  'IMMI_VISAS_PERMIS_SEJOUR': 'VISA_IMMIGRATION',
};

// Codes valides pour les avocats (liste de référence)
// ✅ CORRIGÉ: Synchronisé avec lawyer-specialties.ts (58 codes)
const VALID_LAWYER_CODES = [
  // URG - Urgences (3)
  'URG_ASSISTANCE_PENALE_INTERNATIONALE', 'URG_ACCIDENTS_RESPONSABILITE_CIVILE', 'URG_RAPATRIEMENT_URGENCE',
  // CUR - Services courants (3)
  'CUR_TRADUCTIONS_LEGALISATIONS', 'CUR_RECLAMATIONS_LITIGES_MINEURS', 'CUR_DEMARCHES_ADMINISTRATIVES',
  // IMMI - Immigration et travail (3)
  'IMMI_VISAS_PERMIS_SEJOUR', 'IMMI_CONTRATS_TRAVAIL_INTERNATIONAL', 'IMMI_NATURALISATION',
  // IMMO - Immobilier (3)
  'IMMO_ACHAT_VENTE', 'IMMO_LOCATION_BAUX', 'IMMO_LITIGES_IMMOBILIERS',
  // FISC - Fiscalité (3)
  'FISC_DECLARATIONS_INTERNATIONALES', 'FISC_DOUBLE_IMPOSITION', 'FISC_OPTIMISATION_EXPATRIES',
  // FAM - Famille (3)
  'FAM_MARIAGE_DIVORCE', 'FAM_GARDE_ENFANTS_TRANSFRONTALIERE', 'FAM_SCOLARITE_INTERNATIONALE',
  // PATR - Patrimoine (3)
  'PATR_SUCCESSIONS_INTERNATIONALES', 'PATR_GESTION_PATRIMOINE', 'PATR_TESTAMENTS',
  // ENTR - Entreprise (3)
  'ENTR_CREATION_ENTREPRISE_ETRANGER', 'ENTR_INVESTISSEMENTS', 'ENTR_IMPORT_EXPORT',
  // ASSU - Assurances et protection (3)
  'ASSU_ASSURANCES_INTERNATIONALES', 'ASSU_PROTECTION_DONNEES', 'ASSU_CONTENTIEUX_ADMINISTRATIFS',
  // CONS - Consommation et services (3)
  'CONS_ACHATS_DEFECTUEUX_ETRANGER', 'CONS_SERVICES_NON_CONFORMES', 'CONS_ECOMMERCE_INTERNATIONAL',
  // BANK - Banque et finance (3)
  'BANK_PROBLEMES_COMPTES_BANCAIRES', 'BANK_VIREMENTS_CREDITS', 'BANK_SERVICES_FINANCIERS',
  // ARGT - Problèmes d'argent (5)
  'ARGT_RETARDS_SALAIRE_IMPAYES', 'ARGT_ARNAQUES_ESCROQUERIES', 'ARGT_SURENDETTEMENT_PLANS',
  'ARGT_FRAIS_BANCAIRES_ABUSIFS', 'ARGT_LITIGES_ETABLISSEMENTS_CREDIT',
  // RELA - Problèmes relationnels (5)
  'RELA_CONFLITS_VOISINAGE', 'RELA_CONFLITS_TRAVAIL', 'RELA_CONFLITS_FAMILIAUX',
  'RELA_MEDIATION_RESOLUTION_AMIABLE', 'RELA_DIFFAMATION_REPUTATION',
  // TRAN - Transport (3)
  'TRAN_PROBLEMES_AERIENS', 'TRAN_BAGAGES_PERDUS_ENDOMMAGES', 'TRAN_ACCIDENTS_TRANSPORT',
  // SANT - Santé (3)
  'SANT_ERREURS_MEDICALES', 'SANT_REMBOURSEMENTS_SOINS', 'SANT_DROIT_MEDICAL',
  // NUM - Numérique (3)
  'NUM_CYBERCRIMINALITE', 'NUM_CONTRATS_EN_LIGNE', 'NUM_PROTECTION_NUMERIQUE',
  // VIO - Violences et discriminations (3)
  'VIO_HARCELEMENT', 'VIO_VIOLENCES_DOMESTIQUES', 'VIO_DISCRIMINATIONS',
  // IP - Propriété intellectuelle (3)
  'IP_CONTREFACONS', 'IP_BREVETS_MARQUES', 'IP_DROITS_AUTEUR',
  // ENV - Environnement (3)
  'ENV_NUISANCES', 'ENV_PERMIS_CONSTRUIRE', 'ENV_DROIT_URBANISME',
  // RET - Retour en France (2)
  'RET_RAPATRIEMENT_BIENS', 'RET_REINTEGRATION_FISCALE_SOCIALE',
  // OTH - Autre (1)
  'OTH_PRECISER_BESOIN',
];

// Codes valides pour les expatriés (liste de référence)
// ✅ CORRIGÉ: Synchronisé avec expat-help-types.ts (24 codes)
const VALID_EXPAT_CODES = [
  'INSTALLATION',                // S'installer
  'DEMARCHES_ADMINISTRATIVES',   // Démarches administratives
  'RECHERCHE_LOGEMENT',          // Recherche de logement
  'OUVERTURE_COMPTE_BANCAIRE',   // Ouverture de compte bancaire
  'SYSTEME_SANTE',               // Système de santé
  'EDUCATION_ECOLES',            // Éducation et écoles
  'TRANSPORT',                   // Transport
  'RECHERCHE_EMPLOI',            // Recherche d'emploi
  'CREATION_ENTREPRISE',         // Création d'entreprise
  'FISCALITE_LOCALE',            // Fiscalité locale
  'CULTURE_INTEGRATION',         // Culture et intégration
  'VISA_IMMIGRATION',            // Visa et immigration
  'ASSURANCES',                  // Assurances
  'TELEPHONE_INTERNET',          // Téléphone et internet
  'ALIMENTATION_COURSES',        // Alimentation et courses
  'LOISIRS_SORTIES',             // Loisirs et sorties
  'SPORTS_ACTIVITES',            // Sports et activités
  'SECURITE',                    // Sécurité
  'URGENCES',                    // Urgences
  'PROBLEMES_ARGENT',            // Problèmes d'argent
  'PROBLEMES_RELATIONNELS',      // Problèmes relationnels
  'PROBLEMES_DIVERS',            // Problèmes divers
  'PARTIR_OU_RENTRER',           // Partir ou rentrer
  'AUTRE_PRECISER',              // Autre (précisez)
];

// Mapping des codes camelCase vers SCREAMING_SNAKE_CASE
// ✅ CORRIGÉ: Tous les codes cibles existent dans lawyer-specialties.ts
const SPECIALTY_CODE_MAPPING: Record<string, string> = {
  // Urgences (codes obsolètes mappés vers codes valides)
  'urgAssistancePenaleInternationale': 'URG_ASSISTANCE_PENALE_INTERNATIONALE',
  'urgGardeAVueEtranger': 'URG_ASSISTANCE_PENALE_INTERNATIONALE', // ✅ Corrigé: code inexistant → code valide
  'urgExpulsionUrgente': 'URG_RAPATRIEMENT_URGENCE', // ✅ Corrigé: code inexistant → code valide
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

/**
 * Vérifie si un code a besoin d'être migré
 */
function needsMigration(code: string, profileType: 'lawyer' | 'expat' = 'lawyer'): boolean {
  // Si le code est dans le mapping camelCase, il a besoin d'être migré
  if (SPECIALTY_CODE_MAPPING[code]) {
    return true;
  }

  // Vérifier si c'est un code invalide connu
  if (INVALID_LAWYER_CODE_MAPPING[code] || INVALID_EXPAT_CODE_MAPPING[code]) {
    return true;
  }

  // Si le code est déjà valide, pas de migration
  if (profileType === 'lawyer' && VALID_LAWYER_CODES.includes(code)) {
    return false;
  }
  if (profileType === 'expat' && VALID_EXPAT_CODES.includes(code)) {
    return false;
  }

  // Si le code contient des minuscules (camelCase) ou caractères spéciaux, il a besoin d'être migré
  if (code && (!/^[A-Z_]+$/.test(code) || code.includes(' ') || code.includes('&'))) {
    return true;
  }

  return false;
}

/**
 * Convertit un code de spécialité vers le format correct
 */
function migrateCode(code: string, profileType: 'lawyer' | 'expat' = 'lawyer'): string {
  // 1. Si le code est dans le mapping camelCase explicite, utiliser le mapping
  if (SPECIALTY_CODE_MAPPING[code]) {
    return SPECIALTY_CODE_MAPPING[code];
  }

  // 2. Si le code est dans le mapping des codes invalides, utiliser le mapping approprié
  if (profileType === 'lawyer' && INVALID_LAWYER_CODE_MAPPING[code]) {
    return INVALID_LAWYER_CODE_MAPPING[code];
  }
  if (profileType === 'expat' && INVALID_EXPAT_CODE_MAPPING[code]) {
    return INVALID_EXPAT_CODE_MAPPING[code];
  }

  // 3. Chercher une correspondance partielle dans les mappings invalides
  const lowerCode = code.toLowerCase();
  if (profileType === 'lawyer') {
    for (const [key, value] of Object.entries(INVALID_LAWYER_CODE_MAPPING)) {
      if (lowerCode.includes(key.toLowerCase())) {
        return value;
      }
    }
  } else {
    for (const [key, value] of Object.entries(INVALID_EXPAT_CODE_MAPPING)) {
      if (lowerCode.includes(key.toLowerCase())) {
        return value;
      }
    }
  }

  // 4. Si le code est déjà valide, le garder tel quel
  if (profileType === 'lawyer' && VALID_LAWYER_CODES.includes(code)) {
    return code;
  }
  if (profileType === 'expat' && VALID_EXPAT_CODES.includes(code)) {
    return code;
  }

  // 5. Si le code est déjà en SCREAMING_SNAKE_CASE mais pas dans la liste valide,
  //    utiliser un code par défaut
  if (/^[A-Z_]+$/.test(code)) {
    console.warn(`⚠️ Code "${code}" en format valide mais non reconnu, attribution code par défaut`);
    return profileType === 'lawyer' ? 'OTH_PRECISER_BESOIN' : 'AUTRE_PRECISER';
  }

  // 6. Sinon, essayer de convertir et attribuer un code par défaut
  console.warn(`⚠️ Code "${code}" non reconnu pour ${profileType}, attribution code par défaut`);
  return profileType === 'lawyer' ? 'OTH_PRECISER_BESOIN' : 'AUTRE_PRECISER';
}

/**
 * Migre un tableau de spécialités
 */
function migrateSpecialties(specialties: string[], profileType: 'lawyer' | 'expat' = 'lawyer'): { migrated: string[], changes: string[] } {
  const migrated: string[] = [];
  const changes: string[] = [];

  for (const spec of specialties) {
    const newCode = migrateCode(spec, profileType);
    migrated.push(newCode);
    if (spec !== newCode) {
      changes.push(`"${spec}" → "${newCode}"`);
    }
  }

  // Dédupliquer les codes migrés
  const uniqueMigrated = [...new Set(migrated)];

  return { migrated: uniqueMigrated, changes };
}

/**
 * Détermine le type de profil à partir des données
 */
function getProfileType(data: any): 'lawyer' | 'expat' {
  const type = data.type || data.role || '';
  if (type === 'expat' || type === 'expatHelper') {
    return 'expat';
  }
  return 'lawyer'; // lawyer, professional, provider, etc.
}

interface MigrationResult {
  profileId: string;
  profileName: string;
  type: string;
  oldSpecialties: string[];
  newSpecialties: string[];
  changes: string[];
}

/**
 * Prévisualise les changements sans les appliquer
 */
export async function previewMigration(): Promise<MigrationResult[]> {
  console.log('🔍 Prévisualisation de la migration des codes de spécialités...\n');

  const results: MigrationResult[] = [];

  // Collections à migrer
  const collections = ['sos_profiles', 'users'];

  for (const collectionName of collections) {
    console.log(`📁 Analyse de la collection "${collectionName}"...`);

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const profileType = getProfileType(data);
        const specialties = data.specialties || data.helpTypes || [];

        if (!Array.isArray(specialties) || specialties.length === 0) {
          continue;
        }

        // Vérifier si des codes ont besoin d'être migrés
        const needsUpdate = specialties.some((s: string) => needsMigration(s, profileType));

        if (needsUpdate) {
          const { migrated, changes } = migrateSpecialties(specialties, profileType);

          results.push({
            profileId: docSnap.id,
            profileName: data.fullName || data.firstName || 'N/A',
            type: data.type || data.role || 'N/A',
            oldSpecialties: specialties,
            newSpecialties: migrated,
            changes,
          });
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'analyse de "${collectionName}":`, error);
    }
  }

  // Afficher le résumé
  console.log('\n📊 RÉSUMÉ DE LA PRÉVISUALISATION');
  console.log('================================');
  console.log(`Total de profils à migrer: ${results.length}`);

  if (results.length > 0) {
    console.log('\nDétails:');
    for (const result of results.slice(0, 10)) {
      console.log(`\n• ${result.profileName} (${result.type}) [${result.profileId}]`);
      for (const change of result.changes) {
        console.log(`  ↳ ${change}`);
      }
    }

    if (results.length > 10) {
      console.log(`\n... et ${results.length - 10} autres profils`);
    }
  }

  return results;
}

/**
 * Exécute la migration des codes de spécialités
 */
export async function migrateAllSpecialtyCodes(): Promise<void> {
  console.log('🚀 Début de la migration des codes de spécialités...\n');

  const collections = ['sos_profiles', 'users'];
  let totalMigrated = 0;
  let totalErrors = 0;

  for (const collectionName of collections) {
    console.log(`\n📁 Migration de la collection "${collectionName}"...`);

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500; // Limite Firebase

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const profileType = getProfileType(data);
        const specialties = data.specialties || [];
        const helpTypes = data.helpTypes || [];

        let hasChanges = false;
        const updates: Record<string, string[]> = {};

        // Migrer specialties - utiliser le type du profil (pas toujours 'lawyer')
        if (Array.isArray(specialties) && specialties.length > 0) {
          const needsUpdate = specialties.some((s: string) => needsMigration(s, profileType));
          if (needsUpdate) {
            const { migrated } = migrateSpecialties(specialties, profileType);
            updates.specialties = migrated;
            hasChanges = true;
          }
        }

        // Migrer helpTypes (toujours pour les expatriés)
        if (Array.isArray(helpTypes) && helpTypes.length > 0) {
          const needsUpdate = helpTypes.some((s: string) => needsMigration(s, 'expat'));
          if (needsUpdate) {
            const { migrated } = migrateSpecialties(helpTypes, 'expat');
            updates.helpTypes = migrated;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          batch.update(doc(db, collectionName, docSnap.id), updates);
          batchCount++;

          // Commit le batch si on atteint la limite
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            console.log(`  ✅ Batch de ${batchCount} profils migré`);
            totalMigrated += batchCount;
            batchCount = 0;
          }
        }
      }

      // Commit le dernier batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`  ✅ Batch final de ${batchCount} profils migré`);
        totalMigrated += batchCount;
      }

    } catch (error) {
      console.error(`❌ Erreur lors de la migration de "${collectionName}":`, error);
      totalErrors++;
    }
  }

  console.log('\n🎉 MIGRATION TERMINÉE');
  console.log('====================');
  console.log(`Total de profils migrés: ${totalMigrated}`);
  console.log(`Erreurs: ${totalErrors}`);
}

/**
 * Migre un seul profil (utile pour les tests)
 */
export async function migrateOneProfile(profileId: string, collectionName: string = 'sos_profiles'): Promise<boolean> {
  console.log(`🔄 Migration du profil ${profileId}...`);

  try {
    const docRef = doc(db, collectionName, profileId);
    const docSnap = await getDocs(collection(db, collectionName));
    const targetDoc = docSnap.docs.find(d => d.id === profileId);

    if (!targetDoc) {
      console.error(`❌ Profil ${profileId} non trouvé`);
      return false;
    }

    const data = targetDoc.data();
    const profileType = getProfileType(data);
    const specialties = data.specialties || [];
    const helpTypes = data.helpTypes || [];

    console.log(`  Type de profil: ${profileType}`);
    const updates: Record<string, string[]> = {};

    if (Array.isArray(specialties) && specialties.length > 0) {
      const { migrated, changes } = migrateSpecialties(specialties, 'lawyer');
      if (changes.length > 0) {
        updates.specialties = migrated;
        console.log('  Specialties:', changes);
      }
    }

    if (Array.isArray(helpTypes) && helpTypes.length > 0) {
      const { migrated, changes } = migrateSpecialties(helpTypes, 'expat');
      if (changes.length > 0) {
        updates.helpTypes = migrated;
        console.log('  HelpTypes:', changes);
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(docRef, updates);
      console.log(`✅ Profil ${profileId} migré avec succès`);
      return true;
    } else {
      console.log(`ℹ️ Profil ${profileId} n'a pas besoin de migration`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Erreur lors de la migration du profil ${profileId}:`, error);
    return false;
  }
}

/**
 * Vérifie TOUS les profils et affiche leurs codes de spécialités
 */
export async function checkAllProfiles(): Promise<void> {
  console.log('🔍 Vérification de TOUS les profils...\n');

  const collections = ['sos_profiles', 'users'];
  let totalProfiles = 0;
  let profilesWithValidCodes = 0;
  let profilesWithInvalidCodes = 0;
  let profilesWithoutSpecialties = 0;

  for (const collectionName of collections) {
    console.log(`\n📁 Collection "${collectionName}":`);
    console.log('─'.repeat(50));

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const profileType = getProfileType(data);
        const specialties = data.specialties || [];
        const helpTypes = data.helpTypes || [];
        const allCodes = [...specialties, ...helpTypes];

        totalProfiles++;

        if (allCodes.length === 0) {
          profilesWithoutSpecialties++;
          continue;
        }

        // Vérifier si tous les codes sont valides
        const validCodes = profileType === 'lawyer' ? VALID_LAWYER_CODES : VALID_EXPAT_CODES;
        const invalidCodes = allCodes.filter(code => !validCodes.includes(code));

        if (invalidCodes.length > 0) {
          profilesWithInvalidCodes++;
          console.log(`\n❌ ${data.fullName || data.firstName || 'N/A'} (${profileType})`);
          console.log(`   ID: ${docSnap.id}`);
          console.log(`   Codes actuels: ${allCodes.join(', ')}`);
          console.log(`   Codes invalides: ${invalidCodes.join(', ')}`);
        } else {
          profilesWithValidCodes++;
        }
      }
    } catch (error) {
      console.error(`❌ Erreur:`, error);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(50));
  console.log(`Total profils: ${totalProfiles}`);
  console.log(`✅ Profils avec codes valides: ${profilesWithValidCodes}`);
  console.log(`❌ Profils avec codes invalides: ${profilesWithInvalidCodes}`);
  console.log(`⚪ Profils sans spécialités: ${profilesWithoutSpecialties}`);

  if (profilesWithValidCodes > 0) {
    console.log('\n📋 Exemple de profils avec codes valides (5 premiers):');
    const querySnapshot = await getDocs(collection(db, 'sos_profiles'));
    let count = 0;
    for (const docSnap of querySnapshot.docs) {
      if (count >= 5) break;
      const data = docSnap.data();
      const specialties = data.specialties || [];
      if (specialties.length > 0 && specialties.every((s: string) => VALID_LAWYER_CODES.includes(s))) {
        console.log(`  • ${data.fullName}: ${specialties.slice(0, 3).join(', ')}${specialties.length > 3 ? '...' : ''}`);
        count++;
      }
    }
  }
}

// =============================================
// MIGRATION DES CODES ISO DANS LES BIOS
// =============================================

/**
 * Mapping complet des codes ISO vers noms de pays en français
 */
const ISO_TO_COUNTRY_NAME: Record<string, string> = {
  'AF': 'Afghanistan', 'AL': 'Albanie', 'DZ': 'Algérie', 'AD': 'Andorre', 'AO': 'Angola',
  'AR': 'Argentine', 'AM': 'Arménie', 'AU': 'Australie', 'AT': 'Autriche', 'AZ': 'Azerbaïdjan',
  'BS': 'Bahamas', 'BH': 'Bahreïn', 'BD': 'Bangladesh', 'BB': 'Barbade', 'BY': 'Biélorussie',
  'BE': 'Belgique', 'BZ': 'Belize', 'BJ': 'Bénin', 'BT': 'Bhoutan', 'BO': 'Bolivie',
  'BA': 'Bosnie-Herzégovine', 'BW': 'Botswana', 'BR': 'Brésil', 'BN': 'Brunei', 'BG': 'Bulgarie',
  'BF': 'Burkina Faso', 'BI': 'Burundi', 'KH': 'Cambodge', 'CM': 'Cameroun', 'CA': 'Canada',
  'CV': 'Cap-Vert', 'CF': 'Centrafrique', 'TD': 'Tchad', 'CL': 'Chili', 'CN': 'Chine',
  'CO': 'Colombie', 'KM': 'Comores', 'CG': 'Congo', 'CD': 'RD Congo', 'CR': 'Costa Rica',
  'CI': 'Côte d\'Ivoire', 'HR': 'Croatie', 'CU': 'Cuba', 'CY': 'Chypre', 'CZ': 'Tchéquie',
  'DK': 'Danemark', 'DJ': 'Djibouti', 'DM': 'Dominique', 'DO': 'République Dominicaine',
  'EC': 'Équateur', 'EG': 'Égypte', 'SV': 'Salvador', 'GQ': 'Guinée équatoriale', 'ER': 'Érythrée',
  'EE': 'Estonie', 'SZ': 'Eswatini', 'ET': 'Éthiopie', 'FJ': 'Fidji', 'FI': 'Finlande',
  'FR': 'France', 'GA': 'Gabon', 'GM': 'Gambie', 'GE': 'Géorgie', 'DE': 'Allemagne',
  'GH': 'Ghana', 'GR': 'Grèce', 'GD': 'Grenade', 'GT': 'Guatemala', 'GN': 'Guinée',
  'GW': 'Guinée-Bissau', 'GY': 'Guyana', 'HT': 'Haïti', 'HN': 'Honduras', 'HU': 'Hongrie',
  'IS': 'Islande', 'IN': 'Inde', 'ID': 'Indonésie', 'IR': 'Iran', 'IQ': 'Irak',
  'IE': 'Irlande', 'IL': 'Israël', 'IT': 'Italie', 'JM': 'Jamaïque', 'JP': 'Japon',
  'JO': 'Jordanie', 'KZ': 'Kazakhstan', 'KE': 'Kenya', 'KI': 'Kiribati', 'KP': 'Corée du Nord',
  'KR': 'Corée du Sud', 'KW': 'Koweït', 'KG': 'Kirghizistan', 'LA': 'Laos', 'LV': 'Lettonie',
  'LB': 'Liban', 'LS': 'Lesotho', 'LR': 'Liberia', 'LY': 'Libye', 'LI': 'Liechtenstein',
  'LT': 'Lituanie', 'LU': 'Luxembourg', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaisie',
  'MV': 'Maldives', 'ML': 'Mali', 'MT': 'Malte', 'MH': 'Îles Marshall', 'MR': 'Mauritanie',
  'MU': 'Maurice', 'MX': 'Mexique', 'FM': 'Micronésie', 'MD': 'Moldavie', 'MC': 'Monaco',
  'MN': 'Mongolie', 'ME': 'Monténégro', 'MA': 'Maroc', 'MZ': 'Mozambique', 'MM': 'Myanmar',
  'NA': 'Namibie', 'NR': 'Nauru', 'NP': 'Népal', 'NL': 'Pays-Bas', 'NZ': 'Nouvelle-Zélande',
  'NI': 'Nicaragua', 'NE': 'Niger', 'NG': 'Nigeria', 'NO': 'Norvège', 'OM': 'Oman',
  'PK': 'Pakistan', 'PW': 'Palaos', 'PA': 'Panama', 'PG': 'Papouasie-Nouvelle-Guinée', 'PY': 'Paraguay',
  'PE': 'Pérou', 'PH': 'Philippines', 'PL': 'Pologne', 'PT': 'Portugal', 'QA': 'Qatar',
  'RO': 'Roumanie', 'RU': 'Russie', 'RW': 'Rwanda', 'KN': 'Saint-Kitts-et-Nevis', 'LC': 'Sainte-Lucie',
  'VC': 'Saint-Vincent-et-les-Grenadines', 'WS': 'Samoa', 'SM': 'Saint-Marin', 'ST': 'São Tomé-et-Príncipe',
  'SA': 'Arabie Saoudite', 'SN': 'Sénégal', 'RS': 'Serbie', 'SC': 'Seychelles', 'SL': 'Sierra Leone',
  'SG': 'Singapour', 'SK': 'Slovaquie', 'SI': 'Slovénie', 'SB': 'Îles Salomon', 'SO': 'Somalie',
  'ZA': 'Afrique du Sud', 'SS': 'Soudan du Sud', 'ES': 'Espagne', 'LK': 'Sri Lanka', 'SD': 'Soudan',
  'SR': 'Suriname', 'SE': 'Suède', 'CH': 'Suisse', 'SY': 'Syrie', 'TW': 'Taïwan',
  'TJ': 'Tadjikistan', 'TZ': 'Tanzanie', 'TH': 'Thaïlande', 'TL': 'Timor oriental', 'TG': 'Togo',
  'TO': 'Tonga', 'TT': 'Trinité-et-Tobago', 'TN': 'Tunisie', 'TR': 'Turquie', 'TM': 'Turkménistan',
  'TV': 'Tuvalu', 'UG': 'Ouganda', 'UA': 'Ukraine', 'AE': 'Émirats arabes unis', 'GB': 'Royaume-Uni',
  'US': 'États-Unis', 'UY': 'Uruguay', 'UZ': 'Ouzbékistan', 'VU': 'Vanuatu', 'VA': 'Vatican',
  'VE': 'Venezuela', 'VN': 'Vietnam', 'YE': 'Yémen', 'ZM': 'Zambie', 'ZW': 'Zimbabwe',
  'HK': 'Hong Kong', 'MO': 'Macao', 'PS': 'Palestine', 'XK': 'Kosovo',
};

/**
 * Détecte et remplace les codes ISO dans un texte de bio
 * Recherche les patterns comme "en NI", "à FR", "depuis DE", etc.
 */
function replaceIsoCodesInBio(bio: string): { updated: string; replacements: string[] } {
  const replacements: string[] = [];
  let updated = bio;

  // Faux positifs à ignorer (mots français courants de 2 lettres)
  const falsePositives = new Set(['DE', 'EN', 'ES', 'LA', 'LE', 'UN', 'ET', 'OU', 'AU', 'DU', 'AI', 'AS', 'ME', 'MA', 'MO', 'NO', 'SI', 'TA', 'SA', 'CE', 'SE', 'NE', 'ON', 'IL', 'JE', 'TU', 'VA', 'VU', 'LU', 'SU', 'PU', 'EU', 'BU']);

  // Remplacer directement tous les codes ISO valides entourés de contexte approprié
  for (const [code, name] of Object.entries(ISO_TO_COUNTRY_NAME)) {
    // Ignorer les faux positifs
    if (falsePositives.has(code)) continue;

    // Pattern: préposition + espace + CODE (suivi de ponctuation, espace ou fin)
    // Exemples: "en NI,", "à FR.", "depuis TH ", "en NI)"
    const prepositionPattern = new RegExp(
      `(\\b(?:en|à|au|aux|depuis|de|du|pour|vers|sur|par)\\s+)(${code})([\\s,\\.;:!?\\)\\]']|$)`,
      'gi'
    );

    updated = updated.replace(prepositionPattern, (match, prefix, isoCode, suffix) => {
      if (isoCode.toUpperCase() === code) {
        replacements.push(`${code} → ${name}`);
        return prefix + name + suffix;
      }
      return match;
    });

    // Pattern: CODE entre parenthèses
    const parenthesesPattern = new RegExp(`\\(${code}\\)`, 'g');
    if (parenthesesPattern.test(updated)) {
      const beforeReplace = updated;
      updated = updated.replace(parenthesesPattern, `(${name})`);
      if (beforeReplace !== updated && !replacements.includes(`${code} → ${name}`)) {
        replacements.push(`${code} → ${name}`);
      }
    }
  }

  return { updated, replacements };
}

/**
 * Corrige les bios d'un profil en remplaçant les codes ISO par les noms de pays
 */
function fixBiosCountryCodes(bio: Record<string, string>): {
  fixed: Record<string, string>;
  hasChanges: boolean;
  allReplacements: Record<string, string[]>;
} {
  const fixed: Record<string, string> = {};
  const allReplacements: Record<string, string[]> = {};
  let hasChanges = false;

  for (const [lang, text] of Object.entries(bio)) {
    const { updated, replacements } = replaceIsoCodesInBio(text);
    fixed[lang] = updated;
    if (replacements.length > 0) {
      allReplacements[lang] = replacements;
      hasChanges = true;
    }
  }

  return { fixed, hasChanges, allReplacements };
}

/**
 * Prévisualise les corrections des codes ISO dans les bios
 */
export async function previewBioCountryFix(): Promise<void> {
  console.log('🔍 Analyse des bios avec codes ISO...\n');

  const querySnapshot = await getDocs(collection(db, 'sos_profiles'));
  let profilesWithIssues = 0;
  const examples: { name: string; replacements: Record<string, string[]> }[] = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const bio = data.bio;

    if (bio && typeof bio === 'object') {
      const { hasChanges, allReplacements } = fixBiosCountryCodes(bio as Record<string, string>);
      if (hasChanges) {
        profilesWithIssues++;
        if (examples.length < 10) {
          examples.push({
            name: data.fullName || docSnap.id,
            replacements: allReplacements
          });
        }
      }
    }
  }

  console.log(`📊 Résultats:`);
  console.log(`   Profils avec codes ISO dans bio: ${profilesWithIssues}`);
  console.log(`   Total profils analysés: ${querySnapshot.docs.length}\n`);

  if (examples.length > 0) {
    console.log('📝 Exemples de corrections (10 premiers):');
    for (const example of examples) {
      console.log(`\n  👤 ${example.name}:`);
      for (const [lang, replacements] of Object.entries(example.replacements)) {
        console.log(`     [${lang}] ${replacements.join(', ')}`);
      }
    }
  }

  console.log('\n💡 Pour appliquer les corrections:');
  console.log('   migrateSpecialtyCodes.fixBios()');
}

/**
 * Corrige tous les codes ISO dans les bios de tous les profils
 */
export async function fixAllBiosCountryCodes(): Promise<void> {
  console.log('🔧 Correction des codes ISO dans les bios...\n');

  const querySnapshot = await getDocs(collection(db, 'sos_profiles'));
  let fixedCount = 0;
  let errorCount = 0;

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const bio = data.bio;

    if (bio && typeof bio === 'object') {
      const { fixed, hasChanges, allReplacements } = fixBiosCountryCodes(bio as Record<string, string>);

      if (hasChanges) {
        try {
          // Mettre à jour dans sos_profiles
          await updateDoc(doc(db, 'sos_profiles', docSnap.id), { bio: fixed });

          // Mettre à jour aussi dans users si existe
          try {
            await updateDoc(doc(db, 'users', docSnap.id), { bio: fixed });
          } catch {
            // Ignorer si le doc users n'existe pas
          }

          fixedCount++;
          console.log(`✅ ${data.fullName || docSnap.id}:`);
          for (const [lang, replacements] of Object.entries(allReplacements)) {
            console.log(`   [${lang}] ${replacements.join(', ')}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur ${data.fullName || docSnap.id}:`, error);
        }
      }
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`   Profils corrigés: ${fixedCount}`);
  console.log(`   Erreurs: ${errorCount}`);
}

/**
 * Corrige les codes ISO dans la bio d'un profil spécifique
 */
export async function fixOneBioCountryCodes(profileId: string): Promise<void> {
  console.log(`🔧 Correction de la bio pour ${profileId}...\n`);

  const docRef = doc(db, 'sos_profiles', profileId);
  const querySnapshot = await getDocs(collection(db, 'sos_profiles'));
  const docSnap = querySnapshot.docs.find(d => d.id === profileId);

  if (!docSnap) {
    console.error(`❌ Profil ${profileId} non trouvé`);
    return;
  }

  const data = docSnap.data();
  const bio = data.bio;

  if (!bio || typeof bio !== 'object') {
    console.log('⚠️ Ce profil n\'a pas de bio multilingue');
    return;
  }

  const { fixed, hasChanges, allReplacements } = fixBiosCountryCodes(bio as Record<string, string>);

  if (!hasChanges) {
    console.log('✅ Aucun code ISO trouvé dans la bio');
    return;
  }

  console.log('📝 Corrections à appliquer:');
  for (const [lang, replacements] of Object.entries(allReplacements)) {
    console.log(`   [${lang}] ${replacements.join(', ')}`);
  }

  try {
    await updateDoc(doc(db, 'sos_profiles', profileId), { bio: fixed });
    try {
      await updateDoc(doc(db, 'users', profileId), { bio: fixed });
    } catch {
      // Ignorer si users n'existe pas
    }
    console.log('\n✅ Bio corrigée avec succès!');
  } catch (error) {
    console.error('\n❌ Erreur:', error);
  }
}

// Exposer les fonctions globalement pour la console
if (typeof window !== 'undefined') {
  (window as any).migrateSpecialtyCodes = {
    preview: previewMigration,
    migrateAll: migrateAllSpecialtyCodes,
    migrateOne: migrateOneProfile,
    checkAll: checkAllProfiles,
    // Nouvelles fonctions pour les bios
    previewBios: previewBioCountryFix,
    fixBios: fixAllBiosCountryCodes,
    fixOneBio: fixOneBioCountryCodes,
  };

  console.log('🔧 Script de migration chargé. Utilisez:');
  console.log('  📦 Spécialités:');
  console.log('    - migrateSpecialtyCodes.preview() pour prévisualiser');
  console.log('    - migrateSpecialtyCodes.migrateAll() pour migrer tous les profils');
  console.log('    - migrateSpecialtyCodes.migrateOne("profileId") pour migrer un profil');
  console.log('    - migrateSpecialtyCodes.checkAll() pour vérifier tous les profils');
  console.log('  🌍 Codes pays dans bios:');
  console.log('    - migrateSpecialtyCodes.previewBios() pour prévisualiser les corrections');
  console.log('    - migrateSpecialtyCodes.fixBios() pour corriger tous les bios');
  console.log('    - migrateSpecialtyCodes.fixOneBio("profileId") pour corriger un bio');
}

/**
 * SOS Expat Analytics - Types et données pour l'outil interne d'analyse
 * @version 2.0.0
 * @description Système d'analyse des demandes d'assistance pour expatriés français
 */

// ========================================
// TYPES ET INTERFACES
// ========================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProblemCategory = keyof typeof PROBLEM_CATEGORIES;
export type ExpertRole = keyof typeof EXPERT_ROLES;
export type ResponseTone = keyof typeof GPT_TONES;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface CountryInfo {
  country: string;
  code: string;
  requests: number;
  riskLevel?: RiskLevel;
}

export interface ProblemType {
  type: string;
  count: number;
  percentage: number;
}

export interface RegionalData {
  region: string;
  count: number;
  percentage: number;
}

export interface CountryStats {
  readonly totalCountries: number;
  readonly activeCountries: number;
  readonly riskLevels: Record<RiskLevel, number>;
  readonly mostActive: readonly CountryInfo[];
  readonly lastUpdated: Date;
}

export interface ProblemTypeStats {
  readonly byCategory: Record<string, number>;
  readonly byUrgency: Record<UrgencyLevel, number>;
  readonly averageDuration: number; // en jours
  readonly totalRequests: number;
  readonly mostCommon: readonly ProblemType[];
  readonly lastUpdated: Date;
}

export interface GeographicalAnalysis {
  readonly regions: Record<string, number>;
  readonly riskDistribution: Record<RiskLevel, number>;
  readonly consulateCoverage: {
    readonly covered: number;
    readonly total: number;
    readonly percentage: number;
  };
  readonly timeZones: Record<string, number>;
  readonly lastUpdated: Date;
}

export interface AnalyticsMetadata {
  readonly generatedAt: Date;
  readonly dataSource: string;
  readonly version: string;
}

// ========================================
// CONSTANTES
// ========================================

export const PROBLEM_CATEGORIES = {
  VISA: 'Visa et immigration',
  POLICE: 'Police et justice', 
  HEALTH: 'Santé et urgences',
  THEFT: 'Vol et perte de documents',
  ACCIDENT: 'Accident de la route',
  BANKING: 'Problèmes bancaires',
  HOUSING: 'Logement et bail',
  WORK: 'Travail et emploi',
  CONSULAR: 'Services consulaires',
  FAMILY: 'Affaires familiales'
} as const;

export const RISK_LEVEL_CONFIG = {
  low: { label: 'Faible', color: '#10B981', priority: 1 },
  medium: { label: 'Modéré', color: '#F59E0B', priority: 2 },
  high: { label: 'Élevé', color: '#EF4444', priority: 3 },
  critical: { label: 'Critique', color: '#DC2626', priority: 4 }
} as const;

export const COUNTRY_RISK_LEVELS: Record<string, RiskLevel> = {
  // Europe - Risque faible
  'FR': 'low', 'DE': 'low', 'ES': 'low', 'IT': 'low', 'PT': 'low',
  'BE': 'low', 'NL': 'low', 'CH': 'low', 'AT': 'low', 'LU': 'low',
  
  // Afrique du Nord - Risque modéré à élevé
  'MA': 'medium', 'TN': 'medium', 'DZ': 'medium',
  'LY': 'high', 'EG': 'high',
  
  // Moyen-Orient - Risque élevé à critique
  'SY': 'critical', 'IQ': 'critical', 'AF': 'critical',
  'IR': 'high', 'LB': 'high',
  
  // Afrique Subsaharienne - Risque variable
  'SN': 'medium', 'ML': 'high', 'BF': 'high', 'CI': 'medium',
  
  // Asie - Risque faible à modéré
  'JP': 'low', 'KR': 'low', 'SG': 'low', 'TH': 'medium', 'VN': 'medium',
  
  // Amériques - Risque variable
  'US': 'low', 'CA': 'low', 'MX': 'medium', 'BR': 'medium'
} as const;

export const SUPPORTED_LANGUAGES = [
  'Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 
  'Portugais', 'Arabe', 'Néerlandais', 'Russe', 'Chinois'
] as const;

export const EXPERT_ROLES = {
  AVOCAT: 'avocat',
  EXPATRIE: 'expatrie',
  CONSUL: 'consul',
  MEDECIN: 'medecin',
  ASSUREUR: 'assureur'
} as const;

export const GPT_TONES = {
  FORMAL: 'formal',
  EMPATHETIC: 'empathetic', 
  PROFESSIONAL: 'professional',
  URGENT: 'urgent'
} as const;

export const REGIONS = {
  EUROPE: 'Europe',
  NORTH_AFRICA: 'Afrique du Nord',
  SUB_SAHARAN_AFRICA: 'Afrique Subsaharienne',
  MIDDLE_EAST: 'Moyen-Orient',
  ASIA: 'Asie',
  NORTH_AMERICA: 'Amérique du Nord',
  SOUTH_AMERICA: 'Amérique du Sud',
  OCEANIA: 'Océanie'
} as const;

// ========================================
// FONCTIONS DE DONNÉES (Simulées)
// ========================================

/**
 * Récupère les statistiques par pays
 * @returns {CountryStats} Statistiques des pays avec assistance
 */
export function getCountryStats(): CountryStats {
  const currentDate = new Date();
  
  return {
    totalCountries: 52,
    activeCountries: 38,
    riskLevels: {
      low: 18,
      medium: 21,
      high: 9,
      critical: 4
    },
    mostActive: [
      { country: 'Maroc', code: 'MA', requests: 67, riskLevel: 'medium' },
      { country: 'Allemagne', code: 'DE', requests: 54, riskLevel: 'low' },
      { country: 'Espagne', code: 'ES', requests: 43, riskLevel: 'low' },
      { country: 'Italie', code: 'IT', requests: 38, riskLevel: 'low' },
      { country: 'États-Unis', code: 'US', requests: 29, riskLevel: 'low' },
      { country: 'Thaïlande', code: 'TH', requests: 25, riskLevel: 'medium' },
      { country: 'Brésil', code: 'BR', requests: 22, riskLevel: 'medium' }
    ],
    lastUpdated: currentDate
  };
}

/**
 * Récupère les statistiques par type de problème
 * @returns {ProblemTypeStats} Statistiques des types de problèmes
 */
export function getProblemTypeStats(): ProblemTypeStats {
  const totalRequests = 301;
  const currentDate = new Date();
  
  return {
    byCategory: {
      [PROBLEM_CATEGORIES.VISA]: 67,
      [PROBLEM_CATEGORIES.POLICE]: 48,
      [PROBLEM_CATEGORIES.HEALTH]: 43,
      [PROBLEM_CATEGORIES.THEFT]: 35,
      [PROBLEM_CATEGORIES.ACCIDENT]: 29,
      [PROBLEM_CATEGORIES.BANKING]: 24,
      [PROBLEM_CATEGORIES.HOUSING]: 19,
      [PROBLEM_CATEGORIES.WORK]: 16,
      [PROBLEM_CATEGORIES.CONSULAR]: 13,
      [PROBLEM_CATEGORIES.FAMILY]: 7
    },
    byUrgency: {
      low: 142,
      medium: 98,
      high: 47,
      critical: 14
    },
    averageDuration: 8.5,
    totalRequests,
    mostCommon: [
      { type: PROBLEM_CATEGORIES.VISA, count: 67, percentage: 22.3 },
      { type: PROBLEM_CATEGORIES.POLICE, count: 48, percentage: 15.9 },
      { type: PROBLEM_CATEGORIES.HEALTH, count: 43, percentage: 14.3 },
      { type: PROBLEM_CATEGORIES.THEFT, count: 35, percentage: 11.6 },
      { type: PROBLEM_CATEGORIES.ACCIDENT, count: 29, percentage: 9.6 }
    ],
    lastUpdated: currentDate
  };
}

/**
 * Récupère l'analyse géographique
 * @returns {GeographicalAnalysis} Analyse géographique des demandes
 */
export function getGeographicalAnalysis(): GeographicalAnalysis {
  const currentDate = new Date();
  
  return {
    regions: {
      [REGIONS.EUROPE]: 142,
      [REGIONS.NORTH_AFRICA]: 67,
      [REGIONS.ASIA]: 43,
      [REGIONS.SUB_SAHARAN_AFRICA]: 29,
      [REGIONS.NORTH_AMERICA]: 24,
      [REGIONS.SOUTH_AMERICA]: 16,
      [REGIONS.MIDDLE_EAST]: 12,
      [REGIONS.OCEANIA]: 8
    },
    riskDistribution: {
      low: 18,
      medium: 21,
      high: 9,
      critical: 4
    },
    consulateCoverage: {
      covered: 48,
      total: 52,
      percentage: 92.3
    },
    timeZones: {
      'UTC-8': 8,
      'UTC-5': 24,
      'UTC-3': 16,
      'UTC+0': 35,
      'UTC+1': 142,
      'UTC+2': 29,
      'UTC+3': 12,
      'UTC+7': 23,
      'UTC+8': 20,
      'UTC+9': 12
    },
    lastUpdated: currentDate
  };
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Obtient la configuration d'un niveau de risque
 * @param level - Niveau de risque
 * @returns Configuration du niveau de risque
 */
export function getRiskLevelConfig(level: RiskLevel) {
  return RISK_LEVEL_CONFIG[level];
}

/**
 * Obtient le niveau de risque d'un pays
 * @param countryCode - Code ISO du pays
 * @returns Niveau de risque ou 'medium' par défaut
 */
export function getCountryRiskLevel(countryCode: string): RiskLevel {
  return COUNTRY_RISK_LEVELS[countryCode.toUpperCase()] || 'medium';
}

/**
 * Calcule le pourcentage
 * @param value - Valeur
 * @param total - Total
 * @returns Pourcentage arrondi à 1 décimale
 */
export function calculatePercentage(value: number, total: number): number {
  return Math.round((value / total) * 1000) / 10;
}

/**
 * Formate une date pour l'affichage
 * @param date - Date à formater
 * @returns Date formatée en français
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Obtient les métadonnées d'analyse
 * @returns Métadonnées de l'analyse
 */
export function getAnalyticsMetadata(): AnalyticsMetadata {
  return {
    generatedAt: new Date(),
    dataSource: 'SOS Expat Internal Database',
    version: '2.0.0'
  };
}

// ========================================
// CONFIGURATION DE L'APPLICATION
// ========================================

export const APP_CONFIG = {
  name: 'SOS Expat Analytics',
  version: '2.0.0',
  description: 'Outil interne d\'analyse des demandes d\'assistance pour expatriés',
  supportEmail: 'contact@sos-expat.com',
  maxRetries: 3,
  cacheTimeout: 300000, // 5 minutes en millisecondes
  supportedTimezones: [
    'UTC-8', 'UTC-5', 'UTC-3', 'UTC+0', 'UTC+1', 
    'UTC+2', 'UTC+3', 'UTC+7', 'UTC+8', 'UTC+9'
  ]
} as const;

// ========================================
// TYPES ADDITIONNELS POUR L'EXPORT
// ========================================

/**
 * Type pour l'ensemble des données d'analyse
 */
export interface FullAnalyticsData {
  countryStats: CountryStats;
  problemTypeStats: ProblemTypeStats;
  geographicalAnalysis: GeographicalAnalysis;
  metadata: AnalyticsMetadata;
}

/**
 * Récupère toutes les données d'analyse en une seule fois
 * @returns {FullAnalyticsData} Ensemble complet des données d'analyse
 */
export function getAllAnalyticsData(): FullAnalyticsData {
  return {
    countryStats: getCountryStats(),
    problemTypeStats: getProblemTypeStats(),
    geographicalAnalysis: getGeographicalAnalysis(),
    metadata: getAnalyticsMetadata()
  };
}
/**
 * Plan Comptable - SOS-Expat OU (Estonie)
 *
 * Devise comptable: EUR
 * Commission standard: 15%
 * Frais Stripe: ~2.9% + 0.25 EUR
 *
 * @module data/chartOfAccounts
 */

// =============================================================================
// INTERFACES
// =============================================================================

export interface Account {
  code: string;
  name: string;
  nameFr: string;
  nameEn: string;
  type: AccountType;
  class: AccountClass;
  parent?: string;
  description?: string;
  isActive: boolean;
  /** Pour les comptes TVA OSS - code pays ISO */
  countryCode?: string;
  /** Taux de TVA applicable (pour les comptes 4452xx) */
  vatRate?: number;
}

export type AccountClass =
  | 'CAPITAUX'      // Classe 1
  | 'TIERS'         // Classe 4
  | 'FINANCIERS'    // Classe 5
  | 'CHARGES'       // Classe 6
  | 'PRODUITS';     // Classe 7

export type AccountType =
  | 'ASSET'         // Actif
  | 'LIABILITY'     // Passif
  | 'EQUITY'        // Capitaux propres
  | 'INCOME'        // Produits
  | 'EXPENSE';      // Charges

// =============================================================================
// TAUX DE TVA PAR PAYS (OSS - One Stop Shop)
// =============================================================================

export interface VatRate {
  countryCode: string;
  countryName: string;
  rate: number;
  accountCode: string;
}

export const OSS_VAT_RATES: VatRate[] = [
  // Estonie (pays de siege)
  { countryCode: 'EE', countryName: 'Estonie', rate: 0.22, accountCode: '445201' },

  // Pays OSS - Union Europeenne
  { countryCode: 'FR', countryName: 'France', rate: 0.20, accountCode: '445202' },
  { countryCode: 'DE', countryName: 'Allemagne', rate: 0.19, accountCode: '445203' },
  { countryCode: 'BE', countryName: 'Belgique', rate: 0.21, accountCode: '445204' },
  { countryCode: 'NL', countryName: 'Pays-Bas', rate: 0.21, accountCode: '445205' },
  { countryCode: 'IT', countryName: 'Italie', rate: 0.22, accountCode: '445206' },
  { countryCode: 'ES', countryName: 'Espagne', rate: 0.21, accountCode: '445207' },
  { countryCode: 'PT', countryName: 'Portugal', rate: 0.23, accountCode: '445208' },
  { countryCode: 'AT', countryName: 'Autriche', rate: 0.20, accountCode: '445209' },
  { countryCode: 'PL', countryName: 'Pologne', rate: 0.23, accountCode: '445210' },
  { countryCode: 'GR', countryName: 'Grece', rate: 0.24, accountCode: '445211' },
  { countryCode: 'CZ', countryName: 'Republique Tcheque', rate: 0.21, accountCode: '445212' },
  { countryCode: 'RO', countryName: 'Roumanie', rate: 0.19, accountCode: '445213' },
  { countryCode: 'HU', countryName: 'Hongrie', rate: 0.27, accountCode: '445214' },
  { countryCode: 'SE', countryName: 'Suede', rate: 0.25, accountCode: '445215' },
  { countryCode: 'DK', countryName: 'Danemark', rate: 0.25, accountCode: '445216' },
  { countryCode: 'FI', countryName: 'Finlande', rate: 0.24, accountCode: '445217' },
  { countryCode: 'IE', countryName: 'Irlande', rate: 0.23, accountCode: '445218' },
  { countryCode: 'SK', countryName: 'Slovaquie', rate: 0.20, accountCode: '445219' },
  { countryCode: 'LT', countryName: 'Lituanie', rate: 0.21, accountCode: '445220' },
  { countryCode: 'LV', countryName: 'Lettonie', rate: 0.21, accountCode: '445221' },
  { countryCode: 'SI', countryName: 'Slovenie', rate: 0.22, accountCode: '445222' },
  { countryCode: 'HR', countryName: 'Croatie', rate: 0.25, accountCode: '445223' },
  { countryCode: 'BG', countryName: 'Bulgarie', rate: 0.20, accountCode: '445224' },
  { countryCode: 'CY', countryName: 'Chypre', rate: 0.19, accountCode: '445225' },
  { countryCode: 'MT', countryName: 'Malte', rate: 0.18, accountCode: '445226' },
  { countryCode: 'LU', countryName: 'Luxembourg', rate: 0.17, accountCode: '445227' },
];

/**
 * Obtenir le taux de TVA pour un pays donne
 */
export function getVatRateByCountry(countryCode: string): VatRate | null {
  return OSS_VAT_RATES.find(v => v.countryCode === countryCode) || null;
}

/**
 * Obtenir le code compte TVA pour un pays donne
 */
export function getVatAccountCode(countryCode: string): string {
  const vatRate = getVatRateByCountry(countryCode);
  return vatRate?.accountCode || '445200'; // Compte TVA collectee general par defaut
}

// =============================================================================
// PLAN COMPTABLE COMPLET
// =============================================================================

export const CHART_OF_ACCOUNTS: Account[] = [
  // -------------------------------------------------------------------------
  // CLASSE 1 - CAPITAUX
  // -------------------------------------------------------------------------
  {
    code: '101000',
    name: 'Capital social',
    nameFr: 'Capital social',
    nameEn: 'Share capital',
    type: 'EQUITY',
    class: 'CAPITAUX',
    description: 'Capital social de SOS-Expat OU',
    isActive: true,
  },
  {
    code: '106000',
    name: 'Reserves',
    nameFr: 'Reserves',
    nameEn: 'Reserves',
    type: 'EQUITY',
    class: 'CAPITAUX',
    description: 'Reserves legales et statutaires',
    isActive: true,
  },
  {
    code: '120000',
    name: 'Resultat de l\'exercice',
    nameFr: 'Resultat de l\'exercice',
    nameEn: 'Net income',
    type: 'EQUITY',
    class: 'CAPITAUX',
    description: 'Resultat net de l\'exercice en cours',
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // CLASSE 4 - TIERS
  // -------------------------------------------------------------------------
  {
    code: '401000',
    name: 'Fournisseurs',
    nameFr: 'Fournisseurs',
    nameEn: 'Suppliers',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'Dettes fournisseurs',
    isActive: true,
  },
  {
    code: '411000',
    name: 'Clients',
    nameFr: 'Clients',
    nameEn: 'Customers',
    type: 'ASSET',
    class: 'TIERS',
    description: 'Creances clients',
    isActive: true,
  },
  {
    code: '421000',
    name: 'Personnel',
    nameFr: 'Personnel',
    nameEn: 'Employees',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'Dettes envers le personnel',
    isActive: true,
  },

  // TVA
  {
    code: '445100',
    name: 'TVA a decaisser',
    nameFr: 'TVA a decaisser',
    nameEn: 'VAT payable',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'TVA nette a reverser',
    isActive: true,
  },
  {
    code: '445200',
    name: 'TVA collectee',
    nameFr: 'TVA collectee',
    nameEn: 'Output VAT',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'TVA collectee (compte general)',
    isActive: true,
  },

  // Comptes TVA OSS par pays (generes dynamiquement)
  ...OSS_VAT_RATES.map(vat => ({
    code: vat.accountCode,
    name: `TVA ${vat.countryCode} (${(vat.rate * 100).toFixed(0)}%)`,
    nameFr: `TVA collectee ${vat.countryName} (${(vat.rate * 100).toFixed(0)}%)`,
    nameEn: `Output VAT ${vat.countryName} (${(vat.rate * 100).toFixed(0)}%)`,
    type: 'LIABILITY' as AccountType,
    class: 'TIERS' as AccountClass,
    parent: '445200',
    description: `TVA collectee OSS - ${vat.countryName}`,
    isActive: true,
    countryCode: vat.countryCode,
    vatRate: vat.rate,
  })),

  {
    code: '445660',
    name: 'TVA deductible',
    nameFr: 'TVA deductible',
    nameEn: 'Input VAT',
    type: 'ASSET',
    class: 'TIERS',
    description: 'TVA recuperable sur achats',
    isActive: true,
  },

  // Escrow et prestataires
  {
    code: '467100',
    name: 'Escrow prestataires',
    nameFr: 'Escrow prestataires',
    nameEn: 'Provider escrow',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'Fonds en attente de reversement aux prestataires',
    isActive: true,
  },
  {
    code: '467200',
    name: 'Prestataires a payer',
    nameFr: 'Prestataires a payer',
    nameEn: 'Providers payable',
    type: 'LIABILITY',
    class: 'TIERS',
    description: 'Montants dus aux prestataires (apres validation)',
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // CLASSE 5 - FINANCIERS
  // -------------------------------------------------------------------------
  {
    code: '512100',
    name: 'Stripe',
    nameFr: 'Compte Stripe',
    nameEn: 'Stripe account',
    type: 'ASSET',
    class: 'FINANCIERS',
    description: 'Solde compte Stripe',
    isActive: true,
  },
  {
    code: '512200',
    name: 'PayPal',
    nameFr: 'Compte PayPal',
    nameEn: 'PayPal account',
    type: 'ASSET',
    class: 'FINANCIERS',
    description: 'Solde compte PayPal',
    isActive: true,
  },
  {
    code: '512300',
    name: 'Wise',
    nameFr: 'Compte Wise',
    nameEn: 'Wise account',
    type: 'ASSET',
    class: 'FINANCIERS',
    description: 'Solde compte Wise',
    isActive: true,
  },
  {
    code: '512400',
    name: 'Banque LHV',
    nameFr: 'Banque LHV',
    nameEn: 'LHV Bank',
    type: 'ASSET',
    class: 'FINANCIERS',
    description: 'Compte bancaire LHV (Estonie)',
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // CLASSE 6 - CHARGES
  // -------------------------------------------------------------------------
  {
    code: '622100',
    name: 'Frais Stripe',
    nameFr: 'Frais Stripe',
    nameEn: 'Stripe fees',
    type: 'EXPENSE',
    class: 'CHARGES',
    description: 'Frais de transaction Stripe (~2.9% + 0.25 EUR)',
    isActive: true,
  },
  {
    code: '622200',
    name: 'Frais PayPal',
    nameFr: 'Frais PayPal',
    nameEn: 'PayPal fees',
    type: 'EXPENSE',
    class: 'CHARGES',
    description: 'Frais de transaction PayPal',
    isActive: true,
  },
  {
    code: '622300',
    name: 'Frais Wise',
    nameFr: 'Frais Wise',
    nameEn: 'Wise fees',
    type: 'EXPENSE',
    class: 'CHARGES',
    description: 'Frais de transfert Wise',
    isActive: true,
  },
  {
    code: '627000',
    name: 'Frais bancaires',
    nameFr: 'Frais bancaires',
    nameEn: 'Bank charges',
    type: 'EXPENSE',
    class: 'CHARGES',
    description: 'Frais et commissions bancaires',
    isActive: true,
  },

  // -------------------------------------------------------------------------
  // CLASSE 7 - PRODUITS
  // -------------------------------------------------------------------------
  {
    code: '706000',
    name: 'Commissions sur services',
    nameFr: 'Commissions sur services',
    nameEn: 'Service commissions',
    type: 'INCOME',
    class: 'PRODUITS',
    description: 'Commissions generales sur services (compte parent)',
    isActive: true,
  },
  {
    code: '706100',
    name: 'Commission appels avocats',
    nameFr: 'Commission appels avocats',
    nameEn: 'Lawyer call commissions',
    type: 'INCOME',
    class: 'PRODUITS',
    parent: '706000',
    description: 'Commissions sur appels avec avocats',
    isActive: true,
  },
  {
    code: '706200',
    name: 'Commission appels expatries',
    nameFr: 'Commission appels expatries',
    nameEn: 'Expat call commissions',
    type: 'INCOME',
    class: 'PRODUITS',
    parent: '706000',
    description: 'Commissions sur appels avec expatries',
    isActive: true,
  },
  {
    code: '707000',
    name: 'Abonnements IA',
    nameFr: 'Abonnements IA',
    nameEn: 'AI subscriptions',
    type: 'INCOME',
    class: 'PRODUITS',
    description: 'Revenus abonnements assistant IA',
    isActive: true,
  },
  {
    code: '758000',
    name: 'Produits divers',
    nameFr: 'Produits divers',
    nameEn: 'Other income',
    type: 'INCOME',
    class: 'PRODUITS',
    description: 'Autres produits d\'exploitation',
    isActive: true,
  },
  {
    code: '766000',
    name: 'Gains de change',
    nameFr: 'Gains de change',
    nameEn: 'Foreign exchange gains',
    type: 'INCOME',
    class: 'PRODUITS',
    description: 'Gains sur operations en devises',
    isActive: true,
  },
];

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Obtenir un compte par son code
 */
export function getAccountByCode(code: string): Account | null {
  return CHART_OF_ACCOUNTS.find(a => a.code === code) || null;
}

/**
 * Obtenir tous les comptes d'une classe
 */
export function getAccountsByClass(accountClass: AccountClass): Account[] {
  return CHART_OF_ACCOUNTS.filter(a => a.class === accountClass);
}

/**
 * Obtenir tous les comptes enfants d'un compte parent
 */
export function getChildAccounts(parentCode: string): Account[] {
  return CHART_OF_ACCOUNTS.filter(a => a.parent === parentCode);
}

/**
 * Obtenir le code compte commission selon le type de service
 */
export function getCommissionAccountCode(serviceType: 'lawyer_call' | 'expat_call'): string {
  switch (serviceType) {
    case 'lawyer_call':
      return '706100';
    case 'expat_call':
      return '706200';
    default:
      return '706000';
  }
}

/**
 * Obtenir le code compte frais selon le processeur de paiement
 */
export function getPaymentProcessorFeeAccountCode(processor: 'stripe' | 'paypal' | 'wise' | 'bank'): string {
  switch (processor) {
    case 'stripe':
      return '622100';
    case 'paypal':
      return '622200';
    case 'wise':
      return '622300';
    case 'bank':
      return '627000';
    default:
      return '627000';
  }
}

/**
 * Obtenir le code compte bancaire selon le processeur de paiement
 */
export function getBankAccountCode(processor: 'stripe' | 'paypal' | 'wise' | 'lhv'): string {
  switch (processor) {
    case 'stripe':
      return '512100';
    case 'paypal':
      return '512200';
    case 'wise':
      return '512300';
    case 'lhv':
      return '512400';
    default:
      return '512400';
  }
}

/**
 * Valider qu'une ecriture est equilibree (debits = credits)
 */
export function isBalanced(debits: number, credits: number, tolerance: number = 0.01): boolean {
  return Math.abs(debits - credits) <= tolerance;
}

// =============================================================================
// CONSTANTES COMPTABLES
// =============================================================================

export const ACCOUNTING_CONSTANTS = {
  /** Devise comptable principale */
  BASE_CURRENCY: 'EUR',

  /** Commission standard SOS-Expat */
  STANDARD_COMMISSION_RATE: 0.15, // 15%

  /** Frais Stripe estimés */
  STRIPE_FEE_PERCENT: 0.029, // 2.9%
  STRIPE_FEE_FIXED: 0.25, // 0.25 EUR

  /** Frais Wise estimés (transfert SEPA) */
  WISE_FEE_FIXED: 1.00, // 1.00 EUR

  /** Pays de siege social */
  COMPANY_COUNTRY: 'EE',

  /** Taux TVA siege (Estonie) */
  HOME_VAT_RATE: 0.22,

  /** Prefixes numeros ecritures */
  JOURNAL_ENTRY_PREFIX: 'JE',
  PAYMENT_REFERENCE_PREFIX: 'PAY',
  REFUND_REFERENCE_PREFIX: 'REF',
  PAYOUT_REFERENCE_PREFIX: 'OUT',
  SUBSCRIPTION_REFERENCE_PREFIX: 'SUB',
} as const;

export default CHART_OF_ACCOUNTS;

/**
 * Seed USA States and Canada Provinces/Territories to Firestore
 *
 * Subdivisions are stored separately from country configs.
 * Collection: country_subdivisions
 * Document ID: countryCode_subdivisionCode (e.g., "US_CA", "CA_QC")
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================================
// TYPES
// ============================================================================

export type SubdivisionType = 'STATE' | 'PROVINCE' | 'TERRITORY' | 'REGION';
export type TaxType = 'SALES_TAX' | 'GST' | 'HST' | 'PST' | 'QST' | 'NONE';

export interface SubdivisionTaxConfig {
  type: TaxType;
  rate: number;
  name: string;
  notes?: string;
}

export interface SubdivisionConfig {
  id: string;                              // countryCode_subdivisionCode
  countryCode: string;                     // US, CA
  subdivisionCode: string;                 // CA, TX, QC, ON
  subdivisionName: { en: string; fr: string };
  subdivisionType: SubdivisionType;
  timezone: string;
  taxes: SubdivisionTaxConfig[];           // Can have multiple taxes (GST + PST)
  combinedTaxRate: number;                 // Total tax rate
  professionalServicesExempt: boolean;     // Important for SOS-Expat (legal consulting)
  digitalServicesRules: {
    applicable: boolean;
    rate?: number;
    notes?: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
}

// ============================================================================
// USA STATES (50 + DC)
// Note: Professional services (legal consulting) are generally EXEMPT from
// Sales Tax in most US states. Only a few states tax professional services.
// ============================================================================

const USA_STATES: Omit<SubdivisionConfig, 'createdAt' | 'updatedAt'>[] = [
  // States that DO NOT tax professional services (most states)
  { id: 'US_AL', countryCode: 'US', subdivisionCode: 'AL', subdivisionName: { en: 'Alabama', fr: 'Alabama' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 4, name: 'State Sales Tax' }], combinedTaxRate: 4, professionalServicesExempt: true, digitalServicesRules: { applicable: false, notes: 'No sales tax on digital services' }, isActive: true },
  { id: 'US_AK', countryCode: 'US', subdivisionCode: 'AK', subdivisionName: { en: 'Alaska', fr: 'Alaska' }, subdivisionType: 'STATE', timezone: 'America/Anchorage', taxes: [], combinedTaxRate: 0, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state sales tax', isActive: true },
  { id: 'US_AZ', countryCode: 'US', subdivisionCode: 'AZ', subdivisionName: { en: 'Arizona', fr: 'Arizona' }, subdivisionType: 'STATE', timezone: 'America/Phoenix', taxes: [{ type: 'SALES_TAX', rate: 5.6, name: 'Transaction Privilege Tax' }], combinedTaxRate: 5.6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_AR', countryCode: 'US', subdivisionCode: 'AR', subdivisionName: { en: 'Arkansas', fr: 'Arkansas' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6.5, name: 'State Sales Tax' }], combinedTaxRate: 6.5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_CA', countryCode: 'US', subdivisionCode: 'CA', subdivisionName: { en: 'California', fr: 'Californie' }, subdivisionType: 'STATE', timezone: 'America/Los_Angeles', taxes: [{ type: 'SALES_TAX', rate: 7.25, name: 'State Sales Tax' }], combinedTaxRate: 7.25, professionalServicesExempt: true, digitalServicesRules: { applicable: false, notes: 'No sales tax on digital services yet' }, notes: 'Largest state by population', isActive: true },
  { id: 'US_CO', countryCode: 'US', subdivisionCode: 'CO', subdivisionName: { en: 'Colorado', fr: 'Colorado' }, subdivisionType: 'STATE', timezone: 'America/Denver', taxes: [{ type: 'SALES_TAX', rate: 2.9, name: 'State Sales Tax' }], combinedTaxRate: 2.9, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_CT', countryCode: 'US', subdivisionCode: 'CT', subdivisionName: { en: 'Connecticut', fr: 'Connecticut' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6.35, name: 'State Sales Tax' }], combinedTaxRate: 6.35, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 1, notes: 'Digital goods taxed at 1%' }, isActive: true },
  { id: 'US_DE', countryCode: 'US', subdivisionCode: 'DE', subdivisionName: { en: 'Delaware', fr: 'Delaware' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [], combinedTaxRate: 0, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state sales tax', isActive: true },
  { id: 'US_DC', countryCode: 'US', subdivisionCode: 'DC', subdivisionName: { en: 'District of Columbia', fr: 'District de Columbia' }, subdivisionType: 'TERRITORY', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6 }, notes: 'Federal district', isActive: true },
  { id: 'US_FL', countryCode: 'US', subdivisionCode: 'FL', subdivisionName: { en: 'Florida', fr: 'Floride' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state income tax', isActive: true },
  { id: 'US_GA', countryCode: 'US', subdivisionCode: 'GA', subdivisionName: { en: 'Georgia', fr: 'Géorgie' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 4, name: 'State Sales Tax' }], combinedTaxRate: 4, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },

  // States with specific professional services taxation rules
  { id: 'US_HI', countryCode: 'US', subdivisionCode: 'HI', subdivisionName: { en: 'Hawaii', fr: 'Hawaï' }, subdivisionType: 'STATE', timezone: 'Pacific/Honolulu', taxes: [{ type: 'SALES_TAX', rate: 4, name: 'General Excise Tax' }], combinedTaxRate: 4, professionalServicesExempt: false, digitalServicesRules: { applicable: true, rate: 4, notes: 'GET applies to all services including professional' }, notes: 'GET applies to most services', isActive: true },
  { id: 'US_ID', countryCode: 'US', subdivisionCode: 'ID', subdivisionName: { en: 'Idaho', fr: 'Idaho' }, subdivisionType: 'STATE', timezone: 'America/Boise', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_IL', countryCode: 'US', subdivisionCode: 'IL', subdivisionName: { en: 'Illinois', fr: 'Illinois' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6.25, name: 'State Sales Tax' }], combinedTaxRate: 6.25, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_IN', countryCode: 'US', subdivisionCode: 'IN', subdivisionName: { en: 'Indiana', fr: 'Indiana' }, subdivisionType: 'STATE', timezone: 'America/Indiana/Indianapolis', taxes: [{ type: 'SALES_TAX', rate: 7, name: 'State Sales Tax' }], combinedTaxRate: 7, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_IA', countryCode: 'US', subdivisionCode: 'IA', subdivisionName: { en: 'Iowa', fr: 'Iowa' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6 }, isActive: true },
  { id: 'US_KS', countryCode: 'US', subdivisionCode: 'KS', subdivisionName: { en: 'Kansas', fr: 'Kansas' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6.5, name: 'State Sales Tax' }], combinedTaxRate: 6.5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_KY', countryCode: 'US', subdivisionCode: 'KY', subdivisionName: { en: 'Kentucky', fr: 'Kentucky' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6 }, isActive: true },
  { id: 'US_LA', countryCode: 'US', subdivisionCode: 'LA', subdivisionName: { en: 'Louisiana', fr: 'Louisiane' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 4.45, name: 'State Sales Tax' }], combinedTaxRate: 4.45, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_ME', countryCode: 'US', subdivisionCode: 'ME', subdivisionName: { en: 'Maine', fr: 'Maine' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 5.5, name: 'State Sales Tax' }], combinedTaxRate: 5.5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_MD', countryCode: 'US', subdivisionCode: 'MD', subdivisionName: { en: 'Maryland', fr: 'Maryland' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6, notes: 'Digital advertising services taxed' }, isActive: true },
  { id: 'US_MA', countryCode: 'US', subdivisionCode: 'MA', subdivisionName: { en: 'Massachusetts', fr: 'Massachusetts' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6.25, name: 'State Sales Tax' }], combinedTaxRate: 6.25, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_MI', countryCode: 'US', subdivisionCode: 'MI', subdivisionName: { en: 'Michigan', fr: 'Michigan' }, subdivisionType: 'STATE', timezone: 'America/Detroit', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_MN', countryCode: 'US', subdivisionCode: 'MN', subdivisionName: { en: 'Minnesota', fr: 'Minnesota' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6.875, name: 'State Sales Tax' }], combinedTaxRate: 6.875, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6.875 }, isActive: true },
  { id: 'US_MS', countryCode: 'US', subdivisionCode: 'MS', subdivisionName: { en: 'Mississippi', fr: 'Mississippi' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 7, name: 'State Sales Tax' }], combinedTaxRate: 7, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_MO', countryCode: 'US', subdivisionCode: 'MO', subdivisionName: { en: 'Missouri', fr: 'Missouri' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 4.225, name: 'State Sales Tax' }], combinedTaxRate: 4.225, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_MT', countryCode: 'US', subdivisionCode: 'MT', subdivisionName: { en: 'Montana', fr: 'Montana' }, subdivisionType: 'STATE', timezone: 'America/Denver', taxes: [], combinedTaxRate: 0, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state sales tax', isActive: true },
  { id: 'US_NE', countryCode: 'US', subdivisionCode: 'NE', subdivisionName: { en: 'Nebraska', fr: 'Nebraska' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 5.5, name: 'State Sales Tax' }], combinedTaxRate: 5.5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_NV', countryCode: 'US', subdivisionCode: 'NV', subdivisionName: { en: 'Nevada', fr: 'Nevada' }, subdivisionType: 'STATE', timezone: 'America/Los_Angeles', taxes: [{ type: 'SALES_TAX', rate: 6.85, name: 'State Sales Tax' }], combinedTaxRate: 6.85, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state income tax', isActive: true },
  { id: 'US_NH', countryCode: 'US', subdivisionCode: 'NH', subdivisionName: { en: 'New Hampshire', fr: 'New Hampshire' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [], combinedTaxRate: 0, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state sales tax', isActive: true },
  { id: 'US_NJ', countryCode: 'US', subdivisionCode: 'NJ', subdivisionName: { en: 'New Jersey', fr: 'New Jersey' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6.625, name: 'State Sales Tax' }], combinedTaxRate: 6.625, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6.625 }, isActive: true },

  // New Mexico - one of few states that taxes professional services
  { id: 'US_NM', countryCode: 'US', subdivisionCode: 'NM', subdivisionName: { en: 'New Mexico', fr: 'Nouveau-Mexique' }, subdivisionType: 'STATE', timezone: 'America/Denver', taxes: [{ type: 'SALES_TAX', rate: 5.125, name: 'Gross Receipts Tax' }], combinedTaxRate: 5.125, professionalServicesExempt: false, digitalServicesRules: { applicable: true, rate: 5.125, notes: 'GRT applies to most services including professional' }, notes: 'GRT applies to professional services', isActive: true },

  { id: 'US_NY', countryCode: 'US', subdivisionCode: 'NY', subdivisionName: { en: 'New York', fr: 'New York' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 4, name: 'State Sales Tax' }], combinedTaxRate: 4, professionalServicesExempt: true, digitalServicesRules: { applicable: false, notes: 'Digital services exempt, but considering legislation' }, notes: 'NYC adds 4.5% local tax', isActive: true },
  { id: 'US_NC', countryCode: 'US', subdivisionCode: 'NC', subdivisionName: { en: 'North Carolina', fr: 'Caroline du Nord' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 4.75, name: 'State Sales Tax' }], combinedTaxRate: 4.75, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_ND', countryCode: 'US', subdivisionCode: 'ND', subdivisionName: { en: 'North Dakota', fr: 'Dakota du Nord' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 5, name: 'State Sales Tax' }], combinedTaxRate: 5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_OH', countryCode: 'US', subdivisionCode: 'OH', subdivisionName: { en: 'Ohio', fr: 'Ohio' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 5.75, name: 'State Sales Tax' }], combinedTaxRate: 5.75, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_OK', countryCode: 'US', subdivisionCode: 'OK', subdivisionName: { en: 'Oklahoma', fr: 'Oklahoma' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 4.5, name: 'State Sales Tax' }], combinedTaxRate: 4.5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_OR', countryCode: 'US', subdivisionCode: 'OR', subdivisionName: { en: 'Oregon', fr: 'Oregon' }, subdivisionType: 'STATE', timezone: 'America/Los_Angeles', taxes: [], combinedTaxRate: 0, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state sales tax', isActive: true },
  { id: 'US_PA', countryCode: 'US', subdivisionCode: 'PA', subdivisionName: { en: 'Pennsylvania', fr: 'Pennsylvanie' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6 }, isActive: true },
  { id: 'US_RI', countryCode: 'US', subdivisionCode: 'RI', subdivisionName: { en: 'Rhode Island', fr: 'Rhode Island' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 7, name: 'State Sales Tax' }], combinedTaxRate: 7, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },

  // South Dakota - taxes professional services
  { id: 'US_SD', countryCode: 'US', subdivisionCode: 'SD', subdivisionName: { en: 'South Dakota', fr: 'Dakota du Sud' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 4.5, name: 'State Sales Tax' }], combinedTaxRate: 4.5, professionalServicesExempt: false, digitalServicesRules: { applicable: true, rate: 4.5, notes: 'Sales tax applies to professional services' }, notes: 'One of few states taxing professional services', isActive: true },

  { id: 'US_SC', countryCode: 'US', subdivisionCode: 'SC', subdivisionName: { en: 'South Carolina', fr: 'Caroline du Sud' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_TN', countryCode: 'US', subdivisionCode: 'TN', subdivisionName: { en: 'Tennessee', fr: 'Tennessee' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 7, name: 'State Sales Tax' }], combinedTaxRate: 7, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 7 }, notes: 'No state income tax', isActive: true },
  { id: 'US_TX', countryCode: 'US', subdivisionCode: 'TX', subdivisionName: { en: 'Texas', fr: 'Texas' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 6.25, name: 'State Sales Tax' }], combinedTaxRate: 6.25, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6.25, notes: 'Digital products taxed, services generally exempt' }, notes: 'No state income tax', isActive: true },
  { id: 'US_UT', countryCode: 'US', subdivisionCode: 'UT', subdivisionName: { en: 'Utah', fr: 'Utah' }, subdivisionType: 'STATE', timezone: 'America/Denver', taxes: [{ type: 'SALES_TAX', rate: 6.1, name: 'State Sales Tax' }], combinedTaxRate: 6.1, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_VT', countryCode: 'US', subdivisionCode: 'VT', subdivisionName: { en: 'Vermont', fr: 'Vermont' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_VA', countryCode: 'US', subdivisionCode: 'VA', subdivisionName: { en: 'Virginia', fr: 'Virginie' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 5.3, name: 'State Sales Tax' }], combinedTaxRate: 5.3, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_WA', countryCode: 'US', subdivisionCode: 'WA', subdivisionName: { en: 'Washington', fr: 'Washington' }, subdivisionType: 'STATE', timezone: 'America/Los_Angeles', taxes: [{ type: 'SALES_TAX', rate: 6.5, name: 'State Sales Tax' }], combinedTaxRate: 6.5, professionalServicesExempt: true, digitalServicesRules: { applicable: true, rate: 6.5 }, notes: 'No state income tax', isActive: true },

  // West Virginia - taxes some professional services
  { id: 'US_WV', countryCode: 'US', subdivisionCode: 'WV', subdivisionName: { en: 'West Virginia', fr: 'Virginie-Occidentale' }, subdivisionType: 'STATE', timezone: 'America/New_York', taxes: [{ type: 'SALES_TAX', rate: 6, name: 'State Sales Tax' }], combinedTaxRate: 6, professionalServicesExempt: false, digitalServicesRules: { applicable: true, rate: 6, notes: 'Most services taxable' }, notes: 'Many professional services taxable', isActive: true },

  { id: 'US_WI', countryCode: 'US', subdivisionCode: 'WI', subdivisionName: { en: 'Wisconsin', fr: 'Wisconsin' }, subdivisionType: 'STATE', timezone: 'America/Chicago', taxes: [{ type: 'SALES_TAX', rate: 5, name: 'State Sales Tax' }], combinedTaxRate: 5, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, isActive: true },
  { id: 'US_WY', countryCode: 'US', subdivisionCode: 'WY', subdivisionName: { en: 'Wyoming', fr: 'Wyoming' }, subdivisionType: 'STATE', timezone: 'America/Denver', taxes: [{ type: 'SALES_TAX', rate: 4, name: 'State Sales Tax' }], combinedTaxRate: 4, professionalServicesExempt: true, digitalServicesRules: { applicable: false }, notes: 'No state income tax', isActive: true },
];

// ============================================================================
// CANADA PROVINCES AND TERRITORIES (13)
// GST = 5% federal (all provinces)
// HST = Harmonized (GST + PST combined) - ON, NB, NS, NL, PE
// PST = Provincial (varies) - BC, SK, MB
// QST = Quebec Sales Tax - QC only
// No PST: AB, YT, NT, NU
// ============================================================================

const CANADA_PROVINCES: Omit<SubdivisionConfig, 'createdAt' | 'updatedAt'>[] = [
  // HST Provinces (GST + PST harmonized)
  {
    id: 'CA_ON', countryCode: 'CA', subdivisionCode: 'ON', subdivisionName: { en: 'Ontario', fr: 'Ontario' },
    subdivisionType: 'PROVINCE', timezone: 'America/Toronto',
    taxes: [{ type: 'HST', rate: 13, name: 'Harmonized Sales Tax', notes: 'GST 5% + Ontario portion 8%' }],
    combinedTaxRate: 13, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 13, notes: 'Digital services taxable under HST' },
    notes: 'Largest province by population', isActive: true
  },
  {
    id: 'CA_NB', countryCode: 'CA', subdivisionCode: 'NB', subdivisionName: { en: 'New Brunswick', fr: 'Nouveau-Brunswick' },
    subdivisionType: 'PROVINCE', timezone: 'America/Moncton',
    taxes: [{ type: 'HST', rate: 15, name: 'Harmonized Sales Tax', notes: 'GST 5% + provincial 10%' }],
    combinedTaxRate: 15, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 15 },
    notes: 'Bilingual province', isActive: true
  },
  {
    id: 'CA_NS', countryCode: 'CA', subdivisionCode: 'NS', subdivisionName: { en: 'Nova Scotia', fr: 'Nouvelle-Écosse' },
    subdivisionType: 'PROVINCE', timezone: 'America/Halifax',
    taxes: [{ type: 'HST', rate: 15, name: 'Harmonized Sales Tax', notes: 'GST 5% + provincial 10%' }],
    combinedTaxRate: 15, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 15 }, isActive: true
  },
  {
    id: 'CA_NL', countryCode: 'CA', subdivisionCode: 'NL', subdivisionName: { en: 'Newfoundland and Labrador', fr: 'Terre-Neuve-et-Labrador' },
    subdivisionType: 'PROVINCE', timezone: 'America/St_Johns',
    taxes: [{ type: 'HST', rate: 15, name: 'Harmonized Sales Tax', notes: 'GST 5% + provincial 10%' }],
    combinedTaxRate: 15, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 15 }, isActive: true
  },
  {
    id: 'CA_PE', countryCode: 'CA', subdivisionCode: 'PE', subdivisionName: { en: 'Prince Edward Island', fr: 'Île-du-Prince-Édouard' },
    subdivisionType: 'PROVINCE', timezone: 'America/Halifax',
    taxes: [{ type: 'HST', rate: 15, name: 'Harmonized Sales Tax', notes: 'GST 5% + provincial 10%' }],
    combinedTaxRate: 15, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 15 }, isActive: true
  },

  // GST + PST Provinces (separate taxes)
  {
    id: 'CA_BC', countryCode: 'CA', subdivisionCode: 'BC', subdivisionName: { en: 'British Columbia', fr: 'Colombie-Britannique' },
    subdivisionType: 'PROVINCE', timezone: 'America/Vancouver',
    taxes: [
      { type: 'GST', rate: 5, name: 'Federal GST' },
      { type: 'PST', rate: 7, name: 'Provincial Sales Tax' }
    ],
    combinedTaxRate: 12, professionalServicesExempt: true,
    digitalServicesRules: { applicable: true, rate: 5, notes: 'GST only on digital services, PST exempt' },
    notes: 'PST does not apply to most services', isActive: true
  },
  {
    id: 'CA_SK', countryCode: 'CA', subdivisionCode: 'SK', subdivisionName: { en: 'Saskatchewan', fr: 'Saskatchewan' },
    subdivisionType: 'PROVINCE', timezone: 'America/Regina',
    taxes: [
      { type: 'GST', rate: 5, name: 'Federal GST' },
      { type: 'PST', rate: 6, name: 'Provincial Sales Tax' }
    ],
    combinedTaxRate: 11, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 11, notes: 'PST applies to digital services' }, isActive: true
  },
  {
    id: 'CA_MB', countryCode: 'CA', subdivisionCode: 'MB', subdivisionName: { en: 'Manitoba', fr: 'Manitoba' },
    subdivisionType: 'PROVINCE', timezone: 'America/Winnipeg',
    taxes: [
      { type: 'GST', rate: 5, name: 'Federal GST' },
      { type: 'PST', rate: 7, name: 'Retail Sales Tax' }
    ],
    combinedTaxRate: 12, professionalServicesExempt: true,
    digitalServicesRules: { applicable: true, rate: 5, notes: 'GST only, RST does not apply to most services' }, isActive: true
  },

  // Quebec (GST + QST)
  {
    id: 'CA_QC', countryCode: 'CA', subdivisionCode: 'QC', subdivisionName: { en: 'Quebec', fr: 'Québec' },
    subdivisionType: 'PROVINCE', timezone: 'America/Montreal',
    taxes: [
      { type: 'GST', rate: 5, name: 'Federal GST' },
      { type: 'QST', rate: 9.975, name: 'Quebec Sales Tax' }
    ],
    combinedTaxRate: 14.975, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 14.975, notes: 'QST applies to digital services' },
    notes: 'French-speaking province. QST calculated on price excluding GST', isActive: true
  },

  // GST-only Provinces/Territories (no PST)
  {
    id: 'CA_AB', countryCode: 'CA', subdivisionCode: 'AB', subdivisionName: { en: 'Alberta', fr: 'Alberta' },
    subdivisionType: 'PROVINCE', timezone: 'America/Edmonton',
    taxes: [{ type: 'GST', rate: 5, name: 'Federal GST' }],
    combinedTaxRate: 5, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 5 },
    notes: 'No provincial sales tax - lowest tax burden in Canada', isActive: true
  },
  {
    id: 'CA_YT', countryCode: 'CA', subdivisionCode: 'YT', subdivisionName: { en: 'Yukon', fr: 'Yukon' },
    subdivisionType: 'TERRITORY', timezone: 'America/Whitehorse',
    taxes: [{ type: 'GST', rate: 5, name: 'Federal GST' }],
    combinedTaxRate: 5, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 5 },
    notes: 'Territory - no PST', isActive: true
  },
  {
    id: 'CA_NT', countryCode: 'CA', subdivisionCode: 'NT', subdivisionName: { en: 'Northwest Territories', fr: 'Territoires du Nord-Ouest' },
    subdivisionType: 'TERRITORY', timezone: 'America/Yellowknife',
    taxes: [{ type: 'GST', rate: 5, name: 'Federal GST' }],
    combinedTaxRate: 5, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 5 },
    notes: 'Territory - no PST', isActive: true
  },
  {
    id: 'CA_NU', countryCode: 'CA', subdivisionCode: 'NU', subdivisionName: { en: 'Nunavut', fr: 'Nunavut' },
    subdivisionType: 'TERRITORY', timezone: 'America/Iqaluit',
    taxes: [{ type: 'GST', rate: 5, name: 'Federal GST' }],
    combinedTaxRate: 5, professionalServicesExempt: false,
    digitalServicesRules: { applicable: true, rate: 5 },
    notes: 'Territory - no PST. Newest territory (1999)', isActive: true
  },
];

// ============================================================================
// COMBINED DATA
// ============================================================================

export const ALL_SUBDIVISIONS = [...USA_STATES, ...CANADA_PROVINCES];

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seedSubdivisionConfigs(
  db: FirebaseFirestore.Firestore
): Promise<{ success: number; failed: number; total: number }> {
  const batch = db.batch();
  let success = 0;
  let failed = 0;

  console.log(`Seeding ${ALL_SUBDIVISIONS.length} subdivision configurations...`);

  for (const subdivision of ALL_SUBDIVISIONS) {
    try {
      const docRef = db.collection('country_subdivisions').doc(subdivision.id);
      batch.set(docRef, {
        ...subdivision,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      success++;
    } catch (error) {
      console.error(`Failed to add ${subdivision.id}:`, error);
      failed++;
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully seeded ${success} subdivisions. Failed: ${failed}`);
  } catch (error) {
    console.error('Batch commit failed:', error);
    throw error;
  }

  return { success, failed, total: ALL_SUBDIVISIONS.length };
}

// ============================================================================
// CALLABLE FUNCTION TO TRIGGER SEED
// ============================================================================

export async function runSubdivisionSeed(): Promise<void> {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  const db = admin.firestore();
  await seedSubdivisionConfigs(db);
}

// Export individual arrays
export { USA_STATES, CANADA_PROVINCES };

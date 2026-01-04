/**
 * Seeds Module Index
 *
 * Export all seed functions for Firestore initialization
 */

export { seedCountryConfigs, runSeed, ALL_COUNTRIES } from './seedCountryConfigs';
export {
  seedSubdivisionConfigs,
  runSubdivisionSeed,
  ALL_SUBDIVISIONS,
  USA_STATES,
  CANADA_PROVINCES
} from './seedSubdivisionConfigs';

// Export types
export type { CountryFiscalConfig, TaxType, PaymentMethod, Region } from './seedCountryConfigs';
export type { SubdivisionConfig, SubdivisionType, SubdivisionTaxConfig } from './seedSubdivisionConfigs';

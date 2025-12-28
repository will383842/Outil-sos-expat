/**
 * =============================================================================
 * GUARDS - Export all guard components
 * =============================================================================
 * Composants d'ecran de blocage affiches lorsque l'utilisateur ne peut pas
 * acceder a l'application (quota, abonnement, acces refuse, etc.)
 */

// Ecran de blocage generique (configurable)
export { default as BlockedScreen } from "./BlockedScreen";
export type { BlockedScreenProps } from "./BlockedScreen";

// Ecran d'abonnement requis (pour nouveaux utilisateurs)
export { default as SubscriptionScreen } from "./SubscriptionScreen";
export type { SubscriptionScreenProps } from "./SubscriptionScreen";

// Ecran de quota IA epuise
export { default as QuotaExhaustedScreen } from "./QuotaExhaustedScreen";
export type { QuotaExhaustedScreenProps } from "./QuotaExhaustedScreen";

// Ecran d'abonnement expire
export { default as SubscriptionExpiredScreen } from "./SubscriptionExpiredScreen";
export type { SubscriptionExpiredScreenProps } from "./SubscriptionExpiredScreen";

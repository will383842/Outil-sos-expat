/**
 * =============================================================================
 * GUARDS - Export all guard components
 * =============================================================================
 * Composants d'ecran de blocage affiches lorsque l'utilisateur ne peut pas
 * acceder a l'application (quota, abonnement, acces refuse, etc.)
 *
 * Note: Les abonnements sont geres dans SOS-Expat, pas ici.
 * Seul BlockedScreen est necessaire pour les ecrans de blocage generiques.
 */

// Ecran de blocage generique (configurable)
export { default as BlockedScreen } from "./BlockedScreen";
export type { BlockedScreenProps } from "./BlockedScreen";

/**
 * =============================================================================
 * USE AUTH USER - Selector pour données d'authentification
 * =============================================================================
 *
 * Re-render UNIQUEMENT quand les données auth changent.
 * Utiliser ce hook au lieu de useAuth() pour optimiser les re-renders.
 */

export { useAuthUser } from "../contexts/UnifiedUserContext";

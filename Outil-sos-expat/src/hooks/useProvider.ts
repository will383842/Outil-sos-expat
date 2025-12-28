/**
 * =============================================================================
 * USE PROVIDER - Selector pour données provider
 * =============================================================================
 *
 * Re-render UNIQUEMENT quand les données provider changent.
 * Utiliser ce hook au lieu de useProvider() du context séparé.
 */

export { useUserProvider as useProvider } from "../contexts/UnifiedUserContext";

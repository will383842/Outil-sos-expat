/**
 * =============================================================================
 * NAVIGATION COMPONENTS - Barrel Export
 * =============================================================================
 *
 * Composants de navigation mobile-first professionnels :
 * - MobileDrawer : Tiroir de navigation slide-in
 * - BottomNavigation : Barre de navigation fixe en bas
 *
 * @example
 * import { MobileDrawer, BottomNavigation } from '@/components/navigation';
 *
 * // Dans votre layout
 * <MobileDrawer isOpen={isOpen} onClose={onClose} />
 * <BottomNavigation unreadMessages={unreadCount} />
 */

export { MobileDrawer } from "./MobileDrawer";
export type { MobileDrawerProps, MobileNavItem } from "./MobileDrawer";

export { BottomNavigation } from "./BottomNavigation";
export type { BottomNavigationProps, BottomNavItem } from "./BottomNavigation";

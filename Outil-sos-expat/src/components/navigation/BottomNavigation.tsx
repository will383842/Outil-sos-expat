/**
 * =============================================================================
 * BOTTOM NAVIGATION - Barre de navigation mobile professionnelle
 * =============================================================================
 *
 * Fonctionnalités:
 * - Navigation fixe en bas pour mobile (hidden sur lg+)
 * - Support i18n complet
 * - Badge de notification animé
 * - Indicateur d'état actif avec animation
 * - Touch-friendly (min 44px targets)
 * - Support RTL automatique
 * - Safe area pour iOS (notch/home indicator)
 * - Haptic feedback (si supporté)
 * - Accessibilité ARIA complète
 *
 * =============================================================================
 */

import { Link, useLocation } from "react-router-dom";
import { memo, useCallback } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

// =============================================================================
// TYPES
// =============================================================================

export interface BottomNavItem {
  /** Route de destination */
  to: string;
  /** Clé i18n pour le label */
  labelKey: string;
  /** Fallback si pas de traduction */
  labelFallback: string;
  /** Icône Lucide */
  icon: LucideIcon;
  /** Route exacte (pas de match partiel) */
  exact?: boolean;
  /** Badge de notification */
  badge?: number;
  /** Désactivé */
  disabled?: boolean;
}

export interface BottomNavigationProps {
  /** Items de navigation personnalisés */
  items?: BottomNavItem[];
  /** Nombre de messages non lus (ajouté au badge Messages) */
  unreadMessages?: number;
  /** Classes CSS additionnelles */
  className?: string;
  /** Callback lors du clic (pour analytics, etc.) */
  onNavigate?: (to: string) => void;
}

// =============================================================================
// CONFIGURATION PAR DÉFAUT
// =============================================================================

const defaultItems: BottomNavItem[] = [
  {
    to: "/admin",
    labelKey: "common:navigation.dashboard",
    labelFallback: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/admin/dossiers",
    labelKey: "common:navigation.dossiers",
    labelFallback: "Dossiers",
    icon: FolderOpen,
  },
  {
    to: "/admin/messages",
    labelKey: "common:navigation.messages",
    labelFallback: "Messages",
    icon: MessageSquare,
  },
  {
    to: "/admin/profil",
    labelKey: "common:navigation.profile",
    labelFallback: "Profil",
    icon: User,
  },
];

// =============================================================================
// BADGE COMPONENT
// =============================================================================

interface BadgeProps {
  count: number;
  reducedMotion: boolean;
}

const Badge = memo(function Badge({ count, reducedMotion }: BadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1",
        "flex items-center justify-center",
        "min-w-[18px] h-[18px] px-1",
        "text-[10px] font-bold text-white",
        "bg-sos-red rounded-full",
        "border-2 border-white",
        "shadow-sm",
        !reducedMotion && "animate-in zoom-in-50 duration-200"
      )}
      aria-label={`${count} non lu${count > 1 ? "s" : ""}`}
    >
      {displayCount}
    </span>
  );
});

// =============================================================================
// NAV ITEM COMPONENT
// =============================================================================

interface NavItemProps {
  item: BottomNavItem;
  isActive: boolean;
  reducedMotion: boolean;
  onNavigate?: (to: string) => void;
  t: (key: string, fallback?: string) => string;
}

const NavItem = memo(function NavItem({
  item,
  isActive,
  reducedMotion,
  onNavigate,
  t,
}: NavItemProps) {
  const Icon = item.icon;
  const label = t(item.labelKey) || item.labelFallback;

  const handleClick = useCallback(() => {
    // Haptic feedback si disponible
    if ("vibrate" in navigator && !reducedMotion) {
      navigator.vibrate(10);
    }
    onNavigate?.(item.to);
  }, [item.to, onNavigate, reducedMotion]);

  if (item.disabled) {
    return (
      <li className="flex-1">
        <span
          className={cn(
            "flex flex-col items-center justify-center h-full px-1 py-2",
            "min-h-[44px] min-w-[44px]",
            "text-gray-300 cursor-not-allowed"
          )}
          aria-disabled="true"
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
          <span className="text-[10px] mt-1 font-medium">{label}</span>
        </span>
      </li>
    );
  }

  return (
    <li className="flex-1 relative">
      <Link
        to={item.to}
        onClick={handleClick}
        className={cn(
          "flex flex-col items-center justify-center h-full px-1 py-2",
          "min-h-[44px] min-w-[44px]",
          "transition-colors",
          !reducedMotion && "transition-transform duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sos-red",
          "tap-highlight-subtle",
          isActive
            ? "text-sos-red"
            : "text-gray-500 hover:text-gray-700 active:text-gray-900 active:scale-95"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Icon container with badge */}
        <span className="relative">
          <Icon
            className={cn(
              "w-6 h-6",
              !reducedMotion && "transition-transform duration-200",
              isActive && "scale-110"
            )}
            aria-hidden="true"
          />
          {item.badge !== undefined && (
            <Badge count={item.badge} reducedMotion={reducedMotion} />
          )}
        </span>

        {/* Label */}
        <span
          className={cn(
            "text-[10px] mt-1 font-medium truncate max-w-full",
            isActive && "font-semibold"
          )}
        >
          {label}
        </span>
      </Link>

      {/* Active indicator line */}
      <span
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2",
          "w-8 h-0.5 rounded-full",
          !reducedMotion && "transition-all duration-200",
          isActive
            ? "bg-sos-red opacity-100 scale-x-100"
            : "bg-transparent opacity-0 scale-x-0"
        )}
        aria-hidden="true"
      />
    </li>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function BottomNavigationComponent({
  items,
  unreadMessages = 0,
  className,
  onNavigate,
}: BottomNavigationProps) {
  const location = useLocation();
  const { t } = useLanguage({ mode: "provider" });
  const prefersReducedMotion = usePrefersReducedMotion();

  // Use provided items or defaults
  const navItems = items ?? defaultItems;

  // Add unread badge to messages item
  const itemsWithBadges = navItems.map((item) => {
    if (item.to === "/admin/messages" && unreadMessages > 0) {
      return { ...item, badge: unreadMessages };
    }
    return item;
  });

  // Check if nav item is active
  const isNavItemActive = useCallback(
    (item: BottomNavItem): boolean => {
      if (item.exact) {
        return location.pathname === item.to;
      }
      // Match sur le préfixe, mais pas /admin tout seul (sauf exact)
      return location.pathname.startsWith(item.to) && item.to !== "/admin";
    },
    [location.pathname]
  );

  // Translation helper with fallback
  const translate = useCallback(
    (key: string, fallback?: string): string => {
      const translated = t(key);
      // Si la traduction retourne la clé, utiliser le fallback
      return translated === key ? fallback || key : translated;
    },
    [t]
  );

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className={cn(
        // Positionnement
        "fixed bottom-0 left-0 right-0 z-40",
        // Masqué sur desktop
        "lg:hidden",
        // Style
        "bg-white/95 backdrop-blur-md",
        "border-t border-gray-200",
        "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]",
        className
      )}
      style={{
        // Safe area pour iOS (home indicator)
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <ul className="flex items-stretch justify-around h-16">
        {itemsWithBadges.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            isActive={isNavItemActive(item)}
            reducedMotion={prefersReducedMotion}
            onNavigate={onNavigate}
            t={translate}
          />
        ))}
      </ul>
    </nav>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const BottomNavigation = memo(BottomNavigationComponent);
BottomNavigation.displayName = "BottomNavigation";

export default BottomNavigation;

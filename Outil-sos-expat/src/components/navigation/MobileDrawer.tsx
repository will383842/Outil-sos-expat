/**
 * =============================================================================
 * MOBILE DRAWER - Tiroir de navigation mobile professionnel
 * =============================================================================
 *
 * Fonctionnalités:
 * - Slide-in depuis la gauche avec animation fluide
 * - User info avec avatar et rôle
 * - Navigation traduite (i18n)
 * - Provider Switcher intégré
 * - Language Selector intégré
 * - Mode Preview (admin uniquement)
 * - Backdrop avec fermeture au clic/swipe
 * - Fermeture automatique sur navigation
 * - Focus trap et gestion clavier (Escape)
 * - Accessibilité ARIA complète
 * - Support RTL
 * - Animations respectant prefers-reduced-motion
 *
 * =============================================================================
 */

import { useEffect, useRef, useCallback, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth, useSubscription } from "@/contexts/UnifiedUserContext";
import { useLanguage } from "@/hooks/useLanguage";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import ProviderSwitcher from "@/components/ProviderSwitcher";
import LanguageSelector from "@/components/LanguageSelector";
import { Avatar, AvatarFallback, AvatarImage, Separator } from "@/components/ui";
import {
  X,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  User,
  Users,
  Building2,
  Globe,
  Settings,
  FileText,
  Shield,
  LogOut,
  Sparkles,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface MobileNavItem {
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
  /** Réservé aux admins */
  adminOnly?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
}

export interface MobileDrawerProps {
  /** État ouvert/fermé */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Items de navigation personnalisés */
  navItems?: MobileNavItem[];
  /** Override isAdmin (sinon utilise le contexte) */
  isAdmin?: boolean;
  /** Mode preview activé */
  previewMode?: boolean;
  /** Callback toggle preview mode */
  onTogglePreviewMode?: () => void;
  /** Classes CSS additionnelles */
  className?: string;
}

// =============================================================================
// CONFIGURATION PAR DÉFAUT
// =============================================================================

const defaultProviderNavItems: MobileNavItem[] = [
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
    labelFallback: "Mes Dossiers",
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
    labelFallback: "Mon Profil",
    icon: User,
  },
];

const defaultAdminOnlyNavItems: MobileNavItem[] = [
  {
    to: "/admin/prestataires",
    labelKey: "common:navigation.prestataires",
    labelFallback: "Prestataires",
    icon: Building2,
    adminOnly: true,
  },
  {
    to: "/admin/gestion-acces",
    labelKey: "common:navigation.access",
    labelFallback: "Accès",
    icon: Shield,
    adminOnly: true,
  },
  {
    to: "/admin/utilisateurs",
    labelKey: "common:navigation.team",
    labelFallback: "Équipe",
    icon: Users,
    adminOnly: true,
  },
  {
    to: "/admin/pays",
    labelKey: "common:navigation.countries",
    labelFallback: "Pays",
    icon: Globe,
    adminOnly: true,
  },
  {
    to: "/admin/parametres",
    labelKey: "common:navigation.settings",
    labelFallback: "Paramètres",
    icon: Settings,
    adminOnly: true,
  },
  {
    to: "/admin/audit",
    labelKey: "common:navigation.audit",
    labelFallback: "Audit",
    icon: FileText,
    adminOnly: true,
  },
  {
    to: "/admin/test-ia",
    labelKey: "common:navigation.testAI",
    labelFallback: "Test IA",
    icon: Sparkles,
    adminOnly: true,
    className: "text-purple-600",
  },
];

// =============================================================================
// ROLE DISPLAY HELPER
// =============================================================================

function getRoleDisplay(
  isAdmin: boolean,
  role: string | null | undefined,
  t: (key: string) => string
): string {
  if (isAdmin) return t("common:roles.admin") || "Administrateur";

  switch (role) {
    case "lawyer":
    case "avocat":
      return t("common:roles.lawyer") || "Avocat";
    case "expat":
    case "expat_aidant":
      return t("common:roles.expert") || "Expert Expatriation";
    default:
      return t("common:roles.provider") || "Prestataire";
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function MobileDrawerComponent({
  isOpen,
  onClose,
  navItems,
  isAdmin: propIsAdmin,
  previewMode = false,
  onTogglePreviewMode,
  className,
}: MobileDrawerProps) {
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Context hooks
  const { user, isAdmin: contextIsAdmin } = useAuth();
  const { role } = useSubscription();
  const { t } = useLanguage({ mode: contextIsAdmin ? "admin" : "provider" });

  // Use prop isAdmin if provided, otherwise use context
  const isAdmin = propIsAdmin ?? contextIsAdmin;

  // Determine which nav items to show
  const showAdminNav = isAdmin && !previewMode;
  const effectiveNavItems =
    navItems ??
    (showAdminNav
      ? [...defaultProviderNavItems, ...defaultAdminOnlyNavItems]
      : defaultProviderNavItems);

  // Get user initials for avatar fallback
  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0].toUpperCase() || "U";

  // Role display
  const roleDisplay = getRoleDisplay(isAdmin, role, t);

  // Translation helper with fallback
  const translate = useCallback(
    (key: string, fallback?: string): string => {
      const translated = t(key);
      return translated === key ? fallback || key : translated;
    },
    [t]
  );

  // Close on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Focus management and escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when drawer opens
    const focusTimeout = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent body scroll when drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleEscape);

    return () => {
      clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Check if nav item is active
  const isNavItemActive = useCallback(
    (item: MobileNavItem): boolean => {
      if (item.exact) {
        return location.pathname === item.to;
      }
      return location.pathname.startsWith(item.to) && item.to !== "/admin";
    },
    [location.pathname]
  );

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 lg:hidden",
          prefersReducedMotion
            ? isOpen
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
            : "transition-opacity duration-300",
          !prefersReducedMotion && (isOpen ? "opacity-100" : "opacity-0 pointer-events-none")
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={translate("common:navigation.menu", "Menu de navigation")}
        className={cn(
          "fixed inset-y-0 left-0 z-50",
          "w-[300px] max-w-[85vw]",
          "bg-white shadow-2xl",
          "flex flex-col",
          "lg:hidden",
          prefersReducedMotion
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "transition-transform duration-300 ease-out",
          !prefersReducedMotion && (isOpen ? "translate-x-0" : "-translate-x-full"),
          className
        )}
      >
        {/* Header with user info */}
        <div className="flex flex-col p-4 bg-gradient-to-br from-sos-red/5 to-white border-b safe-area-top">
          {/* Close button */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className={cn(
              "self-end p-2 -mr-2 -mt-2 rounded-lg",
              "hover:bg-sos-red/10 active:bg-sos-red/20",
              "transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sos-red focus-visible:ring-offset-2"
            )}
            aria-label={translate("common:actions.close", "Fermer le menu")}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 mt-1">
            <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
              <AvatarImage
                src={user?.photoURL || undefined}
                alt={user?.displayName || "Avatar"}
              />
              <AvatarFallback className="bg-sos-red/10 text-sos-red font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user?.displayName || translate("common:user.anonymous", "Utilisateur")}
              </p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sos-red/10 text-sos-red">
                {roleDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Preview Mode Toggle (admin only) */}
        {isAdmin && onTogglePreviewMode && (
          <div className="px-4 py-3 border-b">
            <button
              onClick={onTogglePreviewMode}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "px-3 py-2.5 rounded-lg text-sm font-medium",
                "transition-colors min-h-[44px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                previewMode
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200 focus-visible:ring-purple-500"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:ring-gray-500"
              )}
            >
              {previewMode ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>{translate("admin:header.previewMode", "Vue Prestataire activée")}</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>{translate("common:actions.preview", "Voir comme Prestataire")}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Provider Switcher */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {translate("provider:switcher.activeProvider", "Prestataire actif")}
          </p>
          <ProviderSwitcher />
        </div>

        {/* Language Selector */}
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {translate("common:language.select", "Langue")}
          </p>
          <LanguageSelector mode={isAdmin ? "admin" : "provider"} variant="full" />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Navigation principale">
          <ul className="space-y-1 px-2">
            {effectiveNavItems.map((item) => {
              const isActive = isNavItemActive(item);
              const Icon = item.icon;
              const label = translate(item.labelKey, item.labelFallback);

              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg",
                      "min-h-[44px]",
                      "transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-sos-red focus-visible:ring-offset-2",
                      isActive
                        ? "bg-sos-red/10 text-sos-red font-medium"
                        : "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
                      item.className
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0",
                        isActive ? "text-sos-red" : "text-gray-400"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t mt-auto safe-area-bottom">
          <Separator className="mb-4" />
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-lg",
              "min-h-[44px]",
              "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
              "transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sos-red focus-visible:ring-offset-2"
            )}
          >
            <LogOut className="w-5 h-5" />
            <span>{translate("common:navigation.signOut", "Se déconnecter")}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const MobileDrawer = memo(MobileDrawerComponent);
MobileDrawer.displayName = "MobileDrawer";

export default MobileDrawer;

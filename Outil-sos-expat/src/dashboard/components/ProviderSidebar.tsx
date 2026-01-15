/**
 * =============================================================================
 * PROVIDER SIDEBAR - Navigation pour l'espace prestataire
 * =============================================================================
 *
 * Design 2026: Light theme, collapsible, clean, minimal animations
 * - Fond clair au lieu de sombre
 * - Mode collapsé sur desktop
 * - Drawer mobile
 * - Indicateurs de quota et abonnement
 *
 * =============================================================================
 */

import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth, useProvider, useSubscription } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";
import { cn } from "@/lib/utils";
import {
  Home,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Sparkles,
  CreditCard,
  Check,
  MessagesSquare,
  X,
  Menu,
} from "lucide-react";
import { useState, memo, useEffect, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

// =============================================================================
// PROVIDER SELECTOR
// =============================================================================

interface ProviderSelectorProps {
  providers: any[];
  activeProvider: any;
  onSwitch: (providerId: string) => void;
  collapsed?: boolean;
}

const ProviderSelector = memo(function ProviderSelector({
  providers,
  activeProvider,
  onSwitch,
  collapsed = false,
}: ProviderSelectorProps) {
  const { t } = useLanguage({ mode: "provider" });
  const [isOpen, setIsOpen] = useState(false);

  // Single provider - just show name
  if (providers.length <= 1) {
    if (collapsed) {
      return (
        <div className="p-2 flex justify-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold">
            {(activeProvider?.name || "P")[0].toUpperCase()}
          </div>
        </div>
      );
    }
    return (
      <div className="px-4 py-3">
        <p className="font-medium text-gray-900 truncate">
          {activeProvider?.name || activeProvider?.fullName || t("provider:sidebar.select")}
        </p>
        <p className="text-xs text-gray-500 truncate">{activeProvider?.email}</p>
      </div>
    );
  }

  // Multiple providers - dropdown
  if (collapsed) {
    return (
      <div className="p-2 flex justify-center relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold hover:bg-red-200 transition-colors"
        >
          {(activeProvider?.name || "P")[0].toUpperCase()}
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-full top-0 ml-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    onSwitch(provider.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                    provider.id === activeProvider?.id && "bg-red-50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-semibold">
                    {(provider.name || "P")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {provider.name || provider.fullName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {provider.type === "lawyer" ? t("provider:sidebar.lawyer") : t("provider:sidebar.expert")}
                    </p>
                  </div>
                  {provider.id === activeProvider?.id && (
                    <Check className="w-4 h-4 text-red-600" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-semibold shrink-0">
            {(activeProvider?.name || "P")[0].toUpperCase()}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {activeProvider?.name || activeProvider?.fullName || t("provider:sidebar.select")}
            </p>
            <p className="text-xs text-gray-500">
              {t("provider:sidebar.providersCount", { count: providers.length })}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onSwitch(provider.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                  provider.id === activeProvider?.id && "bg-red-50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-semibold">
                  {(provider.name || "P")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {provider.name || provider.fullName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {provider.type === "lawyer" ? t("provider:sidebar.lawyer") : t("provider:sidebar.expert")}
                  </p>
                </div>
                {provider.id === activeProvider?.id && (
                  <Check className="w-4 h-4 text-red-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// =============================================================================
// NAV ITEM
// =============================================================================

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}

const NavItemComponent = memo(function NavItemComponent({ item, isActive, collapsed = false }: NavItemProps) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        to={item.to}
        title={item.label}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl mx-auto transition-all duration-150",
          isActive
            ? "bg-red-100 text-red-600"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        )}
      >
        <Icon className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150",
        isActive
          ? "bg-red-50 text-red-600 font-medium"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0", isActive && "text-red-600")} />
      <span className="text-sm">{item.label}</span>
    </Link>
  );
});

// =============================================================================
// NAV ITEMS CONFIG
// =============================================================================

const getNavItems = (t: (key: string) => string): NavItem[] => [
  {
    to: "/dashboard",
    label: t("provider:sidebar.home"),
    icon: Home,
    exact: true,
  },
  {
    to: "/dashboard/historique",
    label: t("provider:sidebar.history"),
    icon: MessagesSquare,
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ProviderSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ProviderSidebar({ isOpen = false, onClose }: ProviderSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage({ mode: "provider" });
  const { linkedProviders, activeProvider, switchProvider } = useProvider();
  const { status: subscriptionStatus } = useSubscription();

  // Collapsed state (desktop only)
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isOpen && onClose) {
      onClose();
    }
  }, [location.pathname]);

  const navItems = getNavItems(t);

  // AI Quota
  const providerData = activeProvider as Record<string, unknown> | null;
  const aiQuotaUsed = (providerData?.aiCallsUsed as number) || 0;
  const aiQuotaTotal = (providerData?.aiCallsLimit as number) || (providerData?.aiQuota as number) || 100;
  const aiQuotaPercent = aiQuotaTotal > 0 ? (aiQuotaUsed / aiQuotaTotal) * 100 : 0;

  const isItemActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.to;
    if (location.pathname.includes("/conversation/")) return false;
    return location.pathname.startsWith(item.to);
  };

  const getQuotaColor = () => {
    if (aiQuotaPercent >= 90) return "bg-red-500";
    if (aiQuotaPercent >= 70) return "bg-amber-500";
    return "bg-violet-500";
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base
          "flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-200",
          // Width
          collapsed ? "w-20" : "w-72",
          // Mobile positioning
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto",
          // Mobile show/hide
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-16 border-b border-gray-100",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {collapsed ? (
            <Link to="/dashboard" className="p-2">
              <Building2 className="w-8 h-8 text-red-600" />
            </Link>
          ) : (
            <>
              <Link to="/dashboard" className="flex items-center gap-2" onClick={onClose}>
                <Building2 className="w-8 h-8 text-red-600" />
                <div>
                  <span className="font-bold text-gray-900">SOS-Expat</span>
                  <span className="text-xs text-gray-500 block -mt-0.5">
                    {t("provider:sidebar.proSpace")}
                  </span>
                </div>
              </Link>
              {/* Close button - Mobile only */}
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle - Desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden lg:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center",
            "bg-white border border-gray-200 rounded-full shadow-sm",
            "text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors z-10"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Provider Selector */}
        {linkedProviders.length > 0 && (
          <div className={cn("border-b border-gray-100", collapsed ? "py-2" : "p-3")}>
            <ProviderSelector
              providers={linkedProviders}
              activeProvider={activeProvider}
              onSwitch={switchProvider}
              collapsed={collapsed}
            />
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
          <div className={cn("space-y-1", collapsed && "space-y-2")}>
            {navItems.map((item) => (
              <NavItemComponent
                key={item.to}
                item={item}
                isActive={isItemActive(item)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className={cn("border-t border-gray-100", collapsed ? "p-2" : "p-3 space-y-3")}>
          {/* AI Quota */}
          {collapsed ? (
            <div className="flex justify-center py-2" title={`Quota IA: ${aiQuotaUsed}/${aiQuotaTotal}`}>
              <div className="relative">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <div
                  className={cn(
                    "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
                    aiQuotaPercent >= 90 ? "bg-red-500" : aiQuotaPercent >= 70 ? "bg-amber-500" : "bg-violet-500"
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span>{t("provider:sidebar.aiQuota")}</span>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {aiQuotaUsed}/{aiQuotaTotal}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={cn("h-1.5 rounded-full transition-all", getQuotaColor())}
                  style={{ width: `${Math.min(aiQuotaPercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Subscription Status */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{t("provider:sidebar.subscription")}</span>
              <span
                className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
                  subscriptionStatus === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {subscriptionStatus === "active" ? t("provider:sidebar.active") : t("provider:sidebar.inactive")}
              </span>
            </div>
          )}

          {/* User Info */}
          {!collapsed && user && (
            <div className="px-3 py-2">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.displayName || user.email?.split("@")[0]}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut(auth)}
            title={collapsed ? t("provider:sidebar.signOut") : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors",
              collapsed
                ? "w-12 h-12 justify-center mx-auto"
                : "w-full px-3 py-3"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm">{t("provider:sidebar.signOut")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

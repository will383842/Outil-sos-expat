/**
 * =============================================================================
 * ADMIN SIDEBAR - Navigation principale de la console d'administration
 * =============================================================================
 *
 * Sidebar avec fond foncé pour la console d'administration.
 * Navigation claire et organisée par sections.
 */

import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BarChart3,
  Settings,
  Shield,
  Globe,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  UserCog,
  Building2,
} from "lucide-react";
import { useState, memo } from "react";
import LanguageSelector from "./LanguageSelector";

// =============================================================================
// TYPES
// =============================================================================

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// =============================================================================
// CONFIGURATION NAVIGATION
// =============================================================================

const getNavSections = (t: (key: string) => string): NavSection[] => [
  {
    title: t("admin:sidebar.sections.overview"),
    items: [
      {
        to: "/admin",
        label: t("admin:sidebar.nav.dashboard"),
        icon: LayoutDashboard,
        exact: true,
      },
      {
        to: "/admin/analytics",
        label: t("admin:sidebar.nav.analytics"),
        icon: BarChart3,
      },
    ],
  },
  {
    title: t("admin:sidebar.sections.management"),
    items: [
      {
        to: "/admin/prestataires",
        label: t("admin:sidebar.nav.providers"),
        icon: Users,
      },
      {
        to: "/admin/dossiers",
        label: t("admin:sidebar.nav.dossiers"),
        icon: FolderKanban,
      },
      {
        to: "/admin/utilisateurs",
        label: t("admin:sidebar.nav.team"),
        icon: UserCog,
      },
    ],
  },
  {
    title: t("admin:sidebar.sections.configuration"),
    items: [
      {
        to: "/admin/pays",
        label: t("admin:sidebar.nav.countries"),
        icon: Globe,
      },
      {
        to: "/admin/ia",
        label: t("admin:sidebar.nav.aiSettings"),
        icon: Sparkles,
      },
      {
        to: "/admin/parametres",
        label: t("admin:sidebar.nav.settings"),
        icon: Settings,
      },
    ],
  },
  {
    title: t("admin:sidebar.sections.security"),
    items: [
      {
        to: "/admin/audit",
        label: t("admin:sidebar.nav.auditLogs"),
        icon: Shield,
      },
    ],
  },
];

// =============================================================================
// COMPOSANT NAV ITEM
// =============================================================================

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

const NavItemComponent = memo(function NavItemComponent({
  item,
  isActive,
  collapsed,
}: NavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-white/10",
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-slate-300 hover:text-white",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-red-400")} />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
});

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

interface AdminSidebarProps {
  className?: string;
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage({ mode: "admin" });
  const [collapsed, setCollapsed] = useState(false);

  const navSections = getNavSections(t);

  // Vérifier si un item est actif
  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to) && item.to !== "/admin";
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64",
        className
      )}
    >
      {/* Header avec logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-slate-700/50",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-red-500" />
            <div>
              <span className="font-bold text-lg">SOS-Expat</span>
              <span className="text-xs text-slate-400 block -mt-1">Admin</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/admin">
            <Building2 className="w-8 h-8 text-red-500" />
          </Link>
        )}

        {/* Bouton collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors",
            collapsed && "absolute -right-3 top-5 bg-slate-900 border border-slate-700 shadow-lg"
          )}
          title={collapsed ? t("admin:sidebar.expand") : t("admin:sidebar.collapse")}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItemComponent
                  key={item.to}
                  item={item}
                  isActive={isItemActive(item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - Language selector, User info & logout */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {/* Language selector */}
        <LanguageSelector collapsed={collapsed} />

        {/* User info */}
        {!collapsed && user && (
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-white truncate">
              {user.displayName || user.email?.split("@")[0]}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {user.email}
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={() => signOut(auth)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
            "text-slate-300 hover:text-white hover:bg-red-500/20 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? t("common:navigation.signOut") : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && (
            <span>{t("common:navigation.signOut")}</span>
          )}
        </button>
      </div>
    </aside>
  );
}

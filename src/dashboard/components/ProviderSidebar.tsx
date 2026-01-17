/**
 * =============================================================================
 * PROVIDER SIDEBAR - Navigation pour l'espace prestataire
 * =============================================================================
 *
 * Sidebar avec fond foncé pour l'espace prestataire.
 * Navigation simple et épurée centrée sur les conversations.
 *
 * Fonctionnalités :
 * - Navigation vers Accueil, Conversation en cours, Conversations passées, Profil
 * - Sélecteur de prestataire (pour les comptes multi)
 * - Indicateur de quota IA
 * - Indicateur d'abonnement
 *
 * =============================================================================
 */

import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth, useProvider, useSubscription } from "../../contexts/UnifiedUserContext";
import { cn } from "@/lib/utils";
import {
  Home,
  User,
  LogOut,
  ChevronDown,
  Building2,
  Sparkles,
  CreditCard,
  Check,
  MessagesSquare,
  Globe,
} from "lucide-react";
import { useState, memo } from "react";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useLanguage } from "../../hooks/useLanguage";

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
// COMPOSANT SÉLECTEUR DE PRESTATAIRE
// =============================================================================

interface ProviderSelectorProps {
  providers: any[];
  activeProvider: any;
  onSwitch: (providerId: string) => void;
}

const ProviderSelector = memo(function ProviderSelector({
  providers,
  activeProvider,
  onSwitch,
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (providers.length <= 1) {
    return (
      <div className="px-3 py-2 text-sm text-slate-300">
        <p className="font-medium truncate">{activeProvider?.name || activeProvider?.fullName || "Prestataire"}</p>
        <p className="text-xs text-slate-500 truncate">{activeProvider?.email}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
      >
        <div className="text-left min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {activeProvider?.name || activeProvider?.fullName || "Sélectionner"}
          </p>
          <p className="text-xs text-slate-400 truncate">{providers.length} prestataires</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-50 overflow-hidden">
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => {
                onSwitch(provider.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors",
                provider.id === activeProvider?.id && "bg-slate-700/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {provider.name || provider.fullName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {provider.type === "lawyer" ? "Avocat" : "Expert"}
                </p>
              </div>
              {provider.id === activeProvider?.id && (
                <Check className="w-4 h-4 text-green-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// COMPOSANT NAV ITEM
// =============================================================================

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
}

const NavItemComponent = memo(function NavItemComponent({ item, isActive }: NavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-white/10",
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-slate-300 hover:text-white"
      )}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-red-400")} />
      <span>{item.label}</span>
    </Link>
  );
});

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

// Navigation items statiques (pas de requête Firestore)
const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Accueil",
    icon: Home,
    exact: true,
  },
  {
    to: "/dashboard/historique",
    label: "Historique",
    icon: MessagesSquare,
  },
  {
    to: "/dashboard/profil",
    label: "Mon Profil",
    icon: User,
  },
];

export default function ProviderSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { linkedProviders, activeProvider, switchProvider } = useProvider();
  const { status: subscriptionStatus } = useSubscription();

  // Quota IA (à récupérer du provider - cast pour accéder aux champs dynamiques)
  const providerData = activeProvider as Record<string, unknown> | null;
  const aiQuotaUsed = (providerData?.aiCallsUsed as number) || 0;
  const aiQuotaTotal = (providerData?.aiQuota as number) || 100;
  const aiQuotaPercent = aiQuotaTotal > 0 ? (aiQuotaUsed / aiQuotaTotal) * 100 : 0;

  // Vérifier si un item est actif
  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    // Vérifier si on est sur une page conversation
    if (location.pathname.includes("/conversation/")) {
      return false; // Les pages de conversation ne matchent pas les items de nav
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside className="flex flex-col h-screen w-64 bg-slate-900 text-white">
      {/* Header avec logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-red-500" />
          <div>
            <span className="font-bold text-lg">SOS-Expat</span>
            <span className="text-xs text-slate-400 block -mt-1">Espace Pro</span>
          </div>
        </Link>
      </div>

      {/* Sélecteur de prestataire (si multi) */}
      {linkedProviders.length > 0 && (
        <div className="px-3 py-4 border-b border-slate-700/50">
          <ProviderSelector
            providers={linkedProviders}
            activeProvider={activeProvider}
            onSwitch={switchProvider}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.to}
            item={item}
            isActive={isItemActive(item)}
          />
        ))}
      </nav>

      {/* Indicateurs bas de sidebar */}
      <div className="border-t border-slate-700/50 p-3 space-y-3">
        {/* Quota IA */}
        <div className="px-3 py-2 bg-slate-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Quota IA</span>
            </div>
            <span className="text-xs text-slate-400">{aiQuotaUsed}/{aiQuotaTotal}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                aiQuotaPercent > 90 ? "bg-red-500" : aiQuotaPercent > 70 ? "bg-amber-500" : "bg-purple-500"
              )}
              style={{ width: `${Math.min(aiQuotaPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Statut abonnement */}
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300">Abonnement</span>
          <span className={cn(
            "ml-auto text-xs px-2 py-0.5 rounded-full",
            subscriptionStatus === "active" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
          )}>
            {subscriptionStatus === "active" ? "Actif" : "Inactif"}
          </span>
        </div>

        {/* User info */}
        {user && (
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-white truncate">
              {user.displayName || user.email?.split("@")[0]}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {user.email}
            </div>
          </div>
        )}

        {/* Sélecteur de langue */}
        <div className="px-3 py-2">
          <LanguageSelector mode="provider" variant="compact" className="w-full" />
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

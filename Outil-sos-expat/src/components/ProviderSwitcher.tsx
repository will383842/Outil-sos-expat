/**
 * =============================================================================
 * PROVIDER SWITCHER — Sélecteur de prestataire dans la navbar
 * Permet de changer rapidement de prestataire sans se déconnecter
 * Refactorisé pour utiliser les composants shadcn/ui DropdownMenu
 * =============================================================================
 */

import { useProvider } from "../contexts/UnifiedUserContext";
import {
  ChevronDown,
  Scale,
  Globe,
  Check,
  Users,
  Building2,
  Phone,
  PhoneOff,
  Activity,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Skeleton,
} from "./ui";
import { useLanguage } from "../hooks/useLanguage";

export default function ProviderSwitcher() {
  const { linkedProviders, activeProvider, switchProvider, loading } = useProvider();
  const { t } = useLanguage({ mode: "provider" });

  // Si en chargement
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-24 h-4 rounded" />
      </div>
    );
  }

  // Si pas de prestataires liés
  if (linkedProviders.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
        <Users className="w-4 h-4" />
        <span>{t("provider:providerSwitcher.noProvider")}</span>
      </div>
    );
  }

  // 🆕 Check if any sibling is busy
  const hasBusySibling = linkedProviders.some(p => p.availability === "busy" && p.id !== activeProvider?.id);

  // Si un seul prestataire, afficher juste son nom sans dropdown
  if (linkedProviders.length === 1) {
    const provider = linkedProviders[0];
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        provider.availability === "busy" ? "bg-red-50" : "bg-gray-100"
      }`}>
        {provider.type === "lawyer" ? (
          <Scale className="w-4 h-4 text-purple-600" />
        ) : (
          <Globe className="w-4 h-4 text-blue-600" />
        )}
        <span className="text-sm font-medium text-gray-700">{provider.name}</span>
        {provider.country && (
          <span className="text-xs text-gray-500">({provider.country})</span>
        )}
        {/* 🆕 Status badge */}
        {provider.availability === "busy" && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
            <Phone className="w-3 h-3" />
            {provider.busyBySibling ? "Sibling busy" : "Busy"}
          </span>
        )}
      </div>
    );
  }

  // Plusieurs prestataires -> dropdown avec shadcn/ui
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${
            activeProvider?.availability === "busy" ? "border-red-300 bg-red-50" :
            hasBusySibling ? "border-amber-300 bg-amber-50" : ""
          }`}
        >
        {activeProvider ? (
          <>
            {/* Provider type icon with status dot */}
            <div className="relative">
              {activeProvider.type === "lawyer" ? (
                <Scale className="w-4 h-4 text-purple-600" />
              ) : (
                <Globe className="w-4 h-4 text-blue-600" />
              )}
              {/* 🆕 Status indicator dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                activeProvider.availability === "busy" ? "bg-red-500" :
                activeProvider.isOnline ? "bg-green-500" : "bg-gray-400"
              }`} />
            </div>
            <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
              {activeProvider.name}
            </span>
            {/* 🆕 Busy badge on trigger */}
            {activeProvider.availability === "busy" && (
              <Phone className="w-3 h-3 text-red-500" />
            )}
            {/* 🆕 Sibling busy indicator */}
            {hasBusySibling && activeProvider.availability !== "busy" && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Un collègue est occupé" />
            )}
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t("provider:providerSwitcher.select")}</span>
          </>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {t("provider:providerSwitcher.switchProvider")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {linkedProviders.map((provider) => {
          const isActive = activeProvider?.id === provider.id;
          const isBusy = provider.availability === "busy";

          return (
            <DropdownMenuItem
              key={provider.id}
              onClick={() => switchProvider(provider.id)}
              className={`flex items-center gap-3 py-3 cursor-pointer ${
                isActive ? "bg-red-50" :
                isBusy ? "bg-red-50/50" : ""
              }`}
            >
              {/* Icône type with status indicator */}
              <div className="relative">
                <div className={`p-2 rounded-lg ${
                  provider.type === "lawyer"
                    ? "bg-purple-100"
                    : "bg-blue-100"
                }`}>
                  {provider.type === "lawyer" ? (
                    <Scale className="w-4 h-4 text-purple-600" />
                  ) : (
                    <Globe className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                {/* 🆕 Status indicator dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  isBusy ? "bg-red-500" :
                  provider.isOnline ? "bg-green-500" : "bg-gray-400"
                }`} />
              </div>

              {/* Infos */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                  {/* 🆕 Busy badge */}
                  {isBusy && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${
                      provider.busyBySibling
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      <Phone className="w-3 h-3" />
                      {provider.busyBySibling ? "Sibling" : "Busy"}
                    </span>
                  )}
                  {!isBusy && provider.isOnline && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                      <Activity className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {provider.type === "lawyer" ? t("provider:providerSwitcher.lawyer") : t("provider:providerSwitcher.expatExpert")}
                  {provider.country && ` • ${provider.country}`}
                </p>
              </div>

              {/* Check si actif */}
              {isActive && (
                <Check className="w-4 h-4 text-red-600" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            href="/admin/mes-prestataires"
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            {t("provider:providerSwitcher.manageProviders")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

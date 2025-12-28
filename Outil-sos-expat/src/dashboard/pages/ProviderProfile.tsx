/**
 * =============================================================================
 * PROVIDER PROFILE - Affichage du profil prestataire (lecture seule)
 * =============================================================================
 *
 * Affiche les informations du prestataire synchronisées depuis sos-expat.com.
 * Les modifications se font uniquement sur la plateforme principale.
 *
 * =============================================================================
 */

import { useProvider } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";

// UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  User,
  Mail,
  Phone,
  MapPin,
  Languages,
  Briefcase,
  Scale,
  Globe,
  ExternalLink,
  Info,
} from "lucide-react";

// =============================================================================
// COMPOSANTS
// =============================================================================

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ElementType;
  label: string;
  value: string | undefined | null;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function TagList({
  items,
  emptyText = "Non renseigné"
}: {
  items: string[] | undefined;
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return <span className="text-gray-400 italic">{emptyText}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span
          key={index}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function ProviderProfile() {
  const { activeProvider, loading } = useProvider();
  const { t } = useLanguage({ mode: "provider" });

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!activeProvider) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{t("provider:profilePage.notFound")}</p>
      </div>
    );
  }

  const isLawyer = activeProvider.type === "lawyer";

  // Cast pour accéder aux champs dynamiques
  const provider = activeProvider as unknown as Record<string, unknown>;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("provider:profilePage.title")}</h1>
        <p className="text-gray-500 mt-1">
          {t("provider:profilePage.subtitle")}
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-800">
            {t("provider:profilePage.syncInfo")}
          </p>
          <a
            href="https://sos-expat.com/dashboard/profil"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {t("provider:profilePage.editOnSosExpat")}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Type de prestataire */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isLawyer ? "bg-blue-100" : "bg-green-100"}`}>
              {isLawyer ? (
                <Scale className="w-6 h-6 text-blue-600" />
              ) : (
                <Globe className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle>{isLawyer ? t("provider:profilePage.lawyerTitle") : t("provider:profilePage.expertTitle")}</CardTitle>
              <CardDescription>
                {isLawyer
                  ? t("provider:profilePage.lawyerDesc")
                  : t("provider:profilePage.expertDesc")
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("provider:profilePage.personalInfo")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow
            icon={User}
            label={t("provider:profilePage.name")}
            value={activeProvider.name || (provider.fullName as string)}
          />
          <InfoRow
            icon={Mail}
            label={t("provider:profilePage.email")}
            value={activeProvider.email}
          />
          <InfoRow
            icon={Phone}
            label={t("provider:profilePage.phone")}
            value={activeProvider.phone}
          />
          <InfoRow
            icon={MapPin}
            label={t("provider:profilePage.country")}
            value={activeProvider.country}
          />
        </CardContent>
      </Card>

      {/* Compétences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t("provider:profilePage.skills")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Langues */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{t("provider:profilePage.languages")}</span>
            </div>
            <TagList items={provider.languages as string[] | undefined} emptyText={t("provider:profilePage.notSet")} />
          </div>

          {/* Spécialités */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {isLawyer ? t("provider:profilePage.specialtiesLawyer") : t("provider:profilePage.specialtiesExpert")}
              </span>
            </div>
            <TagList items={activeProvider.specialties} emptyText={t("provider:profilePage.notSet")} />
          </div>
        </CardContent>
      </Card>

      {/* Statut */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${activeProvider.active ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-sm text-gray-600">
                {activeProvider.active ? t("provider:profilePage.activeAccount") : t("provider:profilePage.inactiveAccount")}
              </span>
            </div>
            {activeProvider.active && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {t("provider:profilePage.readyForClients")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

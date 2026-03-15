import React, { useState, useEffect, useMemo } from "react";
import {
  Newspaper,
  Download,
  Mail,
  Clock,
  Globe,
  Languages,
  Shield,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Filter,
  File,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  getPublicPressResources,
  type PublicPressResource,
} from "../services/marketingResourcesApi";

// ==================== TYPES ====================

// PressResource mapped from Laravel API
interface PressResource {
  id: string;
  type: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_format: string | null;
  file_size: number | null;
  category: string;
  sort_order: number;
}

interface PressRelease {
  id: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  content: Record<string, string>;
  slug: Record<string, string>;
  publishedAt: Date;
  isActive: boolean;
  imageUrl?: string;
  pdfUrl?: Record<string, string>;
  tags: string[];
}

type ResourceCategory = "all" | "press_logos" | "press_kit" | "press_photos" | "press_data";

// ==================== HELPERS ====================

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLocalizedText(
  field: Record<string, string> | undefined,
  lang: string
): string {
  if (!field) return "";
  return field[lang] || field["en"] || field["fr"] || "";
}

function getResourceIcon(type: string) {
  switch (type) {
    case "logo":
    case "image":
    case "banner":
    case "screenshot":
      return Image;
    case "document":
      return FileText;
    default:
      return File;
  }
}

function isImageFormat(format: string | null): boolean {
  if (!format) return false;
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(format.toLowerCase());
}

// ==================== COMPONENT ====================

const Press: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const lang = (language as string) || "fr";

  // State
  const [resources, setResources] = useState<PressResource[]>([]);
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory>("all");
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // i18n
  const t = useMemo(
    () => ({
      seoTitle: intl.formatMessage({ id: "press.seo.title" }),
      seoDescription: intl.formatMessage({ id: "press.seo.description" }),
      heroTitle: intl.formatMessage({ id: "press.hero.title" }),
      heroSubtitle: intl.formatMessage({ id: "press.hero.subtitle" }),
      heroBadge: intl.formatMessage({ id: "press.hero.badge" }),
      aboutTitle: intl.formatMessage({ id: "press.about.title" }),
      aboutDescription: intl.formatMessage({ id: "press.about.description" }),
      aboutMission: intl.formatMessage({ id: "press.about.mission" }),
      statsCountries: intl.formatMessage({ id: "press.stats.countries" }),
      statsCountriesLabel: intl.formatMessage({ id: "press.stats.countriesLabel" }),
      statsLanguages: intl.formatMessage({ id: "press.stats.languages" }),
      statsLanguagesLabel: intl.formatMessage({ id: "press.stats.languagesLabel" }),
      statsAvailability: intl.formatMessage({ id: "press.stats.availability" }),
      statsAvailabilityLabel: intl.formatMessage({ id: "press.stats.availabilityLabel" }),
      mediaKitTitle: intl.formatMessage({ id: "press.mediaKit.title" }),
      mediaKitSubtitle: intl.formatMessage({ id: "press.mediaKit.subtitle" }),
      mediaKitDownload: intl.formatMessage({ id: "press.mediaKit.download" }),
      mediaKitEmpty: intl.formatMessage({ id: "press.mediaKit.empty" }),
      typeLogo: intl.formatMessage({ id: "press.mediaKit.type.logo" }),
      typeImage: intl.formatMessage({ id: "press.mediaKit.type.image" }),
      typeBanner: intl.formatMessage({ id: "press.mediaKit.type.banner" }),
      typeScreenshot: intl.formatMessage({ id: "press.mediaKit.type.screenshot" }),
      typeDocument: intl.formatMessage({ id: "press.mediaKit.type.document" }),
      typeOther: intl.formatMessage({ id: "press.mediaKit.type.other" }),
      releasesTitle: intl.formatMessage({ id: "press.releases.title" }),
      releasesSubtitle: intl.formatMessage({ id: "press.releases.subtitle" }),
      releasesReadMore: intl.formatMessage({ id: "press.releases.readMore" }),
      releasesCollapse: intl.formatMessage({ id: "press.releases.collapse" }),
      releasesDownloadPdf: intl.formatMessage({ id: "press.releases.downloadPdf" }),
      releasesEmpty: intl.formatMessage({ id: "press.releases.empty" }),
      releasesNoTranslation: intl.formatMessage({ id: "press.releases.noTranslation" }),
      contactTitle: intl.formatMessage({ id: "press.contact.title" }),
      contactDescription: intl.formatMessage({ id: "press.contact.description" }),
      contactEmail: intl.formatMessage({ id: "press.contact.email" }),
      contactEmailLabel: intl.formatMessage({ id: "press.contact.emailLabel" }),
      contactResponse: intl.formatMessage({ id: "press.contact.response" }),
    }),
    [intl]
  );

  const typeLabels: Record<string, string> = useMemo(
    () => ({
      logo: t.typeLogo,
      image: t.typeImage,
      banner: t.typeBanner,
      screenshot: t.typeScreenshot,
      document: t.typeDocument,
      other: t.typeOther,
    }),
    [t]
  );

  // Category labels moved to inline i18n in filter buttons

  // Load press resources from Laravel API
  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoadingResources(true);
        const result = await getPublicPressResources(lang);
        const mapped: PressResource[] = (result.resources || []).map((r: PublicPressResource) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          description: r.description,
          file_url: r.file_url,
          file_format: r.file_format,
          file_size: r.file_size,
          category: r.category,
          sort_order: r.sort_order,
        }));
        setResources(mapped);
      } catch (error) {
        console.error("Error loading press resources:", error);
      } finally {
        setLoadingResources(false);
      }
    };
    loadResources();
  }, [lang]);

  // Load press releases from Firestore
  useEffect(() => {
    const loadReleases = async () => {
      try {
        setLoadingReleases(true);
        const q = query(
          collection(db, "press_releases"),
          where("isActive", "==", true),
          orderBy("publishedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            publishedAt: d.publishedAt?.toDate() || new Date(),
          };
        }) as PressRelease[];
        setReleases(data);
      } catch (error) {
        console.error("Error loading press releases:", error);
      } finally {
        setLoadingReleases(false);
      }
    };
    loadReleases();
  }, []);

  // Filtered resources
  const filteredResources = useMemo(() => {
    if (categoryFilter === "all") return resources;
    return resources.filter((r) => r.category === categoryFilter);
  }, [resources, categoryFilter]);

  // Locale map for Intl.DateTimeFormat (BCP 47 compliant)
  const localeMap: Record<string, string> = {
    fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE",
    pt: "pt-PT", ru: "ru-RU", ch: "zh-CN", hi: "hi-IN", ar: "ar-SA",
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(localeMap[lang] || "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatDateISO = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <Layout>
      <SEOHead
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl={`/${lang}/presse`}
        ogType="website"
        locale={(localeMap[lang] || "fr-FR").replace("-", "_")}
        contentType="WebPage"
      />
      <BreadcrumbSchema
        items={[
          { name: intl.formatMessage({ id: "breadcrumb.home" }), url: `/${lang}` },
          { name: t.heroTitle },
        ]}
      />

      <div className="min-h-screen bg-white">
        {/* ==================== HERO ==================== */}
        <section className="relative bg-gradient-to-br from-red-600 to-red-700 text-white overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Newspaper className="w-4 h-4" />
              <span className="text-sm font-medium">{t.heroBadge}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
              {t.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>
          </div>
        </section>

        {/* ==================== ABOUT ==================== */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                {t.aboutTitle}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {t.aboutDescription}
              </p>
              <p className="text-lg text-red-600 font-medium italic">
                {t.aboutMission}
              </p>
            </div>
          </div>
        </section>

        {/* ==================== KEY STATS ==================== */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Globe,
                  value: t.statsCountries,
                  label: t.statsCountriesLabel,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
                {
                  icon: Languages,
                  value: t.statsLanguages,
                  label: t.statsLanguagesLabel,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
                {
                  icon: Shield,
                  value: t.statsAvailability,
                  label: t.statsAvailabilityLabel,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 ${stat.bg} rounded-xl mb-4`}
                  >
                    <stat.icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== MEDIA KIT ==================== */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {t.mediaKitTitle}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t.mediaKitSubtitle}
              </p>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Filter className="w-5 h-5 text-gray-400" />
              {(
                [
                  { key: "all", label: intl.formatMessage({ id: "filter.all" }) },
                  { key: "press_logos", label: intl.formatMessage({ id: "press.mediaKit.category.logos", defaultMessage: "Logos" }) },
                  { key: "press_kit", label: intl.formatMessage({ id: "press.mediaKit.category.kit", defaultMessage: "Dossier de Presse" }) },
                  { key: "press_photos", label: intl.formatMessage({ id: "press.mediaKit.category.photos", defaultMessage: "Photos" }) },
                  { key: "press_data", label: intl.formatMessage({ id: "press.mediaKit.category.data", defaultMessage: "Chiffres" }) },
                ] as { key: ResourceCategory; label: string }[]
              ).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  aria-pressed={categoryFilter === cat.key}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categoryFilter === cat.key
                      ? "bg-red-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Resources grid */}
            {loadingResources ? (
              <div className="flex justify-center py-12">
                <div role="status" className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" aria-label="Loading" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{t.mediaKitEmpty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map((resource) => {
                  const IconComp = getResourceIcon(resource.type);
                  return (
                    <div
                      key={resource.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                    >
                      {/* Thumbnail / icon */}
                      <div className="relative h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                        {resource.file_url && isImageFormat(resource.file_format) ? (
                          <img
                            src={resource.file_url}
                            alt={resource.name}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <IconComp className="w-16 h-16 text-gray-300" />
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md">
                            {typeLabels[resource.type] || resource.type}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-5">
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                          {resource.name}
                        </h3>
                        {resource.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-400 space-x-2">
                            {resource.file_format && (
                              <span>{resource.file_format.toUpperCase()}</span>
                            )}
                            <span>{formatFileSize(resource.file_size)}</span>
                          </div>
                          {resource.file_url && (
                            <a
                              href={resource.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              {t.mediaKitDownload}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ==================== PRESS RELEASES ==================== */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {t.releasesTitle}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t.releasesSubtitle}
              </p>
            </div>

            {loadingReleases ? (
              <div className="flex justify-center py-12">
                <div role="status" className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" aria-label="Loading" />
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{t.releasesEmpty}</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {releases.map((release) => {
                  const title = getLocalizedText(release.title, lang);
                  const summary = getLocalizedText(release.summary, lang);
                  const content = getLocalizedText(release.content, lang);
                  const pdfUrl = release.pdfUrl?.[lang] || release.pdfUrl?.["en"] || release.pdfUrl?.["fr"];
                  const isExpanded = expandedRelease === release.id;
                  const hasTranslation = !!(release.title?.[lang] || release.title?.["en"] || release.title?.["fr"]);

                  return (
                    <article
                      key={release.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div className="p-6 sm:p-8">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                          {release.imageUrl && (
                            <img
                              src={release.imageUrl}
                              alt={title}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 hidden sm:block"
                              loading="lazy"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <time dateTime={formatDateISO(release.publishedAt)} className="text-sm text-gray-400">
                                {intl.formatMessage(
                                  { id: "press.releases.publishedOn" },
                                  { date: formatDate(release.publishedAt) }
                                )}
                              </time>
                              {release.tags?.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {release.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {title || t.releasesNoTranslation}
                            </h3>
                            {summary && (
                              <p className="text-gray-600 leading-relaxed">
                                {summary}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && content && (
                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <div className="prose prose-gray max-w-none text-gray-600 whitespace-pre-line">
                              {content}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-50">
                          {content && hasTranslation && (
                            <button
                              onClick={() =>
                                setExpandedRelease(
                                  isExpanded ? null : release.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  {t.releasesCollapse}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  {t.releasesReadMore}
                                </>
                              )}
                            </button>
                          )}
                          {pdfUrl && (
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              {t.releasesDownloadPdf}
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ==================== PRESS CONTACT ==================== */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
                <Mail className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {t.contactTitle}
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {t.contactDescription}
              </p>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <Mail className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-500">{t.contactEmailLabel}</span>
                </div>
                <a
                  href={`mailto:${t.contactEmail}`}
                  className="inline-flex items-center gap-2 text-xl font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                  {t.contactEmail}
                  <Mail className="w-4 h-4" />
                </a>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{t.contactResponse}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Press;

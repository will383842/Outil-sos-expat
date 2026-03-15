/**
 * Press Landing Page — Public press room for journalists & media
 *
 * FREE ACCESS — No gate form. Best practice 2026: journalists want instant access.
 * Contact form available via CTA popup → saves to contact_messages (category: "press")
 * Downloads tracked in Firestore press_downloads collection.
 *
 * SEO: OrganizationSchema + BreadcrumbSchema + FAQPageSchema + AI meta tags
 * Resources: Laravel API (press_logos, press_kit, press_photos, press_data)
 * Press releases: Firebase Firestore (press_releases collection)
 */

import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Newspaper, Download, Mail, Clock, Globe, Languages, Shield,
  ChevronDown, ChevronUp, FileText, Image, FolderOpen, Camera,
  BarChart3, ExternalLink, Users, Calendar, X, Send, MessageSquare,
  Loader2, CheckCircle, Palette, ArrowRight, Phone, MapPin, Zap,
  Award, Quote,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import OrganizationSchema from "../components/seo/OrganizationSchema";
import FAQPageSchema from "../components/seo/FAQPageSchema";
import HreflangLinks from "@/multilingual-system/components/HrefLang/HreflangLinks";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { useLocation } from "react-router-dom";
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  getPublicPressResources, type PublicPressResource,
} from "../services/marketingResourcesApi";

// ══════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ══════════════════════════════════════════════════════════════

interface PressResource {
  id: string; type: string; name: string; description: string | null;
  file_url: string | null; file_format: string | null; file_size: number | null; category: string;
}

interface PressRelease {
  id: string; title: Record<string, string>; summary: Record<string, string>;
  content: Record<string, string>; slug: Record<string, string>;
  publishedAt: Date; isActive: boolean; imageUrl?: string;
  pdfUrl?: Record<string, string>; tags: string[];
}

// Section nav IDs (labels come from i18n)
const SECTION_IDS = ["about", "identity", "press-kit", "releases", "images", "data", "contact"];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getLocalizedText(field: Record<string, string> | undefined, lang: string): string {
  if (!field) return "";
  return field[lang] || field["en"] || field["fr"] || "";
}

function isImageFormat(format: string | null): boolean {
  if (!format) return false;
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(format.toLowerCase());
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function ResourceCard({ resource, onDownload }: { resource: PressResource; onDownload?: (r: PressResource) => void }) {
  const isImg = resource.file_url && isImageFormat(resource.file_format);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group">
      <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {isImg ? (
          <img src={resource.file_url!} alt={resource.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <FileText className="w-12 h-12 text-gray-300" />
        )}
        {resource.file_format && (
          <span className="absolute top-3 right-3 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded uppercase backdrop-blur-sm">{resource.file_format}</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{resource.name}</h3>
        {resource.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{resource.description}</p>}
        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(resource)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" />
            {resource.file_format?.toUpperCase()} {formatFileSize(resource.file_size) && `— ${formatFileSize(resource.file_size)}`}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, id }: { icon: React.ElementType; title: string; subtitle: string; id: string }) {
  return (
    <div id={id} className="scroll-mt-20 mb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-red-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-500 ml-[52px]">{subtitle}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const Press: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const location = useLocation();
  const lang = (language as string) || "fr";

  // Resource language (visitor can switch independently of page lang)
  const [resourceLang, setResourceLang] = useState(lang);

  // Data
  const [resources, setResources] = useState<PressResource[]>([]);
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // Contact modal
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", media: "", subject: "", message: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // i18n helper
  const t = (id: string, defaultMessage?: string) => intl.formatMessage({ id, defaultMessage: defaultMessage || id });

  // SEO
  const seoTitle = t("press.seo.title");
  const seoDescription = t("press.seo.description");

  const localeMap: Record<string, string> = { fr: "fr_FR", en: "en_US", es: "es_ES", de: "de_DE", pt: "pt_PT", ru: "ru_RU", ch: "zh_CN", hi: "hi_IN", ar: "ar_SA" };
  const formatDate = (date: Date) => new Intl.DateTimeFormat(localeMap[lang] || "fr-FR", { year: "numeric", month: "long", day: "numeric" }).format(date);

  // FAQ for schema
  const faqs = useMemo(() => [
    { question: t("press.faq.q1"), answer: t("press.faq.a1") },
    { question: t("press.faq.q2"), answer: t("press.faq.a2") },
    { question: t("press.faq.q3"), answer: t("press.faq.a3") },
    { question: t("press.faq.q4"), answer: t("press.faq.a4") },
  ], [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Section nav labels
  const sectionLabels = useMemo(() => ({
    about: t("press.about.title"),
    identity: t("press.section.identity"),
    "press-kit": t("press.section.pressKit"),
    releases: t("press.releases.title"),
    images: t("press.section.images"),
    data: t("press.section.data"),
    contact: t("press.contact.title"),
  }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track download
  const trackDownload = async (resource: PressResource) => {
    try {
      await addDoc(collection(db, "press_downloads"), {
        resourceId: resource.id, resourceName: resource.name,
        resourceCategory: resource.category, fileFormat: resource.file_format,
        createdAt: serverTimestamp(),
      });
    } catch { /* silent */ }
  };

  // Contact submit
  const handleContactSubmit = async () => {
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactError(t("press.contact.form.error.required", "Please fill in all required fields"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      setContactError(t("press.contact.form.error.email", "Invalid email"));
      return;
    }
    setContactSending(true); setContactError(null);
    try {
      await addDoc(collection(db, "contact_messages"), {
        firstName: contactForm.name.split(" ")[0] || contactForm.name,
        lastName: contactForm.name.split(" ").slice(1).join(" ") || "",
        email: contactForm.email.trim().toLowerCase(),
        message: contactForm.message.trim(),
        subject: contactForm.subject.trim() || "Demande presse",
        category: "press", type: "contact_message", source: "press_contact_form",
        status: "new", isRead: false, responded: false, priority: "high",
        adminNotified: false, adminTags: ["press"], adminNotes: "",
        createdAt: serverTimestamp(),
        metadata: { mediaName: contactForm.media.trim() || null, language: lang, formVersion: "1.0", source: "press_landing_page" },
      });
      setContactSent(true);
    } catch {
      setContactError(t("press.contact.form.error.generic", "Error, please try again"));
    } finally { setContactSending(false); }
  };

  // Load resources (free access, uses resourceLang)
  useEffect(() => {
    setLoadingResources(true);
    (async () => {
      try {
        const result = await getPublicPressResources(resourceLang);
        setResources((result.resources || []).map((r: PublicPressResource) => ({
          id: r.id, type: r.type, name: r.name, description: r.description,
          file_url: r.file_url, file_format: r.file_format, file_size: r.file_size, category: r.category,
        })));
      } catch { /* silent */ }
      setLoadingResources(false);
    })();
  }, [resourceLang]);

  // Load releases
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "press_releases"), where("isActive", "==", true), orderBy("publishedAt", "desc"));
        const snapshot = await getDocs(q);
        setReleases(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), publishedAt: doc.data().publishedAt?.toDate() || new Date() } as PressRelease)));
      } catch { /* silent */ }
      setLoadingReleases(false);
    })();
  }, []);

  // Categorized
  const logos = resources.filter((r) => r.category === "press_logos");
  const kits = resources.filter((r) => r.category === "press_kit");
  const photos = resources.filter((r) => r.category === "press_photos");
  const dataRes = resources.filter((r) => r.category === "press_data");

  // ══════════════════ RENDER ══════════════════
  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`/${lang}/presse`}
        ogType="website"
        locale={localeMap[lang] || "fr_FR"}
        contentType="WebPage"
        aiSummary={t("press.boilerplate.short")}
        contentQuality="high"
        trustworthiness="high"
        keywords={t("press.seo.description")}
      />
      <BreadcrumbSchema items={[{ name: intl.formatMessage({ id: "breadcrumb.home" }), url: `/${lang}` }, { name: t("press.hero.badge") }]} />
      <OrganizationSchema aggregateRating={{ ratingValue: 4.9, ratingCount: 127, reviewCount: 127 }} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} pageUrl={`https://sos-expat.com/${lang}/presse`} />
      <HreflangLinks pathname={location.pathname} />

      {/* JSON-LD NewsMediaOrganization */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": seoTitle,
          "description": seoDescription,
          "url": `https://sos-expat.com/${lang}/presse`,
          "speakable": { "@type": "SpeakableSpecification", "cssSelector": ["#press-boilerplate", "#press-facts"] },
          "mainEntity": { "@type": "Organization", "name": "SOS-Expat", "url": "https://sos-expat.com", "foundingDate": "2025-08", "areaServed": "Worldwide" },
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-white">

        {/* ══════════════ HERO ══════════════ */}
        <section className="relative bg-white overflow-hidden border-b border-gray-100">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-50 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-50 rounded-full blur-[100px]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 bg-red-100 border border-red-200 rounded-full px-4 py-2 mb-8">
                <Newspaper className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700 uppercase tracking-wider">{t("press.hero.badge")}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight leading-[1.08]">
                {t("press.hero.subtitle")}
              </h1>
              <p id="press-boilerplate" className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-6 max-w-3xl">
                {t("press.boilerplate.short")}
              </p>
              {/* Double impact callout */}
              <div className="grid sm:grid-cols-2 gap-4 mb-10 max-w-2xl">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">{t("press.mission1.title")}</p>
                  <p className="text-sm font-semibold text-gray-900">{t("press.mission1.desc")}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">{t("press.mission2.title")}</p>
                  <p className="text-sm font-semibold text-gray-900">{t("press.mission2.desc")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <a href="#identity" className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/20">
                  <Download className="w-5 h-5" />
                  {t("press.label.downloadMediaKit")}
                </a>
                <button onClick={() => { setShowContact(true); setContactSent(false); setContactError(null); }}
                  className="px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t("press.contact.cta")}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ SECTION NAV ══════════════ */}
        <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-200" aria-label="Press sections">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar">
              {SECTION_IDS.map((id) => (
                <a key={id} href={`#${id}`} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg whitespace-nowrap transition-colors">
                  {(sectionLabels as Record<string, string>)[id] || id}
                </a>
              ))}
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={resourceLang}
                  onChange={(e) => setResourceLang(e.target.value)}
                  className="text-xs bg-gray-100 border-0 rounded-lg px-2 py-1.5 text-gray-700 focus:ring-2 focus:ring-red-500 cursor-pointer"
                  title={t("press.label.resourceLanguage")}
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="de">DE</option>
                  <option value="pt">PT</option>
                  <option value="ar">AR</option>
                  <option value="ru">RU</option>
                  <option value="zh">ZH</option>
                  <option value="hi">HI</option>
                </select>
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════ ABOUT + FACTS ══════════════ */}
        <section id="about" className="scroll-mt-16 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-12">
              {/* Boilerplate */}
              <div className="lg:col-span-3">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("press.about.title")}</h2>
                <p className="text-gray-600 leading-relaxed mb-8 text-lg">{t("press.about.description")}</p>
                <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-5">
                  <div className="flex items-start gap-3">
                    <Quote className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <p className="text-red-900 font-medium italic">
                      {t("press.about.mission")}
                    </p>
                  </div>
                </div>
              </div>
              {/* Company card */}
              <div id="press-facts" className="lg:col-span-2">
                <div className="bg-gray-950 text-white rounded-2xl p-6 space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{t("press.facts.title")}</h3>
                  {[
                    { icon: Calendar, label: t("press.label.founded"), value: t("press.facts.founded") },
                    { icon: MapPin, label: t("press.label.headquarters"), value: t("press.facts.hq") },
                    { icon: Globe, label: t("press.label.countries"), value: t("press.facts.countries") },
                    { icon: Languages, label: t("press.label.languages"), value: t("press.facts.languages") },
                    { icon: Zap, label: t("press.label.availability"), value: t("press.facts.availability") },
                    { icon: Users, label: t("press.label.providers"), value: t("press.facts.providers") },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2.5 text-gray-400">
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-white font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Key stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {[
                { value: t("press.facts.countries"), label: t("press.label.countries"), color: "from-red-500 to-red-600" },
                { value: t("press.facts.languages"), label: t("press.label.languages"), color: "from-blue-500 to-blue-600" },
                { value: t("press.facts.availability"), label: t("press.label.availability"), color: "from-green-500 to-green-600" },
                { value: "10K+", label: t("press.label.helped"), color: "from-purple-500 to-purple-600" },
              ].map((s) => (
                <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-6 text-center text-white`}>
                  <p className="text-3xl sm:text-4xl font-extrabold">{s.value}</p>
                  <p className="text-sm opacity-80 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ RESOURCES SECTIONS ══════════════ */}
        {loadingResources ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>
        ) : (
          <>
            {/* IDENTITY / LOGOS */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="identity" icon={Palette}
                  title={t("press.section.identity")}
                  subtitle={t("press.section.identityDesc")} />
                {logos.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{logos.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <Palette className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">{t("press.label.comingSoon")}</p>
                    <button onClick={() => setShowContact(true)} className="mt-4 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" />{t("press.label.requestLogos")}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* PRESS KIT */}
            <section className="py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="press-kit" icon={FolderOpen}
                  title={t("press.section.pressKit")}
                  subtitle={t("press.section.pressKitDesc")} />
                {kits.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{kits.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">{t("press.label.comingSoon")}</p>
                    <button onClick={() => setShowContact(true)} className="mt-4 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" />{t("press.label.requestPressKit")}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* PRESS RELEASES */}
            <section id="releases" className="scroll-mt-16 py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="releases-title" icon={Newspaper}
                  title={t("press.releases.title")}
                  subtitle={t("press.releases.subtitle")} />
                {loadingReleases ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>
                ) : releases.length === 0 ? (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">{t("press.releases.empty")}</p>
                  </div>
                ) : (
                  <div className="max-w-4xl space-y-5">
                    {releases.map((release) => {
                      const title = getLocalizedText(release.title, lang);
                      const summary = getLocalizedText(release.summary, lang);
                      const content = getLocalizedText(release.content, lang);
                      const pdfUrl = release.pdfUrl?.[lang] || release.pdfUrl?.["en"] || release.pdfUrl?.["fr"];
                      const isExpanded = expandedRelease === release.id;
                      return (
                        <article key={release.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                          <div className="p-6 sm:p-8">
                            <div className="flex items-start gap-4">
                              {release.imageUrl && <img src={release.imageUrl} alt={title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 hidden sm:block" loading="lazy" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar className="w-3.5 h-3.5" />{formatDate(release.publishedAt)}</span>
                                  {release.tags?.slice(0, 3).map((tag) => <span key={tag} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full font-medium">{tag}</span>)}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                                {summary && <p className="text-gray-600 text-sm leading-relaxed">{summary}</p>}
                              </div>
                            </div>
                            {isExpanded && content && <div className="mt-6 pt-6 border-t border-gray-100 prose prose-sm max-w-none text-gray-600 whitespace-pre-line">{content}</div>}
                            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
                              {content && (
                                <button onClick={() => setExpandedRelease(isExpanded ? null : release.id)} className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1">
                                  {isExpanded ? <><ChevronUp className="w-4 h-4" />{t("press.releases.collapse")}</> : <><ChevronDown className="w-4 h-4" />{t("press.releases.readMore")}</>}
                                </button>
                              )}
                              {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-500 hover:text-red-600 flex items-center gap-1"><Download className="w-4 h-4" />PDF</a>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* IMAGE BANK */}
            <section className="py-20">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="images" icon={Camera}
                  title={t("press.section.images")}
                  subtitle={t("press.section.imagesDesc")} />
                {photos.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{photos.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium mb-2">{t("press.label.comingSoon")}</p>
                    <button onClick={() => setShowContact(true)} className="mt-4 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" />{t("press.label.requestPhotos")}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* DATA & KEY FIGURES */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="data" icon={BarChart3}
                  title={t("press.section.data")}
                  subtitle={t("press.section.dataDesc")} />
                {dataRes.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{dataRes.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">{t("press.label.comingSoon")}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ══════════════ FAQ (SEO + content) ══════════════ */}
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">{t("press.faq.title")}</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="group bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-semibold text-gray-900 pr-4">{faq.question}</span>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ CONTACT CTA ══════════════ */}
        <section id="contact" className="scroll-mt-16 py-20 bg-gray-950 text-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("press.contact.title")}</h2>
            <p className="text-gray-400 text-lg mb-8">{t("press.contact.description")}</p>
            <button onClick={() => { setShowContact(true); setContactSent(false); }}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-600/20 text-lg mx-auto">
              <MessageSquare className="w-5 h-5" />{t("press.contact.cta")}
            </button>
            <p className="text-gray-500 text-sm mt-6 flex items-center justify-center gap-2"><Clock className="w-4 h-4" />{t("press.contact.response")}</p>
          </div>
        </section>
      </div>

      {/* ══════════════ CONTACT MODAL ══════════════ */}
      {showContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowContact(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gray-950 px-6 py-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-red-400" />{t("press.contact.cta")}</h3>
              <button onClick={() => setShowContact(false)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {contactSent ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{t("press.contact.sent")}</h4>
                <p className="text-gray-500 text-sm mb-6">{t("press.contact.sentDesc")}</p>
                <button onClick={() => setShowContact(false)} className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm">{t("press.label.close")}</button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {contactError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{contactError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("press.contact.form.name")} *</label>
                  <input type="text" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Media</label>
                    <input type="text" value={contactForm.media} onChange={(e) => setContactForm((p) => ({ ...p, media: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="Le Monde..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("press.contact.form.subject")}</label>
                  <input type="text" value={contactForm.subject} onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={t("press.contact.form.subjectPlaceholder")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[120px]" rows={4} />
                </div>
                <button onClick={handleContactSubmit} disabled={contactSending}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {contactSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />{t("press.contact.form.send")}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Press;

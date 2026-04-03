/**
 * Press Landing Page — Public press room for journalists & media
 *
 * FREE ACCESS — No gate form. Best practice 2026: journalists want instant access.
 * Contact form available via CTA popup → saves to contact_messages (category: "press")
 * Downloads tracked in Firestore press_downloads collection + Laravel PostgreSQL.
 *
 * SEO: OrganizationSchema + BreadcrumbSchema + FAQPageSchema + AI meta tags
 * Resources: Laravel API (press_logos, press_kit, press_photos, press_data)
 * Press releases: Firebase Firestore (press_releases collection)
 */

import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Newspaper, Download, Mail, Clock, Globe, Languages, Shield,
  ChevronDown, FileText, FolderOpen, Camera,
  BarChart3, Users, Calendar, X, Send, MessageSquare,
  Loader2, CheckCircle, Palette, MapPin, Zap,
  Quote, ArrowRight, Sparkles, ExternalLink,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import ImageBankSection from "../components/ImageBankSection";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import OrganizationSchema from "../components/seo/OrganizationSchema";
import FAQPageSchema from "../components/seo/FAQPageSchema";
import { useApp } from "../contexts/AppContext";
import { useAggregateRatingWithDefault } from "../hooks/useAggregateRating";
import { useIntl } from "react-intl";
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db, getCloudRunUrl } from "../config/firebase";
import {
  getPublicPressResources, trackPressDownload, type PublicPressResource,
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
  pdfUrl?: Record<string, string>; htmlUrl?: Record<string, string>; tags: string[];
}

const SECTION_IDS = ["about", "identity", "press-kit", "releases", "images", "data", "contact"];

const LANG_OPTIONS = [
  { code: "fr", label: "Fran\u00e7ais", flag: "\ud83c\uddeb\ud83c\uddf7" },
  { code: "en", label: "English", flag: "\ud83c\uddec\ud83c\udde7" },
  { code: "es", label: "Espa\u00f1ol", flag: "\ud83c\uddea\ud83c\uddf8" },
  { code: "de", label: "Deutsch", flag: "\ud83c\udde9\ud83c\uddea" },
  { code: "pt", label: "Portugu\u00eas", flag: "\ud83c\uddf5\ud83c\uddf9" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "\ud83c\uddf8\ud83c\udde6" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "\ud83c\uddf7\ud83c\uddfa" },
  { code: "zh", label: "\u4e2d\u6587", flag: "\ud83c\udde8\ud83c\uddf3" },
  { code: "hi", label: "\u0939\u093f\u0928\u094d\u0926\u0940", flag: "\ud83c\uddee\ud83c\uddf3" },
];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Maps app language codes to Firestore storage codes (ZH is stored as "ch")
const LANG_TO_FIRESTORE: Record<string, string> = { zh: "ch" };
function toFirestoreLang(lang: string): string {
  return LANG_TO_FIRESTORE[lang] ?? lang;
}

function getLocalizedText(field: Record<string, string> | undefined, lang: string): string {
  if (!field) return "";
  const fsLang = toFirestoreLang(lang);
  return field[fsLang] || field[lang] || field["en"] || field["fr"] || "";
}

function isImageFormat(format: string | null): boolean {
  if (!format) return false;
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(format.toLowerCase());
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

// Compact logo tile — used exclusively for press_logos category
// Industry standard: small preview, name, format badge, single download icon
function LogoCard({ resource, onDownload }: { resource: PressResource; onDownload?: (r: PressResource) => void }) {
  const checkerStyle = {
    backgroundColor: "#f3f4f6",
    backgroundImage: "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
  };
  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative h-24 flex items-center justify-center overflow-hidden" style={checkerStyle}>
        {resource.file_url && isImageFormat(resource.file_format) ? (
          <img src={resource.file_url} alt={resource.name} className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-400" />
          </div>
        )}
        {resource.file_format && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded uppercase tracking-wide">
            {resource.file_format}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-700 truncate leading-tight">{resource.name}</p>
        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(resource)}
            title={`${resource.file_format?.toUpperCase()} — ${formatFileSize(resource.file_size)}`}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-red-600 text-gray-500 hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500">
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource, onDownload }: { resource: PressResource; onDownload?: (r: PressResource) => void }) {
  const isImg = resource.file_url && isImageFormat(resource.file_format);
  const isTransparentAsset = isImg && ["png", "svg"].includes((resource.file_format ?? "").toLowerCase());
  return (
    <div className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div
        className="relative h-44 flex items-center justify-center overflow-hidden"
        style={isTransparentAsset ? {
          backgroundColor: "#f3f4f6",
          backgroundImage: "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0"
        } : { backgroundColor: "#f9fafb" }}
      >
        {isImg ? (
          <img src={resource.file_url!} alt={resource.name} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {resource.file_format && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
            {resource.file_format}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-1">{resource.name}</h3>
        {resource.description && <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{resource.description}</p>}
        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(resource)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[44px] bg-gray-100 hover:bg-red-600 text-gray-700 hover:text-white text-xs font-semibold rounded-xl transition-all duration-300 border border-gray-200 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            <Download className="w-3.5 h-3.5" />
            {resource.file_format?.toUpperCase()} {formatFileSize(resource.file_size) && `\u2014 ${formatFileSize(resource.file_size)}`}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, id, dark = false }: { icon: React.ElementType; title: string; subtitle: string; id: string; dark?: boolean }) {
  return (
    <div id={id} className="scroll-mt-24 mb-12">
      <div className="flex items-center gap-4 mb-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${dark ? "bg-red-600/20" : "bg-red-100"}`}>
          <Icon className={`w-6 h-6 ${dark ? "text-red-400" : "text-red-600"}`} />
        </div>
        <h2 className={`text-2xl sm:text-3xl font-bold ${dark ? "text-white" : "text-gray-900"}`}>{title}</h2>
      </div>
      <p className={`ml-16 text-base ${dark ? "text-white/60" : "text-gray-500"}`}>{subtitle}</p>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

const Press: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const lang = (language as string) || "fr";
  const aggregateRating = useAggregateRatingWithDefault({ minRating: 4 });
  const [resourceLang, setResourceLang] = useState(lang);
  const [resources, setResources] = useState<PressResource[]>([]);
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", media: "", subject: "", message: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [logosExpanded, setLogosExpanded] = useState(false);

  const t = (id: string, defaultMessage?: string) => intl.formatMessage({ id, defaultMessage: defaultMessage || id });

  const seoTitle = t("press.seo.title");
  const seoDescription = t("press.seo.description");

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", pt: "pt-PT", ru: "ru-RU", zh: "zh-CN", hi: "hi-IN", ar: "ar-SA" };
  const formatDate = (date: Date) => new Intl.DateTimeFormat(localeMap[lang] || "fr-FR", { year: "numeric", month: "long", day: "numeric" }).format(date);

  const faqs = useMemo(() => [
    { question: t("press.faq.q1"), answer: t("press.faq.a1") },
    { question: t("press.faq.q2"), answer: t("press.faq.a2") },
    { question: t("press.faq.q3"), answer: t("press.faq.a3") },
    { question: t("press.faq.q4"), answer: t("press.faq.a4") },
  ], [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionLabels = useMemo(() => ({
    about: t("press.about.title"),
    identity: t("press.section.identity"),
    "press-kit": t("press.section.pressKit"),
    releases: t("press.releases.title"),
    images: t("press.section.images"),
    data: t("press.section.data"),
    contact: t("press.contact.title"),
  }), [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackDownload = async (resource: PressResource) => {
    try {
      await addDoc(collection(db, "press_downloads"), {
        resourceId: resource.id, resourceName: resource.name,
        resourceCategory: resource.category, fileFormat: resource.file_format,
        createdAt: serverTimestamp(),
      });
    } catch { /* silent */ }
    trackPressDownload(resource.id);
  };

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
      const url = getCloudRunUrl("createcontactmessage", "europe-west1");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.name.trim(),
          email: contactForm.email.trim().toLowerCase(),
          message: contactForm.message.trim(),
          subject: contactForm.subject.trim() || t("press.contact.form.defaultSubject", "Demande presse"),
          metadata: { mediaName: contactForm.media.trim() || null, language: lang, source: "press_landing_page" },
        }),
      });
      if (!res.ok) throw new Error("server_error");
      setContactSent(true);
    } catch {
      setContactError(t("press.contact.form.error.generic", "Error, please try again"));
    } finally { setContactSending(false); }
  };

  const openContact = () => { setShowContact(true); setContactSent(false); setContactError(null); };

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

  const logos = resources.filter((r) => r.category === "press_logos");
  const brandGuidelines = resources.filter((r) => r.category === "press_brand_guidelines");
  const kits = resources.filter((r) => r.category === "press_kit");
  const spokespersons = resources.filter((r) => r.category === "press_spokesperson");
  const bRoll = resources.filter((r) => r.category === "press_b_roll");
  const dataRes = resources.filter((r) => r.category === "press_data");
  const factSheets = resources.filter((r) => r.category === "press_fact_sheets");

  const currentLang = LANG_OPTIONS.find((l) => l.code === resourceLang) || LANG_OPTIONS[0];

  // ══════════════════ RENDER ══════════════════
  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`/${lang}/presse`}
        ogType="website"
        locale={localeMap[lang] || "fr-FR"}
        contentType="WebPage"
        aiSummary={t("press.boilerplate.short")}
        contentQuality="high"
        trustworthiness="high"
        keywords={t("press.seo.keywords", "press room, press release, expatriates, press kit, logos, media")}
      />
      <BreadcrumbSchema items={[{ name: intl.formatMessage({ id: "breadcrumb.home" }), url: `/${lang}` }, { name: t("press.hero.badge") }]} />
      <OrganizationSchema aggregateRating={{ ratingValue: aggregateRating.ratingValue, ratingCount: aggregateRating.ratingCount, reviewCount: aggregateRating.reviewCount }} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} pageUrl={`https://sos-expat.com/${lang}/presse`} />
      {/* HreflangLinks removed: handled globally in App.tsx L1086 */}

      <Helmet>
        {/* WebPage schema with speakable for AEO/voice search */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": seoTitle,
          "description": seoDescription,
          "url": `https://sos-expat.com/${lang}/presse`,
          "inLanguage": localeMap[lang] || "fr-FR",
          "isPartOf": { "@type": "WebSite", "url": "https://sos-expat.com" },
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["#press-boilerplate", "#press-facts", "#releases-title"],
          },
          "mainEntity": {
            "@type": "NewsMediaOrganization",
            "name": "SOS-Expat",
            "url": "https://sos-expat.com",
            "foundingDate": "2025-08",
            "areaServed": "Worldwide",
            "publishingPrinciples": `https://sos-expat.com/${lang}/presse`,
            "pressContact": {
              "@type": "ContactPoint",
              "contactType": "press",
              "email": "williamsjullin@sos-expat.com",
              "availableLanguage": ["French","English","Spanish","German","Portuguese","Russian","Chinese","Arabic","Hindi"],
            },
          },
        })}</script>
        {/* ItemList schema for press releases — AEO/snippet 0 eligible */}
        {releases.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": t("press.releases.title"),
            "description": t("press.releases.subtitle"),
            "url": `https://sos-expat.com/${lang}/presse#releases`,
            "numberOfItems": releases.length,
            "itemListElement": releases.map((r, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "item": {
                "@type": "NewsArticle",
                "@id": `https://sos-expat.com/${lang}/presse#release-${r.id}`,
                "headline": getLocalizedText(r.title, lang),
                "description": getLocalizedText(r.summary, lang),
                "datePublished": r.publishedAt.toISOString(),
                "dateModified": r.publishedAt.toISOString(),
                "inLanguage": localeMap[lang] || "fr-FR",
                "publisher": {
                  "@type": "Organization",
                  "name": "SOS-Expat",
                  "url": "https://sos-expat.com",
                  "logo": { "@type": "ImageObject", "url": "https://sos-expat.com/sos-logo.webp" },
                },
                "author": { "@type": "Person", "name": "Williams Jullin", "jobTitle": "Founder & CEO" },
                "keywords": r.tags?.join(", "),
                ...(r.htmlUrl?.[toFirestoreLang(lang)] ? { "url": r.htmlUrl[toFirestoreLang(lang)] } : {}),
              },
            })),
          })}</script>
        )}
      </Helmet>

      <div className="press-page min-h-screen">

        {/* ══════════════ HERO ══════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-red-700 to-red-800">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-24 lg:pb-32">
            <div className="max-w-4xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-full px-5 py-2.5 mb-8 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white uppercase tracking-widest">{t("press.hero.badge")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.05]">
                {t("press.hero.subtitle")}
              </h1>

              <p id="press-boilerplate" className="text-lg sm:text-xl text-white/80 leading-relaxed mb-10 max-w-3xl">
                {t("press.boilerplate.short")}
              </p>

              {/* Mission cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl">
                <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <p className="text-xs font-bold text-red-200 uppercase tracking-widest mb-2">{t("press.mission1.title")}</p>
                  <p className="text-sm font-medium text-white/90">{t("press.mission1.desc")}</p>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <p className="text-xs font-bold text-orange-200 uppercase tracking-widest mb-2">{t("press.mission2.title")}</p>
                  <p className="text-sm font-medium text-white/90">{t("press.mission2.desc")}</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <a href="#identity"
                  className="group px-7 py-4 bg-white text-red-700 hover:bg-red-50 font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-700">
                  <Download className="w-5 h-5" />
                  {t("press.label.downloadMediaKit")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button onClick={openContact}
                  className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl transition-all flex items-center gap-3 border border-white/20 hover:border-white/30 backdrop-blur-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-700">
                  <MessageSquare className="w-5 h-5" />
                  {t("press.contact.cta")}
                </button>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="hidden lg:flex justify-center mt-16">
              <a href="#about" className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors">
                <ChevronDown className="w-6 h-6 animate-bounce" />
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════ STICKY NAV ══════════════ */}
        <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm" aria-label="Press sections">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
              {SECTION_IDS.map((id) => (
                <a key={id} href={`#${id}`}
                  className="inline-flex items-center min-h-[44px] px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                  {(sectionLabels as Record<string, string>)[id] || id}
                </a>
              ))}

              {/* Language selector */}
              <div className="ml-auto flex-shrink-0 relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-xs font-medium transition-all"
                  title={t("press.label.resourceLanguage")}
                >
                  <Globe className="w-3.5 h-3.5 text-red-500" />
                  <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showLangDropdown ? "rotate-180" : ""}`} />
                </button>
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[180px] overflow-hidden">
                      <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("press.label.resourceLanguage")}</p>
                      {LANG_OPTIONS.map((opt) => (
                        <button key={opt.code} onClick={() => { setResourceLang(opt.code); setShowLangDropdown(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${resourceLang === opt.code ? "bg-red-50 text-red-600" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}>
                          <span className="text-base">{opt.flag}</span>
                          <span className="font-medium">{opt.label}</span>
                          {resourceLang === opt.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-red-500" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════ KEY STATS ══════════════ */}
        <section className="py-8 border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: t("press.facts.countries"), label: t("press.label.countries"), bg: "bg-red-50", text: "text-red-600" },
                { value: t("press.facts.languages"), label: t("press.label.languages"), bg: "bg-blue-50", text: "text-blue-600" },
                { value: t("press.facts.availability"), label: t("press.label.availability"), bg: "bg-emerald-50", text: "text-emerald-600" },
                { value: t("press.facts.clientsHelped"), label: t("press.label.helped"), bg: "bg-purple-50", text: "text-purple-600" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl p-5 text-center ${s.bg}`}>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ ABOUT + FACTS ══════════════ */}
        <section id="about" className="scroll-mt-16 py-20 sm:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              <div className="lg:col-span-3">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">{t("press.about.title")}</h2>
                <p className="text-gray-600 leading-relaxed mb-10 text-lg">{t("press.about.description")}</p>
                <div className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-6">
                  <div className="flex items-start gap-4">
                    <Quote className="w-7 h-7 text-red-500 flex-shrink-0 mt-1" />
                    <p className="text-gray-700 font-medium italic text-lg leading-relaxed">
                      {t("press.about.mission")}
                    </p>
                  </div>
                </div>
              </div>
              <div id="press-facts" className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-6">{t("press.facts.title")}</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Calendar, label: t("press.label.founded"), value: t("press.facts.founded") },
                      { icon: MapPin, label: t("press.label.headquarters"), value: t("press.facts.hq") },
                      { icon: Globe, label: t("press.label.countries"), value: t("press.facts.countries") },
                      { icon: Languages, label: t("press.label.languages"), value: t("press.facts.languages") },
                      { icon: Zap, label: t("press.label.availability"), value: t("press.facts.availability") },
                      { icon: Users, label: t("press.label.providers"), value: t("press.facts.providers") },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 text-gray-500">
                          <item.icon className="w-4 h-4 text-red-400" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="text-gray-900 font-bold text-sm">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ RESOURCES SECTIONS ══════════════ */}
        {loadingResources ? (
          <div className="flex justify-center py-24 bg-white">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
              <p className="text-gray-400 text-sm font-medium">{t("press.label.resourceLanguage")}...</p>
            </div>
          </div>
        ) : (
          <>
            {/* IDENTITY / LOGOS */}
            {logos.length > 0 && (
              <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="identity" icon={Palette} title={t("press.section.identity")} subtitle={t("press.section.identityDesc")} />

                  {/* Collapsed summary — click to expand */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setLogosExpanded((v) => !v)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                      aria-expanded={logosExpanded}
                    >
                      {/* Thumbnail strip — first 5 logos */}
                      <div className="flex -space-x-2 flex-shrink-0">
                        {logos.slice(0, 5).map((r) => (
                          <div key={r.id} className="w-10 h-10 rounded-lg border-2 border-white bg-gray-100 overflow-hidden flex items-center justify-center shadow-sm"
                            style={{
                              backgroundImage: "linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)",
                              backgroundSize: "8px 8px",
                              backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                            }}>
                            {r.file_url && isImageFormat(r.file_format) && (
                              <img src={r.file_url} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                            )}
                          </div>
                        ))}
                        {logos.length > 5 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold text-gray-500">+{logos.length - 5}</span>
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {logos.length} {lang === "fr" ? "logos disponibles" : lang === "en" ? "logos available" : lang === "es" ? "logos disponibles" : lang === "de" ? "Logos verfügbar" : lang === "pt" ? "logos disponíveis" : "logos available"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG · SVG · Transparent · Fond blanc · Plat · Horizontal</p>
                      </div>

                      {/* Download all + chevron */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                          <Download className="w-3.5 h-3.5" />
                          {logosExpanded
                            ? (lang === "fr" ? "Réduire" : "Collapse")
                            : (lang === "fr" ? "Voir tous les logos" : lang === "en" ? "View all logos" : lang === "de" ? "Alle Logos anzeigen" : lang === "es" ? "Ver todos los logos" : "View all logos")}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${logosExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded grid */}
                    {logosExpanded && (
                      <div className="border-t border-gray-100 p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {logos.map((r) => <LogoCard key={r.id} resource={r} onDownload={trackDownload} />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* BRAND GUIDELINES */}
            {brandGuidelines.length > 0 && (
              <section className="py-20 sm:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="brand-guidelines" icon={Shield} title={t("press.section.brandGuidelines")} subtitle={t("press.section.brandGuidelinesDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{brandGuidelines.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* PRESS KIT */}
            {kits.length > 0 && (
              <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="press-kit" icon={FolderOpen} title={t("press.section.pressKit")} subtitle={t("press.section.pressKitDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{kits.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* PRESS RELEASES */}
            {(loadingReleases || releases.length > 0) && (
            <section id="releases" className="scroll-mt-16 py-20 sm:py-24 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4 mb-12 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-100">
                        <Newspaper className="w-6 h-6 text-red-600" />
                      </div>
                      <h2 id="releases-title" className="scroll-mt-24 text-2xl sm:text-3xl font-bold text-gray-900">{t("press.releases.title")}</h2>
                    </div>
                    <p className="ml-16 text-base text-gray-500">{t("press.releases.subtitle")}</p>
                  </div>
                  {/* Per-section language switcher — quick pill buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {LANG_OPTIONS.map((opt) => (
                      <button key={opt.code} onClick={() => setResourceLang(opt.code)}
                        title={opt.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all border focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${resourceLang === opt.code ? "bg-red-600 border-red-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"}`}>
                        <span>{opt.flag}</span>
                        <span className="hidden sm:inline">{opt.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {loadingReleases ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                    {releases.map((release) => {
                      const relLang = resourceLang;
                      const fsLang = toFirestoreLang(relLang);
                      const title = getLocalizedText(release.title, relLang);
                      const pdfUrl = release.pdfUrl?.[fsLang] || release.pdfUrl?.[relLang] || release.pdfUrl?.["en"] || release.pdfUrl?.["fr"];
                      const htmlViewUrl = release.htmlUrl?.[fsLang] || release.htmlUrl?.[relLang] || release.htmlUrl?.["en"] || release.htmlUrl?.["fr"];
                      return (
                        <article key={release.id} className="group flex flex-col rounded-2xl overflow-hidden border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-300 bg-white">
                          {/* Document thumbnail — miniature iframe scaled down */}
                          <a href={htmlViewUrl || "#"} target="_blank" rel="noopener noreferrer"
                            className="relative overflow-hidden bg-white flex-shrink-0 cursor-pointer"
                            style={{ height: "300px" }}
                            aria-label={title}>
                            {htmlViewUrl ? (
                              <div style={{ position: "absolute", top: 0, left: "50%", marginLeft: "-480px", width: "960px", height: "1280px", transform: "scale(0.31)", transformOrigin: "top center", pointerEvents: "none" }}>
                              <iframe
                                src={htmlViewUrl}
                                title={title}
                                scrolling="no"
                                tabIndex={-1}
                                style={{ width: "960px", height: "1280px", border: "none", display: "block" }}
                              />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                <FileText className="w-14 h-14 text-gray-200" />
                              </div>
                            )}
                            {/* Overlay — always visible on mobile (no hover on touch), hover-only on sm+ */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-5">
                              <span className="text-white text-xs font-bold bg-red-600 px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg">
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t("press.releases.viewFull", "Voir le communiqué")}
                              </span>
                            </div>
                          </a>
                          {/* Card footer */}
                          <div className="p-4 flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <Calendar className="w-3 h-3" />{formatDate(release.publishedAt)}
                              </span>
                              {release.tags?.slice(0, 2).map((tag) => (
                                <span key={tag} className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] rounded-full font-semibold">{tag}</span>
                              ))}
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 flex-1">{title}</h3>
                            <div className="flex items-center gap-2 pt-1">
                              {htmlViewUrl && (
                                <a href={htmlViewUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex-1 text-center text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 min-h-[44px] rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97]">
                                  <FileText className="w-3.5 h-3.5" />HTML
                                </a>
                              )}
                              {pdfUrl && (
                                <a href={pdfUrl} download target="_blank" rel="noopener noreferrer"
                                  className="flex-1 text-center text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 min-h-[44px] rounded-lg transition-colors flex items-center justify-center gap-1.5 active:scale-[0.97]">
                                  <Download className="w-3.5 h-3.5" />PDF
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
            )}

            {/* SPOKESPERSON & BIOS */}
            {spokespersons.length > 0 && (
              <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="spokesperson" icon={Users} title={t("press.section.spokesperson")} subtitle={t("press.section.spokespersonDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{spokespersons.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* IMAGE BANK — carousel with thumbnails */}
            <section className="scroll-mt-16 py-20 sm:py-24 bg-slate-50" id="images">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="images-title" icon={Camera} title={t("press.section.images")} subtitle={t("press.section.imagesDesc")} />
                <div className="mt-8">
                  <ImageBankSection accent="red" />
                </div>
              </div>
            </section>

            {/* B-ROLL & VIDEOS */}
            {bRoll.length > 0 && (
              <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="b-roll" icon={Camera} title={t("press.section.bRoll")} subtitle={t("press.section.bRollDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{bRoll.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* DATA & KEY FIGURES */}
            {dataRes.length > 0 && (
              <section className={`py-20 sm:py-24 ${bRoll.length > 0 ? "bg-slate-50" : "bg-white"}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="data" icon={BarChart3} title={t("press.section.data")} subtitle={t("press.section.dataDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{dataRes.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* FACT SHEETS */}
            {factSheets.length > 0 && (
              <section className="py-20 sm:py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="fact-sheets" icon={FileText} title={t("press.section.factSheets")} subtitle={t("press.section.factSheetsDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{factSheets.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════════ FAQ ══════════════ */}
        <section className="py-20 sm:py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t("press.faq.title")}</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors shadow-sm">
                  <summary className="flex items-center justify-between p-5 sm:p-6 cursor-pointer transition-colors">
                    <span className="text-sm font-semibold text-gray-900 pr-4">{faq.question}</span>
                    <div className="w-8 h-8 rounded-xl bg-gray-100 group-open:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors">
                      <ChevronDown className="w-4 h-4 text-gray-400 group-open:text-red-500 group-open:rotate-180 transition-all" />
                    </div>
                  </summary>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-600 leading-relaxed -mt-1">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ CONTACT CTA ══════════════ */}
        <section id="contact" className="scroll-mt-16 bg-gradient-to-br from-red-700 to-red-800 py-24 sm:py-32">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">{t("press.contact.title")}</h2>
            <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">{t("press.contact.description")}</p>
            <button onClick={openContact}
              className="group px-10 py-5 bg-white text-red-700 hover:bg-red-50 font-bold rounded-2xl transition-all flex items-center gap-3 shadow-xl text-lg mx-auto active:scale-[0.98]">
              <MessageSquare className="w-6 h-6" />
              {t("press.contact.cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-white/60 text-sm mt-8 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />{t("press.contact.response")}
            </p>
          </div>
        </section>
      </div>

      {/* ══════════════ CONTACT MODAL ══════════════ */}
      {showContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowContact(false)}>
          <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-white/80" />{t("press.contact.cta")}
              </h3>
              <button onClick={() => setShowContact(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            {contactSent ? (
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{t("press.contact.sent")}</h4>
                <p className="text-gray-500 text-sm mb-8">{t("press.contact.sentDesc")}</p>
                <button onClick={() => setShowContact(false)}
                  className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm border border-gray-200 transition-colors">
                  {t("press.label.close")}
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {contactError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{contactError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">{t("press.contact.form.name")} *</label>
                  <input type="text" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">{t("press.contact.form.email")} *</label>
                    <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">{t("press.contact.form.media")}</label>
                    <input type="text" value={contactForm.media} onChange={(e) => setContactForm((p) => ({ ...p, media: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" placeholder="Le Monde..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">{t("press.contact.form.subject")}</label>
                  <input type="text" value={contactForm.subject} onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder={t("press.contact.form.subjectPlaceholder")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">{t("press.contact.form.message")} *</label>
                  <textarea value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[120px] transition-colors" rows={4} />
                </div>
                <button onClick={handleContactSubmit} disabled={contactSending}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-red-600/20">
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

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
  ChevronDown, ChevronUp, FileText, FolderOpen, Camera,
  BarChart3, Users, Calendar, X, Send, MessageSquare,
  Loader2, CheckCircle, Palette, MapPin, Zap,
  Quote, ArrowRight, Sparkles,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import OrganizationSchema from "../components/seo/OrganizationSchema";
import FAQPageSchema from "../components/seo/FAQPageSchema";
import HreflangLinks from "@/multilingual-system/components/HrefLang/HreflangLinks";
import { useApp } from "../contexts/AppContext";
import { useAggregateRatingWithDefault } from "../hooks/useAggregateRating";
import { useIntl } from "react-intl";
import { useLocation } from "react-router-dom";
import {
  collection, query, where, orderBy, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
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

function ResourceCard({ resource, onDownload }: { resource: PressResource; onDownload?: (r: PressResource) => void }) {
  const isImg = resource.file_url && isImageFormat(resource.file_format);
  return (
    <div className="group relative bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/30 hover:bg-white/[0.06] transition-all duration-300">
      <div className="relative h-44 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center overflow-hidden">
        {isImg ? (
          <img src={resource.file_url!} alt={resource.name} className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <FileText className="w-8 h-8 text-white/20" />
          </div>
        )}
        {resource.file_format && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
            {resource.file_format}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-white text-sm mb-1.5 line-clamp-1">{resource.name}</h3>
        {resource.description && <p className="text-xs text-white/60 mb-4 line-clamp-2 leading-relaxed">{resource.description}</p>}
        {resource.file_url && (
          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" onClick={() => onDownload?.(resource)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all duration-300 border border-white/10 hover:border-red-600">
            <Download className="w-3.5 h-3.5" />
            {resource.file_format?.toUpperCase()} {formatFileSize(resource.file_size) && `\u2014 ${formatFileSize(resource.file_size)}`}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, id, dark = true }: { icon: React.ElementType; title: string; subtitle: string; id: string; dark?: boolean }) {
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

function EmptySection({ icon: Icon, label, btnLabel, onRequest, dark = true }: { icon: React.ElementType; label: string; btnLabel: string; onRequest: () => void; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 border-dashed p-16 text-center ${dark ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}>
      <Icon className={`w-14 h-14 mx-auto mb-4 ${dark ? "text-white/10" : "text-gray-300"}`} />
      <p className={`font-medium mb-4 ${dark ? "text-white/40" : "text-gray-500"}`}>{label}</p>
      <button onClick={onRequest}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 active:scale-[0.98]">
        <Mail className="w-4 h-4" />{btnLabel}
      </button>
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
  const aggregateRating = useAggregateRatingWithDefault({ minRating: 4 });

  const [resourceLang, setResourceLang] = useState(lang);
  const [resources, setResources] = useState<PressResource[]>([]);
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", media: "", subject: "", message: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

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
      await addDoc(collection(db, "contact_messages"), {
        name: contactForm.name.trim(),
        firstName: contactForm.name.split(" ")[0] || contactForm.name,
        lastName: contactForm.name.split(" ").slice(1).join(" ") || "",
        email: contactForm.email.trim().toLowerCase(),
        message: contactForm.message.trim(),
        subject: contactForm.subject.trim() || t("press.contact.form.defaultSubject", "Demande presse"),
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
  const photos = resources.filter((r) => r.category === "press_photos");
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

      {/* Custom styles */}
      <style>{`
        .press-page .no-scrollbar::-webkit-scrollbar { display: none; }
        .press-page .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes press-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes press-glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        .press-float { animation: press-float 6s ease-in-out infinite; }
        .press-glow { animation: press-glow 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .press-float, .press-glow { animation: none; } }
      `}</style>

      <div className="press-page bg-gray-950 min-h-screen">

        {/* ══════════════ HERO ══════════════ */}
        <section className="relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-red-600/10 rounded-full blur-[150px] press-glow" />
            <div className="absolute bottom-[-30%] left-[-15%] w-[600px] h-[600px] bg-orange-500/8 rounded-full blur-[130px] press-glow" style={{ animationDelay: "2s" }} />
            <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[100px] press-float" />
          </div>
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-24 lg:pb-32">
            <div className="max-w-4xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-red-600/10 border border-red-500/20 rounded-full px-5 py-2.5 mb-8 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400 uppercase tracking-widest">{t("press.hero.badge")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-8 tracking-tight leading-[1.05]">
                {t("press.hero.subtitle")}
              </h1>

              <p id="press-boilerplate" className="text-lg sm:text-xl text-white/60 leading-relaxed mb-10 max-w-3xl">
                {t("press.boilerplate.short")}
              </p>

              {/* Mission cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-12 max-w-2xl">
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-red-500/30 transition-colors">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">{t("press.mission1.title")}</p>
                  <p className="text-sm font-medium text-white/80">{t("press.mission1.desc")}</p>
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-orange-500/30 transition-colors">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">{t("press.mission2.title")}</p>
                  <p className="text-sm font-medium text-white/80">{t("press.mission2.desc")}</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <a href="#identity"
                  className="group px-7 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-red-600/25 active:scale-[0.98]">
                  <Download className="w-5 h-5" />
                  {t("press.label.downloadMediaKit")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button onClick={openContact}
                  className="px-7 py-4 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-2xl transition-all flex items-center gap-3 border border-white/10 hover:border-white/20 backdrop-blur-sm active:scale-[0.98]">
                  <MessageSquare className="w-5 h-5" />
                  {t("press.contact.cta")}
                </button>
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="hidden lg:flex justify-center mt-16">
              <a href="#about" className="flex flex-col items-center gap-2 text-white/20 hover:text-white/40 transition-colors">
                <ChevronDown className="w-6 h-6 animate-bounce" />
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════ STICKY NAV ══════════════ */}
        <nav className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-xl border-b border-white/10" aria-label="Press sections">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar">
              {SECTION_IDS.map((id) => (
                <a key={id} href={`#${id}`}
                  className="px-4 py-2 text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 rounded-xl whitespace-nowrap transition-all">
                  {(sectionLabels as Record<string, string>)[id] || id}
                </a>
              ))}

              {/* Language selector */}
              <div className="ml-auto flex-shrink-0 relative">
                <button
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-white text-xs font-medium transition-all"
                  title={t("press.label.resourceLanguage")}
                >
                  <Globe className="w-3.5 h-3.5 text-red-400" />
                  <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                  <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${showLangDropdown ? "rotate-180" : ""}`} />
                </button>
                {showLangDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-1.5 min-w-[180px] overflow-hidden">
                      <p className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">{t("press.label.resourceLanguage")}</p>
                      {LANG_OPTIONS.map((opt) => (
                        <button key={opt.code} onClick={() => { setResourceLang(opt.code); setShowLangDropdown(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${resourceLang === opt.code ? "bg-red-600/20 text-red-400" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                          <span className="text-base">{opt.flag}</span>
                          <span className="font-medium">{opt.label}</span>
                          {resourceLang === opt.code && <CheckCircle className="w-3.5 h-3.5 ml-auto text-red-400" />}
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
        <section className="py-6 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: t("press.facts.countries"), label: t("press.label.countries"), gradient: "from-red-600 to-red-500" },
                { value: t("press.facts.languages"), label: t("press.label.languages"), gradient: "from-blue-600 to-blue-500" },
                { value: t("press.facts.availability"), label: t("press.label.availability"), gradient: "from-emerald-600 to-emerald-500" },
                { value: t("press.facts.clientsHelped"), label: t("press.label.helped"), gradient: "from-purple-600 to-purple-500" },
              ].map((s) => (
                <div key={s.label} className="relative overflow-hidden rounded-2xl p-5 text-center">
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-10`} />
                  <div className="relative">
                    <p className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</p>
                    <p className="text-xs text-white/40 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ ABOUT + FACTS ══════════════ */}
        <section id="about" className="scroll-mt-16 py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
              <div className="lg:col-span-3">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">{t("press.about.title")}</h2>
                <p className="text-white/60 leading-relaxed mb-10 text-lg">{t("press.about.description")}</p>
                <div className="bg-gradient-to-r from-red-600/10 to-orange-600/10 border-l-4 border-red-500 rounded-r-2xl p-6">
                  <div className="flex items-start gap-4">
                    <Quote className="w-7 h-7 text-red-400 flex-shrink-0 mt-1" />
                    <p className="text-white/80 font-medium italic text-lg leading-relaxed">
                      {t("press.about.mission")}
                    </p>
                  </div>
                </div>
              </div>
              <div id="press-facts" className="lg:col-span-2">
                <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-6">{t("press.facts.title")}</h3>
                  <div className="space-y-4">
                    {[
                      { icon: Calendar, label: t("press.label.founded"), value: t("press.facts.founded") },
                      { icon: MapPin, label: t("press.label.headquarters"), value: t("press.facts.hq") },
                      { icon: Globe, label: t("press.label.countries"), value: t("press.facts.countries") },
                      { icon: Languages, label: t("press.label.languages"), value: t("press.facts.languages") },
                      { icon: Zap, label: t("press.label.availability"), value: t("press.facts.availability") },
                      { icon: Users, label: t("press.label.providers"), value: t("press.facts.providers") },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3 text-white/40">
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="text-white font-bold text-sm">{item.value}</span>
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
          <div className="flex justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
              <p className="text-white/40 text-sm font-medium">{t("press.label.resourceLanguage")}...</p>
            </div>
          </div>
        ) : (
          <>
            {/* IDENTITY / LOGOS */}
            <section className="py-20 sm:py-24 border-t border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="identity" icon={Palette} title={t("press.section.identity")} subtitle={t("press.section.identityDesc")} />
                {logos.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">{logos.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <EmptySection icon={Palette} label={t("press.label.comingSoon")} btnLabel={t("press.label.requestLogos")} onRequest={openContact} />
                )}
              </div>
            </section>

            {/* BRAND GUIDELINES */}
            {brandGuidelines.length > 0 && (
              <section className="py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="brand-guidelines" icon={Shield} title={t("press.section.brandGuidelines")} subtitle={t("press.section.brandGuidelinesDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{brandGuidelines.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* PRESS KIT */}
            <section className="py-20 sm:py-24 border-t border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="press-kit" icon={FolderOpen} title={t("press.section.pressKit")} subtitle={t("press.section.pressKitDesc")} />
                {kits.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{kits.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <EmptySection icon={FolderOpen} label={t("press.label.comingSoon")} btnLabel={t("press.label.requestPressKit")} onRequest={openContact} />
                )}
              </div>
            </section>

            {/* PRESS RELEASES */}
            <section id="releases" className="scroll-mt-16 py-20 sm:py-24 border-t border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4 mb-12 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-600/20">
                        <Newspaper className="w-6 h-6 text-red-400" />
                      </div>
                      <h2 id="releases-title" className="scroll-mt-24 text-2xl sm:text-3xl font-bold text-white">{t("press.releases.title")}</h2>
                    </div>
                    <p className="ml-16 text-base text-white/60">{t("press.releases.subtitle")}</p>
                  </div>
                  {/* Per-section language switcher — quick pill buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {LANG_OPTIONS.map((opt) => (
                      <button key={opt.code} onClick={() => setResourceLang(opt.code)}
                        title={opt.label}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${resourceLang === opt.code ? "bg-red-600 border-red-500 text-white" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}>
                        <span>{opt.flag}</span>
                        <span className="hidden sm:inline">{opt.code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {loadingReleases ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /></div>
                ) : releases.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.04] p-16 text-center">
                    <Newspaper className="w-14 h-14 text-white/10 mx-auto mb-4" />
                    <p className="text-white/40 font-medium">{t("press.releases.empty")}</p>
                  </div>
                ) : (
                  <div className="max-w-4xl space-y-5">
                    {releases.map((release) => {
                      const relLang = resourceLang;
                      const fsLang = toFirestoreLang(relLang);
                      const title = getLocalizedText(release.title, relLang);
                      const summary = getLocalizedText(release.summary, relLang);
                      const content = getLocalizedText(release.content, relLang);
                      const pdfUrl = release.pdfUrl?.[fsLang] || release.pdfUrl?.[relLang] || release.pdfUrl?.["en"] || release.pdfUrl?.["fr"];
                      const htmlViewUrl = release.htmlUrl?.[fsLang] || release.htmlUrl?.[relLang] || release.htmlUrl?.["en"] || release.htmlUrl?.["fr"];
                      const isExpanded = expandedRelease === release.id;
                      return (
                        <article key={release.id} className="bg-white/[0.05] border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                          <div className="p-6 sm:p-8">
                            <div className="flex items-start gap-4">
                              {release.imageUrl && <img src={release.imageUrl} alt={title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 hidden sm:block border border-white/10" loading="lazy" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                  <span className="flex items-center gap-1.5 text-xs text-white/40"><Calendar className="w-3.5 h-3.5" />{formatDate(release.publishedAt)}</span>
                                  {release.tags?.slice(0, 3).map((tag) => <span key={tag} className="px-2.5 py-0.5 bg-red-600/15 text-red-400 text-[10px] rounded-full font-semibold">{tag}</span>)}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                                {summary && <p className="text-white/60 text-sm leading-relaxed">{summary}</p>}
                              </div>
                            </div>
                            {isExpanded && content && (
                              <div className="mt-6 pt-6 border-t border-white/10 prose prose-sm prose-invert max-w-none text-white/60 whitespace-pre-line">{content}</div>
                            )}
                            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5 flex-wrap">
                              {content && (
                                <button onClick={() => setExpandedRelease(isExpanded ? null : release.id)}
                                  className="text-sm font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors">
                                  {isExpanded ? <><ChevronUp className="w-4 h-4" />{t("press.releases.collapse")}</> : <><ChevronDown className="w-4 h-4" />{t("press.releases.readMore")}</>}
                                </button>
                              )}
                              {htmlViewUrl && (
                                <a href={htmlViewUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-sm font-semibold text-white/70 hover:text-white flex items-center gap-1.5 transition-colors border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg">
                                  <FileText className="w-3.5 h-3.5" />
                                  {t("press.releases.viewFull", "Communiqué complet")}
                                </a>
                              )}
                              {pdfUrl && (
                                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-sm font-medium text-white/40 hover:text-red-400 flex items-center gap-1.5 transition-colors">
                                  <Download className="w-4 h-4" />PDF
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

            {/* SPOKESPERSON & BIOS */}
            {spokespersons.length > 0 && (
              <section className="py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="spokesperson" icon={Users} title={t("press.section.spokesperson")} subtitle={t("press.section.spokespersonDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{spokespersons.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* IMAGE BANK — CC BY 4.0, embed codes, HD downloads */}
            <section className="py-20 sm:py-24 border-t border-white/5" id="images">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="images-title" icon={Camera} title={t("press.section.images")} subtitle={t("press.section.imagesDesc")} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl p-6 sm:p-10 border border-red-100 dark:border-red-900/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Camera className="w-7 h-7 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {lang === "fr" ? "Banque d'images SOS Expat — 210+ visuels HD" : "SOS Expat Image Bank — 210+ HD visuals"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {lang === "fr"
                        ? "Tous nos visuels sont disponibles gratuitement sous licence Creative Commons BY 4.0. Téléchargez, intégrez dans vos articles — il suffit d'inclure un lien vers sos-expat.com. Copiez le code embed, le lien est déjà inclus."
                        : "All our visuals are available free under Creative Commons BY 4.0 license. Download, embed in your articles — just include a link to sos-expat.com. Copy the embed code, the link is already included."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`/${lang === "fr" ? "fr-fr/galerie" : lang === "es" ? "es-es/galeria" : lang === "de" ? "de-de/bildergalerie" : lang === "pt" ? "pt-pt/galeria" : lang === "ru" ? "ru-ru/galereya" : lang === "zh" ? "zh-cn/tuku" : lang === "hi" ? "hi-in/chitravali" : lang === "ar" ? "ar-sa/maarad" : "en-us/gallery"}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        {lang === "fr" ? "Voir la galerie complète" : "View full gallery"}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-lg">
                        <Shield className="w-3.5 h-3.5" />
                        CC BY 4.0
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg">
                        <Languages className="w-3.5 h-3.5" />
                        9 {lang === "fr" ? "langues" : "languages"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </section>

            {/* B-ROLL & VIDEOS */}
            {bRoll.length > 0 && (
              <section className="py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="b-roll" icon={Camera} title={t("press.section.bRoll")} subtitle={t("press.section.bRollDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{bRoll.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}

            {/* DATA & KEY FIGURES */}
            <section className="py-20 sm:py-24 border-t border-white/5">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionTitle id="data" icon={BarChart3} title={t("press.section.data")} subtitle={t("press.section.dataDesc")} />
                {dataRes.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{dataRes.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                ) : (
                  <EmptySection icon={BarChart3} label={t("press.label.comingSoon")} btnLabel={t("press.label.comingSoon")} onRequest={openContact} />
                )}
              </div>
            </section>

            {/* FACT SHEETS */}
            {factSheets.length > 0 && (
              <section className="py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <SectionTitle id="fact-sheets" icon={FileText} title={t("press.section.factSheets")} subtitle={t("press.section.factSheetsDesc")} />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{factSheets.map((r) => <ResourceCard key={r.id} resource={r} onDownload={trackDownload} />)}</div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════════ FAQ ══════════════ */}
        <section className="py-20 sm:py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">{t("press.faq.title")}</h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="group bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
                  <summary className="flex items-center justify-between p-5 sm:p-6 cursor-pointer transition-colors">
                    <span className="text-sm font-semibold text-white/90 pr-4">{faq.question}</span>
                    <div className="w-8 h-8 rounded-xl bg-white/5 group-open:bg-red-600/20 flex items-center justify-center flex-shrink-0 transition-colors">
                      <ChevronDown className="w-4 h-4 text-white/40 group-open:text-red-400 group-open:rotate-180 transition-all" />
                    </div>
                  </summary>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-white/60 leading-relaxed -mt-1">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════ CONTACT CTA ══════════════ */}
        <section id="contact" className="scroll-mt-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-red-950/30 to-gray-950" />
          <div className="absolute inset-0">
            <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px]" />
          </div>
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-red-600/30">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">{t("press.contact.title")}</h2>
            <p className="text-white/60 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">{t("press.contact.description")}</p>
            <button onClick={openContact}
              className="group px-10 py-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-red-600/25 text-lg mx-auto active:scale-[0.98]">
              <MessageSquare className="w-6 h-6" />
              {t("press.contact.cta")}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-white/40 text-sm mt-8 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />{t("press.contact.response")}
            </p>
          </div>
        </section>
      </div>

      {/* ══════════════ CONTACT MODAL ══════════════ */}
      {showContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowContact(false)}>
          <div className="bg-gray-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
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
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">{t("press.contact.sent")}</h4>
                <p className="text-white/60 text-sm mb-8">{t("press.contact.sentDesc")}</p>
                <button onClick={() => setShowContact(false)}
                  className="px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-sm border border-white/10 transition-colors">
                  {t("press.label.close")}
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {contactError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">{contactError}</div>}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">{t("press.contact.form.name")} *</label>
                  <input type="text" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1.5">{t("press.contact.form.email")} *</label>
                    <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-1.5">{t("press.contact.form.media")}</label>
                    <input type="text" value={contactForm.media} onChange={(e) => setContactForm((p) => ({ ...p, media: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors" placeholder="Le Monde..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">{t("press.contact.form.subject")}</label>
                  <input type="text" value={contactForm.subject} onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder={t("press.contact.form.subjectPlaceholder")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1.5">{t("press.contact.form.message")} *</label>
                  <textarea value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[120px] transition-colors" rows={4} />
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

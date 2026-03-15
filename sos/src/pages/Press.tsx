/**
 * Press Landing Page — Public press room for journalists & media
 *
 * Gate: Journalists must fill a form (email, country, language, media theme/type)
 * before accessing resources. Data saved to Firestore press_contacts.
 *
 * Resources come from Laravel API (press_logos, press_kit, press_photos, press_data)
 * Press releases come from Firestore (press_releases collection)
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  File,
  Lock,
  Unlock,
  CheckCircle,
  Palette,
  FolderOpen,
  Camera,
  BarChart3,
  ExternalLink,
  ArrowDown,
  Users,
  Calendar,
  X,
  Send,
  MessageSquare,
  Loader2,
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
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  getPublicPressResources,
  type PublicPressResource,
} from "../services/marketingResourcesApi";

// ==================== TYPES ====================

interface PressResource {
  id: string;
  type: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_format: string | null;
  file_size: number | null;
  category: string;
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

interface PressContactForm {
  email: string;
  language: string;
  country: string;
  mediaTheme: string;
  mediaType: string;
  mediaName: string;
}

// ==================== CONSTANTS ====================

const MEDIA_THEMES = [
  { value: "expatriation", fr: "Expatriation", en: "Expatriation" },
  { value: "travel", fr: "Voyage", en: "Travel" },
  { value: "legal", fr: "Juridique & Droit", en: "Legal" },
  { value: "finance", fr: "Finance & Economie", en: "Finance & Economy" },
  { value: "technology", fr: "Technologie & Startups", en: "Technology & Startups" },
  { value: "lifestyle", fr: "Lifestyle & Bien-etre", en: "Lifestyle & Wellness" },
  { value: "business", fr: "Business & Entrepreneuriat", en: "Business & Entrepreneurship" },
  { value: "immigration", fr: "Immigration & Mobilite", en: "Immigration & Mobility" },
  { value: "education", fr: "Education & Formation", en: "Education & Training" },
  { value: "health", fr: "Sante", en: "Health" },
  { value: "culture", fr: "Culture & Societe", en: "Culture & Society" },
  { value: "general", fr: "Generaliste", en: "General" },
  { value: "other", fr: "Autre", en: "Other" },
];

const MEDIA_TYPES = [
  { value: "online_press", fr: "Presse en ligne", en: "Online Press" },
  { value: "print_press", fr: "Presse ecrite", en: "Print Press" },
  { value: "tv", fr: "Television", en: "Television" },
  { value: "radio", fr: "Radio", en: "Radio" },
  { value: "podcast", fr: "Podcast", en: "Podcast" },
  { value: "magazine", fr: "Magazine", en: "Magazine" },
  { value: "daily", fr: "Quotidien", en: "Daily Newspaper" },
  { value: "news_agency", fr: "Agence de presse", en: "News Agency" },
  { value: "blog", fr: "Blog / Media independant", en: "Blog / Independent Media" },
  { value: "freelance", fr: "Journaliste freelance", en: "Freelance Journalist" },
  { value: "other", fr: "Autre", en: "Other" },
];

const PRESS_STORAGE_KEY = "sos_press_access";

const SECTIONS = [
  { id: "identity", icon: Palette, fr: "Identite visuelle", en: "Visual Identity" },
  { id: "press-kit", icon: FolderOpen, fr: "Dossier de presse", en: "Press Kit" },
  { id: "releases", icon: Newspaper, fr: "Communiques", en: "Press Releases" },
  { id: "images", icon: Camera, fr: "Banque d'images", en: "Image Bank" },
  { id: "data", icon: BarChart3, fr: "Chiffres cles", en: "Key Figures" },
];

// ==================== HELPERS ====================

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

// ==================== SUB-COMPONENTS ====================

function ResourceCard({ resource, downloadLabel, onDownload }: { resource: PressResource; downloadLabel: string; onDownload?: (r: PressResource) => void }) {
  const isImg = resource.file_url && isImageFormat(resource.file_format);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
      <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {isImg ? (
          <img src={resource.file_url!} alt={resource.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            {resource.file_format && <span className="text-xs text-gray-400 mt-2 block uppercase">{resource.file_format}</span>}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 text-sm">{resource.name}</h3>
        {resource.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{resource.description}</p>}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            {resource.file_format && <span className="bg-gray-100 px-2 py-0.5 rounded uppercase font-medium">{resource.file_format}</span>}
            <span>{formatFileSize(resource.file_size)}</span>
          </div>
          {resource.file_url && (
            <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
              onClick={() => onDownload?.(resource)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />
              {downloadLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-red-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-500 max-w-2xl">{subtitle}</p>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
      <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

const Press: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const lang = (language as string) || "fr";
  const isFr = lang === "fr";

  // Gate state
  const [hasAccess, setHasAccess] = useState(() => {
    try { return !!localStorage.getItem(PRESS_STORAGE_KEY); } catch { return false; }
  });
  const [formData, setFormData] = useState<PressContactForm>({
    email: "", language: lang, country: "", mediaTheme: "", mediaType: "", mediaName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Resources state
  const [resources, setResources] = useState<PressResource[]>([]);
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", media: "", subject: "", message: "" });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // Refs for section navigation
  const contentRef = useRef<HTMLDivElement>(null);

  // i18n
  const t = useMemo(() => ({
    seoTitle: intl.formatMessage({ id: "press.seo.title" }),
    seoDescription: intl.formatMessage({ id: "press.seo.description" }),
    heroTitle: intl.formatMessage({ id: "press.hero.title" }),
    heroSubtitle: intl.formatMessage({ id: "press.hero.subtitle" }),
    heroBadge: intl.formatMessage({ id: "press.hero.badge" }),
    aboutTitle: intl.formatMessage({ id: "press.about.title" }),
    aboutDescription: intl.formatMessage({ id: "press.about.description" }),
    aboutMission: intl.formatMessage({ id: "press.about.mission" }),
    mediaKitDownload: intl.formatMessage({ id: "press.mediaKit.download" }),
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
  }), [intl]);

  const localeMap: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", pt: "pt-PT", ru: "ru-RU", ch: "zh-CN", hi: "hi-IN", ar: "ar-SA" };

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat(localeMap[lang] || "fr-FR", { year: "numeric", month: "long", day: "numeric" }).format(date);

  // ── Gate submit ──
  const handlePressAccess = async () => {
    if (!formData.email.trim() || !formData.country.trim() || !formData.mediaTheme || !formData.mediaType) {
      setFormError(isFr ? "Veuillez remplir tous les champs obligatoires" : "Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError(isFr ? "Adresse email invalide" : "Invalid email address");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await addDoc(collection(db, "press_contacts"), {
        email: formData.email.trim().toLowerCase(),
        language: formData.language,
        country: formData.country.trim(),
        mediaTheme: formData.mediaTheme,
        mediaType: formData.mediaType,
        mediaName: formData.mediaName.trim() || null,
        createdAt: serverTimestamp(),
        source: "press_landing_page",
      });
      localStorage.setItem(PRESS_STORAGE_KEY, JSON.stringify({ email: formData.email, ts: Date.now() }));
      setHasAccess(true);
    } catch {
      setFormError(isFr ? "Erreur, veuillez reessayer" : "Error, please try again");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Track download ──
  const trackDownload = async (resource: PressResource) => {
    try {
      const stored = localStorage.getItem(PRESS_STORAGE_KEY);
      const pressEmail = stored ? JSON.parse(stored).email : "unknown";
      await addDoc(collection(db, "press_downloads"), {
        resourceId: resource.id,
        resourceName: resource.name,
        resourceCategory: resource.category,
        fileFormat: resource.file_format,
        pressEmail,
        createdAt: serverTimestamp(),
      });
    } catch { /* silent */ }
  };

  // ── Contact press submit ──
  const handleContactSubmit = async () => {
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactError(isFr ? "Veuillez remplir le nom, l'email et le message" : "Please fill in name, email and message");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      setContactError(isFr ? "Adresse email invalide" : "Invalid email address");
      return;
    }
    setContactSending(true);
    setContactError(null);
    try {
      await addDoc(collection(db, "contact_messages"), {
        firstName: contactForm.name.split(" ")[0] || contactForm.name,
        lastName: contactForm.name.split(" ").slice(1).join(" ") || "",
        email: contactForm.email.trim().toLowerCase(),
        message: contactForm.message.trim(),
        subject: contactForm.subject.trim() || "Demande presse",
        category: "press",
        type: "contact_message",
        source: "press_contact_form",
        status: "new",
        isRead: false,
        responded: false,
        priority: "high",
        adminNotified: false,
        adminTags: ["press"],
        adminNotes: "",
        createdAt: serverTimestamp(),
        metadata: {
          mediaName: contactForm.media.trim() || null,
          language: lang,
          formVersion: "1.0",
          source: "press_landing_page",
        },
      });
      setContactSent(true);
    } catch {
      setContactError(isFr ? "Erreur, veuillez reessayer" : "Error, please try again");
    } finally {
      setContactSending(false);
    }
  };

  // ── Load resources ──
  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      setLoadingResources(true);
      try {
        const result = await getPublicPressResources(lang);
        setResources((result.resources || []).map((r: PublicPressResource) => ({
          id: r.id, type: r.type, name: r.name, description: r.description,
          file_url: r.file_url, file_format: r.file_format, file_size: r.file_size, category: r.category,
        })));
      } catch { /* silent */ }
      setLoadingResources(false);
    })();
  }, [lang, hasAccess]);

  // ── Load releases ──
  useEffect(() => {
    if (!hasAccess) return;
    (async () => {
      setLoadingReleases(true);
      try {
        const q = query(collection(db, "press_releases"), where("isActive", "==", true), orderBy("publishedAt", "desc"));
        const snapshot = await getDocs(q);
        setReleases(snapshot.docs.map((doc) => {
          const d = doc.data();
          return { id: doc.id, ...d, publishedAt: d.publishedAt?.toDate() || new Date() } as PressRelease;
        }));
      } catch { /* silent */ }
      setLoadingReleases(false);
    })();
  }, [hasAccess]);

  // ── Categorized resources ──
  const logos = resources.filter((r) => r.category === "press_logos");
  const kits = resources.filter((r) => r.category === "press_kit");
  const photos = resources.filter((r) => r.category === "press_photos");
  const data = resources.filter((r) => r.category === "press_data");
  const emptyMsg = isFr ? "Contenu bientot disponible" : "Content coming soon";

  // ==================== RENDER ====================
  return (
    <Layout>
      <SEOHead title={t.seoTitle} description={t.seoDescription} canonicalUrl={`/${lang}/presse`} ogType="website" locale={(localeMap[lang] || "fr-FR").replace("-", "_")} contentType="WebPage" />
      <BreadcrumbSchema items={[{ name: intl.formatMessage({ id: "breadcrumb.home" }), url: `/${lang}` }, { name: t.heroTitle }]} />

      <div className="min-h-screen bg-white">
        {/* ══════════════ HERO ══════════════ */}
        <section className="relative bg-gray-950 text-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[128px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[96px]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-2 mb-8">
                <Newspaper className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-200">{t.heroBadge}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight leading-[1.1]">
                {t.heroTitle}
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed mb-8">
                {t.heroSubtitle}
              </p>
              {hasAccess && (
                <button onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all">
                  <ArrowDown className="w-5 h-5" />
                  {isFr ? "Acceder aux ressources" : "Access resources"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════ ABOUT + KEY NUMBERS ══════════════ */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">{t.aboutTitle}</h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">{t.aboutDescription}</p>
                <p className="text-lg text-red-600 font-medium italic border-l-4 border-red-600 pl-4">{t.aboutMission}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Globe, value: intl.formatMessage({ id: "press.stats.countries" }), label: intl.formatMessage({ id: "press.stats.countriesLabel" }) },
                  { icon: Languages, value: intl.formatMessage({ id: "press.stats.languages" }), label: intl.formatMessage({ id: "press.stats.languagesLabel" }) },
                  { icon: Shield, value: intl.formatMessage({ id: "press.stats.availability" }), label: intl.formatMessage({ id: "press.stats.availabilityLabel" }) },
                  { icon: Users, value: "10K+", label: isFr ? "Clients aides" : "Clients helped" },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center hover:bg-gray-100 transition-colors">
                    <stat.icon className="w-6 h-6 text-red-600 mx-auto mb-3" />
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ GATE FORM ══════════════ */}
        {!hasAccess && (
          <section className="py-20 bg-gray-50">
            <div className="max-w-xl mx-auto px-4">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-red-500/20">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {isFr ? "Espace Presse" : "Press Room"}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {isFr
                      ? "Identifiez-vous pour acceder aux logos, dossiers de presse, communiques, banque d'images et chiffres cles."
                      : "Identify yourself to access logos, press kits, releases, image bank and key figures."
                    }
                  </p>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 mb-6">{formError}</div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Email professionnel" : "Professional email"} *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" placeholder="journalist@media.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Nom du media" : "Media name"}</label>
                    <input type="text" value={formData.mediaName} onChange={(e) => setFormData((p) => ({ ...p, mediaName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" placeholder={isFr ? "Ex: Le Monde, TechCrunch..." : "Ex: The Guardian, TechCrunch..."} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Pays" : "Country"} *</label>
                      <input type="text" value={formData.country} onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all" placeholder={isFr ? "France" : "United States"} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Langue" : "Language"} *</label>
                      <select value={formData.language} onChange={(e) => setFormData((p) => ({ ...p, language: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                        <option value="fr">Francais</option><option value="en">English</option><option value="es">Espanol</option>
                        <option value="de">Deutsch</option><option value="pt">Portugues</option><option value="ar">العربية</option>
                        <option value="ru">Русский</option><option value="zh">中文</option><option value="hi">हिन्दी</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Theme editorial" : "Editorial theme"} *</label>
                    <select value={formData.mediaTheme} onChange={(e) => setFormData((p) => ({ ...p, mediaTheme: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                      <option value="">{isFr ? "Selectionnez..." : "Select..."}</option>
                      {MEDIA_THEMES.map((m) => <option key={m.value} value={m.value}>{isFr ? m.fr : m.en}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{isFr ? "Type de media" : "Media type"} *</label>
                    <select value={formData.mediaType} onChange={(e) => setFormData((p) => ({ ...p, mediaType: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent">
                      <option value="">{isFr ? "Selectionnez..." : "Select..."}</option>
                      {MEDIA_TYPES.map((m) => <option key={m.value} value={m.value}>{isFr ? m.fr : m.en}</option>)}
                    </select>
                  </div>

                  <button onClick={handlePressAccess} disabled={submitting}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
                    {submitting ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : (
                      <><Unlock className="w-5 h-5" />{isFr ? "Acceder a l'espace presse" : "Access press room"}</>
                    )}
                  </button>

                  <p className="text-[11px] text-gray-400 text-center mt-3">{isFr ? "Vos donnees sont utilisees uniquement pour les relations presse." : "Your data is used only for press relations."}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════ PRESS CONTENT (gated) ══════════════ */}
        {hasAccess && (
          <>
            {/* Section nav */}
            <div ref={contentRef} className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-1 overflow-x-auto py-3 no-scrollbar">
                  <div className="flex items-center gap-1.5 mr-4">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600 font-medium whitespace-nowrap">{isFr ? "Acces presse" : "Press access"}</span>
                  </div>
                  {SECTIONS.map((s) => (
                    <a key={s.id} href={`#${s.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg whitespace-nowrap transition-colors">
                      <s.icon className="w-3.5 h-3.5" />
                      {isFr ? s.fr : s.en}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading */}
            {loadingResources && (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
              </div>
            )}

            {!loadingResources && (
              <>
                {/* ── IDENTITY / LOGOS ── */}
                <section id="identity" className="py-20 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader icon={Palette}
                      title={isFr ? "Identite visuelle" : "Visual Identity"}
                      subtitle={isFr ? "Logos, charte graphique et elements de marque. Tous les fichiers sont libres de droits pour un usage presse." : "Logos, brand guidelines and brand assets. All files are royalty-free for press use."} />
                    {logos.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {logos.map((r) => <ResourceCard key={r.id} resource={r} downloadLabel={t.mediaKitDownload} onDownload={trackDownload} />)}
                      </div>
                    ) : <EmptySection message={emptyMsg} />}
                  </div>
                </section>

                {/* ── PRESS KIT ── */}
                <section id="press-kit" className="py-20 bg-gray-50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader icon={FolderOpen}
                      title={isFr ? "Dossier de presse" : "Press Kit"}
                      subtitle={isFr ? "Dossier de presse complet, fiches entreprise, presentations et decks." : "Complete press kit, company fact sheets, presentations and decks."} />
                    {kits.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {kits.map((r) => <ResourceCard key={r.id} resource={r} downloadLabel={t.mediaKitDownload} onDownload={trackDownload} />)}
                      </div>
                    ) : <EmptySection message={emptyMsg} />}
                  </div>
                </section>

                {/* ── PRESS RELEASES ── */}
                <section id="releases" className="py-20 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader icon={Newspaper} title={t.releasesTitle} subtitle={t.releasesSubtitle} />
                    {loadingReleases ? (
                      <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" /></div>
                    ) : releases.length === 0 ? (
                      <EmptySection message={t.releasesEmpty} />
                    ) : (
                      <div className="max-w-4xl space-y-5">
                        {releases.map((release) => {
                          const title = getLocalizedText(release.title, lang);
                          const summary = getLocalizedText(release.summary, lang);
                          const content = getLocalizedText(release.content, lang);
                          const pdfUrl = release.pdfUrl?.[lang] || release.pdfUrl?.["en"] || release.pdfUrl?.["fr"];
                          const isExpanded = expandedRelease === release.id;
                          return (
                            <article key={release.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                              <div className="p-6 sm:p-8">
                                <div className="flex items-start gap-4">
                                  {release.imageUrl && <img src={release.imageUrl} alt={title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 hidden sm:block" loading="lazy" />}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(release.publishedAt)}
                                      </div>
                                      {release.tags?.slice(0, 3).map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full font-medium">{tag}</span>
                                      ))}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title || t.releasesNoTranslation}</h3>
                                    {summary && <p className="text-gray-600 text-sm leading-relaxed">{summary}</p>}
                                  </div>
                                </div>
                                {isExpanded && content && (
                                  <div className="mt-6 pt-6 border-t border-gray-100 prose prose-sm prose-gray max-w-none text-gray-600 whitespace-pre-line">{content}</div>
                                )}
                                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
                                  {content && (
                                    <button onClick={() => setExpandedRelease(isExpanded ? null : release.id)}
                                      className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700">
                                      {isExpanded ? <><ChevronUp className="w-4 h-4" />{t.releasesCollapse}</> : <><ChevronDown className="w-4 h-4" />{t.releasesReadMore}</>}
                                    </button>
                                  )}
                                  {pdfUrl && (
                                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600">
                                      <Download className="w-4 h-4" />{t.releasesDownloadPdf}
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

                {/* ── IMAGE BANK ── */}
                <section id="images" className="py-20 bg-gray-50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader icon={Camera}
                      title={isFr ? "Banque d'images" : "Image Bank"}
                      subtitle={isFr ? "Photos haute resolution de l'equipe, des bureaux et du produit. Libre de droits pour usage presse." : "High-resolution photos of the team, offices and product. Royalty-free for press use."} />
                    {photos.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {photos.map((r) => <ResourceCard key={r.id} resource={r} downloadLabel={t.mediaKitDownload} onDownload={trackDownload} />)}
                      </div>
                    ) : <EmptySection message={emptyMsg} />}
                  </div>
                </section>

                {/* ── DATA & KEY FIGURES ── */}
                <section id="data" className="py-20 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeader icon={BarChart3}
                      title={isFr ? "Chiffres cles & Donnees" : "Key Figures & Data"}
                      subtitle={isFr ? "Fact sheets, infographies et statistiques actualisees pour vos articles." : "Fact sheets, infographics and up-to-date statistics for your articles."} />
                    {data.length > 0 ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {data.map((r) => <ResourceCard key={r.id} resource={r} downloadLabel={t.mediaKitDownload} onDownload={trackDownload} />)}
                      </div>
                    ) : <EmptySection message={emptyMsg} />}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* ══════════════ PRESS CONTACT (always visible) ══════════════ */}
        <section className="py-20 bg-gray-950 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.contactTitle}</h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">{t.contactDescription}</p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => { setShowContactModal(true); setContactSent(false); setContactError(null); }}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 text-lg"
                >
                  <MessageSquare className="w-5 h-5" />
                  {isFr ? "Contacter l'equipe presse" : "Contact press team"}
                </button>
                <a href={`mailto:${t.contactEmail}`} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all flex items-center gap-2 border border-white/10">
                  <Mail className="w-5 h-5" />
                  {t.contactEmail}
                </a>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{t.contactResponse}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════ CONTACT MODAL ══════════════ */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowContactModal(false)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gray-950 px-6 py-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-red-400" />
                  {isFr ? "Contacter l'equipe presse" : "Contact press team"}
                </h3>
                <button onClick={() => setShowContactModal(false)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {contactSent ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{isFr ? "Message envoye !" : "Message sent!"}</h4>
                  <p className="text-gray-500 text-sm mb-6">{isFr ? "Notre equipe presse vous repondra dans les 24 heures." : "Our press team will respond within 24 hours."}</p>
                  <button onClick={() => setShowContactModal(false)} className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm">{isFr ? "Fermer" : "Close"}</button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {contactError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{contactError}</div>}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? "Nom complet" : "Full name"} *</label>
                    <input type="text" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="Jean Dupont" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="journalist@media.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? "Media" : "Media"}</label>
                      <input type="text" value={contactForm.media} onChange={(e) => setContactForm((p) => ({ ...p, media: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" placeholder="Le Monde, TechCrunch..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? "Sujet" : "Subject"}</label>
                    <input type="text" value={contactForm.subject} onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder={isFr ? "Demande d'interview, article, partenariat..." : "Interview request, article, partnership..."} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea value={contactForm.message} onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[120px]" rows={4}
                      placeholder={isFr ? "Decrivez votre demande..." : "Describe your request..."} />
                  </div>

                  <button onClick={handleContactSubmit} disabled={contactSending}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                    {contactSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />{isFr ? "Envoyer le message" : "Send message"}</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Press;

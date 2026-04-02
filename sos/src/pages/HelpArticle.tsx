// src/pages/HelpArticle.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ChevronLeft, Clock, BookOpen, ExternalLink, List } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import { ArticleSchema, BreadcrumbSchema } from "../components/seo";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { parseLocaleFromPath, getLocaleString, getTranslatedRouteSlug, useLocaleNavigate, useLocalePath } from "../multilingual-system";
import { phoneCodesData } from "../data/phone-codes";

// Lookup country name from ISO-2 code in the given language
const getCountryNameForLang = (countryCode: string, lang: string): string => {
  if (!countryCode) return '';
  const entry = phoneCodesData.find(c => c.code.toLowerCase() === countryCode.toLowerCase());
  if (!entry) return '';
  const key = lang === 'ch' ? 'zh' : lang as keyof typeof entry;
  return (entry[key] as string) || entry.en || '';
};

// Parse Table of Contents from markdown content
interface TOCItem { id: string; text: string; level: number; }
const parseTOC = (markdown: string): TOCItem[] => {
  const toc: TOCItem[] = [];
  const usedIds: Record<string, number> = {};
  const lines = markdown.split('\n');
  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    const match = h2 || h3;
    if (match) {
      const level = h2 ? 2 : 3;
      const text = match[1].trim();
      const baseId = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';
      usedIds[baseId] = (usedIds[baseId] || 0) + 1;
      const id = usedIds[baseId] > 1 ? `${baseId}-${usedIds[baseId]}` : baseId;
      toc.push({ id, text, level });
    }
  }
  return toc;
};
import {
  listHelpArticles,
  HelpArticle as HelpArticleType,
  HelpArticleFAQ,
} from "../services/helpCenter";

// Helper to get translated value from string or Record<string, string>
const getTranslatedValue = (
  value: string | Record<string, string> | undefined,
  locale: string,
  fallback: string = ""
): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[locale] || value["en"] || value["fr"] || Object.values(value)[0] || fallback;
  }
  return fallback;
};

// Helper to get translated tags
const getTranslatedTags = (
  value: string[] | Record<string, string[]> | undefined,
  locale: string
): string[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return value[locale] || value["en"] || value["fr"] || Object.values(value)[0] || [];
  }
  return [];
};

// Helper to get translated FAQ item
const getTranslatedFAQ = (
  faq: HelpArticleFAQ,
  locale: string
): { question: string; answer: string } => {
  return {
    question: getTranslatedValue(faq.question, locale),
    answer: getTranslatedValue(faq.answer, locale),
  };
};

// Slugify a heading text for use as HTML id
const slugifyHeading = (text: string): string =>
  text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'section';

// Markdown to HTML converter (with IDs on h2/h3 for TOC anchor links)
const mdToHtml = (md: string): string => {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const usedIds: Record<string, number> = {};
  const makeId = (t: string): string => {
    const base = slugifyHeading(t);
    usedIds[base] = (usedIds[base] || 0) + 1;
    return usedIds[base] > 1 ? `${base}-${usedIds[base]}` : base;
  };

  // Headers (h2/h3 get IDs for TOC links)
  html = html
    .replace(/^### (.*)$/gm, (_, t) => `<h3 id="${makeId(t)}" class="mt-6 mb-2 text-xl font-bold text-white">${t}</h3>`)
    .replace(/^## (.*)$/gm, (_, t) => `<h2 id="${makeId(t)}" class="mt-8 mb-3 text-2xl font-bold text-white">${t}</h2>`)
    .replace(
      /^# (.*)$/gm,
      '<h1 class="mt-10 mb-4 text-3xl font-bold text-white">$1</h1>'
    );

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Lists
  html = html
    .replace(/^\d+\.\s+(.*)$/gm, "<li>$1</li>")
    .replace(/^-\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(
    /(?:^|\n)((?:<li>.*<\/li>\n?)+)/g,
    (_m, list: string) =>
      `<ul class="list-disc pl-6 my-4 space-y-1">${list}</ul>`
  );

  // Paragraphs
  html = html.replace(
    /^(?!<h\d|<ul|<\/ul>|<li>|<\/li>|\s*$)(.+)$/gm,
    '<p class="leading-relaxed text-gray-300">$1</p>'
  );

  return html;
};

const HelpArticle: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useLocaleNavigate();
  const getLocalePath = useLocalePath();
  const location = useLocation();
  const intl = useIntl();
  const { language } = useApp();
  const [article, setArticle] = useState<HelpArticleType | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<HelpArticleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const articleRef = useRef<HelpArticleType | null>(null);

  // Parse locale from URL to get language and country
  const { lang: urlLang, country: currentCountry } = parseLocaleFromPath(location.pathname);
  const langCode = urlLang || language || 'en';
  const isRTL = langCode === 'ar';
  // Country-aware SEO
  const countryCode = (currentCountry || '').toUpperCase();
  const countryName = countryCode ? getCountryNameForLang(countryCode, langCode) : '';

  // Handle language change from header - redirect to translated slug
  useEffect(() => {
    const currentArticle = articleRef.current || article;
    if (!currentArticle || !language) return;

    // Get the new language code from context
    const newLangCode = language.split('-')[0];

    // If URL language matches context language, no need to redirect
    if (newLangCode === langCode) return;

    // Get the slug for the new language
    let newSlug: string;
    if (typeof currentArticle.slug === 'string') {
      newSlug = currentArticle.slug;
    } else if (currentArticle.slug && typeof currentArticle.slug === 'object') {
      newSlug = currentArticle.slug[newLangCode] || currentArticle.slug['en'] || currentArticle.slug['fr'] || Object.values(currentArticle.slug)[0] || slug || '';
    } else {
      newSlug = slug || '';
    }

    // Build new URL preserving the current country
    const countryCode = currentCountry || getLocaleString(language as any).split('-')[1] || 'fr';
    const newLocale = `${newLangCode}-${countryCode}`;
    const translatedHelpCenter = getTranslatedRouteSlug("help-center" as any, newLangCode as any);
    const newUrl = `/${newLocale}/${translatedHelpCenter}/${newSlug}`;

    // Navigate to the new URL
    navigate(newUrl, { replace: true });
  }, [language, langCode, article, navigate, currentCountry, slug]);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const articles = await listHelpArticles({ onlyPublished: true });

        // Find article by slug (checking all language versions)
        const foundArticle = articles.find((art) => {
          if (typeof art.slug === "string") {
            return art.slug === slug;
          }
          if (art.slug && typeof art.slug === "object") {
            return Object.values(art.slug).includes(slug);
          }
          return false;
        });

        if (foundArticle) {
          // Redirect if slug doesn't match current language (cross-language slug)
          // e.g., /fr-fr/centre-aide/how-to-expatriate → /fr-fr/centre-aide/comment-s-expatrier
          if (foundArticle.slug && typeof foundArticle.slug === 'object') {
            const correctSlug = foundArticle.slug[langCode] || foundArticle.slug['en'] || foundArticle.slug['fr'];
            if (correctSlug && correctSlug !== slug) {
              const helpSlug = getTranslatedRouteSlug("help-center" as any, langCode as any);
              navigate(`/${currentLocale}/${helpSlug}/${correctSlug}`, { replace: true });
              return;
            }
          }
          articleRef.current = foundArticle;
          setArticle(foundArticle);
          setNotFound(false);
          // Articles de la même catégorie (liens internes)
          const related = articles
            .filter((a) => a.categoryId === foundArticle.categoryId && a.id !== foundArticle.id)
            .slice(0, 4);
          setRelatedArticles(related);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error loading article:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    void loadArticle();
  }, [slug]);

  // Generate HowTo schema for "how to" / "guide" / "comment" articles
  const generateHowToSchema = () => {
    if (!article) return null;
    const artTitle = getTranslatedValue(article.title, language);
    if (!artTitle) return null;
    const titleLower = artTitle.toLowerCase();
    const isHowTo = titleLower.startsWith('comment') || titleLower.startsWith('how to') || titleLower.startsWith('how sos')
      || titleLower.startsWith('guide') || titleLower.startsWith('como') || titleLower.startsWith('wie ')
      || titleLower.startsWith('como ') || titleLower.startsWith('كيف') || titleLower.startsWith('如何')
      || titleLower.includes('pas à pas') || titleLower.includes('step by step') || titleLower.includes('schritt');
    if (!isHowTo) return null;

    // Extract steps from content headings (h2/h3 become HowToSteps)
    const artContent = getTranslatedValue(article.content, language) || '';
    const headingRegex = /<h[23][^>]*>(.*?)<\/h[23]>/gi;
    const steps: { name: string }[] = [];
    let match;
    while ((match = headingRegex.exec(artContent)) !== null) {
      const stepName = match[1].replace(/<[^>]*>/g, '').trim();
      if (stepName) steps.push({ name: stepName });
    }
    if (steps.length < 2) return null; // Need at least 2 steps

    const artExcerpt = getTranslatedValue(article.excerpt, language);
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": artTitle,
      "description": artExcerpt || artTitle,
      "step": steps.map((s, i) => ({
        "@type": "HowToStep",
        "position": i + 1,
        "name": s.name,
      })),
    };
  };

  // Generate Schema.org FAQPage JSON-LD
  const generateFAQSchema = () => {
    if (!article?.faqs || article.faqs.length === 0) return null;

    const faqItems = article.faqs.map((faq) => {
      const translated = getTranslatedFAQ(faq, language);
      return {
        "@type": "Question",
        name: translated.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: translated.answer,
        },
      };
    });

    const faqLang = language === 'ch' ? 'zh' : language;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: faqLang,
      mainEntity: faqItems.map(item => ({
        ...item,
        inLanguage: faqLang,
      })),
    };
  };

  // Table of Contents — must be called before early returns (Rules of Hooks)
  const content = article ? getTranslatedValue(article.content, language) : '';
  const toc = useMemo(() => parseTOC(content), [content]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-b-0 border-red-600" />
            <p className="mt-4 text-white/80">
              {intl.formatMessage({ id: "common.loading" })}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || !article) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center" data-page-not-found="true">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">404</h1>
            <p className="text-white/80 mb-6">
              {intl.formatMessage({ id: "helpCenter.noArticlesFound" })}
            </p>
            <Link
              to={getLocalePath("/centre-aide")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <ChevronLeft size={20} />
              {intl.formatMessage({ id: "helpCenter.backToArticles" })}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const title = getTranslatedValue(article.title, language);
  const excerpt = getTranslatedValue(article.excerpt, language);
  const tags = getTranslatedTags(article.tags, language);
  const currentSlug = getTranslatedValue(article.slug, language);
  const faqSchema = generateFAQSchema();
  const howToSchema = generateHowToSchema();
  // ISO lang code for SEO (ch → zh)
  const isoLang = langCode === 'ch' ? 'zh' : langCode;

  // OG locale mapping for SEOHead
  const OG_LOCALE_MAP: Record<string, string> = {
    fr: 'fr_FR', en: 'en_US', es: 'es_ES', de: 'de_DE', pt: 'pt_PT',
    ru: 'ru_RU', ch: 'zh_CN', hi: 'hi_IN', ar: 'ar_SA',
  };
  const ogLocale = OG_LOCALE_MAP[langCode] || 'fr_FR';

  // Locale-aware canonical and article URL
  // IMPORTANT: Canonical URLs must be deterministic (no geolocation dependency).
  // Use static default locale mapping instead of getLocaleString() which varies by user timezone.
  const CANONICAL_LOCALES: Record<string, string> = {
    fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', ru: 'ru-ru',
    pt: 'pt-pt', ch: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
  };
  const LANG_DEFAULT_COUNTRY: Record<string, string> = {
    fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
  };
  const HREFLANG_CODES: Record<string, string> = {
    fr: 'fr', en: 'en', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'zh-Hans', hi: 'hi', ar: 'ar',
  };
  const { locale: urlLocale } = parseLocaleFromPath(location.pathname);
  const defaultLocale = CANONICAL_LOCALES[langCode] || 'fr-fr';
  const currentLocale = urlLocale || defaultLocale;
  const helpCenterSlug = getTranslatedRouteSlug("help-center" as any, langCode as any);
  // Full absolute URL bypasses SEOHead's locale re-processing (no double normalization)
  const articleUrl = `https://sos-expat.com/${defaultLocale}/${helpCenterSlug}/${currentSlug}`;

  // Detect if article content is untranslated (stored as string = French only)
  // When untranslated, non-French pages show French content = duplicate content
  const isArticleTranslated = typeof article.title === 'object' && article.title !== null;
  const noIndexUntranslated = !isArticleTranslated && langCode !== 'fr';

  // Per-language hreflang for this article using correct translated slugs
  const ALL_LANGS = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'] as const;
  const articleHreflang = ALL_LANGS.map(lang => {
    const urlLang = lang === 'ch' ? 'zh' : lang;
    const country = LANG_DEFAULT_COUNTRY[lang];
    const artSlug = getTranslatedValue(article.slug, lang) || currentSlug;
    const hcSlug = getTranslatedRouteSlug("help-center" as any, lang as any);
    return {
      lang: HREFLANG_CODES[lang],
      url: `https://sos-expat.com/${urlLang}-${country}/${hcSlug}/${artSlug}`,
    };
  });

  // Breadcrumbs for structured data
  const breadcrumbs = [
    { name: intl.formatMessage({ id: "nav.home" }), url: "/" },
    { name: intl.formatMessage({ id: "helpCenter.title" }), url: `/${currentLocale}/${helpCenterSlug}` },
    { name: title },
  ];

  // Dates for ArticleSchema (use Firestore timestamps if available)
  const datePublished = article.createdAt
    ? (typeof article.createdAt === 'object' && 'toDate' in article.createdAt
        ? (article.createdAt as any).toDate().toISOString()
        : new Date(article.createdAt as any).toISOString())
    : new Date().toISOString();
  const dateModified = article.updatedAt
    ? (typeof article.updatedAt === 'object' && 'toDate' in article.updatedAt
        ? (article.updatedAt as any).toDate().toISOString()
        : new Date(article.updatedAt as any).toISOString())
    : datePublished;

  // Country-aware SEO title/description
  const seoTitle = countryName
    ? `${title} — ${countryName} | SOS Expat`
    : `${title} | SOS Expat`;
  const seoDesc = countryName && excerpt
    ? `${excerpt.substring(0, 120)} · ${countryName}`
    : excerpt;
  // Annuaire slug for external link
  const annuaireSlug = getTranslatedRouteSlug("annuaire" as any, langCode as any) || 'annuaire';

  return (
    <Layout>
      {/* Per-language hreflang with correct translated article slugs (replaces global HreflangLinks on article pages) */}
      <Helmet>
        {articleHreflang.map(alt => (
          <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.url} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`https://sos-expat.com/fr-fr/centre-aide/${getTranslatedValue(article.slug, 'fr') || currentSlug}`} />
        {/* noindex when article content is not yet translated (prevents indexing French content on non-FR pages) */}
        {noIndexUntranslated && <meta name="robots" content="noindex,nofollow" />}
      </Helmet>
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonicalUrl={`https://sos-expat.com/${defaultLocale}/${helpCenterSlug}/${currentSlug}`}
        locale={ogLocale}
        author="SOS Expat"
        contentType="article"
        ogType="article"
        publishedTime={datePublished}
        modifiedTime={dateModified}
        keywords={[...tags, countryName].filter(Boolean).join(', ')}
        readingTime={`${article.readTime} min`}
        structuredData={faqSchema || undefined}
        geoRegion={countryCode || undefined}
        geoPlacename={countryName || undefined}
      />
      <ArticleSchema
        title={title}
        description={excerpt}
        url={articleUrl}
        datePublished={datePublished}
        dateModified={dateModified}
        author="Manon"
        keywords={tags}
        wordCount={content ? content.split(/\s+/).length : undefined}
        inLanguage={isoLang}
      />
      <BreadcrumbSchema items={breadcrumbs} />
      {/* HowTo schema for "how to" / "guide" articles — enables Position 0 rich results */}
      {howToSchema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        </Helmet>
      )}
      {/* Speakable schema for AEO (voice assistants, ChatGPT, Perplexity) */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": articleUrl,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".speakable", "h1", ".help-center-subtitle"],
          },
          ...(countryCode && {
            locationCreated: { "@type": "Country", name: countryName || countryCode, identifier: countryCode },
          }),
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" data-article-loaded="true" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Fil d'Ariane HTML visible */}
        <nav aria-label="breadcrumb" className="bg-gray-950/80 border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/60" itemScope itemType="https://schema.org/BreadcrumbList">
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link to={`/${currentLocale}`} className="hover:text-white transition-colors" itemProp="item">
                  <span itemProp="name">{intl.formatMessage({ id: "nav.home" })}</span>
                </Link>
                <meta itemProp="position" content="1" />
              </li>
              <li className="text-white/30" aria-hidden="true">/</li>
              <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link to={`/${currentLocale}/${helpCenterSlug}`} className="hover:text-white transition-colors" itemProp="item">
                  <span itemProp="name">{intl.formatMessage({ id: "helpCenter.title" })}</span>
                </Link>
                <meta itemProp="position" content="2" />
              </li>
              <li className="text-white/30" aria-hidden="true">/</li>
              <li className="text-white/90 font-medium truncate max-w-[200px]" aria-current="page" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <span itemProp="name">{title}</span>
                <meta itemProp="position" content="3" />
              </li>
            </ol>
          </div>
        </nav>

        {/* Hero compact */}
        <div className="relative pt-10 pb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={`/${currentLocale}/${helpCenterSlug}`}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors font-semibold"
            >
              <ChevronLeft size={20} />
              <span>{intl.formatMessage({ id: "helpCenter.backToArticles" })}</span>
            </Link>
          </div>
        </div>

        {/* Article content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <article className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-10 text-white shadow-2xl">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {title}
                {countryName && (
                  <span className="block text-lg font-normal text-white/60 mt-1">{countryName}</span>
                )}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <Clock size={16} />
                  {article.readTime} {intl.formatMessage({ id: "helpCenter.minReadSuffix" })}
                </span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Résumé / Summary — AEO Featured Snippet */}
            {excerpt && (
              <div className="mb-8 rounded-xl bg-blue-500/10 border border-blue-400/20 p-4">
                <p className="text-sm font-semibold text-blue-300 mb-1 uppercase tracking-wide">
                  {intl.formatMessage({ id: "helpCenter.summaryTitle" })}
                </p>
                <p className="text-white/80 leading-relaxed text-sm speakable">{excerpt}</p>
              </div>
            )}

            {/* Table des matières (TOC) — si ≥ 3 titres */}
            {toc.length >= 3 && (
              <nav aria-label={intl.formatMessage({ id: "helpCenter.tocTitle" })}
                   className="mb-8 rounded-xl bg-white/5 border border-white/10 p-5">
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <List size={16} className="text-blue-400" />
                  {intl.formatMessage({ id: "helpCenter.tocTitle" })}
                </h2>
                <ol className="space-y-1.5">
                  {toc.map((item, i) => (
                    <li key={i} className={item.level === 3 ? 'ml-4' : ''}>
                      <a
                        href={`#${item.id}`}
                        className="text-sm text-blue-300 hover:text-white transition-colors inline-flex items-start gap-1.5"
                      >
                        <span className="text-white/40 flex-shrink-0 mt-0.5 text-xs">
                          {item.level === 2 ? `${i + 1}.` : '○'}
                        </span>
                        <span>{item.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Main content */}
            <div
              className="text-white prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
            />

            {/* FAQ Section with Schema.org */}
            {article.faqs && article.faqs.length > 0 && (
              <section className="mt-12 pt-8 border-t border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {intl.formatMessage({ id: "helpCenter.faqTitle" })}
                </h2>
                <div className="space-y-4">
                  {article.faqs.map((faq, index) => {
                    const translated = getTranslatedFAQ(faq, language);
                    return (
                      <div
                        key={index}
                        className="rounded-xl bg-white/5 border border-white/10 p-5"
                      >
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {translated.question}
                        </h3>
                        <p className="text-gray-300 leading-relaxed">
                          {translated.answer}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </article>

          {/* Lien externe annuaire — maillage externe SEO */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/50 mb-2">{intl.formatMessage({ id: "helpCenter.externalLinksTitle" })}</p>
            <a
              href={`https://sos-expat.com/${currentLocale}/${annuaireSlug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors"
            >
              <ExternalLink size={14} />
              {intl.formatMessage({ id: "helpCenter.annuaireLink" })}
            </a>
          </div>

          {/* Articles liés (liens internes SEO) */}
          {relatedArticles.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-red-400" />
                {intl.formatMessage({ id: "helpCenter.relatedArticles" })}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.map((rel) => {
                  const relTitle = getTranslatedValue(rel.title, language);
                  const relExcerpt = getTranslatedValue(rel.excerpt, language);
                  const relSlug = getTranslatedValue(rel.slug, language);
                  return (
                    <Link
                      key={rel.id}
                      to={`/${currentLocale}/${helpCenterSlug}/${relSlug}`}
                      className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-all"
                    >
                      <span className="mt-1 flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 text-red-400">
                        <BookOpen size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-2">
                          {relTitle}
                        </p>
                        {relExcerpt && (
                          <p className="mt-1 text-xs text-white/50 line-clamp-2">{relExcerpt}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HelpArticle;

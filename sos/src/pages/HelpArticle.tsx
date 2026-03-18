// src/pages/HelpArticle.tsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ChevronLeft, Clock, BookOpen } from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import { ArticleSchema, BreadcrumbSchema } from "../components/seo";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { parseLocaleFromPath, getLocaleString, getTranslatedRouteSlug, useLocaleNavigate, useLocalePath } from "../multilingual-system";
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

// Markdown to HTML converter
const mdToHtml = (md: string): string => {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html
    .replace(
      /^### (.*)$/gm,
      '<h3 class="mt-6 mb-2 text-xl font-bold text-white">$1</h3>'
    )
    .replace(
      /^## (.*)$/gm,
      '<h2 class="mt-8 mb-3 text-2xl font-bold text-white">$1</h2>'
    )
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
  const langCode = urlLang || language || 'fr';

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
      newSlug = currentArticle.slug[newLangCode] || currentArticle.slug['fr'] || currentArticle.slug['en'] || Object.values(currentArticle.slug)[0] || slug || '';
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

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems,
    };
  };

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
  const content = getTranslatedValue(article.content, language);
  const excerpt = getTranslatedValue(article.excerpt, language);
  const tags = getTranslatedTags(article.tags, language);
  const currentSlug = getTranslatedValue(article.slug, language);
  const faqSchema = generateFAQSchema();

  // Locale-aware canonical and article URL
  // IMPORTANT: Canonical URLs must be deterministic (no geolocation dependency).
  // Use static default locale mapping instead of getLocaleString() which varies by user timezone.
  const CANONICAL_LOCALES: Record<string, string> = {
    fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', ru: 'ru-ru',
    pt: 'pt-pt', ch: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
  };
  const { locale: urlLocale } = parseLocaleFromPath(location.pathname);
  const defaultLocale = CANONICAL_LOCALES[langCode] || 'fr-fr';
  const currentLocale = urlLocale || defaultLocale;
  const helpCenterSlug = getTranslatedRouteSlug("help-center" as any, langCode as any);
  // Full absolute URL bypasses SEOHead's locale re-processing (no double normalization)
  const articleUrl = `https://sos-expat.com/${defaultLocale}/${helpCenterSlug}/${currentSlug}`;

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

  return (
    <Layout>
      <SEOHead
        title={`${title} | SOS Expat`}
        description={excerpt}
        canonicalUrl={`https://sos-expat.com/${defaultLocale}/${helpCenterSlug}/${currentSlug}`}
        author="Manon"
        contentType="article"
        ogType="article"
        publishedTime={datePublished}
        modifiedTime={dateModified}
        keywords={tags.join(', ')}
        readingTime={`${article.readTime} min`}
        structuredData={faqSchema || undefined}
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
      />
      <BreadcrumbSchema items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950" data-article-loaded="true">
        {/* Hero compact */}
        <div className="relative pt-16 pb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={getLocalePath("/centre-aide")}
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

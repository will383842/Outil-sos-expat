import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Globe, BookOpen, Wrench, BarChart3, MapPin, Layers, HelpCircle, Image, Newspaper } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  getTranslatedRouteSlug,
  getAllTranslatedSlugs,
  parseLocaleFromPath,
} from '../../multilingual-system/core/routing/localeRoutes';

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
type RouteKey = 'annuaire' | 'articles' | 'news' | 'outils' | 'sondages-listing' | 'fiches-pays' | 'fiches-thematiques' | 'faq' | 'galerie';

// ─── Nav items definition ─────────────────────────────────────────────────────

interface NavItem {
  key: RouteKey;
  icon: React.ElementType;
  labels: Record<Language, string>;
  /** When set, clicking links to the blog SSR (full page nav) instead of the SPA */
  blogQrSlugs?: Record<Language, string>;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'annuaire',
    icon: Globe,
    labels: {
      fr: 'Annuaire',
      en: 'Directory',
      es: 'Directorio',
      de: 'Verzeichnis',
      ru: 'Каталог',
      pt: 'Diretório',
      ch: '目录',
      hi: 'निर्देशिका',
      ar: 'دليل',
    },
  },
  {
    key: 'articles',
    icon: BookOpen,
    labels: {
      fr: 'Articles',
      en: 'Articles',
      es: 'Artículos',
      de: 'Artikel',
      ru: 'Статьи',
      pt: 'Artigos',
      ch: '文章',
      hi: 'लेख',
      ar: 'مقالات',
    },
  },
  {
    key: 'news',
    icon: Newspaper,
    labels: {
      fr: 'Actualités',
      en: 'News',
      es: 'Noticias',
      de: 'Nachrichten',
      ru: 'Новости',
      pt: 'Notícias',
      ch: '新闻',
      hi: 'समाचार',
      ar: 'أخبار',
    },
    blogQrSlugs: {
      fr: 'actualites-expats',
      en: 'expat-news',
      es: 'noticias-expatriados',
      de: 'expat-nachrichten',
      ru: 'novosti-expatov',
      pt: 'noticias-expatriados',
      ch: 'expat-xinwen',
      hi: 'expat-samachar',
      ar: 'akhbar-mughtaribeen',
    },
  },
  {
    key: 'outils',
    icon: Wrench,
    labels: {
      fr: 'Outils',
      en: 'Tools',
      es: 'Herramientas',
      de: 'Werkzeuge',
      ru: 'Инструменты',
      pt: 'Ferramentas',
      ch: '工具',
      hi: 'उपकरण',
      ar: 'أدوات',
    },
  },
  {
    key: 'sondages-listing',
    icon: BarChart3,
    labels: {
      fr: 'Sondages',
      en: 'Surveys',
      es: 'Encuestas',
      de: 'Umfragen',
      ru: 'Опросы',
      pt: 'Pesquisas',
      ch: '调查',
      hi: 'सर्वेक्षण',
      ar: 'استطلاعات',
    },
  },
  {
    key: 'fiches-pays',
    icon: MapPin,
    labels: {
      fr: 'Pays',
      en: 'Countries',
      es: 'Países',
      de: 'Länder',
      ru: 'Страны',
      pt: 'Países',
      ch: '国家',
      hi: 'देश',
      ar: 'بلدان',
    },
  },
  {
    key: 'fiches-thematiques',
    icon: Layers,
    labels: {
      fr: 'Thématiques',
      en: 'Themes',
      es: 'Temáticas',
      de: 'Themen',
      ru: 'Темы',
      pt: 'Temáticas',
      ch: '专题',
      hi: 'विषयवस्तु',
      ar: 'مواضيع',
    },
  },
  {
    key: 'faq',
    icon: HelpCircle,
    labels: {
      fr: 'Q/R',
      en: 'Q&A',
      es: 'P/R',
      de: 'F/A',
      ru: 'В/О',
      pt: 'P/R',
      ch: '问答',
      hi: 'प्र/उ',
      ar: 'س/ج',
    },
    blogQrSlugs: {
      fr: 'vie-a-letranger',
      en: 'living-abroad',
      es: 'vivir-en-el-extranjero',
      de: 'leben-im-ausland',
      ru: 'zhizn-za-rubezhom',
      pt: 'viver-no-estrangeiro',
      ch: 'haiwai-shenghuo',
      hi: 'videsh-mein-jeevan',
      ar: 'alhayat-fi-alkhaarij',
    },
  },
  {
    key: 'galerie',
    icon: Image,
    labels: {
      fr: 'Images',
      en: 'Images',
      es: 'Imágenes',
      de: 'Bilder',
      ru: 'Галерея',
      pt: 'Imagens',
      ch: '图片',
      hi: 'चित्र',
      ar: 'صور',
    },
  },
];

// ─── Routes where ContentNav should be shown ─────────────────────────────────

// All slugs for each route key (pre-computed for active detection)
const ALL_SLUGS_BY_KEY: Partial<Record<RouteKey, string[]>> = {};
for (const item of NAV_ITEMS) {
  ALL_SLUGS_BY_KEY[item.key] = getAllTranslatedSlugs(item.key);
}

// Extra route keys whose pages also display ContentNav (sub-sections of content areas)
const EXTRA_CONTENT_KEYS = ['sondages', 'resultats-sondages', 'outils-listing'] as const;
const EXTRA_CONTENT_SLUGS: string[] = [];
for (const key of EXTRA_CONTENT_KEYS) {
  EXTRA_CONTENT_SLUGS.push(...getAllTranslatedSlugs(key as any));
}

// Content routes: show ContentNav on any of the 7 nav sections + their sub-pages
function isContentRoute(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}-[a-z]{2}/, '');
  const allSlugs = [
    ...Object.values(ALL_SLUGS_BY_KEY).flat(),
    ...EXTRA_CONTENT_SLUGS,
  ];
  return allSlugs.some(
    (slug) =>
      pathWithoutLocale === `/${slug}` ||
      pathWithoutLocale.startsWith(`/${slug}/`),
  );
}

// ─── Locale region map ────────────────────────────────────────────────────────

const LOCALE_REGION: Record<Language, string> = {
  fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru',
  pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ContentNav: React.FC = () => {
  const { language, isRTL } = useApp();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);

  const lang = (language as Language) || 'fr';

  // Build locale slug
  const { country } = parseLocaleFromPath(location.pathname);
  const urlLang = lang === 'ch' ? 'zh' : lang;
  const urlRegion = country || LOCALE_REGION[lang];
  const localeSlug = `${urlLang}-${urlRegion}`;

  // Don't render on non-content routes
  if (!isContentRoute(location.pathname)) return null;

  // Determine which item is active
  function isActive(item: NavItem): boolean {
    // Blog Q/R items are served by the blog SSR — never "active" inside the SPA
    if (item.blogQrSlugs) return false;
    const slugs = ALL_SLUGS_BY_KEY[item.key] || [];
    const pathWithoutLocale = location.pathname.replace(/^\/[a-z]{2}-[a-z]{2}/, '');
    // Direct match or starts-with for nested pages
    return slugs.some((slug) => {
      const normalized = `/${slug}`;
      return (
        pathWithoutLocale === normalized ||
        pathWithoutLocale.startsWith(`${normalized}/`) ||
        // categories sub-routes
        pathWithoutLocale.startsWith(`/categories/${slug}`) ||
        // individual item sub-routes
        pathWithoutLocale.includes(`/${slug}`)
      );
    });
  }

  // Build href for nav item
  function buildHref(item: NavItem): string {
    if (item.blogQrSlugs) {
      const qrSlug = item.blogQrSlugs[lang] || item.blogQrSlugs.fr;
      return `/${localeSlug}/${qrSlug}/`;
    }
    const slug = getTranslatedRouteSlug(item.key, lang);
    return `/${localeSlug}/${slug}`;
  }

  // Scroll active pill into center view on mount / route change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const containerCenter = container.clientWidth / 2;
      const elOffset = el.offsetLeft + el.clientWidth / 2;
      container.scrollTo({ left: elOffset - containerCenter, behavior: 'smooth' });
    }
  }, [location.pathname]);

  // Fade indicators
  const updateFades = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    el?.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', updateFades, { passive: true });
    return () => {
      el?.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, []);

  return (
    <nav
      aria-label="Content navigation"
      className="hidden lg:block sticky lg:top-20 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative max-w-7xl mx-auto px-2 sm:px-4">
        {/* Left fade */}
        {showLeftFade && (
          <div
            className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} z-10 w-12 h-full pointer-events-none`}
            style={{
              background: isRTL
                ? 'linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 100%)'
                : 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 100%)',
            }}
          />
        )}

        {/* Scrollable pill row */}
        <div
          ref={scrollRef}
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2"
          onScroll={updateFades}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const label = item.labels[lang] || item.labels.fr;
            const href = buildHref(item);
            const linkClass = [
              'flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 outline-none',
              active
                ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200',
            ].join(' ');

            // Blog Q/R items need a full page navigation (blog is SSR, not SPA)
            if (item.blogQrSlugs) {
              return (
                <a
                  key={item.key}
                  href={href}
                  className={linkClass}
                >
                  <Icon size={15} strokeWidth={2} className="text-gray-400" aria-hidden="true" />
                  <span>{label}</span>
                </a>
              );
            }

            return (
              <NavLink
                key={item.key}
                to={href}
                ref={active ? (activeRef as React.RefObject<HTMLAnchorElement>) : undefined}
                className={linkClass}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  size={15}
                  strokeWidth={active ? 2.5 : 2}
                  className={active ? 'text-white' : 'text-gray-400'}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Right fade */}
        {showRightFade && (
          <div
            className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} z-10 w-12 h-full pointer-events-none`}
            style={{
              background: isRTL
                ? 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 100%)'
                : 'linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(255,255,255,0.98) 100%)',
            }}
          />
        )}
      </div>
    </nav>
  );
};

export default ContentNav;

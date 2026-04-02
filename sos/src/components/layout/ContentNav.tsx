import React, { useRef, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Globe, BookOpen, Wrench, BarChart3, MapPin, Layers, HelpCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  getTranslatedRouteSlug,
  getAllTranslatedSlugs,
  parseLocaleFromPath,
} from '../../multilingual-system/core/routing/localeRoutes';

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
type RouteKey = 'annuaire' | 'articles' | 'outils' | 'sondages-listing' | 'fiches-pays' | 'fiches-thematiques' | 'faq';

// ─── Nav items definition ─────────────────────────────────────────────────────

interface NavItem {
  key: RouteKey;
  icon: React.ElementType;
  labels: Record<Language, string>;
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
      fr: 'FAQ',
      en: 'FAQ',
      es: 'FAQ',
      de: 'FAQ',
      ru: 'ЧаВо',
      pt: 'FAQ',
      ch: 'FAQ',
      hi: 'FAQ',
      ar: 'أسئلة',
    },
  },
];

// ─── Routes where ContentNav should be shown ─────────────────────────────────

// All slugs for each route key (pre-computed for active detection)
const ALL_SLUGS_BY_KEY: Partial<Record<RouteKey, string[]>> = {};
for (const item of NAV_ITEMS) {
  ALL_SLUGS_BY_KEY[item.key] = getAllTranslatedSlugs(item.key);
}

// Content routes prefixes — ContentNav only appears on these routes
const CONTENT_ROUTE_PATTERNS = [
  /^\/[a-z]{2}-[a-z]{2}\/(annuaire|directory|directorio|diretorio|verzeichnis|adreslar|katalog|adresboek|spravochnik|mu-lu)/,
  /^\/[a-z]{2}-[a-z]{2}\/(articles?)/,
  /^\/[a-z]{2}-[a-z]{2}\/(outils|tools|herramientas|ferramentas|werkzeuge|instrumenty|adawat|upakaran|gongju)/,
  /^\/[a-z]{2}-[a-z]{2}\/(categories|kategorie|categorias|kategorien)/,
  /^\/[a-z]{2}-[a-z]{2}\/(faq|preguntas-frecuentes|perguntas-frequentes|haeufige-fragen|chasto-zadavaemye-voprosy|sawaalaat|savalar)/,
  // Individual item routes
  /^\/[a-z]{2}-[a-z]{2}\/[a-z-]+\/(outil|tool|herramienta|ferramenta|werkzeug|instrument|sondage|survey|encuesta|pesquisa|umfrage)/,
];

function isContentRoute(pathname: string): boolean {
  return CONTENT_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
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

            return (
              <NavLink
                key={item.key}
                to={href}
                ref={active ? (activeRef as React.RefObject<HTMLAnchorElement>) : undefined}
                className={[
                  'flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 outline-none',
                  active
                    ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200',
                ].join(' ')}
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

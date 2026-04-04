/**
 * ContentSectionLinks — Maillage interne inter-sections
 * Affiche des liens vers les 6 autres sections de contenu (hors section courante).
 * Améliore le crawl Google, le PageRank interne et la rétention utilisateur.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, BookOpen, Wrench, BarChart3, MapPin, Layers, HelpCircle, ArrowRight } from 'lucide-react';
import { getTranslatedRouteSlug } from '../../multilingual-system/core/routing/localeRoutes';

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

// Blog Q/R slugs — these pages are served by blog SSR, NOT the SPA
// Must use <a href> (full page nav) so the Cloudflare Worker proxies to blog
const BLOG_QR_SLUGS: Record<Language, string> = {
  fr: 'vie-a-letranger',
  en: 'living-abroad',
  es: 'vivir-en-el-extranjero',
  de: 'leben-im-ausland',
  ru: 'zhizn-za-rubezhom',
  pt: 'viver-no-estrangeiro',
  ch: 'haiwai-shenghuo',
  hi: 'videsh-mein-jeevan',
  ar: 'alhayat-fi-alkhaarij',
};

type SectionKey =
  | 'annuaire'
  | 'articles'
  | 'outils'
  | 'sondages-listing'
  | 'fiches-pays'
  | 'fiches-thematiques'
  | 'faq';

// ─── i18n ─────────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<SectionKey, Record<Language, string>> = {
  annuaire: {
    fr: 'Annuaire mondial',
    en: 'Global directory',
    es: 'Directorio mundial',
    de: 'Weltweites Verzeichnis',
    ru: 'Мировой каталог',
    pt: 'Diretório mundial',
    ch: '全球目录',
    hi: 'वैश्विक निर्देशिका',
    ar: 'الدليل العالمي',
  },
  articles: {
    fr: 'Blog & Articles',
    en: 'Blog & Articles',
    es: 'Blog y Artículos',
    de: 'Blog & Artikel',
    ru: 'Блог и статьи',
    pt: 'Blog e Artigos',
    ch: '博客与文章',
    hi: 'ब्लॉग और लेख',
    ar: 'المدونة والمقالات',
  },
  outils: {
    fr: 'Outils pratiques',
    en: 'Practical tools',
    es: 'Herramientas prácticas',
    de: 'Praktische Werkzeuge',
    ru: 'Практические инструменты',
    pt: 'Ferramentas práticas',
    ch: '实用工具',
    hi: 'व्यावहारिक उपकरण',
    ar: 'أدوات عملية',
  },
  'sondages-listing': {
    fr: 'Sondages & Avis',
    en: 'Surveys & Opinions',
    es: 'Encuestas y Opiniones',
    de: 'Umfragen & Meinungen',
    ru: 'Опросы и мнения',
    pt: 'Sondagens e Opiniões',
    ch: '调查与意见',
    hi: 'सर्वेक्षण और राय',
    ar: 'استطلاعات وآراء',
  },
  'fiches-pays': {
    fr: 'Fiches Pays',
    en: 'Country Guides',
    es: 'Guías por País',
    de: 'Länderprofile',
    ru: 'Страновые справки',
    pt: 'Fichas de Países',
    ch: '国家资料',
    hi: 'देश गाइड',
    ar: 'بطاقات الدول',
  },
  'fiches-thematiques': {
    fr: 'Guides Thématiques',
    en: 'Thematic Guides',
    es: 'Guías Temáticas',
    de: 'Thematische Leitfäden',
    ru: 'Тематические руководства',
    pt: 'Guias Temáticos',
    ch: '专题指南',
    hi: 'विषयगत गाइड',
    ar: 'أدلة موضوعية',
  },
  faq: {
    fr: 'Q/R & Aide',
    en: 'Q&A & Help',
    es: 'P/R y Ayuda',
    de: 'F/A & Hilfe',
    ru: 'В/О и помощь',
    pt: 'P/R e Ajuda',
    ch: '问答与帮助',
    hi: 'प्र/उ और सहायता',
    ar: 'س/ج والمساعدة',
  },
};

const SECTION_DESCRIPTIONS: Record<SectionKey, Record<Language, string>> = {
  annuaire: {
    fr: 'Avocats, experts, prestataires dans 197 pays',
    en: 'Lawyers, experts, providers in 197 countries',
    es: 'Abogados, expertos, proveedores en 197 países',
    de: 'Anwälte, Experten, Anbieter in 197 Ländern',
    ru: 'Юристы, эксперты, поставщики в 197 странах',
    pt: 'Advogados, especialistas, prestadores em 197 países',
    ch: '197个国家的律师、专家和服务提供商',
    hi: '197 देशों में वकील, विशेषज्ञ, सेवा प्रदाता',
    ar: 'محامون وخبراء ومزودون في 197 دولة',
  },
  articles: {
    fr: 'Conseils, actualités et guides pour expatriés',
    en: 'Tips, news and guides for expats',
    es: 'Consejos, noticias y guías para expatriados',
    de: 'Tipps, Neuigkeiten und Ratgeber für Expats',
    ru: 'Советы, новости и руководства для экспатов',
    pt: 'Dicas, notícias e guias para expatriados',
    ch: '为外籍人士提供的建议、新闻和指南',
    hi: 'प्रवासियों के लिए सुझाव, समाचार और गाइड',
    ar: 'نصائح وأخبار وأدلة للمغتربين',
  },
  outils: {
    fr: 'Calculateurs, convertisseurs et outils expat',
    en: 'Calculators, converters and expat tools',
    es: 'Calculadoras, convertidores y herramientas expat',
    de: 'Rechner, Konverter und Expat-Tools',
    ru: 'Калькуляторы, конвертеры и инструменты для экспатов',
    pt: 'Calculadoras, conversores e ferramentas expat',
    ch: '计算器、转换器和外籍人士工具',
    hi: 'कैलकुलेटर, कनवर्टर और प्रवासी उपकरण',
    ar: 'آلات حاسبة ومحولات وأدوات للمغتربين',
  },
  'sondages-listing': {
    fr: 'Donnez votre avis sur la vie d\'expatrié',
    en: 'Share your opinion on expat life',
    es: 'Comparte tu opinión sobre la vida de expatriado',
    de: 'Teilen Sie Ihre Meinung zum Expat-Leben',
    ru: 'Поделитесь мнением о жизни экспата',
    pt: 'Partilhe a sua opinião sobre a vida de expatriado',
    ch: '分享您对外籍生活的看法',
    hi: 'प्रवासी जीवन पर अपनी राय साझा करें',
    ar: 'شارك رأيك في حياة المغتربين',
  },
  'fiches-pays': {
    fr: 'Guides complets pour 200+ pays de destination',
    en: 'Complete guides for 200+ destination countries',
    es: 'Guías completas para más de 200 países de destino',
    de: 'Umfassende Ratgeber für 200+ Zielländer',
    ru: 'Полные гиды по 200+ странам назначения',
    pt: 'Guias completos para 200+ países de destino',
    ch: '200多个目的地国家的完整指南',
    hi: '200+ गंतव्य देशों के लिए संपूर्ण गाइड',
    ar: 'أدلة شاملة لأكثر من 200 دولة وجهة',
  },
  'fiches-thematiques': {
    fr: 'Visa, logement, fiscalité, santé et plus',
    en: 'Visa, housing, taxes, health and more',
    es: 'Visa, vivienda, fiscalidad, salud y más',
    de: 'Visum, Wohnen, Steuern, Gesundheit und mehr',
    ru: 'Виза, жильё, налоги, здоровье и многое другое',
    pt: 'Visto, habitação, fiscalidade, saúde e mais',
    ch: '签证、住房、税务、健康等',
    hi: 'वीज़ा, आवास, कर, स्वास्थ्य और अधिक',
    ar: 'تأشيرة، إسكان، ضرائب، صحة والمزيد',
  },
  faq: {
    fr: 'Réponses aux questions fréquentes des expatriés',
    en: 'Answers to expats\' most frequent questions',
    es: 'Respuestas a las preguntas más frecuentes de expatriados',
    de: 'Antworten auf häufig gestellte Fragen von Expats',
    ru: 'Ответы на частые вопросы экспатов',
    pt: 'Respostas às perguntas mais frequentes dos expatriados',
    ch: '外籍人士常见问题解答',
    hi: 'प्रवासियों के सबसे सामान्य प्रश्नों के उत्तर',
    ar: 'إجابات على أكثر أسئلة المغتربين شيوعاً',
  },
};

const SECTION_ICONS: Record<SectionKey, React.ElementType> = {
  annuaire: Globe,
  articles: BookOpen,
  outils: Wrench,
  'sondages-listing': BarChart3,
  'fiches-pays': MapPin,
  'fiches-thematiques': Layers,
  faq: HelpCircle,
};

const HEADING: Record<Language, string> = {
  fr: 'Explorer nos autres sections',
  en: 'Explore our other sections',
  es: 'Explorar otras secciones',
  de: 'Weitere Bereiche entdecken',
  ru: 'Изучите другие разделы',
  pt: 'Explorar outras secções',
  ch: '探索其他板块',
  hi: 'अन्य अनुभाग देखें',
  ar: 'استكشاف أقسامنا الأخرى',
};

const LOCALE_REGION: Record<Language, string> = {
  fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru',
  pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
};

const ALL_SECTIONS: SectionKey[] = [
  'annuaire', 'articles', 'outils', 'sondages-listing',
  'fiches-pays', 'fiches-thematiques', 'faq',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContentSectionLinksProps {
  currentSection: SectionKey;
  lang: string;
  localeSlug?: string; // e.g. "fr-fr", "en-us" — if not provided, computed from lang
}

// ─── Component ────────────────────────────────────────────────────────────────

const ContentSectionLinks: React.FC<ContentSectionLinksProps> = ({
  currentSection,
  lang,
  localeSlug,
}) => {
  const language = (lang as Language) || 'fr';
  const urlLang = language === 'ch' ? 'zh' : language;
  const region = LOCALE_REGION[language] || language;
  const locale = localeSlug || `${urlLang}-${region}`;

  const sections = ALL_SECTIONS.filter((s) => s !== currentSection);

  return (
    <section
      aria-label={HEADING[language]}
      className="bg-gray-50 py-14 border-t border-gray-100"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">
          {HEADING[language]}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((key) => {
            const Icon = SECTION_ICONS[key];
            const label = SECTION_LABELS[key][language] || SECTION_LABELS[key].fr;
            const desc = SECTION_DESCRIPTIONS[key][language] || SECTION_DESCRIPTIONS[key].fr;
            const cardClass = "group flex items-start gap-3 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-red-100 transition-all duration-200";

            // Q/R (faq) links to blog SSR — must use <a href> for full-page nav
            // so the Cloudflare Worker routes it to the blog instead of the SPA
            if (key === 'faq') {
              const qrSlug = BLOG_QR_SLUGS[language] || BLOG_QR_SLUGS.fr;
              const href = `/${locale}/${qrSlug}/`;
              return (
                <a key={key} href={href} className={cardClass}>
                  <span className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
                    <Icon className="h-5 w-5 text-red-500" strokeWidth={1.8} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{desc}</p>
                  </div>
                  <ArrowRight className="flex-shrink-0 h-4 w-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all mt-3" />
                </a>
              );
            }

            const slug = getTranslatedRouteSlug(key as any, language as any) || key;
            const href = `/${locale}/${slug}`;

            return (
              <Link
                key={key}
                to={href}
                className={cardClass}
              >
                <span className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
                  <Icon className="h-5 w-5 text-red-500" strokeWidth={1.8} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {desc}
                  </p>
                </div>
                <ArrowRight className="flex-shrink-0 h-4 w-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all mt-3" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContentSectionLinks;

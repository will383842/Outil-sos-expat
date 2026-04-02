/**
 * Articles & Guides — SOS-Expat Blog Listing Page
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc / Gray scale
 * Framework: React 18 + TypeScript + Tailwind CSS 3.4 + Framer Motion 11
 * Route: /fr-fr/articles, /en-us/articles, etc.
 */

import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath, getTranslatedRouteSlug } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FAQPageSchema from "@/components/seo/FAQPageSchema";
import ContentSectionLinks from "@/components/layout/ContentSectionLinks";
import {
  Search,
  Clock,
  Calendar,
  BookOpen,
  Tag,
  TrendingUp,
  ArrowRight,
  Mail,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle,
} from "lucide-react";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  "page.title": { fr: "Articles & Guides", en: "Articles & Guides", es: "Artículos y Guías", de: "Artikel & Ratgeber", pt: "Artigos & Guias", ru: "Статьи и руководства", ch: "文章与指南", hi: "लेख और गाइड", ar: "المقالات والأدلة" },
  "page.subtitle": { fr: "Conseils pratiques, fiches pays et guides complets pour preparer votre expatriation dans plus de 200 pays. Droit, logement, fiscalite, sante et vie quotidienne a l'etranger.", en: "Practical advice, country guides and comprehensive tips to prepare your move to 200+ countries. Law, housing, taxes, health and daily life abroad covered by expat experts.", es: "Consejos prácticos, fichas por país y guías completas para preparar tu expatriación en más de 200 países. Derecho, vivienda, fiscalidad, salud y vida cotidiana en el extranjero.", de: "Praktische Tipps, Länderprofile und umfassende Ratgeber zur Vorbereitung Ihrer Auswanderung in über 200 Länder. Recht, Wohnen, Steuern, Gesundheit und Alltag im Ausland.", pt: "Conselhos práticos, fichas por país e guias completos para preparar a sua expatriação em mais de 200 países. Direito, habitação, fiscalidade, saúde e vida quotidiana no estrangeiro.", ru: "Практические советы, страновые гиды и подробные руководства для подготовки к эмиграции в более чем 200 странах. Право, жильё, налоги, здоровье и повседневная жизнь за рубежом.", ch: "实用建议、国家指南和全面攻略，助您为移居全球200多个国家做好准备。涵盖法律、住房、税务、医疗及海外日常生活各方面。", hi: "200 से अधिक देशों में अपने प्रवास की तैयारी के लिए व्यावहारिक सुझाव, देश-गाइड और व्यापक मार्गदर्शिकाएँ। कानून, आवास, कर, स्वास्थ्य और विदेश में दैनिक जीवन।", ar: "نصائح عملية وأدلة الدول وإرشادات شاملة للتحضير لهجرتك إلى أكثر من 200 دولة. القانون والسكن والضرائب والصحة والحياة اليومية في الخارج." },
  "search.placeholder": { fr: "Rechercher un article...", en: "Search articles...", es: "Buscar un artículo...", de: "Artikel suchen...", pt: "Pesquisar um artigo...", ru: "Поиск статей...", ch: "搜索文章...", hi: "लेख खोजें...", ar: "ابحث عن مقال..." },
  "cat.all": { fr: "Tous", en: "All", es: "Todos", de: "Alle", pt: "Todos", ru: "Все", ch: "全部", hi: "सभी", ar: "الكل" },
  "cat.country": { fr: "Fiches pays", en: "Country Guides", es: "Fichas por país", de: "Länderprofile", pt: "Fichas por país", ru: "Страновые гиды", ch: "国家指南", hi: "देश गाइड", ar: "أدلة الدول" },
  "cat.thematic": { fr: "Fiches thematiques", en: "Thematic Guides", es: "Guías temáticas", de: "Thematische Ratgeber", pt: "Guias temáticos", ru: "Тематические руководства", ch: "专题指南", hi: "विषयगत गाइड", ar: "أدلة موضوعية" },
  "cat.practical": { fr: "Guides pratiques", en: "Practical Guides", es: "Guías prácticas", de: "Praktische Ratgeber", pt: "Guias práticos", ru: "Практические руководства", ch: "实用指南", hi: "व्यावहारिक गाइड", ar: "أدلة عملية" },
  "cat.faq": { fr: "FAQ", en: "FAQ", es: "FAQ", de: "FAQ", pt: "FAQ", ru: "FAQ", ch: "常见问题", hi: "FAQ", ar: "الأسئلة الشائعة" },
  "cat.news": { fr: "Actualites", en: "News", es: "Actualidad", de: "Aktuelles", pt: "Notícias", ru: "Новости", ch: "新闻资讯", hi: "समाचार", ar: "الأخبار" },
  "featured.badge": { fr: "A la une", en: "Featured", es: "Destacado", de: "Featured", pt: "Destaque", ru: "Главное", ch: "精选", hi: "विशेष", ar: "مميز" },
  "read.time": { fr: "min de lecture", en: "min read", es: "min de lectura", de: "Min. Lesezeit", pt: "min de leitura", ru: "мин чтения", ch: "分钟阅读", hi: "मिनट पढ़ें", ar: "دقائق قراءة" },
  "read.article": { fr: "Lire l'article", en: "Read article", es: "Leer el artículo", de: "Artikel lesen", pt: "Ler o artigo", ru: "Читать статью", ch: "阅读文章", hi: "लेख पढ़ें", ar: "اقرأ المقال" },
  "sidebar.popular": { fr: "Articles populaires", en: "Popular Articles", es: "Artículos populares", de: "Beliebte Artikel", pt: "Artigos populares", ru: "Популярные статьи", ch: "热门文章", hi: "लोकप्रिय लेख", ar: "المقالات الأكثر قراءة" },
  "sidebar.categories": { fr: "Categories", en: "Categories", es: "Categorías", de: "Kategorien", pt: "Categorias", ru: "Категории", ch: "分类", hi: "श्रेणियाँ", ar: "الفئات" },
  "sidebar.tags": { fr: "Tags populaires", en: "Popular Tags", es: "Etiquetas populares", de: "Beliebte Tags", pt: "Tags populares", ru: "Популярные теги", ch: "热门标签", hi: "लोकप्रिय टैग", ar: "الوسوم الشائعة" },
  "blog.badge": { fr: "Blog SOS-Expat", en: "SOS-Expat Blog", es: "Blog SOS-Expat", de: "SOS-Expat Blog", ru: "Блог SOS-Expat", pt: "Blog SOS-Expat", ch: "SOS-Expat 博客", hi: "SOS-Expat ब्लॉग", ar: "مدونة SOS-Expat" },
  "newsletter.success": { fr: "Merci ! Vous êtes inscrit(e) à notre newsletter.", en: "Thanks! You're now subscribed to our newsletter.", es: "¡Gracias! Te has suscrito a nuestra newsletter.", de: "Danke! Sie sind jetzt für unseren Newsletter angemeldet.", pt: "Obrigado! Está agora subscrito na nossa newsletter.", ru: "Спасибо! Вы подписались на нашу рассылку.", ch: "谢谢！您已成功订阅我们的新闻通讯。", hi: "धन्यवाद! आप हमारे न्यूज़लेटर के लिए सदस्यता ले चुके हैं।", ar: "شكراً! لقد اشتركت في نشرتنا الإخبارية." },
  "newsletter.title": { fr: "Restez informe ou que vous soyez", en: "Stay informed wherever you are", es: "Mantente informado estés donde estés", de: "Bleiben Sie überall informiert", pt: "Fique informado onde quer que esteja", ru: "Оставайтесь в курсе событий, где бы вы ни были", ch: "无论身在何处，保持信息畅通", hi: "चाहे जहाँ भी हों, सूचित रहें", ar: "ابقَ على اطلاع أينما كنت" },
  "newsletter.subtitle": { fr: "Recevez nos meilleurs articles et guides directement dans votre boite mail", en: "Get our best articles and guides delivered to your inbox", es: "Recibe nuestros mejores artículos y guías directamente en tu correo", de: "Erhalten Sie unsere besten Artikel und Ratgeber direkt in Ihr Postfach", pt: "Receba os nossos melhores artigos e guias diretamente na sua caixa de email", ru: "Получайте наши лучшие статьи и руководства прямо на почту", ch: "将我们最优质的文章和指南直接发送到您的邮箱", hi: "हमारे सर्वश्रेष्ठ लेख और गाइड सीधे अपने इनबॉक्स में पाएं", ar: "احصل على أفضل مقالاتنا وأدلتنا مباشرة في بريدك الإلكتروني" },
  "newsletter.placeholder": { fr: "Votre email", en: "Your email", es: "Tu correo electrónico", de: "Ihre E-Mail-Adresse", pt: "O seu email", ru: "Ваш email", ch: "您的邮箱", hi: "आपका ईमेल", ar: "بريدك الإلكتروني" },
  "newsletter.cta": { fr: "S'abonner", en: "Subscribe", es: "Suscribirse", de: "Abonnieren", pt: "Subscrever", ru: "Подписаться", ch: "订阅", hi: "सदस्यता लें", ar: "اشترك" },
  "empty.title": { fr: "Aucun article trouve", en: "No articles found", es: "Ningún artículo encontrado", de: "Keine Artikel gefunden", pt: "Nenhum artigo encontrado", ru: "Статьи не найдены", ch: "未找到文章", hi: "कोई लेख नहीं मिला", ar: "لم يُعثر على أي مقال" },
  "empty.subtitle": { fr: "Essayez une autre recherche ou une autre categorie", en: "Try a different search or category", es: "Intenta con otra búsqueda o categoría", de: "Versuchen Sie eine andere Suche oder Kategorie", pt: "Tente uma pesquisa ou categoria diferente", ru: "Попробуйте другой запрос или категорию", ch: "请尝试其他搜索词或分类", hi: "कोई अन्य खोज या श्रेणी आज़माएं", ar: "جرّب بحثاً أو فئة مختلفة" },
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  "faq.title": { fr: "Questions fréquentes sur le blog", en: "Frequently asked questions about the blog", es: "Preguntas frecuentes sobre el blog", de: "Häufig gestellte Fragen zum Blog", pt: "Perguntas frequentes sobre o blog", ru: "Часто задаваемые вопросы о блоге", ch: "关于博客的常见问题", hi: "ब्लॉग के बारे में सामान्य प्रश्न", ar: "أسئلة شائعة حول المدونة" },
  "faq1.q": { fr: "Qui rédige les articles du blog SOS-Expat ?", en: "Who writes SOS-Expat blog articles?", es: "¿Quién redacta los artículos del blog SOS-Expat?", de: "Wer schreibt die SOS-Expat Blog-Artikel?", pt: "Quem redige os artigos do blog SOS-Expat?", ru: "Кто пишет статьи блога SOS-Expat?", ch: "谁撰写SOS-Expat博客文章？", hi: "SOS-Expat ब्लॉग लेख कौन लिखता है?", ar: "من يكتب مقالات مدونة SOS-Expat؟" },
  "faq1.a": { fr: "Nos articles sont rédigés par une équipe d'experts en droit international, d'expatriés expérimentés et de spécialistes par pays. Chaque article est révisé par des professionnels pour garantir l'exactitude des informations juridiques, fiscales et pratiques.", en: "Our articles are written by a team of international law experts, experienced expats and country specialists. Each article is reviewed by professionals to ensure the accuracy of legal, tax and practical information.", es: "Nuestros artículos son redactados por un equipo de expertos en derecho internacional, expatriados experimentados y especialistas por país.", de: "Unsere Artikel werden von einem Team aus Experten für internationales Recht, erfahrenen Expats und Länderspezialisten verfasst.", pt: "Os nossos artigos são redigidos por uma equipa de especialistas em direito internacional, expatriados experientes e especialistas por país.", ru: "Наши статьи написаны командой экспертов в международном праве, опытных экспатов и страновых специалистов.", ch: "我们的文章由国际法专家、经验丰富的外籍人士和各国专家团队撰写，并由专业人士审核。", hi: "हमारे लेख अंतर्राष्ट्रीय कानून विशेषज्ञों, अनुभवी प्रवासियों और देश विशेषज्ञों की टीम द्वारा लिखे जाते हैं।", ar: "تُكتب مقالاتنا من قِبل فريق من خبراء القانون الدولي والمغتربين المخضرمين والمتخصصين في كل دولة." },
  "faq2.q": { fr: "À quelle fréquence de nouveaux articles sont-ils publiés ?", en: "How often are new articles published?", es: "¿Con qué frecuencia se publican nuevos artículos?", de: "Wie oft werden neue Artikel veröffentlicht?", pt: "Com que frequência são publicados novos artigos?", ru: "Как часто публикуются новые статьи?", ch: "新文章发布频率如何？", hi: "नए लेख कितनी बार प्रकाशित होते हैं?", ar: "كم مرة تُنشر مقالات جديدة؟" },
  "faq2.a": { fr: "Nous publions plusieurs nouveaux articles chaque semaine couvrant les nouvelles réglementations, les mises à jour pays, les guides pratiques et les actualités de l'expatriation. Abonnez-vous à notre newsletter pour être informé en temps réel.", en: "We publish several new articles each week covering new regulations, country updates, practical guides and expatriation news. Subscribe to our newsletter to be informed in real time.", es: "Publicamos varios artículos nuevos cada semana cubriendo nuevas regulaciones, actualizaciones de países, guías prácticas y noticias de expatriación.", de: "Wir veröffentlichen jede Woche mehrere neue Artikel zu neuen Regelungen, Länderaktualisierungen, praktischen Ratgebern und Auswanderungsnachrichten.", pt: "Publicamos vários novos artigos por semana cobrindo novas regulamentações, atualizações de países, guias práticos e notícias de expatriação.", ru: "Мы публикуем несколько новых статей каждую неделю по новым нормативным актам, обновлениям стран, практическим руководствам и новостям эмиграции.", ch: "我们每周发布多篇新文章，涵盖最新法规、各国更新、实用指南和移居资讯。订阅我们的新闻通讯，实时获取信息。", hi: "हम हर हफ्ते नई विनियमों, देश अपडेट, व्यावहारिक गाइड और प्रवासन समाचारों पर कई नए लेख प्रकाशित करते हैं।", ar: "ننشر عدة مقالات جديدة كل أسبوع تغطي اللوائح الجديدة وتحديثات الدول والأدلة العملية وأخبار الهجرة." },
  "faq3.q": { fr: "Les articles sont-ils disponibles dans toutes les langues ?", en: "Are articles available in all languages?", es: "¿Están los artículos disponibles en todos los idiomas?", de: "Sind Artikel in allen Sprachen verfügbar?", pt: "Os artigos estão disponíveis em todos os idiomas?", ru: "Доступны ли статьи на всех языках?", ch: "文章是否支持所有语言？", hi: "क्या लेख सभी भाषाओं में उपलब्ध हैं?", ar: "هل المقالات متاحة بجميع اللغات؟" },
  "faq3.a": { fr: "La majorité des articles sont disponibles en 9 langues : français, anglais, espagnol, allemand, portugais, russe, chinois, hindi et arabe. Certains articles peuvent n'être disponibles que dans certaines langues selon la pertinence géographique.", en: "Most articles are available in 9 languages: French, English, Spanish, German, Portuguese, Russian, Chinese, Hindi and Arabic. Some articles may only be available in certain languages depending on geographic relevance.", es: "La mayoría de los artículos están disponibles en 9 idiomas. Algunos pueden estar disponibles solo en ciertos idiomas según la relevancia geográfica.", de: "Die meisten Artikel sind in 9 Sprachen verfügbar. Einige Artikel sind möglicherweise nur in bestimmten Sprachen verfügbar, je nach geografischer Relevanz.", pt: "A maioria dos artigos está disponível em 9 idiomas. Alguns artigos podem estar disponíveis apenas em certos idiomas dependendo da relevância geográfica.", ru: "Большинство статей доступны на 9 языках. Некоторые статьи могут быть доступны только на определённых языках в зависимости от географической значимости.", ch: "大多数文章提供9种语言版本。部分文章可能根据地理相关性仅提供特定语言版本。", hi: "अधिकांश लेख 9 भाषाओं में उपलब्ध हैं। कुछ लेख भौगोलिक प्रासंगिकता के आधार पर केवल कुछ भाषाओं में उपलब्ध हो सकते हैं।", ar: "معظم المقالات متاحة بـ9 لغات. قد تكون بعض المقالات متاحة فقط بلغات معينة حسب الأهمية الجغرافية." },
  "faq4.q": { fr: "Comment soumettre un article ou suggérer un sujet ?", en: "How to submit an article or suggest a topic?", es: "¿Cómo enviar un artículo o sugerir un tema?", de: "Wie kann man einen Artikel einreichen oder ein Thema vorschlagen?", pt: "Como enviar um artigo ou sugerir um tema?", ru: "Как предложить статью или тему?", ch: "如何提交文章或建议主题？", hi: "लेख सबमिट कैसे करें या विषय कैसे सुझाएं?", ar: "كيف تقدم مقالاً أو تقترح موضوعاً؟" },
  "faq4.a": { fr: "Vous pouvez proposer un sujet d'article via notre formulaire de contact. Les blogueurs partenaires peuvent aussi soumettre leurs articles directement pour publication sur notre blog en rejoignant notre programme Blogger SOS-Expat.", en: "You can suggest an article topic via our contact form. Partner bloggers can also submit their articles directly for publication on our blog by joining our SOS-Expat Blogger program.", es: "Puedes proponer un tema de artículo a través de nuestro formulario de contacto. Los bloggers asociados también pueden enviar sus artículos directamente para publicación.", de: "Sie können ein Artikelthema über unser Kontaktformular vorschlagen. Partnerblogger können auch ihre Artikel direkt für die Veröffentlichung einreichen.", pt: "Pode propor um tema de artigo através do nosso formulário de contacto. Os bloggers parceiros também podem enviar os seus artigos diretamente para publicação.", ru: "Вы можете предложить тему статьи через нашу форму обратной связи. Партнёры-блоггеры также могут отправлять свои статьи для публикации в нашем блоге.", ch: "您可以通过联系表单建议文章主题。合作博主也可以通过加入SOS-Expat博主计划直接提交文章发布。", hi: "आप हमारे संपर्क फॉर्म के माध्यम से लेख विषय सुझा सकते हैं। साझेदार ब्लॉगर हमारे SOS-Expat ब्लॉगर प्रोग्राम में शामिल होकर प्रकाशन के लिए सीधे लेख सबमिट कर सकते हैं।", ar: "يمكنك اقتراح موضوع مقالة عبر نموذج التواصل. يمكن للمدونين الشركاء أيضاً تقديم مقالاتهم مباشرة للنشر في مدونتنا من خلال الانضمام إلى برنامج المدونين SOS-Expat." },
};

const t = (key: string, lang: string): string =>
  T[key]?.[lang] || T[key]?.["fr"] || key;

// ============================================================
// TYPES & CONSTANTS
// ============================================================

type Category = "all" | "country" | "thematic" | "practical" | "faq" | "news";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: Category;
  categoryLabel: string;
  date: string;
  readTime: number;
  tags: string[];
  featured?: boolean;
  imageUrl?: string;
  imageGradient: string;
}

// Blog API public endpoint
const BLOG_API = "https://sos-expat.com/api/v1/public";

// Map blog category slugs → SPA Category type
const CATEGORY_MAP: Record<string, Category> = {
  "fiches-pays":        "country",
  "fiches-thematiques": "thematic",
  "fiches-pratiques":   "practical",
};

const CATEGORY_LABEL_MAP: Record<string, Record<string, string>> = {
  "fiches-pays":        { fr: "Fiches pays",        en: "Country Guides" },
  "fiches-thematiques": { fr: "Fiches thematiques", en: "Thematic Guides" },
  "fiches-pratiques":   { fr: "Guides pratiques",   en: "Practical Guides" },
};

// Category gradient by slug
const GRADIENT_MAP: Record<string, string> = {
  "fiches-pays":        "from-red-600 to-orange-500",
  "fiches-thematiques": "from-violet-600 to-purple-500",
  "fiches-pratiques":   "from-emerald-600 to-teal-500",
};

// Blog article URL: /{locale}/{articles-segment}/{slug}
// NOTE: app uses "ch" internally for Chinese, but URL/API uses "zh"
const LANG_LOCALE: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  ru: "ru-ru", pt: "pt-pt", zh: "zh-cn", ch: "zh-cn", hi: "hi-in", ar: "ar-sa",
};
const ARTICLES_SEGMENT: Record<string, string> = {
  fr: "articles", en: "articles", es: "articulos", de: "artikel",
  pt: "artigos", ru: "stati", zh: "wenzhang", ch: "wenzhang", hi: "lekh", ar: "maqalat",
};
function articleUrl(lang: string, slug: string): string {
  const locale = LANG_LOCALE[lang] ?? "fr-fr";
  const segment = ARTICLES_SEGMENT[lang] ?? "articles";
  return `/${locale}/${segment}/${slug}`;
}

// Raw article from Blog API
interface RawArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string | null;
  content_type: string;
  featured_image_url: string | null;
  reading_time_minutes: number;
  published_at: string;
  tags: string[];
  is_featured: boolean;
}

function mapRawArticle(raw: RawArticle, lang: string): Article {
  const catSlug = raw.category ?? "";
  return {
    id:            raw.id,
    slug:          raw.slug,
    title:         raw.title,
    excerpt:       raw.excerpt,
    category:      CATEGORY_MAP[catSlug] ?? "practical",
    categoryLabel: CATEGORY_LABEL_MAP[catSlug]?.[lang] ?? CATEGORY_LABEL_MAP[catSlug]?.["fr"] ?? catSlug,
    date:          raw.published_at,
    readTime:      raw.reading_time_minutes,
    tags:          raw.tags,
    featured:      raw.is_featured,
    imageUrl:      raw.featured_image_url ?? undefined,
    imageGradient: GRADIENT_MAP[catSlug] ?? "from-red-600 to-rose-500",
  };
}

const CATEGORIES: { key: Category; labelKey: string }[] = [
  { key: "all", labelKey: "cat.all" },
  { key: "country", labelKey: "cat.country" },
  { key: "thematic", labelKey: "cat.thematic" },
  { key: "practical", labelKey: "cat.practical" },
];

const POPULAR_TAGS = [
  "Visa",
  "Logement",
  "Fiscalite",
  "Sante",
  "Emploi",
  "Assurance",
  "Demenagement",
  "Banque",
  "Education",
  "Retraite",
];

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

function CategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
      <Tag className="w-3 h-3" />
      {label}
    </span>
  );
}

function ArticleCard({
  article,
  lang,
  index,
}: {
  article: Article;
  lang: string;
  index: number;
}) {
  return (
    <motion.article
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-red-100 cursor-pointer"
    >
      <a href={articleUrl(lang, article.slug)} aria-label={article.title}>
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}>
              <BookOpen className="w-12 h-12 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge label={article.categoryLabel} />
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {article.readTime} {t("read.time", lang)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {article.title}
          </h3>

          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {new Date(article.date).toLocaleDateString(
                lang === "fr" ? "fr-FR" : "en-US",
                { day: "numeric", month: "short", year: "numeric" }
              )}
            </span>
            <span className="text-xs font-medium text-red-600 group-hover:underline">
              {t("read.article", lang)} →
            </span>
          </div>
        </div>
      </a>
    </motion.article>
  );
}

function FeaturedCard({
  article,
  lang,
}: {
  article: Article;
  lang: string;
}) {
  return (
    <motion.article
      variants={fadeInUp}
      custom={0}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="group relative bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
    >
      <a href={articleUrl(lang, article.slug)} aria-label={article.title}>
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative h-64 md:h-full min-h-[280px] overflow-hidden">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${article.imageGradient} flex items-center justify-center`}>
                <BookOpen className="w-16 h-16 text-white/20" />
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-gray-900 backdrop-blur-sm shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                {t("featured.badge", lang)}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <CategoryBadge label={article.categoryLabel} />
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime} {t("read.time", lang)}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-red-600 transition-colors leading-tight">
              {article.title}
            </h2>

            <p className="text-base text-gray-500 mb-6 leading-relaxed">
              {article.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {new Date(article.date).toLocaleDateString(
                  lang === "fr" ? "fr-FR" : "en-US",
                  { day: "numeric", month: "long", year: "numeric" }
                )}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 group-hover:gap-2.5 transition-all">
                {t("read.article", lang)}
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </a>
    </motion.article>
  );
}

function Sidebar({
  lang,
  articles,
  activeCategory,
  onCategoryClick,
  onTagClick,
}: {
  lang: string;
  articles: Article[];
  activeCategory: Category;
  onCategoryClick: (cat: Category) => void;
  onTagClick: (tag: string) => void;
}) {
  const popular = articles.slice(0, 4);

  return (
    <aside className="space-y-8">
      {/* Popular articles */}
      {popular.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            {t("sidebar.popular", lang)}
          </h3>
          <ul className="space-y-4">
            {popular.map((a, i) => (
              <li key={a.id} className="group flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <a
                    href={articleUrl(lang, a.slug)}
                    className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-red-600 transition-colors"
                  >
                    {a.title}
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.readTime} {t("read.time", lang)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600" />
          {t("sidebar.categories", lang)}
        </h3>
        <ul className="space-y-1">
          {CATEGORIES.filter((c) => c.key !== "all").map((cat) => {
            const count = articles.filter((a) => a.category === cat.key).length;
            const isActive = activeCategory === cat.key;
            return (
              <li key={cat.key}>
                <button
                  type="button"
                  onClick={() => onCategoryClick(cat.key)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors text-left ${
                    isActive
                      ? "bg-red-50 text-red-700"
                      : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="text-sm font-medium">{t(cat.labelKey, lang)}</span>
                  {count > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}>
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tags cloud */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-red-600" />
          {t("sidebar.tags", lang)}
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-full border border-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ lang }: { lang: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {t("empty.title", lang)}
      </h3>
      <p className="text-sm text-gray-400">{t("empty.subtitle", lang)}</p>
    </motion.div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Articles() {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language ||
    parseLocaleFromPath(location.pathname)?.lang ||
    "fr") as string;
  const localeSlug = LANG_LOCALE[lang] ?? "fr-fr";
  const _urlLangA = lang === "ch" ? "zh" : lang;
  const _regionMapA: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonicalArticles = `https://sos-expat.com/${_urlLangA}-${_regionMapA[lang] ?? lang}/${getTranslatedRouteSlug("articles" as any, lang as any) || "articles"}`;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch from Blog API
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(`${BLOG_API}/articles?lang=${lang}&per_page=50`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const raw: RawArticle[] = json.data ?? [];
        setAllArticles(raw.map((r) => mapRawArticle(r, lang)));
      })
      .catch(() => {/* network error: show empty state */})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lang]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    let list = allArticles;

    if (activeCategory !== "all") {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return list;
  }, [search, activeCategory, allArticles]);

  const featured = filteredArticles.find((a) => a.featured);
  const gridArticles = filteredArticles.filter((a) => a !== featured);

  const handleTagClick = (tag: string) => {
    setSearch(tag);
    setActiveCategory("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) return;
    setNewsletterSent(true);
    setNewsletterEmail("");
  };

  return (
    <Layout>
      <SEOHead
        title={`${t("page.title", lang)} | SOS-Expat`}
        description={t("page.subtitle", lang)}
        canonicalUrl={canonicalArticles}
        ogType="website"
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("page.title", lang) },
      ]} />
      <FAQPageSchema
        faqs={[1,2,3,4].map(i => ({
          question: t(`faq${i}.q`, lang),
          answer: t(`faq${i}.a`, lang),
        }))}
        pageUrl={canonicalArticles}
        inLanguage={lang === "ch" ? "zh" : lang}
      />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {t("home", lang)}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("page.title", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
        {/* Grille décorative */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Halo rouge */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400 mb-6">
              <BookOpen className="w-3.5 h-3.5" />
              {t("blog.badge", lang)}
            </span>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl mb-4">
              {t("page.title", lang)}
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              {t("page.subtitle", lang)}
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-red-400 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search.placeholder", lang)}
                aria-label={t("search.placeholder", lang)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/10 border border-white/10 text-sm text-white placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/40 backdrop-blur transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* =============== CATEGORY PILLS =============== */}
      {/* top-0 mobile / lg:top-[132px] = header (80px) + ContentNav (~52px) */}
      <section className="sticky top-0 lg:top-[132px] z-20 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    isActive
                      ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-100"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {t(cat.labelKey, lang)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =============== CONTENT =============== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <EmptyState lang={lang} />
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-10">
            {/* Main column */}
            <div className="space-y-10">
              {/* Featured article */}
              {featured && <FeaturedCard article={featured} lang={lang} />}

              {/* Articles grid */}
              {gridArticles.length > 0 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {gridArticles.map((article, i) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      lang={lang}
                      index={i}
                    />
                  ))}
                </motion.div>
              )}

              {/* Sidebar mobile: displayed below articles on small screens */}
              {!loading && allArticles.length > 0 && (
                <div className="lg:hidden">
                  <Sidebar lang={lang} articles={allArticles} activeCategory={activeCategory} onCategoryClick={setActiveCategory} onTagClick={handleTagClick} />
                </div>
              )}
            </div>

            {/* Sidebar (desktop only) */}
            <div className="hidden lg:block">
              <div className="sticky top-20">
                <Sidebar lang={lang} articles={allArticles} activeCategory={activeCategory} onCategoryClick={setActiveCategory} onTagClick={handleTagClick} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ============= NEWSLETTER CTA ============= */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-red-900 py-16 sm:py-20">
          {/* Decorative */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600/20 mb-6">
                <Mail className="w-6 h-6 text-red-400" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                {t("newsletter.title", lang)}
              </h2>
              <p className="text-base text-gray-400 mb-8 max-w-md mx-auto">
                {t("newsletter.subtitle", lang)}
              </p>

              {newsletterSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 max-w-md mx-auto"
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{t("newsletter.success", lang)}</span>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  noValidate
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t("newsletter.placeholder", lang)}
                    aria-label={t("newsletter.placeholder", lang)}
                    required
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 backdrop-blur transition-all"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-colors flex items-center justify-center gap-2"
                  >
                    {t("newsletter.cta", lang)}
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-14 border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t("faq.title", lang)}</h2>
          <div className="space-y-3">
            {[1,2,3,4].map((i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900">{t(`faq${i}.q`, lang)}</span>
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">
                      {t(`faq${i}.a`, lang)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContentSectionLinks currentSection="articles" lang={lang} localeSlug={localeSlug} />
    </Layout>
  );
}

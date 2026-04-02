import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Plane,
  Landmark,
  HeartPulse,
  GraduationCap,
  Home,
  Wallet,
  Briefcase,
  Car,
  Wifi,
  Scale,
  Users,
  ShieldCheck,
  PackageOpen,
  Rocket,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Globe,
  LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FAQPageSchema from "@/components/seo/FAQPageSchema";
import ContentSectionLinks from "@/components/layout/ContentSectionLinks";
import { useApp } from "@/contexts/AppContext";
import { parseLocaleFromPath, getTranslatedRouteSlug } from "@/multilingual-system";

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  badge: { fr: "Guides Thematiques", en: "Thematic Guides", es: "Guías Temáticas", de: "Thematische Leitfäden", ru: "Тематические руководства", pt: "Guias Temáticos", ch: "专题指南", hi: "विषयगत गाइड", ar: "أدلة موضوعية" },
  h1: { fr: "Guides thematiques pour expatries", en: "Thematic guides for expats", es: "Guías temáticas para expatriados", de: "Thematische Ratgeber für Expats", ru: "Тематические руководства для экспатов", pt: "Guias temáticos para expatriados", ch: "外籍人士专题指南", hi: "प्रवासियों के लिए विषयगत गाइड", ar: "أدلة موضوعية للمغتربين" },
  subtitle: {
    fr: "Des ressources detaillees organisees par theme pour vous accompagner dans chaque aspect de votre vie a l'etranger, quel que soit votre pays de destination.",
    en: "Detailed resources organized by theme to support you through every aspect of life abroad, regardless of your destination country.",
    es: "Recursos detallados organizados por tema para acompañarte en cada aspecto de tu vida en el extranjero.",
    de: "Detaillierte Ressourcen nach Themen geordnet, die Sie bei jedem Aspekt des Lebens im Ausland begleiten.",
    ru: "Подробные ресурсы, организованные по темам, для поддержки на каждом этапе жизни за рубежом.",
    pt: "Recursos detalhados organizados por tema para acompanhá-lo em cada aspeto da sua vida no estrangeiro.",
    ch: "按主题整理的详细资源，助您应对海外生活的方方面面，无论您的目的地是哪个国家。",
    hi: "विषय-वार व्यवस्थित विस्तृत संसाधन जो विदेश में जीवन के हर पहलू में आपका साथ देते हैं।",
    ar: "موارد مفصّلة منظّمة حسب الموضوع لمرافقتك في كل جانب من جوانب حياتك في الخارج.",
  },
  popularTitle: { fr: "Themes populaires", en: "Popular themes", es: "Temas populares", de: "Beliebte Themen", ru: "Популярные темы", pt: "Temas populares", ch: "热门专题", hi: "लोकप्रिय विषय", ar: "المواضيع الشائعة" },
  allThemesTitle: { fr: "Tous les themes", en: "All themes", es: "Todos los temas", de: "Alle Themen", ru: "Все темы", pt: "Todos os temas", ch: "所有专题", hi: "सभी विषय", ar: "جميع المواضيع" },
  articlesCount: { fr: "articles", en: "articles", es: "artículos", de: "Artikel", ru: "статей", pt: "artigos", ch: "篇文章", hi: "लेख", ar: "مقالات" },
  discover: { fr: "Decouvrir", en: "Discover", es: "Descubrir", de: "Entdecken", ru: "Открыть", pt: "Descobrir", ch: "探索", hi: "खोजें", ar: "اكتشف" },
  recentTitle: { fr: "Articles recents par theme", en: "Recent articles by theme", es: "Artículos recientes por tema", de: "Neueste Artikel nach Thema", ru: "Свежие статьи по темам", pt: "Artigos recentes por tema", ch: "按主题最新文章", hi: "विषयानुसार हालिया लेख", ar: "أحدث المقالات حسب الموضوع" },
  faqTitle: { fr: "Questions frequentes", en: "Frequently asked questions", es: "Preguntas frecuentes", de: "Häufig gestellte Fragen", ru: "Часто задаваемые вопросы", pt: "Perguntas frequentes", ch: "常见问题", hi: "अक्सर पूछे जाने वाले प्रश्न", ar: "الأسئلة الشائعة" },
  ctaTitle: { fr: "Besoin d'aide personnalisee ?", en: "Need personalized help?", es: "¿Necesitas ayuda personalizada?", de: "Persönliche Hilfe benötigt?", ru: "Нужна персональная помощь?", pt: "Precisa de ajuda personalizada?", ch: "需要个性化帮助？", hi: "व्यक्तिगत सहायता चाहिए?", ar: "هل تحتاج إلى مساعدة شخصية؟" },
  ctaSubtitle: {
    fr: "Nos experts expatriation sont disponibles pour repondre a vos questions specifiques par telephone.",
    en: "Our expatriation experts are available to answer your specific questions by phone.",
    es: "Nuestros expertos en expatriación están disponibles para responder sus preguntas específicas por teléfono.",
    de: "Unsere Auswanderungsexperten stehen Ihnen telefonisch für Ihre spezifischen Fragen zur Verfügung.",
    ru: "Наши эксперты по эмиграции готовы ответить на ваши вопросы по телефону.",
    pt: "Os nossos especialistas em expatriação estão disponíveis para responder às suas questões específicas por telefone.",
    ch: "我们的移居专家可通过电话解答您的具体问题。",
    hi: "हमारे प्रवास विशेषज्ञ फोन पर आपके विशिष्ट प्रश्नों का उत्तर देने के लिए उपलब्ध हैं।",
    ar: "خبراؤنا في الهجرة متاحون للإجابة على أسئلتك المحددة عبر الهاتف.",
  },
  ctaAnnuaire: { fr: "Consulter l'annuaire", en: "Browse the directory", es: "Consultar el directorio", de: "Verzeichnis durchsuchen", ru: "Открыть каталог", pt: "Consultar o directório", ch: "浏览目录", hi: "निर्देशिका देखें", ar: "تصفح الدليل" },
  ctaFichesPays: { fr: "Voir les fiches pays", en: "See country guides", es: "Ver guías por país", de: "Länderprofile ansehen", ru: "Смотреть страновые справки", pt: "Ver fichas de países", ch: "查看国家资料", hi: "देश गाइड देखें", ar: "عرض بطاقات الدول" },
  seoTitle: {
    fr: "Guides thematiques pour expatries | SOS Expat",
    en: "Thematic guides for expats | SOS Expat",
    es: "Guías temáticas para expatriados | SOS Expat",
    de: "Thematische Ratgeber für Expats | SOS Expat",
    ru: "Тематические руководства для экспатов | SOS Expat",
    pt: "Guias temáticos para expatriados | SOS Expat",
    ch: "外籍人士专题指南 | SOS Expat",
    hi: "प्रवासियों के लिए विषयगत गाइड | SOS Expat",
    ar: "أدلة موضوعية للمغتربين | SOS Expat",
  },
  seoDesc: {
    fr: "Guides thematiques complets pour expatries : visa, fiscalite, sante, scolarite, logement, banque et plus. Ressources organisees par theme pour reussir votre expatriation.",
    en: "Complete thematic guides for expats: visa, taxes, health, education, housing, banking and more. Resources organized by theme for a successful expatriation.",
    es: "Guías temáticas completas para expatriados: visa, impuestos, salud, educación, vivienda, banca y más. Recursos por tema para una expatriación exitosa.",
    de: "Umfassende thematische Ratgeber für Expats: Visum, Steuern, Gesundheit, Bildung, Wohnen, Bankwesen und mehr. Ressourcen nach Themen.",
    ru: "Подробные тематические руководства для экспатов: виза, налоги, здоровье, образование, жильё, банки и многое другое. Ресурсы по темам.",
    pt: "Guias temáticos completos para expatriados: visto, fiscalidade, saúde, educação, habitação, banca e mais. Recursos por tema.",
    ch: "外籍人士完整专题指南：签证、税务、医疗、教育、住房、银行等，按主题整理的移居资源。",
    hi: "प्रवासियों के लिए संपूर्ण विषयगत गाइड: वीज़ा, कर, स्वास्थ्य, शिक्षा, आवास, बैंकिंग और अधिक।",
    ar: "أدلة موضوعية شاملة للمغتربين: تأشيرة، ضرائب، صحة، تعليم، سكن، مصارف والمزيد. موارد مرتّبة حسب الموضوع.",
  },
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", ru: "Главная", pt: "Início", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadLabel: { fr: "Guides thematiques", en: "Thematic guides", es: "Guías temáticas", de: "Thematische Ratgeber", ru: "Тематические руководства", pt: "Guias temáticos", ch: "专题指南", hi: "विषयगत गाइड", ar: "أدلة موضوعية" },

  // Featured themes
  "visa.title": { fr: "Visa & Immigration", en: "Visa & Immigration" },
  "visa.desc": {
    fr: "Procedures de visa, permis de sejour, naturalisation et demarches consulaires pour chaque pays.",
    en: "Visa procedures, residence permits, naturalization and consular steps for each country.",
  },
  "tax.title": { fr: "Fiscalite internationale", en: "International taxation" },
  "tax.desc": {
    fr: "Conventions fiscales, declaration de revenus a l'etranger, optimisation legale et double imposition.",
    en: "Tax treaties, filing abroad, legal optimization and double taxation.",
  },
  "health.title": { fr: "Sante a l'etranger", en: "Healthcare abroad" },
  "health.desc": {
    fr: "Systemes de sante locaux, assurance maladie internationale, vaccinations et urgences medicales.",
    en: "Local healthcare systems, international health insurance, vaccinations and medical emergencies.",
  },
  "edu.title": { fr: "Scolarite & education", en: "Schooling & education" },
  "edu.desc": {
    fr: "Ecoles internationales, systemes educatifs, equivalences de diplomes et bourses d'etudes.",
    en: "International schools, education systems, diploma equivalences and scholarships.",
  },

  // All themes
  "housing.title": { fr: "Logement", en: "Housing" },
  "housing.desc": { fr: "Location, achat immobilier, bail et droits du locataire a l'etranger.", en: "Renting, buying property, leases and tenant rights abroad." },
  "bank.title": { fr: "Banque & finances", en: "Banking & finances" },
  "bank.desc": { fr: "Ouverture de compte, transferts internationaux, cartes et epargne.", en: "Account opening, international transfers, cards and savings." },
  "job.title": { fr: "Emploi", en: "Employment" },
  "job.desc": { fr: "Recherche d'emploi, contrats de travail, droit du travail local.", en: "Job search, work contracts, local labor law." },
  "transport.title": { fr: "Transport", en: "Transport" },
  "transport.desc": { fr: "Permis de conduire, transports en commun, import de vehicule.", en: "Driving license, public transport, vehicle import." },
  "telecom.title": { fr: "Telecommunications", en: "Telecommunications" },
  "telecom.desc": { fr: "Forfaits mobiles, internet, operateurs locaux et VPN.", en: "Mobile plans, internet, local operators and VPN." },
  "legal.title": { fr: "Juridique", en: "Legal" },
  "legal.desc": { fr: "Droit local, contrats, litiges et assistance juridique pour expatries.", en: "Local law, contracts, disputes and legal assistance for expats." },
  "community.title": { fr: "Communaute expat", en: "Expat community" },
  "community.desc": { fr: "Reseaux, associations, evenements et integration sociale.", en: "Networks, associations, events and social integration." },
  "insurance.title": { fr: "Assurances", en: "Insurance" },
  "insurance.desc": { fr: "Assurance habitation, auto, rapatriement et responsabilite civile.", en: "Home, auto, repatriation and liability insurance." },
  "moving.title": { fr: "Demenagement", en: "Moving" },
  "moving.desc": { fr: "Demenagement international, douanes, checklist et prestataires.", en: "International moving, customs, checklist and service providers." },
  "business.title": { fr: "Entrepreneuriat", en: "Entrepreneurship" },
  "business.desc": { fr: "Creation d'entreprise, statuts juridiques, freelance a l'etranger.", en: "Starting a business, legal structures, freelancing abroad." },

  // FAQ
  "faq1.q": { fr: "Qu'est-ce qu'une fiche thematique SOS Expat ?", en: "What is a SOS Expat thematic guide?" },
  "faq1.a": {
    fr: "Une fiche thematique est un guide complet sur un sujet precis de l'expatriation (visa, fiscalite, sante, etc.), regroupant conseils pratiques, informations legales et ressources utiles applicables a de nombreux pays.",
    en: "A thematic guide is a comprehensive guide on a specific expatriation topic (visa, taxes, health, etc.), bringing together practical advice, legal information and useful resources applicable to many countries.",
  },
  "faq2.q": { fr: "Comment sont organisees les fiches ?", en: "How are the guides organized?" },
  "faq2.a": {
    fr: "Les fiches sont classees par grande thematique (visa, logement, emploi, etc.). Chaque thematique contient plusieurs articles detailles couvrant les aspects specifiques du sujet.",
    en: "Guides are classified by major theme (visa, housing, employment, etc.). Each theme contains several detailed articles covering specific aspects of the topic.",
  },
  "faq3.q": { fr: "Les fiches sont-elles specifiques a un pays ?", en: "Are the guides country-specific?" },
  "faq3.a": {
    fr: "Les fiches thematiques couvrent les principes generaux applicables a la plupart des pays. Pour des informations specifiques a un pays, consultez nos fiches pays dediees.",
    en: "Thematic guides cover general principles applicable to most countries. For country-specific information, check our dedicated country guides.",
  },
  "faq4.q": { fr: "Puis-je contacter un expert sur un theme ?", en: "Can I contact an expert on a theme?" },
  "faq4.a": {
    fr: "Oui ! Depuis chaque fiche thematique, vous pouvez acceder a notre annuaire de prestataires specialises dans le domaine concerne et les contacter directement par telephone.",
    en: "Yes! From each thematic guide, you can access our directory of specialized providers in the relevant field and contact them directly by phone.",
  },
};

const t = (key: string, lang: string): string => T[key]?.[lang] || T[key]?.["fr"] || key;

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface ThemeItem {
  key: string;
  icon: LucideIcon;
  count: number;
  color: string;       // bg for circle
  colorText: string;   // text inside circle
}

const featuredThemes: ThemeItem[] = [
  { key: "visa", icon: Plane, count: 24, color: "bg-red-100", colorText: "text-red-600" },
  { key: "tax", icon: Landmark, count: 18, color: "bg-orange-100", colorText: "text-orange-600" },
  { key: "health", icon: HeartPulse, count: 21, color: "bg-rose-100", colorText: "text-rose-600" },
  { key: "edu", icon: GraduationCap, count: 15, color: "bg-amber-100", colorText: "text-amber-600" },
];

const allThemes: ThemeItem[] = [
  { key: "housing", icon: Home, count: 12, color: "bg-red-50", colorText: "text-red-500" },
  { key: "bank", icon: Wallet, count: 14, color: "bg-slate-100", colorText: "text-slate-600" },
  { key: "job", icon: Briefcase, count: 16, color: "bg-red-100", colorText: "text-red-600" },
  { key: "transport", icon: Car, count: 9, color: "bg-gray-100", colorText: "text-gray-600" },
  { key: "telecom", icon: Wifi, count: 7, color: "bg-rose-50", colorText: "text-rose-500" },
  { key: "legal", icon: Scale, count: 19, color: "bg-red-100", colorText: "text-red-700" },
  { key: "community", icon: Users, count: 11, color: "bg-slate-100", colorText: "text-slate-500" },
  { key: "insurance", icon: ShieldCheck, count: 13, color: "bg-gray-100", colorText: "text-gray-700" },
  { key: "moving", icon: PackageOpen, count: 8, color: "bg-red-50", colorText: "text-red-500" },
  { key: "business", icon: Rocket, count: 10, color: "bg-rose-100", colorText: "text-rose-600" },
];

interface RecentArticle {
  id: number;
  theme: string;
  titleFr: string;
  titleEn: string;
  date: string;
}

const recentArticles: RecentArticle[] = [
  { id: 1, theme: "visa", titleFr: "Visa digital nomad : top 10 des pays en 2026", titleEn: "Digital nomad visa: top 10 countries in 2026", date: "2026-03-28" },
  { id: 2, theme: "tax", titleFr: "Double imposition : comment l'eviter legalement", titleEn: "Double taxation: how to legally avoid it", date: "2026-03-25" },
  { id: 3, theme: "health", titleFr: "Assurance sante expat : comparatif 2026", titleEn: "Expat health insurance: 2026 comparison", date: "2026-03-22" },
  { id: 4, theme: "housing", titleFr: "Louer un appartement a Dubai : guide complet", titleEn: "Renting an apartment in Dubai: complete guide", date: "2026-03-20" },
  { id: 5, theme: "job", titleFr: "Travailler en remote depuis l'etranger : cadre legal", titleEn: "Working remotely from abroad: legal framework", date: "2026-03-18" },
  { id: 6, theme: "edu", titleFr: "Inscrire ses enfants dans une ecole internationale", titleEn: "Enrolling children in an international school", date: "2026-03-15" },
  { id: 7, theme: "legal", titleFr: "Contrat de travail local vs detachement : differences cles", titleEn: "Local contract vs posting: key differences", date: "2026-03-12" },
  { id: 8, theme: "bank", titleFr: "Ouvrir un compte bancaire aux USA en tant qu'expat", titleEn: "Opening a bank account in the USA as an expat", date: "2026-03-10" },
];

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FichesThematiques: React.FC = () => {
  const { language } = useApp();
  const location = useLocation();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";
  const _urlLangFT = lang === "ch" ? "zh" : lang;
  const _localeRegionFT: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonicalFT = `https://sos-expat.com/${_urlLangFT}-${_localeRegionFT[lang] ?? lang}/${getTranslatedRouteSlug("fiches-thematiques" as any, lang as any) || "fiches-thematiques"}`;

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <Layout>
      <SEOHead
        title={t("seoTitle", lang)}
        description={t("seoDesc", lang)}
        canonicalUrl={canonicalFT}
        ogType="website"
        keywords={
          lang === "fr"
            ? "fiches thematiques expatries, guides expatriation, visa, fiscalite internationale, sante expat, scolarite etranger"
            : "thematic guides expats, expatriation guides, visa, international taxation, expat healthcare, education abroad"
        }
      />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("breadLabel", lang) },
      ]} />
      <FAQPageSchema
        faqs={[1,2,3,4].map(i => ({
          question: t(`faq${i}.q`, lang),
          answer: t(`faq${i}.a`, lang),
        }))}
        pageUrl={canonicalFT}
        inLanguage={lang === "ch" ? "zh" : lang}
      />

      {/* ===== BREADCRUMB ===== */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li><a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">{t("home", lang)}</a></li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("breadLabel", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
        {/* Grid décorative */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Halo rouge */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400"
            >
              <BookOpen className="h-4 w-4" />
              {t("badge", lang)}
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              {t("h1", lang)}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-400"
            >
              {t("subtitle", lang)}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ===== POPULAR THEMES (bento) ===== */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-slate-900 sm:text-4xl"
          >
            <Sparkles className="mr-2 inline h-6 w-6 text-red-500" />
            {t("popularTitle", lang)}
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {featuredThemes.map((th) => {
              const Icon = th.icon;
              return (
                <motion.div
                  key={th.key}
                  variants={fadeUp}
                  whileHover={{ y: -6, boxShadow: "0 20px 50px -12px rgba(0,0,0,0.12)" }}
                  className="group relative flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-red-200"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${th.color}`}>
                    <Icon className={`h-7 w-7 ${th.colorText}`} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {t(`${th.key}.title`, lang)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {t(`${th.key}.desc`, lang)}
                  </p>
                  <div className="mt-4 flex w-full items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {th.count} {t("articlesCount", lang)}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-medium text-red-600 opacity-0 transition-opacity group-hover:opacity-100">
                      {t("discover", lang)}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== ALL THEMES GRID ===== */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-slate-900 sm:text-4xl"
          >
            <Globe className="mr-2 inline h-6 w-6 text-red-500" />
            {t("allThemesTitle", lang)}
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {allThemes.map((th) => {
              const Icon = th.icon;
              return (
                <motion.div
                  key={th.key}
                  variants={fadeUp}
                  whileHover={{ scale: 1.02 }}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-red-200"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${th.color}`}>
                    <Icon className={`h-6 w-6 ${th.colorText}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900">{t(`${th.key}.title`, lang)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t(`${th.key}.desc`, lang)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {th.count} {t("articlesCount", lang)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-red-500" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== RECENT ARTICLES (horizontal scroll) ===== */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-slate-900 sm:text-4xl"
          >
            {t("recentTitle", lang)}
          </motion.h2>

          <div className="mt-12 -mx-4 flex gap-5 overflow-x-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent snap-x snap-mandatory">
            {recentArticles.map((article) => {
              const theme = [...featuredThemes, ...allThemes].find((th) => th.key === article.theme);
              const Icon = theme?.icon || BookOpen;
              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="w-72 shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme?.color || "bg-slate-100"}`}>
                      <Icon className={`h-4 w-4 ${theme?.colorText || "text-slate-500"}`} />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {t(`${article.theme}.title`, lang)}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                    {lang === "en" ? article.titleEn : article.titleFr}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400">{article.date}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="text-center text-3xl font-bold text-slate-900 sm:text-4xl"
          >
            {t("faqTitle", lang)}
          </motion.h2>

          <div className="mt-12 space-y-3">
            {[1, 2, 3, 4].map((i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-6 py-5 text-left"
                  >
                    <span className="text-base font-medium text-slate-900">
                      {t(`faq${i}.q`, lang)}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key={`faq-body-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">
                          {t(`faq${i}.a`, lang)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-60 w-60 rounded-full bg-black/10 blur-3xl" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white sm:text-4xl">
            {t("ctaTitle", lang)}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-lg text-red-100">
            {t("ctaSubtitle", lang)}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to={`/${lang}/annuaire`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-red-600 shadow-lg transition-transform hover:scale-105"
            >
              {t("ctaAnnuaire", lang)}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={`/${lang}/fiches-pays`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition-transform hover:scale-105 hover:bg-white/20"
            >
              {t("ctaFichesPays", lang)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <ContentSectionLinks currentSection="fiches-thematiques" lang={lang} localeSlug={localeSlug} />
    </Layout>
  );
};

export default FichesThematiques;

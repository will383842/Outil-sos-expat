/**
 * Outils Interactifs — Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * UX: App-within-the-app, sidebar desktop, bottom tabs mobile
 * Tools: Checklist demenagement (full), others placeholder
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Calculator,
  BarChart3,
  ClipboardCheck,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  FileDown,
  Bell,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ============================================================
// I18N
// ============================================================

const T: Record<string, Record<string, string>> = {
  pageTitle: {
    fr: "Outils Interactifs pour Expatries",
    en: "Interactive Tools for Expats",
  },
  pageDesc: {
    fr: "Calculateurs, comparateurs et checklists pour preparer votre expatriation en toute serenite.",
    en: "Calculators, comparators and checklists to prepare your expatriation with confidence.",
  },
  toolCostOfLiving: { fr: "Calculateur cout de vie", en: "Cost of Living Calculator" },
  toolCountryCompare: { fr: "Comparateur de pays", en: "Country Comparator" },
  toolChecklist: { fr: "Checklist demenagement", en: "Moving Checklist" },
  toolCurrency: { fr: "Convertisseur devises", en: "Currency Converter" },
  comingSoon: { fr: "Bientot disponible", en: "Coming soon" },
  comingSoonDesc: {
    fr: "Cet outil est en cours de developpement. Soyez notifie des sa sortie !",
    en: "This tool is under development. Get notified when it launches!",
  },
  notifyMe: { fr: "Me notifier", en: "Notify me" },
  notified: { fr: "Vous serez notifie !", en: "You will be notified!" },
  checklistTitle: { fr: "Checklist Demenagement International", en: "International Moving Checklist" },
  checklistDesc: {
    fr: "Ne rien oublier pour votre expatriation. Cochez chaque etape au fur et a mesure de votre preparation.",
    en: "Don't forget anything for your move abroad. Check off each step as you prepare.",
  },
  completed: { fr: "termine", en: "completed" },
  reset: { fr: "Reinitialiser", en: "Reset" },
  exportPdf: { fr: "Exporter PDF", en: "Export PDF" },
  catBefore: { fr: "Avant le depart", en: "Before departure" },
  catDocuments: { fr: "Documents", en: "Documents" },
  catHousing: { fr: "Logement", en: "Housing" },
  catAdmin: { fr: "Administratif", en: "Administrative" },
  encourageStart: {
    fr: "Commencez a cocher les etapes de votre preparation !",
    en: "Start checking off your preparation steps!",
  },
  encourageProgress: {
    fr: "Bien joue ! Vous avancez dans votre preparation.",
    en: "Well done! You're making progress.",
  },
  encourageAlmost: {
    fr: "Presque termine ! Courage, vous y etes presque.",
    en: "Almost there! Keep going, you're nearly done.",
  },
  encourageDone: {
    fr: "Felicitations ! Vous etes pret pour votre nouvelle aventure !",
    en: "Congratulations! You're ready for your new adventure!",
  },
  relatedTitle: { fr: "Explorez aussi", en: "Also explore" },
  costDesc: {
    fr: "Estimez votre budget mensuel dans plus de 100 pays.",
    en: "Estimate your monthly budget in 100+ countries.",
  },
  compareDesc: {
    fr: "Comparez qualite de vie, salaires et cout entre deux pays.",
    en: "Compare quality of life, salaries and cost between two countries.",
  },
  currencyDesc: {
    fr: "Convertissez vos devises en temps reel avec les taux du jour.",
    en: "Convert currencies in real-time with today's rates.",
  },
};

function t(key: string, lang: string): string {
  return T[key]?.[lang] || T[key]?.["fr"] || key;
}

// ============================================================
// TOOLS CONFIG
// ============================================================

type ToolId = "checklist" | "cost" | "compare" | "currency";

interface ToolDef {
  id: ToolId;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  implemented: boolean;
}

const TOOLS: ToolDef[] = [
  { id: "cost", icon: Calculator, labelKey: "toolCostOfLiving", descKey: "costDesc", implemented: false },
  { id: "compare", icon: BarChart3, labelKey: "toolCountryCompare", descKey: "compareDesc", implemented: false },
  { id: "checklist", icon: ClipboardCheck, labelKey: "toolChecklist", descKey: "checklistDesc", implemented: true },
  { id: "currency", icon: ArrowRightLeft, labelKey: "toolCurrency", descKey: "currencyDesc", implemented: false },
];

// ============================================================
// CHECKLIST DATA
// ============================================================

interface CheckItem {
  id: string;
  labelFr: string;
  labelEn: string;
  noteFr?: string;
  noteEn?: string;
}

interface CheckCategory {
  id: string;
  titleKey: string;
  items: CheckItem[];
}

const CHECKLIST_CATEGORIES: CheckCategory[] = [
  {
    id: "before",
    titleKey: "catBefore",
    items: [
      { id: "b1", labelFr: "Rechercher le pays de destination", labelEn: "Research destination country", noteFr: "Culture, climat, cout de vie", noteEn: "Culture, climate, cost of living" },
      { id: "b2", labelFr: "Etablir un budget previsionnel", labelEn: "Create a budget forecast" },
      { id: "b3", labelFr: "Souscrire une assurance sante internationale", labelEn: "Get international health insurance" },
      { id: "b4", labelFr: "Prevenir employeur / ecole des enfants", labelEn: "Notify employer / children's school" },
      { id: "b5", labelFr: "Ouvrir un compte bancaire a l'etranger", labelEn: "Open a bank account abroad", noteFr: "Wise, N26 ou banque locale", noteEn: "Wise, N26 or local bank" },
      { id: "b6", labelFr: "Resilier ou transferer les abonnements", labelEn: "Cancel or transfer subscriptions", noteFr: "Internet, telephone, electricite", noteEn: "Internet, phone, electricity" },
    ],
  },
  {
    id: "documents",
    titleKey: "catDocuments",
    items: [
      { id: "d1", labelFr: "Passeport a jour (6 mois de validite min.)", labelEn: "Valid passport (6 months minimum)" },
      { id: "d2", labelFr: "Visa / permis de sejour", labelEn: "Visa / residence permit" },
      { id: "d3", labelFr: "Permis de conduire international", labelEn: "International driving license" },
      { id: "d4", labelFr: "Copies certifiees des diplomes", labelEn: "Certified copies of degrees", noteFr: "Apostille si necessaire", noteEn: "Apostille if needed" },
      { id: "d5", labelFr: "Carnet de vaccination a jour", labelEn: "Updated vaccination record" },
    ],
  },
  {
    id: "housing",
    titleKey: "catHousing",
    items: [
      { id: "h1", labelFr: "Trouver un logement temporaire", labelEn: "Find temporary housing", noteFr: "Airbnb, colocation, hotel", noteEn: "Airbnb, shared housing, hotel" },
      { id: "h2", labelFr: "Organiser le demenagement des affaires", labelEn: "Organize moving of belongings" },
      { id: "h3", labelFr: "Souscrire assurance habitation", labelEn: "Get housing insurance" },
      { id: "h4", labelFr: "Configurer les services (eau, electricite, internet)", labelEn: "Set up utilities (water, electricity, internet)" },
    ],
  },
  {
    id: "admin",
    titleKey: "catAdmin",
    items: [
      { id: "a1", labelFr: "S'inscrire au consulat / ambassade", labelEn: "Register at consulate / embassy" },
      { id: "a2", labelFr: "Transferer le courrier postal", labelEn: "Forward postal mail" },
      { id: "a3", labelFr: "Declaration fiscale de depart", labelEn: "Tax departure declaration" },
      { id: "a4", labelFr: "Informer la securite sociale / mutuelle", labelEn: "Notify social security / insurance" },
      { id: "a5", labelFr: "Procuration si necessaire", labelEn: "Power of attorney if needed", noteFr: "Pour gestion de biens restes au pays", noteEn: "For managing assets left behind" },
    ],
  },
];

const ALL_ITEM_IDS = CHECKLIST_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
const LS_CHECKED_KEY = "outils_checklist_checked";

// ============================================================
// ANIMATIONS
// ============================================================

const fadeSlide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25, ease: "easeOut" },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

// ============================================================
// COMPONENT: Placeholder Tool
// ============================================================

function PlaceholderTool({ tool, lang }: { tool: ToolDef; lang: string }) {
  const [notified, setNotified] = useState(false);
  const Icon = tool.icon;

  return (
    <motion.div {...fadeSlide} className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t(tool.labelKey, lang)}</h2>
        <p className="text-gray-500 mb-2 text-lg">{t("comingSoon", lang)}</p>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">{t("comingSoonDesc", lang)}</p>
        <button
          onClick={() => setNotified(true)}
          disabled={notified}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            notified
              ? "bg-green-50 text-green-700 cursor-default"
              : "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 hover:shadow-red-600/30"
          }`}
        >
          {notified ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t("notified", lang)}
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              {t("notifyMe", lang)}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// COMPONENT: Checklist Tool
// ============================================================

function ChecklistTool({ lang }: { lang: string }) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LS_CHECKED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(CHECKLIST_CATEGORIES.map((c) => c.id))
  );

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(LS_CHECKED_KEY, JSON.stringify(Array.from(checked)));
  }, [checked]);

  const toggleItem = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((catId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setChecked(new Set());
    localStorage.removeItem(LS_CHECKED_KEY);
  }, []);

  const total = ALL_ITEM_IDS.length;
  const done = checked.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const encouragement = useMemo(() => {
    if (pct === 0) return t("encourageStart", lang);
    if (pct < 50) return t("encourageProgress", lang);
    if (pct < 100) return t("encourageAlmost", lang);
    return t("encourageDone", lang);
  }, [pct, lang]);

  return (
    <motion.div {...fadeSlide} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          {t("checklistTitle", lang)}
        </h2>
        <p className="text-gray-500 leading-relaxed">{t("checklistDesc", lang)}</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">
            {done}/{total} {t("completed", lang)}
          </span>
          <span className="text-sm font-bold text-red-600">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500 flex items-center gap-1.5">
          {pct === 100 && <Sparkles className="w-4 h-4 text-yellow-500" />}
          {encouragement}
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const isOpen = openCategories.has(cat.id);
          const catDone = cat.items.filter((i) => checked.has(i.id)).length;

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                  <span className="font-semibold text-slate-800">{t(cat.titleKey, lang)}</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {catDone}/{cat.items.length}
                </span>
              </button>

              {/* Items */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <motion.ul className="px-5 pb-4 space-y-1" variants={stagger} initial="initial" animate="animate">
                      {cat.items.map((item) => {
                        const isChecked = checked.has(item.id);
                        const label = lang === "en" ? item.labelEn : item.labelFr;
                        const note = lang === "en" ? item.noteEn : item.noteFr;

                        return (
                          <motion.li
                            key={item.id}
                            variants={fadeSlide}
                            className="flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => toggleItem(item.id)}
                          >
                            <motion.div
                              className="mt-0.5 flex-shrink-0"
                              whileTap={{ scale: 0.85 }}
                            >
                              {isChecked ? (
                                <CheckCircle2 className="w-5 h-5 text-red-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm leading-snug transition-colors duration-200 ${
                                  isChecked ? "text-gray-400 line-through" : "text-slate-700"
                                }`}
                              >
                                {label}
                              </span>
                              {note && (
                                <p className="text-xs text-gray-400 mt-0.5">{note}</p>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t("reset", lang)}
        </button>
        <button
          onClick={() => {
            // PDF export placeholder
            alert("PDF export coming soon");
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
        >
          <FileDown className="w-4 h-4" />
          {t("exportPdf", lang)}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// COMPONENT: Related Tool Card
// ============================================================

function RelatedToolCard({
  tool,
  lang,
  onSelect,
}: {
  tool: ToolDef;
  lang: string;
  onSelect: (id: ToolId) => void;
}) {
  const Icon = tool.icon;
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(tool.id)}
      className="bg-white rounded-2xl border border-gray-100 p-5 text-left shadow-sm hover:shadow-md transition-shadow w-full group"
    >
      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
        <Icon className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{t(tool.labelKey, lang)}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-3">{t(tool.descKey, lang)}</p>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
        {tool.implemented ? (
          <>
            {lang === "en" ? "Open" : "Ouvrir"}
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          <>
            {t("comingSoon", lang)}
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </span>
    </motion.button>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const Outils: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";

  const [activeTool, setActiveTool] = useState<ToolId>("checklist");

  const activeToolDef = TOOLS.find((t) => t.id === activeTool)!;
  const relatedTools = TOOLS.filter((t) => t.id !== activeTool).slice(0, 3);

  return (
    <Layout>
      <SEOHead
        title={t("pageTitle", lang)}
        description={t("pageDesc", lang)}
      />
      <BreadcrumbSchema items={[
        { name: lang === "en" ? "Home" : "Accueil", url: `/${localeSlug}` },
        { name: t("pageTitle", lang) },
      ]} />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {lang === "en" ? "Home" : "Accueil"}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{lang === "en" ? "Tools" : "Outils"}</li>
          </ol>
        </div>
      </nav>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Desktop layout: sidebar + content */}
          <div className="flex gap-8">
            {/* Sidebar - desktop only */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:block w-64 flex-shrink-0"
            >
              <div className="sticky top-24">
                <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 border-l-[3px] ${
                          isActive
                            ? "bg-red-50 text-red-600 border-l-red-600"
                            : "text-slate-600 border-l-transparent hover:bg-gray-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-red-600" : "text-gray-400"}`} />
                        <span className="truncate">{t(tool.labelKey, lang)}</span>
                        {!tool.implemented && (
                          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </motion.aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 pb-24 md:pb-0">
              <AnimatePresence mode="wait">
                <motion.div key={activeTool}>
                  {activeToolDef.implemented ? (
                    <ChecklistTool lang={lang} />
                  ) : (
                    <PlaceholderTool tool={activeToolDef} lang={lang} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Related tools */}
              <section className="mt-12">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  {t("relatedTitle", lang)}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedTools.map((tool) => (
                    <RelatedToolCard
                      key={tool.id}
                      tool={tool}
                      lang={lang}
                      onSelect={setActiveTool}
                    />
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>

        {/* Mobile bottom tabs */}
        <motion.nav
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50"
        >
          <div className="flex items-stretch">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors duration-200 relative ${
                    isActive ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute top-0 inset-x-3 h-[3px] bg-red-600 rounded-b-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold truncate max-w-[72px]">
                    {t(tool.labelKey, lang).split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Safe area bottom padding for notched phones */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </motion.nav>
      </div>
    </Layout>
  );
};

export default Outils;

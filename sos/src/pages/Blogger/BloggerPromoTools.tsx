/**
 * BloggerPromoTools - Promotional tools for bloggers
 *
 * Features:
 * - Dynamic widgets from admin console (Firestore)
 * - Filter by type (button/banner) and target (client/recruitment)
 * - Filter by dimension
 * - Live preview with blogger's affiliate link
 * - Perfect UTM tracking for each widget
 * - QR codes with tracking
 * - Custom link generator
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase';
import {
  Link,
  Copy,
  CheckCircle,
  QrCode,
  Code,
  Wrench,
  ExternalLink,
  Loader2,
  Image,
  MousePointer,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Smartphone,
  Monitor,
  Maximize2,
  Target,
  Users,
  Download,
  Sparkles,
  Rocket,
  Calculator,
  CheckSquare,
  Square,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Zap,
  Gift,
  Star,
  DollarSign,
} from 'lucide-react';
import type {
  PromoWidget,
  PromoWidgetType,
  PromoWidgetTargetType,
  PromoWidgetDimension,
  BloggerWidgetStats,
} from '@/types/blogger';
import { PROMO_WIDGET_DIMENSIONS } from '@/types/blogger';

// ============================================================================
// UI STYLES
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
  select: "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
  badge: {
    purple: "px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full",
    green: "px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full",
    blue: "px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full",
    orange: "px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full",
    new: "px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 rounded-full animate-pulse",
  },
} as const;

// Helper to check if widget is new (added in last 7 days)
const isWidgetNew = (widget: PromoWidget): boolean => {
  if (!widget.createdAt) return false;
  const createdDate = new Date(widget.createdAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return createdDate > sevenDaysAgo;
};

// Helper to get translated text from widget
const getTranslatedText = (
  defaultText: string | undefined,
  translations: Record<string, string> | undefined,
  language: string
): string => {
  if (!defaultText) return '';
  if (!translations) return defaultText;
  // Try exact match first, then fallback to default
  return translations[language] || defaultText;
};

// ============================================================================
// COMPONENT
// ============================================================================

const BloggerPromoTools: React.FC = () => {
  const { blogger, clientShareUrl, recruitmentShareUrl, isLoading: isBloggerLoading } = useBlogger();

  // Get blogger's language for translations
  const bloggerLanguage = blogger?.language || 'fr';

  // Widget state
  const [widgets, setWidgets] = useState<PromoWidget[]>([]);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);

  // Personal widget stats
  const [myWidgetStats, setMyWidgetStats] = useState<BloggerWidgetStats[]>([]);
  const [totalCopies, setTotalCopies] = useState(0);

  // Calculator state
  const [calcArticles, setCalcArticles] = useState(20);
  const [calcVisitsPerDay, setCalcVisitsPerDay] = useState(50);
  const [calcConversionRate, setCalcConversionRate] = useState(2);

  // Checklist state (persisted in localStorage)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('blogger_widget_checklist');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Filters
  const [filterType, setFilterType] = useState<PromoWidgetType | 'all'>('all');
  const [filterTarget, setFilterTarget] = useState<PromoWidgetTargetType | 'all'>('all');
  const [filterDimension, setFilterDimension] = useState<PromoWidgetDimension | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    maximize: true,
    links: true,
    buttons: true,
    banners: true,
    qr: false,
    generator: false,
  });

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Custom link generator
  const [customUrl, setCustomUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  // ============================================================================
  // FETCH WIDGETS
  // ============================================================================

  const fetchWidgets = useCallback(async () => {
    setIsLoadingWidgets(true);
    try {
      const widgetsRef = collection(db, 'blogger_promo_widgets');
      const q = query(
        widgetsRef,
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);

      const widgetsList: PromoWidget[] = [];
      snapshot.forEach((docSnap) => {
        widgetsList.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as PromoWidget);
      });

      setWidgets(widgetsList);
    } catch (err) {
      console.error('Error fetching widgets:', err);
    } finally {
      setIsLoadingWidgets(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // Fetch personal widget stats
  const fetchMyStats = useCallback(async () => {
    if (!blogger?.id) return;

    try {
      const statsRef = collection(db, 'bloggers', blogger.id, 'widget_stats');
      const snapshot = await getDocs(statsRef);

      const statsList: BloggerWidgetStats[] = [];
      let total = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BloggerWidgetStats;
        statsList.push(data);
        total += data.copies || 0;
      });

      // Sort by copies descending
      statsList.sort((a, b) => (b.copies || 0) - (a.copies || 0));

      setMyWidgetStats(statsList);
      setTotalCopies(total);
    } catch (err) {
      console.error('Error fetching widget stats:', err);
    }
  }, [blogger?.id]);

  useEffect(() => {
    fetchMyStats();
  }, [fetchMyStats]);

  // Track widget copy for this blogger
  const trackWidgetCopy = async (widget: PromoWidget) => {
    if (!blogger?.id) return;

    try {
      const statsRef = doc(db, 'bloggers', blogger.id, 'widget_stats', widget.id);
      const statsSnap = await getDoc(statsRef);

      if (statsSnap.exists()) {
        // Update existing
        await updateDoc(statsRef, {
          copies: increment(1),
          lastCopiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new
        await setDoc(statsRef, {
          widgetId: widget.id,
          widgetName: widget.name,
          widgetType: widget.type,
          copies: 1,
          lastCopiedAt: new Date().toISOString(),
          clicks: 0,
          conversions: 0,
          earnings: 0,
          updatedAt: new Date().toISOString(),
        });
      }

      // Refresh stats
      fetchMyStats();
    } catch (err) {
      console.error('Error tracking widget copy:', err);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const copyToClipboard = async (text: string, field: string, widget?: PromoWidget) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);

      // Track widget copy
      if (widget) {
        try {
          // Track global widget stats
          await updateDoc(doc(db, 'blogger_promo_widgets', widget.id), {
            clicks: increment(1),
          });
          // Track personal blogger stats
          await trackWidgetCopy(widget);
        } catch {
          // Ignore tracking errors
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateWidgetCode = (widget: PromoWidget): string => {
    const baseUrl = widget.targetType === 'client'
      ? 'https://sos-expat.com/call'
      : 'https://sos-expat.com/become-provider';

    const affiliateCode = widget.targetType === 'client'
      ? blogger?.affiliateCodeClient
      : blogger?.affiliateCodeRecruitment;

    // Get translated button text
    const buttonText = getTranslatedText(
      widget.buttonText,
      widget.buttonTextTranslations,
      bloggerLanguage
    );

    // Get translated alt text for images
    const altText = getTranslatedText(
      widget.altText,
      widget.altTextTranslations,
      bloggerLanguage
    );

    return widget.htmlTemplate
      .replace(/\{\{affiliateUrl\}\}/g, baseUrl)
      .replace(/\{\{utmSource\}\}/g, widget.utmSource)
      .replace(/\{\{utmMedium\}\}/g, widget.utmMedium)
      .replace(/\{\{utmCampaign\}\}/g, widget.utmCampaign)
      .replace(/\{\{widgetId\}\}/g, widget.trackingId)
      .replace(/\{\{affiliateCode\}\}/g, affiliateCode || 'UNKNOWN')
      .replace(/\{\{buttonText\}\}/g, buttonText)
      .replace(/\{\{altText\}\}/g, altText);
  };

  const generateCustomLink = () => {
    if (!customUrl) return;
    const separator = customUrl.includes('?') ? '&' : '?';
    const link = `${customUrl}${separator}utm_source=blogger&utm_medium=custom_link&utm_campaign=${blogger?.affiliateCodeClient}&ref=${blogger?.affiliateCodeClient}`;
    setGeneratedLink(link);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleChecklist = (item: string) => {
    setChecklist(prev => {
      const newChecklist = { ...prev, [item]: !prev[item] };
      localStorage.setItem('blogger_widget_checklist', JSON.stringify(newChecklist));
      return newChecklist;
    });
  };

  // Calculate potential earnings
  const potentialMonthlyClients = Math.round((calcArticles * calcVisitsPerDay * 30 * calcConversionRate) / 100);
  const potentialMonthlyEarnings = potentialMonthlyClients * 10;

  // Checklist items
  const checklistItems = [
    { id: 'top5', label: 'Ajouter un widget a mes 5 articles les plus populaires', priority: 'high' },
    { id: 'sidebar', label: 'Ajouter une banniere dans ma sidebar', priority: 'high' },
    { id: 'all_articles', label: 'Ajouter un bouton CTA dans tous mes articles', priority: 'medium' },
    { id: 'footer', label: 'Ajouter une banniere en footer de chaque article', priority: 'medium' },
    { id: 'new_article', label: 'Ecrire un nouvel article dedie a SOS-Expat', priority: 'low' },
    { id: 'social', label: 'Partager mes liens affilies sur mes reseaux sociaux', priority: 'low' },
  ];

  const completedCount = checklistItems.filter(item => checklist[item.id]).length;

  // ============================================================================
  // FILTERED WIDGETS
  // ============================================================================

  const filteredWidgets = widgets.filter(widget => {
    if (filterType !== 'all' && widget.type !== filterType) return false;
    if (filterTarget !== 'all' && widget.targetType !== filterTarget) return false;
    if (filterDimension !== 'all' && widget.dimension !== filterDimension) return false;
    return true;
  });

  const buttonWidgets = filteredWidgets.filter(w => w.type === 'button');
  const bannerWidgets = filteredWidgets.filter(w => w.type === 'banner');

  // Group banners by dimension
  const bannersByDimension = bannerWidgets.reduce((acc, widget) => {
    const dim = widget.dimension;
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(widget);
    return acc;
  }, {} as Record<string, PromoWidget[]>);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isBloggerLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <FormattedMessage id="blogger.tools.title" defaultMessage="Outils Promotionnels" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            <FormattedMessage
              id="blogger.tools.subtitle"
              defaultMessage="Widgets, liens et QR codes avec votre code d'affiliation intégré"
            />
          </p>
        </div>

        {/* New Widgets Alert */}
        {(() => {
          const newWidgetsCount = widgets.filter(isWidgetNew).length;
          if (newWidgetsCount === 0) return null;
          return (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5 text-yellow-900" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-yellow-800 dark:text-yellow-300">
                  <FormattedMessage
                    id="blogger.tools.newWidgets"
                    defaultMessage="{count} nouveaux widgets disponibles !"
                    values={{ count: newWidgetsCount }}
                  />
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <FormattedMessage
                    id="blogger.tools.newWidgets.desc"
                    defaultMessage="De nouveaux outils ont été ajoutés. Découvrez-les et intégrez-les dans vos articles !"
                  />
                </p>
              </div>
              <div className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 rounded-full text-sm font-bold">
                NEW
              </div>
            </div>
          );
        })()}

        {/* ================================================================== */}
        {/* MAXIMIZE EARNINGS SECTION - THE KEY TO SUCCESS */}
        {/* ================================================================== */}
        <div className={`${UI.card} overflow-hidden border-2 border-purple-300 dark:border-purple-700`}>
          <button
            onClick={() => toggleCategory('maximize')}
            className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:to-indigo-900/30 transition-colors"
          >
            <h2 className="text-lg font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              <FormattedMessage id="blogger.tools.maximize.title" defaultMessage="Maximisez vos gains !" />
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-400 text-yellow-900 rounded-full font-bold animate-pulse">
                IMPORTANT
              </span>
            </h2>
            {expandedCategories.maximize ? <ChevronUp className="w-5 h-5 text-purple-500" /> : <ChevronDown className="w-5 h-5 text-purple-500" />}
          </button>

          {expandedCategories.maximize && (
            <div className="p-6 space-y-6">
              {/* Key Message */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Gift className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-300 text-lg">
                      Le secret des top blogueurs
                    </h3>
                    <p className="text-green-700 dark:text-green-400 mt-1">
                      Ils ajoutent nos widgets a <strong>TOUS leurs anciens articles</strong> !
                      Un blogueur avec 50 articles peut generer <strong>500$+ par mois</strong> en revenus passifs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings Calculator */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-purple-500" />
                  Calculateur de revenus potentiels
                </h3>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Nombre d'articles
                    </label>
                    <input
                      type="number"
                      value={calcArticles}
                      onChange={(e) => setCalcArticles(Math.max(1, parseInt(e.target.value) || 1))}
                      className={UI.input}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Visites/jour (total)
                    </label>
                    <input
                      type="number"
                      value={calcVisitsPerDay}
                      onChange={(e) => setCalcVisitsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                      className={UI.input}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Taux de conversion (%)
                    </label>
                    <input
                      type="number"
                      value={calcConversionRate}
                      onChange={(e) => setCalcConversionRate(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 1)))}
                      className={UI.input}
                      min="0.1"
                      max="10"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white text-center">
                  <p className="text-sm opacity-90 mb-1">Revenus mensuels potentiels</p>
                  <p className="text-4xl font-black">${potentialMonthlyEarnings.toLocaleString()}</p>
                  <p className="text-sm opacity-90 mt-1">
                    {potentialMonthlyClients} clients × $10/client
                  </p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Basé sur {calcArticles} articles × {calcVisitsPerDay} visites/jour × {calcConversionRate}% conversion
                </p>
              </div>

              {/* Action Checklist */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-green-500" />
                    Checklist d'integration
                  </h3>
                  <span className="text-sm text-gray-500">
                    {completedCount}/{checklistItems.length} complete
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedCount / checklistItems.length) * 100}%` }}
                  />
                </div>

                <div className="space-y-2">
                  {checklistItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklist(item.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        checklist[item.id]
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {checklist[item.id] ? (
                        <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={checklist[item.id] ? 'line-through opacity-75' : ''}>
                        {item.label}
                      </span>
                      {item.priority === 'high' && !checklist[item.id] && (
                        <span className="ml-auto px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                          Priorite
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {completedCount === checklistItems.length && (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                    <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      Felicitations ! Vous avez complete toutes les etapes !
                    </p>
                  </div>
                )}
              </div>

              {/* Pro Tips */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5" />
                  Conseils pour maximiser vos conversions
                </h3>
                <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Placez le widget au debut</strong> de l'article (au-dessus de la ligne de flottaison)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Repetez 2-3 fois</strong> dans les longs articles (debut, milieu, fin)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Utilisez les bannieres sidebar</strong> - elles sont vues sur toutes les pages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Ecrivez des articles SEO</strong> cibles sur "avocat expatriation [pays]"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Mettez a jour vos anciens articles</strong> - c'est la qu'est l'argent facile !</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* PERSONAL WIDGET STATS SECTION */}
        {/* ================================================================== */}
        {myWidgetStats.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <FormattedMessage id="blogger.tools.myStats" defaultMessage="Mes statistiques widgets" />
              <span className={UI.badge.purple}>{totalCopies} copies</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myWidgetStats.slice(0, 6).map((stat) => (
                <div
                  key={stat.widgetId}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {stat.widgetName}
                    </h3>
                    <span className={stat.widgetType === 'button' ? UI.badge.blue : UI.badge.orange}>
                      {stat.widgetType === 'button' ? 'Bouton' : 'Banniere'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{stat.copies} copies</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <MousePointer className="w-3.5 h-3.5" />
                      <span>{stat.clicks} clics</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{stat.conversions} conv.</span>
                    </div>
                    <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>${stat.earnings.toFixed(2)}</span>
                    </div>
                  </div>

                  {stat.lastCopiedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Derniere copie: {new Date(stat.lastCopiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {myWidgetStats.length > 6 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Et {myWidgetStats.length - 6} autres widgets...
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              <span>Filtres:</span>
            </div>
            <select
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value as PromoWidgetTargetType | 'all')}
              className={UI.select}
            >
              <option value="all">Toutes les cibles</option>
              <option value="client">Clients ($10/appel)</option>
              <option value="recruitment">Partenaires ($5/appel)</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PromoWidgetType | 'all')}
              className={UI.select}
            >
              <option value="all">Tous les types</option>
              <option value="button">Boutons</option>
              <option value="banner">Bannieres</option>
            </select>
            {filterType === 'banner' && (
              <select
                value={filterDimension}
                onChange={(e) => setFilterDimension(e.target.value as PromoWidgetDimension | 'all')}
                className={UI.select}
              >
                <option value="all">Toutes les dimensions</option>
                {PROMO_WIDGET_DIMENSIONS.filter(d => d.value !== 'custom').map(dim => (
                  <option key={dim.value} value={dim.value}>{dim.labelFr}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* AFFILIATE LINKS SECTION */}
        {/* ================================================================== */}
        <div className={`${UI.card} overflow-hidden`}>
          <button
            onClick={() => toggleCategory('links')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="blogger.tools.links" defaultMessage="Vos liens d'affiliation" />
            </h2>
            {expandedCategories.links ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedCategories.links && (
            <div className="p-6 pt-0 space-y-4">
              {/* Client Link */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <label className="text-sm font-medium text-green-700 dark:text-green-400">
                    <FormattedMessage id="blogger.tools.clientLink" defaultMessage="Lien Client" />
                    <span className="ml-2 text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                      $10/appel
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientShareUrl}
                    readOnly
                    className={`${UI.input} text-sm font-mono`}
                  />
                  <button
                    onClick={() => copyToClipboard(clientShareUrl, 'client')}
                    className={`${UI.button.primary} px-4 flex items-center gap-2 whitespace-nowrap`}
                  >
                    {copiedField === 'client' ? (
                      <><CheckCircle className="w-4 h-4" /> Copié</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copier</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Utilisez ce lien pour référer des clients vers SOS-Expat
                </p>
              </div>

              {/* Recruitment Link */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  <label className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    <FormattedMessage id="blogger.tools.recruitLink" defaultMessage="Lien Partenaires" />
                    <span className="ml-2 text-xs bg-orange-200 dark:bg-orange-800 px-2 py-0.5 rounded-full">
                      $5/appel x 6 mois
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recruitmentShareUrl}
                    readOnly
                    className={`${UI.input} text-sm font-mono`}
                  />
                  <button
                    onClick={() => copyToClipboard(recruitmentShareUrl, 'recruit')}
                    className={`${UI.button.primary} px-4 flex items-center gap-2 whitespace-nowrap`}
                  >
                    {copiedField === 'recruit' ? (
                      <><CheckCircle className="w-4 h-4" /> Copié</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copier</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  Utilisez ce lien pour trouver des partenaires (avocats ou expatries aidant)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* BUTTON WIDGETS SECTION */}
        {/* ================================================================== */}
        {(filterType === 'all' || filterType === 'button') && buttonWidgets.length > 0 && (
          <div className={`${UI.card} overflow-hidden`}>
            <button
              onClick={() => toggleCategory('buttons')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-blue-500" />
                <FormattedMessage id="blogger.tools.buttons" defaultMessage="Boutons CTA" />
                <span className={UI.badge.blue}>{buttonWidgets.length}</span>
              </h2>
              {expandedCategories.buttons ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expandedCategories.buttons && (
              <div className="p-6 pt-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Copiez-collez le code HTML dans votre blog. Votre lien d'affiliation est automatiquement integre.
                </p>
                <div className="grid gap-4">
                  {buttonWidgets.map((widget) => (
                    <div key={widget.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Preview */}
                        <div className="flex-shrink-0 flex items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-lg min-w-[200px]">
                          <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            style={{
                              display: 'inline-block',
                              padding: widget.style?.padding || '12px 24px',
                              background: widget.style?.backgroundGradient || widget.style?.backgroundColor || '#8b5cf6',
                              color: widget.style?.textColor || '#ffffff',
                              textDecoration: 'none',
                              borderRadius: widget.style?.borderRadius || '8px',
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              fontSize: widget.style?.fontSize || '14px',
                              fontWeight: (widget.style?.fontWeight || '500') as React.CSSProperties['fontWeight'],
                              boxShadow: widget.style?.shadow,
                            }}
                          >
                            {getTranslatedText(widget.buttonText, widget.buttonTextTranslations, bloggerLanguage)}
                          </a>
                        </div>

                        {/* Info & Code */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {getTranslatedText(widget.name, widget.nameTranslations, bloggerLanguage)}
                            </h3>
                            {isWidgetNew(widget) && (
                              <span className={UI.badge.new}>NEW</span>
                            )}
                            <span className={widget.targetType === 'client' ? UI.badge.green : UI.badge.orange}>
                              {widget.targetType === 'client' ? 'Clients' : 'Partenaires'}
                            </span>
                          </div>
                          {widget.description && (
                            <p className="text-sm text-gray-500 mb-3">
                              {getTranslatedText(widget.description, widget.descriptionTranslations, bloggerLanguage)}
                            </p>
                          )}

                          {/* Code preview */}
                          <div className="relative">
                            <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
                              {generateWidgetCode(widget)}
                            </pre>
                            <button
                              onClick={() => copyToClipboard(generateWidgetCode(widget), `widget_${widget.id}`, widget)}
                              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
                            >
                              {copiedField === `widget_${widget.id}` ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Tracking: {widget.utmSource}/{widget.utmMedium}/{widget.utmCampaign}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* BANNER WIDGETS SECTION */}
        {/* ================================================================== */}
        {(filterType === 'all' || filterType === 'banner') && bannerWidgets.length > 0 && (
          <div className={`${UI.card} overflow-hidden`}>
            <button
              onClick={() => toggleCategory('banners')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-orange-500" />
                <FormattedMessage id="blogger.tools.banners" defaultMessage="Bannieres" />
                <span className={UI.badge.orange}>{bannerWidgets.length}</span>
              </h2>
              {expandedCategories.banners ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {expandedCategories.banners && (
              <div className="p-6 pt-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Bannieres publicitaires dans differentes dimensions. Votre lien d'affiliation est integre.
                </p>

                {/* Group by dimension */}
                {Object.entries(bannersByDimension).map(([dimension, dimensionWidgets]) => {
                  const dimInfo = PROMO_WIDGET_DIMENSIONS.find(d => d.value === dimension);
                  return (
                    <div key={dimension} className="mb-6 last:mb-0">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        {dimInfo?.category === 'mobile' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : dimInfo?.category === 'large' ? (
                          <Maximize2 className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                        {bloggerLanguage === 'en' ? (dimInfo?.labelEn || dimension) : (dimInfo?.labelFr || dimension)}
                        <span className="text-xs text-gray-400">({dimensionWidgets.length})</span>
                      </h3>

                      <div className="grid gap-4">
                        {dimensionWidgets.map((widget) => (
                          <div key={widget.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <div className="flex flex-col lg:flex-row gap-4">
                              {/* Preview */}
                              <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                                {widget.imageUrl ? (
                                  <img
                                    src={widget.imageUrl}
                                    alt={getTranslatedText(widget.altText || widget.name, widget.altTextTranslations, bloggerLanguage)}
                                    className="max-w-[300px] max-h-[200px] object-contain"
                                  />
                                ) : (
                                  <div className="w-[200px] h-[100px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                                    <Image className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* Info & Code */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {getTranslatedText(widget.name, widget.nameTranslations, bloggerLanguage)}
                                  </h4>
                                  {isWidgetNew(widget) && (
                                    <span className={UI.badge.new}>NEW</span>
                                  )}
                                  <span className={widget.targetType === 'client' ? UI.badge.green : UI.badge.orange}>
                                    {widget.targetType === 'client' ? 'Clients' : 'Partenaires'}
                                  </span>
                                </div>
                                {widget.description && (
                                  <p className="text-sm text-gray-500 mb-3">
                                    {getTranslatedText(widget.description, widget.descriptionTranslations, bloggerLanguage)}
                                  </p>
                                )}

                                {/* Code preview */}
                                <div className="relative">
                                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto max-h-[120px]">
                                    {generateWidgetCode(widget)}
                                  </pre>
                                  <button
                                    onClick={() => copyToClipboard(generateWidgetCode(widget), `widget_${widget.id}`, widget)}
                                    className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
                                  >
                                    {copiedField === `widget_${widget.id}` ? (
                                      <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>

                                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  Tracking: {widget.utmSource}/{widget.utmMedium}/{widget.utmCampaign}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* QR CODES SECTION */}
        {/* ================================================================== */}
        <div className={`${UI.card} overflow-hidden`}>
          <button
            onClick={() => toggleCategory('qr')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-500" />
              <FormattedMessage id="blogger.tools.qrCodes" defaultMessage="QR Codes" />
            </h2>
            {expandedCategories.qr ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedCategories.qr && (
            <div className="p-6 pt-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Ideal pour les articles imprimes, flyers ou presentations
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Client QR */}
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="bg-white p-4 rounded-xl inline-block mb-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientShareUrl)}`}
                      alt="QR Code Client"
                      className="w-36 h-36"
                    />
                  </div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                    QR Clients ($10/appel)
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(clientShareUrl)}`}
                    download="qr-client-sos-expat.png"
                    className={`${UI.button.secondary} px-4 py-2 text-sm inline-flex items-center gap-2`}
                  >
                    <Download className="w-4 h-4" />
                    Telecharger HD
                  </a>
                </div>

                {/* Recruitment QR */}
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="bg-white p-4 rounded-xl inline-block mb-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(recruitmentShareUrl)}`}
                      alt="QR Code Partenaires"
                      className="w-36 h-36"
                    />
                  </div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
                    QR Partenaires ($5/appel x 6 mois)
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(recruitmentShareUrl)}`}
                    download="qr-partenaires-sos-expat.png"
                    className={`${UI.button.secondary} px-4 py-2 text-sm inline-flex items-center gap-2`}
                  >
                    <Download className="w-4 h-4" />
                    Telecharger HD
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* CUSTOM LINK GENERATOR */}
        {/* ================================================================== */}
        <div className={`${UI.card} overflow-hidden`}>
          <button
            onClick={() => toggleCategory('generator')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="blogger.tools.linkGenerator" defaultMessage="Generateur de liens" />
            </h2>
            {expandedCategories.generator ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedCategories.generator && (
            <div className="p-6 pt-0">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Ajoutez votre code d'affiliation a n'importe quelle URL SOS-Expat
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL originale
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://sos-expat.com/services/..."
                    className={UI.input}
                  />
                </div>

                <button
                  onClick={generateCustomLink}
                  disabled={!customUrl}
                  className={`${UI.button.primary} px-6 py-2 disabled:opacity-50`}
                >
                  Generer le lien
                </button>

                {generatedLink && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <label className="block text-sm font-medium text-purple-700 dark:text-purple-400 mb-2">
                      Lien avec tracking
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className={`${UI.input} text-sm font-mono`}
                      />
                      <button
                        onClick={() => copyToClipboard(generatedLink, 'generated')}
                        className={`${UI.button.primary} px-4 flex items-center gap-2`}
                      >
                        {copiedField === 'generated' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={generatedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${UI.button.secondary} px-4 flex items-center`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* EMPTY STATE FOR WIDGETS */}
        {/* ================================================================== */}
        {!isLoadingWidgets && widgets.length === 0 && (
          <div className={`${UI.card} p-8 text-center`}>
            <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Widgets bientot disponibles
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Des boutons et bannieres personnalises seront prochainement ajoutes par l'equipe SOS-Expat.
              En attendant, utilisez vos liens d'affiliation et QR codes!
            </p>
          </div>
        )}

        {/* Loading state for widgets */}
        {isLoadingWidgets && (
          <div className={`${UI.card} p-8 flex items-center justify-center`}>
            <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-2" />
            <span className="text-gray-500">Chargement des widgets...</span>
          </div>
        )}
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerPromoTools;

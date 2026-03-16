// src/components/admin/AdminRoutesV2.tsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";

// ===== DÉTECTION LANGUE NAVIGATEUR =====
const getBrowserLang = (): string => {
  if (typeof navigator === 'undefined') return 'fr';
  const lang = navigator.language?.toLowerCase() || 'fr';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('zh')) return 'ch';
  if (lang.startsWith('hi')) return 'hi';
  if (lang.startsWith('ar')) return 'ar';
  return 'en';
};

const loadingTexts: Record<string, string> = {
  fr: 'Chargement...',
  en: 'Loading...',
  es: 'Cargando...',
  de: 'Wird geladen...',
  pt: 'Carregando...',
  ru: 'Загрузка...',
  ch: '加载中...',
  hi: 'लोड हो रहा है...',
  ar: 'جاري التحميل...'
};

const notFoundTexts: Record<string, { title: string; desc: string; back: string }> = {
  fr: { title: 'Page admin introuvable', desc: "La page demandée n'existe pas.", back: 'Retour au dashboard' },
  en: { title: 'Admin page not found', desc: 'The requested page does not exist.', back: 'Back to dashboard' },
  es: { title: 'Página admin no encontrada', desc: 'La página solicitada no existe.', back: 'Volver al panel' },
  de: { title: 'Admin-Seite nicht gefunden', desc: 'Die angeforderte Seite existiert nicht.', back: 'Zurück zum Dashboard' },
  pt: { title: 'Página admin não encontrada', desc: 'A página solicitada não existe.', back: 'Voltar ao painel' },
  ru: { title: 'Страница администратора не найдена', desc: 'Запрашиваемая страница не существует.', back: 'Вернуться на панель' },
  ch: { title: '找不到管理页面', desc: '请求的页面不存在。', back: '返回仪表板' },
  hi: { title: 'व्यवस्थापक पृष्ठ नहीं मिला', desc: 'अनुरोधित पृष्ठ मौजूद नहीं है।', back: 'डैशबोर्ड पर वापस जाएं' },
  ar: { title: 'صفحة المسؤول غير موجودة', desc: 'الصفحة المطلوبة غير موجودة.', back: 'العودة إلى لوحة التحكم' }
};

// ===== COMPOSANT DE CHARGEMENT =====
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  const lang = getBrowserLang();
  const displayMessage = message || loadingTexts[lang] || loadingTexts.en;
  return (
    <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="text-gray-600 text-sm">{displayMessage}</p>
      </div>
    </div>
  );
};

// ===== PAGE 404 ADMIN MINIMALE =====
const AdminNotFound: React.FC = () => {
  const lang = getBrowserLang();
  const texts = notFoundTexts[lang] || notFoundTexts.en;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">{texts.title}</h1>
      <p className="text-sm opacity-80">{texts.desc}</p>
      <div className="mt-4">
        <a href="/admin/dashboard" className="text-red-600 underline">
          {texts.back}
        </a>
      </div>
    </div>
  );
};

// ===== LAZY IMPORTS - AUTH =====
const AdminLogin = lazy(() => import("../../pages/admin/AdminLogin"));

// ===== LAZY IMPORTS - DASHBOARD =====
const AdminDashboard = lazy(() => import("../../pages/admin/AdminDashboard"));

// ===== LAZY IMPORTS - FINANCE =====
const AdminPayments = lazy(() => import("../../pages/admin/AdminPayments"));
const AdminInvoices = lazy(() => import("../../pages/admin/AdminInvoices"));
const PaymentsMonitoringDashboard = lazy(() => import("../../pages/admin/Payments/PaymentsMonitoringDashboard"));
const AdminFinanceTaxes = lazy(() => import("../../pages/admin/Finance/Taxes"));
const AdminFinanceTaxesByCountry = lazy(
  () => import("../../pages/admin/Finance/TaxesByCountry")
);
const AdminTaxFilings = lazy(() => import("../../pages/admin/Finance/TaxFilings"));
const AdminFinanceReconciliation = lazy(
  () => import("../../pages/admin/AdminFinanceReconciliation")
);
const AdminFinancePayouts = lazy(
  () => import("../../pages/admin/Finance/Payouts")
);
const AdminFinanceExports = lazy(
  () => import("../../pages/admin/Finance/Exports")
);
const AdminFinanceLedger = lazy(
  () => import("../../pages/admin/AdminFinanceLedger")
);

// ===== LAZY IMPORTS - FINANCE (NEW) =====
const AdminFinanceDashboard = lazy(() => import("../../pages/admin/Finance/Dashboard"));
const AdminTransactions = lazy(() => import("../../pages/admin/Finance/Transactions"));
const AdminSubscriptions = lazy(() => import("../../pages/admin/Finance/Subscriptions"));
const AdminRefunds = lazy(() => import("../../pages/admin/Finance/Refunds"));
const AdminDisputes = lazy(() => import("../../pages/admin/Finance/Disputes"));
const AdminThresholds = lazy(() => import("../../pages/admin/Finance/Thresholds"));
const AdminBalanceSheet = lazy(() => import("../../pages/admin/Finance/BalanceSheet"));
const AdminProfitLoss = lazy(() => import("../../pages/admin/Finance/ProfitLoss"));
const AdminCashFlow = lazy(() => import("../../pages/admin/Finance/CashFlow"));
const AdminEscrow = lazy(() => import("../../pages/admin/Finance/Escrow"));
const CostMonitoring = lazy(() => import("../../pages/admin/Finance/CostMonitoring"));
const AdminGcpCosts = lazy(() => import("../../pages/admin/Finance/AdminGcpCosts"));
const AdminPlans = lazy(() => import("../../pages/admin/Finance/Plans"));
const AdminSupportingDocuments = lazy(() => import("../../pages/admin/Finance/SupportingDocuments"));

// ===== LAZY IMPORTS - USERS & PROVIDERS =====
const AdminUsers = lazy(() => import("../../pages/admin/AdminUsers"));
const AdminClients = lazy(() => import("../../pages/admin/AdminClients"));
const AdminLawyers = lazy(() => import("../../pages/admin/AdminLawyers"));
const AdminExpats = lazy(() => import("../../pages/admin/AdminExpats"));
const AdminClientsFraud = lazy(
  () => import("../../pages/admin/Clients/AdminClientsFraud")
);
const AdminClientsPromotions = lazy(
  () => import("../../pages/admin/Clients/AdminClientsPromotions")
);
const AdminLawyersFraud = lazy(
  () => import("../../pages/admin/Lawyers/AdminLawyersFraud")
);
const AdminLawyersPromotions = lazy(
  () => import("../../pages/admin/Lawyers/AdminLawyersPromotions")
);
const AdminExpatsFraud = lazy(
  () => import("../../pages/admin/Expats/AdminExpatsFraud")
);
const AdminExpatsPromotions = lazy(
  () => import("../../pages/admin/Expats/AdminExpatsPromotions")
);
const AdminClientsAnalytics = lazy(
  () => import("../../pages/admin/Clients/AdminClientsAnalytics")
);
const AdminClientsConfig = lazy(
  () => import("../../pages/admin/Clients/AdminClientsConfig")
);
const AdminLawyersAnalytics = lazy(
  () => import("../../pages/admin/Lawyers/AdminLawyersAnalytics")
);
const AdminLawyersConfig = lazy(
  () => import("../../pages/admin/Lawyers/AdminLawyersConfig")
);
const AdminExpatsAnalytics = lazy(
  () => import("../../pages/admin/Expats/AdminExpatsAnalytics")
);
const AdminExpatsConfig = lazy(
  () => import("../../pages/admin/Expats/AdminExpatsConfig")
);
const AdminAaaProfiles = lazy(
  () => import("../../pages/admin/AdminAaaProfiles")
);
const AdminLawyerApprovals = lazy(
  () => import("../../pages/admin/AdminApprovals")
);
const AdminKYCProviders = lazy(
  () => import("../../pages/admin/AdminKYCProviders")
);
const AdminReviews = lazy(() => import("../../pages/admin/AdminReviews"));
// AdminProfileValidation redirigé vers AdminApprovals (Cloud Functions backend non implémentées)
// Pour la validation des profils, utiliser AdminApprovals qui fonctionne avec Firestore direct

// ===== LAZY IMPORTS - CALLS =====
const AdminCalls = lazy(() => import("../../pages/admin/AdminCalls"));
const AdminCallsSessions = lazy(
  () => import("../../pages/admin/AdminCallsSessions")
);
const AdminReceivedCalls = lazy(
  () => import("../../pages/admin/AdminReceivedCalls")
);
const AdminCallErrors = lazy(
  () => import("../../pages/admin/AdminCallErrors")
);

// ===== LAZY IMPORTS - COMMUNICATIONS =====
const AdminCommsCampaigns = lazy(
  () => import("../../pages/admin/AdminCommsCampaigns")
);
const AdminCommsAutomations = lazy(
  () => import("../../pages/admin/AdminCommsAutomations")
);
const AdminCommsSegments = lazy(
  () => import("../../pages/admin/AdminCommsSegments")
);
const AdminCommsTemplates = lazy(
  () => import("../../pages/admin/AdminCommsTemplates")
);
const AdminCommsDeliverability = lazy(
  () => import("../../pages/admin/AdminCommsDeliverability")
);
const AdminCommsSuppression = lazy(
  () => import("../../pages/admin/AdminCommsSuppression")
);
const AdminCommsABTests = lazy(
  () => import("../../pages/admin/AdminCommsABTests")
);
const AdminClientMessages = lazy(
  () => import("../../pages/admin/AdminClientMessages")
);
const AdminNotifications = lazy(
  () => import("../../pages/admin/AdminNotifications")
);

// ===== TEXTES PAGES EN DÉVELOPPEMENT =====
const devPageTexts: Record<string, Record<string, { title: string; desc: string }>> = {
  affiliates: {
    fr: { title: 'Affiliés', desc: 'Page en cours de développement' },
    en: { title: 'Affiliates', desc: 'Page under development' },
    es: { title: 'Afiliados', desc: 'Página en desarrollo' },
    de: { title: 'Affiliates', desc: 'Seite in Entwicklung' },
    pt: { title: 'Afiliados', desc: 'Página em desenvolvimento' },
    ru: { title: 'Партнёры', desc: 'Страница в разработке' },
    ch: { title: '合作伙伴', desc: '页面开发中' },
    hi: { title: 'सहयोगी', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'الشركاء', desc: 'الصفحة قيد التطوير' }
  },
  affiliatePayouts: {
    fr: { title: 'Payouts Affiliés', desc: 'Page en cours de développement' },
    en: { title: 'Affiliate Payouts', desc: 'Page under development' },
    es: { title: 'Pagos de Afiliados', desc: 'Página en desarrollo' },
    de: { title: 'Affiliate-Auszahlungen', desc: 'Seite in Entwicklung' },
    pt: { title: 'Pagamentos de Afiliados', desc: 'Página em desenvolvimento' },
    ru: { title: 'Выплаты партнёрам', desc: 'Страница в разработке' },
    ch: { title: '合作伙伴支付', desc: '页面开发中' },
    hi: { title: 'सहयोगी भुगतान', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'مدفوعات الشركاء', desc: 'الصفحة قيد التطوير' }
  },
  financialReports: {
    fr: { title: 'Rapports Financiers', desc: 'Page en cours de développement' },
    en: { title: 'Financial Reports', desc: 'Page under development' },
    es: { title: 'Informes Financieros', desc: 'Página en desarrollo' },
    de: { title: 'Finanzberichte', desc: 'Seite in Entwicklung' },
    pt: { title: 'Relatórios Financeiros', desc: 'Página em desenvolvimento' },
    ru: { title: 'Финансовые отчёты', desc: 'Страница в разработке' },
    ch: { title: '财务报告', desc: '页面开发中' },
    hi: { title: 'वित्तीय रिपोर्ट', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'التقارير المالية', desc: 'الصفحة قيد التطوير' }
  },
  userAnalytics: {
    fr: { title: 'Analytics Utilisateurs', desc: 'Page en cours de développement' },
    en: { title: 'User Analytics', desc: 'Page under development' },
    es: { title: 'Analíticas de Usuarios', desc: 'Página en desarrollo' },
    de: { title: 'Benutzeranalysen', desc: 'Seite in Entwicklung' },
    pt: { title: 'Analytics de Usuários', desc: 'Página em desenvolvimento' },
    ru: { title: 'Аналитика пользователей', desc: 'Страница в разработке' },
    ch: { title: '用户分析', desc: '页面开发中' },
    hi: { title: 'उपयोगकर्ता विश्लेषण', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'تحليلات المستخدمين', desc: 'الصفحة قيد التطوير' }
  },
  platformPerformance: {
    fr: { title: 'Performance Plateforme', desc: 'Page en cours de développement' },
    en: { title: 'Platform Performance', desc: 'Page under development' },
    es: { title: 'Rendimiento de Plataforma', desc: 'Página en desarrollo' },
    de: { title: 'Plattform-Leistung', desc: 'Seite in Entwicklung' },
    pt: { title: 'Desempenho da Plataforma', desc: 'Página em desenvolvimento' },
    ru: { title: 'Производительность платформы', desc: 'Страница в разработке' },
    ch: { title: '平台性能', desc: '页面开发中' },
    hi: { title: 'प्लेटफ़ॉर्म प्रदर्शन', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'أداء المنصة', desc: 'الصفحة قيد التطوير' }
  },
  dataExports: {
    fr: { title: 'Exports de Données', desc: 'Page en cours de développement' },
    en: { title: 'Data Exports', desc: 'Page under development' },
    es: { title: 'Exportación de Datos', desc: 'Página en desarrollo' },
    de: { title: 'Datenexporte', desc: 'Seite in Entwicklung' },
    pt: { title: 'Exportação de Dados', desc: 'Página em desenvolvimento' },
    ru: { title: 'Экспорт данных', desc: 'Страница в разработке' },
    ch: { title: '数据导出', desc: '页面开发中' },
    hi: { title: 'डेटा निर्यात', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'تصدير البيانات', desc: 'الصفحة قيد التطوير' }
  },
  profileValidation: {
    fr: { title: 'Validation des Profils', desc: 'Page en cours de développement' },
    en: { title: 'Profile Validation', desc: 'Page under development' },
    es: { title: 'Validación de Perfiles', desc: 'Página en desarrollo' },
    de: { title: 'Profilvalidierung', desc: 'Seite in Entwicklung' },
    pt: { title: 'Validação de Perfis', desc: 'Página em desenvolvimento' },
    ru: { title: 'Проверка профилей', desc: 'Страница в разработке' },
    ch: { title: '资料验证', desc: '页面开发中' },
    hi: { title: 'प्रोफ़ाइल सत्यापन', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'التحقق من الملف الشخصي', desc: 'الصفحة قيد التطوير' }
  },
  connectionLogs: {
    fr: { title: 'Logs de Connexion', desc: 'Page en cours de développement' },
    en: { title: 'Connection Logs', desc: 'Page under development' },
    es: { title: 'Registros de Conexión', desc: 'Página en desarrollo' },
    de: { title: 'Verbindungsprotokolle', desc: 'Seite in Entwicklung' },
    pt: { title: 'Logs de Conexão', desc: 'Página em desenvolvimento' },
    ru: { title: 'Логи подключений', desc: 'Страница в разработке' },
    ch: { title: '连接日志', desc: '页面开发中' },
    hi: { title: 'कनेक्शन लॉग', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'سجلات الاتصال', desc: 'الصفحة قيد التطوير' }
  },
  unifiedAnalytics: {
    fr: { title: 'Analytics Centralisés', desc: 'Page en cours de développement' },
    en: { title: 'Unified Analytics', desc: 'Page under development' },
    es: { title: 'Analíticas Unificadas', desc: 'Página en desarrollo' },
    de: { title: 'Zentrale Analysen', desc: 'Seite in Entwicklung' },
    pt: { title: 'Analytics Unificados', desc: 'Página em desenvolvimento' },
    ru: { title: 'Единая аналитика', desc: 'Страница в разработке' },
    ch: { title: '统一分析', desc: '页面开发中' },
    hi: { title: 'एकीकृत विश्लेषण', desc: 'पृष्ठ विकास में है' },
    ar: { title: 'التحليلات الموحدة', desc: 'الصفحة قيد التطوير' }
  }
};

const DevPage: React.FC<{ pageKey: string }> = ({ pageKey }) => {
  const lang = getBrowserLang();
  const texts = devPageTexts[pageKey]?.[lang] || devPageTexts[pageKey]?.en || { title: pageKey, desc: 'Page under development' };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">{texts.title}</h1>
      <p className="text-sm opacity-80">{texts.desc}</p>
    </div>
  );
};

// ===== LAZY IMPORTS - COMMISSIONS HUB =====
const AdminCommissionsHub = lazy(
  () => import("../../pages/admin/Commissions/AdminCommissionsHub")
);

// ===== LAZY IMPORTS - AFFILIATION =====
const AdminAffiliatesList = lazy(
  () => import("../../pages/admin/AdminAffiliatesList")
);
const AdminAffiliateDetail = lazy(
  () => import("../../pages/admin/AdminAffiliateDetail")
);
const AdminAffiliateConfig = lazy(
  () => import("../../pages/admin/AdminAffiliateConfig")
);
const AdminCommissionRules = lazy(
  () => import("../../pages/admin/AdminCommissionRules")
);
const AdminCommissionPlans = lazy(
  () => import("../../pages/admin/AdminCommissionPlans")
);
const AdminUnifiedCommissions = lazy(
  () => import("../../pages/admin/AdminUnifiedCommissions")
);
const AdminAffiliateOverview = lazy(
  () => import("../../pages/admin/AdminAffiliateOverview")
);
// AdminAffiliatePayouts removed — redirected to centralized AdminPaymentsDashboard
const AdminAffiliateDashboard = lazy(
  () => import("../../pages/admin/AdminAffiliateDashboard")
);
const AdminAffiliateCommissions = lazy(
  () => import("../../pages/admin/AdminAffiliateCommissions")
);
const AdminAffiliateReports = lazy(
  () => import("../../pages/admin/AdminAffiliateReports")
);
const AdminAffiliateFraudAlerts = lazy(
  () => import("../../pages/admin/AdminAffiliateFraudAlerts")
);

// ===== LAZY IMPORTS - CHATTER =====
const AdminChattersList = lazy(
  () => import("../../pages/admin/Chatter/AdminChattersList")
);
const AdminChatterDetail = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterDetail")
);
// AdminChatterPayments removed — redirected to centralized AdminPaymentsDashboard
const AdminChatterConfig = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterConfig")
);
const AdminCaptainsList = lazy(
  () => import("../../pages/admin/Chatter/AdminCaptainsList")
);
const AdminCaptainDetail = lazy(
  () => import("../../pages/admin/Chatter/AdminCaptainDetail")
);
const AdminCaptainCoverage = lazy(
  () => import("../../pages/admin/Chatter/AdminCaptainCoverage")
);
const AdminChatterReferrals = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterReferrals")
);
const AdminChatterPromotions = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterPromotions")
);
const AdminChatterFraud = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterFraud")
);
const AdminCommissionTracker = lazy(
  () => import("../../pages/admin/Chatter/AdminCommissionTracker")
);
const AdminChatterDripMessages = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterDripMessages")
);
const AdminChatterAnalytics = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterAnalytics")
);
const AdminChatterFunnel = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterFunnel")
);
const AdminChattersResources = lazy(
  () => import("../../pages/admin/Chatters/AdminChattersResources")
);
const AdminChatterHierarchy = lazy(
  () => import("../../pages/admin/Chatter/AdminChatterHierarchy")
);

const AdminWhatsAppGroups = lazy(
  () => import("../../whatsapp-groups/AdminWhatsAppGroups")
);
const AdminWhatsAppSupervision = lazy(
  () => import("../../whatsapp-groups/AdminWhatsAppSupervision")
);

// ===== LAZY IMPORTS - INFLUENCER =====
const AdminInfluencersList = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencersList")
);
const AdminInfluencerDetail = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencerDetail")
);
// AdminInfluencersPayments removed — redirected to centralized AdminPaymentsDashboard
const AdminInfluencersConfig = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencersConfig")
);
const AdminInfluencersLeaderboard = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencersLeaderboard")
);
const AdminInfluencersResources = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencersResources")
);
const AdminInfluencerAnalytics = lazy(
  () => import("../../pages/admin/Influencer/AdminInfluencerAnalytics")
);
const AdminInfluencerFraud = lazy(
  () => import("../../pages/admin/Influencer/AdminInfluencerFraud")
);
const AdminInfluencersPromotions = lazy(
  () => import("../../pages/admin/Influencers/AdminInfluencersPromotions")
);

// ===== LAZY IMPORTS - BLOGGER =====
const AdminBloggersList = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersList")
);
const AdminBloggerDetail = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggerDetail")
);
// AdminBloggersPayments removed — redirected to centralized AdminPaymentsDashboard
const AdminBloggersConfig = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersConfig")
);
const AdminBloggersResources = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersResources")
);
const AdminBloggersGuide = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersGuide")
);
const AdminBloggersWidgets = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersWidgets")
);
const AdminBloggersArticles = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersArticles")
);
const AdminBloggerAnalytics = lazy(
  () => import("../../pages/admin/Blogger/AdminBloggerAnalytics")
);
const AdminBloggerFraud = lazy(
  () => import("../../pages/admin/Blogger/AdminBloggerFraud")
);
const AdminBloggersPromotions = lazy(
  () => import("../../pages/admin/Bloggers/AdminBloggersPromotions")
);

// ===== LAZY IMPORTS - GROUPADMIN =====
const AdminGroupAdminsList = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsList")
);
const AdminGroupAdminDetail = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminDetail")
);
// AdminGroupAdminsPayments removed — redirected to centralized AdminPaymentsDashboard
const AdminGroupAdminsConfig = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsConfig")
);
const AdminGroupAdminsResources = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsResources")
);
const AdminGroupAdminsPosts = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsPosts")
);
const AdminGroupAdminsRecruitments = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsRecruitments")
);
const AdminGroupAdminsPromotions = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminsPromotions")
);
const AdminGroupAdminAnalytics = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminAnalytics")
);
const AdminGroupAdminFraud = lazy(
  () => import("../../pages/admin/GroupAdmins/AdminGroupAdminFraud")
);

// ===== LAZY IMPORTS - PARTNERS =====
const AdminPartnersList = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersList")
);
const AdminPartnerCreate = lazy(
  () => import("../../pages/admin/Partners/AdminPartnerCreate")
);
const AdminPartnerDetail = lazy(
  () => import("../../pages/admin/Partners/AdminPartnerDetail")
);
// AdminPartnersPayments removed — redirected to centralized AdminPaymentsDashboard
const AdminPartnersConfig = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersConfig")
);
const AdminPartnersWidgets = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersWidgets")
);
const AdminPartnersStats = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersStats")
);
const AdminPartnerApplications = lazy(
  () => import("../../pages/admin/Partners/AdminPartnerApplications")
);
const AdminPartnersFraud = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersFraud")
);
const AdminPartnersPromotions = lazy(
  () => import("../../pages/admin/Partners/AdminPartnersPromotions")
);

// ===== LAZY IMPORTS - CENTRALIZED PAYMENTS =====
const AdminPaymentsDashboard = lazy(
  () => import("../../pages/admin/Payments/AdminPaymentsDashboard")
);
const AdminPaymentDetail = lazy(
  () => import("../../pages/admin/Payments/AdminPaymentDetail")
);
const AdminPaymentConfig = lazy(
  () => import("../../pages/admin/Payments/AdminPaymentConfig")
);
// ===== LAZY IMPORTS - TOOLBOX =====
const AdminToolbox = lazy(
  () => import("../../pages/admin/AdminToolbox")
);

// ===== LAZY IMPORTS - TRAINING =====
const AdminTrainingModules = lazy(
  () => import("../../pages/admin/Training/AdminTrainingModules")
);

// ===== LAZY IMPORTS - B2B =====
const AdminB2BAccounts = lazy(
  () => import("../../pages/admin/AdminB2BAccounts")
);
const AdminB2BMembers = lazy(() => import("../../pages/admin/AdminB2BMembers"));
const AdminB2BPricing = lazy(() => import("../../pages/admin/AdminB2BPricing"));
const AdminB2BBilling = lazy(() => import("../../pages/admin/AdminB2BBilling"));
const AdminB2BInvoices = lazy(
  () => import("../../pages/admin/AdminB2BInvoices")
);
const AdminB2BReports = lazy(() => import("../../pages/admin/AdminB2BReports"));

// ===== LAZY IMPORTS - MONITORING =====
const AdminEmailHealth = lazy(() => import("../../pages/admin/AdminEmailHealth"));
const AdminAgentMonitoring = lazy(() => import("../../pages/admin/AdminAgentMonitoring"));
const AdminFunctionalMonitoring = lazy(() => import("../../pages/admin/AdminFunctionalMonitoring"));
const AdminConnectionLogs = lazy(() => import("../../pages/admin/AdminConnectionLogs"));

// ===== LAZY IMPORTS - PROVIDER STATS =====
const AdminProviderStats = lazy(() => import("../../pages/admin/AdminProviderStats"));

// ===== LAZY IMPORTS - SETTINGS & TOOLS =====
const AdminPricing = lazy(() => import("../../pages/admin/AdminPricing"));
const AdminCountries = lazy(() => import("../../pages/admin/AdminCountries"));
const AdminLegalDocuments = lazy(
  () => import("../../pages/admin/AdminLegalDocuments")
);
const AdminFAQs = lazy(() => import("../../pages/admin/AdminFAQs"));
const AdminBackups = lazy(() => import("../../pages/admin/AdminBackups"));
const AdminSettings = lazy(() => import("../../pages/admin/AdminSettings"));
const AdminSystemHealth = lazy(() => import("../../pages/admin/AdminSystemHealth"));

// ===== LAZY IMPORTS - ANALYTICS & REPORTS =====
const AdminCountryStats = lazy(() =>
  import("../../pages/admin/AdminCountryStats")
);
const AdminErrorLogs = lazy(() =>
  import("../../pages/admin/AdminErrorLogs")
);
const AdminSecurityAlerts = lazy(() =>
  import("../../pages/admin/AdminSecurityAlerts")
);
const AdminFinancialReports = lazy(() =>
  Promise.resolve({ default: () => <DevPage pageKey="financialReports" /> })
);
const AdminUserAnalytics = lazy(() =>
  Promise.resolve({ default: () => <DevPage pageKey="userAnalytics" /> })
);
const AdminPlatformPerformance = lazy(() =>
  Promise.resolve({ default: () => <DevPage pageKey="platformPerformance" /> })
);
const AdminDataExports = lazy(() =>
  Promise.resolve({ default: () => <DevPage pageKey="dataExports" /> })
);
const AdminUnifiedAnalytics = lazy(() =>
  import("../../pages/admin/AdminUnifiedAnalytics")
);

// ===== LAZY IMPORTS - HELP CENTER =====
const AdminHelpCenter = lazy(() => import("../../pages/admin/AdminHelpCenter"));

// ===== LAZY IMPORTS - AUTRES PAGES =====
const AdminPromoCodes = lazy(() => import("../../pages/admin/AdminPromoCodes"));
// const AdminDocuments = lazy(() => import("../../pages/admin/AdminDocuments"));
const AdminInbox = lazy(
  () => import("../../pages/admin/AdminInbox")
);
const AdminContactMessages = lazy(
  () => import("../../pages/admin/AdminContactMessages")
);
const AdminFeedback = lazy(
  () => import("../../pages/admin/AdminFeedback")
);
// const AdminEmails = lazy(() => import("../../pages/admin/AdminEmails"));

// ===== LAZY IMPORTS - AI SUBSCRIPTION =====
const AdminIA = lazy(() => import("../../pages/admin/AdminIA"));

// ===== LAZY IMPORTS - MARKETING =====
const TemplatesEmails = lazy(() => import("../../pages/admin/marketing/TemplatesEmails"));
const NotificationsRouting = lazy(() => import("../../pages/admin/marketing/Notifications"));
const DelivrabiliteLogs = lazy(() => import("../../pages/admin/marketing/Delivrabilite"));
const MessagesTempsReel = lazy(() => import("../../pages/admin/marketing/MessagesTempsReel"));
const AdminAdsAnalytics = lazy(() => import("../../pages/admin/AdminAdsAnalytics"));
const AdminTrustpilot = lazy(() => import("../../pages/admin/AdminTrustpilot"));
const AdminMetaAnalytics = lazy(() => import("../../pages/admin/AdminMetaAnalytics"));
const AdminGoogleAdsAnalytics = lazy(() => import("../../pages/admin/AdminGoogleAdsAnalytics"));
const AdminLandingPages = lazy(() => import("../../pages/admin/AdminLandingPages"));

// ===== LAZY IMPORTS - MARKETING (UNIFIED) =====
const AdminMarketingResources = lazy(() => import("../../pages/admin/marketing/AdminMarketingResources"));

// ===== LAZY IMPORTS - PRESS =====
const AdminPressResources = lazy(() => import("../../pages/admin/AdminPressResources"));
const AdminPressReleases = lazy(() => import("../../pages/admin/AdminPressReleases"));

// ===== LAZY IMPORTS - TELEGRAM =====
import TelegramLayout from "../Telegram/TelegramLayout";
const AdminTelegramDashboard = lazy(() => import("../../pages/admin/Telegram/AdminTelegramDashboard"));
const AdminTelegramCampaigns = lazy(() => import("../../pages/admin/Telegram/AdminTelegramCampaigns"));
const AdminTelegramCampaignCreate = lazy(() => import("../../pages/admin/Telegram/AdminTelegramCampaignCreate"));
const AdminTelegramTemplates = lazy(() => import("../../pages/admin/Telegram/AdminTelegramTemplates"));
const AdminTelegramSubscribers = lazy(() => import("../../pages/admin/Telegram/AdminTelegramSubscribers"));
const AdminTelegramQueue = lazy(() => import("../../pages/admin/Telegram/AdminTelegramQueue"));
const AdminTelegramLogs = lazy(() => import("../../pages/admin/Telegram/AdminTelegramLogs"));
const AdminTelegramConfig = lazy(() => import("../../pages/admin/Telegram/AdminTelegramConfig"));
const AdminTelegramGroups = lazy(() => import("../../pages/admin/Telegram/AdminTelegramGroups"));
const AdminTelegramSupervision = lazy(() => import("../../pages/admin/Telegram/AdminTelegramSupervision"));
const AdminTelegramBots = lazy(() => import("../../pages/admin/Telegram/AdminTelegramBots"));

// ===== LAYOUT PROTÉGÉ ADMIN =====
const AdminProtectedLayout: React.FC = () => (
  <ProtectedRoute allowedRoles={["admin"]}>
    <Outlet />
  </ProtectedRoute>
);

// ===== LAYOUT PROTÉGÉ FINANCE (admin + expert-comptable en lecture seule) =====
const FinanceProtectedLayout: React.FC = () => (
  <ProtectedRoute allowedRoles={["admin", "accountant"]}>
    <Outlet />
  </ProtectedRoute>
);

// ===== REDIRECTION INDEX SELON LE ROLE =====
const AdminIndexRedirect: React.FC = () => {
  const { user } = useAuth() as { user: { role?: string } | null };
  if (user?.role === 'accountant') {
    return <Navigate to="finance/dashboard" replace />;
  }
  return <Navigate to="dashboard" replace />;
};

// ===== COMPOSANT PRINCIPAL =====
const AdminRoutesV2: React.FC = () => {
  return (
    <Routes>
      {/* ===== 🔐 AUTHENTIFICATION (hors layout protégé) ===== */}
      <Route
        path="login"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLogin />
          </Suspense>
        }
      />

      {/* Index /admin → redirige selon le rôle */}
      <Route index element={<AdminIndexRedirect />} />

      {/* ===== Toutes les routes admin protégées ===== */}
      <Route element={<AdminProtectedLayout />}>

      {/* 📊 DASHBOARD */}
      <Route
        path="dashboard"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
          </Suspense>
        }
      />

      {/* 👥 UTILISATEURS & PRESTATAIRES */}
      <Route
        path="users/all"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        }
      />
      <Route
        path="users/clients"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminClients />
          </Suspense>
        }
      />
      <Route
        path="users/providers/lawyers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLawyers />
          </Suspense>
        }
      />
      <Route
        path="users/providers/expats"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminExpats />
          </Suspense>
        }
      />
      <Route
        path="users/providers/stats"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminProviderStats />
          </Suspense>
        }
      />
      {/* Nouveaux rôles - utilise AdminUsers avec filtrage */}
      <Route
        path="users/chatters"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        }
      />
      <Route
        path="users/influencers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        }
      />
      <Route
        path="users/bloggers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        }
      />
      <Route
        path="users/group-admins"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUsers />
          </Suspense>
        }
      />
      <Route
        path="aaaprofiles"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAaaProfiles />
          </Suspense>
        }
      />
      <Route
        path="approvals/lawyers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLawyerApprovals />
          </Suspense>
        }
      />
      <Route
        path="kyc/providers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminKYCProviders />
          </Suspense>
        }
      />
      <Route
        path="reviews"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReviews />
          </Suspense>
        }
      />
      {/* Redirection: /admin/validation -> /admin/approvals/lawyers
          AdminProfileValidation était basé sur des Cloud Functions non implémentées.
          Toute la validation des profils se fait maintenant via AdminApprovals */}
      <Route
        path="validation"
        element={<Navigate to="approvals/lawyers" replace />}
      />

      {/* Compat anciennes */}
      <Route
        path="users/list"
        element={<Navigate to="../users/clients" replace />}
      />
      <Route
        path="users/providers"
        element={<Navigate to="../users/providers/lawyers" replace />}
      />
      <Route
        path="approvals"
        element={<Navigate to="../approvals/lawyers" replace />}
      />

      {/* 📞 APPELS — suite dans AdminProtectedLayout après les finances */}

      </Route>{/* End AdminProtectedLayout — les routes finance sont en parallele ci-dessous */}

      {/* 💰 FINANCES — Accessible aux admins ET aux experts-comptables (lecture seule) */}
      <Route element={<FinanceProtectedLayout />}>
      <Route
        path="finance/dashboard"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceDashboard />
          </Suspense>
        }
      />
      <Route
        path="finance/transactions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTransactions />
          </Suspense>
        }
      />
      <Route
        path="finance/subscriptions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSubscriptions />
          </Suspense>
        }
      />
      <Route
        path="subscription-plans"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPlans />
          </Suspense>
        }
      />
      <Route
        path="finance/refunds"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminRefunds />
          </Suspense>
        }
      />
      <Route
        path="finance/disputes"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDisputes />
          </Suspense>
        }
      />
      <Route
        path="finance/payments"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPayments />
          </Suspense>
        }
      />
      <Route
        path="finance/invoices"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInvoices />
          </Suspense>
        }
      />
      <Route
        path="finance/taxes"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceTaxes />
          </Suspense>
        }
      />
      <Route
        path="finance/taxes/by-country"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceTaxesByCountry />
          </Suspense>
        }
      />
      <Route
        path="finance/thresholds"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminThresholds />
          </Suspense>
        }
      />
      <Route
        path="finance/filings"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTaxFilings />
          </Suspense>
        }
      />
      <Route
        path="finance/reconciliation"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceReconciliation />
          </Suspense>
        }
      />
      <Route
        path="finance/payouts"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinancePayouts />
          </Suspense>
        }
      />
      <Route
        path="finance/escrow"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminEscrow />
          </Suspense>
        }
      />
      <Route
        path="finance/exports"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceExports />
          </Suspense>
        }
      />
      <Route
        path="finance/ledger"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinanceLedger />
          </Suspense>
        }
      />
      <Route
        path="finance/balance-sheet"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBalanceSheet />
          </Suspense>
        }
      />
      <Route
        path="finance/profit-loss"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminProfitLoss />
          </Suspense>
        }
      />
      <Route
        path="finance/cash-flow"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCashFlow />
          </Suspense>
        }
      />
      <Route
        path="analytics/costs"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <CostMonitoring />
          </Suspense>
        }
      />
      <Route
        path="analytics/gcp-costs"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGcpCosts />
          </Suspense>
        }
      />
      <Route
        path="finance/supporting-documents"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSupportingDocuments />
          </Suspense>
        }
      />
      <Route path="finance" element={<Navigate to="finance/dashboard" replace />} />
      </Route>{/* End FinanceProtectedLayout */}

      {/* ===== Suite des routes admin protégées (admin uniquement) ===== */}
      <Route element={<AdminProtectedLayout />}>

      {/* 📞 APPELS */}
      <Route
        path="calls"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCalls />
          </Suspense>
        }
      />
      <Route
        path="calls/sessions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCallsSessions />
          </Suspense>
        }
      />
      <Route
        path="calls/received"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminReceivedCalls />
          </Suspense>
        }
      />
      <Route
        path="calls/errors"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCallErrors />
          </Suspense>
        }
      />

      {/* 💌 COMMUNICATIONS */}
      <Route
        path="comms/campaigns"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsCampaigns />
          </Suspense>
        }
      />
      <Route
        path="comms/automations"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsAutomations />
          </Suspense>
        }
      />
      <Route
        path="comms/segments"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsSegments />
          </Suspense>
        }
      />
      <Route
        path="comms/templates"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsTemplates />
          </Suspense>
        }
      />
      <Route
        path="comms/deliverability"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsDeliverability />
          </Suspense>
        }
      />
      <Route
        path="comms/suppression"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsSuppression />
          </Suspense>
        }
      />
      <Route
        path="comms/ab"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommsABTests />
          </Suspense>
        }
      />
      <Route
        path="comms/messages"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminClientMessages />
          </Suspense>
        }
      />
      <Route
        path="comms/notifications"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminNotifications />
          </Suspense>
        }
      />

      {/* INBOX CENTRALISE */}
      <Route
        path="inbox"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInbox />
          </Suspense>
        }
      />

      {/* NOTE : new handling for the messages that are coming directly from the contact page  */}

      <Route
        path="contact-messages"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminContactMessages />
          </Suspense>
        }
      />

      {/* 📝 FEEDBACKS UTILISATEURS */}
      <Route
        path="feedback"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFeedback />
          </Suspense>
        }
      />

      {/* 🤝 AFFILIATION */}
      {/* Vue d'ensemble unifiée - Tous les rôles affiliés */}
      <Route
        path="affiliates/overview"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateOverview />
          </Suspense>
        }
      />
      {/* Dashboard Affiliés génériques */}
      <Route
        path="affiliates/dashboard"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateDashboard />
          </Suspense>
        }
      />
      {/* Hub commissions unifié */}
      <Route
        path="commissions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommissionsHub />
          </Suspense>
        }
      />
      {/* Liste des affiliés */}
      <Route
        path="affiliates"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliatesList />
          </Suspense>
        }
      />
      {/* Anciens paths déplacés → nouveaux paths */}
      <Route path="finance/plans" element={<Navigate to="/admin/subscription-plans" replace />} />
      <Route path="finance/costs" element={<Navigate to="/admin/analytics/costs" replace />} />
      <Route path="finance/gcp-costs" element={<Navigate to="/admin/analytics/gcp-costs" replace />} />
      {/* Anciennes routes commission → redirect vers hub unifié */}
      <Route path="affiliates/config" element={<Navigate to="/admin/commissions?tab=chatter" replace />} />
      <Route path="affiliates/plans" element={<Navigate to="/admin/commissions?tab=plans" replace />} />
      <Route path="affiliates/rules" element={<Navigate to="/admin/commissions?tab=avocat" replace />} />
      <Route path="affiliates/unified" element={<Navigate to="/admin/commissions?tab=overrides" replace />} />
      {/* Gestion des commissions individuelles */}
      <Route
        path="affiliates/commissions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateCommissions />
          </Suspense>
        }
      />
      {/* Payouts - redirigé vers le dashboard centralisé */}
      <Route
        path="affiliates/payouts"
        element={<Navigate to="/admin/payments?userType=affiliate" replace />}
      />
      {/* Rapports & Analytics affiliés */}
      <Route
        path="affiliates/reports"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateReports />
          </Suspense>
        }
      />
      {/* Alertes fraude */}
      <Route
        path="affiliates/fraud"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateFraudAlerts />
          </Suspense>
        }
      />
      {/* Détail d'un affilié (DOIT être après les routes statiques) */}
      <Route
        path="affiliates/:affiliateId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAffiliateDetail />
          </Suspense>
        }
      />

      {/* 🏢 B2B */}
      <Route
        path="b2b/accounts"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BAccounts />
          </Suspense>
        }
      />
      <Route
        path="b2b/members"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BMembers />
          </Suspense>
        }
      />
      <Route
        path="b2b/pricing"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BPricing />
          </Suspense>
        }
      />
      <Route
        path="b2b/billing"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BBilling />
          </Suspense>
        }
      />
      <Route
        path="b2b/invoices"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BInvoices />
          </Suspense>
        }
      />
      <Route
        path="b2b/reports"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminB2BReports />
          </Suspense>
        }
      />

      {/* 💬 CHATTER */}
      <Route
        path="chatters"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChattersList />
          </Suspense>
        }
      />
      <Route
        path="chatters/:chatterId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterDetail />
          </Suspense>
        }
      />
      <Route
        path="chatters/payments"
        element={<Navigate to="/admin/payments?userType=chatter" replace />}
      />
      <Route
        path="chatters/captains"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCaptainsList />
          </Suspense>
        }
      />
      <Route
        path="chatters/captains/coverage"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCaptainCoverage />
          </Suspense>
        }
      />
      <Route
        path="chatters/captains/:captainId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCaptainDetail />
          </Suspense>
        }
      />
      <Route
        path="chatters/config"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterConfig />
          </Suspense>
        }
      />
      <Route
        path="chatters/referrals"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterReferrals />
          </Suspense>
        }
      />
      <Route
        path="chatters/promotions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterPromotions />
          </Suspense>
        }
      />
      <Route
        path="chatters/fraud"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterFraud />
          </Suspense>
        }
      />
      <Route
        path="chatters/commissions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCommissionTracker />
          </Suspense>
        }
      />
      <Route
        path="chatters/drip-messages"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterDripMessages />
          </Suspense>
        }
      />
      <Route
        path="chatters/analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterAnalytics />
          </Suspense>
        }
      />
      <Route
        path="chatters/funnel"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterFunnel />
          </Suspense>
        }
      />

      <Route
        path="chatters/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChattersResources />
          </Suspense>
        }
      />
      <Route
        path="chatters/hierarchy"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminChatterHierarchy />
          </Suspense>
        }
      />
      <Route
        path="marketing/whatsapp-groups"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminWhatsAppGroups />
          </Suspense>
        }
      />
      <Route
        path="marketing/whatsapp-supervision"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminWhatsAppSupervision />
          </Suspense>
        }
      />

      {/* 📱 TELEGRAM (Groups, Managers, Bots — same level as WhatsApp) */}
      <Route
        path="marketing/telegram-groups"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTelegramGroups />
          </Suspense>
        }
      />
      <Route
        path="marketing/telegram-managers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTelegramSupervision />
          </Suspense>
        }
      />
      <Route
        path="marketing/telegram-bots"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTelegramBots />
          </Suspense>
        }
      />

      {/* 📢 INFLUENCERS */}
      <Route
        path="influencers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencersList />
          </Suspense>
        }
      />
      <Route
        path="influencers/:influencerId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencerDetail />
          </Suspense>
        }
      />
      <Route
        path="influencers/payments"
        element={<Navigate to="/admin/payments?userType=influencer" replace />}
      />
      <Route
        path="influencers/leaderboard"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencersLeaderboard />
          </Suspense>
        }
      />
      <Route
        path="influencers/config"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencersConfig />
          </Suspense>
        }
      />
      <Route
        path="influencers/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencersResources />
          </Suspense>
        }
      />
      <Route
        path="influencers/promotions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencersPromotions />
          </Suspense>
        }
      />
      <Route
        path="influencers/analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencerAnalytics />
          </Suspense>
        }
      />
      <Route
        path="influencers/fraud"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminInfluencerFraud />
          </Suspense>
        }
      />

      {/* 📝 BLOGGERS */}
      <Route
        path="bloggers"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersList />
          </Suspense>
        }
      />
      <Route
        path="bloggers/:bloggerId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggerDetail />
          </Suspense>
        }
      />
      <Route
        path="bloggers/payments"
        element={<Navigate to="/admin/payments?userType=blogger" replace />}
      />
      <Route
        path="bloggers/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersResources />
          </Suspense>
        }
      />
      <Route
        path="bloggers/guide"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersGuide />
          </Suspense>
        }
      />
      <Route
        path="bloggers/config"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersConfig />
          </Suspense>
        }
      />
      <Route
        path="bloggers/widgets"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersWidgets />
          </Suspense>
        }
      />
      <Route
        path="bloggers/articles"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersArticles />
          </Suspense>
        }
      />
      <Route
        path="bloggers/analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggerAnalytics />
          </Suspense>
        }
      />
      <Route
        path="bloggers/fraud"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggerFraud />
          </Suspense>
        }
      />
      <Route
        path="bloggers/promotions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBloggersPromotions />
          </Suspense>
        }
      />

      {/* 👥 GROUP-ADMINS (Facebook Group Administrators) */}
      <Route
        path="group-admins"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsList />
          </Suspense>
        }
      />
      <Route
        path="group-admins/:groupAdminId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminDetail />
          </Suspense>
        }
      />
      <Route
        path="group-admins/payments"
        element={<Navigate to="/admin/payments?userType=group_admin" replace />}
      />
      <Route
        path="group-admins/recruitments"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsRecruitments />
          </Suspense>
        }
      />
      <Route
        path="group-admins/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsResources />
          </Suspense>
        }
      />
      <Route
        path="group-admins/posts"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsPosts />
          </Suspense>
        }
      />
      <Route
        path="group-admins/config"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsConfig />
          </Suspense>
        }
      />
      <Route
        path="group-admins/promotions"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminsPromotions />
          </Suspense>
        }
      />
      <Route
        path="group-admins/analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminAnalytics />
          </Suspense>
        }
      />
      <Route
        path="group-admins/fraud"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGroupAdminFraud />
          </Suspense>
        }
      />

      {/* PARTNERS */}
      <Route path="partners" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersList /></Suspense>} />
      <Route path="partners/create" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerCreate /></Suspense>} />
      <Route path="partners/:partnerId" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerDetail /></Suspense>} />
      <Route path="partners/payments" element={<Navigate to="/admin/payments?userType=partner" replace />} />
      <Route path="partners/config" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersConfig /></Suspense>} />
      <Route path="partners/widgets" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersWidgets /></Suspense>} />
      <Route path="partners/stats" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersStats /></Suspense>} />
      <Route path="partners/applications" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnerApplications /></Suspense>} />
      <Route path="partners/fraud" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersFraud /></Suspense>} />
      <Route path="partners/promotions" element={<Suspense fallback={<LoadingSpinner />}><AdminPartnersPromotions /></Suspense>} />

      {/* 👤 CLIENTS (Affiliate) */}
      <Route path="clients/fraud" element={<Suspense fallback={<LoadingSpinner />}><AdminClientsFraud /></Suspense>} />
      <Route path="clients/promotions" element={<Suspense fallback={<LoadingSpinner />}><AdminClientsPromotions /></Suspense>} />
      <Route path="clients/analytics" element={<Suspense fallback={<LoadingSpinner />}><AdminClientsAnalytics /></Suspense>} />
      <Route path="clients/config" element={<Suspense fallback={<LoadingSpinner />}><AdminClientsConfig /></Suspense>} />

      {/* ⚖️ LAWYERS (Affiliate) */}
      <Route path="lawyers/fraud" element={<Suspense fallback={<LoadingSpinner />}><AdminLawyersFraud /></Suspense>} />
      <Route path="lawyers/promotions" element={<Suspense fallback={<LoadingSpinner />}><AdminLawyersPromotions /></Suspense>} />
      <Route path="lawyers/analytics" element={<Suspense fallback={<LoadingSpinner />}><AdminLawyersAnalytics /></Suspense>} />
      <Route path="lawyers/config" element={<Suspense fallback={<LoadingSpinner />}><AdminLawyersConfig /></Suspense>} />

      {/* 🌍 EXPATS (Affiliate) */}
      <Route path="expats/fraud" element={<Suspense fallback={<LoadingSpinner />}><AdminExpatsFraud /></Suspense>} />
      <Route path="expats/promotions" element={<Suspense fallback={<LoadingSpinner />}><AdminExpatsPromotions /></Suspense>} />
      <Route path="expats/analytics" element={<Suspense fallback={<LoadingSpinner />}><AdminExpatsAnalytics /></Suspense>} />
      <Route path="expats/config" element={<Suspense fallback={<LoadingSpinner />}><AdminExpatsConfig /></Suspense>} />

      {/* 📚 TRAINING MODULES */}
      <Route
        path="training"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTrainingModules />
          </Suspense>
        }
      />
      <Route
        path="training/modules"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTrainingModules />
          </Suspense>
        }
      />

      {/* 💳 CENTRALIZED PAYMENTS (Chatter, Influencer, Blogger) */}
      <Route
        path="payments"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPaymentsDashboard />
          </Suspense>
        }
      />
      <Route
        path="payments/monitoring"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <PaymentsMonitoringDashboard />
          </Suspense>
        }
      />
      <Route path="payments/withdrawals" element={<Navigate to="/admin/payments" replace />} />
      <Route
        path="payments/:userType/:withdrawalId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPaymentDetail />
          </Suspense>
        }
      />
      <Route
        path="payments/config"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPaymentConfig />
          </Suspense>
        }
      />

      {/* 🧰 BOITE A OUTILS */}
      <Route
        path="toolbox"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminToolbox />
          </Suspense>
        }
      />

      {/* 📱 TELEGRAM MARKETING - Wrapped with TelegramLayout */}
      <Route path="toolbox/telegram" element={<TelegramLayout />}>
        {/* Index route: /admin/toolbox/telegram redirects to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramDashboard /></Suspense>} />

        {/* Campaigns */}
        <Route path="campaigns" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramCampaigns /></Suspense>} />
        <Route path="campaigns/create" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramCampaignCreate /></Suspense>} />

        {/* Content */}
        <Route path="templates" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramTemplates /></Suspense>} />

        {/* Subscribers */}
        <Route path="subscribers" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramSubscribers /></Suspense>} />

        {/* Monitoring */}
        <Route path="queue" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramQueue /></Suspense>} />
        <Route path="logs" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramLogs /></Suspense>} />

        {/* Configuration */}
        <Route path="config" element={<Suspense fallback={<LoadingSpinner />}><AdminTelegramConfig /></Suspense>} />
      </Route>

      {/* ⚙️ CONFIG & OUTILS */}
      <Route
        path="pricing"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPricing />
          </Suspense>
        }
      />

      {/* ✅ ADD THIS - to match menu path */}
      <Route
        path="coupons"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPromoCodes />
          </Suspense>
        }
      />

      <Route
        path="promos/codes"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPromoCodes />
          </Suspense>
        }
      />
      <Route
        path="countries"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCountries />
          </Suspense>
        }
      />
      <Route
        path="documents"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLegalDocuments />
          </Suspense>
        }
      />
      <Route
        path="cms/faqs"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFAQs />
          </Suspense>
        }
      />
      <Route
        path="backups"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminBackups />
          </Suspense>
        }
      />
      <Route
        path="system-health"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSystemHealth />
          </Suspense>
        }
      />
      <Route
        path="email-health"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminEmailHealth />
          </Suspense>
        }
      />
      <Route
        path="monitoring/agents"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAgentMonitoring />
          </Suspense>
        }
      />
      <Route
        path="monitoring/functional"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFunctionalMonitoring />
          </Suspense>
        }
      />
      <Route
        path="connection-logs"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminConnectionLogs />
          </Suspense>
        }
      />
      <Route
        path="settings"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSettings />
          </Suspense>
        }
      />
      <Route
        path="help/center"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminHelpCenter />
          </Suspense>
        }
      />

      {/* 🤖 AI SUBSCRIPTION MANAGEMENT */}
      <Route
        path="ia"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminIA />
          </Suspense>
        }
      />

      {/* 📊 RAPPORTS & ANALYTICS */}
      <Route
        path="analytics/unified"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUnifiedAnalytics />
          </Suspense>
        }
      />
      <Route
        path="reports/country-stats"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminCountryStats />
          </Suspense>
        }
      />
      <Route
        path="reports/error-logs"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminErrorLogs />
          </Suspense>
        }
      />
      <Route
        path="security/alerts"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminSecurityAlerts />
          </Suspense>
        }
      />
      <Route
        path="reports/financial"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminFinancialReports />
          </Suspense>
        }
      />
      <Route
        path="reports/users"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminUserAnalytics />
          </Suspense>
        }
      />
      <Route
        path="reports/performance"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPlatformPerformance />
          </Suspense>
        }
      />
      <Route
        path="reports/exports"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDataExports />
          </Suspense>
        }
      />

      {/* Routes historiques / alias */}
      <Route path="users" element={<Navigate to="users/all" replace />} />
      <Route
        path="providers"
        element={<Navigate to="users/providers/lawyers" replace />}
      />
      {/* Legacy /admin/payments redirect removed — now served by AdminPaymentsDashboard */}
      <Route
        path="invoices"
        element={<Navigate to="finance/invoices" replace />}
      />
      <Route
        path="notifications"
        element={<Navigate to="comms/notifications" replace />}
      />
      <Route
        path="messages"
        element={<Navigate to="comms/messages" replace />}
      />
      <Route
        path="dashboard/global"
        element={<Navigate to="../dashboard" replace />}
      />
      <Route
        path="dashboard/alerts"
        element={<Navigate to="../reports/performance" replace />}
      />
      <Route
        path="dashboard/reports"
        element={<Navigate to="../reports/financial" replace />}
      />
      <Route
        path="finance"
        element={<Navigate to="finance/dashboard" replace />}
      />
      <Route
        path="users/all"
        element={<Navigate to="users/clients" replace />}
      />
      <Route path="comms" element={<Navigate to="comms/campaigns" replace />} />

      <Route path="promos" element={<Navigate to="promos/codes" replace />} />

      <Route
        path="reports"
        element={<Navigate to="reports/country-stats" replace />}
      />

      {/* 📧 MARKETING */}
      <Route
        path="marketing/templates-emails"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <TemplatesEmails />
          </Suspense>
        }
      />
      <Route
        path="marketing/notifications"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <NotificationsRouting />
          </Suspense>
        }
      />
      <Route
        path="marketing/delivrabilite"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <DelivrabiliteLogs />
          </Suspense>
        }
      />
      <Route
        path="marketing/messages-temps-reel"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <MessagesTempsReel />
          </Suspense>
        }
      />
      <Route
        path="marketing/ads-analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminAdsAnalytics />
          </Suspense>
        }
      />
      <Route
        path="marketing/trustpilot"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminTrustpilot />
          </Suspense>
        }
      />
      <Route
        path="marketing/meta-analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminMetaAnalytics />
          </Suspense>
        }
      />
      <Route
        path="marketing/google-ads-analytics"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminGoogleAdsAnalytics />
          </Suspense>
        }
      />
      <Route
        path="marketing/landing-pages"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLandingPages />
          </Suspense>
        }
      />
      <Route
        path="marketing/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminMarketingResources />
          </Suspense>
        }
      />
      <Route path="marketing" element={<Navigate to="marketing/templates-emails" replace />} />

      {/* 📰 PRESSE */}
      <Route
        path="press/resources"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPressResources />
          </Suspense>
        }
      />
      <Route
        path="press/releases"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminPressReleases />
          </Suspense>
        }
      />

      {/* 404 admin */}
      <Route path="*" element={<AdminNotFound />} />
      </Route>{/* End AdminProtectedLayout */}
    </Routes>
  );
};

// ===== HOOK UTILITAIRE POUR VALIDATION DES ROUTES =====
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminRouteValidation = () => {
  const validateRoute = (path: string): boolean => {
    const validPaths = [
      "/admin/login",
      "/admin/dashboard",
      "/admin/users/all",
      "/admin/users/clients",
      "/admin/users/providers/lawyers",
      "/admin/users/providers/expats",
      "/admin/users/providers/stats",
      "/admin/aaaprofiles",
      "/admin/approvals/lawyers",
      "/admin/kyc/providers",
      "/admin/reviews",
      "/admin/validation",
      "/admin/finance/dashboard",
      "/admin/finance/transactions",
      "/admin/finance/subscriptions",
      "/admin/finance/refunds",
      "/admin/finance/disputes",
      "/admin/finance/payments",
      "/admin/finance/invoices",
      "/admin/finance/taxes",
      "/admin/finance/taxes/by-country",
      "/admin/finance/thresholds",
      "/admin/finance/filings",
      "/admin/finance/reconciliation",
      "/admin/finance/payouts",
      "/admin/finance/exports",
      "/admin/finance/ledger",
      "/admin/finance/balance-sheet",
      "/admin/finance/profit-loss",
      "/admin/finance/cash-flow",
      "/admin/finance/supporting-documents",
      "/admin/subscription-plans",
      "/admin/analytics/costs",
      "/admin/analytics/gcp-costs",
      "/admin/payments/monitoring",
      "/admin/calls",
      "/admin/calls/sessions",
      "/admin/calls/received",
      "/admin/calls/errors",
      "/admin/comms/campaigns",
      "/admin/comms/automations",
      "/admin/comms/segments",
      "/admin/comms/templates",
      "/admin/comms/deliverability",
      "/admin/comms/suppression",
      "/admin/comms/ab",
      "/admin/comms/messages",
      "/admin/comms/notifications",
      "/admin/contact-messages",
      "/admin/commissions",
      "/admin/affiliates",
      "/admin/affiliates/dashboard",
      "/admin/affiliates/:affiliateId",
      "/admin/affiliates/config",
      "/admin/affiliates/plans",
      "/admin/affiliates/rules",
      "/admin/affiliates/commissions",
      "/admin/affiliates/payouts",
      "/admin/affiliates/reports",
      "/admin/affiliates/fraud",
      "/admin/b2b/accounts",
      "/admin/b2b/members",
      "/admin/b2b/pricing",
      "/admin/b2b/billing",
      "/admin/b2b/invoices",
      "/admin/b2b/reports",
      "/admin/chatters",
      "/admin/chatters/:chatterId",
      "/admin/chatters/payments",
      "/admin/chatters/config",
      "/admin/chatters/commissions",
      "/admin/chatters/resources",
      "/admin/marketing/whatsapp-groups",
      "/admin/marketing/whatsapp-supervision",
      "/admin/marketing/telegram-groups",
      "/admin/marketing/telegram-managers",
      "/admin/marketing/telegram-bots",
      "/admin/influencers",
      "/admin/influencers/:influencerId",
      "/admin/influencers/payments",
      "/admin/influencers/leaderboard",
      "/admin/influencers/config",
      "/admin/influencers/resources",
      "/admin/influencers/promotions",
      "/admin/bloggers",
      "/admin/bloggers/:bloggerId",
      "/admin/bloggers/payments",
      "/admin/bloggers/resources",
      "/admin/bloggers/guide",
      "/admin/bloggers/articles",
      "/admin/bloggers/config",
      "/admin/group-admins",
      "/admin/group-admins/:groupAdminId",
      "/admin/group-admins/payments",
      "/admin/group-admins/recruitments",
      "/admin/group-admins/resources",
      "/admin/group-admins/posts",
      "/admin/group-admins/config",
      "/admin/group-admins/promotions",
      "/admin/payments",
      "/admin/payments/withdrawals",
      "/admin/payments/:userType/:withdrawalId",
      "/admin/payments/config",
      "/admin/pricing",
      "/admin/countries",
      "/admin/documents",
      "/admin/backups",
      "/admin/system-health",
      "/admin/monitoring/agents",
      "/admin/monitoring/functional",
      "/admin/connection-logs",
      "/admin/settings",
      "/admin/reports/country-stats",
      "/admin/reports/financial",
      "/admin/reports/users",
      "/admin/reports/performance",
      "/admin/reports/exports",
      "/admin/security/alerts",
      "/admin/promos/codes",
      "/admin/help/center",
      "/admin/ia",
      "/admin/marketing/ads-analytics",
      "/admin/marketing/trustpilot",
      "/admin/marketing/meta-analytics",
      "/admin/marketing/google-ads-analytics",
      "/admin/marketing/landing-pages",
      "/admin/analytics/unified",
      "/admin/feedback",
      "/admin/toolbox/telegram",
      "/admin/toolbox/telegram/dashboard",
      "/admin/toolbox/telegram/campaigns",
      "/admin/toolbox/telegram/campaigns/create",
      "/admin/toolbox/telegram/templates",
      "/admin/toolbox/telegram/subscribers",
      "/admin/toolbox/telegram/queue",
      "/admin/toolbox/telegram/logs",
      "/admin/toolbox/telegram/config",
      "/admin/marketing/resources",
    ];
    return validPaths.includes(path);
  };

  return { validateRoute };
};

export default AdminRoutesV2;

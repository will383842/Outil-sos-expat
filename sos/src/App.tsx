// App.tsx
import React, { useEffect, Suspense, lazy, useState, useRef } from 'react';
import { IntlProvider } from 'react-intl';
import { Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useDeviceDetection } from './hooks/useDeviceDetection';
import { useAuth } from './contexts/AuthContext';
import { registerSW, measurePerformance } from './utils/performance';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoutesV2 from '@/components/admin/AdminRoutesV2';
import { trackEvent, hasAnalyticsConsent } from './utils/ga4';
import MetaPageViewTracker from './components/common/MetaPageViewTracker';
import { setMetaPixelUserData, applyMetaPixelUserData, clearMetaPixelUserData } from './utils/metaPixel';
import { captureTrafficSource } from './utils/trafficSource';
import './App.css';
import PWAProvider from './components/pwa/PWAProvider';
import { WizardProvider } from './contexts/WizardContext';
import { FeedbackButton } from './components/feedback';
import ProviderOnlineManager from './components/providers/ProviderOnlineManager';
import { PayPalProvider } from './contexts/PayPalContext';
// AFFILIATE: Capture referral codes from URL
import { useReferralCapture } from './hooks/useAffiliate';
import { migrateFromLegacyStorage, storeReferralCode } from './utils/referralStorage';
import type { ActorType, ReferralCodeType } from './utils/referralStorage';
// Marketing routes moved to AdminRoutesV2 (accessible via /admin/marketing/*)
import enMessages from "./helper/en.json";
import esMessages from "./helper/es.json";
import frMessages from "./helper/fr.json";
import ruMessages from "./helper/ru.json";
import deMessages from "./helper/de.json";
import hiMessages from "./helper/hi.json";
import ptMessages from "./helper/pt.json";
import chMessages from "./helper/ch.json";
import arMessages from './helper/ar.json';
import { useApp } from "./contexts/AppContext";
import {
  LocaleRouter,
  getLocaleString,
  parseLocaleFromPath,
  getAllTranslatedSlugs,
  type RouteKey,
} from "./multilingual-system";
import HreflangLinks from "./multilingual-system/components/HrefLang/HreflangLinks";

// --------------------------------------------
// Types
// --------------------------------------------
interface RouteConfig {
  path: string;
  component:
  | React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>
  | React.ComponentType<Record<string, unknown>>;
  protected?: boolean;
  role?: string | string[];
  alias?: string;
  preload?: boolean;
  translated?: RouteKey;
}

// --------------------------------------------
// Lazy pages
// --------------------------------------------

// Accueil
const Home = lazy(() => import('./pages/Home'));

// Auth
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const RegisterExpat = lazy(() => import('./pages/RegisterExpat'));
const RegisterLawyer = lazy(() => import('./pages/RegisterLawyer'));
const RegisterClient = lazy(() => import('./pages/RegisterClient'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./pages/PasswordResetConfirm'));

// Utilisateur
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'));
const DashboardMessages = lazy(() => import('@/components/dashboard/DashboardMessages'));

// Services
const SOSCall = lazy(() => import('./pages/SOSCall'));
const ExpatCall = lazy(() => import('./pages/ExpatCall'));
const CallCheckout = lazy(() => import('./pages/CallCheckoutWrapper'));
const BookingRequest = lazy(() => import('./pages/BookingRequest'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const Providers = lazy(() => import('./pages/Providers'));
const Pricing = lazy(() => import('./pages/Pricing'));

// Pages d'info
const SEO = lazy(() => import('./pages/SEO'));
const ServiceStatus = lazy(() => import('./pages/ServiceStatus'));
const Consumers = lazy(() => import('./pages/Consumers'));
const Cookies = lazy(() => import('./pages/Cookies'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsExpats = lazy(() => import('./pages/TermsExpats'));
const TermsLawyers = lazy(() => import('./pages/TermsLawyers'));
const TermsClients = lazy(() => import('./pages/TermsClients'));
const TermsChatters = lazy(() => import('./pages/TermsChatters'));
const TermsInfluencers = lazy(() => import('./pages/TermsInfluencers'));
const TermsBloggers = lazy(() => import('./pages/TermsBloggers'));
const TermsGroupAdmins = lazy(() => import('./pages/TermsGroupAdmins'));
const TermsAffiliate = lazy(() => import('./pages/TermsAffiliate'));
const TestimonialDetail = lazy(() => import('./pages/TestimonialDetail'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const HelpArticle = lazy(() => import('./pages/HelpArticle'));
const FAQ = lazy(() => import('./pages/FAQ'));
const FAQDetail = lazy(() => import('./pages/FAQDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));



// Error pages - NOT lazy loaded to avoid flash during route transitions
import NotFound from "./pages/NotFound";

// PWA
const ShareTarget = lazy(() => import('./pages/ShareTarget'));

// Subscription & AI Assistant
const AiAssistantPage = lazy(() => import('./pages/Dashboard/AiAssistant/Index'));
const SubscriptionPage = lazy(() => import('./pages/Dashboard/Subscription/Index'));
const PlansPage = lazy(() => import('./pages/Dashboard/Subscription/Plans'));
const SubscriptionSuccessPage = lazy(() => import('./pages/Dashboard/Subscription/Success'));

// KYC Return Handler (Stripe Connect onboarding return)
const KycReturn = lazy(() => import('./pages/Dashboard/KycReturn'));

// Conversations (Provider Tool - integrated from Outil-sos-expat)
const ConversationHistory = lazy(() => import('./pages/Dashboard/Conversations/History'));

// Affiliate Program
const AffiliateDashboard = lazy(() => import('./pages/Affiliate/AffiliateDashboard'));
const AffiliateEarnings = lazy(() => import('./pages/Affiliate/AffiliateEarnings'));
const AffiliateReferrals = lazy(() => import('./pages/Affiliate/AffiliateReferrals'));
const AffiliateWithdraw = lazy(() => import('./pages/Affiliate/AffiliateWithdraw'));
const AffiliateBankDetails = lazy(() => import('./pages/Affiliate/AffiliateBankDetails'));
const AffiliateTools = lazy(() => import('./pages/Affiliate/AffiliateTools'));
const AffiliateTelegramOnboarding = lazy(() => import('./pages/Affiliate/AffiliateTelegramOnboarding'));

// Multi-Provider Dashboard (standalone, password-protected)
const MultiProviderDashboard = lazy(() => import('./pages/MultiProviderDashboard'));

// Chatter System
const ChatterLanding = lazy(() => import('./pages/Chatter/ChatterLanding'));
const ChatterLandingOld = lazy(() => import('./pages/Chatter/ChatterLandingOld'));
const ChatterRegister = lazy(() => import('./pages/Chatter/ChatterRegister'));
const ChatterTelegramOnboarding = lazy(() => import('./pages/Chatter/ChatterTelegramOnboarding'));
const ChatterDashboard = lazy(() => import('./pages/Chatter/ChatterDashboard'));
const ChatterLeaderboard = lazy(() => import('./pages/Chatter/ChatterLeaderboard'));
const ChatterPayments = lazy(() => import('./pages/Chatter/ChatterPayments'));
const ChatterSuspended = lazy(() => import('./pages/Chatter/ChatterSuspended'));
const ChatterPosts = lazy(() => import('./pages/Chatter/ChatterPosts'));
const ChatterTraining = lazy(() => import('./pages/Chatter/ChatterTraining'));
const ChatterReferrals = lazy(() => import('./pages/Chatter/ChatterReferrals'));
const ChatterReferralEarnings = lazy(() => import('./pages/Chatter/ChatterReferralEarnings'));
const ChatterRefer = lazy(() => import('./pages/Chatter/ChatterRefer'));
const ChatterProfile = lazy(() => import('./pages/Chatter/ChatterProfile'));
// Influencer System
const InfluencerLanding = lazy(() => import('./pages/Influencer/InfluencerLanding'));
const InfluencerRegister = lazy(() => import('./pages/Influencer/InfluencerRegister'));
const InfluencerTelegramOnboarding = lazy(() => import('./pages/Influencer/InfluencerTelegramOnboarding'));
const InfluencerDashboard = lazy(() => import('./pages/Influencer/InfluencerDashboard'));
const InfluencerEarnings = lazy(() => import('./pages/Influencer/InfluencerEarnings'));
const InfluencerReferrals = lazy(() => import('./pages/Influencer/InfluencerReferrals'));
const InfluencerLeaderboard = lazy(() => import('./pages/Influencer/InfluencerLeaderboard'));
const InfluencerPayments = lazy(() => import('./pages/Influencer/InfluencerPayments'));
const InfluencerProfile = lazy(() => import('./pages/Influencer/InfluencerProfile'));
const InfluencerPromoTools = lazy(() => import('./pages/Influencer/InfluencerPromoTools'));
const InfluencerResources = lazy(() => import('./pages/Influencer/InfluencerResources'));
const InfluencerTraining = lazy(() => import('./pages/Influencer/InfluencerTraining'));
const InfluencerSuspended = lazy(() => import('./pages/Influencer/InfluencerSuspended'));

// Blogger System
const BloggerLanding = lazy(() => import('./pages/Blogger/BloggerLanding'));
const BloggerRegister = lazy(() => import('./pages/Blogger/BloggerRegister'));
const BloggerTelegramOnboarding = lazy(() => import('./pages/Blogger/BloggerTelegramOnboarding'));
const BloggerDashboard = lazy(() => import('./pages/Blogger/BloggerDashboard'));
const BloggerEarnings = lazy(() => import('./pages/Blogger/BloggerEarnings'));
const BloggerReferrals = lazy(() => import('./pages/Blogger/BloggerReferrals'));
const BloggerBloggerRecruitment = lazy(() => import('./pages/Blogger/BloggerBloggerRecruitment'));
const BloggerLeaderboard = lazy(() => import('./pages/Blogger/BloggerLeaderboard'));
const BloggerPayments = lazy(() => import('./pages/Blogger/BloggerPayments'));
const BloggerResources = lazy(() => import('./pages/Blogger/BloggerResources'));
const BloggerGuide = lazy(() => import('./pages/Blogger/BloggerGuide'));
const BloggerWidgets = lazy(() => import('./pages/Blogger/BloggerWidgets'));
const BloggerProfile = lazy(() => import('./pages/Blogger/BloggerProfile'));
const BloggerSuspended = lazy(() => import('./pages/Blogger/BloggerSuspended'));

// GroupAdmin System (Facebook Group Administrators)
const GroupAdminLanding = lazy(() => import('./pages/GroupAdmin/GroupAdminLanding'));
const GroupAdminRegister = lazy(() => import('./pages/GroupAdmin/GroupAdminRegister'));
const GroupAdminTelegramOnboarding = lazy(() => import('./pages/GroupAdmin/GroupAdminTelegramOnboarding'));
const GroupAdminDashboard = lazy(() => import('./pages/GroupAdmin/GroupAdminDashboard'));
const GroupAdminResources = lazy(() => import('./pages/GroupAdmin/GroupAdminResources'));
const GroupAdminPosts = lazy(() => import('./pages/GroupAdmin/GroupAdminPosts'));
const GroupAdminPayments = lazy(() => import('./pages/GroupAdmin/GroupAdminPayments'));
const GroupAdminReferrals = lazy(() => import('./pages/GroupAdmin/GroupAdminReferrals'));
const GroupAdminGroupAdminRecruitment = lazy(() => import('./pages/GroupAdmin/GroupAdminGroupAdminRecruitment'));
const GroupAdminLeaderboard = lazy(() => import('./pages/GroupAdmin/GroupAdminLeaderboard'));
const GroupAdminProfile = lazy(() => import('./pages/GroupAdmin/GroupAdminProfile'));
const GroupAdminSuspended = lazy(() => import('./pages/GroupAdmin/GroupAdminSuspended'));
const GroupAdminDirectory = lazy(() => import('./pages/GroupAdmin/GroupAdminDirectory'));
const InfluencerDirectory = lazy(() => import('./pages/Influencer/InfluencerDirectory'));
const BloggerDirectory = lazy(() => import('./pages/Blogger/BloggerDirectory'));
const ChatterDirectory = lazy(() => import('./pages/Chatter/ChatterDirectory'));

// -------------------------------------------
// Laguage config
// -------------------------------------------
const messages = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  ru: ruMessages,
  de: deMessages,
  hi: hiMessages,
  pt: ptMessages,
  ch: chMessages,
  ar: arMessages,
}

// --------------------------------------------
// Routes config
// --------------------------------------------

// Publiques (sans EmailVerification)
const routeConfigs: RouteConfig[] = [
  { path: "/", component: Home, preload: true },
  { path: "/login", component: Login, preload: true, translated: "login" },
  { path: "/register", component: Register, preload: true, translated: "register" },
  { path: "/register/client", component: RegisterClient, translated: "register-client" },
  { path: "/register/lawyer", component: RegisterLawyer, translated: "register-lawyer" },
  { path: "/register/expat", component: RegisterExpat, translated: "register-expat" },
  { path: "/password-reset", component: PasswordReset, translated: "password-reset" },
  { path: "/password-reset-confirm", component: PasswordResetConfirm },

  // Tarifs (alias FR/EN)
  { path: "/tarifs", component: Pricing, alias: "/pricing", preload: true, translated: "pricing" },

  // Contact & aide
  { path: "/contact", component: Contact, translated: "contact" },
  { path: "/how-it-works", component: HowItWorks, translated: "how-it-works" },
  { path: "/faq", component: FAQ, translated: "faq" },
  { path: "/faq/:slug", component: FAQDetail, translated: "faq" },
  { path: "/centre-aide", component: HelpCenter, translated: "help-center" },
  { path: "/centre-aide/:slug", component: HelpArticle, translated: "help-center" },
  { path: "/help-center/:slug", component: HelpArticle, translated: "help-center" },

  // Témoignages
  { path: "/testimonials", component: Testimonials, alias: "/temoignages", translated: "testimonials" },
  // New SEO-friendly URL format: /testimonials/country/language/review-type-urgently
  {
    path: "/testimonials/:country/:language/:reviewType",
    component: TestimonialDetail,
    translated: "testimonials",
  },
  {
    path: "/temoignages/:country/:language/:reviewType",
    component: TestimonialDetail,
    translated: "testimonials",
  },

  // Légal / info (alias FR/EN)
  { path: "/terms-clients", component: TermsClients, alias: "/cgu-clients", translated: "terms-clients" },
  { path: "/terms-lawyers", component: TermsLawyers, alias: "/cgu-avocats", translated: "terms-lawyers" },
  { path: "/terms-expats", component: TermsExpats, alias: "/cgu-expatries", translated: "terms-expats" },
  { path: "/terms-chatters", component: TermsChatters, alias: "/cgu-chatters", translated: "terms-chatters" },
  { path: "/terms-influencers", component: TermsInfluencers, alias: "/cgu-influenceurs", translated: "terms-influencers" },
  { path: "/terms-bloggers", component: TermsBloggers, alias: "/cgu-bloggers", translated: "terms-bloggers" },
  { path: "/terms-group-admins", component: TermsGroupAdmins, alias: "/cgu-group-admins", translated: "terms-group-admins" },
  { path: "/terms-affiliate", component: TermsAffiliate, alias: "/cgu-affiliation", translated: "terms-affiliate" },
  {
    path: "/privacy-policy",
    component: PrivacyPolicy,
    alias: "/politique-confidentialite",
    translated: "privacy-policy",
  },
  { path: "/cookies", component: Cookies, translated: "cookies" },
  { path: "/consumers", component: Consumers, alias: "/consommateurs", translated: "consumers" },
  { path: "/statut-service", component: ServiceStatus, translated: "service-status" },
  { path: "/seo", component: SEO, alias: "/referencement", translated: "seo" },

  // Services d'appel
  { path: "/sos-appel", component: SOSCall, translated: "sos-call" },
  { path: "/appel-expatrie", component: ExpatCall, translated: "expat-call" },

  // Fournisseurs publics (utilise SOSCall sans wizard)
  { path: "/providers", component: SOSCall, alias: "/nos-experts", translated: "providers" },
  { path: "/provider/:id", component: ProviderProfile, translated: "provider" },

  // Simplified route patterns - just type and slug (rétrocompatibilité)
  { path: "/avocat/:slug", component: ProviderProfile, translated: "lawyer" },
  { path: "/lawyers/:slug", component: ProviderProfile, translated: "lawyer" },
  { path: "/expatrie/:slug", component: ProviderProfile, translated: "expat" },
  { path: "/expats/:slug", component: ProviderProfile, translated: "expat" },

  // Legacy routes for backward compatibility (ancien format)
  { path: "/avocat/:country/:language/:nameId", component: ProviderProfile, translated: "lawyer" },
  { path: "/avocat/:country/:language/*", component: ProviderProfile, translated: "lawyer" },
  { path: "/expatrie/:country/:language/:nameId", component: ProviderProfile, translated: "expat" },
  { path: "/expatrie/:country/:language/*", component: ProviderProfile, translated: "expat" },
  { path: "/lawyers/:country/:language/:nameId", component: ProviderProfile, translated: "lawyer" },
  { path: "/lawyers/:country/:language/*", component: ProviderProfile, translated: "lawyer" },
  { path: "/expats/:country/:language/:nameId", component: ProviderProfile, translated: "expat" },
  { path: "/expats/:country/:language/*", component: ProviderProfile, translated: "expat" },

  // PWA Share Target
  { path: "/share-target", component: ShareTarget },

  // Chatter Landing Page (public) - Nouvelle version optimisée
  { path: "/devenir-chatter", component: ChatterLanding, translated: "chatter-landing" },
  // Ancienne version (backup)
  { path: "/devenir-chatter-old", component: ChatterLandingOld },

  // Influencer Landing Page (public)
  { path: "/devenir-influenceur", component: InfluencerLanding, translated: "influencer-landing" },

  // Blogger Landing Page (public)
  { path: "/devenir-blogger", component: BloggerLanding, translated: "blogger-landing" },

  // GroupAdmin Landing Page (public) - for Facebook group administrators
  { path: "/devenir-admin-groupe", component: GroupAdminLanding, translated: "groupadmin-landing" },
  { path: "/groupes-communaute", component: GroupAdminDirectory, translated: "group-community" },
  { path: "/nos-influenceurs", component: InfluencerDirectory, translated: "influencer-directory" },
  { path: "/nos-blogueurs", component: BloggerDirectory, translated: "blogger-directory" },
  { path: "/nos-chatters", component: ChatterDirectory, translated: "chatter-directory" },
];

// Protégées (utilisateur)
const protectedUserRoutes: RouteConfig[] = [
  { path: "/dashboard", component: Dashboard, protected: true, translated: "dashboard" },
  { path: "/profile/edit", component: ProfileEdit, protected: true, translated: "profile-edit" },
  { path: "/call-checkout", component: CallCheckout, protected: true, translated: "call-checkout" },
  {
    path: "/call-checkout/:providerId",
    component: CallCheckout,
    protected: true,
    translated: "call-checkout",
  },
  {
    path: "/booking-request/:providerId",
    component: BookingRequest,
    protected: true,
    translated: "booking-request",
  },
  { path: "/booking-request", component: BookingRequest, protected: true, translated: "booking-request" },
  { path: "/payment-success", component: PaymentSuccess, protected: true, translated: "payment-success" },
  {
    path: "/dashboard/messages",
    component: DashboardMessages,
    protected: true,
    translated: "dashboard-messages",
  },
  // AI Subscription Routes (providers: lawyer, expat + admin for testing)
  { path: "/dashboard/ai-assistant", component: AiAssistantPage, protected: true, role: ['lawyer', 'expat', 'admin'], translated: "dashboard-ai-assistant" },
  { path: "/dashboard/subscription", component: SubscriptionPage, protected: true, role: ['lawyer', 'expat', 'admin'], translated: "dashboard-subscription" },
  { path: "/dashboard/subscription/plans", component: PlansPage, protected: true, role: ['lawyer', 'expat', 'admin'], translated: "dashboard-subscription-plans" },
  { path: "/dashboard/subscription/success", component: SubscriptionSuccessPage, protected: true, role: ['lawyer', 'expat', 'admin'], translated: "dashboard-subscription-success" },
  // KYC Return Handler - Stripe Connect onboarding callback
  { path: "/dashboard/kyc", component: KycReturn, protected: true, role: ['lawyer', 'expat'], translated: "dashboard-kyc" },
  // Conversations History (Provider Tool)
  { path: "/dashboard/conversations", component: ConversationHistory, protected: true, role: ['lawyer', 'expat', 'admin'], translated: "dashboard-conversations" },
  // Affiliate Program Routes - Accessible to all authenticated users (clients, lawyers, expats, admins)
  { path: "/affiliate", component: AffiliateDashboard, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-dashboard" },
  { path: "/affiliate/earnings", component: AffiliateEarnings, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-earnings" },
  { path: "/affiliate/referrals", component: AffiliateReferrals, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-referrals" },
  { path: "/affiliate/withdraw", component: AffiliateWithdraw, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-withdraw" },
  { path: "/affiliate/bank-details", component: AffiliateBankDetails, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-bank-details" },
  { path: "/affiliate/tools", component: AffiliateTools, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-tools" },
  { path: "/affiliate/telegram", component: AffiliateTelegramOnboarding, protected: true, role: ['client', 'lawyer', 'expat', 'admin'], translated: "affiliate-telegram" },
  // Chatter System Routes - Protected routes for registered chatters
  // IMPORTANT: Les rôles sont mutuellement exclusifs. Un chatter ne peut pas être client/lawyer/expat.
  // L'inscription est PUBLIQUE - le composant gère la vérification des rôles existants
  { path: "/chatter/inscription", component: ChatterRegister, translated: "chatter-register" },
  // Après inscription, l'utilisateur passe par l'onboarding Telegram (optionnel mais incentivé)
  { path: "/chatter/telegram", component: ChatterTelegramOnboarding, protected: true, role: 'chatter', translated: "chatter-telegram" },
  { path: "/chatter/tableau-de-bord", component: ChatterDashboard, protected: true, role: 'chatter', translated: "chatter-dashboard" },
  { path: "/chatter/classement", component: ChatterLeaderboard, protected: true, role: 'chatter', translated: "chatter-leaderboard" },
  { path: "/chatter/paiements", component: ChatterPayments, protected: true, role: 'chatter', translated: "chatter-payments" },
  { path: "/chatter/suspendu", component: ChatterSuspended, protected: true, role: 'chatter', translated: "chatter-suspended" },
  { path: "/chatter/posts", component: ChatterPosts, protected: true, role: 'chatter', translated: "chatter-posts" },
  { path: "/chatter/formation", component: ChatterTraining, protected: true, role: 'chatter', translated: "chatter-training" },
  { path: "/chatter/filleuls", component: ChatterReferrals, protected: true, role: 'chatter', translated: "chatter-referrals" },
  { path: "/chatter/gains-parrainage", component: ChatterReferralEarnings, protected: true, role: 'chatter', translated: "chatter-referral-earnings" },
  { path: "/chatter/parrainer", component: ChatterRefer, protected: true, role: 'chatter', translated: "chatter-refer" },
  { path: "/chatter/profil", component: ChatterProfile, protected: true, role: 'chatter' },

  // Influencer System Routes - Protected routes for registered influencers
  // IMPORTANT: Les rôles sont mutuellement exclusifs. Un influenceur ne peut pas être client/lawyer/expat/chatter.
  // L'inscription est PUBLIQUE - le composant gère la vérification des rôles existants
  { path: "/influencer/inscription", component: InfluencerRegister, translated: "influencer-register" },
  // Après inscription, l'utilisateur passe par l'onboarding Telegram (optionnel mais incentivé)
  { path: "/influencer/telegram", component: InfluencerTelegramOnboarding, protected: true, role: 'influencer', translated: "influencer-telegram" },
  // Après inscription, l'utilisateur a role="influencer" - toutes les autres routes sont réservées aux influenceurs
  { path: "/influencer/tableau-de-bord", component: InfluencerDashboard, protected: true, role: 'influencer', translated: "influencer-dashboard" },
  { path: "/influencer/gains", component: InfluencerEarnings, protected: true, role: 'influencer', translated: "influencer-earnings" },
  { path: "/influencer/filleuls", component: InfluencerReferrals, protected: true, role: 'influencer', translated: "influencer-referrals" },
  { path: "/influencer/classement", component: InfluencerLeaderboard, protected: true, role: 'influencer', translated: "influencer-leaderboard" },
  { path: "/influencer/paiements", component: InfluencerPayments, protected: true, role: 'influencer', translated: "influencer-payments" },
  { path: "/influencer/ressources", component: InfluencerResources, protected: true, role: 'influencer', translated: "influencer-resources" },
  { path: "/influencer/formation", component: InfluencerTraining, protected: true, role: 'influencer', translated: "influencer-training" },
  { path: "/influencer/outils", component: InfluencerPromoTools, protected: true, role: 'influencer', translated: "influencer-promo-tools" },
  { path: "/influencer/profil", component: InfluencerProfile, protected: true, role: 'influencer', translated: "influencer-profile" },
  { path: "/influencer/suspendu", component: InfluencerSuspended, protected: true, role: 'influencer', translated: "influencer-suspended" },

  // Blogger System Routes - Protected routes for registered bloggers
  // IMPORTANT: Les rôles sont mutuellement exclusifs. Un blogueur ne peut pas devenir chatter/influencer/client/lawyer/expat.
  // L'inscription est PUBLIQUE - le composant gère la vérification des rôles existants
  { path: "/blogger/inscription", component: BloggerRegister, translated: "blogger-register" },
  // Après inscription, l'utilisateur passe par l'onboarding Telegram (optionnel mais incentivé)
  { path: "/blogger/telegram", component: BloggerTelegramOnboarding, protected: true, role: 'blogger', translated: "blogger-telegram" },
  // Après inscription, l'utilisateur a role="blogger" - toutes les autres routes sont réservées aux blogueurs
  { path: "/blogger/tableau-de-bord", component: BloggerDashboard, protected: true, role: 'blogger', translated: "blogger-dashboard" },
  { path: "/blogger/gains", component: BloggerEarnings, protected: true, role: 'blogger', translated: "blogger-earnings" },
  { path: "/blogger/filleuls", component: BloggerReferrals, protected: true, role: 'blogger', translated: "blogger-referrals" },
  { path: "/blogger/parrainage-blogueurs", component: BloggerBloggerRecruitment, protected: true, role: 'blogger', translated: "blogger-blogger-recruitment" },
  { path: "/blogger/classement", component: BloggerLeaderboard, protected: true, role: 'blogger', translated: "blogger-leaderboard" },
  { path: "/blogger/paiements", component: BloggerPayments, protected: true, role: 'blogger', translated: "blogger-payments" },
  { path: "/blogger/ressources", component: BloggerResources, protected: true, role: 'blogger', translated: "blogger-resources" },
  { path: "/blogger/guide", component: BloggerGuide, protected: true, role: 'blogger', translated: "blogger-guide" },
  { path: "/blogger/widgets", component: BloggerWidgets, protected: true, role: 'blogger', translated: "blogger-widgets" },
  { path: "/blogger/profil", component: BloggerProfile, protected: true, role: 'blogger', translated: "blogger-profile" },
  { path: "/blogger/suspendu", component: BloggerSuspended, protected: true, role: 'blogger', translated: "blogger-suspended" },

  // GroupAdmin System Routes - Protected routes for Facebook group administrators
  // IMPORTANT: Les rôles sont mutuellement exclusifs. Un groupAdmin ne peut pas être client/lawyer/expat/chatter/influencer/blogger.
  // L'inscription est PUBLIQUE - le composant gère la vérification des rôles existants
  { path: "/group-admin/inscription", component: GroupAdminRegister, translated: "groupadmin-register" },
  // Après inscription, l'utilisateur passe par l'onboarding Telegram (optionnel mais incentivé)
  { path: "/group-admin/telegram", component: GroupAdminTelegramOnboarding, protected: true, role: 'groupAdmin', translated: "groupadmin-telegram" },
  // Après inscription, l'utilisateur a role="groupAdmin" - toutes les autres routes sont réservées aux groupAdmins
  { path: "/group-admin/tableau-de-bord", component: GroupAdminDashboard, protected: true, role: 'groupAdmin', translated: "groupadmin-dashboard" },
  { path: "/group-admin/ressources", component: GroupAdminResources, protected: true, role: 'groupAdmin', translated: "groupadmin-resources" },
  { path: "/group-admin/posts", component: GroupAdminPosts, protected: true, role: 'groupAdmin', translated: "groupadmin-posts" },
  { path: "/group-admin/paiements", component: GroupAdminPayments, protected: true, role: 'groupAdmin', translated: "groupadmin-payments" },
  { path: "/group-admin/filleuls", component: GroupAdminReferrals, protected: true, role: 'groupAdmin', translated: "groupadmin-referrals" },
  { path: "/group-admin/parrainage-admins", component: GroupAdminGroupAdminRecruitment, protected: true, role: 'groupAdmin', translated: "groupadmin-admin-recruitment" },
  { path: "/group-admin/classement", component: GroupAdminLeaderboard, protected: true, role: 'groupAdmin', translated: "groupadmin-leaderboard" },
  { path: "/group-admin/profil", component: GroupAdminProfile, protected: true, role: 'groupAdmin', translated: "groupadmin-profile" },
  { path: "/group-admin/suspendu", component: GroupAdminSuspended, protected: true, role: 'groupAdmin', translated: "groupadmin-suspended" },
];

// ====================================
// CATCH-ALL PROVIDER ROUTES (must be rendered LAST)
// These generic patterns match 3-segment URLs like /:langLocale/:roleCountry/:nameSlug
// They MUST be after all specific routes (like booking-request) to avoid matching conflicts
// ====================================
const catchAllProviderRoutes: RouteConfig[] = [
  // Routes avec lang-locale (format complet pour SEO)
  // Format: /{lang}-{locale}/{role-pays}/{prenom-specialite-shortid}
  // Ex: /fr-fr/avocat-thailande/julien-visa-k7m2p9
  { path: "/fr-fr/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/fr-be/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/fr-ch/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/fr-ca/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/fr-ma/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/en-us/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/en-gb/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/en-au/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/en-ca/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/es-es/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/es-mx/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/es-ar/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/de-de/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/de-at/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/de-ch/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/pt-br/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/pt-pt/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/ru-ru/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/zh-cn/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/zh-tw/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/ar-sa/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/ar-ae/:roleCountry/:nameSlug", component: ProviderProfile },
  { path: "/hi-in/:roleCountry/:nameSlug", component: ProviderProfile },
  // Route générique pour toute combinaison lang-locale non listée
  { path: "/:langLocale/:roleCountry/:nameSlug", component: ProviderProfile },
];

// --------------------------------------------
// SEO par défaut
// --------------------------------------------
const DefaultHelmet: React.FC<{ pathname: string }> = ({ pathname }) => {
  // Remove locale prefix from pathname for metadata lookup
  const { pathWithoutLocale } = parseLocaleFromPath(pathname);
  const _pathForMetadata = pathWithoutLocale === "/" ? "/" : pathWithoutLocale;

  const getPageMetadata = (path: string) => {
    const metaMap: Record<string, { title: string; description: string; lang: string }> = {
      '/': {
        title: 'Avocat ou Expert Local en 5 min - 197 pays',
        description: 'Parlez à un avocat ou expert local dans votre langue en moins de 5 min. 197 pays, toutes langues. Pour expatriés, voyageurs, vacanciers.',
        lang: 'fr',
      },
      '/login': {
        title: 'Connexion - Consultation Juridique',
        description: 'Connectez-vous à votre compte',
        lang: 'fr',
      },
      '/pricing': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr',
      },
      '/tarifs': {
        title: 'Tarifs - Consultation Juridique',
        description: 'Découvrez nos tarifs de consultation',
        lang: 'fr',
      },
      '/testimonials': {
        title: 'Témoignages Clients - Consultation Juridique Expatriés',
        description:
          'Découvrez les témoignages de nos clients expatriés et avocats partout dans le monde',
        lang: 'fr',
      },
      '/temoignages': {
        title: 'Témoignages Clients - Consultation Juridique Expatriés',
        description:
          'Découvrez les témoignages de nos clients expatriés et avocats partout dans le monde',
        lang: 'fr',
      },
    };

    return (
      metaMap[path] || {
        title: 'Consultation Juridique Expatriés',
        description: 'Service de consultation juridique pour expatriés',
        lang: 'fr',
      }
    );
  };

  const metadata = getPageMetadata(pathname);
  return (
    <Helmet>
      <html lang={metadata.lang} />
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="theme-color" content="#000000" />
    </Helmet>
  );
};


type Locale = 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

// --------------------------------------------
// PageViewTracker - Tracks route changes for GA4
// P1-1 FIX: Renamed from _PageViewTracker and now rendered in JSX
// --------------------------------------------
const PageViewTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Only track if consent is granted
    if (hasAnalyticsConsent()) {
      trackEvent('page_view', {
        page_location: window.location.href,
        page_path: location.pathname,
        page_title: document.title,
      });
      console.log('📊 GA4: Page view tracked for:', location.pathname);
    }
  }, [location]);

  return null;
};

// --------------------------------------------
// MetaPixelUserTracker - Advanced Matching pour Meta Pixel
// Envoie les donnees utilisateur a Meta pour meilleur retargeting
// --------------------------------------------
const MetaPixelUserTracker: React.FC = () => {
  const { user, isLoading } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Attendre que l'auth soit prete
    if (isLoading) return;

    const currentUserId = user?.uid || null;

    // Si l'utilisateur n'a pas change, ne rien faire
    if (currentUserId === lastUserIdRef.current) return;

    lastUserIdRef.current = currentUserId;

    if (user) {
      // Utilisateur connecte - envoyer les donnees a Meta pour Advanced Matching
      // Note: city, state, zipCode ne sont pas disponibles dans notre User type actuel
      setMetaPixelUserData({
        email: user.email || undefined,
        phone: user.phone || user.phoneNumber || undefined,
        firstName: user.firstName || user.displayName?.split(' ')[0] || undefined,
        lastName: user.lastName || user.displayName?.split(' ').slice(1).join(' ') || undefined,
        country: user.country || user.currentCountry || undefined,
        userId: user.uid, // external_id pour Meta - ameliore le match rate de 20-30%
      });
      // IMPORTANT: Appliquer les donnees a Meta pour activer l'Advanced Matching
      applyMetaPixelUserData();
    } else {
      // Utilisateur deconnecte - effacer les donnees
      clearMetaPixelUserData();
    }
  }, [user, isLoading]);

  return null;
};

// --------------------------------------------
// TrafficSourceCapture - Capture UTM parameters et sources publicitaires
// Pour attribution des conversions (Facebook Ads, Google Ads, etc.)
// --------------------------------------------
const TrafficSourceCapture: React.FC = () => {
  const location = useLocation();
  const capturedRef = useRef(false);

  useEffect(() => {
    // Capturer uniquement au premier rendu avec des parametres UTM ou click IDs
    if (capturedRef.current) return;

    const searchParams = new URLSearchParams(location.search);
    const hasTrackingParams = searchParams.has('utm_source') ||
                              searchParams.has('fbclid') ||
                              searchParams.has('gclid') ||
                              searchParams.has('ttclid');

    if (hasTrackingParams || !capturedRef.current) {
      captureTrafficSource();
      capturedRef.current = true;
    }
  }, [location.search]);

  return null;
};

// --------------------------------------------
// ReferralCodeCapture - Capture referral codes from URL (?ref=CODE)
// AFFILIATE SYSTEM: Persists to localStorage for later use during signup
// --------------------------------------------
const ReferralCodeCapture: React.FC = () => {
  // Hook handles all capture logic: reads URL, persists to localStorage, cleans URL
  const { referralCode, referralTracking } = useReferralCapture();

  // Migrate legacy localStorage keys to new format (runs once)
  useEffect(() => {
    migrateFromLegacyStorage();
  }, []);

  useEffect(() => {
    if (referralCode) {
      console.log('[Affiliate] Referral code captured:', referralCode);
      if (referralTracking) {
        console.log('[Affiliate] Tracking data:', {
          utmSource: referralTracking.utmSource,
          utmMedium: referralTracking.utmMedium,
          utmCampaign: referralTracking.utmCampaign,
          landingPage: referralTracking.landingPage,
        });
      }
    }
  }, [referralCode, referralTracking]);

  return null;
};

// --------------------------------------------
// AffiliatePathCapture - Capture affiliate codes from path-based URLs
// Handles /ref/b/:code (blogger client) and /rec/b/:code (blogger recruitment)
// Stores code in localStorage then redirects to the appropriate page.
// Static segments (/ref, /b) give higher React Router v6 specificity than
// the generic catch-all /:langLocale/:roleCountry/:nameSlug so no explicit
// ordering is required, but we still add these routes before catchAllProviderRoutes.
// --------------------------------------------
const AffiliatePathCapture: React.FC<{
  actorType: ActorType;
  codeType: ReferralCodeType;
  redirectPath?: string; // without locale prefix, defaults to '/'
}> = ({ actorType, codeType, redirectPath = '/' }) => {
  const { code } = useParams<{ code: string }>();
  const { language } = useApp();

  // Store synchronously before navigate — localStorage writes are synchronous
  if (code) {
    storeReferralCode(code.toUpperCase(), actorType, codeType, {
      landingPage: window.location.pathname,
    });
  }

  const locale = getLocaleString(language);
  const destination = redirectPath === '/'
    ? `/${locale}`
    : `/${locale}${redirectPath}`;

  return <Navigate to={destination} replace />;
};

// --------------------------------------------
// App
// --------------------------------------------
const App: React.FC = () => {
  const location = useLocation();
  const {language} = useApp()
  const { isMobile } = useDeviceDetection();
  const [locale, setLocale] = useState<Locale>("fr"); // Default to French since your site is French

  // Signal pour react-snap que le rendu est terminé
  useEffect(() => {
    // Marquer la page comme prête pour react-snap
    document.body.setAttribute('data-react-snap-ready', 'true');

    // Signal pour le loading screen
    window.dispatchEvent(new Event('app-mounted'));
  }, []);

  // SW + perf
  useEffect(() => {
    registerSW();
    measurePerformance();

    // P2 FIX: Listen for SW updates and notify user
    const handleSWUpdate = () => {
      // Show update notification to user
      if (window.confirm('Une nouvelle version est disponible. Voulez-vous recharger la page pour mettre à jour ?')) {
        // Tell SW to skip waiting and take control
        navigator.serviceWorker.ready.then(registration => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        });
        window.location.reload();
      }
    };

    window.addEventListener('sw-update-available', handleSWUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdate);
    };
  }, []);

  // Scroll top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Préchargement light
  useEffect(() => {
    if (!isMobile) {
      const preloadableRoutes = [...routeConfigs, ...protectedUserRoutes].filter((r) => r.preload);
      if (preloadableRoutes.length > 0) {
        setTimeout(() => {
          // Intentionnellement vide : certains bundlers n'exposent pas _payload
        }, 2000);
      }
    }
  }, [isMobile]);

  useEffect(() => {
    setLocale(language as Locale)
  },[language])

  const renderRoute = (config: RouteConfig, index: number) => {
    const {
      path,
      component: Component,
      protected: isProtected,
      role,
      alias,
      translated,
    } = config;

    // If this route is an admin path (or its alias), DO NOT add the locale prefix.
    const isAdminPath = path.startsWith("/admin") || (alias && alias.startsWith("/admin"));

    // Add locale prefix to paths - use simple parameter, validation happens in LocaleRouter
    // React Router v6 doesn't support regex in path params, so we use :locale and validate elsewhere
    const localePrefix = `/:locale`;

    // Handle root path specially - match both with and without trailing slash
    let routes: string[] = [];

    if (isAdminPath) {
      // Register admin route(s) as-is (no locale prefix)
      routes = [
        `${path}`,
        ...(alias ? [`${alias}`] : []),
      ];
    } else if (path === "/") {
      // For root, create routes that match both /en-us and /en-us/
      routes = [
        `${localePrefix}`,      // Matches /en-us
        `${localePrefix}/`,     // Matches /en-us/
      ];
    } else if (translated) {
      // For translated routes, generate all language variants
      const allSlugs = getAllTranslatedSlugs(translated);

      // Check if the translated slug contains a slash (nested route like "dashboard/messages")
      const hasNestedPath = allSlugs.some(slug => slug.includes("/"));

      if (hasNestedPath) {
        // For nested routes, replace the entire path
        // e.g., "/dashboard/messages" with slug "tableau-de-bord/messages" -> "/tableau-de-bord/messages"
        routes = allSlugs.map(slug => `${localePrefix}/${slug}`);
      } else {
        // Extract the pattern after the first segment
        // e.g., "/avocat/:country/:language/:nameId" -> "/:country/:language/:nameId"
        // e.g., "/register/lawyer" -> ""
        const pathMatch = path.match(/^\/[^/]+(\/.*)?$/);
        const pathPattern = pathMatch && pathMatch[1] ? pathMatch[1] : "";

        // Generate routes for all translated slugs
        routes = allSlugs.map(slug => `${localePrefix}/${slug}${pathPattern}`);
      }

      // Also include the original path for backward compatibility
      routes.push(`${localePrefix}${path}`);

      // Include alias if present
      if (alias) {
        routes.push(`${localePrefix}${alias}`);
      }
    } else {
      // Regular routes
      // Check if path already has a locale-like prefix (e.g., /fr-fr/, /en-us/, /:langLocale/)
      const hasLocalePrefix = /^\/[a-z]{2}-[a-z]{2}\/|^\/:langLocale\//.test(path);
      if (hasLocalePrefix) {
        // Path already has locale, register as-is
        routes = [
          `${path}`,
          ...(alias ? [`${alias}`] : []),
        ];
      } else {
        routes = [
          `${localePrefix}${path}`,
          ...(alias ? [`${localePrefix}${alias}`] : []),
        ];
      }
    }

    return routes.map((routePath, i) => {
      // Debug: log route paths in development
      if (process.env.NODE_ENV === 'development' && path === "/") {
        console.log(`[Route] Registering locale route: ${routePath}`);
      }

      return (
        <Route
          key={`${index}-${i}-${routePath}`}
          path={routePath}
          element={
            isProtected ? (
              <ProtectedRoute allowedRoles={role}>
                <Component />
              </ProtectedRoute>
            ) : (
              <Component />
            )
          }
        />
      );
    });
  };

  // New: Redirect any locale-prefixed admin path back to non-locale admin path
  const AdminLocaleStrip: React.FC = () => {
    const loc = useLocation();
    const pathname = loc.pathname || "";
    // Match "/{locale}/admin" or "/{locale}/admin/..." and preserve the rest
    const m = pathname.match(/^\/([^/]+)\/admin(\/.*)?$/);
    if (m) {
      const suffix = m[2] || "";
      return <Navigate to={`/admin${suffix}${loc.search || ""}`} replace />;
    }
    return null;
  };

  // helper to detect admin paths (handles both "/admin" and "/:locale/admin")
  const isAdminPath = (p: string) =>
    /(^\/admin(\/|$))|(^\/[^/]+\/admin(\/|$))/i.test(p || "");

  // helper to detect multi-dashboard path (with or without locale prefix)
  const isMultiDashboardPath = (p: string) =>
    /^(\/[a-z]{2}-[a-z]{2})?\/multi-dashboard(\/|$)/i.test(p || "");

  const showAdminLayout = isAdminPath(location.pathname);
  const showMultiDashboard = isMultiDashboardPath(location.pathname);
  

  return (
    <IntlProvider locale={locale} messages={messages[locale] as unknown as Record<string, string>} defaultLocale="fr" >
      <PayPalProvider>
      <WizardProvider>
      <PWAProvider
        enableOfflineStorage={true}
        enableBadging={true}
      >
      {/* Render multi-dashboard (standalone, no layout) */}
      {showMultiDashboard ? (
        <Suspense fallback={<LoadingSpinner size="large" color="red" />}>
          <Routes>
            {/* Strip locale prefix if present */}
            <Route path="/:locale/multi-dashboard" element={<Navigate to="/multi-dashboard" replace />} />
            <Route path="/multi-dashboard" element={<MultiProviderDashboard />} />
            <Route path="*" element={<Navigate to="/multi-dashboard" replace />} />
          </Routes>
        </Suspense>
      ) : showAdminLayout ? (
        /* Render admin routes only when current path is admin (no site layout/navbar) */
        <Routes>
          {/* Catch locale-prefixed admin paths and strip locale (preserve subpath & query) */}
          <Route path="/:locale/admin" element={<AdminLocaleStrip />} />
          <Route path="/:locale/admin/*" element={<AdminLocaleStrip />} />

          {/* Admin routes - no locale prefix */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/*" element={<AdminRoutesV2 />} />

          {/* Payment success route without locale (backward compatibility) */}
          <Route
            path="/payment-success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />

          {/* If someone hits another path under admin detection that isn't handled, fallback to admin root */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : (
        <LocaleRouter>
          {/* P1-1 FIX: Track page views for GA4 analytics */}
          <PageViewTracker />
          {/* Meta Pixel: Track page views for Facebook/Meta ads */}
          <MetaPageViewTracker />
          {/* Meta Pixel: Advanced Matching - send user data for better retargeting */}
          <MetaPixelUserTracker />
          {/* Traffic Source: Capture UTM parameters for ad attribution */}
          <TrafficSourceCapture />
          {/* AFFILIATE: Capture referral codes (?ref=CODE) from URL */}
          <ReferralCodeCapture />
          <div className={`App ${isMobile ? "mobile-layout" : "desktop-layout"}`}>
            <DefaultHelmet pathname={location.pathname} />

            {/* Dynamically generate hreflang links for all locales */}
            <HreflangLinks pathname={location.pathname} />
            {/* P0 FIX: ErrorBoundary pour capturer les erreurs de lazy loading */}
            <ErrorBoundary>
            {/* ✅ FIX: ProviderOnlineManager monté au niveau global pour tracking sur toutes les pages */}
            <ProviderOnlineManager>
            <Suspense fallback={<LoadingSpinner size="large" color="red" />}>
              {/* Routes de l'app */}
              <Routes>
                {/* Root redirect to locale */}
                <Route
                  path="/"
                  element={<Navigate to={`/${getLocaleString(language)}`} replace />}
                />

                {/* Routes with locale prefix - Home route first for root locale path */}
                {routeConfigs
                  .sort((a, b) => {
                    // Put root path first
                    if (a.path === "/") return -1;
                    if (b.path === "/") return 1;
                    return 0;
                  })
                  .map((cfg, i) => renderRoute(cfg, i))}
                {protectedUserRoutes.map((cfg, i) => renderRoute(cfg, i + 1000))}

                {/* AFFILIATE PATH CAPTURE: path-based referral links
                    /ref/b/:code  → blogger client referral   (stores as actorType=client)
                    /rec/b/:code  → blogger recruitment link  (stores as actorType=blogger)
                    /ref/c/:code  → chatter client referral   (stores as actorType=client)
                    /rec/c/:code  → chatter recruitment link  (stores as actorType=chatter)
                    /ref/i/:code  → influencer client referral (stores as actorType=client)
                    /rec/i/:code  → influencer recruitment link (stores as actorType=influencer)
                    /ref/ga/:code → group-admin client referral (stores as actorType=client)
                    /rec/ga/:code → group-admin recruitment link (stores as actorType=groupAdmin)
                    Static segments rank higher than /:x/:y/:z in React Router v6,
                    so these routes win over the catch-all provider routes below automatically. */}
                <Route
                  path="/ref/b/:code"
                  element={<AffiliatePathCapture actorType="client" codeType="client" />}
                />
                <Route
                  path="/rec/b/:code"
                  element={<AffiliatePathCapture actorType="blogger" codeType="recruitment" redirectPath="/blogger/inscription" />}
                />
                <Route
                  path="/ref/c/:code"
                  element={<AffiliatePathCapture actorType="client" codeType="client" />}
                />
                <Route
                  path="/rec/c/:code"
                  element={<AffiliatePathCapture actorType="chatter" codeType="recruitment" redirectPath="/chatter/inscription" />}
                />
                <Route
                  path="/ref/i/:code"
                  element={<AffiliatePathCapture actorType="client" codeType="client" />}
                />
                <Route
                  path="/rec/i/:code"
                  element={<AffiliatePathCapture actorType="influencer" codeType="recruitment" redirectPath="/influencer/inscription" />}
                />
                <Route
                  path="/ref/ga/:code"
                  element={<AffiliatePathCapture actorType="client" codeType="client" />}
                />
                <Route
                  path="/rec/ga/:code"
                  element={<AffiliatePathCapture actorType="groupAdmin" codeType="recruitment" redirectPath="/group-admin/inscription" />}
                />

                {/* IMPORTANT: Catch-all provider routes MUST be rendered LAST (before 404)
                    These match generic patterns like /:langLocale/:roleCountry/:nameSlug
                    They must come after specific routes like booking-request/demande-reservation
                    to avoid incorrectly matching translated slugs */}
                {catchAllProviderRoutes.map((cfg, i) => renderRoute(cfg, i + 2000))}

                {/* 404 - Catch all route (must be last) */}
                <Route path="*" element={<NotFound />} />
              </Routes>

              {/* Routes admin gérées par AdminRoutesV2 (handled above outside LocaleRouter) */}
            </Suspense>
            </ProviderOnlineManager>
            </ErrorBoundary>

            {/* Bouton de feedback flottant - visible sur toutes les pages (sauf admin) */}
            <FeedbackButton />
          </div>
        </LocaleRouter>
      )}
      </PWAProvider>
      </WizardProvider>
      </PayPalProvider>
    </IntlProvider>
  );
};

export default App;// Build 1770038879

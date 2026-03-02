/**
 * CaptainLanding - Recrutement Capitaines Chatter
 *
 * Ton startup : rejoindre une equipe, grandir ensemble, postes evolutifs.
 * Candidatures stockees dans Firestore `captain_applications`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { trackMetaViewContent } from '@/utils/metaPixel';
import toast from 'react-hot-toast';
import { logAnalyticsEvent, db, storage } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import { useCountryFromUrl, useCountryLandingConfig, convertToLocal } from '@/country-landing';
import FAQPageSchema from '@/components/seo/FAQPageSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import {
  ArrowRight,
  Check,
  Users,
  ChevronDown,
  Plus,
  Minus,
  Crown,
  Globe,
  TrendingUp,
  Star,
  Target,
  DollarSign,
  Clock,
  Smartphone,
  Zap,
  Send,
  Building2,
  Rocket,
  Heart,
  Upload,
  FileText,
  Image,
  X,
} from 'lucide-react';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  @media (max-width: 768px) {
    .captain-landing h1 { font-size: 2.25rem !important; }
    .captain-landing h2 { font-size: 1.875rem !important; }
    .captain-landing h3 { font-size: 1.5rem !important; }
  }
  .captain-landing h1,
  .captain-landing h2,
  .captain-landing h3 { color: white; }
  .captain-landing h1 span,
  .captain-landing h2 span,
  .captain-landing h3 span { font-size: inherit; }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
  }
  .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  .section-content { padding: 3rem 1rem; position: relative; }
  @media (min-width: 640px) { .section-content { padding: 4rem 1.5rem; } }
  @media (min-width: 1024px) { .section-content { padding: 6rem 2rem; } }
  @media (prefers-reduced-motion: reduce) {
    .animate-bounce, .transition-all { animation: none !important; transition: none !important; }
  }
`;

// Currency: now dynamic via useCountryLandingConfig (see component body)

// ============================================================================
// COMPOSANTS
// ============================================================================

const CTAButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  size?: 'normal' | 'large';
  className?: string;
  ariaLabel?: string;
}> = ({ onClick, children, size = 'normal', className = '', ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className={`flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-2xl shadow-lg transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 will-change-transform ${size === 'large' ? 'min-h-[56px] sm:min-h-[64px] px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl' : 'min-h-[48px] sm:min-h-[56px] px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg'} ${className}`}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'} aria-hidden="true" />
  </button>
);

const FAQItem: React.FC<{
  question: React.ReactNode;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}> = ({ question, answer, isOpen, onToggle, index }) => (
  <div className="border border-white/10 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-white/20">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left min-h-[48px]" aria-expanded={isOpen} aria-controls={`faq-captain-answer-${index}`} id={`faq-captain-question-${index}`}>
      <span className="text-base sm:text-lg font-semibold pr-2">{question}</span>
      <span className={`flex flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full items-center justify-center transition-all duration-300 ${isOpen ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`} aria-hidden="true">
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
    <div id={`faq-captain-answer-${index}`} role="region" aria-labelledby={`faq-captain-question-${index}`} className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm sm:text-base leading-relaxed">{answer}</div>
    </div>
  </div>
);

const ScrollIndicator: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2" aria-hidden="true">
    <span className="text-xs sm:text-sm text-white/80 font-medium">{label}</span>
    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/80 animate-bounce" />
  </div>
);

// ============================================================================
// TIER DATA
// ============================================================================
const TIERS = [
  { nameKey: 'captain.landing.tier.bronze', nameDefault: 'Bronze', calls: 20, bonus: 25, color: 'from-orange-700/30 to-orange-600/10', border: 'border-orange-600/30', text: 'text-orange-400', icon: '🥉' },
  { nameKey: 'captain.landing.tier.silver', nameDefault: 'Argent', calls: 50, bonus: 50, color: 'from-gray-400/20 to-gray-300/10', border: 'border-gray-400/30', text: 'text-gray-300', icon: '🥈' },
  { nameKey: 'captain.landing.tier.gold', nameDefault: 'Or', calls: 100, bonus: 100, color: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🥇' },
  { nameKey: 'captain.landing.tier.platinum', nameDefault: 'Platine', calls: 200, bonus: 200, color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: '💎' },
  { nameKey: 'captain.landing.tier.diamond', nameDefault: 'Diamant', calls: 400, bonus: 400, color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '👑' },
];

// ============================================================================
// PAGE
// ============================================================================

const CaptainLanding: React.FC = () => {
  const navigate = useLocaleNavigate();
  const intl = useIntl();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // Country-based currency
  const { countryCode, lang: urlLang } = useCountryFromUrl();
  const { config: countryConfig } = useCountryLandingConfig('chatter', countryCode, urlLang || langCode);
  const hideConversionCurrencies = ['EUR', 'GBP', 'CHF', 'USD', 'CAD', 'AUD'];
  const local = (usd: number) => {
    if (hideConversionCurrencies.includes(countryConfig.currency.code)) return '';
    const str = convertToLocal(usd, countryConfig.currency);
    return str ? ` (${str})` : '';
  };
  const localBlock = (usd: number) => {
    if (hideConversionCurrencies.includes(countryConfig.currency.code)) return null;
    const str = convertToLocal(usd, countryConfig.currency);
    return str || null;
  };

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [teamSize, setTeamSize] = useState(30);
  const [callsPerChatter, setCallsPerChatter] = useState(15);
  const [personalCalls, setPersonalCalls] = useState(20);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Form
  const [form, setForm] = useState({ name: '', whatsapp: '', country: '', motivation: '' });
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // CV upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProgress, setCvProgress] = useState(0);

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoPreview, setPhotoPreview] = useState('');

  // Cleanup photo preview URL on unmount to prevent memory leak
  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const uploadFile = (file: File, path: string, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed',
        (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject)
      );
    });
  };

  const handleCvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setCvFile(file);
    setCvUploading(true);
    setCvProgress(0);
    try {
      const url = await uploadFile(file, `captain_applications_cv/${Date.now()}_${file.name}`, setCvProgress);
      setCvUrl(url);
    } catch { setCvFile(null); setCvUrl(''); }
    setCvUploading(false);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setPhotoUploading(true);
    setPhotoProgress(0);
    try {
      const url = await uploadFile(file, `captain_applications_cv/${Date.now()}_photo_${file.name}`, setPhotoProgress);
      setPhotoUrl(url);
    } catch { setPhotoFile(null); setPhotoUrl(''); URL.revokeObjectURL(previewUrl); setPhotoPreview(''); }
    setPhotoUploading(false);
  };

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;
  const scrollToForm = () => document.getElementById('captain-form')?.scrollIntoView({ behavior: 'smooth' });
  const ctaLabel = intl.formatMessage({ id: 'captain.aria.cta.main', defaultMessage: 'Rejoindre l\'equipe SOS-Expat' });

  useEffect(() => {
    trackMetaViewContent({ content_name: 'captain_landing', content_category: 'landing_page', content_type: 'page' });
    logAnalyticsEvent('page_view', { page_title: 'captain_landing', page_location: window.location.href });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Calculator
  const totalTeamCalls = teamSize * callsPerChatter;
  const teamComm = totalTeamCalls * 2.5;
  const tier = TIERS.reduce((a, t) => totalTeamCalls >= t.calls ? t : a, TIERS[0]);
  const qualityOk = teamSize >= 10 && teamComm >= 100;
  const qualityBonus = qualityOk ? 100 : 0;
  const persRev = personalCalls * 4;
  const total = teamComm + tier.bonus + qualityBonus + persRev;

  // Submit to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    try {
      await addDoc(collection(db, 'captain_applications'), {
        name: form.name.trim(),
        whatsapp: form.whatsapp.trim(),
        country: form.country.trim(),
        motivation: form.motivation.trim(),
        ...(cvUrl && { cvUrl }),
        ...(photoUrl && { photoUrl }),
        status: 'pending',
        source: 'captain_landing',
        language: langCode,
        createdAt: serverTimestamp(),
      });
      logAnalyticsEvent('captain_application', { country: form.country });
      setFormState('sent');
      setForm({ name: '', whatsapp: '', country: '', motivation: '' });
      setCvFile(null); setCvUrl('');
      setPhotoFile(null); setPhotoUrl('');
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(''); }
    } catch {
      setFormState('error');
    }
  };

  const seoTitle = intl.formatMessage({ id: 'captain.landing.seo.title', defaultMessage: 'Rejoignez SOS-Expat | Devenez Capitaine Chatter | Startup en pleine croissance' });
  const seoDesc = intl.formatMessage({ id: 'captain.landing.seo.description', defaultMessage: 'Rejoignez l\'equipe SOS-Expat en tant que Capitaine. Poste evolutif, contact direct fondateur, revenus attractifs, possibilite de poste a Dakar.' });

  const faqItems = useMemo(() => [
    {
      q: intl.formatMessage({ id: 'captain.faq.q1', defaultMessage: "Comment on devient Capitaine ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a1', defaultMessage: "Postulez ici, on vous contacte pour un echange. Vous commencez comme chatter pour comprendre le terrain, puis on vous confie une equipe selon vos resultats." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q2', defaultMessage: "C'est quoi concretement le role ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a2', defaultMessage: "Recruter et animer une equipe de chatters (WhatsApp, Telegram, campus...). Vous etes un leader d'equipe dans une startup, pas un freelance isole." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q3', defaultMessage: "Comment sont calcules les revenus ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a3', defaultMessage: "2-3$ par appel de votre equipe + bonus palier mensuel (25-400$) + bonus qualite (100$/mois). Plus vos appels perso a 3-5$. Tout est cumule." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q4', defaultMessage: "C'est vraiment evolutif ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a4', defaultMessage: "Oui. SOS-Expat est une startup en pleine croissance. Les capitaines performants accerent aux postes a responsabilite (management, operations, strategie) avec remuneration fixe + variable." }),
    },
    {
      q: intl.formatMessage({ id: 'captain.faq.q5', defaultMessage: "Je dois investir quelque chose ?" }),
      a: intl.formatMessage({ id: 'captain.faq.a5', defaultMessage: "Zero. Pas d'investissement, pas de frais. Un smartphone et de la motivation suffisent." }),
    },
  ], [intl]);

  return (
    <Layout showFooter={false}>
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        ogImage="/og-image.png"
        ogType="website"
        contentType="LandingPage"
        keywords={intl.formatMessage({ id: 'captain.landing.seo.keywords', defaultMessage: 'capitaine chatter, recrutement, SOS Expat, startup, remote, equipe, leader, revenus, commission, WhatsApp, Telegram' })}
        aiSummary={intl.formatMessage({ id: 'captain.landing.seo.aiSummary', defaultMessage: 'Page de recrutement pour devenir Capitaine Chatter chez SOS-Expat. Role de leader d\'equipe 100% remote avec revenus attractifs (commissions + bonus). Postulez directement avec CV et photo.' })}
        expertise="beginner"
        trustworthiness="high"
        contentQuality="high"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema
        faqs={faqItems.map(item => ({ question: item.q, answer: item.a }))}
        pageTitle={seoTitle}
        pageUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <BreadcrumbSchema items={[
        { name: 'SOS Expat', url: '/' },
        { name: intl.formatMessage({ id: 'captain.landing.breadcrumb', defaultMessage: 'Devenir Capitaine Chatter' }) },
      ]} />
      <style>{globalStyles}</style>

      <div className="captain-landing bg-black text-white">

        {/* ================================================================
            1. HERO — Ton startup, rejoindre l'aventure
        ================================================================ */}
        <section className="min-h-[100svh] flex justify-center items-center relative bg-gradient-to-b from-indigo-950 via-purple-900 to-black overflow-hidden" aria-label={ctaLabel}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.12),transparent_50%)]" aria-hidden="true" />

          <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-bold border border-amber-500/30 mb-6">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
              <FormattedMessage id="captain.landing.hero.badge" defaultMessage="On recrute" />
            </div>

            <h1 className="!text-4xl lg:!text-5xl xl:!text-6xl font-black text-white mb-4 sm:mb-6 !leading-[1.1]">
              <FormattedMessage id="captain.landing.hero.line1" defaultMessage="Rejoignez l'equipe" />
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-green-400">
                <FormattedMessage id="captain.landing.hero.highlight" defaultMessage="SOS-Expat" />
              </span>
            </h1>

            <p className="text-base sm:text-lg text-white/80 mb-6 sm:mb-8 max-w-2xl mx-auto">
              <FormattedMessage id="captain.landing.hero.desc" defaultMessage="On cherche des leaders pour construire et animer des equipes de chatters dans le monde entier. Un vrai poste, evolutif, au sein d'une startup en pleine croissance." />
            </p>

            {/* 3 key facts */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 max-w-2xl mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <DollarSign className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-bold text-white"><FormattedMessage id="captain.landing.hero.fact1" defaultMessage="Revenus attractifs" /></p>
                <p className="text-[10px] sm:text-xs text-white/50"><FormattedMessage id="captain.landing.hero.fact1b" defaultMessage="$ + {currency}" values={{ currency: countryConfig.currency.symbol }} /></p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-bold text-white"><FormattedMessage id="captain.landing.hero.fact2" defaultMessage="Poste evolutif" /></p>
                <p className="text-[10px] sm:text-xs text-white/50"><FormattedMessage id="captain.landing.hero.fact2b" defaultMessage="Grandissez avec nous" /></p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
                <Crown className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs sm:text-sm font-bold text-white"><FormattedMessage id="captain.landing.hero.fact3" defaultMessage="Contact CEO" /></p>
                <p className="text-[10px] sm:text-xs text-white/50"><FormattedMessage id="captain.landing.hero.fact3b" defaultMessage="Direct, sans filtre" /></p>
              </div>
            </div>

            <CTAButton onClick={scrollToForm} size="large" className="w-full sm:w-auto max-w-md mx-auto animate-pulse-glow" ariaLabel={ctaLabel}>
              <FormattedMessage id="captain.landing.cta.join" defaultMessage="Rejoindre l'aventure" />
            </CTAButton>

            <p className="text-gray-400 mt-4 text-sm">
              <FormattedMessage id="captain.landing.reassurance" defaultMessage="100% gratuit · 100% remote · Startup en pleine croissance" />
            </p>
          </div>

          <ScrollIndicator label={intl.formatMessage({ id: 'captain.landing.scroll', defaultMessage: 'Decouvrir' })} />
        </section>

        {/* ================================================================
            2. PROFILS RECHERCHES + ETAT D'ESPRIT
        ================================================================ */}
        <section className="section-content bg-black" aria-labelledby="captain-profile-title">
          <div className="max-w-4xl mx-auto">
            <h2 id="captain-profile-title" className="!text-3xl sm:!text-4xl font-black text-center mb-2">
              <FormattedMessage id="captain.landing.profile.title" defaultMessage="Qui on recherche" />
            </h2>
            <p className="text-sm sm:text-base text-white/60 text-center mb-8">
              <FormattedMessage id="captain.landing.profile.sub" defaultMessage="Pas besoin de diplome. On cherche un etat d'esprit." />
            </p>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              {[
                { icon: <Target className="w-5 h-5 text-amber-400" />, textId: 'captain.landing.profile.1', textDefault: 'A l\'aise avec les reseaux sociaux (WhatsApp, Telegram, Facebook)' },
                { icon: <Users className="w-5 h-5 text-blue-400" />, textId: 'captain.landing.profile.2', textDefault: 'Sens du leadership — vous savez motiver et federer un groupe' },
                { icon: <Globe className="w-5 h-5 text-green-400" />, textId: 'captain.landing.profile.3', textDefault: 'Connexion avec des communautes d\'expatries ou d\'etudiants internationaux' },
                { icon: <Zap className="w-5 h-5 text-purple-400" />, textId: 'captain.landing.profile.4', textDefault: 'Envie d\'entreprendre et de grandir dans une startup — pas juste un "side hustle"' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <p className="text-sm sm:text-base text-white/90">
                    <FormattedMessage id={item.textId} defaultMessage={item.textDefault} />
                  </p>
                </div>
              ))}
            </div>

            {/* Etat d'esprit */}
            <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-2xl p-5 sm:p-6 text-center">
              <h3 className="!text-lg sm:!text-xl font-bold text-amber-400 mb-3">
                <FormattedMessage id="captain.landing.mindset.title" defaultMessage="L'etat d'esprit qu'on valorise" />
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  intl.formatMessage({ id: 'captain.landing.mindset.1', defaultMessage: 'Proactif' }),
                  intl.formatMessage({ id: 'captain.landing.mindset.2', defaultMessage: 'Bienveillant' }),
                  intl.formatMessage({ id: 'captain.landing.mindset.3', defaultMessage: 'Ambitieux' }),
                  intl.formatMessage({ id: 'captain.landing.mindset.4', defaultMessage: 'Esprit d\'equipe' }),
                  intl.formatMessage({ id: 'captain.landing.mindset.5', defaultMessage: 'Debrouillard' }),
                  intl.formatMessage({ id: 'captain.landing.mindset.6', defaultMessage: 'Fiable' }),
                ].map((tag, i) => (
                  <span key={i} className="bg-white/10 border border-white/10 text-white/90 text-sm font-medium px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            3. VOTRE ROLE — Ce qu'on attend
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black to-gray-950" aria-labelledby="captain-role-title">
          <div className="max-w-4xl mx-auto">
            <h2 id="captain-role-title" className="!text-3xl sm:!text-4xl font-black text-center mb-2">
              <FormattedMessage id="captain.landing.role.title" defaultMessage="Le role de Capitaine" />
            </h2>
            <p className="text-sm sm:text-base text-white/60 text-center mb-8">
              <FormattedMessage id="captain.landing.role.sub" defaultMessage="Vous etes un leader d'equipe, pas un freelance isole." />
            </p>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: <Users className="w-5 h-5 text-amber-400" />, textId: 'captain.landing.role.1', textDefault: 'Recruter et integrer des chatters (WhatsApp, Telegram, campus, reseaux sociaux)' },
                { icon: <Heart className="w-5 h-5 text-pink-400" />, textId: 'captain.landing.role.2', textDefault: 'Animer et motiver votre equipe au quotidien — bienveillance et entraide' },
                { icon: <Globe className="w-5 h-5 text-blue-400" />, textId: 'captain.landing.role.3', textDefault: 'Couvrir vos pays et langues assignes — assurer la presence SOS-Expat partout' },
                { icon: <Star className="w-5 h-5 text-purple-400" />, textId: 'captain.landing.role.4', textDefault: 'Maintenir la qualite — une equipe active et fiable, c\'est ca qui compte' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <p className="text-sm sm:text-base text-white/90">
                    <FormattedMessage id={item.textId} defaultMessage={item.textDefault} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            3. REVENUS — Tableau $ + devise locale
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black to-gray-950" aria-labelledby="captain-rev-title">
          <div className="max-w-5xl mx-auto">
            <h2 id="captain-rev-title" className="!text-3xl sm:!text-4xl font-black text-center mb-2">
              <FormattedMessage id="captain.landing.rev.title" defaultMessage="Vos revenus" />
            </h2>
            <p className="text-sm text-white/60 text-center mb-8">
              <FormattedMessage id="captain.landing.rev.sub" defaultMessage="3 sources cumulables. Transparence totale." />
            </p>

            {/* Commissions par appel */}
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <div className="bg-gradient-to-br from-amber-500/15 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-5 text-center">
                <p className="text-xs text-white/50 mb-1"><FormattedMessage id="captain.landing.rev.lawyer" defaultMessage="Appel avocat" /></p>
                <p className="text-3xl sm:text-4xl font-black text-amber-400">3$</p>
                {localBlock(3) && <p className="text-sm text-amber-300/60">{localBlock(3)}</p>}
              </div>
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/5 border border-green-500/20 rounded-2xl p-5 text-center">
                <p className="text-xs text-white/50 mb-1"><FormattedMessage id="captain.landing.rev.expat" defaultMessage="Appel expatrie" /></p>
                <p className="text-3xl sm:text-4xl font-black text-green-400">2$</p>
                {localBlock(2) && <p className="text-sm text-green-300/60">{localBlock(2)}</p>}
              </div>
            </div>

            {/* Paliers */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-5">
              <div className="bg-white/5 px-5 py-3 border-b border-white/10">
                <h3 className="!text-base sm:!text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <FormattedMessage id="captain.landing.rev.tiers" defaultMessage="Bonus de palier mensuel" />
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {TIERS.map(t => (
                  <div key={t.nameKey} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{t.icon}</span>
                      <span className={`font-bold ${t.text}`}>{intl.formatMessage({ id: t.nameKey, defaultMessage: t.nameDefault })}</span>
                      <span className="text-xs text-white/40">{t.calls}+ {intl.formatMessage({ id: 'captain.landing.tier.calls', defaultMessage: 'appels' })}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-lg ${t.text}`}>{t.bonus}$</span>
                      {localBlock(t.bonus) && <span className="text-xs text-white/40 block">{localBlock(t.bonus)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus qualite */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-3 mb-5">
              <div className="text-center sm:text-left flex-1">
                <p className="text-xs text-purple-300/70 font-bold uppercase"><FormattedMessage id="captain.landing.rev.quality" defaultMessage="Bonus qualite mensuel" /></p>
                <p className="text-2xl font-black text-purple-400">100${local(100)}</p>
              </div>
              <p className="text-xs text-white/50 text-center sm:text-right">
                <FormattedMessage id="captain.landing.rev.quality.cond" defaultMessage="Condition : 10 recrues actives + 100$ de commissions equipe" />
              </p>
            </div>

            {/* Exemple concret */}
            <div className="bg-gradient-to-r from-amber-500/10 to-green-500/10 border border-amber-500/20 rounded-2xl p-5 text-center">
              <p className="text-xs text-white/50 uppercase font-bold mb-3"><FormattedMessage id="captain.landing.rev.example" defaultMessage="Exemple : equipe de 30 chatters, 15 appels/mois chacun" /></p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-black/30 rounded-lg p-2"><p className="text-[10px] text-white/40"><FormattedMessage id="captain.landing.rev.ex.team" defaultMessage="Equipe" /></p><p className="font-black text-amber-400">1 125$</p></div>
                <div className="bg-black/30 rounded-lg p-2"><p className="text-[10px] text-white/40"><FormattedMessage id="captain.landing.rev.ex.tier" defaultMessage="Palier" /></p><p className="font-black text-green-400">400$</p></div>
                <div className="bg-black/30 rounded-lg p-2"><p className="text-[10px] text-white/40"><FormattedMessage id="captain.landing.rev.ex.quality" defaultMessage="Qualite" /></p><p className="font-black text-purple-400">100$</p></div>
                <div className="bg-black/30 rounded-lg p-2"><p className="text-[10px] text-white/40"><FormattedMessage id="captain.landing.rev.ex.total" defaultMessage="TOTAL" /></p><p className="font-black text-white">1 625$</p></div>
              </div>
              <p className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-green-400">
                = 1 625${local(1625)}/mois
              </p>
              <p className="text-[10px] text-white/40 mt-1"><FormattedMessage id="captain.landing.rev.ex.note" defaultMessage="+ vos propres appels a 3-5$" /></p>
            </div>
          </div>
        </section>

        {/* ================================================================
            4. CARRIERE — Grandir avec la startup
        ================================================================ */}
        <section className="section-content bg-gray-950" aria-labelledby="captain-career-title">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border-2 border-amber-500/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8">
              <h2 id="captain-career-title" className="!text-2xl sm:!text-3xl lg:!text-4xl font-black text-center mb-3">
                <FormattedMessage id="captain.landing.career.title" defaultMessage="Un poste, pas un plan." />
              </h2>
              <p className="text-sm text-white/60 text-center mb-6 sm:mb-8 max-w-2xl mx-auto">
                <FormattedMessage id="captain.landing.career.sub" defaultMessage="SOS-Expat est une startup en pleine croissance. Les capitaines d'aujourd'hui sont les managers de demain." />
              </p>

              <div className="grid sm:grid-cols-3 gap-4 sm:gap-5">
                <div className="text-center">
                  <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="!text-base sm:!text-lg font-bold text-amber-400 mb-1">
                    <FormattedMessage id="captain.landing.career.ceo" defaultMessage="Acces direct au fondateur" />
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70">
                    <FormattedMessage id="captain.landing.career.ceo.desc" defaultMessage="Reunion Zoom hebdomadaire avec le fondateur. Echanges directs, pas de hierarchie inutile." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-7 h-7 text-green-400" />
                  </div>
                  <h3 className="!text-base sm:!text-lg font-bold text-green-400 mb-1">
                    <FormattedMessage id="captain.landing.career.grow" defaultMessage="Evolution reelle" />
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70">
                    <FormattedMessage id="captain.landing.career.grow.desc" defaultMessage="Postes cles a responsabilite, remuneration fixe + variable, management. Selon vos resultats." />
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="!text-base sm:!text-lg font-bold text-purple-400 mb-1">
                    <FormattedMessage id="captain.landing.career.dakar" defaultMessage="Bureau Dakar" />
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70">
                    <FormattedMessage id="captain.landing.career.dakar.desc" defaultMessage="Possibilite de rejoindre la structure sur place. Un vrai poste dans une vraie entreprise." />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            5. AVANTAGES — Grid compact
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 to-black" aria-labelledby="captain-perks-title">
          <div className="max-w-4xl mx-auto">
            <h2 id="captain-perks-title" className="!text-3xl sm:!text-4xl font-black text-center mb-6 sm:mb-8">
              <FormattedMessage id="captain.landing.perks.title" defaultMessage="Pourquoi nous rejoindre" />
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: <Globe className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.remote', defaultMessage: '100% remote' }), color: 'text-blue-400' },
                { icon: <Clock className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.flex', defaultMessage: 'Horaires flexibles' }), color: 'text-amber-400' },
                { icon: <Zap className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.startup', defaultMessage: 'Culture startup' }), color: 'text-green-400' },
                { icon: <Crown className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.autonomy', defaultMessage: 'Autonomie totale' }), color: 'text-purple-400' },
                { icon: <Smartphone className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.phone', defaultMessage: 'Smartphone suffit' }), color: 'text-pink-400' },
                { icon: <Users className="w-5 h-5" />, label: intl.formatMessage({ id: 'captain.landing.perk.team', defaultMessage: 'Esprit d\'equipe' }), color: 'text-cyan-400' },
              ].map((p, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex items-center gap-2.5">
                  <span className={p.color}>{p.icon}</span>
                  <span className="text-sm font-semibold text-white/90">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            6. CALCULATEUR — 3 sliders, $ + devise locale
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black via-green-950/20 to-gray-950" aria-labelledby="captain-calc-title">
          <div className="max-w-5xl mx-auto">
            <h2 id="captain-calc-title" className="!text-3xl sm:!text-4xl font-black text-center mb-2">
              <FormattedMessage id="captain.landing.calc.title" defaultMessage="Estimez vos revenus" />
            </h2>
            <p className="text-sm text-white/50 text-center mb-8"><FormattedMessage id="captain.landing.calc.sub" defaultMessage="Deplacez les curseurs pour simuler" /></p>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Sliders */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="c-team" className="text-sm flex justify-between mb-2">
                      <span><FormattedMessage id="captain.landing.calc.team" defaultMessage="Taille de votre equipe" /></span>
                      <span className="text-amber-400 font-bold">{teamSize}</span>
                    </label>
                    <input id="c-team" type="range" min="5" max="200" value={teamSize} onChange={e => setTeamSize(Number(e.target.value))}
                      className="w-full appearance-none cursor-pointer h-2 bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
                  </div>
                  <div>
                    <label htmlFor="c-calls" className="text-sm flex justify-between mb-2">
                      <span><FormattedMessage id="captain.landing.calc.calls" defaultMessage="Appels/mois par chatter" /></span>
                      <span className="text-green-400 font-bold">{callsPerChatter}</span>
                    </label>
                    <input id="c-calls" type="range" min="5" max="40" value={callsPerChatter} onChange={e => setCallsPerChatter(Number(e.target.value))}
                      className="w-full appearance-none cursor-pointer h-2 bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-green-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
                  </div>
                  <div>
                    <label htmlFor="c-pers" className="text-sm flex justify-between mb-2">
                      <span><FormattedMessage id="captain.landing.calc.personal" defaultMessage="Vos appels directs/mois" /></span>
                      <span className="text-blue-400 font-bold">{personalCalls}</span>
                    </label>
                    <input id="c-pers" type="range" min="0" max="60" value={personalCalls} onChange={e => setPersonalCalls(Number(e.target.value))}
                      className="w-full appearance-none cursor-pointer h-2 bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer" />
                  </div>
                  <div className={`bg-gradient-to-r ${tier.color} border ${tier.border} rounded-xl p-3 text-center`}>
                    <span className={`text-lg font-black ${tier.text}`}>{tier.icon} {intl.formatMessage({ id: tier.nameKey, defaultMessage: tier.nameDefault })}</span>
                    <span className="text-xs text-white/40 ml-2">({totalTeamCalls} {intl.formatMessage({ id: 'captain.landing.tier.calls', defaultMessage: 'appels' })})</span>
                  </div>
                </div>
              </div>

              {/* Resultat */}
              <div className="bg-gradient-to-br from-amber-500/10 to-green-500/10 border-2 border-amber-500/20 rounded-2xl p-5 sm:p-6 flex flex-col justify-center">
                <p className="text-xs text-center mb-1 text-white/50 uppercase font-bold"><FormattedMessage id="captain.landing.calc.result" defaultMessage="Revenus mensuels estimes" /></p>
                <p className="text-4xl sm:text-5xl font-black text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-green-400 mb-0.5" aria-live="polite">
                  {total.toLocaleString()}$
                </p>
                {localBlock(total) && <p className="text-base sm:text-lg font-bold text-center text-amber-300/60 mb-4">{localBlock(total)}</p>}

                <div className="space-y-1.5 text-sm mb-5">
                  <div className="flex justify-between"><span className="text-white/60"><FormattedMessage id="captain.landing.calc.r1" defaultMessage="Commissions equipe" /></span><span className="font-bold text-amber-400">{teamComm.toLocaleString()}$</span></div>
                  <div className="flex justify-between"><span className="text-white/60"><FormattedMessage id="captain.landing.calc.r2" defaultMessage="Bonus palier" /> ({intl.formatMessage({ id: tier.nameKey, defaultMessage: tier.nameDefault })})</span><span className="font-bold text-green-400">{tier.bonus}$</span></div>
                  <div className={`flex justify-between ${!qualityOk ? 'opacity-40' : ''}`}><span className="text-white/60"><FormattedMessage id="captain.landing.calc.r3" defaultMessage="Bonus qualite" /></span><span className="font-bold text-purple-400">{qualityBonus}$</span></div>
                  <div className="flex justify-between"><span className="text-white/60"><FormattedMessage id="captain.landing.calc.r4" defaultMessage="Appels directs" /></span><span className="font-bold text-blue-400">{persRev}$</span></div>
                </div>

                <CTAButton onClick={scrollToForm} className="w-full" ariaLabel={ctaLabel}>
                  <FormattedMessage id="captain.landing.cta.join" defaultMessage="Rejoindre l'aventure" />
                </CTAButton>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            7. FORMULAIRE — Candidature → Firestore
        ================================================================ */}
        <section id="captain-form" className="section-content bg-gradient-to-b from-gray-950 via-indigo-950/20 to-black" aria-labelledby="captain-form-title">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <Heart className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h2 id="captain-form-title" className="!text-3xl sm:!text-4xl font-black mb-2">
                <FormattedMessage id="captain.landing.form.title" defaultMessage="Rejoignez l'equipe" />
              </h2>
              <p className="text-sm text-white/60">
                <FormattedMessage id="captain.landing.form.sub" defaultMessage="On vous recontacte rapidement sur WhatsApp." />
              </p>
            </div>

            {formState === 'sent' ? (
              <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-8 text-center">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="!text-2xl font-bold text-green-400 mb-2">
                  <FormattedMessage id="captain.landing.form.ok.title" defaultMessage="Candidature recue !" />
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  <FormattedMessage id="captain.landing.form.ok.desc" defaultMessage="On revient vers vous tres vite sur WhatsApp. En attendant, vous pouvez deja creer votre compte chatter pour decouvrir la plateforme." />
                </p>
                <CTAButton onClick={() => navigate(registerRoute)} className="mx-auto">
                  <FormattedMessage id="captain.landing.form.ok.cta" defaultMessage="Creer mon compte" />
                </CTAButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 lg:p-8 space-y-4">
                <div>
                  <label htmlFor="cap-name" className="text-sm font-medium text-white/80 block mb-1.5">
                    <FormattedMessage id="captain.landing.form.name" defaultMessage="Nom complet" /> *
                  </label>
                  <input id="cap-name" type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder={intl.formatMessage({ id: 'captain.landing.form.name.ph', defaultMessage: 'Ex: Moussa Traore' })} />
                </div>
                <div>
                  <label htmlFor="cap-wa" className="text-sm font-medium text-white/80 block mb-1.5">WhatsApp *</label>
                  <input id="cap-wa" type="tel" required value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder="+221 77 123 45 67" />
                </div>
                <div>
                  <label htmlFor="cap-country" className="text-sm font-medium text-white/80 block mb-1.5">
                    <FormattedMessage id="captain.landing.form.country" defaultMessage="Pays" /> *
                  </label>
                  <input id="cap-country" type="text" required value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                    placeholder={intl.formatMessage({ id: 'captain.landing.form.country.ph', defaultMessage: 'Ex: Senegal' })} />
                </div>
                {/* Photo */}
                <div>
                  <label className="text-sm font-medium text-white/80 block mb-1.5">
                    <FormattedMessage id="captain.landing.form.photo" defaultMessage="Photo de profil (optionnel)" />
                  </label>
                  <div className="flex items-center gap-3">
                    {photoPreview ? (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-full border-2 border-amber-400" />
                        <button type="button" onClick={() => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoFile(null); setPhotoPreview(''); setPhotoUrl(''); }}
                          className="absolute -top-2 -right-2 w-7 h-7 min-w-[28px] min-h-[28px] bg-red-500 rounded-full flex items-center justify-center z-10 touch-manipulation">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                        <Image className="w-6 h-6 text-white/30" />
                      </div>
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 hover:border-amber-400/50 transition-colors min-h-[48px]">
                        <Upload className="w-4 h-4 text-white/50" />
                        <span className="text-white/50 text-sm">
                          {photoUploading ? `${photoProgress}%` : photoFile ? photoFile.name : intl.formatMessage({ id: 'captain.landing.form.photo.ph', defaultMessage: 'Choisir une photo' })}
                        </span>
                      </div>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoSelect} />
                    </label>
                  </div>
                  {photoUploading && (
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${photoProgress}%` }} />
                    </div>
                  )}
                </div>

                {/* CV */}
                <div>
                  <label className="text-sm font-medium text-white/80 block mb-1.5">
                    <FormattedMessage id="captain.landing.form.cv" defaultMessage="CV (PDF ou Word, max 5MB)" />
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 hover:border-amber-400/50 transition-colors min-h-[48px]">
                        {cvFile ? <FileText className="w-4 h-4 text-amber-400" /> : <Upload className="w-4 h-4 text-white/50" />}
                        <span className={cvFile ? 'text-white text-sm truncate' : 'text-white/50 text-sm'}>
                          {cvUploading ? `Upload... ${cvProgress}%` : cvFile ? cvFile.name : intl.formatMessage({ id: 'captain.landing.form.cv.ph', defaultMessage: 'Choisir un fichier' })}
                        </span>
                        {cvFile && !cvUploading && <Check className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />}
                      </div>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvSelect} />
                    </label>
                    {cvFile && !cvUploading && (
                      <button type="button" onClick={() => { setCvFile(null); setCvUrl(''); }}
                        className="w-8 h-8 min-w-[32px] bg-red-500/20 hover:bg-red-500/40 rounded-lg flex items-center justify-center transition-colors touch-manipulation">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                  {cvUploading && (
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${cvProgress}%` }} />
                    </div>
                  )}
                </div>

                {/* Motivation */}
                <div>
                  <label htmlFor="cap-motiv" className="text-sm font-medium text-white/80 block mb-1.5">
                    <FormattedMessage id="captain.landing.form.motivation" defaultMessage="Message de motivation (optionnel)" />
                  </label>
                  <textarea id="cap-motiv" rows={3} value={form.motivation} onChange={e => setForm(p => ({ ...p, motivation: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors resize-none min-h-[48px]"
                    placeholder={intl.formatMessage({ id: 'captain.landing.form.motiv.ph', defaultMessage: 'Votre experience, vos reseaux, votre motivation...' })} />
                </div>

                {formState === 'error' && (
                  <p className="text-red-400 text-sm text-center">
                    <FormattedMessage id="captain.landing.form.error" defaultMessage="Erreur d'envoi. Reessayez ou contactez-nous sur WhatsApp." />
                  </p>
                )}

                <button type="submit" disabled={formState === 'sending' || cvUploading || photoUploading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-2xl py-4 text-lg shadow-lg hover:shadow-xl hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98] transition-all will-change-transform disabled:opacity-60">
                  {formState === 'sending' ? (
                    <FormattedMessage id="captain.landing.form.sending" defaultMessage="Envoi en cours..." />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <FormattedMessage id="captain.landing.form.submit" defaultMessage="Envoyer ma candidature" />
                    </>
                  )}
                </button>
                <p className="text-xs text-white/30 text-center">
                  <FormattedMessage id="captain.landing.form.privacy" defaultMessage="Vos donnees restent confidentielles." />
                </p>
              </form>
            )}
          </div>
        </section>

        {/* ================================================================
            8. FAQ — 5 questions
        ================================================================ */}
        <section className="section-content bg-black" id="faq" aria-labelledby="captain-faq-title">
          <div className="max-w-3xl mx-auto">
            <h2 id="captain-faq-title" className="!text-3xl sm:!text-4xl font-black text-center mb-6">
              <FormattedMessage id="captain.faq.title" defaultMessage="Questions frequentes" />
            </h2>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <FAQItem key={i} index={i} question={item.q} answer={item.a} isOpen={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? null : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            9. CTA FINAL
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black via-purple-950/20 to-black relative" aria-labelledby="captain-cta-final">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.06),transparent_50%)]" aria-hidden="true" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <Rocket className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 mx-auto mb-4" />
            <h2 id="captain-cta-final" className="!text-2xl sm:!text-4xl lg:!text-5xl font-black text-white mb-3 sm:mb-5">
              <FormattedMessage id="captain.landing.cta.title" defaultMessage="L'aventure commence ici." />
            </h2>
            <p className="text-sm sm:text-base text-white/60 mb-6 max-w-xl mx-auto">
              <FormattedMessage id="captain.landing.cta.desc" defaultMessage="Startup en pleine croissance. Equipe bienveillante. Poste evolutif. On vous attend." />
            </p>
            <CTAButton onClick={scrollToForm} size="large" className="w-full max-w-md mx-auto" ariaLabel={ctaLabel}>
              <FormattedMessage id="captain.landing.cta.join" defaultMessage="Rejoindre l'aventure" />
            </CTAButton>
          </div>
        </section>

        {/* ================================================================
            10. STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} role="complementary" aria-label={ctaLabel}>
            <div className="bg-black/95 backdrop-blur-md border-t border-white/10 px-4 py-3">
              <button onClick={scrollToForm} aria-label={ctaLabel}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] sm:text-lg will-change-transform">
                <Rocket className="w-5 h-5" aria-hidden="true" />
                <FormattedMessage id="captain.landing.cta.join" defaultMessage="Rejoindre l'aventure" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CaptainLanding;

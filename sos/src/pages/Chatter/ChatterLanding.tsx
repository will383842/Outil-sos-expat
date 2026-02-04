/**
 * ChatterLanding - Landing Page Ultra-Optimisée Tunnel Facebook
 *
 * CORRECTIONS V4:
 * - Header ajouté
 * - Version Desktop responsive améliorée
 * - Contraste et tailles de police uniformisés
 * - 100 à 5000$+ par mois
 * - 10$ par appel (pas par client)
 * - Expatriés, voyageurs, vacanciers
 * - 1200+ chatters, top earner 5300$
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import {
  ArrowRight,
  Check,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Globe,
  Infinity,
  Menu,
  X,
} from 'lucide-react';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  .section-screen {
    min-height: 100svh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
  }
  @supports not (min-height: 100svh) {
    .section-screen { min-height: 100vh; }
  }
  @media (min-width: 1024px) {
    .section-screen {
      padding: 4rem 2rem;
      min-height: auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-bounce { animation: none !important; }
  }
`;

// ============================================================================
// COMPOSANTS
// ============================================================================

const CTAButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  size?: 'normal' | 'large';
  className?: string;
}> = ({ onClick, children, size = 'normal', className = '' }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center gap-3
      bg-gradient-to-r from-amber-400 to-yellow-400
      text-black font-extrabold rounded-2xl
      shadow-lg shadow-amber-500/30
      transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300
      ${size === 'large' ? 'min-h-[64px] px-8 py-5 text-xl' : 'min-h-[56px] px-6 py-4 text-lg'}
      ${className}
    `}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-6 h-6' : 'w-5 h-5'} />
  </button>
);

const ScrollHint: React.FC = () => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:hidden">
    <ChevronDown className="w-7 h-7 text-white/40 animate-bounce" />
  </div>
);

// ============================================================================
// HEADER
// ============================================================================
const Header: React.FC<{ onCTAClick: () => void }> = ({ onCTAClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg lg:text-xl">S</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg lg:text-xl">SOS-Expat</span>
              <span className="text-amber-400 font-bold text-lg lg:text-xl ml-1">Chatter</span>
            </div>
          </div>

          {/* CTA Desktop */}
          <button
            onClick={onCTAClick}
            className="hidden md:flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold px-6 py-3 rounded-xl hover:shadow-lg hover:from-amber-300 hover:to-yellow-300 transition-all"
          >
            Devenir Chatter
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* CTA Mobile */}
          <button
            onClick={onCTAClick}
            className="md:hidden bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm"
          >
            S'inscrire
          </button>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// PAGE
// ============================================================================

const ChatterLanding: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'fr') as 'fr' | 'en';

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [teamSize, setTeamSize] = useState(10);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Calcul revenus équipe (10 appels/mois/chatter en moyenne)
  const teamEarnings = teamSize * 10;

  return (
    <>
      <Helmet>
        <title>Devenir Chatter | Gagnez 100 à 5000$+/mois | SOS-Expat</title>
        <meta name="description" content="Aidez les voyageurs et gagnez 10$ par appel. Créez votre agence de chatters. 197 pays, toutes langues. 100% gratuit." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#991B1B" />
      </Helmet>

      <style>{globalStyles}</style>

      <div className="bg-black text-white">
        {/* Header */}
        <Header onCTAClick={goToRegister} />

        {/* ================================================================
            SECTION 1 - HERO
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-red-950 via-red-900 to-black relative overflow-hidden pt-20 lg:pt-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.15),transparent_60%)]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
              {/* Colonne gauche - Contenu principal */}
              <div className="text-center lg:text-left">
                {/* Badge Early Adopter */}
                <div className="inline-flex items-center gap-2 bg-red-500/20 backdrop-blur rounded-full px-4 py-2 mb-4 border border-red-500/40 animate-pulse">
                  <span className="text-base font-bold text-red-400">⚡ 50 premiers inscrits : +50% sur commissions équipe</span>
                </div>

                {/* Badge international */}
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-6 border border-white/20">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span className="text-base font-semibold text-white">197 pays • Toutes nationalités</span>
                </div>

                {/* HEADLINE */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] mb-5">
                  <span className="text-white">Gagnez</span>
                  <br />
                  <span className="text-amber-400">100 à 5 000$+</span>
                  <br />
                  <span className="text-white">/mois</span>
                </h1>

                {/* Sous-titre */}
                <p className="text-xl sm:text-2xl lg:text-3xl text-white font-medium mb-3">
                  Aidez les voyageurs, gagnez votre vie.
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 mb-8">
                  Expatriés, voyageurs, vacanciers ont besoin d'aide.
                  <br />
                  <span className="text-amber-400 font-bold">Depuis votre téléphone. 15 min/jour.</span>
                </p>

                {/* CTA Desktop */}
                <div className="hidden lg:block mb-8">
                  <CTAButton onClick={goToRegister} size="large" className="w-auto inline-flex">
                    Commencer gratuitement
                  </CTAButton>
                </div>

                {/* Trust */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-base">
                  <span className="flex items-center gap-2 text-gray-200">
                    <Shield className="w-5 h-5 text-green-400" /> 100% Gratuit
                  </span>
                  <span className="flex items-center gap-2 text-gray-200">
                    <Zap className="w-5 h-5 text-amber-400" /> 5 min d'inscription
                  </span>
                  <span className="flex items-center gap-2 text-gray-200">
                    <Globe className="w-5 h-5 text-blue-400" /> Toutes langues
                  </span>
                </div>
              </div>

              {/* Colonne droite - Stats (Desktop) */}
              <div className="hidden lg:block">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Vos gains potentiels</h3>

                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                      <div className="text-4xl xl:text-5xl font-black text-amber-400">10$</div>
                      <div className="text-lg text-gray-300 mt-1">/ appel</div>
                    </div>
                    <div className="text-center border-x border-white/10">
                      <div className="text-4xl xl:text-5xl font-black text-white">197</div>
                      <div className="text-lg text-gray-300 mt-1">pays</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl xl:text-5xl font-black text-green-400">∞</div>
                      <div className="text-lg text-gray-300 mt-1">revenus</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-amber-500/10 rounded-xl p-4">
                      <span className="text-lg text-gray-200">5 appels/semaine</span>
                      <span className="text-2xl font-bold text-amber-400">200$/mois</span>
                    </div>
                    <div className="flex items-center justify-between bg-green-500/10 rounded-xl p-4">
                      <span className="text-lg text-gray-200">+ Équipe de 10</span>
                      <span className="text-2xl font-bold text-green-400">+100$/mois</span>
                    </div>
                    <div className="flex items-center justify-between bg-purple-500/10 rounded-xl p-4">
                      <span className="text-lg text-gray-200">+ 2 avocats partenaires</span>
                      <span className="text-2xl font-bold text-purple-400">+220$/mois</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Mobile */}
            <div className="lg:hidden">
              <div className="flex justify-center gap-6 sm:gap-10 my-8">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-amber-400">10$</div>
                  <div className="text-base text-gray-300">/ appel</div>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-white">197</div>
                  <div className="text-base text-gray-300">pays</div>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-green-400">∞</div>
                  <div className="text-base text-gray-300">revenus</div>
                </div>
              </div>

              <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm mx-auto">
                Commencer gratuitement
              </CTAButton>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 2 - 3 SOURCES DE REVENUS
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-black to-gray-950 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-white mb-3">
              <span className="text-amber-400">3 façons</span> de gagner
            </h2>
            <p className="text-gray-300 text-center text-lg lg:text-xl mb-10 lg:mb-16">
              Cumulez vos revenus. Sans limite.
            </p>

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">

              {/* Source 1: Aidez et gagnez */}
              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-2xl p-6 lg:p-8">
                <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center mb-5">
                  <span className="text-3xl font-black text-black">1</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Scrollez, aidez, gagnez</h3>
                <p className="text-gray-200 text-lg mb-4">
                  Parcourez les groupes Facebook et forums. Aidez ceux qui ont besoin en partageant votre lien.
                </p>
                <div className="text-4xl font-black text-amber-400 mb-2">
                  10$ POUR VOUS
                </div>
                <p className="text-lg text-gray-300">à chaque appel passé via votre lien</p>
              </div>

              {/* Source 2: Équipe de chatters */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl p-6 lg:p-8">
                <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mb-5">
                  <span className="text-3xl font-black text-black">2</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Recrutez des chatters</h3>
                <p className="text-gray-200 text-lg mb-4">
                  Créez une équipe <span className="text-green-400 font-bold">ILLIMITÉE</span>. Sur chaque appel de vos recrues :
                </p>
                <div className="flex flex-wrap gap-4 mb-3">
                  <span className="text-2xl font-bold text-green-400">+1$ (niveau 1)</span>
                  <span className="text-2xl font-bold text-cyan-400">+0,50$ (niveau 2)</span>
                </div>
                <p className="text-lg text-gray-300 flex items-center gap-2">
                  <Infinity className="w-5 h-5" /> À vie. Pas de limite d'équipe.
                </p>
              </div>

              {/* Source 3: Partenaires providers */}
              <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/40 rounded-2xl p-6 lg:p-8">
                <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-5">
                  <span className="text-3xl font-black text-white">3</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Trouvez des partenaires</h3>
                <p className="text-gray-200 text-lg mb-4">
                  Invitez des avocats ou expatriés aidants avec votre lien spécial.
                </p>
                <div className="text-4xl font-black text-purple-400 mb-2">
                  5$ sur chaque appel
                </div>
                <p className="text-lg text-gray-300">qu'ils reçoivent. Sans rien faire.</p>
                <p className="text-lg text-gray-300 mt-3">
                  Un avocat reçoit <span className="text-purple-400 font-bold">8 à 60 appels/mois</span>
                </p>
                <p className="text-base text-gray-400">(moyenne : 22 appels/mois)</p>
              </div>
            </div>

            {/* Récap */}
            <div className="mt-10 lg:mt-16 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 rounded-2xl p-6 lg:p-8 text-center max-w-2xl mx-auto">
              <p className="text-gray-300 text-lg mb-2">Avec une agence de 50 chatters + partenaires</p>
              <p className="text-3xl lg:text-4xl font-black text-white">
                = <span className="text-amber-400">5 000$+/mois</span> possibles
              </p>
              <p className="text-lg text-gray-400 mt-3">Aucun plafond. Votre agence, vos revenus.</p>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 3 - PREUVE SOCIALE
        ================================================================ */}
        <section className="section-screen bg-gray-950 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-white mb-2">
              Ils gagnent <span className="text-green-400">vraiment</span>
            </h2>
            <p className="text-gray-400 text-center text-lg lg:text-xl mb-10 lg:mb-16">
              Chatters vérifiés ce mois
            </p>

            <div className="grid lg:grid-cols-3 gap-4 lg:gap-6 max-w-5xl mx-auto">

              {/* Témoignage 1 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-2xl">👨🏿</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 text-lg">
                        Amadou D. <span>🇸🇳</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-base text-gray-400">3 mois d'ancienneté</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400">430$</div>
                    <div className="text-sm text-gray-400">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-200 text-base">
                  "45 min/jour dans les groupes Facebook. 43 appels ce mois."
                </p>
              </div>

              {/* Témoignage 2 - TOP */}
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-2 border-amber-500/50 rounded-xl p-5 relative lg:scale-105 lg:z-10">
                <div className="absolute -top-3 right-4 bg-amber-500 text-black text-sm font-bold px-4 py-1.5 rounded-full">
                  TOP EARNER
                </div>
                <div className="flex items-center justify-between mb-3 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center text-2xl">👩🏼</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 text-lg">
                        Marie L. <span>🇫🇷</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-base text-gray-400">6 mois • Équipe de 23</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400">5 300$</div>
                    <div className="text-sm text-gray-400">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-200 text-base">
                  "Les 3 sources de revenus combinées. Mon agence tourne toute seule maintenant."
                </p>
              </div>

              {/* Témoignage 3 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-2xl">👨🏾</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 text-lg">
                        Kofi A. <span>🇬🇭</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-base text-gray-400">2 mois d'ancienneté</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400">280$</div>
                    <div className="text-sm text-gray-400">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-200 text-base">
                  "Payé via MTN MoMo en 24h. Je cible les Ghanéens aux Émirats."
                </p>
              </div>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-2 gap-4 lg:gap-6 mt-10 max-w-md mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-white">1 200+</div>
                <div className="text-lg text-gray-400">Chatters actifs</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl font-black text-white">197</div>
                <div className="text-lg text-gray-400">Pays</div>
              </div>
            </div>

            {/* Podium mensuel */}
            <div className="mt-12 lg:mt-16 max-w-3xl mx-auto">
              <h3 className="text-2xl lg:text-3xl font-bold text-center text-white mb-6">
                🏆 Podium du mois
              </h3>
              <div className="flex items-end justify-center gap-3 lg:gap-6">
                {/* 2ème place */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-gray-400 rounded-full flex items-center justify-center text-2xl mb-2">🥈</div>
                  <div className="bg-gradient-to-t from-gray-500/20 to-gray-400/10 border border-gray-400/40 rounded-t-xl px-4 lg:px-8 pt-4 pb-6 text-center h-28 lg:h-32">
                    <p className="text-white font-bold text-base lg:text-lg">Fatou S.</p>
                    <p className="text-2xl lg:text-3xl font-black text-gray-300">3 850$</p>
                  </div>
                </div>
                {/* 1ère place */}
                <div className="flex flex-col items-center -mb-4">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-amber-500 rounded-full flex items-center justify-center text-3xl mb-2">🥇</div>
                  <div className="bg-gradient-to-t from-amber-500/20 to-yellow-400/10 border-2 border-amber-500/50 rounded-t-xl px-5 lg:px-10 pt-5 pb-8 text-center h-36 lg:h-44">
                    <p className="text-white font-bold text-lg lg:text-xl">Marie L.</p>
                    <p className="text-3xl lg:text-4xl font-black text-amber-400">5 300$</p>
                    <p className="text-sm text-gray-400 mt-1">TOP EARNER</p>
                  </div>
                </div>
                {/* 3ème place */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-orange-700 rounded-full flex items-center justify-center text-2xl mb-2">🥉</div>
                  <div className="bg-gradient-to-t from-orange-700/20 to-orange-600/10 border border-orange-600/40 rounded-t-xl px-4 lg:px-8 pt-4 pb-6 text-center h-24 lg:h-28">
                    <p className="text-white font-bold text-base lg:text-lg">Kwame O.</p>
                    <p className="text-2xl lg:text-3xl font-black text-orange-400">2 940$</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-gray-500 text-base mt-6">
                Classement mis à jour chaque mois
              </p>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 4 - CRÉEZ VOTRE AGENCE
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-950 via-green-950/30 to-gray-950 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">

            {/* Badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 px-5 py-2 rounded-full text-base font-bold border border-green-500/30">
                🏢 Modèle Agence
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-white mb-3">
              Créez votre <span className="text-green-400">agence</span>
            </h2>
            <p className="text-gray-400 text-center text-lg lg:text-xl mb-10">
              Recrutez des chatters. Gagnez sur leur activité. Sans limite.
            </p>

            {/* Évolution: Solo → Agence */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <div className="bg-white/10 rounded-full px-5 py-2.5 text-lg">
                <span className="text-gray-300 font-medium">Chatter solo</span>
              </div>
              <ArrowRight className="w-6 h-6 text-green-400" />
              <div className="bg-green-500/20 border border-green-500/40 rounded-full px-5 py-2.5 text-lg">
                <span className="text-green-400 font-bold">Agence de Chatters</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Structure agence */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
                <h3 className="text-xl font-bold text-white mb-6">Structure de votre agence</h3>
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-black">BOSS</span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">Vous = Le directeur</div>
                      <div className="text-2xl font-bold text-amber-400">10$ / appel perso</div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-green-500/50 ml-8 h-6" />

                  <div className="flex items-center gap-4 ml-4">
                    <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-lg">Votre équipe <span className="text-green-400">(∞ chatters)</span></div>
                      <div className="text-2xl font-bold text-green-400">+1$ sur chaque appel</div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-cyan-500/50 ml-8 h-6" />

                  <div className="flex items-center gap-4 ml-8">
                    <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-lg">Leurs recrues <span className="text-cyan-400">(∞)</span></div>
                      <div className="text-2xl font-bold text-cyan-400">+0,50$ sur chaque appel</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculateur agence */}
              <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/40 rounded-2xl p-6 lg:p-8">
                <h3 className="text-xl font-bold text-white mb-6">Calculez vos revenus passifs</h3>
                <label className="text-lg text-gray-300 block mb-4">
                  Votre agence avec <span className="text-green-400 font-bold text-2xl">{teamSize}</span> chatters :
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer mb-6
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
                    [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="text-center">
                  <p className="text-lg text-gray-400 mb-2">Revenus passifs de votre agence</p>
                  <p className="text-6xl font-black text-green-400">
                    +{teamEarnings}$/mois
                  </p>
                  <p className="text-lg text-gray-400 mt-4">
                    Sans rien faire. Juste parce qu'ils travaillent.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-gray-400 text-lg mt-8">
              <span className="text-green-400 font-semibold">Revenus à vie.</span> Tant que votre agence tourne.
            </p>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 5 - INTERNATIONAL + ZÉRO RISQUE
        ================================================================ */}
        <section className="section-screen bg-gray-950 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center text-white mb-10 lg:mb-16">
              Zéro risque. <span className="text-green-400">Zéro limite.</span>
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-10">
              {[
                { emoji: '🌍', title: '197 pays', desc: 'Toutes nationalités acceptées', color: 'text-blue-400' },
                { emoji: '🗣️', title: 'Toutes langues', desc: 'Travaillez dans votre langue', color: 'text-purple-400' },
                { emoji: '💸', title: '100% Gratuit', desc: 'Aucun frais, jamais', color: 'text-green-400' },
                { emoji: '📱', title: 'Juste un téléphone', desc: 'Pas d\'ordinateur requis', color: 'text-amber-400' },
                { emoji: '⏰', title: 'Aucun engagement', desc: 'Arrêtez quand vous voulez', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-5">
                  <span className="text-4xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-lg ${item.color}`}>{item.title}</div>
                    <div className="text-gray-400">{item.desc}</div>
                  </div>
                  <Check className="w-6 h-6 text-green-400 flex-shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>

            {/* Paiements */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 text-center max-w-3xl mx-auto">
              <p className="text-gray-300 text-lg mb-4">Retrait dès 25$ • Reçu en 48h</p>
              <div className="flex flex-wrap justify-center gap-3">
                {['🌐 Wise', '🟠 Orange Money', '🌊 Wave', '💚 M-Pesa', '🏦 Virement'].map((m, i) => (
                  <span key={i} className="bg-white/10 text-white rounded-full px-5 py-2.5 text-base font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 6 - CTA FINAL
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-950 via-red-950/30 to-black relative py-16 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.08),transparent_60%)]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-4">

            <p className="text-gray-300 text-xl lg:text-2xl mb-4">Rejoignez +1 200 chatters dans 197 pays</p>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              Commencez à gagner
              <br />
              <span className="text-amber-400">aujourd'hui</span>
            </h2>

            {/* Récap */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                '3 sources de revenus',
                'Équipe illimitée',
                '197 pays',
                '100% gratuit'
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-white rounded-full px-5 py-2.5 text-base font-medium">
                  <Check className="w-5 h-5 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-md mx-auto">
              Devenir Chatter maintenant
            </CTAButton>

            <p className="text-gray-500 mt-5 text-lg">
              Inscription gratuite • Démarrez en 5 minutes
            </p>

            {/* Urgence - Bonus Early Adopter */}
            <div className="mt-10 bg-gradient-to-r from-red-500/20 to-orange-500/10 border-2 border-red-500/50 rounded-2xl p-6 lg:p-8 max-w-xl mx-auto relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                OFFRE LIMITÉE
              </div>
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-black text-white mb-2">
                  <span className="text-red-400">+50%</span> sur commissions équipe
                </p>
                <p className="text-xl text-gray-300 mb-4">
                  Pour les <span className="text-red-400 font-bold">50 premiers</span> inscrits ce mois
                </p>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <span className="text-lg">⚡</span>
                  <span className="text-base">1$ devient 1,50$ • 0,50$ devient 0,75$</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="bg-black/95 backdrop-blur-md border-t border-amber-500/40 px-4 py-3">
              <button
                onClick={goToRegister}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-4 rounded-xl min-h-[52px] active:scale-[0.98]"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default ChatterLanding;

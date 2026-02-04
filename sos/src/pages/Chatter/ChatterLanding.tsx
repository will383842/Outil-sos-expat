/**
 * ChatterLanding - Landing Page Chatter
 *
 * V6: Tailles de police cohérentes mobile/desktop
 * - Progression: mobile → sm (640px) → lg (1024px)
 * - Header SOS-Expat standard
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Header from '@/components/layout/Header';
import {
  ArrowRight,
  Check,
  Users,
  ChevronDown,
  Infinity,
} from 'lucide-react';

// ============================================================================
// STYLES
// ============================================================================
const globalStyles = `
  .section-content {
    padding: 3rem 1rem;
    position: relative;
  }
  @media (min-width: 640px) {
    .section-content {
      padding: 4rem 1.5rem;
    }
  }
  @media (min-width: 1024px) {
    .section-content {
      padding: 6rem 2rem;
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
      flex items-center justify-center gap-2 sm:gap-3
      bg-gradient-to-r from-amber-400 to-yellow-400
      text-black font-extrabold rounded-2xl
      shadow-lg shadow-amber-500/30
      transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300
      ${size === 'large' ? 'min-h-[56px] sm:min-h-[64px] px-6 sm:px-8 py-4 sm:py-5 text-lg sm:text-xl' : 'min-h-[48px] sm:min-h-[56px] px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg'}
      ${className}
    `}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'} />
  </button>
);

const ScrollIndicator: React.FC = () => (
  <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
    <span className="text-white/60 text-xs sm:text-sm font-medium">Découvrir</span>
    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white/60 animate-bounce" />
  </div>
);

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
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const teamEarnings = teamSize * 10;

  return (
    <>
      <Helmet>
        <title>Devenir Chatter | Gagnez en aidant les voyageurs | SOS-Expat</title>
        <meta name="description" content="Aidez les voyageurs et gagnez 10$ par appel. Créez votre agence. 197 pays, toutes langues. 100% gratuit." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#991B1B" />
      </Helmet>

      <style>{globalStyles}</style>

      {/* Header SOS-Expat standard */}
      <Header />

      <div className="bg-black text-white">

        {/* ================================================================
            HERO - ACCROCHE EXPLICITE ET PERCUTANTE
        ================================================================ */}
        <section className="min-h-screen flex flex-col justify-center items-center relative bg-gradient-to-b from-red-950 via-red-900 to-black overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(251,191,36,0.15),transparent_50%)]" />

          <div className="relative z-10 text-center px-5 sm:px-6 max-w-5xl mx-auto">
            {/* Accroche principale */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-[1.1] mb-4 sm:mb-6">
              <span className="text-white">Gagnez de l'argent</span>
              <br />
              <span className="text-white">en aidant les </span>
              <span className="text-amber-400">voyageurs</span>
            </h1>

            {/* Proposition de valeur claire */}
            <p className="text-xl sm:text-2xl lg:text-3xl text-white font-bold mb-3 sm:mb-4">
              <span className="text-amber-400">10$</span> pour vous à chaque appel
            </p>

            {/* Explication simple */}
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-8 sm:mb-10 max-w-2xl mx-auto">
              Partagez votre lien aux expatriés qui ont besoin d'aide juridique.
              <br className="hidden sm:block" />
              Quand ils appellent, vous gagnez.
            </p>

            {/* CTA */}
            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm sm:max-w-md mx-auto">
              Commencer gratuitement
            </CTAButton>

            {/* Réassurance */}
            <p className="text-gray-400 mt-5 sm:mt-6 text-sm sm:text-base">
              100% gratuit • Aucun investissement • 197 pays
            </p>
          </div>

          <ScrollIndicator />
        </section>

        {/* ================================================================
            SECTION 2 - 3 SOURCES DE REVENUS
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-black to-gray-950">
          <div className="max-w-7xl mx-auto">

            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-3 sm:mb-4">
              <span className="text-amber-400">3 façons</span> de gagner
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-300 text-center mb-10 sm:mb-12 lg:mb-16">
              Cumulez vos revenus. Sans limite.
            </p>

            <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">

              {/* Source 1 */}
              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-black">1</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">Scrollez, aidez, gagnez</h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  Parcourez les groupes Facebook et forums. Aidez ceux qui ont besoin en partageant votre lien.
                </p>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-400">
                  10$ / appel
                </div>
              </div>

              {/* Source 2 */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-green-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-black">2</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">Recrutez des chatters</h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  Créez une équipe <span className="text-green-400 font-bold">ILLIMITÉE</span>. Sur chaque appel de vos recrues :
                </p>
                <div className="space-y-1 sm:space-y-2">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">+1$ niveau 1</div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">+0,50$ niveau 2</div>
                </div>
              </div>

              {/* Source 3 */}
              <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-purple-500 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white">3</span>
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 sm:mb-4">Trouvez des partenaires</h3>
                <p className="text-base sm:text-lg lg:text-xl text-gray-200 mb-4 sm:mb-5 lg:mb-6">
                  Invitez des avocats ou expatriés aidants avec votre lien spécial.
                </p>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-purple-400 mb-2">
                  5$ / appel
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300">
                  Un avocat reçoit <span className="text-purple-400 font-bold">8 à 60 appels/mois</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 3 - PREUVE SOCIALE
        ================================================================ */}
        <section className="section-content bg-gray-950">
          <div className="max-w-7xl mx-auto">

            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-3 sm:mb-4">
              Ils gagnent <span className="text-green-400">vraiment</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-400 text-center mb-10 sm:mb-12 lg:mb-16">
              Chatters vérifiés ce mois
            </p>

            {/* Podium */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 lg:gap-8 mb-10 sm:mb-12 lg:mb-16">
              {/* 2ème place */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gray-400 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">🥈</div>
                <div className="bg-gradient-to-t from-gray-500/20 to-gray-400/10 border border-gray-400/40 rounded-t-xl sm:rounded-t-2xl px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-5 sm:pb-8 text-center">
                  <p className="text-white font-bold text-sm sm:text-base lg:text-xl">Fatou S.</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-black text-gray-300">3 850$</p>
                </div>
              </div>
              {/* 1ère place */}
              <div className="flex flex-col items-center -mb-4 sm:-mb-6">
                <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-amber-500 rounded-full flex items-center justify-center text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3">🥇</div>
                <div className="bg-gradient-to-t from-amber-500/20 to-yellow-400/10 border-2 border-amber-500/50 rounded-t-xl sm:rounded-t-2xl px-4 sm:px-8 lg:px-14 pt-5 sm:pt-8 pb-6 sm:pb-10 text-center">
                  <p className="text-white font-bold text-base sm:text-lg lg:text-2xl">Marie L.</p>
                  <p className="text-2xl sm:text-3xl lg:text-5xl font-black text-amber-400">5 300$</p>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-400 mt-1">TOP EARNER</p>
                </div>
              </div>
              {/* 3ème place */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-orange-700 rounded-full flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl mb-2 sm:mb-3">🥉</div>
                <div className="bg-gradient-to-t from-orange-700/20 to-orange-600/10 border border-orange-600/40 rounded-t-xl sm:rounded-t-2xl px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-5 sm:pb-8 text-center">
                  <p className="text-white font-bold text-sm sm:text-base lg:text-xl">Kwame O.</p>
                  <p className="text-xl sm:text-2xl lg:text-4xl font-black text-orange-400">2 940$</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-sm sm:max-w-lg mx-auto">
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">1 200+</div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-400 mt-1 sm:mt-2">Chatters actifs</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">197</div>
                <div className="text-sm sm:text-base lg:text-lg text-gray-400 mt-1 sm:mt-2">Pays</div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 - CRÉEZ VOTRE AGENCE
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-green-950/20 to-gray-950">
          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <span className="inline-block bg-green-500/20 text-green-400 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full text-sm sm:text-base lg:text-lg font-bold border border-green-500/30 mb-4 sm:mb-6">
                🏢 Modèle Agence
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white mb-3 sm:mb-4">
                De chatter solo à <span className="text-green-400">agence</span>
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-400">
                Recrutez des chatters. Gagnez sur leur activité. Sans limite.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 max-w-5xl mx-auto">
              {/* Structure */}
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-5 sm:mb-6 lg:mb-8">Structure de votre agence</h3>
                <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-black text-black">BOSS</span>
                    </div>
                    <div>
                      <div className="text-base sm:text-lg lg:text-xl text-white font-bold">Vous = Le directeur</div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-400">10$ / appel perso</div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-green-500/50 ml-6 sm:ml-7 lg:ml-8 h-6 sm:h-8" />

                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 ml-2 sm:ml-3 lg:ml-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base lg:text-lg text-white">Votre équipe <span className="text-green-400 font-bold">(illimitée)</span></div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">+1$ sur chaque appel</div>
                    </div>
                  </div>

                  <div className="border-l-2 border-dashed border-cyan-500/50 ml-6 sm:ml-7 lg:ml-8 h-6 sm:h-8" />

                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 ml-4 sm:ml-6 lg:ml-8">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm sm:text-base lg:text-lg text-white">Leurs recrues <span className="text-cyan-400 font-bold">(illimitées)</span></div>
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold text-cyan-400">+0,50$ sur chaque appel</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculateur */}
              <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-5 sm:mb-6 lg:mb-8">Calculez vos revenus passifs</h3>
                <label className="text-base sm:text-lg lg:text-xl text-gray-300 block mb-4 sm:mb-5 lg:mb-6">
                  Votre agence avec <span className="text-green-400 font-bold text-xl sm:text-2xl lg:text-3xl">{teamSize}</span> chatters :
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-2 sm:h-3 bg-white/10 rounded-full appearance-none cursor-pointer mb-6 sm:mb-8
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                    sm:[&::-webkit-slider-thumb]:w-7 sm:[&::-webkit-slider-thumb]:h-7
                    lg:[&::-webkit-slider-thumb]:w-8 lg:[&::-webkit-slider-thumb]:h-8
                    [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="text-center">
                  <p className="text-base sm:text-lg lg:text-xl text-gray-400 mb-2 sm:mb-3">Revenus passifs mensuels</p>
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-black text-green-400">
                    +{teamEarnings}$
                  </p>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 mt-3 sm:mt-4 flex items-center justify-center gap-2">
                    <Infinity className="w-4 h-4 sm:w-5 sm:h-5" /> À vie. Tant que votre agence tourne.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 5 - ZÉRO RISQUE
        ================================================================ */}
        <section className="section-content bg-gray-950">
          <div className="max-w-7xl mx-auto">

            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-center text-white mb-8 sm:mb-12 lg:mb-16">
              Zéro risque. <span className="text-green-400">Zéro limite.</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-10 lg:mb-12">
              {[
                { emoji: '🌍', title: '197 pays', desc: 'Toutes nationalités', color: 'text-blue-400' },
                { emoji: '🗣️', title: 'Toutes langues', desc: 'Votre langue', color: 'text-purple-400' },
                { emoji: '💸', title: '100% Gratuit', desc: 'Aucun frais', color: 'text-green-400' },
                { emoji: '📱', title: 'Juste un tel', desc: 'Pas de PC', color: 'text-amber-400' },
                { emoji: '⏰', title: 'Sans engagement', desc: 'Liberté totale', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 text-center">
                  <span className="text-3xl sm:text-4xl lg:text-5xl mb-2 sm:mb-3 lg:mb-4 block">{item.emoji}</span>
                  <div className={`font-bold text-sm sm:text-base lg:text-xl ${item.color} mb-0.5 sm:mb-1`}>{item.title}</div>
                  <div className="text-gray-400 text-xs sm:text-sm lg:text-base">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Paiements */}
            <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 text-center max-w-3xl mx-auto">
              <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-5 lg:mb-6">Retrait dès 25$ • Reçu en 48h</p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
                {['🌐 Wise', '🟠 Orange Money', '🌊 Wave', '💚 M-Pesa', '🏦 Virement'].map((m, i) => (
                  <span key={i} className="bg-white/10 text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 - CTA FINAL
        ================================================================ */}
        <section className="section-content bg-gradient-to-b from-gray-950 via-red-950/20 to-black relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.06),transparent_50%)]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">

            <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-5 lg:mb-6">Rejoignez 1 200+ chatters dans 197 pays</p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-6 sm:mb-8">
              Commencez à gagner
              <br />
              <span className="text-amber-400">aujourd'hui</span>
            </h2>

            {/* Récap */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4 mb-8 sm:mb-10">
              {[
                '3 sources de revenus',
                'Équipe illimitée',
                '197 pays',
                '100% gratuit'
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/15 border border-amber-500/40 text-white rounded-full px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large" className="w-full max-w-sm sm:max-w-md mx-auto">
              Devenir Chatter maintenant
            </CTAButton>

            <p className="text-gray-500 mt-5 sm:mt-6 text-sm sm:text-base lg:text-lg">
              Inscription gratuite • Démarrez en 5 minutes
            </p>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="bg-black/95 backdrop-blur-md border-t border-amber-500/40 px-4 py-3">
              <button
                onClick={goToRegister}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold py-3.5 sm:py-4 rounded-xl min-h-[48px] sm:min-h-[52px] active:scale-[0.98] text-base sm:text-lg"
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

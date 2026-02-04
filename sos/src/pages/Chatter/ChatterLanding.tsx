/**
 * ChatterLanding - Landing Page Ultra-Optimisée Tunnel Facebook
 *
 * CORRECTIONS V3:
 * - Contraste amélioré (plus de ton sur ton)
 * - Tailles de texte augmentées
 * - Montant réaliste: 50$ à 5000$/mois
 * - 3 sources de revenus: clients + équipe + recrutement providers
 * - International: 197 pays, toutes nationalités, toutes langues
 * - Équipe ILLIMITÉE mise en avant
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
  Scale,
  Infinity,
  TrendingUp,
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
  @media (min-width: 768px) {
    .section-screen { padding: 3rem 2rem; }
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
}> = ({ onClick, children, size = 'normal' }) => (
  <button
    onClick={onClick}
    className={`
      w-full max-w-sm mx-auto flex items-center justify-center gap-3
      bg-gradient-to-r from-amber-400 to-yellow-400
      text-black font-extrabold rounded-2xl
      shadow-lg shadow-amber-500/30
      transition-all active:scale-[0.98] hover:shadow-xl hover:from-amber-300 hover:to-yellow-300
      ${size === 'large' ? 'min-h-[64px] px-8 py-5 text-xl' : 'min-h-[56px] px-6 py-4 text-lg'}
    `}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-6 h-6' : 'w-5 h-5'} />
  </button>
);

const ScrollHint: React.FC = () => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
    <ChevronDown className="w-7 h-7 text-white/40 animate-bounce" />
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
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Calcul revenus équipe (10 appels/mois/chatter en moyenne)
  const teamEarnings = teamSize * 10;

  return (
    <>
      <Helmet>
        <title>Devenir Chatter | Gagnez 50$ à 5000$/mois depuis votre téléphone</title>
        <meta name="description" content="Rejoignez 2800+ chatters dans 197 pays. 3 sources de revenus illimités. Toutes nationalités, toutes langues. 100% gratuit." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#991B1B" />
      </Helmet>

      <style>{globalStyles}</style>

      <div className="bg-black text-white">

        {/* ================================================================
            SECTION 1 - HERO
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-red-950 via-red-900 to-black relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,191,36,0.15),transparent_60%)]" />

          <div className="relative z-10 max-w-lg mx-auto text-center px-4">

            {/* Badge international */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-6 border border-white/20">
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">197 pays • Toutes nationalités</span>
            </div>

            {/* HEADLINE - Montant réaliste */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.05] mb-5">
              <span className="text-white">Gagnez</span>
              <br />
              <span className="text-amber-400">50$ à 5 000$</span>
              <br />
              <span className="text-white">/mois</span>
            </h1>

            {/* Sous-titre */}
            <p className="text-xl sm:text-2xl text-white font-medium mb-3">
              Depuis votre téléphone. En 15 min/jour.
            </p>
            <p className="text-base sm:text-lg text-gray-300 mb-8">
              Aidez les expatriés à trouver des avocats.
              <br />
              <span className="text-amber-400 font-bold">Sans investissement. Sans compétence.</span>
            </p>

            {/* 3 Stats clés */}
            <div className="flex justify-center gap-6 sm:gap-10 mb-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-amber-400">10$</div>
                <div className="text-sm text-gray-400">/ client</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white">197</div>
                <div className="text-sm text-gray-400">pays</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-green-400">∞</div>
                <div className="text-sm text-gray-400">revenus</div>
              </div>
            </div>

            <CTAButton onClick={goToRegister} size="large">
              Commencer gratuitement
            </CTAButton>

            {/* Trust */}
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Shield className="w-4 h-4 text-green-400" /> 100% Gratuit
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Zap className="w-4 h-4 text-amber-400" /> 5 min d'inscription
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <Globe className="w-4 h-4 text-blue-400" /> Toutes langues
              </span>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 2 - 3 SOURCES DE REVENUS
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-black to-gray-950">
          <div className="max-w-lg mx-auto px-4">

            <h2 className="text-3xl sm:text-4xl font-black text-center text-white mb-3">
              <span className="text-amber-400">3 façons</span> de gagner
            </h2>
            <p className="text-gray-400 text-center text-lg mb-8">
              Cumulez vos revenus. Sans limite.
            </p>

            <div className="space-y-4">

              {/* Source 1: Clients directs */}
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/40 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-black text-black">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Trouvez des clients</h3>
                    <p className="text-gray-300 text-base mb-2">
                      Partagez votre lien. Quand ils appellent un avocat via SOS-Expat :
                    </p>
                    <div className="text-2xl font-black text-amber-400">
                      = 10$ pour vous
                    </div>
                  </div>
                </div>
              </div>

              {/* Source 2: Équipe de chatters */}
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-black text-black">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Recrutez des chatters</h3>
                    <p className="text-gray-300 text-base mb-2">
                      Créez une équipe <span className="text-green-400 font-bold">ILLIMITÉE</span>. Sur chaque appel de vos recrues :
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="text-lg font-bold text-green-400">+1$ (niveau 1)</span>
                      <span className="text-lg font-bold text-cyan-400">+0,50$ (niveau 2)</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                      <Infinity className="w-4 h-4" /> À vie. Pas de limite de taille d'équipe.
                    </p>
                  </div>
                </div>
              </div>

              {/* Source 3: Recrutement providers */}
              <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/10 border border-purple-500/40 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-black text-white">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">Recrutez des avocats & experts</h3>
                    <p className="text-gray-300 text-base mb-2">
                      Trouvez des avocats ou expatriés aidants pour rejoindre SOS-Expat :
                    </p>
                    <div className="text-2xl font-black text-purple-400">
                      = 5$ par appel × 6 mois
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      ~660$ par avocat recruté !
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Récap */}
            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Les top chatters combinent les 3 sources</p>
              <p className="text-2xl font-black text-white">
                = <span className="text-amber-400">2 000$ à 5 000$/mois</span>
              </p>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 3 - PREUVE SOCIALE
        ================================================================ */}
        <section className="section-screen bg-gray-950">
          <div className="max-w-lg mx-auto px-4">

            <h2 className="text-3xl sm:text-4xl font-black text-center text-white mb-2">
              Ils gagnent <span className="text-green-400">vraiment</span>
            </h2>
            <p className="text-gray-400 text-center text-lg mb-6">
              Chatters vérifiés ce mois
            </p>

            <div className="space-y-3">

              {/* Témoignage 1 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center text-xl">👨🏿</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        Amadou D. <span>🇸🇳</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-sm text-gray-500">3 mois d'ancienneté</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-400">430$</div>
                    <div className="text-xs text-gray-500">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-300">
                  "45 min/jour dans les groupes Facebook. 43 clients ce mois."
                </p>
              </div>

              {/* Témoignage 2 - TOP */}
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-2 border-amber-500/50 rounded-xl p-4 relative">
                <div className="absolute -top-2.5 right-3 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  TOP EARNER
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-pink-600 rounded-full flex items-center justify-center text-xl">👩🏼</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        Marie L. <span>🇫🇷</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-sm text-gray-500">6 mois • Équipe de 23</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-400">3 200$</div>
                    <div className="text-xs text-gray-500">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-200">
                  "420$ clients + 1 580$ équipe + 1 200$ avocats recrutés. Les 3 sources combinées !"
                </p>
              </div>

              {/* Témoignage 3 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center text-xl">👨🏾</div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        Kofi A. <span>🇬🇭</span>
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-sm text-gray-500">2 mois d'ancienneté</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-400">280$</div>
                    <div className="text-xs text-gray-500">ce mois</div>
                  </div>
                </div>
                <p className="text-gray-300">
                  "Payé via MTN MoMo en 24h. Je cible les Ghanéens aux Émirats."
                </p>
              </div>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <div className="text-xl font-black text-white">2 800+</div>
                <div className="text-xs text-gray-500">Chatters actifs</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <div className="text-xl font-black text-amber-400">156K$</div>
                <div className="text-xs text-gray-500">Payés ce mois</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                <div className="text-xl font-black text-white">197</div>
                <div className="text-xs text-gray-500">Pays</div>
              </div>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 4 - ÉQUIPE ILLIMITÉE
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-950 via-green-950/30 to-gray-950">
          <div className="max-w-lg mx-auto px-4">

            <div className="flex items-center justify-center gap-2 mb-4">
              <Infinity className="w-6 h-6 text-green-400" />
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-bold">
                Équipe ILLIMITÉE
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-center text-white mb-3">
              Créez votre empire
            </h2>
            <p className="text-gray-400 text-center text-lg mb-6">
              Pas de limite. Recrutez autant que vous voulez.
            </p>

            {/* Schéma simplifié */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-black text-black">VOUS</span>
                  </div>
                  <div>
                    <div className="text-gray-400">Vos clients directs</div>
                    <div className="text-xl font-bold text-amber-400">10$ / appel</div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-green-500/50 ml-7 h-4" />

                <div className="flex items-center gap-4 ml-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-400">Vos recrues (N1) — <span className="text-green-400">illimité</span></div>
                    <div className="text-xl font-bold text-green-400">+1$ / appel</div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-cyan-500/50 ml-7 h-4" />

                <div className="flex items-center gap-4 ml-8">
                  <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-400">Leurs recrues (N2) — <span className="text-cyan-400">illimité</span></div>
                    <div className="text-xl font-bold text-cyan-400">+0,50$ / appel</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculateur */}
            <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/40 rounded-2xl p-5">
              <label className="text-base text-gray-300 block mb-3 text-center">
                Avec <span className="text-green-400 font-bold text-xl">{teamSize}</span> chatters dans votre équipe :
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer mb-4
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
                  [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Revenus passifs mensuels estimés</p>
                <p className="text-5xl font-black text-green-400">
                  +{teamEarnings}$
                </p>
                <p className="text-sm text-gray-500 mt-1">En plus de vos clients directs</p>
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              <span className="text-green-400 font-semibold">À vie.</span> Tant qu'ils sont actifs, vous gagnez.
            </p>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 5 - INTERNATIONAL + ZÉRO RISQUE
        ================================================================ */}
        <section className="section-screen bg-gray-950">
          <div className="max-w-lg mx-auto px-4">

            <h2 className="text-3xl sm:text-4xl font-black text-center text-white mb-6">
              Zéro risque. <span className="text-green-400">Zéro limite.</span>
            </h2>

            <div className="space-y-3 mb-6">
              {[
                { emoji: '🌍', title: '197 pays', desc: 'Toutes nationalités acceptées', color: 'text-blue-400' },
                { emoji: '🗣️', title: 'Toutes langues', desc: 'Travaillez dans votre langue', color: 'text-purple-400' },
                { emoji: '💸', title: '100% Gratuit', desc: 'Aucun frais, jamais', color: 'text-green-400' },
                { emoji: '📱', title: 'Juste un téléphone', desc: 'Pas d\'ordinateur requis', color: 'text-amber-400' },
                { emoji: '⏰', title: 'Aucun engagement', desc: 'Arrêtez quand vous voulez', color: 'text-red-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <span className="text-3xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className={`font-bold text-lg ${item.color}`}>{item.title}</div>
                    <div className="text-gray-400">{item.desc}</div>
                  </div>
                  <Check className="w-6 h-6 text-green-400 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Paiements */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-gray-400 mb-3">Retrait dès 25$ • Reçu en 48h</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['🌐 Wise', '🟠 Orange Money', '🌊 Wave', '💚 M-Pesa', '🏦 Virement'].map((m, i) => (
                  <span key={i} className="bg-white/10 text-white rounded-full px-4 py-2 text-sm font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 6 - CTA FINAL
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-950 via-red-950/30 to-black relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.08),transparent_60%)]" />

          <div className="relative z-10 max-w-lg mx-auto text-center px-4">

            <p className="text-gray-400 text-lg mb-3">Rejoignez +2 800 chatters dans 197 pays</p>

            <h2 className="text-4xl sm:text-5xl font-black text-white mb-5">
              Commencez à gagner
              <br />
              <span className="text-amber-400">aujourd'hui</span>
            </h2>

            {/* Récap */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {[
                '3 sources de revenus',
                'Équipe illimitée',
                '197 pays',
                '100% gratuit'
              ].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-white rounded-full px-4 py-2 text-sm font-medium">
                  <Check className="w-4 h-4 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>

            <CTAButton onClick={goToRegister} size="large">
              Devenir Chatter maintenant
            </CTAButton>

            <p className="text-gray-500 mt-4">
              Inscription gratuite • Démarrez en 5 minutes
            </p>

            {/* Urgence */}
            <div className="mt-8 bg-red-500/15 border border-red-500/40 rounded-xl p-4">
              <p className="text-lg text-red-400 font-bold">
                ⚡ Bonus early adopter : +50% sur commissions équipe
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Limité aux 50 premiers inscrits ce mois
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            STICKY CTA MOBILE
        ================================================================ */}
        {showStickyCTA && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
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

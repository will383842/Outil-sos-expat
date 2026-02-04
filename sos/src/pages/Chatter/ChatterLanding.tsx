/**
 * ChatterLandingV2 - Landing Page Ultra-Optimisée Tunnel Facebook
 *
 * PRINCIPES CLÉS:
 * - Chaque section = 1 écran mobile PARFAIT (100svh)
 * - Message compris en 3 SECONDES max
 * - Mobile-first (95%+ du trafic Facebook)
 * - Zero distraction, zero animation superflue
 * - UN SEUL OBJECTIF: INSCRIPTION
 *
 * STRUCTURE:
 * 1. Hero - Accroche choc
 * 2. Comment ça marche - 3 étapes
 * 3. Preuve sociale - Témoignages
 * 4. Multiplicateur - Revenus équipe
 * 5. Zéro risque - Rassurance
 * 6. CTA Final
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet-async';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import {
  ArrowRight,
  ArrowDown,
  Check,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Play,
  MessageCircle,
  Banknote,
  Phone,
} from 'lucide-react';

// ============================================================================
// STYLES GLOBAUX (injectés une seule fois)
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
    .animate-bounce, .animate-pulse { animation: none !important; }
  }
`;

// ============================================================================
// COMPOSANTS UI
// ============================================================================

// CTA Button - Touch optimisé (56px min)
const CTAButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  size?: 'normal' | 'large';
}> = ({ onClick, children, size = 'normal' }) => (
  <button
    onClick={onClick}
    className={`
      w-full max-w-sm mx-auto flex items-center justify-center gap-3
      bg-gradient-to-r from-amber-400 to-yellow-500
      text-gray-900 font-bold rounded-2xl
      shadow-lg shadow-amber-500/25
      transition-all active:scale-[0.98] hover:shadow-xl
      ${size === 'large' ? 'min-h-[64px] px-10 py-5 text-xl' : 'min-h-[56px] px-8 py-4 text-lg'}
    `}
  >
    {children}
    <ArrowRight className={size === 'large' ? 'w-6 h-6' : 'w-5 h-5'} />
  </button>
);

// Scroll Indicator
const ScrollHint: React.FC = () => (
  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50">
    <ChevronDown className="w-6 h-6 animate-bounce" />
  </div>
);

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

const ChatterLandingV2: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'fr') as 'fr' | 'en';

  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [teamSize, setTeamSize] = useState(5);

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;
  const goToRegister = () => navigate(registerRoute);

  // Sticky CTA après premier écran
  useEffect(() => {
    const onScroll = () => setShowStickyCTA(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Calcul revenus équipe
  const teamEarnings = teamSize * 10;

  return (
    <>
      <Helmet>
        <title>Devenir Chatter | Gagnez 300€/mois en 15 min/jour</title>
        <meta name="description" content="Rejoignez 2800+ chatters qui gagnent de l'argent en aidant les expatriés. 10€ par client, équipe illimitée, 100% gratuit." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#B91C1C" />
      </Helmet>

      <style>{globalStyles}</style>

      <div className="bg-gray-950 text-white">

        {/* ================================================================
            SECTION 1 - HERO
            Message: "Gagnez de l'argent en aidant les expatriés"
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-red-900 via-red-800 to-gray-950 relative overflow-hidden">
          {/* Glow subtil */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-md mx-auto text-center px-2">

            {/* Social proof compact */}
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
              <div className="flex -space-x-1 text-sm">
                <span>🇫🇷</span><span>🇸🇳</span><span>🇨🇮</span><span>🇲🇦</span><span>🇨🇲</span>
              </div>
              <span className="text-sm font-medium">+2 800 chatters actifs</span>
            </div>

            {/* HEADLINE PRINCIPALE */}
            <h1 className="text-[2.5rem] sm:text-5xl md:text-6xl font-black leading-[1.1] mb-4">
              Gagnez{' '}
              <span className="text-amber-400">300€/mois</span>
              <br />
              en <span className="text-amber-400">15 min</span>/jour
            </h1>

            {/* Sous-titre explicatif CLAIR */}
            <p className="text-lg sm:text-xl text-white/80 mb-3">
              Aidez les expatriés à trouver un avocat.
            </p>
            <p className="text-base text-white/60 mb-8">
              <span className="text-amber-400 font-semibold">10€</span> à chaque appel.
              Depuis votre téléphone. Sans investissement.
            </p>

            {/* Mini stats */}
            <div className="flex justify-center gap-4 sm:gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-amber-400">10€</div>
                <div className="text-xs text-white/50">/ appel</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white">0€</div>
                <div className="text-xs text-white/50">à investir</div>
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-green-400">∞</div>
                <div className="text-xs text-white/50">potentiel</div>
              </div>
            </div>

            {/* CTA Principal */}
            <CTAButton onClick={goToRegister} size="large">
              Je commence maintenant
            </CTAButton>

            {/* Trust */}
            <div className="flex justify-center gap-4 mt-5 text-sm text-white/60">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-400" /> 100% gratuit
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-400" /> 5 min d'inscription
              </span>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 2 - COMMENT ÇA MARCHE
            3 étapes ultra-simples
        ================================================================ */}
        <section className="section-screen bg-gray-900">
          <div className="max-w-md mx-auto px-2">

            <h2 className="text-3xl sm:text-4xl font-black text-center mb-2">
              C'est <span className="text-amber-400">ultra simple</span>
            </h2>
            <p className="text-white/50 text-center mb-8">
              Pas besoin de compétence. Pas besoin d'expérience.
            </p>

            {/* Les 3 étapes */}
            <div className="space-y-4">

              {/* Étape 1 */}
              <div className="flex gap-4 bg-white/5 rounded-2xl p-4">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">1</span>
                    <h3 className="font-bold">Trouvez des expatriés</h3>
                  </div>
                  <p className="text-sm text-white/60">
                    Sur Facebook, WhatsApp... Des gens qui ont besoin d'aide juridique à l'étranger. Il y en a des millions.
                  </p>
                </div>
              </div>

              {/* Flèche */}
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-white/30" />
              </div>

              {/* Étape 2 */}
              <div className="flex gap-4 bg-white/5 rounded-2xl p-4">
                <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Play className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">2</span>
                    <h3 className="font-bold">Partagez votre lien</h3>
                  </div>
                  <p className="text-sm text-white/60">
                    Envoyez-leur votre lien SOS-Expat. Un simple copier-coller, c'est tout.
                  </p>
                </div>
              </div>

              {/* Flèche */}
              <div className="flex justify-center">
                <ChevronDown className="w-5 h-5 text-white/30" />
              </div>

              {/* Étape 3 */}
              <div className="flex gap-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-2xl p-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Banknote className="w-7 h-7 text-gray-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500 text-gray-900 text-xs font-bold px-2 py-0.5 rounded">3</span>
                    <h3 className="font-bold text-amber-400">Vous êtes payé 10€</h3>
                  </div>
                  <p className="text-sm text-white/70">
                    Dès qu'ils appellent un avocat via votre lien. Automatique. Pas de limite.
                  </p>
                </div>
              </div>
            </div>

            {/* Exemple concret */}
            <div className="mt-6 bg-white/5 rounded-2xl p-4 text-center">
              <p className="text-white/60 text-sm mb-1">Exemple: 1 personne aidée par jour</p>
              <p className="text-xl font-bold">
                30 personnes = <span className="text-amber-400">300€/mois</span>
              </p>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 3 - PREUVE SOCIALE
            Témoignages réels
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="max-w-md mx-auto px-2">

            <h2 className="text-3xl sm:text-4xl font-black text-center mb-2">
              Ils <span className="text-green-400">gagnent vraiment</span>
            </h2>
            <p className="text-white/50 text-center mb-6">
              Chatters vérifiés ce mois-ci
            </p>

            {/* Témoignages */}
            <div className="space-y-3">

              {/* Témoignage 1 */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg">👨🏿</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1">
                        Amadou D. <span className="text-xs">🇸🇳</span>
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-xs text-white/40">Chatter depuis 3 mois</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400">430€</div>
                    <div className="text-xs text-white/40">ce mois</div>
                  </div>
                </div>
                <p className="text-sm text-white/60">
                  "45 min/jour dans les groupes Facebook. 43 clients ce mois."
                </p>
              </div>

              {/* Témoignage 2 - TOP */}
              <div className="bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-500/40 rounded-xl p-4 relative">
                <div className="absolute -top-2 right-3 bg-amber-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  TOP EARNER
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-lg">👩🏼</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1">
                        Marie L. <span className="text-xs">🇫🇷</span>
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-xs text-white/40">Chatter depuis 6 mois</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400">1 200€</div>
                    <div className="text-xs text-white/40">ce mois</div>
                  </div>
                </div>
                <p className="text-sm text-white/70">
                  "18 chatters dans mon équipe. 320€ directs + 880€ de commissions équipe."
                </p>
              </div>

              {/* Témoignage 3 */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg">👨🏾</div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1">
                        Kofi A. <span className="text-xs">🇬🇭</span>
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="text-xs text-white/40">Chatter depuis 2 mois</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-amber-400">280€</div>
                    <div className="text-xs text-white/40">ce mois</div>
                  </div>
                </div>
                <p className="text-sm text-white/60">
                  "Reçu via MTN MoMo en 24h. Je cible les Ghanéens aux Émirats."
                </p>
              </div>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-lg font-black">2 800+</div>
                <div className="text-[10px] text-white/40">Chatters</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-lg font-black text-amber-400">156K€</div>
                <div className="text-[10px] text-white/40">Payés ce mois</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-lg font-black">47</div>
                <div className="text-[10px] text-white/40">Pays</div>
              </div>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 4 - REVENUS ÉQUIPE
            Le multiplicateur de revenus
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-orange-950/50 via-red-950/50 to-gray-950">
          <div className="max-w-md mx-auto px-2">

            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 rounded-full px-3 py-1.5 text-sm font-semibold mb-4 mx-auto block w-fit">
              <Users className="w-4 h-4" />
              Revenus passifs
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-center mb-2">
              Multipliez vos gains
            </h2>
            <p className="text-white/60 text-center mb-6">
              Recrutez d'autres chatters. Gagnez sur leurs ventes. <span className="text-orange-400 font-bold">À vie.</span>
            </p>

            {/* Explication simplifiée */}
            <div className="bg-white/5 rounded-2xl p-5 mb-5">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center font-bold text-gray-900 text-sm flex-shrink-0">
                    VOUS
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/50">Vos propres clients</div>
                    <div className="font-bold text-amber-400">10€ / appel</div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-white/20 ml-6 h-3" />

                <div className="flex items-center gap-4 ml-3">
                  <div className="w-10 h-10 bg-green-600/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/50">Vos recrues directes</div>
                    <div className="font-bold text-green-400">+1€ par appel qu'ils font</div>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-white/20 ml-6 h-3" />

                <div className="flex items-center gap-4 ml-6">
                  <div className="w-8 h-8 bg-cyan-600/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/50">Leurs recrues</div>
                    <div className="font-bold text-cyan-400">+0,50€ par appel</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculateur équipe */}
            <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 rounded-2xl p-5">
              <label className="text-sm text-white/70 block mb-3 text-center">
                Si vous recrutez <span className="text-orange-400 font-bold">{teamSize}</span> chatters :
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer mb-4
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                  [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
              />
              <div className="text-center">
                <p className="text-xs text-white/50 mb-1">Revenus passifs estimés</p>
                <p className="text-4xl font-black text-orange-400">
                  +{teamEarnings}€<span className="text-base text-white/40">/mois</span>
                </p>
                <p className="text-xs text-white/40 mt-1">En plus de vos gains directs</p>
              </div>
            </div>

            <p className="text-center text-sm text-white/50 mt-4">
              <span className="text-orange-400">Aucune limite</span> sur la taille de votre équipe.
            </p>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 5 - ZÉRO RISQUE
            Rassurance finale
        ================================================================ */}
        <section className="section-screen bg-gray-900">
          <div className="max-w-md mx-auto px-2">

            <h2 className="text-3xl sm:text-4xl font-black text-center mb-6">
              Zéro risque.{' '}
              <span className="text-green-400">Zéro excuse.</span>
            </h2>

            {/* Points rassurants */}
            <div className="space-y-3 mb-6">
              {[
                { emoji: '💸', title: '100% Gratuit', desc: 'Pas de frais. Jamais. Promis.' },
                { emoji: '🎯', title: 'Pas de quota minimum', desc: '1 client = 10€. Point final.' },
                { emoji: '⏰', title: 'Aucun engagement', desc: 'Arrêtez quand vous voulez.' },
                { emoji: '📱', title: 'Juste votre téléphone', desc: 'Travaillez d\'où vous voulez.' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{item.title}</div>
                    <div className="text-sm text-white/50">{item.desc}</div>
                  </div>
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Paiements */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-sm text-white/60 mb-3">Retrait dès 25€ • Reçu en 48h</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['🌐 Wise', '🟠 Orange Money', '🌊 Wave', '💚 M-Pesa', '🏦 Virement'].map((m, i) => (
                  <span key={i} className="bg-white/5 rounded-full px-3 py-1.5 text-xs font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <ScrollHint />
        </section>

        {/* ================================================================
            SECTION 6 - CTA FINAL
            Dernière chance de convertir
        ================================================================ */}
        <section className="section-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black relative">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px]" />

          <div className="relative z-10 max-w-md mx-auto text-center px-2">

            <p className="text-white/50 mb-2">Rejoignez +2 800 chatters</p>

            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Commencez à gagner
              <br />
              <span className="text-amber-400">aujourd'hui</span>
            </h2>

            {/* Récap */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['10€/appel', 'Équipe illimitée', '100% gratuit', 'Paiement mondial'].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5 text-sm">
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>

            {/* CTA */}
            <CTAButton onClick={goToRegister} size="large">
              Devenir Chatter maintenant
            </CTAButton>

            <p className="text-white/40 text-sm mt-4">
              Inscription gratuite • Démarrez en 5 minutes
            </p>

            {/* Urgence */}
            <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-red-400 font-semibold">
                ⚡ Bonus early adopter : +50% sur commissions équipe
              </p>
              <p className="text-xs text-white/40 mt-1">
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
            <div className="bg-gray-950/95 backdrop-blur-md border-t border-amber-500/30 px-4 py-3">
              <button
                onClick={goToRegister}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 font-bold py-4 rounded-xl min-h-[52px] active:scale-[0.98]"
              >
                Commencer maintenant
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default ChatterLandingV2;

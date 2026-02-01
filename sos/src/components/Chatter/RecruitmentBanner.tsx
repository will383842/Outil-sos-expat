/**
 * RecruitmentBanner Component
 *
 * A prominent, highly visible CTA banner to maximize chatter recruitment.
 * Features animated elements, earnings calculator, and social proof.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  Users,
  DollarSign,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  Coins,
  Link as LinkIcon,
  Sparkles,
  Info,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface RecruitmentBannerProps {
  /** User's recruitment referral link */
  referralLink?: string;
  /** User's recruitment code */
  referralCode?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Callback when user clicks "Learn How It Works" */
  onLearnMore?: () => void;
  /** Callback when link is copied */
  onCopyLink?: () => void;
  /** Whether to show as sticky on mobile */
  stickyOnMobile?: boolean;
  /** Custom class names */
  className?: string;
  /** Initial expanded state */
  defaultExpanded?: boolean;
}

interface BannerStats {
  chattersJoinedThisWeek: number;
  topRecruiterEarnings: number;
  activeChattersGlobally: number;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations = {
  en: {
    headline: "Recruit Chatters, Earn Forever",
    valueProps: {
      commission: "Earn 5% of your team's earnings FOREVER",
      noLimit: "No limit on team size",
      passive: "Passive income while you sleep"
    },
    socialProof: {
      topRecruiter: "Top recruiter earned ${amount} this month from team",
      activeChatters: "{count} active chatters globally",
      joinedThisWeek: "{count} chatters joined this week",
      testimonial: '"I built a team of 50 chatters and now earn $2,000+ monthly without lifting a finger!" - Sarah M.'
    },
    calculator: {
      title: "Calculate Your Potential",
      teamSize: "Team size",
      members: "members",
      avgEarnings: "Avg. earnings/member",
      perMonth: "/month",
      yourPassiveIncome: "Your passive income (5%)",
      disclaimer: "Based on average team member earnings of $500/month"
    },
    cta: {
      primary: "Get My Recruitment Link",
      secondary: "Learn How It Works",
      copyLink: "Copy Link",
      copied: "Copied!",
      expand: "Show calculator",
      collapse: "Hide calculator"
    },
    dismiss: "Dismiss"
  },
  fr: {
    headline: "Recrutez des Chatters, Gagnez a Vie",
    valueProps: {
      commission: "Gagnez 5% des gains de votre equipe A VIE",
      noLimit: "Pas de limite sur la taille de l'equipe",
      passive: "Revenu passif pendant votre sommeil"
    },
    socialProof: {
      topRecruiter: "Le meilleur recruteur a gagne {amount}$ ce mois",
      activeChatters: "{count} chatters actifs dans le monde",
      joinedThisWeek: "{count} chatters inscrits cette semaine",
      testimonial: '"J\'ai construit une equipe de 50 chatters et je gagne 2000$+ par mois sans rien faire !" - Sophie M.'
    },
    calculator: {
      title: "Calculez Votre Potentiel",
      teamSize: "Taille de l'equipe",
      members: "membres",
      avgEarnings: "Gains moyens/membre",
      perMonth: "/mois",
      yourPassiveIncome: "Votre revenu passif (5%)",
      disclaimer: "Base sur des gains moyens de 500$/mois par membre"
    },
    cta: {
      primary: "Obtenir Mon Lien de Recrutement",
      secondary: "Comment ca Marche",
      copyLink: "Copier le Lien",
      copied: "Copie !",
      expand: "Voir le calculateur",
      collapse: "Masquer le calculateur"
    },
    dismiss: "Fermer"
  },
  es: {
    headline: "Recluta Chatters, Gana Para Siempre",
    valueProps: {
      commission: "Gana 5% de las ganancias de tu equipo PARA SIEMPRE",
      noLimit: "Sin limite en el tamano del equipo",
      passive: "Ingresos pasivos mientras duermes"
    },
    socialProof: {
      topRecruiter: "El mejor reclutador gano ${amount} este mes",
      activeChatters: "{count} chatters activos globalmente",
      joinedThisWeek: "{count} chatters se unieron esta semana",
      testimonial: '"Construi un equipo de 50 chatters y ahora gano $2000+ mensuales sin hacer nada!" - Maria M.'
    },
    calculator: {
      title: "Calcula Tu Potencial",
      teamSize: "Tamano del equipo",
      members: "miembros",
      avgEarnings: "Ganancias prom./miembro",
      perMonth: "/mes",
      yourPassiveIncome: "Tu ingreso pasivo (5%)",
      disclaimer: "Basado en ganancias promedio de $500/mes por miembro"
    },
    cta: {
      primary: "Obtener Mi Link de Reclutamiento",
      secondary: "Como Funciona",
      copyLink: "Copiar Link",
      copied: "Copiado!",
      expand: "Ver calculadora",
      collapse: "Ocultar calculadora"
    },
    dismiss: "Cerrar"
  }
};

// ============================================================================
// ANIMATED COIN COMPONENT
// ============================================================================

const AnimatedCoin: React.FC<{ delay: number; size?: 'sm' | 'md' | 'lg' }> = ({
  delay,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div
      className={cn(
        "absolute text-yellow-400 opacity-60 animate-float pointer-events-none",
        sizeClasses[size]
      )}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 2}s`
      }}
    >
      <Coins className="w-full h-full drop-shadow-lg" />
    </div>
  );
};

// ============================================================================
// PULSING BUTTON COMPONENT
// ============================================================================

const PulsingButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  icon?: React.ReactNode;
}> = ({ onClick, children, variant = 'primary', className, icon }) => {
  const baseClasses = "relative font-bold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95";

  const variantClasses = {
    primary: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-gray-900 shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40",
    secondary: "bg-white/20 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/30"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        variant === 'primary' && "animate-pulse-subtle",
        "px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base",
        className
      )}
    >
      <span className="flex items-center justify-center gap-2">
        {icon}
        {children}
      </span>
      {variant === 'primary' && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 animate-ping-slow opacity-20" />
      )}
    </button>
  );
};

// ============================================================================
// COUNTER BADGE COMPONENT
// ============================================================================

const CounterBadge: React.FC<{
  count: number;
  label: string;
  icon?: React.ReactNode;
}> = ({ count, label, icon }) => {
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = count / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= count) {
        setDisplayCount(count);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [count]);

  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
      {icon && <span className="text-yellow-400">{icon}</span>}
      <span className="font-bold text-white text-sm sm:text-base">{displayCount.toLocaleString()}</span>
      <span className="text-white/80 text-xs sm:text-sm">{label}</span>
    </div>
  );
};

// ============================================================================
// EARNINGS CALCULATOR COMPONENT
// ============================================================================

const EarningsCalculator: React.FC<{
  t: typeof translations.en.calculator;
}> = ({ t }) => {
  const [teamSize, setTeamSize] = useState(10);
  const avgEarningsPerMember = 500; // $500/month average

  const passiveIncome = useMemo(() => {
    return (teamSize * avgEarningsPerMember * 0.05);
  }, [teamSize]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
      <h4 className="text-white font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        {t.title}
      </h4>

      <div className="space-y-4">
        {/* Team Size Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-white/80 text-sm">{t.teamSize}</label>
            <span className="text-yellow-400 font-bold">{teamSize} {t.members}</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb-yellow"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>1</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Average Earnings Display */}
        <div className="flex justify-between items-center text-white/80 text-sm">
          <span>{t.avgEarnings}</span>
          <span className="text-white font-medium">${avgEarningsPerMember}{t.perMonth}</span>
        </div>

        {/* Result */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30">
          <div className="text-white/80 text-sm mb-1">{t.yourPassiveIncome}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-yellow-400">
              ${passiveIncome.toLocaleString()}
            </span>
            <span className="text-white/60 text-sm">{t.perMonth}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-white/50 text-xs flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RecruitmentBanner: React.FC<RecruitmentBannerProps> = ({
  referralLink,
  referralCode,
  dismissible = true,
  onLearnMore,
  onCopyLink,
  stickyOnMobile = false,
  className,
  defaultExpanded = false,
}) => {
  const intl = useIntl();
  const locale = intl.locale.split('-')[0] as 'en' | 'fr' | 'es';
  const t = translations[locale] || translations.en;

  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [stats] = useState<BannerStats>({
    chattersJoinedThisWeek: 247,
    topRecruiterEarnings: 3847,
    activeChattersGlobally: 12453
  });

  // Check localStorage for dismissal (24h expiry)
  useEffect(() => {
    const dismissedAt = localStorage.getItem('recruitment_banner_dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < twentyFourHours) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem('recruitment_banner_dismissed');
      }
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem('recruitment_banner_dismissed', Date.now().toString());
  }, []);

  const handleCopyLink = useCallback(async () => {
    const linkToCopy = referralLink || `https://sos-expat.com/devenir-chatter?ref=${referralCode || 'DEMO'}`;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      onCopyLink?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [referralLink, referralCode, onCopyLink]);

  const handleGetLink = useCallback(() => {
    // If no link provided, this could navigate to registration
    if (!referralLink && !referralCode) {
      window.location.href = '/devenir-chatter';
    } else {
      handleCopyLink();
    }
  }, [referralLink, referralCode, handleCopyLink]);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        stickyOnMobile && "lg:relative fixed bottom-0 left-0 right-0 z-50 lg:z-auto",
        className
      )}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-pink-500/20 to-orange-500/30 animate-gradient-x" />

        {/* Floating coins animation */}
        {[...Array(8)].map((_, i) => (
          <AnimatedCoin key={i} delay={i * 0.5} size={i % 3 === 0 ? 'lg' : i % 2 === 0 ? 'md' : 'sm'} />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="max-w-6xl mx-auto">

          {/* Dismiss Button */}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              aria-label={t.dismiss}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Top Section: Counter Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6">
            <CounterBadge
              count={stats.chattersJoinedThisWeek}
              label={t.socialProof.joinedThisWeek.replace('{count}', '')}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <CounterBadge
              count={stats.activeChattersGlobally}
              label={t.socialProof.activeChatters.replace('{count}', '')}
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          {/* Main Headline */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-center text-white mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              {t.headline}
            </span>
          </h2>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
              <DollarSign className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-white text-sm sm:text-base font-medium">{t.valueProps.commission}</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
              <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-white text-sm sm:text-base font-medium">{t.valueProps.noLimit}</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
              <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <span className="text-white text-sm sm:text-base font-medium">{t.valueProps.passive}</span>
            </div>
          </div>

          {/* Social Proof: Top Recruiter */}
          <div className="text-center mb-6">
            <p className="text-yellow-400 font-semibold text-sm sm:text-base">
              {t.socialProof.topRecruiter.replace('{amount}', stats.topRecruiterEarnings.toLocaleString())}
            </p>
          </div>

          {/* Testimonial */}
          <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
            <blockquote className="text-center text-white/80 italic text-sm sm:text-base">
              {t.socialProof.testimonial}
            </blockquote>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
            <PulsingButton
              onClick={handleGetLink}
              variant="primary"
              icon={copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            >
              {referralLink || referralCode
                ? (copied ? t.cta.copied : t.cta.copyLink)
                : t.cta.primary
              }
            </PulsingButton>

            <PulsingButton
              onClick={() => onLearnMore?.() || window.location.assign('/devenir-chatter')}
              variant="secondary"
              icon={<Info className="w-5 h-5" />}
            >
              {t.cta.secondary}
            </PulsingButton>
          </div>

          {/* Referral Link Display (if provided) */}
          {(referralLink || referralCode) && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex-1 max-w-md bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <code className="text-white/90 text-sm truncate block">
                  {referralLink || `sos-expat.com/devenir-chatter?ref=${referralCode}`}
                </code>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Expand/Collapse Calculator */}
          <div className="text-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t.cta.collapse}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t.cta.expand}
                </>
              )}
            </button>
          </div>

          {/* Calculator Section (Expandable) */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              isExpanded ? "max-h-[500px] opacity-100 mt-6" : "max-h-0 opacity-0"
            )}
          >
            <div className="max-w-md mx-auto">
              <EarningsCalculator t={t.calculator} />
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.3;
          }
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }

        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }

        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.2;
          }
          75%, 100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* Custom slider thumb */
        .slider-thumb-yellow::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(251, 191, 36, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .slider-thumb-yellow::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.5);
        }

        .slider-thumb-yellow::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(251, 191, 36, 0.4);
        }
      `}</style>
    </div>
  );
};

export default RecruitmentBanner;

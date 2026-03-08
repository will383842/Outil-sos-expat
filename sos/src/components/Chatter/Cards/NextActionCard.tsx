/**
 * NextActionCard - Conditional CTA card based on chatter profile
 * Shows the single most important next action for active chatters
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Copy, Users, Send, Trophy, TrendingUp, Sparkles, Share2 } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI } from '@/components/Chatter/designTokens';

interface NextActionCardProps {
  onCopyLink: () => void;
  onShareLink: () => void;
  onNavigateToRecruit?: () => void;
  onNavigateToTelegram?: () => void;
  className?: string;
}

const NextActionCard: React.FC<NextActionCardProps> = ({
  onCopyLink,
  onShareLink,
  onNavigateToRecruit,
  onNavigateToTelegram,
  className = '',
}) => {
  const { dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;

  const action = useMemo(() => {
    if (!chatter) return null;

    const totalClients = chatter.totalClients || 0;
    const totalRecruits = chatter.totalRecruits || 0;
    const qualifiedReferrals = chatter.qualifiedReferralsCount || 0;
    const telegramLinked = chatter.telegramOnboardingCompleted === true;
    const level = chatter.level || 1;
    const totalEarned = (chatter.totalEarned || 0) / 100;
    const isCaptain = chatter.role === 'captainChatter';

    // Priority cascade
    if (totalClients === 0) {
      return {
        icon: <Share2 className="w-5 h-5" />,
        title: 'Partagez votre lien client',
        subtitle: 'pour gagner $5-10 par appel !',
        ctaLabel: 'Copier mon lien',
        ctaAction: onCopyLink,
        borderColor: 'border-l-green-500',
        iconColor: 'text-green-500',
      };
    }

    if (totalRecruits === 0) {
      return {
        icon: <Users className="w-5 h-5" />,
        title: 'Recrutez votre premier affilie',
        subtitle: 'et gagnez $1 a chaque appel qu\'il genere !',
        ctaLabel: 'Inviter quelqu\'un',
        ctaAction: onNavigateToRecruit || onShareLink,
        borderColor: 'border-l-blue-500',
        iconColor: 'text-blue-500',
      };
    }

    if (qualifiedReferrals < 5) {
      const remaining = 5 - qualifiedReferrals;
      return {
        icon: <Users className="w-5 h-5" />,
        title: `Plus que ${remaining} filleul${remaining > 1 ? 's' : ''} qualifie${remaining > 1 ? 's' : ''}`,
        subtitle: 'pour debloquer $15 de bonus !',
        ctaLabel: 'Recruter plus',
        ctaAction: onNavigateToRecruit || onShareLink,
        borderColor: 'border-l-blue-500',
        iconColor: 'text-blue-500',
      };
    }

    if (!telegramLinked) {
      return {
        icon: <Send className="w-5 h-5" />,
        title: 'Liez Telegram',
        subtitle: 'et debloquez $50 de bonus !',
        ctaLabel: 'Lier maintenant',
        ctaAction: onNavigateToTelegram || onShareLink,
        borderColor: 'border-l-indigo-500',
        iconColor: 'text-indigo-500',
      };
    }

    // Level progression
    const levelThresholds: Record<number, { target: number; name: string; bonus: string }> = {
      1: { target: 100, name: 'Intermediaire', bonus: '+10%' },
      2: { target: 500, name: 'Avance', bonus: '+20%' },
      3: { target: 2000, name: 'Expert', bonus: '+35%' },
      4: { target: 5000, name: 'Elite', bonus: '+50%' },
    };

    const nextLevel = levelThresholds[level];
    if (nextLevel && totalEarned < nextLevel.target) {
      const remaining = (nextLevel.target - totalEarned).toFixed(0);
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        title: `Encore $${remaining} pour ${nextLevel.name}`,
        subtitle: `Debloquez ${nextLevel.bonus} de bonus sur vos commissions !`,
        ctaLabel: 'Partager pour gagner',
        ctaAction: onShareLink,
        borderColor: 'border-l-violet-500',
        iconColor: 'text-violet-500',
      };
    }

    // Captain tier progression
    if (isCaptain && chatter.captainCurrentTier) {
      return {
        icon: <Trophy className="w-5 h-5" />,
        title: 'Motivez votre equipe !',
        subtitle: 'Plus votre equipe appelle, plus vos bonus montent',
        ctaLabel: 'Voir mon equipe',
        ctaAction: onShareLink,
        borderColor: 'border-l-amber-500',
        iconColor: 'text-amber-500',
      };
    }

    // Default
    return {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Continuez a partager !',
      subtitle: 'Chaque appel = $5-10 dans votre poche',
      ctaLabel: 'Partager mon lien',
      ctaAction: onShareLink,
      borderColor: 'border-l-green-500',
      iconColor: 'text-green-500',
    };
  }, [chatter, onCopyLink, onShareLink, onNavigateToRecruit, onNavigateToTelegram]);

  if (!action) return null;

  return (
    <div className={`${UI.card} border-l-4 ${action.borderColor} p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center ${action.iconColor}`}>
          {action.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {action.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {action.subtitle}
          </p>
          <button
            onClick={action.ctaAction}
            className={`mt-3 ${UI.button.primary} px-4 py-2 text-sm inline-flex items-center gap-2`}
          >
            {action.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NextActionCard;

/**
 * CelebrationSystem - Detects milestones and triggers confetti + toasts
 * Uses localStorage to avoid re-celebrating the same milestone
 */

import { useEffect, useRef, useCallback } from 'react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import toast from 'react-hot-toast';

const CELEBRATIONS_KEY = 'chatter_celebrations_seen';

function getCelebratedSet(): Set<string> {
  try {
    const stored = localStorage.getItem(CELEBRATIONS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function markCelebrated(id: string) {
  const set = getCelebratedSet();
  set.add(id);
  localStorage.setItem(CELEBRATIONS_KEY, JSON.stringify([...set]));
}

function hasCelebrated(id: string): boolean {
  return getCelebratedSet().has(id);
}

async function fireConfetti(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
  try {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const confetti = (await import('canvas-confetti')).default;
    const particleCount = intensity === 'light' ? 30 : intensity === 'heavy' ? 150 : 80;
    confetti({
      particleCount,
      spread: intensity === 'heavy' ? 120 : 70,
      origin: { y: 0.6 },
    });
  } catch {
    // canvas-confetti not available, skip silently
  }
}

function vibrate() {
  try {
    navigator.vibrate?.(100);
  } catch {
    // Not supported
  }
}

export function useCelebrations() {
  const { dashboardData, commissions } = useChatterData();
  const config = dashboardData?.config;
  const prevDataRef = useRef<typeof dashboardData>(null);
  const initialLoadDone = useRef(false);

  const celebrate = useCallback((id: string, message: string, intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (hasCelebrated(id)) return;
    markCelebrated(id);

    fireConfetti(intensity);
    vibrate();

    toast.success(message, {
      duration: 5000,
      style: {
        background: '#10b981',
        color: 'white',
        fontWeight: '600',
      },
    });
  }, []);

  useEffect(() => {
    if (!dashboardData?.chatter) return;

    // Skip celebrations on first load to avoid celebrating old milestones
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      prevDataRef.current = dashboardData;
      return;
    }

    const chatter = dashboardData.chatter;
    const prev = prevDataRef.current?.chatter;

    // First commission
    if ((chatter.totalEarned || 0) > 0 && (prev?.totalEarned || 0) === 0) {
      const amount = ((chatter.totalEarned || 0) / 100).toFixed(2);
      celebrate('first_commission', `Felicitations ! Votre premier gain de $${amount} !`, 'heavy');
    }

    // First referral — dynamic N1 amount from config
    const n1Amt = ((config?.commissionN1CallAmount ?? 100) / 100).toFixed(2).replace(/\.00$/, '');
    if ((chatter.totalRecruits || 0) >= 1 && (prev?.totalRecruits || 0) === 0) {
      celebrate('first_referral', `Votre premier filleul ! Chaque appel = $${n1Amt} pour vous`, 'medium');
    }

    // Tier milestones (from config or defaults)
    const configMilestones = config?.recruitmentMilestones ?? [
      { count: 5, bonus: 1500 }, { count: 10, bonus: 3500 }, { count: 20, bonus: 7500 },
      { count: 50, bonus: 25000 }, { count: 100, bonus: 60000 }, { count: 500, bonus: 400000 },
    ];
    for (const milestone of configMilestones) {
      if (
        (chatter.qualifiedReferralsCount || 0) >= milestone.count &&
        (prev?.qualifiedReferralsCount || 0) < milestone.count
      ) {
        celebrate(
          `tier_${milestone.count}`,
          `Bravo ! $${(milestone.bonus / 100).toLocaleString()} de bonus tier debloques !`,
          'medium'
        );
      }
    }

    // Piggy bank unlock — dynamic threshold from config
    const piggyThreshold = config?.piggyBankUnlockThreshold ?? 15000;
    const telegramBonus = ((config?.telegramBonusAmount ?? 5000) / 100).toFixed(0);
    if (chatter.telegramOnboardingCompleted) {
      const clientEarnings = commissions
        .filter((c) => c.type === 'client_call' && c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      if (clientEarnings >= piggyThreshold && !hasCelebrated('piggy_unlocked')) {
        celebrate('piggy_unlocked', `$${telegramBonus} de bonus liberes ! Retirez-les maintenant`, 'heavy');
      }
    }

    // Top 3 monthly — dynamic prizes from config
    if (chatter.currentMonthRank && chatter.currentMonthRank <= 3) {
      const monthKey = new Date().toISOString().slice(0, 7);
      const celebId = `top3_${monthKey}_rank${chatter.currentMonthRank}`;
      if (!hasCelebrated(celebId)) {
        const competitionPrizes = config?.monthlyCompetitionPrizes ?? { first: 20000, second: 10000, third: 5000 };
        const prizeMap: Record<number, number> = { 1: competitionPrizes.first, 2: competitionPrizes.second, 3: competitionPrizes.third };
        const prizeAmount = ((prizeMap[chatter.currentMonthRank] || 5000) / 100).toFixed(0);
        celebrate(
          celebId,
          `Vous etes #${chatter.currentMonthRank} ce mois ! $${prizeAmount} de bonus !`,
          'heavy'
        );
      }
    }

    prevDataRef.current = dashboardData;
  }, [dashboardData, commissions, celebrate]);
}

/**
 * CelebrationProvider - Drop this component into the layout to enable celebrations
 */
export function CelebrationProvider() {
  useCelebrations();
  return null;
}

export default CelebrationProvider;

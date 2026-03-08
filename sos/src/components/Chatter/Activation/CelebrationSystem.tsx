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

    // Level up (2-5)
    if (chatter.level && prev?.level && chatter.level > prev.level) {
      const levelNames: Record<number, string> = {
        2: 'Intermediaire',
        3: 'Avance',
        4: 'Expert',
        5: 'Elite',
      };
      const bonuses: Record<number, string> = {
        2: '+10%',
        3: '+20%',
        4: '+35%',
        5: '+50%',
      };
      celebrate(
        `level_${chatter.level}`,
        `Niveau ${levelNames[chatter.level] || chatter.level} atteint ! ${bonuses[chatter.level] || ''} de bonus sur vos commissions`,
        'heavy'
      );
    }

    // First referral
    if ((chatter.totalRecruits || 0) >= 1 && (prev?.totalRecruits || 0) === 0) {
      celebrate('first_referral', 'Votre premier filleul ! Chaque appel = $1 pour vous', 'medium');
    }

    // Tier milestones (5, 10, 20, 50, 100, 500 qualified referrals)
    const tierThresholds = [5, 10, 20, 50, 100, 500];
    const tierBonuses: Record<number, number> = { 5: 15, 10: 35, 20: 75, 50: 250, 100: 600, 500: 4000 };
    for (const threshold of tierThresholds) {
      if (
        (chatter.qualifiedReferralsCount || 0) >= threshold &&
        (prev?.qualifiedReferralsCount || 0) < threshold
      ) {
        celebrate(
          `tier_${threshold}`,
          `Bravo ! $${tierBonuses[threshold]} de bonus tier debloques !`,
          'medium'
        );
      }
    }

    // Piggy bank unlock ($150 in client earnings)
    // We track this via the piggy bank progression
    if (chatter.telegramOnboardingCompleted) {
      const clientEarnings = commissions
        .filter((c) => c.type === 'client_call' && c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      if (clientEarnings >= 15000 && !hasCelebrated('piggy_unlocked')) {
        celebrate('piggy_unlocked', '$50 de bonus liberes ! Retirez-les maintenant', 'heavy');
      }
    }

    // Top 3 monthly
    if (chatter.currentMonthRank && chatter.currentMonthRank <= 3) {
      const monthKey = new Date().toISOString().slice(0, 7);
      const celebId = `top3_${monthKey}_rank${chatter.currentMonthRank}`;
      if (!hasCelebrated(celebId)) {
        const prizes: Record<number, number> = { 1: 200, 2: 100, 3: 50 };
        celebrate(
          celebId,
          `Vous etes #${chatter.currentMonthRank} ce mois ! $${prizes[chatter.currentMonthRank]} de bonus !`,
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

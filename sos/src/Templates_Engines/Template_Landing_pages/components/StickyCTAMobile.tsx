/**
 * ============================================================================
 * STICKY CTA MOBILE - CTA fixe en bas sur mobile
 * ============================================================================
 *
 * Barre CTA sticky qui apparaît après un certain scroll.
 * Optimisé pour la conversion mobile avec safe area support.
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useScrolledPast, useScrollDirection, useReducedMotion, useHapticFeedback } from '../hooks';
import { cn } from '@/lib/utils';
import type { CTAData } from '../types';

export interface StickyCTAMobileProps {
  cta: CTAData;
  /** Position de scroll après laquelle afficher le CTA */
  showAfterScroll?: number;
  /** Masquer quand on scroll vers le bas */
  hideOnScrollDown?: boolean;
}

/**
 * CTA sticky mobile pour maximiser les conversions
 * Apparaît après un scroll et respecte la safe area iOS
 */
export const StickyCTAMobile = memo<StickyCTAMobileProps>(({
  cta,
  showAfterScroll = 300,
  hideOnScrollDown = true,
}) => {
  const showCta = useScrolledPast(showAfterScroll);
  const scrollDirection = useScrollDirection({ threshold: 10 });
  const prefersReducedMotion = useReducedMotion();
  const { onTap } = useHapticFeedback();

  // Masquer si on scroll vers le bas (optionnel)
  const isHiddenByScroll = hideOnScrollDown && scrollDirection === 'down';

  // Afficher seulement si scroll suffisant ET pas masqué par scroll direction
  const isVisible = showCta && !isHiddenByScroll;

  const handleClick = () => {
    onTap();

    // Analytics tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'sticky_cta_click', {
        event_category: 'CTA',
        event_label: cta.primary_text,
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { y: 100, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-white/95 backdrop-blur-xl',
            'border-t border-gray-200',
            'safe-area-inset-bottom',
            'shadow-[0_-4px_20px_rgba(0,0,0,0.1)]'
          )}
          role="complementary"
          aria-label="Action rapide"
        >
          <div className="px-4 py-3 pb-safe">
            <Link
              to={cta.primary_url}
              onClick={handleClick}
              className={cn(
                'flex items-center justify-center gap-3',
                'w-full py-4 px-6 rounded-2xl',
                'bg-gradient-to-r from-red-600 via-red-500 to-orange-500',
                'text-white font-bold text-lg',
                'transition-all duration-200',
                'active:scale-[0.98]',
                'shadow-lg shadow-red-500/30',
                'touch-manipulation'
              )}
            >
              <Phone className="w-5 h-5 animate-pulse" />
              <span>{cta.primary_text}</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

StickyCTAMobile.displayName = 'StickyCTAMobile';

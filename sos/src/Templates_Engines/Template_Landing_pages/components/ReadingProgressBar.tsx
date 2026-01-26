/**
 * ============================================================================
 * READING PROGRESS BAR - Barre de progression de lecture
 * ============================================================================
 *
 * Barre fixe en haut montrant la progression du scroll.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useScrollProgress, useReducedMotion } from '../hooks';

export interface ReadingProgressBarProps {
  /** Couleur de la barre */
  color?: string;
  /** Hauteur en pixels */
  height?: number;
  /** Z-index */
  zIndex?: number;
}

/**
 * Barre de progression de lecture fixe en haut
 */
export const ReadingProgressBar = memo<ReadingProgressBarProps>(({
  color = 'from-red-500 to-orange-500',
  height = 3,
  zIndex = 100,
}) => {
  const { percentage } = useScrollProgress();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="fixed top-0 left-0 right-0 pointer-events-none"
      style={{ zIndex }}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progression de lecture"
    >
      <motion.div
        className={`bg-gradient-to-r ${color}`}
        style={{
          height,
          width: `${percentage}%`,
          transformOrigin: 'left',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.1 }}
      />
    </div>
  );
});

ReadingProgressBar.displayName = 'ReadingProgressBar';

/**
 * ============================================================================
 * SOCIAL PROOF POPUP - Popup de preuve sociale
 * ============================================================================
 *
 * Popup qui apparaît périodiquement montrant l'activité récente.
 * Ex: "Marie de Paris vient de réserver un appel"
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock } from 'lucide-react';
import { useReducedMotion } from '../hooks';
import type { SocialProofData } from '../types';

export interface SocialProofPopupProps {
  /** Données de preuve sociale */
  socialProof: SocialProofData;
  /** Intervalle entre les popups (ms) */
  interval?: number;
  /** Durée d'affichage (ms) */
  displayDuration?: number;
  /** Nombre maximum d'affichages */
  maxShows?: number;
  /** Position */
  position?: 'bottom-left' | 'bottom-right';
}

/**
 * Popup de preuve sociale pour augmenter les conversions
 */
export const SocialProofPopup = memo<SocialProofPopupProps>(({
  socialProof,
  interval = 30000, // 30 secondes
  displayDuration = 5000, // 5 secondes
  maxShows = 5,
  position = 'bottom-left',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCount, setShowCount] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const activities = socialProof.recentActivity || [];

  // Show popup at interval
  useEffect(() => {
    if (activities.length === 0 || showCount >= maxShows) return;

    const showPopup = () => {
      setIsVisible(true);
      setShowCount((prev) => prev + 1);

      // Hide after duration
      setTimeout(() => {
        setIsVisible(false);
        // Move to next activity
        setCurrentIndex((prev) => (prev + 1) % activities.length);
      }, displayDuration);
    };

    // Initial delay
    const initialDelay = setTimeout(showPopup, 5000);

    // Interval for subsequent shows
    const intervalId = setInterval(showPopup, interval);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(intervalId);
    };
  }, [activities.length, interval, displayDuration, maxShows, showCount]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (activities.length === 0) return null;

  const currentActivity = activities[currentIndex];

  const positionClasses = position === 'bottom-left'
    ? 'left-4 bottom-4'
    : 'right-4 bottom-4';

  return (
    <AnimatePresence>
      {isVisible && currentActivity && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={`fixed ${positionClasses} z-50 max-w-sm`}
          role="status"
          aria-live="polite"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {currentActivity.name.charAt(0)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium">
                <span className="font-bold">{currentActivity.name}</span>{' '}
                {currentActivity.action}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {currentActivity.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {currentActivity.timeAgo}
                </span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SocialProofPopup.displayName = 'SocialProofPopup';

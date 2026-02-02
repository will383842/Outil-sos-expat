/**
 * InfluencerMotivationWidget - Motivational widget for Influencer dashboard
 * Displays rotating tips and encouraging messages specific to influencer activities
 * (content creation, link sharing, audience building)
 */

import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Sparkles, Lightbulb, Target, Rocket, Trophy } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface InfluencerMotivationWidgetProps {
  className?: string;
}

type MessageType = 'tip' | 'protip' | 'motivation' | 'stat' | 'achievement';

interface MotivationalMessage {
  id: string;
  type: MessageType;
  defaultMessage: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MESSAGES: MotivationalMessage[] = [
  {
    id: 'influencer.motivation.tip.instagram.bio',
    type: 'tip',
    defaultMessage: 'Tip: Add your link to your Instagram bio for passive referrals!',
  },
  {
    id: 'influencer.motivation.protip.youtube',
    type: 'protip',
    defaultMessage: 'Pro tip: YouTube video descriptions convert 3x better than stories',
  },
  {
    id: 'influencer.motivation.next.ten',
    type: 'motivation',
    defaultMessage: 'Your next $10 is just one referral away!',
  },
  {
    id: 'influencer.motivation.stat.weekly',
    type: 'stat',
    defaultMessage: 'Top influencers post content at least once per week',
  },
  {
    id: 'influencer.motivation.tip.qr',
    type: 'tip',
    defaultMessage: 'QR codes work great for in-person events!',
  },
  {
    id: 'influencer.motivation.tip.linktree',
    type: 'tip',
    defaultMessage: 'Tip: Use Linktree or similar to add your referral link to all platforms',
  },
  {
    id: 'influencer.motivation.protip.pinned',
    type: 'protip',
    defaultMessage: 'Pro tip: Pin your referral post to your profile for maximum visibility',
  },
  {
    id: 'influencer.motivation.achievement.consistency',
    type: 'achievement',
    defaultMessage: 'Consistency is key - your audience is waiting for your next post!',
  },
  {
    id: 'influencer.motivation.tip.stories',
    type: 'tip',
    defaultMessage: 'Tip: Stories with swipe-up links get 25% more engagement',
  },
  {
    id: 'influencer.motivation.motivation.growth',
    type: 'motivation',
    defaultMessage: 'Every follower is a potential referral - keep growing!',
  },
];

const ROTATION_INTERVAL_MS = 10000; // 10 seconds

// Icon mapping by message type
const getIconForType = (type: MessageType): React.ReactNode => {
  const iconClass = 'w-5 h-5';
  switch (type) {
    case 'tip':
      return <Lightbulb className={iconClass} />;
    case 'protip':
      return <Rocket className={iconClass} />;
    case 'motivation':
      return <Sparkles className={iconClass} />;
    case 'stat':
      return <Target className={iconClass} />;
    case 'achievement':
      return <Trophy className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

const InfluencerMotivationWidget = memo(function InfluencerMotivationWidget({
  className = '',
}: InfluencerMotivationWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // Shuffle messages on mount for variety
  const shuffledMessages = useMemo(() => {
    const shuffled = [...MESSAGES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const currentMessage = shuffledMessages[currentIndex];

  // Entrance animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Rotate messages every 10 seconds
  const rotateMessage = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffledMessages.length);
      setIsAnimating(false);
    }, 300);
  }, [shuffledMessages.length]);

  useEffect(() => {
    const interval = setInterval(rotateMessage, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rotateMessage]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-red-500/90 via-orange-500/90 to-amber-500/90
        dark:from-red-600/80 dark:via-orange-600/80 dark:to-amber-600/80
        backdrop-blur-xl
        border border-white/20 dark:border-white/10
        shadow-lg shadow-red-500/20 dark:shadow-red-900/30
        p-4 sm:p-5
        transform transition-all duration-500 ease-out
        ${hasEntered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        ${className}
      `}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/10 pointer-events-none" />

      {/* Decorative gradient circles */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Content with fade animation */}
        <div
          className={`
            flex items-start gap-3
            transition-all duration-300
            ${isAnimating ? 'opacity-0 transform translate-x-2' : 'opacity-100 transform translate-x-0'}
          `}
        >
          {/* Icon container */}
          <div className="flex-shrink-0 p-2.5 bg-white/20 dark:bg-white/10 rounded-xl backdrop-blur-sm">
            <div className="text-white">
              {getIconForType(currentMessage.type)}
            </div>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm sm:text-base font-medium text-white leading-snug">
              <FormattedMessage
                id={currentMessage.id}
                defaultMessage={currentMessage.defaultMessage}
              />
            </p>
          </div>
        </div>

        {/* Progress dots indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {shuffledMessages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentIndex(index);
                  setIsAnimating(false);
                }, 300);
              }}
              className={`
                w-1.5 h-1.5 rounded-full transition-all duration-300
                ${index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/40 hover:bg-white/60'
                }
              `}
              aria-label={`Go to message ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// Named and default exports
export { InfluencerMotivationWidget };
export default InfluencerMotivationWidget;

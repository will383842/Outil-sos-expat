/**
 * QuickActionsMenu - Floating Action Button with quick access to common chatter actions
 *
 * Features:
 * - Fixed position FAB at bottom-right
 * - Expandable menu with common actions
 * - Smart visibility (hides on scroll down, shows on scroll up)
 * - Keyboard accessible (Escape to close)
 * - Click outside to close
 * - Badge indicator for available withdrawal
 * - Staggered animations for menu items
 * - Dark mode support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Share2,
  MessageSquare,
  BarChart3,
  Users,
  GraduationCap,
  Wallet,
  Check,
  Copy,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickActionsMenuProps {
  /** Affiliate link URL for sharing */
  affiliateLink: string;
  /** Whether withdrawal is available */
  canWithdraw: boolean;
  /** Current available balance in cents */
  availableBalance: number;
  /** Minimum withdrawal amount in cents */
  minimumWithdrawal: number;
  /** Whether training has incomplete modules */
  hasIncompleteTraining?: boolean;
  /** Callback when share link is clicked */
  onShareLink?: () => void;
  /** Callback when message templates is clicked */
  onMessageTemplates?: () => void;
  /** Callback when view earnings is clicked */
  onViewEarnings?: () => void;
  /** Callback when invite team member is clicked */
  onInviteTeam?: () => void;
  /** Callback when continue training is clicked */
  onContinueTraining?: () => void;
  /** Callback when request withdrawal is clicked */
  onRequestWithdrawal?: () => void;
}

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  labelId: string;
  defaultLabel: string;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: boolean;
  hidden?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  affiliateLink,
  canWithdraw,
  availableBalance,
  minimumWithdrawal,
  hasIncompleteTraining = false,
  onShareLink,
  onMessageTemplates,
  onViewEarnings,
  onInviteTeam,
  onContinueTraining,
  onRequestWithdrawal,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Determine if withdrawal badge should show
  const showWithdrawalBadge = canWithdraw && availableBalance >= minimumWithdrawal;

  // Copy affiliate link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!affiliateLink) return;

    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShareLink?.();
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, [affiliateLink, onShareLink]);

  // Handle message templates click
  const handleMessageTemplates = useCallback(() => {
    setShowMessageModal(true);
    onMessageTemplates?.();
  }, [onMessageTemplates]);

  // Menu items configuration
  const menuItems: MenuItem[] = [
    {
      id: 'share',
      icon: copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />,
      labelId: 'quickActions.shareLink',
      defaultLabel: 'Partager mon lien',
      color: copied ? 'text-green-600 dark:text-green-400' : 'text-pink-600 dark:text-pink-400',
      bgColor: copied ? 'bg-green-100 dark:bg-green-900/30' : 'bg-pink-100 dark:bg-pink-900/30',
      onClick: handleCopyLink,
    },
    {
      id: 'messages',
      icon: <MessageSquare className="w-5 h-5" />,
      labelId: 'quickActions.messageTemplates',
      defaultLabel: 'Templates messages',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      onClick: handleMessageTemplates,
    },
    {
      id: 'earnings',
      icon: <BarChart3 className="w-5 h-5" />,
      labelId: 'quickActions.viewEarnings',
      defaultLabel: 'Voir mes gains',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      onClick: () => {
        setIsOpen(false);
        onViewEarnings?.();
      },
    },
    {
      id: 'invite',
      icon: <Users className="w-5 h-5" />,
      labelId: 'quickActions.inviteTeam',
      defaultLabel: 'Inviter un membre',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      onClick: () => {
        setIsOpen(false);
        onInviteTeam?.();
      },
    },
    {
      id: 'training',
      icon: <GraduationCap className="w-5 h-5" />,
      labelId: 'quickActions.continueTraining',
      defaultLabel: 'Continuer formation',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      onClick: () => {
        setIsOpen(false);
        onContinueTraining?.();
      },
      badge: hasIncompleteTraining,
    },
    {
      id: 'withdraw',
      icon: <Wallet className="w-5 h-5" />,
      labelId: 'quickActions.requestWithdrawal',
      defaultLabel: 'Demander retrait',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      onClick: () => {
        setIsOpen(false);
        onRequestWithdrawal?.();
      },
      hidden: !canWithdraw,
      badge: showWithdrawalBadge,
    },
  ].filter(item => !item.hidden);

  // Handle scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
        setIsOpen(false); // Close menu when hiding
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;

      // Show again after scrolling stops
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format amount for display
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <>
      {/* FAB Container */}
      <motion.div
        ref={menuRef}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0.8,
          y: isVisible ? 0 : 20,
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Menu Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-2"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05, delayChildren: 0.1 },
                },
              }}
            >
              {menuItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, x: 20, scale: 0.8 },
                    visible: { opacity: 1, x: 0, scale: 1 },
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Tooltip */}
                  <motion.span
                    className="px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <FormattedMessage id={item.labelId} defaultMessage={item.defaultLabel} />
                  </motion.span>

                  {/* Action Button */}
                  <button
                    onClick={item.onClick}
                    className={`
                      relative w-12 h-12 rounded-full shadow-lg
                      flex items-center justify-center
                      ${item.bgColor} ${item.color}
                      hover:scale-110 active:scale-95
                      transition-transform duration-200
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
                    `}
                    aria-label={intl.formatMessage({ id: item.labelId, defaultMessage: item.defaultLabel })}
                  >
                    {item.icon}

                    {/* Badge indicator */}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            relative w-14 h-14 rounded-full shadow-xl
            bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500
            flex items-center justify-center
            text-white
            hover:shadow-2xl hover:shadow-pink-500/30
            active:scale-95
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
            ${!isOpen && showWithdrawalBadge ? 'animate-pulse-subtle' : ''}
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </motion.div>

          {/* Badge for available withdrawal */}
          {!isOpen && showWithdrawalBadge && (
            <motion.span
              className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-900"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              $
            </motion.span>
          )}
        </motion.button>
      </motion.div>

      {/* Message Templates Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <MessageTemplatesModal
            affiliateLink={affiliateLink}
            onClose={() => setShowMessageModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Custom CSS for subtle pulse animation */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(236, 72, 153, 0);
          }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

// ============================================================================
// MESSAGE TEMPLATES MODAL
// ============================================================================

interface MessageTemplatesModalProps {
  affiliateLink: string;
  onClose: () => void;
}

const MESSAGE_TEMPLATES = [
  {
    id: 'casual',
    labelId: 'templates.casual.title',
    defaultLabel: 'Decontracte',
    messageId: 'templates.casual.message',
    defaultMessage: "Hey ! Tu savais qu'il existe une plateforme pour parler avec des expats et avocats francophones depuis l'etranger ? Super pratique pour les demarches admin. {link}",
  },
  {
    id: 'professional',
    labelId: 'templates.professional.title',
    defaultLabel: 'Professionnel',
    messageId: 'templates.professional.message',
    defaultMessage: "Bonjour, je te recommande SOS-Expat pour toute question juridique ou administrative depuis l'etranger. Les consultations se font par appel avec des experts. {link}",
  },
  {
    id: 'urgent',
    labelId: 'templates.urgent.title',
    defaultLabel: 'Urgence',
    messageId: 'templates.urgent.message',
    defaultMessage: "Besoin d'aide urgente depuis l'etranger ? Cette plateforme connecte en quelques minutes avec des avocats et expatries francophones. {link}",
  },
  {
    id: 'testimonial',
    labelId: 'templates.testimonial.title',
    defaultLabel: 'Temoignage',
    messageId: 'templates.testimonial.message',
    defaultMessage: "J'ai decouvert SOS-Expat et ca m'a vraiment aide pour mes questions de visa. Je te recommande ! {link}",
  },
];

const MessageTemplatesModal: React.FC<MessageTemplatesModalProps> = ({
  affiliateLink,
  onClose,
}) => {
  const intl = useIntl();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyTemplate = async (template: typeof MESSAGE_TEMPLATES[0]) => {
    const message = intl.formatMessage(
      { id: template.messageId, defaultMessage: template.defaultMessage },
      { link: affiliateLink }
    );

    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="templates.title" defaultMessage="Templates de messages" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="templates.subtitle" defaultMessage="Copiez et partagez facilement" />
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {MESSAGE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  <FormattedMessage id={template.labelId} defaultMessage={template.defaultLabel} />
                </span>
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${copiedId === template.id
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50'
                    }
                  `}
                >
                  {copiedId === template.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <FormattedMessage id="common.copied" defaultMessage="Copie !" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <FormattedMessage id="common.copy" defaultMessage="Copier" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                <FormattedMessage
                  id={template.messageId}
                  defaultMessage={template.defaultMessage}
                  values={{ link: <span className="text-pink-600 dark:text-pink-400">[lien]</span> }}
                />
              </p>
            </div>
          ))}
        </div>

        {/* Footer with tip */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
            <FormattedMessage
              id="templates.tip"
              defaultMessage="Astuce : Personnalisez le message avant de l'envoyer pour de meilleurs resultats !"
            />
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickActionsMenu;

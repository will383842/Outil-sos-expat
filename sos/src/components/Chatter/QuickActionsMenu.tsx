/**
 * QuickActionsMenu - 2026 Design System
 * Floating Action Button with glassmorphism menu and indigo/violet palette.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
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
import { copyToClipboard } from '@/utils/clipboard';
import { UI, ANIMATION } from '@/components/Chatter/designTokens';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickActionsMenuProps {
  affiliateLink: string;
  canWithdraw: boolean;
  availableBalance: number;
  minimumWithdrawal: number;
  hasIncompleteTraining?: boolean;
  onShareLink?: () => void;
  onMessageTemplates?: () => void;
  onViewEarnings?: () => void;
  onInviteTeam?: () => void;
  onContinueTraining?: () => void;
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

  const showWithdrawalBadge = canWithdraw && availableBalance >= minimumWithdrawal;

  const handleCopyLink = useCallback(async () => {
    if (!affiliateLink) return;
    const success = await copyToClipboard(affiliateLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShareLink?.();
    }
  }, [affiliateLink, onShareLink]);

  const handleMessageTemplates = useCallback(() => {
    setShowMessageModal(true);
    onMessageTemplates?.();
  }, [onMessageTemplates]);

  const menuItems: MenuItem[] = [
    {
      id: 'share',
      icon: copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />,
      labelId: 'quickActions.shareLink',
      defaultLabel: 'Partager mon lien',
      color: copied ? 'text-emerald-500' : 'text-indigo-500 dark:text-indigo-400',
      bgColor: copied ? 'bg-emerald-500/10 dark:bg-emerald-500/15' : 'bg-indigo-500/10 dark:bg-indigo-500/15',
      onClick: handleCopyLink,
    },
    {
      id: 'messages',
      icon: <MessageSquare className="w-5 h-5" />,
      labelId: 'quickActions.messageTemplates',
      defaultLabel: 'Templates messages',
      color: 'text-cyan-500 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      onClick: handleMessageTemplates,
    },
    {
      id: 'earnings',
      icon: <BarChart3 className="w-5 h-5" />,
      labelId: 'quickActions.viewEarnings',
      defaultLabel: 'Voir mes gains',
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      onClick: () => { setIsOpen(false); onViewEarnings?.(); },
    },
    {
      id: 'invite',
      icon: <Users className="w-5 h-5" />,
      labelId: 'quickActions.inviteTeam',
      defaultLabel: 'Inviter un membre',
      color: 'text-violet-500 dark:text-violet-400',
      bgColor: 'bg-violet-500/10 dark:bg-violet-500/15',
      onClick: () => { setIsOpen(false); onInviteTeam?.(); },
    },
    {
      id: 'training',
      icon: <GraduationCap className="w-5 h-5" />,
      labelId: 'quickActions.continueTraining',
      defaultLabel: 'Continuer formation',
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
      onClick: () => { setIsOpen(false); onContinueTraining?.(); },
      badge: hasIncompleteTraining,
    },
    {
      id: 'withdraw',
      icon: <Wallet className="w-5 h-5" />,
      labelId: 'quickActions.requestWithdrawal',
      defaultLabel: 'Demander retrait',
      color: 'text-emerald-500 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      onClick: () => { setIsOpen(false); onRequestWithdrawal?.(); },
      hidden: !canWithdraw,
      badge: showWithdrawalBadge,
    },
  ].filter(item => !item.hidden);

  // Handle scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
        setIsOpen(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
      scrollTimeout.current = setTimeout(() => setIsVisible(true), 1000);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* FAB Container */}
      <div
        ref={menuRef}
        className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 transition-all ${ANIMATION.normal} ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.8] translate-y-5'}`}
      >
        {/* Menu Items */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-2">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 ${ANIMATION.fadeIn}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Tooltip */}
                <span className="px-3 py-1.5 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-lg text-white text-sm font-medium rounded-xl shadow-lg shadow-black/20 whitespace-nowrap border border-white/[0.06]">
                  <FormattedMessage id={item.labelId} defaultMessage={item.defaultLabel} />
                </span>

                {/* Action Button */}
                <button
                  onClick={item.onClick}
                  className={`relative w-12 h-12 rounded-full shadow-lg shadow-black/10 flex items-center justify-center backdrop-blur-xl border border-white/[0.08] ${item.bgColor} ${item.color} hover:scale-110 active:scale-95 transition-all ${ANIMATION.fast} focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                  aria-label={intl.formatMessage({ id: item.labelId, defaultMessage: item.defaultLabel })}
                >
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/40" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-14 h-14 rounded-full shadow-xl shadow-indigo-500/30 bg-gradient-to-br from-indigo-500 via-violet-500 to-indigo-600 flex items-center justify-center text-white hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all ${ANIMATION.normal} focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2`}
          aria-expanded={isOpen}
          aria-label={isOpen ? intl.formatMessage({ id: 'chatter.quickActions.close', defaultMessage: 'Close quick actions' }) : intl.formatMessage({ id: 'chatter.quickActions.open', defaultMessage: 'Open quick actions' })}
        >
          <div
            className={`transition-transform ${ANIMATION.normal}`}
            style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
          </div>

          {!isOpen && showWithdrawalBadge && (
            <span className="absolute -top-1 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900 shadow-lg shadow-emerald-500/40">
              $
            </span>
          )}
        </button>
      </div>

      {/* Message Templates Modal */}
      {showMessageModal && (
        <MessageTemplatesModal
          affiliateLink={affiliateLink}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {/* Pulse glow for FAB */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
        }
      `}</style>
    </>
  );
};

// ============================================================================
// MESSAGE TEMPLATES MODAL — 2026 Glassmorphism
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
    const success = await copyToClipboard(message);
    if (success) {
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${ANIMATION.fadeIn}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md ${UI.glassCard} overflow-hidden bg-white dark:bg-slate-900/95 ${ANIMATION.slideUp}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 dark:border-white/[0.06] bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-xl">
                <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  <FormattedMessage id="templates.title" defaultMessage="Templates de messages" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <FormattedMessage id="templates.subtitle" defaultMessage="Copiez et partagez facilement" />
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`${UI.button.ghost} p-2`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {MESSAGE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200/60 dark:border-white/[0.06]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-900 dark:text-white font-medium">
                  <FormattedMessage id={template.labelId} defaultMessage={template.defaultLabel} />
                </span>
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ANIMATION.fast} ${
                    copiedId === template.id
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/20'
                  }`}
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
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <FormattedMessage
                  id={template.messageId}
                  defaultMessage={template.defaultMessage}
                  values={{ link: <span className="text-indigo-500 dark:text-indigo-400">[lien]</span> }}
                />
              </p>
            </div>
          ))}
        </div>

        {/* Footer with tip */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-white/[0.06] bg-amber-500/5 dark:bg-amber-500/[0.03]">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <FormattedMessage
              id="templates.tip"
              defaultMessage="Astuce : Personnalisez le message avant de l'envoyer pour de meilleurs resultats !"
            />
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsMenu;

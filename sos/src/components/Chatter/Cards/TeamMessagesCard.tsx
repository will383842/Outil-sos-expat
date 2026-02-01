/**
 * TeamMessagesCard
 *
 * Pre-written message templates to motivate team members.
 * Features:
 * - Message templates for different situations (inactive, slowing, top performer, beginner)
 * - Copy, WhatsApp, and Email action buttons
 * - Custom message input option
 * - Glassmorphism design matching other Chatter cards
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  MessageCircle,
  Copy,
  CheckCircle,
  Mail,
  Sparkles,
  UserX,
  TrendingDown,
  Trophy,
  Baby,
  Send,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { useChatterMissions } from '@/hooks/useChatterMissions';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMessagesCardProps {
  memberName: string;
  memberStatus: 'inactive' | 'slowing' | 'top' | 'beginner';
  memberPhone?: string;
  memberEmail?: string;
  onSendMessage?: (message: string, channel: 'copy' | 'whatsapp' | 'email') => void;
}

interface MessageTemplate {
  id: string;
  status: TeamMessagesCardProps['memberStatus'];
  icon: React.ReactNode;
  getMessage: (name: string) => string;
  titleKey: string;
  defaultTitle: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    whatsapp: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
    email: "bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

const STATUS_CONFIG = {
  inactive: {
    icon: <UserX className="w-5 h-5" />,
    gradient: 'from-red-500 to-orange-500',
    bgLight: 'from-red-50 to-orange-50',
    bgDark: 'from-red-900/20 to-orange-900/20',
    borderLight: 'border-red-200/50',
    borderDark: 'border-red-800/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
  slowing: {
    icon: <TrendingDown className="w-5 h-5" />,
    gradient: 'from-amber-500 to-yellow-500',
    bgLight: 'from-amber-50 to-yellow-50',
    bgDark: 'from-amber-900/20 to-yellow-900/20',
    borderLight: 'border-amber-200/50',
    borderDark: 'border-amber-800/30',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  top: {
    icon: <Trophy className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-teal-500',
    bgLight: 'from-emerald-50 to-teal-50',
    bgDark: 'from-emerald-900/20 to-teal-900/20',
    borderLight: 'border-emerald-200/50',
    borderDark: 'border-emerald-800/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  beginner: {
    icon: <Baby className="w-5 h-5" />,
    gradient: 'from-blue-500 to-indigo-500',
    bgLight: 'from-blue-50 to-indigo-50',
    bgDark: 'from-blue-900/20 to-indigo-900/20',
    borderLight: 'border-blue-200/50',
    borderDark: 'border-blue-800/30',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
} as const;

// Message templates in French
const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'inactive',
    status: 'inactive',
    icon: <UserX className="w-4 h-4" />,
    getMessage: (name: string) =>
      `Salut ${name} ! Ca fait un moment, tout va bien ? 😊 Si tu as besoin d'aide ou de conseils pour reprendre, je suis la ! On peut en parler quand tu veux.`,
    titleKey: 'teamMessages.template.inactive.title',
    defaultTitle: 'Reactiver un membre inactif',
  },
  {
    id: 'slowing',
    status: 'slowing',
    icon: <TrendingDown className="w-4 h-4" />,
    getMessage: (name: string) =>
      `Hey ${name} ! J'ai remarque que tu etais un peu moins actif ces derniers temps. Tout va bien ? 💪 Si tu as des questions ou besoin de motivation, n'hesite pas ! Ensemble on peut faire de grandes choses.`,
    titleKey: 'teamMessages.template.slowing.title',
    defaultTitle: 'Motiver un membre en baisse',
  },
  {
    id: 'top',
    status: 'top',
    icon: <Trophy className="w-4 h-4" />,
    getMessage: (name: string) =>
      `Bravo ${name} ! 🎉 Tu geres vraiment ! Tes resultats sont impressionnants. Continue comme ca, tu es une vraie star de l'equipe ! 💪🔥`,
    titleKey: 'teamMessages.template.top.title',
    defaultTitle: 'Feliciter un top performer',
  },
  {
    id: 'beginner',
    status: 'beginner',
    icon: <Baby className="w-4 h-4" />,
    getMessage: (name: string) =>
      `Felicitations pour tes premiers pas ${name} ! 🌟 Tu veux que je te partage mes astuces pour bien demarrer ? Je suis la pour t'accompagner dans cette aventure !`,
    titleKey: 'teamMessages.template.beginner.title',
    defaultTitle: 'Aider un debutant',
  },
];

// ============================================================================
// ACTION BUTTONS COMPONENT
// ============================================================================

interface ActionButtonsProps {
  message: string;
  memberPhone?: string;
  memberEmail?: string;
  onSendMessage?: (message: string, channel: 'copy' | 'whatsapp' | 'email') => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  message,
  memberPhone,
  memberEmail,
  onSendMessage,
}) => {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const { trackMessageSent } = useChatterMissions();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onSendMessage?.(message, 'copy');
      // Track message sent for daily missions
      trackMessageSent();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message, onSendMessage, trackMessageSent]);

  const handleWhatsApp = useCallback(() => {
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = memberPhone?.replace(/[^0-9]/g, '') || '';
    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    onSendMessage?.(message, 'whatsapp');
    // Track message sent for daily missions
    trackMessageSent();
  }, [message, memberPhone, onSendMessage, trackMessageSent]);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent(
      intl.formatMessage({
        id: 'teamMessages.email.subject',
        defaultMessage: 'Message de ton parrain SOS-Expat',
      })
    );
    const body = encodeURIComponent(message);
    const mailtoUrl = memberEmail
      ? `mailto:${memberEmail}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    onSendMessage?.(message, 'email');
    // Track message sent for daily missions
    trackMessageSent();
  }, [message, memberEmail, intl, onSendMessage, trackMessageSent]);

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium rounded-xl transition-all active:scale-[0.98] touch-manipulation ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
        }`}
      >
        {copied ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>
              <FormattedMessage id="common.copied" defaultMessage="Copie !" />
            </span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>
              <FormattedMessage id="teamMessages.action.copy" defaultMessage="COPIER" />
            </span>
          </>
        )}
      </button>

      {/* WhatsApp Button */}
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all active:scale-[0.98] touch-manipulation"
      >
        <MessageCircle className="w-4 h-4" />
        <span>
          <FormattedMessage id="teamMessages.action.whatsapp" defaultMessage="WHATSAPP" />
        </span>
      </button>

      {/* Email Button */}
      <button
        onClick={handleEmail}
        className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all active:scale-[0.98] touch-manipulation"
      >
        <Mail className="w-4 h-4" />
        <span>
          <FormattedMessage id="teamMessages.action.email" defaultMessage="EMAIL" />
        </span>
      </button>
    </div>
  );
};

// ============================================================================
// MESSAGE TEMPLATE CARD COMPONENT
// ============================================================================

interface MessageTemplateCardProps {
  template: MessageTemplate;
  memberName: string;
  memberPhone?: string;
  memberEmail?: string;
  isActive: boolean;
  onSendMessage?: (message: string, channel: 'copy' | 'whatsapp' | 'email') => void;
}

const MessageTemplateCard: React.FC<MessageTemplateCardProps> = ({
  template,
  memberName,
  memberPhone,
  memberEmail,
  isActive,
  onSendMessage,
}) => {
  const config = STATUS_CONFIG[template.status];
  const message = template.getMessage(memberName);

  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-r ${config.bgLight} dark:${config.bgDark} border ${config.borderLight} dark:${config.borderDark} ${
        isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''
      }`}
    >
      {/* Template Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.gradient} text-white`}>
          {template.icon}
        </div>
        <span className={`text-sm font-medium ${config.textColor}`}>
          <FormattedMessage id={template.titleKey} defaultMessage={template.defaultTitle} />
        </span>
        {isActive && (
          <span className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
            <FormattedMessage id="teamMessages.recommended" defaultMessage="Recommande" />
          </span>
        )}
      </div>

      {/* Message Content */}
      <div className="p-3 bg-white/60 dark:bg-white/5 rounded-lg border border-white/40 dark:border-white/10">
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {message}
        </p>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        message={message}
        memberPhone={memberPhone}
        memberEmail={memberEmail}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

// ============================================================================
// CUSTOM MESSAGE COMPONENT
// ============================================================================

interface CustomMessageSectionProps {
  memberName: string;
  memberPhone?: string;
  memberEmail?: string;
  onSendMessage?: (message: string, channel: 'copy' | 'whatsapp' | 'email') => void;
}

const CustomMessageSection: React.FC<CustomMessageSectionProps> = ({
  memberName,
  memberPhone,
  memberEmail,
  onSendMessage,
}) => {
  const intl = useIntl();
  const [customMessage, setCustomMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const placeholder = intl.formatMessage(
    {
      id: 'teamMessages.custom.placeholder',
      defaultMessage: 'Ecris ton message personnalise pour {name}...',
    },
    { name: memberName }
  );

  return (
    <div className="border-t border-gray-200/50 dark:border-white/10 pt-4 mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full min-h-[44px] text-left group touch-manipulation active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-600 dark:text-gray-400">
            <Edit3 className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <FormattedMessage
              id="teamMessages.custom.title"
              defaultMessage="Ecrire un message personnalise"
            />
          </span>
        </div>
        <div className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2">
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full px-4 py-3 text-sm bg-white/60 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white transition-all"
          />

          {customMessage.trim() && (
            <ActionButtons
              message={customMessage}
              memberPhone={memberPhone}
              memberEmail={memberEmail}
              onSendMessage={onSendMessage}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeamMessagesCard: React.FC<TeamMessagesCardProps> = ({
  memberName,
  memberStatus,
  memberPhone,
  memberEmail,
  onSendMessage,
}) => {
  const intl = useIntl();
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Get the recommended template (matching the member's status)
  const recommendedTemplate = useMemo(
    () => MESSAGE_TEMPLATES.find((t) => t.status === memberStatus),
    [memberStatus]
  );

  // Get other templates (not matching the member's status)
  const otherTemplates = useMemo(
    () => MESSAGE_TEMPLATES.filter((t) => t.status !== memberStatus),
    [memberStatus]
  );

  const config = STATUS_CONFIG[memberStatus];

  const statusLabel = intl.formatMessage({
    id: `teamMessages.status.${memberStatus}`,
    defaultMessage: memberStatus,
  });

  return (
    <div className={UI.card}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${config.gradient} rounded-xl shadow-lg text-white`}>
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              <FormattedMessage
                id="teamMessages.title"
                defaultMessage="Messages pour {name}"
                values={{ name: memberName }}
              />
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-sm ${config.textColor}`}>
                {config.icon}
                <span className="capitalize">{statusLabel}</span>
              </span>
              {memberPhone && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  • {memberPhone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Recommended Template */}
        {recommendedTemplate && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <FormattedMessage
                  id="teamMessages.recommended.label"
                  defaultMessage="Message recommande"
                />
              </span>
            </div>
            <MessageTemplateCard
              template={recommendedTemplate}
              memberName={memberName}
              memberPhone={memberPhone}
              memberEmail={memberEmail}
              isActive={true}
              onSendMessage={onSendMessage}
            />
          </div>
        )}

        {/* Other Templates Toggle */}
        <button
          onClick={() => setShowAllTemplates(!showAllTemplates)}
          className="flex items-center gap-2 min-h-[44px] px-2 -mx-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation active:scale-[0.98]"
        >
          {showAllTemplates ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <FormattedMessage
            id="teamMessages.showOther"
            defaultMessage="{action} autres modeles"
            values={{ action: showAllTemplates ? 'Masquer les' : 'Voir les' }}
          />
        </button>

        {/* Other Templates */}
        {showAllTemplates && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
            {otherTemplates.map((template) => (
              <MessageTemplateCard
                key={template.id}
                template={template}
                memberName={memberName}
                memberPhone={memberPhone}
                memberEmail={memberEmail}
                isActive={false}
                onSendMessage={onSendMessage}
              />
            ))}
          </div>
        )}

        {/* Custom Message Section */}
        <CustomMessageSection
          memberName={memberName}
          memberPhone={memberPhone}
          memberEmail={memberEmail}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
};

export default TeamMessagesCard;

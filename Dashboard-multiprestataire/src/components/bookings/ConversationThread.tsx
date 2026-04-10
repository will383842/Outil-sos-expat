/**
 * ConversationThread — Affiche l'historique des messages IA d'une conversation.
 * Accordéon pliable dans BookingRequestCard.
 */
import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, Bot, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConversationMessage } from '../../hooks/useProviderConversations';

interface ConversationThreadProps {
  messages: ConversationMessage[];
  maxInitialVisible?: number;
}

export default function ConversationThread({
  messages,
  maxInitialVisible = 6,
}: ConversationThreadProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  if (!messages || messages.length === 0) return null;

  const visibleMessages = isExpanded
    ? messages
    : messages.slice(-maxInitialVisible);

  const hiddenCount = messages.length - maxInitialVisible;

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
      >
        <span className="flex items-center gap-2 text-gray-700 font-medium">
          <MessageSquare className="w-4 h-4 text-primary-600" />
          {t('conversation.history', { defaultValue: 'Historique conversation' })}
          <span className="text-xs text-gray-400">({messages.length})</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Messages */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {/* Show "N earlier messages" indicator */}
        {!isExpanded && hiddenCount > 0 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs text-primary-600 hover:text-primary-700 bg-primary-50/50"
          >
            {t('conversation.show_earlier', {
              count: hiddenCount,
              defaultValue: `Voir ${hiddenCount} messages précédents`,
            })}
          </button>
        )}

        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className={`px-3 py-2.5 text-sm ${
              msg.role === 'assistant' ? 'bg-white' : 'bg-blue-50/40'
            }`}
          >
            {/* Role indicator */}
            <div className="flex items-center gap-1.5 mb-1">
              {msg.role === 'assistant' ? (
                <Bot className="w-3.5 h-3.5 text-purple-500" />
              ) : (
                <User className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span className="text-xs font-medium text-gray-500">
                {msg.role === 'assistant' ? 'IA' : t('conversation.provider', { defaultValue: 'Prestataire' })}
              </span>
              {msg.createdAt && (
                <span className="text-[10px] text-gray-300 ml-auto">
                  {formatMessageTime(msg.createdAt)}
                </span>
              )}
            </div>

            {/* Content — truncated for assistant, full for user */}
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words text-[13px]">
              {msg.role === 'assistant' && msg.content.length > 500
                ? msg.content.slice(0, 500) + '…'
                : msg.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMessageTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);

    if (diffMin < 1) return 'maintenant';
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

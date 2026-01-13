/**
 * Conversations Section Component
 * Displays recent conversations with loading/empty states
 */

import React from 'react';
import { useIntl } from 'react-intl';
import {
  Clock,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  Calendar,
  User,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { Card } from './Card';
import { getDateLocale } from '../../../../utils/formatters';

// Types
interface RecentConversation {
  id: string;
  clientName: string;
  subject: string;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived' | 'expired';
  country?: string;
}

interface ConversationsSectionProps {
  conversations: RecentConversation[];
  loading: boolean;
  error?: string | null;
  canMakeCall: boolean;
  locale: string;
  onViewAll: () => void;
  onOpenConversation: (id: string) => void;
  onStartNew: () => void;
}

export const ConversationsSection: React.FC<ConversationsSectionProps> = ({
  conversations,
  loading,
  error,
  canMakeCall,
  locale,
  onViewAll,
  onOpenConversation,
  onStartNew,
}) => {
  const intl = useIntl();

  return (
    <Card className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          {intl.formatMessage({ id: 'aiAssistant.recentConversations' })}
        </h2>
        <button
          onClick={onViewAll}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 hover:gap-2 transition-all"
        >
          {intl.formatMessage({ id: 'common.viewAll' })}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeletons />
      ) : error ? (
        <ErrorState message={error} />
      ) : conversations.length === 0 ? (
        <EmptyState canMakeCall={canMakeCall} onStartNew={onStartNew} />
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              locale={locale}
              intl={intl}
              onClick={() => onOpenConversation(conversation.id)}
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      )}

      {/* Duration Reminder */}
      <DurationReminder />
    </Card>
  );
};

// Conversation Card
interface ConversationCardProps {
  conversation: RecentConversation;
  locale: string;
  intl: ReturnType<typeof useIntl>;
  onClick: () => void;
  style?: React.CSSProperties;
}

const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  locale,
  intl,
  onClick,
  style,
}) => {
  const timeAgo = getTimeAgo(conversation.lastMessageAt, locale, intl);

  return (
    <button
      onClick={onClick}
      style={style}
      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 group animate-fade-in-up"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              {conversation.clientName}
            </h4>
            <p className="text-sm text-gray-500 line-clamp-1">{conversation.subject}</p>
            {conversation.country && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <Globe className="w-3 h-3" />
                {conversation.country}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={conversation.status} intl={intl} />
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MessageSquare className="w-3 h-3" />
          {conversation.messageCount} {intl.formatMessage({ id: 'aiAssistant.messages' })}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
};

// Status Badge
const StatusBadge: React.FC<{
  status: 'active' | 'archived' | 'expired';
  intl: ReturnType<typeof useIntl>;
}> = ({ status, intl }) => (
  <span
    className={cn(
      'text-xs px-2 py-0.5 rounded-full font-medium',
      status === 'active' && 'bg-green-100 text-green-700',
      status === 'archived' && 'bg-gray-100 text-gray-600',
      status === 'expired' && 'bg-amber-100 text-amber-700'
    )}
  >
    {intl.formatMessage({ id: `aiAssistant.status.${status}` })}
  </span>
);

// Loading Skeletons
const LoadingSkeletons: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="h-24 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>
    ))}
  </div>
);

// Error State
const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-center py-8">
    <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
    <p className="text-gray-500">{message}</p>
  </div>
);

// Empty State
const EmptyState: React.FC<{ canMakeCall: boolean; onStartNew: () => void }> = ({
  canMakeCall,
  onStartNew,
}) => {
  const intl = useIntl();

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float">
        <MessageSquare className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {intl.formatMessage({ id: 'aiAssistant.noConversations' })}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {intl.formatMessage({ id: 'aiAssistant.noConversationsDescription' })}
      </p>
      <button
        onClick={onStartNew}
        disabled={!canMakeCall}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
          canMakeCall
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        )}
      >
        <ExternalLink className="w-5 h-5" />
        {intl.formatMessage({ id: 'aiAssistant.accessButton' })}
      </button>
    </div>
  );
};

// Duration Reminder
const DurationReminder: React.FC = () => {
  const intl = useIntl();

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Calendar className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="font-medium text-amber-800 mb-1">
            {intl.formatMessage({ id: 'aiAssistant.conversationDuration' })}
          </h4>
          <p className="text-sm text-amber-700">
            {intl.formatMessage({ id: 'aiAssistant.conversationDurationDetails' })}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function
function getTimeAgo(date: Date, locale: string, intl: ReturnType<typeof useIntl>): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.minutes' }, { count: diffMins });
  } else if (diffHours < 24) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.hours' }, { count: diffHours });
  } else if (diffDays < 7) {
    return intl.formatMessage({ id: 'aiAssistant.timeAgo.days' }, { count: diffDays });
  } else {
    return date.toLocaleDateString(getDateLocale(locale), {
      day: 'numeric',
      month: 'short',
    });
  }
}

export default ConversationsSection;

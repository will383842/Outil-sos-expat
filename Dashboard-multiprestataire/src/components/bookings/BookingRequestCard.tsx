/**
 * Booking Request Card Component
 * Displays a single booking request with client info, status, and actions
 */
import { useState } from 'react';
import {
  User,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
} from 'lucide-react';
import {
  SERVICE_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
  FIVE_MINUTES,
  type BookingRequest,
} from '../../types';
import AiResponsePreview, { AiErrorBadge } from './AiResponsePreview';

interface BookingRequestCardProps {
  booking: BookingRequest;
  isNew?: boolean;
}

const STATUS_COLORS: Record<BookingRequest['status'], { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

/** Format relative time in French */
function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function BookingRequestCard({ booking, isNew }: BookingRequestCardProps) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const statusColor = STATUS_COLORS[booking.status];
  const isHistory = booking.status === 'completed' || booking.status === 'cancelled';
  const serviceLabel = SERVICE_TYPE_LABELS[booking.serviceType] || booking.serviceType;

  const showNewBadge = isNew || (booking.status === 'pending' && Date.now() - booking.createdAt.getTime() < FIVE_MINUTES);

  const descriptionTruncated = booking.description.length > 150;
  const displayDescription = isDescExpanded
    ? booking.description
    : booking.description.slice(0, 150) + (descriptionTruncated ? '...' : '');

  const handleRespond = () => {
    window.open('https://ia.sos-expat.com', '_blank', 'noopener');
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-3 sm:p-4 transition-all ${
        showNewBadge
          ? 'border-green-300 ring-1 ring-green-200'
          : 'border-gray-100'
      }`}
    >
      {/* Top row: client info + status + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </div>

          {/* Client info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">
                {booking.clientName}
              </span>
              {showNewBadge && (
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-500 text-white rounded-full animate-pulse">
                  Nouveau
                </span>
              )}
            </div>

            {/* Location + phone */}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
              {booking.clientCurrentCountry && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {booking.clientCurrentCountry}
                </span>
              )}
              {(booking.clientPhone || booking.clientWhatsapp) && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {booking.clientPhone || booking.clientWhatsapp}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status + time */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
          <span className="text-[11px] text-gray-400">
            {formatRelativeTime(booking.createdAt)}
          </span>
        </div>
      </div>

      {/* Service type */}
      <div className="mt-3">
        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
          {serviceLabel}
        </span>
        {booking.providerName && (
          <span className="ml-2 text-xs text-gray-400">
            → {booking.providerName}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="mt-2">
        <p className="text-sm text-gray-600 leading-relaxed">
          {displayDescription}
        </p>
        {descriptionTruncated && (
          <button
            onClick={() => setIsDescExpanded(!isDescExpanded)}
            className="flex items-center gap-1 mt-1 text-xs text-primary-600 hover:text-primary-700 min-h-[36px]"
          >
            {isDescExpanded ? (
              <>Voir moins <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Voir plus <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {/* AI Response */}
      {booking.aiResponse && (
        <AiResponsePreview
          content={booking.aiResponse.content}
          generatedAt={booking.aiResponse.generatedAt}
          model={booking.aiResponse.model}
          tokensUsed={booking.aiResponse.tokensUsed}
          source={booking.aiResponse.source}
        />
      )}
      {booking.aiError && <AiErrorBadge error={booking.aiError} />}

      {/* Action button */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleRespond}
          className={`flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] text-sm font-medium rounded-lg transition-colors ${
            isHistory
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isHistory ? (
            <>
              <Eye className="w-4 h-4" />
              Voir
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Répondre
            </>
          )}
        </button>
      </div>
    </div>
  );
}

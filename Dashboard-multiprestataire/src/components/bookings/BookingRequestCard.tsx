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
  Trash2,
  Loader2,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { useTranslation } from 'react-i18next';
import {
  FIVE_MINUTES,
  type BookingRequest,
} from '../../types';
import { auth, outilFunctions } from '../../config/firebase';
import AiResponsePreview, { AiErrorBadge } from './AiResponsePreview';
import toast from 'react-hot-toast';

interface BookingRequestCardProps {
  booking: BookingRequest;
  isNew?: boolean;
  onDelete?: (bookingId: string) => void;
}

const STATUS_COLORS: Record<BookingRequest['status'], { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function BookingRequestCard({ booking, isNew, onDelete }: BookingRequestCardProps) {
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const { t } = useTranslation();
  const statusColor = STATUS_COLORS[booking.status];
  const isHistory = booking.status === 'completed' || booking.status === 'cancelled';
  const serviceLabel = t(`service.${booking.serviceType}`, { defaultValue: booking.serviceType });
  const statusLabel = t(`status.${booking.status}`);

  const showNewBadge = isNew || (booking.status === 'pending' && Date.now() - booking.createdAt.getTime() < FIVE_MINUTES);

  const descriptionTruncated = booking.description.length > 150;
  const displayDescription = isDescExpanded
    ? booking.description
    : booking.description.slice(0, 150) + (descriptionTruncated ? '...' : '');

  /** Format relative time */
  function formatRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return t('booking.time_now');
    if (minutes < 60) return t('booking.time_minutes', { count: minutes });
    if (hours < 24) return t('booking.time_hours', { count: hours });
    if (days < 7) return t('booking.time_days', { count: days });
    return date.toLocaleDateString();
  }

  const handleRespond = async () => {
    // Open window BEFORE async to avoid popup blockers on mobile
    const newWindow = window.open('about:blank', '_blank');
    setIsSsoLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error(t('booking.session_expired'));
        newWindow?.close();
        return;
      }

      const idToken = await currentUser.getIdToken();

      const generateToken = httpsCallable<
        { firebaseIdToken: string; providerId: string; bookingId?: string },
        { success: boolean; ssoUrl?: string; error?: string }
      >(outilFunctions, 'generateMultiDashboardOutilToken');

      const result = await generateToken({
        firebaseIdToken: idToken,
        providerId: booking.providerId,
        bookingId: booking.id,
      });

      if (result.data.success && result.data.ssoUrl) {
        if (newWindow) {
          newWindow.location.href = result.data.ssoUrl;
        } else {
          // Popup blocked — navigate current tab
          window.location.href = result.data.ssoUrl;
        }
      } else {
        newWindow?.close();
        toast.error(result.data.error || t('booking.sso_error'));
      }
    } catch (err) {
      console.error('SSO error:', err);
      newWindow?.close();
      // Fallback: open ia.sos-expat.com without SSO
      toast.error(t('booking.sso_fallback'));
      window.open('https://ia.sos-expat.com', '_blank', 'noopener');
    } finally {
      setIsSsoLoading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 sm:p-5 transition-all ${
        showNewBadge
          ? 'border-green-300 ring-1 ring-green-200'
          : 'border-gray-100'
      }`}
    >
      {/* Top row: client info + status + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
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
                  {t('booking.new_badge')}
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
            {statusLabel}
          </span>
          <span className="text-xs text-gray-400">
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
            className="flex items-center gap-1 mt-1 text-xs text-primary-600 hover:text-primary-700 min-h-[44px]"
          >
            {isDescExpanded ? (
              <>{t('booking.see_less')} <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>{t('booking.see_more')} <ChevronDown className="w-3 h-3" /></>
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

      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
        {!isHistory && (
          <button
            onClick={handleRespond}
            disabled={isSsoLoading}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSsoLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('booking.connecting')}</>
            ) : (
              <><ExternalLink className="w-4 h-4" /> {t('booking.respond')}</>
            )}
          </button>
        )}
        {isHistory && onDelete && (
          <button
            onClick={() => onDelete(booking.id)}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 min-h-[44px] text-sm font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {t('booking.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

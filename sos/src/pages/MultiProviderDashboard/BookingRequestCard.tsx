/**
 * BookingRequestCard - Carte booking request avec réponse IA
 *
 * Affiche les détails d'une demande de booking et la réponse IA générée
 */

import React, { useState } from 'react';
import {
  Calendar,
  User,
  Globe,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Scale,
  Globe as GlobeIcon,
  Mail,
  MapPin,
  FileText,
  Languages,
  Loader2,
  Bot,
  ExternalLink,
} from 'lucide-react';
import type { BookingRequestWithAI } from '../../hooks/useMultiProviderDashboard';
import AiResponseDisplay from './AiResponseDisplay';
import { cn } from '../../utils/cn';

interface BookingRequestCardProps {
  booking: BookingRequestWithAI;
  providerName?: string;
  onOpenAiTool?: (providerId: string) => void;
  onOpenChat?: (providerId: string, providerName: string, providerType: 'lawyer' | 'expat' | undefined, bookingId: string, initialMessage?: string) => void;
}

const BookingRequestCard: React.FC<BookingRequestCardProps> = ({
  booking,
  providerName,
  onOpenAiTool,
  onOpenChat,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isOpeningAiTool, setIsOpeningAiTool] = useState(false);

  const handleOpenChat = () => {
    if (!onOpenChat || !booking.providerId) return;
    onOpenChat(
      booking.providerId,
      providerName || booking.providerName || 'Prestataire',
      booking.providerType,
      booking.id,
      booking.aiResponse?.content
    );
  };

  const handleOpenAiTool = async () => {
    if (!onOpenAiTool || !booking.providerId) return;
    setIsOpeningAiTool(true);
    try {
      await onOpenAiTool(booking.providerId);
    } finally {
      setIsOpeningAiTool(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return formatDate(date);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'En attente',
          color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
          dot: 'bg-amber-500',
        };
      case 'confirmed':
        return {
          label: 'Confirmé',
          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
          dot: 'bg-blue-500',
        };
      case 'in_progress':
        return {
          label: 'En cours',
          color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
          dot: 'bg-purple-500',
        };
      case 'completed':
        return {
          label: 'Terminé',
          color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          dot: 'bg-green-500',
        };
      case 'cancelled':
        return {
          label: 'Annulé',
          color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
          dot: 'bg-red-500',
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          dot: 'bg-gray-500',
        };
    }
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lawyer_call: 'Appel Avocat',
      expat_call: 'Appel Aidant',
      consultation: 'Consultation',
      urgent: 'Urgent',
      standard: 'Standard',
    };
    return labels[type] || type;
  };

  const statusConfig = getStatusConfig(booking.status);
  const isNew = Date.now() - booking.createdAt.getTime() < 5 * 60 * 1000; // Less than 5 minutes

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border overflow-hidden transition-all",
        isNew
          ? "border-green-300 dark:border-green-700 ring-2 ring-green-200 dark:ring-green-800"
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Client Info */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {booking.clientName}
                </h4>
                {isNew && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full animate-pulse">
                    NOUVEAU
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {booking.clientCurrentCountry && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {booking.clientCurrentCountry}
                  </span>
                )}
                {booking.clientPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {booking.clientPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status & Time */}
          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                statusConfig.color
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />
              {statusConfig.label}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(booking.createdAt)}
            </span>
          </div>
        </div>

        {/* Service Type & Provider */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">
            <FileText className="w-3 h-3" />
            {getServiceTypeLabel(booking.serviceType)}
          </span>

          {providerName && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-medium">
              {booking.providerType === 'lawyer' ? (
                <Scale className="w-3 h-3" />
              ) : (
                <GlobeIcon className="w-3 h-3" />
              )}
              {providerName}
            </span>
          )}

          {booking.clientLanguages && booking.clientLanguages.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
              <Languages className="w-3 h-3" />
              {booking.clientLanguages.join(', ')}
            </span>
          )}
        </div>

        {/* Title/Description Preview */}
        {booking.title && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {booking.title}
          </p>
        )}
      </div>

      {/* AI Response Section */}
      {booking.aiResponse ? (
        <div className="px-4 pb-4">
          <AiResponseDisplay
            aiResponse={booking.aiResponse}
            bookingId={booking.id}
          />
        </div>
      ) : booking.status === 'pending' ? (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Génération de la réponse IA en cours...</span>
          </div>
        </div>
      ) : null}

      {/* Actions Bar */}
      <div className="px-4 pb-3 flex items-center gap-2">
        {/* Chat Button - Primary action */}
        {onOpenChat && booking.providerId && (
          <button
            onClick={handleOpenChat}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
              "hover:from-green-600 hover:to-emerald-700",
              "shadow-sm hover:shadow-md"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Ouvrir le Chat
          </button>
        )}

        {/* Open AI Tool Button - Secondary action */}
        {onOpenAiTool && booking.providerId && (
          <button
            onClick={handleOpenAiTool}
            disabled={isOpeningAiTool}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
              "hover:bg-gray-200 dark:hover:bg-gray-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isOpeningAiTool ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Outil IA</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Expand/Collapse for Full Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Réduire
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Voir tous les détails
          </>
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {booking.clientEmail && (
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">Email</span>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {booking.clientEmail}
                </p>
              </div>
            )}
            {booking.clientWhatsapp && (
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">WhatsApp</span>
                <p className="text-gray-900 dark:text-white flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {booking.clientWhatsapp}
                </p>
              </div>
            )}
            {booking.clientNationality && (
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-xs">Nationalité</span>
                <p className="text-gray-900 dark:text-white">{booking.clientNationality}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">Date de création</span>
              <p className="text-gray-900 dark:text-white">{formatDate(booking.createdAt)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 dark:text-gray-400 text-xs">ID Booking</span>
              <p className="text-gray-900 dark:text-white font-mono text-xs">{booking.id}</p>
            </div>
            {booking.description && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Description</span>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{booking.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequestCard;

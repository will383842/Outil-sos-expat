import React, { useState } from 'react';
import { ClientRequest } from '../../types';
import { 
  Clock, 
  Globe, 
  MessageCircle, 
  User, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MoreVertical,
  Star,
  Flag,
  Zap
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RequestCardProps {
  request: ClientRequest;
  onClick: () => void;
  onQuickAction?: (action: 'call' | 'message' | 'flag' | 'priority') => void;
  showQuickActions?: boolean;
  compact?: boolean;
  showStatus?: boolean;
}

export default function RequestCard({ 
  request, 
  onClick,
  onQuickAction,
  showQuickActions = true,
  compact = false,
  showStatus = true
}: RequestCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getRoleColor = (role: string) => {
    const colors = {
      'avocat': 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200',
      'expert': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
      'default': 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200'
    };
    return colors[role as keyof typeof colors] || colors.default;
  };

  const getRoleIcon = (role: string) => {
    const icons = {
      'avocat': '⚖️',
      'expert': '🌍',
      'default': '👤'
    };
    return icons[role as keyof typeof icons] || icons.default;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'urgent': 'bg-red-500',
      'high': 'bg-orange-500',
      'medium': 'bg-yellow-500',
      'low': 'bg-green-500'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      'pending': { 
        color: 'text-amber-600 bg-amber-50 border-amber-200', 
        icon: Clock, 
        label: 'En attente' 
      },
      'in_progress': { 
        color: 'text-blue-600 bg-blue-50 border-blue-200', 
        icon: Zap, 
        label: 'En cours' 
      },
      'completed': { 
        color: 'text-green-600 bg-green-50 border-green-200', 
        icon: CheckCircle2, 
        label: 'Terminé' 
      },
      'urgent': { 
        color: 'text-red-600 bg-red-50 border-red-200', 
        icon: AlertCircle, 
        label: 'Urgent' 
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const formatScheduledTime = (date: Date) => {
    if (isToday(date)) {
      return `Aujourd'hui ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Demain ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd MMM HH:mm', { locale: fr });
    }
  };

  const getTimeStatus = (date: Date) => {
    if (isPast(date)) {
      return { color: 'text-red-600', label: 'Retard' };
    }
    const distance = formatDistanceToNow(date, { locale: fr });
    return { color: 'text-sos-red', label: `dans ${distance}` };
  };

  const statusConfig = getStatusConfig(request.status || 'pending');
  const timeStatus = getTimeStatus(request.scheduledTime);
  const StatusIcon = statusConfig.icon;

  const QuickActions = () => (
    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAction?.('call');
        }}
        className="p-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        title="Appeler"
      >
        <Phone size={14} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAction?.('message');
        }}
        className="p-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        title="Message"
      >
        <MessageCircle size={14} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAction?.('flag');
        }}
        className="p-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
        title="Signaler"
      >
        <Flag size={14} />
      </button>
    </div>
  );

  const PriorityIndicator = () => (
    request.priority && (
      <div 
        className={`w-1 h-full absolute left-0 top-0 rounded-l-sos ${getPriorityColor(request.priority)}`}
        title={`Priorité: ${request.priority}`}
      />
    )
  );

  if (compact) {
    return (
      <div 
        onClick={onClick}
        className="group relative bg-white rounded-sos p-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100 hover:border-sos-red/20"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <PriorityIndicator />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-sos-pastel to-sos-red/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-sos-red" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sos-text truncate text-sm">
                {request.clientFirstName}
              </h3>
              <p className="text-xs text-sos-text-light truncate">
                {request.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-sos-red font-medium">
              {format(request.scheduledTime, 'HH:mm')}
            </span>
            {showQuickActions && <QuickActions />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-sos p-4 shadow-sos hover:shadow-sos-lg transition-all duration-300 cursor-pointer animate-slide-up mb-4 mx-4 active:scale-[0.98] border border-gray-100 hover:border-sos-red/20 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <PriorityIndicator />

      {/* Header avec client, statut et actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-sos-pastel to-sos-red/10 rounded-full flex items-center justify-center shadow-sm">
              <User size={22} className="text-sos-red" />
            </div>
            {request.isVip && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Star size={10} className="text-white" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-sos-text truncate">
                {request.clientFirstName}
              </h3>
              {request.isReturningClient && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  Client fidèle
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 text-sm text-sos-text-light">
              <div className="flex items-center">
                <Globe size={14} className="mr-1" />
                {request.nationality}
              </div>
              <div className="flex items-center">
                <Mail size={14} className="mr-1" />
                {request.contactMethod || 'Email'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showStatus && (
            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
              <StatusIcon size={12} className="mr-1" />
              {statusConfig.label}
            </div>
          )}
          
          {showQuickActions && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={16} className="text-gray-500" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-sos shadow-lg border border-gray-100 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAction?.('priority');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-sos last:rounded-b-sos"
                  >
                    Priorité haute
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAction?.('flag');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-sos last:rounded-b-sos"
                  >
                    Signaler
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Heure programmée avec statut */}
      <div className="mb-3 p-3 bg-gradient-to-r from-sos-red/5 to-transparent rounded-sos border-l-2 border-sos-red">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-sos-red" />
            <span className="font-medium text-sos-text">
              {formatScheduledTime(request.scheduledTime)}
            </span>
          </div>
          <span className={`text-xs font-medium ${timeStatus.color}`}>
            {timeStatus.label}
          </span>
        </div>
      </div>

      {/* Titre et description de la demande */}
      <div className="mb-4">
        <h4 className="font-medium text-sos-text mb-2 line-clamp-2 leading-relaxed">
          {request.title}
        </h4>
        <p className="text-sm text-sos-text-light line-clamp-2 leading-relaxed">
          {request.description}
        </p>
      </div>

      {/* Footer avec informations contextuelles */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-xs text-sos-text-light">
            <MapPin size={12} className="mr-1" />
            <span className="truncate max-w-20">{request.country}</span>
          </div>
          <div className="flex items-center text-xs text-sos-text-light">
            <MessageCircle size={12} className="mr-1" />
            {request.language}
          </div>
          {request.urgencyLevel && (
            <div className="flex items-center text-xs text-red-600">
              <AlertCircle size={12} className="mr-1" />
              Urgent
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {request.estimatedDuration && (
            <span className="text-xs text-sos-text-light">
              ~{request.estimatedDuration}min
            </span>
          )}
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getRoleColor(request.expertRole)}`}>
            <span className="mr-1">{getRoleIcon(request.expertRole)}</span>
            {request.expertRole === 'avocat' ? 'Avocat' : 'Expert'}
          </div>
        </div>
      </div>

      {/* Actions rapides en hover */}
      {showQuickActions && isHovered && (
        <div className="absolute bottom-4 right-4">
          <QuickActions />
        </div>
      )}

      {/* Effet de survol */}
      <div className={`absolute inset-0 bg-gradient-to-r from-sos-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-sos`} />
    </div>
  );
}

// Styles CSS à ajouter
const cardStyles = `
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.active\\:scale-\\[0\\.98\\]:active {
  transform: scale(0.98);
}
`;
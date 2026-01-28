import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MapPin, Star, Clock } from 'lucide-react';
import { useMobileBooking } from '../context/MobileBookingContext';
import { useIntl } from 'react-intl';

interface ProviderMiniCardProps {
  className?: string;
}

export const ProviderMiniCard: React.FC<ProviderMiniCardProps> = ({ className = '' }) => {
  const intl = useIntl();
  const { provider, isLawyer, displayEUR, displayDuration } = useMobileBooking();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!provider) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Compact header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center gap-3 touch-manipulation"
        aria-expanded={isExpanded}
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-red-200 bg-white flex-shrink-0">
          {provider.avatar ? (
            <img
              src={provider.avatar}
              alt={provider.name || 'Provider'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
              <span className="text-red-500 text-lg font-bold">
                {provider.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {provider.name || '---'}
            </h3>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                isLawyer
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {isLawyer ? 'Avocat' : 'Expat'}
            </span>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3" />
            {provider.country || '---'}
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-extrabold text-red-600">
            {displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            {displayDuration} min
          </div>
        </div>

        {/* Expand icon */}
        <div className="ml-1 text-gray-400">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Expandable details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-gray-100">
              <div className="pt-3 space-y-3">
                {/* Rating */}
                {provider.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-gray-800">
                        {provider.rating.toFixed(1)}
                      </span>
                    </div>
                    {provider.reviewCount && (
                      <span className="text-xs text-gray-500">
                        ({provider.reviewCount} avis)
                      </span>
                    )}
                  </div>
                )}

                {/* Languages */}
                {provider.languages && provider.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {provider.languages.slice(0, 4).map((lang, idx) => (
                      <span
                        key={`${lang}-${idx}`}
                        className="px-2 py-0.5 bg-blue-50 text-blue-800 text-xs rounded-full border border-blue-200"
                      >
                        {lang}
                      </span>
                    ))}
                    {provider.languages.length > 4 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{provider.languages.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Specialties */}
                {provider.specialties && provider.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {provider.specialties.slice(0, 3).map((spec, idx) => (
                      <span
                        key={`${spec}-${idx}`}
                        className="px-2 py-0.5 bg-purple-50 text-purple-800 text-xs rounded-full border border-purple-200"
                      >
                        {spec}
                      </span>
                    ))}
                    {provider.specialties.length > 3 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{provider.specialties.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Satisfaction guarantee */}
                <div className="text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-200">
                  {intl.formatMessage({
                    id: 'bookingRequest.satisfied',
                    defaultMessage: 'Expert indisponible = remboursement automatique',
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProviderMiniCard;

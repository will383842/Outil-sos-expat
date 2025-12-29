// src/components/providers/IncomingCallNotification.tsx
// Composant d'affichage pour les appels entrants (prestataires)
// =============================================================================

import React, { useEffect, useState } from 'react';
import { Phone, PhoneIncoming, User, Clock, Volume2, VolumeX, Vibrate } from 'lucide-react';

interface IncomingCall {
  id: string;
  clientId: string;
  clientName?: string;
  serviceType: string;
  status: string;
  createdAt?: { toDate: () => Date };
}

interface IncomingCallNotificationProps {
  call: IncomingCall;
  onAnswer?: () => void;
  onDecline?: () => void;
  isSoundEnabled: boolean;
  isVibrationEnabled: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  call,
  onAnswer,
  onDecline,
  isSoundEnabled,
  isVibrationEnabled,
  onToggleSound,
  onToggleVibration,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer pour afficher le temps écoulé
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.id]);

  // Reset le timer quand l'appel change
  useEffect(() => {
    setElapsedSeconds(0);
  }, [call.id]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-bounce-in">
        {/* Header animé */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-3 rounded-full animate-ring">
                <PhoneIncoming size={32} className="text-white" />
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold">Appel entrant</h2>
                <p className="text-green-100 text-sm">
                  {call.serviceType === 'lawyer' ? 'Service juridique' : 'Service expatrié'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-white">
                <Clock size={16} className="mr-1" />
                <span className="font-mono">{formatTime(elapsedSeconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informations client */}
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="bg-gray-100 p-4 rounded-full">
              <User size={40} className="text-gray-500" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {call.clientName || 'Client'}
              </h3>
              <p className="text-sm text-gray-500">
                ID: {call.clientId.substring(0, 8)}...
              </p>
            </div>
          </div>

          {/* Contrôles son/vibration */}
          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={onToggleSound}
              className={`p-3 rounded-full border-2 transition-all ${
                isSoundEnabled
                  ? 'border-green-500 bg-green-50 text-green-600'
                  : 'border-gray-300 bg-gray-50 text-gray-400'
              }`}
              title={isSoundEnabled ? 'Désactiver le son' : 'Activer le son'}
            >
              {isSoundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
            <button
              onClick={onToggleVibration}
              className={`p-3 rounded-full border-2 transition-all ${
                isVibrationEnabled
                  ? 'border-green-500 bg-green-50 text-green-600'
                  : 'border-gray-300 bg-gray-50 text-gray-400'
              }`}
              title={isVibrationEnabled ? 'Désactiver la vibration' : 'Activer la vibration'}
            >
              <Vibrate size={24} />
            </button>
          </div>

          {/* Message */}
          <p className="text-center text-gray-600 mb-6">
            Veuillez répondre à l'appel pour être connecté avec le client.
            L'appel sera automatiquement transféré sur votre téléphone.
          </p>

          {/* Boutons d'action */}
          <div className="grid grid-cols-2 gap-4">
            {onDecline && (
              <button
                onClick={onDecline}
                className="flex items-center justify-center py-4 px-6 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Phone size={20} className="mr-2 rotate-135" />
                Refuser
              </button>
            )}
            {onAnswer && (
              <button
                onClick={onAnswer}
                className="flex items-center justify-center py-4 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors animate-pulse"
              >
                <Phone size={20} className="mr-2" />
                Répondre
              </button>
            )}
            {!onAnswer && !onDecline && (
              <div className="col-span-2 text-center py-4 px-6 bg-yellow-50 text-yellow-800 rounded-xl">
                <p className="flex items-center justify-center">
                  <Phone size={20} className="mr-2 animate-bounce" />
                  En attente de connexion...
                </p>
                <p className="text-sm mt-1">
                  Votre téléphone va sonner sous peu
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 text-center">
          <p className="text-xs text-gray-500">
            Session ID: {call.id.substring(0, 12)}...
          </p>
        </div>
      </div>

      {/* Styles pour l'animation */}
      <style>{`
        @keyframes bounce-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes ring {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(20deg);
          }
          75% {
            transform: rotate(-20deg);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }

        .animate-ring {
          animation: ring 0.5s ease-in-out infinite;
        }

        .rotate-135 {
          transform: rotate(135deg);
        }
      `}</style>
    </div>
  );
};

export default IncomingCallNotification;

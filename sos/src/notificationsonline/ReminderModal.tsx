import React, { useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useIntl } from 'react-intl';
import { playAvailabilityReminder } from './playAvailabilityReminder';
import voiceMessages from './voiceTranslateMessages';
import Modal from '../components/common/Modal';
import type { ReminderType } from '../hooks/useProviderReminderSystem';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoOffline: () => void;
  onDisableReminderToday: () => void;
  langCode: string;
  reminderType?: ReminderType;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onGoOffline,
  onDisableReminderToday,
  langCode,
  reminderType = 'first',
}) => {
  const intl = useIntl();
  const isSecondReminder = reminderType === 'second';

  useEffect(() => {
    if (isOpen) {
      // Jouer un son quand le modal s'ouvre pour attirer l'attention
      playAvailabilityReminder('sound', {
        enableSound: true,
        enableVoice: false,
        enableModal: true,
      }, langCode);
    }
  }, [isOpen, langCode]);

  // Message selon le type de rappel
  const message = isSecondReminder
    ? intl.formatMessage({ id: 'availability.reminder.warningMessage' })
    : (voiceMessages[langCode] || voiceMessages['en']);

  // Titre selon le type de rappel
  const title = isSecondReminder
    ? `⚠️ ${intl.formatMessage({ id: 'availability.reminder.warningTitle' })}`
    : `🔔 ${intl.formatMessage({ id: 'availability.reminder.title' })}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
    >
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className={`rounded-full p-3 ${isSecondReminder ? 'bg-orange-100' : 'bg-blue-100'}`}>
            {isSecondReminder ? (
              <AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />
            ) : (
              <Bell className="h-6 w-6 text-blue-600" aria-hidden="true" />
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-sm sm:text-base leading-relaxed">
          {message}
        </p>

        {/* Avertissement supplémentaire pour le deuxième rappel */}
        {isSecondReminder && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-orange-700 text-sm font-medium">
              {intl.formatMessage({ id: 'availability.reminder.autoOfflineWarning' })}
            </p>
          </div>
        )}

        <div className="flex flex-col space-y-3 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>{intl.formatMessage({ id: 'availability.reminder.actions.stayOnline' })}</span>
          </button>

          <button
            onClick={onGoOffline}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <span>❌</span>
            <span>{intl.formatMessage({ id: 'availability.reminder.actions.goOffline' })}</span>
          </button>

          <button
            onClick={onDisableReminderToday}
            className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
          >
            <span>🔕</span>
            <span>{intl.formatMessage({ id: 'availability.reminder.actions.disableToday' })}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReminderModal;


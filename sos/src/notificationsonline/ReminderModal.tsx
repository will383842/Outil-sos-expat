import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playAvailabilityReminder } from './playAvailabilityReminder';
import voiceMessages from './voiceTranslateMessages';
import Modal from '../components/common/Modal';
import i18n from '../config/i18n';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoOffline: () => void;
  onDisableReminderToday: () => void;
  langCode: string;
}

// Map langCode to i18next supported languages (all 9 project languages)
const mapLangCodeToI18n = (langCode: string): 'fr' | 'en' | 'es' | 'ru' | 'de' | 'hi' | 'pt' | 'ch' | 'ar' => {
  // Supported languages in the project
  const supportedLanguages = ['fr', 'en', 'es', 'ru', 'de', 'hi', 'pt', 'ch', 'ar'];
  
  // If it's a supported language, use it directly
  if (supportedLanguages.includes(langCode)) {
    return langCode as 'fr' | 'en' | 'es' | 'ru' | 'de' | 'hi' | 'pt' | 'ch' | 'ar';
  }
  // For other languages, default to English
  return 'en';
};

const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onGoOffline,
  onDisableReminderToday,
  langCode
}) => {
  // Map langCode to i18next language and set it
  const i18nLang = mapLangCodeToI18n(langCode);
  const { t } = useTranslation();

  // Update i18n language when langCode changes
  useEffect(() => {
    if (i18n.language !== i18nLang) {
      i18n.changeLanguage(i18nLang);
    }
  }, [i18nLang]);

  useEffect(() => {
    if (isOpen) {
      playAvailabilityReminder(langCode);
    }
  }, [isOpen, langCode]);

  const message = voiceMessages[langCode] || voiceMessages['en'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🔔 ${t('availability.reminder.title')}`}
      size="small"
    >
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-3">
            <Bell className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
        </div>

        <p className="text-center text-gray-700 text-sm sm:text-base leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col space-y-3 pt-4">
          <button
            onClick={onClose}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>{t('availability.reminder.actions.stayOnline')}</span>
          </button>

          <button
            onClick={onGoOffline}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <span>❌</span>
            <span>{t('availability.reminder.actions.goOffline')}</span>
          </button>

          <button
            onClick={onDisableReminderToday}
            className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
          >
            <span>🔕</span>
            <span>{t('availability.reminder.actions.disableToday')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReminderModal;


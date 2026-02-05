/**
 * Add Provider Modal
 * Displays info about adding providers (managed through SOS Admin)
 */
import { useTranslation } from 'react-i18next';
import { UserPlus, ExternalLink } from 'lucide-react';
import { Modal, ModalFooter, Button } from '../ui';

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProviderModal({ isOpen, onClose }: AddProviderModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('add_provider.title')} size="md">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-primary-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('add_provider.heading')}
        </h3>

        <p className="text-gray-600 mb-6">
          {t('add_provider.description')}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
          <h4 className="font-medium text-gray-900 mb-2">{t('add_provider.how_to_title')}</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>{t('add_provider.step1')}</li>
            <li>{t('add_provider.step2')}</li>
            <li>{t('add_provider.step3')}</li>
          </ol>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          variant="primary"
          rightIcon={<ExternalLink className="w-4 h-4" />}
          onClick={() => window.open('mailto:support@sos-expat.com', '_blank')}
        >
          {t('common.contact_support')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Add Provider Modal
 * Displays info about adding providers (managed through SOS Admin)
 */
import { UserPlus, ExternalLink } from 'lucide-react';
import { Modal, ModalFooter, Button } from '../ui';

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProviderModal({ isOpen, onClose }: AddProviderModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un prestataire" size="md">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-primary-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gestion des prestataires
        </h3>

        <p className="text-gray-600 mb-6">
          L'ajout et la gestion des prestataires se fait via le portail SOS Expats Admin.
          Contactez l'administrateur pour ajouter de nouveaux membres à votre équipe.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Pour ajouter un prestataire :</h4>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Contactez l'administrateur SOS Expats</li>
            <li>Fournissez les informations du nouveau prestataire</li>
            <li>Une fois ajouté, il apparaîtra automatiquement dans votre équipe</li>
          </ol>
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
        <Button
          variant="primary"
          rightIcon={<ExternalLink className="w-4 h-4" />}
          onClick={() => window.open('mailto:support@sos-expat.com', '_blank')}
        >
          Contacter le support
        </Button>
      </ModalFooter>
    </Modal>
  );
}

import React from "react";
import Modal from "../common/Modal";
import ReviewForm from "./ReviewForm";
import { useIntl } from "react-intl";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  providerId: string;
  providerName: string;
  callId: string;
  serviceType: "lawyer_call" | "expat_call";
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providerId,
  providerName,
  callId,
  serviceType,
}) => {
  const intl = useIntl();
  const handleSuccess = () => {
    // Appeler le callback de succès si fourni, sinon fermer simplement
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: "dashboard.leaveReview" })}
      size="medium"
    >
      <ReviewForm
        providerId={providerId}
        providerName={providerName}
        callId={callId}
        serviceType={serviceType}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default ReviewModal;

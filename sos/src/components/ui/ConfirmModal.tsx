import React from "react";
import { Shield, X } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  cancelLabel = "Annuler",
  confirmLabel = "Confirmer",
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-x-0 top-20 bottom-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop - clickable to close - starts below header to not block header interactions */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm touch-manipulation"
        onClick={onCancel}
        onTouchEnd={(e) => { e.stopPropagation(); onCancel(); }}
        role="button"
        aria-label="Close dialog"
        tabIndex={-1}
      />
      {/* Modal content */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border mx-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="font-semibold text-gray-900 mb-1 text-base">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            onTouchEnd={(e) => { e.preventDefault(); onCancel(); }}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 -mr-1 -mt-1"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            onTouchEnd={(e) => { e.preventDefault(); onCancel(); }}
            className="px-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            onTouchEnd={(e) => { e.preventDefault(); onConfirm(); }}
            className="px-4 py-3 min-h-[48px] rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 touch-manipulation transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmModal };
export default ConfirmModal;

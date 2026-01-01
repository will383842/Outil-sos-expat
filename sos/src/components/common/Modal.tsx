import React, { ReactNode, memo, useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large';
  /** Label for close button (i18n) */
  closeLabel?: string;
}

// OPTIMISÉ: Constante hors du composant pour éviter re-création
const sizeClasses = {
  small: 'max-w-md',
  medium: 'max-w-2xl',
  large: 'max-w-4xl'
} as const;

// OPTIMISÉ: memo() pour éviter re-renders inutiles
const Modal: React.FC<ModalProps> = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeLabel = 'Close'
}) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const wasOpenRef = useRef(false);

  // Keep onClose ref updated without triggering useEffect
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus trap and restore focus on close
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Modal just opened - store previously focused element and focus modal
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      // Modal just closed - restore focus
      previousFocusRef.current?.focus();
      wasOpenRef.current = false;
    }

    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Handle Escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`bg-white rounded-lg ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden focus:outline-none`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id={titleId} className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label={closeLabel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
});

export default Modal;


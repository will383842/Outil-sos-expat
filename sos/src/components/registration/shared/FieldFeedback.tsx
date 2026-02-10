import React from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface FieldErrorProps {
  error?: string;
  show: boolean;
  id?: string;
}

export const FieldError = React.memo(({ error, show, id }: FieldErrorProps) => {
  return (
    <AnimatePresence>
      {show && error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"
          role="alert"
          id={id}
        >
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FieldError.displayName = 'FieldError';

interface FieldSuccessProps {
  show: boolean;
  message: string;
  id?: string;
}

export const FieldSuccess = React.memo(({ show, message, id }: FieldSuccessProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2"
          role="status"
          aria-live="polite"
          id={id}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FieldSuccess.displayName = 'FieldSuccess';

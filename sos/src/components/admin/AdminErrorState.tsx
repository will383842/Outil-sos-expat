// src/components/admin/AdminErrorState.tsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  className?: string;
}

const AdminErrorState: React.FC<AdminErrorStateProps> = ({ error, onRetry, className }) => {
  if (!error) return null;

  return (
    <div className={cn('bg-red-50 border border-red-200 rounded-xl p-4', className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminErrorState;

/**
 * useGroupAdminWithdrawal - Hook for managing withdrawals
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  RequestWithdrawalRequest,
} from '@/types/groupAdmin';

interface WithdrawalResult {
  success: boolean;
  withdrawalId: string;
  amount: number;
  estimatedProcessingTime: string;
}

interface UseGroupAdminWithdrawalReturn {
  isSubmitting: boolean;
  error: string | null;
  result: WithdrawalResult | null;
  requestWithdrawal: (request: RequestWithdrawalRequest) => Promise<WithdrawalResult>;
  clearError: () => void;
  clearResult: () => void;
}

export function useGroupAdminWithdrawal(): UseGroupAdminWithdrawalReturn {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawalResult | null>(null);

  const requestWithdrawal = useCallback(async (
    request: RequestWithdrawalRequest
  ): Promise<WithdrawalResult> => {
    // User authentication check
    if (!user) {
      const errorMessage = 'User not authenticated';
      console.error(errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (user.role !== 'groupAdmin') {
      const errorMessage = 'User is not authorized to request withdrawals';
      console.error(errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const submitWithdrawal = httpsCallable(functions, 'requestGroupAdminWithdrawal');
      const response = await submitWithdrawal(request);
      const data = response.data as WithdrawalResult;

      setResult(data);
      return data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      const errorMessage = error.message || 'Failed to submit withdrawal request';
      console.error('Withdrawal request failed:', errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    isSubmitting,
    error,
    result,
    requestWithdrawal,
    clearError,
    clearResult,
  };
}

export default useGroupAdminWithdrawal;

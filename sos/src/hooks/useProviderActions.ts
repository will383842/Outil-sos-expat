/**
 * useProviderActions Hook
 *
 * Hook for provider management actions (admin operations).
 * Calls: hideProvider, blockProvider, suspendProvider, bulkHideProviders, etc.
 *
 * @module hooks/useProviderActions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Provider action types
 */
export type ProviderActionType =
  | 'hide'
  | 'unhide'
  | 'block'
  | 'unblock'
  | 'suspend'
  | 'unsuspend'
  | 'delete';

/**
 * Suspension reason types
 */
export type SuspensionReason =
  | 'policy_violation'
  | 'fraud'
  | 'complaint'
  | 'kyc_issue'
  | 'payment_issue'
  | 'other';

/**
 * Action input for single provider
 */
export interface ProviderActionInput {
  providerId: string;
  reason?: string;
  notes?: string;
}

/**
 * Suspension input with additional fields
 */
export interface SuspensionInput extends ProviderActionInput {
  suspensionReason: SuspensionReason;
  suspensionDays?: number; // Optional: auto-unsuspend after N days
  notifyProvider?: boolean;
}

/**
 * Block input with additional fields
 */
export interface BlockInput extends ProviderActionInput {
  permanent: boolean;
  preventReregistration?: boolean;
}

/**
 * Bulk action input
 */
export interface BulkActionInput {
  providerIds: string[];
  reason?: string;
  notes?: string;
}

/**
 * Bulk suspension input
 */
export interface BulkSuspensionInput extends BulkActionInput {
  suspensionReason: SuspensionReason;
  suspensionDays?: number;
  notifyProviders?: boolean;
}

/**
 * Bulk block input
 */
export interface BulkBlockInput extends BulkActionInput {
  permanent: boolean;
  preventReregistration?: boolean;
}

/**
 * Action result
 */
export interface ActionResult {
  success: boolean;
  providerId?: string;
  error?: string;
  message?: string;
}

/**
 * Bulk action result
 */
export interface BulkActionResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: ActionResult[];
}

/**
 * Action loading states
 */
export interface ActionLoadingStates {
  hide: boolean;
  unhide: boolean;
  block: boolean;
  unblock: boolean;
  suspend: boolean;
  unsuspend: boolean;
  delete: boolean;
  bulkHide: boolean;
  bulkUnhide: boolean;
  bulkBlock: boolean;
  bulkUnblock: boolean;
  bulkSuspend: boolean;
  bulkUnsuspend: boolean;
  bulkDelete: boolean;
}

/**
 * Hook return type
 */
export interface UseProviderActionsReturn {
  /** Hide a provider from public listings */
  hide: (input: ProviderActionInput) => Promise<ActionResult>;
  /** Unhide a provider */
  unhide: (input: ProviderActionInput) => Promise<ActionResult>;
  /** Block a provider (severe action) */
  block: (input: BlockInput) => Promise<ActionResult>;
  /** Unblock a provider */
  unblock: (input: ProviderActionInput) => Promise<ActionResult>;
  /** Suspend a provider (temporary) */
  suspend: (input: SuspensionInput) => Promise<ActionResult>;
  /** Unsuspend a provider */
  unsuspend: (input: ProviderActionInput) => Promise<ActionResult>;
  /** Delete a provider (permanent) */
  deleteProvider: (input: ProviderActionInput) => Promise<ActionResult>;
  /** Bulk hide providers */
  bulkHide: (input: BulkActionInput) => Promise<BulkActionResult>;
  /** Bulk unhide providers */
  bulkUnhide: (input: BulkActionInput) => Promise<BulkActionResult>;
  /** Bulk block providers */
  bulkBlock: (input: BulkBlockInput) => Promise<BulkActionResult>;
  /** Bulk unblock providers */
  bulkUnblock: (input: BulkActionInput) => Promise<BulkActionResult>;
  /** Bulk suspend providers */
  bulkSuspend: (input: BulkSuspensionInput) => Promise<BulkActionResult>;
  /** Bulk unsuspend providers */
  bulkUnsuspend: (input: BulkActionInput) => Promise<BulkActionResult>;
  /** Bulk delete providers */
  bulkDelete: (input: BulkActionInput) => Promise<BulkActionResult>;
  /** Loading states for each action */
  isLoading: ActionLoadingStates;
  /** Overall loading state (any action in progress) */
  isAnyLoading: boolean;
  /** Last action result */
  lastResult: ActionResult | BulkActionResult | null;
  /** Last error */
  lastError: Error | null;
  /** Clear last result/error */
  clearResult: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_LOADING_STATES: ActionLoadingStates = {
  hide: false,
  unhide: false,
  block: false,
  unblock: false,
  suspend: false,
  unsuspend: false,
  delete: false,
  bulkHide: false,
  bulkUnhide: false,
  bulkBlock: false,
  bulkUnblock: false,
  bulkSuspend: false,
  bulkUnsuspend: false,
  bulkDelete: false,
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useProviderActions(): UseProviderActionsReturn {
  // State
  const [isLoading, setIsLoading] = useState<ActionLoadingStates>(INITIAL_LOADING_STATES);
  const [lastResult, setLastResult] = useState<ActionResult | BulkActionResult | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Refs
  const isMounted = useRef(true);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Helper to update loading state
  const setLoadingState = useCallback((action: keyof ActionLoadingStates, loading: boolean) => {
    if (!isMounted.current) return;
    setIsLoading((prev) => ({ ...prev, [action]: loading }));
  }, []);

  // Generic single action handler
  const executeSingleAction = useCallback(
    async <T extends ProviderActionInput>(
      functionName: string,
      action: keyof ActionLoadingStates,
      input: T
    ): Promise<ActionResult> => {
      setLoadingState(action, true);
      setLastError(null);

      try {
        const callable = httpsCallable<T, ActionResult>(functions, functionName);
        const result = await callable(input);

        if (isMounted.current) {
          setLastResult(result.data);
        }

        return result.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`Failed to ${action} provider`);
        console.error(`[useProviderActions] ${action} error:`, err);

        if (isMounted.current) {
          setLastError(error);
          setLastResult({
            success: false,
            providerId: input.providerId,
            error: error.message,
          });
        }

        return {
          success: false,
          providerId: input.providerId,
          error: error.message,
        };
      } finally {
        if (isMounted.current) {
          setLoadingState(action, false);
        }
      }
    },
    [setLoadingState]
  );

  // Generic bulk action handler
  const executeBulkAction = useCallback(
    async <T extends BulkActionInput>(
      functionName: string,
      action: keyof ActionLoadingStates,
      input: T
    ): Promise<BulkActionResult> => {
      setLoadingState(action, true);
      setLastError(null);

      try {
        const callable = httpsCallable<T, BulkActionResult>(functions, functionName);
        const result = await callable(input);

        if (isMounted.current) {
          setLastResult(result.data);
        }

        return result.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(`Failed to bulk ${action} providers`);
        console.error(`[useProviderActions] bulk ${action} error:`, err);

        if (isMounted.current) {
          setLastError(error);
          setLastResult({
            success: false,
            total: input.providerIds.length,
            succeeded: 0,
            failed: input.providerIds.length,
            results: input.providerIds.map((id) => ({
              success: false,
              providerId: id,
              error: error.message,
            })),
          });
        }

        return {
          success: false,
          total: input.providerIds.length,
          succeeded: 0,
          failed: input.providerIds.length,
          results: input.providerIds.map((id) => ({
            success: false,
            providerId: id,
            error: error.message,
          })),
        };
      } finally {
        if (isMounted.current) {
          setLoadingState(action, false);
        }
      }
    },
    [setLoadingState]
  );

  // Single provider actions
  const hide = useCallback(
    (input: ProviderActionInput): Promise<ActionResult> => {
      return executeSingleAction('hideProvider', 'hide', input);
    },
    [executeSingleAction]
  );

  const unhide = useCallback(
    (input: ProviderActionInput): Promise<ActionResult> => {
      return executeSingleAction('unhideProvider', 'unhide', input);
    },
    [executeSingleAction]
  );

  const block = useCallback(
    (input: BlockInput): Promise<ActionResult> => {
      return executeSingleAction('blockProvider', 'block', input);
    },
    [executeSingleAction]
  );

  const unblock = useCallback(
    (input: ProviderActionInput): Promise<ActionResult> => {
      return executeSingleAction('unblockProvider', 'unblock', input);
    },
    [executeSingleAction]
  );

  const suspend = useCallback(
    (input: SuspensionInput): Promise<ActionResult> => {
      return executeSingleAction('suspendProvider', 'suspend', input);
    },
    [executeSingleAction]
  );

  const unsuspend = useCallback(
    (input: ProviderActionInput): Promise<ActionResult> => {
      return executeSingleAction('unsuspendProvider', 'unsuspend', input);
    },
    [executeSingleAction]
  );

  const deleteProvider = useCallback(
    (input: ProviderActionInput): Promise<ActionResult> => {
      return executeSingleAction('deleteProvider', 'delete', input);
    },
    [executeSingleAction]
  );

  // Bulk provider actions
  const bulkHide = useCallback(
    (input: BulkActionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkHideProviders', 'bulkHide', input);
    },
    [executeBulkAction]
  );

  const bulkUnhide = useCallback(
    (input: BulkActionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkUnhideProviders', 'bulkUnhide', input);
    },
    [executeBulkAction]
  );

  const bulkBlock = useCallback(
    (input: BulkBlockInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkBlockProviders', 'bulkBlock', input);
    },
    [executeBulkAction]
  );

  const bulkUnblock = useCallback(
    (input: BulkActionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkUnblockProviders', 'bulkUnblock', input);
    },
    [executeBulkAction]
  );

  const bulkSuspend = useCallback(
    (input: BulkSuspensionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkSuspendProviders', 'bulkSuspend', input);
    },
    [executeBulkAction]
  );

  const bulkUnsuspend = useCallback(
    (input: BulkActionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkUnsuspendProviders', 'bulkUnsuspend', input);
    },
    [executeBulkAction]
  );

  const bulkDelete = useCallback(
    (input: BulkActionInput): Promise<BulkActionResult> => {
      return executeBulkAction('bulkDeleteProviders', 'bulkDelete', input);
    },
    [executeBulkAction]
  );

  // Clear result
  const clearResult = useCallback(() => {
    setLastResult(null);
    setLastError(null);
  }, []);

  // Check if any action is loading
  const isAnyLoading = Object.values(isLoading).some((v) => v);

  return {
    hide,
    unhide,
    block,
    unblock,
    suspend,
    unsuspend,
    deleteProvider,
    bulkHide,
    bulkUnhide,
    bulkBlock,
    bulkUnblock,
    bulkSuspend,
    bulkUnsuspend,
    bulkDelete,
    isLoading,
    isAnyLoading,
    lastResult,
    lastError,
    clearResult,
  };
}

export default useProviderActions;

/**
 * Payment Service - Main Entry Point for Withdrawal Operations
 *
 * This service orchestrates the entire withdrawal lifecycle for all user types:
 * - Chatter, Influencer, Blogger
 *
 * Features:
 * - User payment method management (save, get, delete)
 * - Withdrawal request lifecycle (create, approve, reject, process, complete, fail)
 * - Support for manual and automatic payment modes
 * - Full audit trail with status history
 * - Firestore transactions for data consistency
 *
 * Providers:
 * - Wise: International bank transfers
 * - Flutterwave: Mobile Money for Africa
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  WithdrawalRequest,
  WithdrawalStatus,
  PaymentUserType,
  UserPaymentMethod,
  PaymentConfig,
  StatusHistoryEntry,
  BankTransferDetails,
  MobileMoneyDetails,
  PaymentProvider,
  PaymentMethodType,
  ProviderTransactionResult,
  DEFAULT_PAYMENT_CONFIG,
} from '../types';
import { createPaymentRouter } from './paymentRouter';

// ============================================================================
// COLLECTION PATHS
// ============================================================================

/**
 * Firestore collection paths for payment-related documents
 */
export const COLLECTIONS = {
  /** All withdrawal requests from all user types */
  WITHDRAWALS: 'payment_withdrawals',
  /** User payment methods (bank accounts, mobile money) */
  PAYMENT_METHODS: 'payment_methods',
  /** System-wide payment configuration */
  PAYMENT_CONFIG: 'payment_config',
  /** User-type specific collections for balance management */
  CHATTERS: 'chatters',
  INFLUENCERS: 'influencers',
  BLOGGERS: 'bloggers',
  GROUP_ADMINS: 'group_admins',
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================

interface SavePaymentMethodParams {
  userId: string;
  userType: PaymentUserType;
  details: BankTransferDetails | MobileMoneyDetails;
  setAsDefault?: boolean;
}

interface CreateWithdrawalParams {
  userId: string;
  userType: PaymentUserType;
  userEmail: string;
  userName: string;
  amount: number;
  paymentMethodId: string;
}

interface GetUserWithdrawalsOptions {
  limit?: number;
  status?: WithdrawalStatus[];
}

interface GetPendingWithdrawalsOptions {
  userType?: PaymentUserType;
  limit?: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// PAYMENT SERVICE CLASS
// ============================================================================

/**
 * Main Payment Service that orchestrates all withdrawal operations.
 *
 * This service handles:
 * - User payment method CRUD operations
 * - Withdrawal request creation and lifecycle management
 * - Admin operations (approve, reject, process)
 * - Configuration management
 *
 * @example
 * ```typescript
 * const service = getPaymentService();
 *
 * // Save a payment method
 * const method = await service.savePaymentMethod({
 *   userId: 'user123',
 *   userType: 'chatter',
 *   details: {
 *     type: 'mobile_money',
 *     provider: 'orange_money',
 *     phoneNumber: '+221771234567',
 *     country: 'SN',
 *     accountName: 'John Doe',
 *     currency: 'XOF',
 *   },
 *   setAsDefault: true,
 * });
 *
 * // Create a withdrawal request
 * const withdrawal = await service.createWithdrawalRequest({
 *   userId: 'user123',
 *   userType: 'chatter',
 *   userEmail: 'john@example.com',
 *   userName: 'John Doe',
 *   amount: 10000, // $100 in cents
 *   paymentMethodId: method.id,
 * });
 * ```
 */
export class PaymentService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = getFirestore();
  }

  // ==========================================================================
  // USER PAYMENT METHODS
  // ==========================================================================

  /**
   * Save a user's payment method.
   *
   * Determines the provider (Wise or Flutterwave) based on payment type.
   * Optionally sets as default payment method.
   *
   * @param params - Payment method parameters
   * @returns The created UserPaymentMethod
   */
  async savePaymentMethod(params: SavePaymentMethodParams): Promise<UserPaymentMethod> {
    const { userId, userType, details, setAsDefault = false } = params;

    logger.info('[PaymentService.savePaymentMethod] Saving payment method', {
      userId,
      userType,
      type: details.type,
      setAsDefault,
    });

    // Determine provider based on payment type
    const provider: PaymentProvider = details.type === 'bank_transfer' ? 'wise' : 'flutterwave';
    const methodType: PaymentMethodType = details.type;

    // Check for existing matching payment method to avoid duplicates
    const existingMethod = await this.findMatchingPaymentMethod(userId, userType, details);
    if (existingMethod) {
      logger.info('[PaymentService.savePaymentMethod] Reusing existing payment method', {
        methodId: existingMethod.id,
        userId,
        userType,
      });

      // Update default status if needed
      if (setAsDefault && !existingMethod.isDefault) {
        const now = new Date().toISOString();
        await this.db.runTransaction(async (transaction) => {
          // Unset other defaults
          const existingDefaults = await this.db
            .collection(COLLECTIONS.PAYMENT_METHODS)
            .where('userId', '==', userId)
            .where('userType', '==', userType)
            .where('isDefault', '==', true)
            .get();

          for (const doc of existingDefaults.docs) {
            transaction.update(doc.ref, { isDefault: false, updatedAt: now });
          }

          // Set this one as default
          transaction.update(
            this.db.collection(COLLECTIONS.PAYMENT_METHODS).doc(existingMethod.id),
            { isDefault: true, updatedAt: now }
          );
        });
        existingMethod.isDefault = true;
      }

      return existingMethod;
    }

    const now = new Date().toISOString();
    const methodRef = this.db.collection(COLLECTIONS.PAYMENT_METHODS).doc();

    const paymentMethod: UserPaymentMethod = {
      id: methodRef.id,
      userId,
      userType,
      provider,
      methodType,
      details,
      isDefault: setAsDefault,
      isVerified: false, // Can be verified later
      createdAt: now,
      updatedAt: now,
    };

    await this.db.runTransaction(async (transaction) => {
      // If setting as default, unset any existing defaults
      if (setAsDefault) {
        const existingDefaults = await this.db
          .collection(COLLECTIONS.PAYMENT_METHODS)
          .where('userId', '==', userId)
          .where('userType', '==', userType)
          .where('isDefault', '==', true)
          .get();

        for (const doc of existingDefaults.docs) {
          transaction.update(doc.ref, { isDefault: false, updatedAt: now });
        }
      }

      // Create the new payment method
      transaction.set(methodRef, paymentMethod);
    });

    logger.info('[PaymentService.savePaymentMethod] Payment method saved', {
      methodId: methodRef.id,
      userId,
      userType,
      provider,
    });

    return paymentMethod;
  }

  /**
   * Find an existing payment method matching the same details to avoid duplicates.
   *
   * @private
   */
  private async findMatchingPaymentMethod(
    userId: string,
    userType: PaymentUserType,
    details: BankTransferDetails | MobileMoneyDetails
  ): Promise<UserPaymentMethod | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.PAYMENT_METHODS)
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .where('methodType', '==', details.type)
      .get();

    if (snapshot.empty) {
      return null;
    }

    // Match on identifying field based on type
    for (const doc of snapshot.docs) {
      const existing = doc.data() as UserPaymentMethod;
      const existingDetails = existing.details;

      if (existingDetails.type !== details.type) continue;

      let isMatch = false;
      switch (details.type) {
        case 'mobile_money':
          isMatch = (existingDetails as MobileMoneyDetails).phoneNumber === details.phoneNumber
            && (existingDetails as MobileMoneyDetails).provider === details.provider;
          break;
        case 'bank_transfer':
          isMatch = (
            ((existingDetails as BankTransferDetails).iban && details.iban
              ? (existingDetails as BankTransferDetails).iban === details.iban
              : false) ||
            ((existingDetails as BankTransferDetails).accountNumber && details.accountNumber
              ? (existingDetails as BankTransferDetails).accountNumber === details.accountNumber
              : false)
          );
          break;
      }

      if (isMatch) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Get all payment methods for a user.
   *
   * @param userId - The user's ID
   * @param userType - The type of user
   * @returns Array of UserPaymentMethod
   */
  async getUserPaymentMethods(
    userId: string,
    userType: PaymentUserType
  ): Promise<UserPaymentMethod[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.PAYMENT_METHODS)
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as UserPaymentMethod);
  }

  /**
   * Get user's default payment method.
   *
   * @param userId - The user's ID
   * @param userType - The type of user
   * @returns The default UserPaymentMethod or null
   */
  async getDefaultPaymentMethod(
    userId: string,
    userType: PaymentUserType
  ): Promise<UserPaymentMethod | null> {
    const snapshot = await this.db
      .collection(COLLECTIONS.PAYMENT_METHODS)
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // If no default, return the most recent one
      const anyMethod = await this.db
        .collection(COLLECTIONS.PAYMENT_METHODS)
        .where('userId', '==', userId)
        .where('userType', '==', userType)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (anyMethod.empty) {
        return null;
      }

      return anyMethod.docs[0].data() as UserPaymentMethod;
    }

    return snapshot.docs[0].data() as UserPaymentMethod;
  }

  /**
   * Delete a payment method.
   *
   * @param userId - The user's ID (for authorization check)
   * @param paymentMethodId - The payment method ID to delete
   */
  async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    // Atomic transaction: read + verify ownership + delete
    // Prevents TOCTOU where state changes between check and delete
    await this.db.runTransaction(async (transaction) => {
      const methodRef = this.db.collection(COLLECTIONS.PAYMENT_METHODS).doc(paymentMethodId);
      const methodDoc = await transaction.get(methodRef);

      if (!methodDoc.exists) {
        throw new Error('Payment method not found');
      }

      const method = methodDoc.data() as UserPaymentMethod;

      if (method.userId !== userId) {
        throw new Error('Not authorized to delete this payment method');
      }

      transaction.delete(methodRef);
    });

    logger.info('[PaymentService.deletePaymentMethod] Payment method deleted', {
      paymentMethodId,
      userId,
    });
  }

  // ==========================================================================
  // WITHDRAWAL REQUESTS
  // ==========================================================================

  /**
   * Create a new withdrawal request.
   *
   * Validates the request, creates the withdrawal document, and updates user balance.
   *
   * @param params - Withdrawal parameters
   * @returns The created WithdrawalRequest
   */
  async createWithdrawalRequest(params: CreateWithdrawalParams): Promise<WithdrawalRequest> {
    const { userId, userType, userEmail, userName, amount, paymentMethodId } = params;

    logger.info('[PaymentService.createWithdrawalRequest] Creating withdrawal', {
      userId,
      userType,
      amount,
      paymentMethodId,
    });

    // 1. Validate the withdrawal request
    const validation = await this.validateWithdrawalRequest(userId, userType, amount);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. Get the payment method
    const methodDoc = await this.db
      .collection(COLLECTIONS.PAYMENT_METHODS)
      .doc(paymentMethodId)
      .get();

    if (!methodDoc.exists) {
      throw new Error('Payment method not found');
    }

    const paymentMethod = methodDoc.data() as UserPaymentMethod;

    if (paymentMethod.userId !== userId || paymentMethod.userType !== userType) {
      throw new Error('Payment method does not belong to this user');
    }

    // 3. Get config for processing mode
    const config = await this.getConfig();

    // Determine if automatic processing
    const isAutomatic =
      config.paymentMode === 'automatic' ||
      (config.paymentMode === 'hybrid' && amount <= config.autoPaymentThreshold);

    // 4. Create the withdrawal
    const now = new Date().toISOString();
    const withdrawalRef = this.db.collection(COLLECTIONS.WITHDRAWALS).doc();

    const initialStatus: WithdrawalStatus = 'pending';
    const initialHistory: StatusHistoryEntry = {
      status: initialStatus,
      timestamp: now,
      actor: userId,
      actorType: 'user',
      note: 'Withdrawal request submitted',
    };

    const withdrawal: WithdrawalRequest = {
      id: withdrawalRef.id,
      userId,
      userType,
      userEmail,
      userName,
      amount,
      sourceCurrency: 'USD',
      targetCurrency: paymentMethod.details.currency,
      paymentMethodId,
      provider: paymentMethod.provider,
      methodType: paymentMethod.methodType,
      paymentDetails: paymentMethod.details,
      status: initialStatus,
      statusHistory: [initialHistory],
      isAutomatic,
      retryCount: 0,
      maxRetries: config.maxRetries,
      requestedAt: now,
    };

    // 5. Execute in transaction (balance deduction + withdrawal creation atomic)
    await this.db.runTransaction(async (transaction) => {
      // Re-check for pending withdrawals INSIDE transaction to prevent race condition
      // where two concurrent requests both pass the pre-check
      const pendingCheck = await this.db
        .collection(COLLECTIONS.WITHDRAWALS)
        .where('userId', '==', userId)
        .where('userType', '==', userType)
        .where('status', 'in', ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'])
        .limit(1)
        .get();

      if (!pendingCheck.empty) {
        throw new Error('A withdrawal request is already pending');
      }

      // Deduct from user's available balance
      await this.deductUserBalance(userId, userType, amount, transaction);

      // Create withdrawal document
      transaction.set(withdrawalRef, withdrawal);
    });

    logger.info('[PaymentService.createWithdrawalRequest] Withdrawal created', {
      withdrawalId: withdrawalRef.id,
      userId,
      userType,
      amount,
      isAutomatic,
    });

    return withdrawal;
  }

  /**
   * Get a withdrawal by ID.
   *
   * @param withdrawalId - The withdrawal ID
   * @returns The WithdrawalRequest or null
   */
  async getWithdrawal(withdrawalId: string): Promise<WithdrawalRequest | null> {
    const doc = await this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as WithdrawalRequest;
  }

  /**
   * Get a user's withdrawals with optional filters.
   *
   * @param userId - The user's ID
   * @param userType - The type of user
   * @param options - Query options
   * @returns Array of WithdrawalRequest
   */
  async getUserWithdrawals(
    userId: string,
    userType: PaymentUserType,
    options?: GetUserWithdrawalsOptions
  ): Promise<WithdrawalRequest[]> {
    const { limit = 50, status } = options || {};

    let query: FirebaseFirestore.Query = this.db
      .collection(COLLECTIONS.WITHDRAWALS)
      .where('userId', '==', userId)
      .where('userType', '==', userType);

    if (status && status.length > 0) {
      query = query.where('status', 'in', status);
    }

    query = query.orderBy('requestedAt', 'desc').limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);
  }

  /**
   * Cancel a withdrawal (by user, only if pending).
   *
   * @param withdrawalId - The withdrawal ID
   * @param userId - The user's ID (for authorization)
   * @param reason - Optional cancellation reason
   */
  async cancelWithdrawal(withdrawalId: string, userId: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();

    // Atomic transaction: read withdrawal + verify status + update status + refund balance
    // Prevents double-refund race condition from concurrent cancellation requests
    await this.db.runTransaction(async (transaction) => {
      // 1. Read withdrawal INSIDE transaction
      const withdrawalRef = this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId);
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalDoc.data() as WithdrawalRequest;

      if (withdrawal.userId !== userId) {
        throw new Error('Not authorized to cancel this withdrawal');
      }

      if (withdrawal.status !== 'pending') {
        throw new Error(`Cannot cancel withdrawal with status: ${withdrawal.status}`);
      }

      // 2. Update withdrawal status to cancelled
      const historyEntry: StatusHistoryEntry = {
        status: 'cancelled',
        timestamp: now,
        actor: userId,
        actorType: 'user',
        note: reason || 'Cancelled by user',
      };

      transaction.update(withdrawalRef, {
        status: 'cancelled',
        statusHistory: FieldValue.arrayUnion(historyEntry),
      });

      // 3. Refund balance in the SAME transaction
      const collectionName = this.getUserCollectionName(withdrawal.userType);
      const userRef = this.db.collection(collectionName).doc(withdrawal.userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`${withdrawal.userType} not found`);
      }

      const userData = userDoc.data()!;
      const currentBalance = userData.availableBalance || 0;

      transaction.update(userRef, {
        availableBalance: currentBalance + withdrawal.amount,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info('[PaymentService.cancelWithdrawal] Withdrawal cancelled (atomic)', {
      withdrawalId,
      userId,
    });
  }

  // ==========================================================================
  // ADMIN OPERATIONS
  // ==========================================================================

  /**
   * Approve a withdrawal (manual mode).
   *
   * @param withdrawalId - The withdrawal ID
   * @param adminId - The admin's ID
   */
  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<void> {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'pending' && withdrawal.status !== 'validating') {
      throw new Error(`Cannot approve withdrawal with status: ${withdrawal.status}`);
    }

    // Block approval if Telegram confirmation is still pending
    const freshDoc = await this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId).get();
    if (freshDoc.data()?.telegramConfirmationPending === true) {
      throw new Error('Cannot approve: Telegram confirmation is still pending. The user must confirm via Telegram first.');
    }

    const now = new Date().toISOString();

    await this.updateWithdrawalStatus(
      withdrawalId,
      'approved',
      adminId,
      'admin',
      'Approved by admin',
      { approvedAt: now, processedBy: adminId }
    );

    logger.info('[PaymentService.approveWithdrawal] Withdrawal approved', {
      withdrawalId,
      adminId,
    });
  }

  /**
   * Reject a withdrawal (manual mode).
   *
   * @param withdrawalId - The withdrawal ID
   * @param adminId - The admin's ID
   * @param reason - Rejection reason
   */
  async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Atomic transaction: read + verify status + reject + refund balance
    // Prevents double-refund from concurrent rejection requests
    await this.db.runTransaction(async (transaction) => {
      const withdrawalRef = this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId);
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalDoc.data() as WithdrawalRequest;

      if (withdrawal.status !== 'pending' && withdrawal.status !== 'validating') {
        throw new Error(`Cannot reject withdrawal with status: ${withdrawal.status}`);
      }

      // Update withdrawal status to rejected
      const historyEntry: StatusHistoryEntry = {
        status: 'rejected',
        timestamp: now,
        actor: adminId,
        actorType: 'admin',
        note: reason,
      };

      transaction.update(withdrawalRef, {
        status: 'rejected',
        statusHistory: FieldValue.arrayUnion(historyEntry),
        rejectedAt: now,
        processedBy: adminId,
        errorMessage: reason,
      });

      // Refund balance in the SAME transaction
      const collectionName = this.getUserCollectionName(withdrawal.userType);
      const userRef = this.db.collection(collectionName).doc(withdrawal.userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`${withdrawal.userType} not found`);
      }

      const userData = userDoc.data()!;
      const currentBalance = userData.availableBalance || 0;

      transaction.update(userRef, {
        availableBalance: currentBalance + withdrawal.amount,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info('[PaymentService.rejectWithdrawal] Withdrawal rejected (atomic)', {
      withdrawalId,
      adminId,
      reason,
    });
  }

  /**
   * Process a withdrawal (trigger actual payment via provider).
   *
   * This method is called to actually send the payment through Wise or Flutterwave.
   * It uses the PaymentRouter to route to the correct provider based on payment method type.
   *
   * @param withdrawalId - The withdrawal ID
   * @param adminId - Optional admin ID if manually triggered
   * @returns Provider transaction result
   */
  async processWithdrawal(
    withdrawalId: string,
    adminId?: string
  ): Promise<ProviderTransactionResult> {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'approved' && withdrawal.status !== 'queued') {
      throw new Error(`Cannot process withdrawal with status: ${withdrawal.status}`);
    }

    // Mark as processing
    await this.updateWithdrawalStatus(
      withdrawalId,
      'processing',
      adminId || 'system',
      adminId ? 'admin' : 'system',
      'Payment processing started',
      { processedAt: new Date().toISOString() }
    );

    logger.info('[PaymentService.processWithdrawal] Processing withdrawal via provider', {
      withdrawalId,
      provider: withdrawal.provider,
      methodType: withdrawal.methodType,
      amount: withdrawal.amount,
      targetCurrency: withdrawal.targetCurrency,
      adminId,
    });

    try {
      // Get payment config for router settings
      const config = await this.getConfig();

      // Create payment router with config
      const router = createPaymentRouter({
        wiseEnabled: config.wiseEnabled,
        flutterwaveEnabled: config.flutterwaveEnabled,
      });

      // Get country from payment details
      const countryCode = (withdrawal.paymentDetails as { country: string }).country;

      // Process payment via router
      const result = await router.processPayment({
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        sourceCurrency: withdrawal.sourceCurrency,
        targetCurrency: withdrawal.targetCurrency,
        countryCode,
        methodType: withdrawal.methodType,
        details: withdrawal.paymentDetails,
        reference: `SOS-Expat-${withdrawal.userType}-${withdrawal.id}`,
      });

      if (result.success) {
        // Update withdrawal with provider response
        await this.updateWithdrawalStatus(
          withdrawalId,
          'sent',
          'system',
          'system',
          result.message || 'Payment sent to provider',
          {
            providerTransactionId: result.transactionId,
            providerStatus: result.status,
            providerResponse: result.rawResponse,
            exchangeRate: result.exchangeRate,
            fees: result.fees,
            estimatedDelivery: result.estimatedDelivery,
            sentAt: new Date().toISOString(),
          }
        );

        logger.info('[PaymentService.processWithdrawal] Payment sent successfully', {
          withdrawalId,
          transactionId: result.transactionId,
          status: result.status,
        });
      } else {
        // Payment failed - update status
        const newRetryCount = withdrawal.retryCount + 1;
        const shouldRefund = newRetryCount >= withdrawal.maxRetries;

        await this.updateWithdrawalStatus(
          withdrawalId,
          'failed',
          'system',
          'system',
          result.message || 'Payment failed',
          {
            errorCode: 'PROVIDER_ERROR',
            errorMessage: result.message,
            providerResponse: result.rawResponse,
            retryCount: newRetryCount,
            lastRetryAt: new Date().toISOString(),
            failedAt: new Date().toISOString(),
          }
        );

        // Refund balance if max retries reached
        if (shouldRefund) {
          await this.refundUserBalance(withdrawal.userId, withdrawal.userType, withdrawal.amount);
          logger.info('[PaymentService.processWithdrawal] Balance refunded after max retries', {
            withdrawalId,
            amount: withdrawal.amount,
            retryCount: newRetryCount,
          });
        }

        logger.warn('[PaymentService.processWithdrawal] Payment failed', {
          withdrawalId,
          message: result.message,
          retryCount: newRetryCount,
          shouldRefund,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update withdrawal status to failed
      await this.updateWithdrawalStatus(
        withdrawalId,
        'failed',
        'system',
        'system',
        `Provider error: ${errorMessage}`,
        {
          errorCode: 'PROVIDER_EXCEPTION',
          errorMessage,
          retryCount: withdrawal.retryCount + 1,
          lastRetryAt: new Date().toISOString(),
          failedAt: new Date().toISOString(),
        }
      );

      logger.error('[PaymentService.processWithdrawal] Exception during processing', {
        withdrawalId,
        error: errorMessage,
      });

      return {
        success: false,
        status: 'failed',
        message: errorMessage,
      };
    }
  }

  /**
   * Mark a withdrawal as completed (after provider confirms).
   *
   * @param withdrawalId - The withdrawal ID
   * @param providerData - Optional data from the provider
   */
  async completeWithdrawal(
    withdrawalId: string,
    providerData?: Record<string, unknown>
  ): Promise<void> {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'processing' && withdrawal.status !== 'sent') {
      throw new Error(`Cannot complete withdrawal with status: ${withdrawal.status}`);
    }

    const now = new Date().toISOString();
    const additionalData: Record<string, unknown> = {
      completedAt: now,
    };

    if (providerData) {
      additionalData.providerResponse = providerData;
      if (providerData.transactionId) {
        additionalData.providerTransactionId = providerData.transactionId;
      }
      if (providerData.status) {
        additionalData.providerStatus = providerData.status;
      }
      if (providerData.exchangeRate) {
        additionalData.exchangeRate = providerData.exchangeRate;
      }
      if (providerData.fees) {
        additionalData.fees = providerData.fees;
      }
      if (providerData.convertedAmount) {
        additionalData.convertedAmount = providerData.convertedAmount;
      }
      if (providerData.netAmount) {
        additionalData.netAmount = providerData.netAmount;
      }
    }

    await this.updateWithdrawalStatus(
      withdrawalId,
      'completed',
      'system',
      'system',
      'Payment completed successfully',
      additionalData
    );

    logger.info('[PaymentService.completeWithdrawal] Withdrawal completed', {
      withdrawalId,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
    });
  }

  /**
   * Mark a withdrawal as failed.
   *
   * @param withdrawalId - The withdrawal ID
   * @param errorCode - Error code for categorization
   * @param errorMessage - Human-readable error message
   */
  async failWithdrawal(
    withdrawalId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    const now = new Date().toISOString();
    let shouldRefund = false;
    let withdrawalAmount = 0;
    let newRetryCount = 0;

    // Atomic transaction: read withdrawal + update status + conditionally refund balance
    await this.db.runTransaction(async (transaction) => {
      const withdrawalRef = this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId);
      const withdrawalDoc = await transaction.get(withdrawalRef);

      if (!withdrawalDoc.exists) {
        throw new Error('Withdrawal not found');
      }

      const withdrawal = withdrawalDoc.data() as WithdrawalRequest;
      newRetryCount = withdrawal.retryCount + 1;
      shouldRefund = newRetryCount >= withdrawal.maxRetries;
      withdrawalAmount = withdrawal.amount;

      // Update withdrawal status
      const historyEntry: StatusHistoryEntry = {
        status: 'failed',
        timestamp: now,
        actor: 'system',
        actorType: 'system',
        note: errorMessage,
      };

      transaction.update(withdrawalRef, {
        status: 'failed',
        statusHistory: FieldValue.arrayUnion(historyEntry),
        failedAt: now,
        errorCode,
        errorMessage,
        retryCount: newRetryCount,
        lastRetryAt: now,
      });

      // Refund balance atomically if max retries exceeded
      if (shouldRefund) {
        const collectionName = this.getUserCollectionName(withdrawal.userType);
        const userRef = this.db.collection(collectionName).doc(withdrawal.userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          const currentBalance = userData.availableBalance || 0;
          transaction.update(userRef, {
            availableBalance: currentBalance + withdrawal.amount,
            updatedAt: Timestamp.now(),
          });
        }
      }
    });

    if (shouldRefund) {
      logger.info('[PaymentService.failWithdrawal] Balance refunded after max retries', {
        withdrawalId,
        amount: withdrawalAmount,
      });
    }

    logger.warn('[PaymentService.failWithdrawal] Withdrawal failed', {
      withdrawalId,
      errorCode,
      errorMessage,
      retryCount: newRetryCount,
      shouldRefund,
    });
  }

  /**
   * Retry a failed withdrawal.
   *
   * @param withdrawalId - The withdrawal ID
   * @param adminId - The admin's ID
   */
  async retryWithdrawal(withdrawalId: string, adminId: string): Promise<void> {
    const withdrawal = await this.getWithdrawal(withdrawalId);

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'failed') {
      throw new Error(`Cannot retry withdrawal with status: ${withdrawal.status}`);
    }

    if (withdrawal.retryCount >= withdrawal.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    // Move back to queued for reprocessing
    await this.updateWithdrawalStatus(
      withdrawalId,
      'queued',
      adminId,
      'admin',
      `Retry attempt ${withdrawal.retryCount + 1} initiated by admin`
    );

    logger.info('[PaymentService.retryWithdrawal] Withdrawal retry initiated', {
      withdrawalId,
      adminId,
      retryCount: withdrawal.retryCount + 1,
    });
  }

  /**
   * Get all pending withdrawals (for admin dashboard).
   *
   * @param options - Filter options
   * @returns Array of pending WithdrawalRequest
   */
  async getPendingWithdrawals(
    options?: GetPendingWithdrawalsOptions
  ): Promise<WithdrawalRequest[]> {
    const { userType, limit = 100 } = options || {};

    let query: FirebaseFirestore.Query = this.db
      .collection(COLLECTIONS.WITHDRAWALS)
      .where('status', 'in', ['pending', 'validating', 'approved', 'queued', 'processing']);

    if (userType) {
      query = query.where('userType', '==', userType);
    }

    query = query.orderBy('requestedAt', 'asc').limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);
  }

  // ==========================================================================
  // CONFIG
  // ==========================================================================

  /**
   * Get the payment configuration.
   *
   * Returns default config if not yet created.
   *
   * @returns PaymentConfig
   */
  async getConfig(): Promise<PaymentConfig> {
    const configDoc = await this.db
      .collection(COLLECTIONS.PAYMENT_CONFIG)
      .doc('payment_config')
      .get();

    if (!configDoc.exists) {
      // Return default config
      const now = new Date().toISOString();
      return {
        ...DEFAULT_PAYMENT_CONFIG,
        updatedAt: now,
        updatedBy: 'system',
      };
    }

    return configDoc.data() as PaymentConfig;
  }

  /**
   * Update the payment configuration.
   *
   * @param updates - Partial config updates
   * @param adminId - The admin's ID
   * @returns Updated PaymentConfig
   */
  async updateConfig(
    updates: Partial<PaymentConfig>,
    adminId: string
  ): Promise<PaymentConfig> {
    const now = new Date().toISOString();
    const configRef = this.db.collection(COLLECTIONS.PAYMENT_CONFIG).doc('payment_config');

    const currentConfig = await this.getConfig();

    const newConfig: PaymentConfig = {
      ...currentConfig,
      ...updates,
      id: 'payment_config', // Ensure ID is preserved
      updatedAt: now,
      updatedBy: adminId,
    };

    await configRef.set(newConfig);

    logger.info('[PaymentService.updateConfig] Config updated', {
      adminId,
      updatedFields: Object.keys(updates),
    });

    return newConfig;
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  /**
   * Update withdrawal status with full audit trail.
   *
   * @private
   */
  private async updateWithdrawalStatus(
    withdrawalId: string,
    newStatus: WithdrawalStatus,
    actor: string,
    actorType: 'user' | 'admin' | 'system',
    note?: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    const now = new Date().toISOString();

    const historyEntry: StatusHistoryEntry = {
      status: newStatus,
      timestamp: now,
      actor: actor || undefined,
      actorType,
      note,
    };

    const updates: Record<string, unknown> = {
      status: newStatus,
      statusHistory: FieldValue.arrayUnion(historyEntry),
      ...additionalData,
    };

    await this.db.collection(COLLECTIONS.WITHDRAWALS).doc(withdrawalId).update(updates);
  }

  /**
   * Validate a withdrawal request.
   *
   * Checks:
   * - User exists and is active
   * - Amount meets minimum requirement
   * - User has sufficient balance
   * - No pending withdrawal exists
   *
   * @private
   */
  private async validateWithdrawalRequest(
    userId: string,
    userType: PaymentUserType,
    amount: number
  ): Promise<ValidationResult> {
    // Get config for limits
    const config = await this.getConfig();

    // Check minimum amount
    if (amount < config.minimumWithdrawal) {
      return {
        valid: false,
        error: `Minimum withdrawal amount is $${(config.minimumWithdrawal / 100).toFixed(2)}`,
      };
    }

    // Check maximum amount
    if (amount > config.maximumWithdrawal) {
      return {
        valid: false,
        error: `Maximum withdrawal amount is $${(config.maximumWithdrawal / 100).toFixed(2)}`,
      };
    }

    // Check user balance
    const availableBalance = await this.getUserAvailableBalance(userId, userType);

    if (amount > availableBalance) {
      return {
        valid: false,
        error: `Insufficient balance. Available: $${(availableBalance / 100).toFixed(2)}`,
      };
    }

    // Check for existing pending withdrawal
    const pendingWithdrawals = await this.db
      .collection(COLLECTIONS.WITHDRAWALS)
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .where('status', 'in', ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'])
      .limit(1)
      .get();

    if (!pendingWithdrawals.empty) {
      return {
        valid: false,
        error: 'A withdrawal request is already pending',
      };
    }

    // Check daily limit
    if (config.dailyLimit > 0) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dailyWithdrawals = await this.db
        .collection(COLLECTIONS.WITHDRAWALS)
        .where('userId', '==', userId)
        .where('userType', '==', userType)
        .where('status', 'in', ['completed', 'processing', 'sent'])
        .where('requestedAt', '>=', twentyFourHoursAgo)
        .get();

      const dailyTotal = dailyWithdrawals.docs.reduce(
        (sum, doc) => sum + ((doc.data() as WithdrawalRequest).amount || 0),
        0
      );

      if (dailyTotal + amount > config.dailyLimit) {
        const remainingDaily = Math.max(0, config.dailyLimit - dailyTotal);
        return {
          valid: false,
          error: `Daily withdrawal limit reached ($${(config.dailyLimit / 100).toFixed(2)}/day). ` +
            `You can still withdraw up to $${(remainingDaily / 100).toFixed(2)} today.`,
        };
      }
    }

    // Check monthly limit
    if (config.monthlyLimit > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyWithdrawals = await this.db
        .collection(COLLECTIONS.WITHDRAWALS)
        .where('userId', '==', userId)
        .where('userType', '==', userType)
        .where('status', 'in', ['completed', 'processing', 'sent'])
        .where('requestedAt', '>=', monthStart)
        .get();

      const monthlyTotal = monthlyWithdrawals.docs.reduce(
        (sum, doc) => sum + ((doc.data() as WithdrawalRequest).amount || 0),
        0
      );

      if (monthlyTotal + amount > config.monthlyLimit) {
        const remainingMonthly = Math.max(0, config.monthlyLimit - monthlyTotal);
        return {
          valid: false,
          error: `Monthly withdrawal limit reached ($${(config.monthlyLimit / 100).toFixed(2)}/month). ` +
            `You can still withdraw up to $${(remainingMonthly / 100).toFixed(2)} this month.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get user's available balance based on user type.
   *
   * @private
   */
  private async getUserAvailableBalance(
    userId: string,
    userType: PaymentUserType
  ): Promise<number> {
    const collectionName = this.getUserCollectionName(userType);
    const userDoc = await this.db.collection(collectionName).doc(userId).get();

    if (!userDoc.exists) {
      throw new Error(`${userType} not found`);
    }

    const userData = userDoc.data();
    return userData?.availableBalance || 0;
  }

  /**
   * Deduct balance after withdrawal request (within transaction).
   *
   * @private
   */
  private async deductUserBalance(
    userId: string,
    userType: PaymentUserType,
    amount: number,
    transaction?: FirebaseFirestore.Transaction
  ): Promise<void> {
    const collectionName = this.getUserCollectionName(userType);
    const userRef = this.db.collection(collectionName).doc(userId);

    if (transaction) {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error(`${userType} not found`);
      }

      const userData = userDoc.data()!;
      const currentBalance = userData.availableBalance || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      transaction.update(userRef, {
        availableBalance: currentBalance - amount,
        updatedAt: Timestamp.now(),
      });
    } else {
      await this.db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          throw new Error(`${userType} not found`);
        }

        const userData = userDoc.data()!;
        const currentBalance = userData.availableBalance || 0;

        if (currentBalance < amount) {
          throw new Error('Insufficient balance');
        }

        t.update(userRef, {
          availableBalance: currentBalance - amount,
          updatedAt: Timestamp.now(),
        });
      });
    }
  }

  /**
   * Refund balance if withdrawal fails or is cancelled.
   *
   * @private
   */
  private async refundUserBalance(
    userId: string,
    userType: PaymentUserType,
    amount: number
  ): Promise<void> {
    const collectionName = this.getUserCollectionName(userType);
    const userRef = this.db.collection(collectionName).doc(userId);

    await this.db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error(`${userType} not found`);
      }

      const userData = userDoc.data()!;
      const currentBalance = userData.availableBalance || 0;

      transaction.update(userRef, {
        availableBalance: currentBalance + amount,
        updatedAt: Timestamp.now(),
      });
    });

    logger.info('[PaymentService.refundUserBalance] Balance refunded', {
      userId,
      userType,
      amount,
    });
  }

  /**
   * Get the Firestore collection name for a user type.
   *
   * @private
   */
  private getUserCollectionName(userType: PaymentUserType): string {
    switch (userType) {
      case 'chatter':
        return COLLECTIONS.CHATTERS;
      case 'influencer':
        return COLLECTIONS.INFLUENCERS;
      case 'blogger':
        return COLLECTIONS.BLOGGERS;
      case 'group_admin':
        return COLLECTIONS.GROUP_ADMINS;
      default:
        throw new Error(`Unknown user type: ${userType}`);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let paymentServiceInstance: PaymentService | null = null;

/**
 * Get the singleton PaymentService instance.
 *
 * @returns PaymentService instance
 */
export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}

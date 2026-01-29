/**
 * Payment Tracking Service
 *
 * Professional audit trail and status monitoring for the payment system:
 * - Detailed audit logging for all actions
 * - User-friendly tracking timeline
 * - Admin monitoring and statistics
 * - Notifications for status changes
 * - Export capabilities for reports
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  WithdrawalRequest,
  WithdrawalStatus,
  PaymentTrackingSummary,
  TrackingTimelineItem,
  PaymentUserType,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types of events that can be logged in the audit trail
 */
export type AuditEventType =
  | 'withdrawal_created'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'withdrawal_processing'
  | 'withdrawal_sent'
  | 'withdrawal_completed'
  | 'withdrawal_failed'
  | 'withdrawal_cancelled'
  | 'withdrawal_retry'
  | 'provider_callback'
  | 'status_check'
  | 'admin_note_added'
  | 'payment_method_saved'
  | 'payment_method_deleted';

/**
 * A detailed audit log entry for tracking all actions
 */
export interface AuditLogEntry {
  /** Unique identifier for this log entry */
  id: string;

  /** ID of the withdrawal this log relates to */
  withdrawalId: string;

  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;

  /** Type of event that occurred */
  eventType: AuditEventType;

  /** ID of the actor who triggered this event */
  actor: string;

  /** Type of actor */
  actorType: 'user' | 'admin' | 'system' | 'provider';

  /** Previous status before the change (if applicable) */
  previousStatus?: WithdrawalStatus;

  /** New status after the change (if applicable) */
  newStatus?: WithdrawalStatus;

  /** Additional details about the event */
  details: Record<string, unknown>;

  /** IP address of the actor (if available) */
  ipAddress?: string;

  /** User agent string (if available) */
  userAgent?: string;
}

// ============================================================================
// FRENCH LABELS AND DESCRIPTIONS
// ============================================================================

/**
 * French labels for each withdrawal status
 */
const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: 'En attente',
  validating: 'Validation en cours',
  approved: 'Approuvé',
  queued: 'En file d\'attente',
  processing: 'Traitement en cours',
  sent: 'Envoyé',
  completed: 'Terminé',
  failed: 'Échoué',
  rejected: 'Rejeté',
  cancelled: 'Annulé',
};

/**
 * French descriptions for each withdrawal status
 */
const STATUS_DESCRIPTIONS: Record<WithdrawalStatus, string> = {
  pending: 'Votre demande de retrait a été reçue et est en attente de traitement.',
  validating: 'Nous vérifions les informations de votre demande de retrait.',
  approved: 'Votre demande a été approuvée et sera traitée sous peu.',
  queued: 'Votre paiement est en file d\'attente pour être envoyé.',
  processing: 'Votre paiement est en cours de traitement par notre prestataire de paiement.',
  sent: 'Votre paiement a été envoyé et devrait arriver bientôt sur votre compte.',
  completed: 'Votre paiement a été effectué avec succès et crédité sur votre compte.',
  failed: 'Une erreur s\'est produite lors du traitement de votre paiement. Nous allons réessayer.',
  rejected: 'Votre demande de retrait a été rejetée. Veuillez contacter le support pour plus d\'informations.',
  cancelled: 'Cette demande de retrait a été annulée.',
};

/**
 * Progress percentage for each status (0-100)
 */
const STATUS_PROGRESS: Record<WithdrawalStatus, number> = {
  pending: 10,
  validating: 20,
  approved: 30,
  queued: 40,
  processing: 60,
  sent: 80,
  completed: 100,
  failed: 60,
  rejected: 100,
  cancelled: 100,
};

/**
 * Timeline step definitions for building user-facing timeline
 */
const TIMELINE_STEPS = [
  {
    step: 1,
    label: 'Demande soumise',
    description: 'Votre demande de retrait a été soumise.',
    requiredStatus: ['pending', 'validating', 'approved', 'queued', 'processing', 'sent', 'completed', 'failed', 'rejected', 'cancelled'] as WithdrawalStatus[],
  },
  {
    step: 2,
    label: 'Validation',
    description: 'Vérification des informations de paiement.',
    requiredStatus: ['validating', 'approved', 'queued', 'processing', 'sent', 'completed', 'failed'] as WithdrawalStatus[],
  },
  {
    step: 3,
    label: 'Approbation',
    description: 'La demande est approuvée pour traitement.',
    requiredStatus: ['approved', 'queued', 'processing', 'sent', 'completed'] as WithdrawalStatus[],
  },
  {
    step: 4,
    label: 'Traitement',
    description: 'Le paiement est en cours de traitement.',
    requiredStatus: ['processing', 'sent', 'completed'] as WithdrawalStatus[],
  },
  {
    step: 5,
    label: 'Envoi',
    description: 'Le paiement a été envoyé vers votre compte.',
    requiredStatus: ['sent', 'completed'] as WithdrawalStatus[],
  },
  {
    step: 6,
    label: 'Terminé',
    description: 'Le paiement a été reçu avec succès.',
    requiredStatus: ['completed'] as WithdrawalStatus[],
  },
];

// ============================================================================
// TRACKING SERVICE CLASS
// ============================================================================

/**
 * TrackingService handles all audit logging, status tracking, and monitoring
 * for the payment system.
 */
class TrackingService {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = getFirestore();
  }

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  /**
   * Log an event to the audit trail
   */
  async logEvent(params: {
    withdrawalId: string;
    eventType: AuditEventType;
    actor: string;
    actorType: 'user' | 'admin' | 'system' | 'provider';
    previousStatus?: WithdrawalStatus;
    newStatus?: WithdrawalStatus;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const {
      withdrawalId,
      eventType,
      actor,
      actorType,
      previousStatus,
      newStatus,
      details = {},
      ipAddress,
      userAgent,
    } = params;

    const now = new Date().toISOString();
    const logRef = this.db.collection('payment_audit_logs').doc();

    const logEntry: AuditLogEntry = {
      id: logRef.id,
      withdrawalId,
      timestamp: now,
      eventType,
      actor,
      actorType,
      previousStatus,
      newStatus,
      details,
      ipAddress,
      userAgent,
    };

    await logRef.set({
      ...logEntry,
      createdAt: Timestamp.now(),
    });

    logger.info('[TrackingService] Event logged', {
      eventType,
      withdrawalId,
      actor,
      actorType,
    });

    return logEntry;
  }

  /**
   * Get all audit logs for a specific withdrawal
   */
  async getAuditLogs(withdrawalId: string): Promise<AuditLogEntry[]> {
    const logsSnapshot = await this.db
      .collection('payment_audit_logs')
      .where('withdrawalId', '==', withdrawalId)
      .orderBy('createdAt', 'desc')
      .get();

    return logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        withdrawalId: data.withdrawalId,
        timestamp: data.timestamp,
        eventType: data.eventType,
        actor: data.actor,
        actorType: data.actorType,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      } as AuditLogEntry;
    });
  }

  /**
   * Get recent audit logs for admin monitoring
   */
  async getRecentAuditLogs(options?: {
    limit?: number;
    eventTypes?: AuditEventType[];
    userType?: PaymentUserType;
    fromDate?: string;
    toDate?: string;
  }): Promise<AuditLogEntry[]> {
    const { limit = 100, eventTypes, fromDate, toDate } = options || {};

    let query: FirebaseFirestore.Query = this.db.collection('payment_audit_logs');

    // Filter by event types if specified
    if (eventTypes && eventTypes.length > 0) {
      query = query.where('eventType', 'in', eventTypes);
    }

    // Filter by date range
    if (fromDate) {
      query = query.where('timestamp', '>=', fromDate);
    }
    if (toDate) {
      query = query.where('timestamp', '<=', toDate);
    }

    // Order and limit
    query = query.orderBy('createdAt', 'desc').limit(limit);

    const logsSnapshot = await query.get();

    return logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        withdrawalId: data.withdrawalId,
        timestamp: data.timestamp,
        eventType: data.eventType,
        actor: data.actor,
        actorType: data.actorType,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus,
        details: data.details || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      } as AuditLogEntry;
    });
  }

  // ==========================================================================
  // USER TRACKING
  // ==========================================================================

  /**
   * Get a simplified tracking summary for user-facing UI
   */
  getTrackingSummary(withdrawal: WithdrawalRequest): PaymentTrackingSummary {
    const timeline = this.buildTimeline(withdrawal);
    const estimatedCompletion = this.getEstimatedCompletion(withdrawal);

    return {
      withdrawalId: withdrawal.id,
      currentStatus: withdrawal.status,
      statusLabel: this.getStatusLabel(withdrawal.status),
      statusDescription: this.getStatusDescription(withdrawal.status),
      progress: this.calculateProgress(withdrawal.status),
      estimatedCompletion: estimatedCompletion || undefined,
      timeline,
    };
  }

  /**
   * Build a visual timeline for the withdrawal
   */
  buildTimeline(withdrawal: WithdrawalRequest): TrackingTimelineItem[] {
    const currentStatus = withdrawal.status;
    const statusHistory = withdrawal.statusHistory || [];
    const isTerminalNegative = ['failed', 'rejected', 'cancelled'].includes(currentStatus);

    return TIMELINE_STEPS.map((step) => {
      // Check if this step has been completed based on status history
      const historyEntry = statusHistory.find((entry) =>
        step.requiredStatus.includes(entry.status)
      );

      // Determine step status
      let stepStatus: 'completed' | 'current' | 'pending' | 'failed';

      if (isTerminalNegative) {
        // Handle negative terminal states
        if (currentStatus === 'rejected' && step.step === 3) {
          stepStatus = 'failed';
        } else if (currentStatus === 'cancelled' && step.step === 1) {
          stepStatus = 'failed';
        } else if (currentStatus === 'failed') {
          // Find which step failed
          const failedAtStep = this.getStepForStatus(currentStatus);
          if (step.step < failedAtStep) {
            stepStatus = 'completed';
          } else if (step.step === failedAtStep) {
            stepStatus = 'failed';
          } else {
            stepStatus = 'pending';
          }
        } else if (historyEntry) {
          stepStatus = 'completed';
        } else {
          stepStatus = 'pending';
        }
      } else {
        // Normal flow
        const currentStepIndex = this.getStepForStatus(currentStatus);

        if (step.step < currentStepIndex) {
          stepStatus = 'completed';
        } else if (step.step === currentStepIndex) {
          stepStatus = currentStatus === 'completed' ? 'completed' : 'current';
        } else {
          stepStatus = 'pending';
        }
      }

      // Get timestamp from history if available
      let timestamp: string | undefined;
      if (stepStatus === 'completed' || stepStatus === 'current' || stepStatus === 'failed') {
        const relevantEntry = statusHistory.find((entry) =>
          step.requiredStatus.includes(entry.status)
        );
        timestamp = relevantEntry?.timestamp;
      }

      return {
        step: step.step,
        label: step.label,
        description: step.description,
        status: stepStatus,
        timestamp,
      };
    });
  }

  /**
   * Get the step number for a given status
   */
  private getStepForStatus(status: WithdrawalStatus): number {
    const statusToStep: Record<WithdrawalStatus, number> = {
      pending: 1,
      validating: 2,
      approved: 3,
      queued: 3,
      processing: 4,
      sent: 5,
      completed: 6,
      failed: 4,
      rejected: 3,
      cancelled: 1,
    };
    return statusToStep[status] || 1;
  }

  /**
   * Get the French label for a status
   */
  getStatusLabel(status: WithdrawalStatus): string {
    return STATUS_LABELS[status] || status;
  }

  /**
   * Get the French description for a status
   */
  getStatusDescription(status: WithdrawalStatus): string {
    return STATUS_DESCRIPTIONS[status] || '';
  }

  /**
   * Calculate progress percentage (0-100)
   */
  calculateProgress(status: WithdrawalStatus): number {
    return STATUS_PROGRESS[status] || 0;
  }

  /**
   * Get estimated completion time based on current status
   */
  getEstimatedCompletion(withdrawal: WithdrawalRequest): string | null {
    const { status, provider, methodType, sentAt } = withdrawal;

    // No estimate for terminal states
    if (['completed', 'failed', 'rejected', 'cancelled'].includes(status)) {
      return null;
    }

    const now = new Date();
    let estimatedDate: Date;

    // Estimate based on current status and provider
    switch (status) {
      case 'pending':
      case 'validating':
        // Usually processed within 24-48 hours
        estimatedDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        break;

      case 'approved':
      case 'queued':
        // Processing starts within 24 hours
        estimatedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;

      case 'processing':
        // Depends on provider and method
        if (provider === 'flutterwave' && methodType === 'mobile_money') {
          // Mobile money is usually instant to a few hours
          estimatedDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        } else if (provider === 'wise') {
          // Bank transfers take 1-3 business days
          estimatedDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        } else {
          estimatedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        break;

      case 'sent':
        // Almost there - within 24 hours
        if (sentAt) {
          const sentDate = new Date(sentAt);
          estimatedDate = new Date(sentDate.getTime() + 24 * 60 * 60 * 1000);
        } else {
          estimatedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        break;

      default:
        return null;
    }

    return estimatedDate.toISOString();
  }

  // ==========================================================================
  // ADMIN MONITORING
  // ==========================================================================

  /**
   * Get real-time statistics for admin dashboard
   */
  async getStats(period?: 'today' | 'week' | 'month' | 'all'): Promise<{
    totalWithdrawals: number;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    totalAmountProcessed: number;
    totalAmountPending: number;
    averageProcessingTime: number;
    successRate: number;
    byProvider: Record<string, { count: number; amount: number }>;
    byUserType: Record<string, { count: number; amount: number }>;
  }> {
    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
    }

    // Query withdrawals
    let query: FirebaseFirestore.Query = this.db.collection('payment_withdrawals');

    if (period && period !== 'all') {
      query = query.where('requestedAt', '>=', startDate.toISOString());
    }

    const withdrawalsSnapshot = await query.get();
    const withdrawals = withdrawalsSnapshot.docs.map((doc) => doc.data() as WithdrawalRequest);

    // Calculate statistics
    let pendingCount = 0;
    let processingCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let totalAmountProcessed = 0;
    let totalAmountPending = 0;
    let totalProcessingTime = 0;
    let processedWithTimeCount = 0;

    const byProvider: Record<string, { count: number; amount: number }> = {};
    const byUserType: Record<string, { count: number; amount: number }> = {};

    for (const withdrawal of withdrawals) {
      // Count by status
      switch (withdrawal.status) {
        case 'pending':
        case 'validating':
        case 'approved':
        case 'queued':
          pendingCount++;
          totalAmountPending += withdrawal.amount;
          break;
        case 'processing':
        case 'sent':
          processingCount++;
          totalAmountPending += withdrawal.amount;
          break;
        case 'completed':
          completedCount++;
          totalAmountProcessed += withdrawal.amount;
          // Calculate processing time
          if (withdrawal.requestedAt && withdrawal.completedAt) {
            const requestedDate = new Date(withdrawal.requestedAt);
            const completedDate = new Date(withdrawal.completedAt);
            const processingTime = completedDate.getTime() - requestedDate.getTime();
            totalProcessingTime += processingTime;
            processedWithTimeCount++;
          }
          break;
        case 'failed':
          failedCount++;
          break;
      }

      // Count by provider
      const provider = withdrawal.provider;
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, amount: 0 };
      }
      byProvider[provider].count++;
      byProvider[provider].amount += withdrawal.amount;

      // Count by user type
      const userType = withdrawal.userType;
      if (!byUserType[userType]) {
        byUserType[userType] = { count: 0, amount: 0 };
      }
      byUserType[userType].count++;
      byUserType[userType].amount += withdrawal.amount;
    }

    // Calculate averages
    const totalWithdrawals = withdrawals.length;
    const averageProcessingTime = processedWithTimeCount > 0
      ? totalProcessingTime / processedWithTimeCount
      : 0;

    // Calculate success rate (completed / (completed + failed))
    const totalFinished = completedCount + failedCount;
    const successRate = totalFinished > 0
      ? (completedCount / totalFinished) * 100
      : 100;

    return {
      totalWithdrawals,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      totalAmountProcessed,
      totalAmountPending,
      averageProcessingTime,
      successRate: Math.round(successRate * 100) / 100,
      byProvider,
      byUserType,
    };
  }

  /**
   * Get failed withdrawals that need attention
   */
  async getFailedWithdrawals(limit: number = 50): Promise<WithdrawalRequest[]> {
    const snapshot = await this.db
      .collection('payment_withdrawals')
      .where('status', '==', 'failed')
      .orderBy('failedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);
  }

  /**
   * Get stuck withdrawals (processing for too long)
   */
  async getStuckWithdrawals(maxHours: number = 24): Promise<WithdrawalRequest[]> {
    const cutoffTime = new Date(Date.now() - maxHours * 60 * 60 * 1000).toISOString();

    // Get withdrawals that have been processing for too long
    const snapshot = await this.db
      .collection('payment_withdrawals')
      .where('status', 'in', ['processing', 'sent'])
      .where('processedAt', '<=', cutoffTime)
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  /**
   * Create a notification for a status change
   */
  async createStatusNotification(
    withdrawal: WithdrawalRequest,
    previousStatus: WithdrawalStatus
  ): Promise<void> {
    const { userId, userType, id: withdrawalId, status, amount } = withdrawal;

    // Format amount for display
    const formattedAmount = (amount / 100).toFixed(2);

    // Build notification message in French
    let title: string;
    let body: string;
    let type: string;

    switch (status) {
      case 'approved':
        title = 'Retrait approuvé';
        body = `Votre demande de retrait de $${formattedAmount} a été approuvée et sera traitée bientôt.`;
        type = 'withdrawal_approved';
        break;
      case 'processing':
        title = 'Retrait en cours';
        body = `Votre retrait de $${formattedAmount} est en cours de traitement.`;
        type = 'withdrawal_processing';
        break;
      case 'sent':
        title = 'Paiement envoyé';
        body = `Votre paiement de $${formattedAmount} a été envoyé vers votre compte.`;
        type = 'withdrawal_sent';
        break;
      case 'completed':
        title = 'Paiement reçu !';
        body = `Votre retrait de $${formattedAmount} a été effectué avec succès.`;
        type = 'withdrawal_completed';
        break;
      case 'failed':
        title = 'Échec du paiement';
        body = `Une erreur s'est produite lors du traitement de votre retrait. Nous allons réessayer automatiquement.`;
        type = 'withdrawal_failed';
        break;
      case 'rejected':
        title = 'Retrait rejeté';
        body = `Votre demande de retrait a été rejetée. Contactez le support pour plus d'informations.`;
        type = 'withdrawal_rejected';
        break;
      default:
        return; // Don't create notification for other statuses
    }

    // Create notification document
    const notificationRef = this.db.collection('notifications').doc();
    await notificationRef.set({
      id: notificationRef.id,
      userId,
      userType,
      type,
      title,
      body,
      data: {
        withdrawalId,
        status,
        previousStatus,
        amount,
      },
      read: false,
      createdAt: Timestamp.now(),
    });

    logger.info('[TrackingService] Status notification created', {
      withdrawalId,
      userId,
      status,
      previousStatus,
    });
  }

  /**
   * Send an alert to admins
   */
  async sendAdminAlert(params: {
    type: 'new_request' | 'high_amount' | 'failure' | 'stuck';
    withdrawal: WithdrawalRequest;
    message: string;
  }): Promise<void> {
    const { type, withdrawal, message } = params;
    const formattedAmount = (withdrawal.amount / 100).toFixed(2);

    // Build alert title
    let title: string;
    switch (type) {
      case 'new_request':
        title = 'Nouvelle demande de retrait';
        break;
      case 'high_amount':
        title = `Retrait important: $${formattedAmount}`;
        break;
      case 'failure':
        title = 'Échec de paiement';
        break;
      case 'stuck':
        title = 'Retrait bloqué';
        break;
    }

    // Create admin alert document
    const alertRef = this.db.collection('admin_alerts').doc();
    await alertRef.set({
      id: alertRef.id,
      type,
      title,
      message,
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      userType: withdrawal.userType,
      amount: withdrawal.amount,
      provider: withdrawal.provider,
      status: withdrawal.status,
      read: false,
      acknowledged: false,
      createdAt: Timestamp.now(),
    });

    logger.info('[TrackingService] Admin alert created', {
      type,
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
    });
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  /**
   * Export withdrawals to CSV format
   */
  async exportToCSV(options: {
    fromDate: string;
    toDate: string;
    status?: WithdrawalStatus[];
    userType?: PaymentUserType;
  }): Promise<string> {
    const { fromDate, toDate, status, userType } = options;

    // Build query
    let query: FirebaseFirestore.Query = this.db
      .collection('payment_withdrawals')
      .where('requestedAt', '>=', fromDate)
      .where('requestedAt', '<=', toDate);

    if (userType) {
      query = query.where('userType', '==', userType);
    }

    const snapshot = await query.get();
    let withdrawals = snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);

    // Filter by status if specified (can't do 'in' query with multiple where clauses)
    if (status && status.length > 0) {
      withdrawals = withdrawals.filter((w) => status.includes(w.status));
    }

    // Build CSV header
    const headers = [
      'ID',
      'Date de demande',
      'Utilisateur',
      'Type utilisateur',
      'Email',
      'Montant (cents)',
      'Montant ($)',
      'Devise cible',
      'Taux de change',
      'Montant converti',
      'Frais',
      'Montant net',
      'Méthode',
      'Fournisseur',
      'Statut',
      'ID Transaction',
      'Date traitement',
      'Date envoi',
      'Date complétion',
      'Erreur',
    ];

    // Build CSV rows
    const rows = withdrawals.map((w) => [
      w.id,
      w.requestedAt,
      w.userName,
      w.userType,
      w.userEmail,
      w.amount.toString(),
      (w.amount / 100).toFixed(2),
      w.targetCurrency,
      w.exchangeRate?.toString() || '',
      w.convertedAmount?.toString() || '',
      w.fees?.toString() || '',
      w.netAmount?.toString() || '',
      w.methodType,
      w.provider,
      w.status,
      w.providerTransactionId || '',
      w.processedAt || '',
      w.sentAt || '',
      w.completedAt || '',
      w.errorMessage || '',
    ]);

    // Combine headers and rows
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * Generate a monthly report with summary and CSV data
   */
  async generateMonthlyReport(
    year: number,
    month: number
  ): Promise<{
    summary: Record<string, unknown>;
    csvData: string;
  }> {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const fromDate = startDate.toISOString();
    const toDate = endDate.toISOString();

    // Get all withdrawals for the month
    const snapshot = await this.db
      .collection('payment_withdrawals')
      .where('requestedAt', '>=', fromDate)
      .where('requestedAt', '<=', toDate)
      .get();

    const withdrawals = snapshot.docs.map((doc) => doc.data() as WithdrawalRequest);

    // Calculate summary statistics
    const summary: Record<string, unknown> = {
      period: `${year}-${month.toString().padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      totalRequests: withdrawals.length,
      byStatus: {} as Record<string, { count: number; amount: number }>,
      byProvider: {} as Record<string, { count: number; amount: number }>,
      byUserType: {} as Record<string, { count: number; amount: number }>,
      totalAmountRequested: 0,
      totalAmountCompleted: 0,
      totalFees: 0,
      averageAmount: 0,
      successRate: 0,
    };

    // Process each withdrawal
    for (const w of withdrawals) {
      // By status
      const statusKey = w.status;
      const byStatus = summary.byStatus as Record<string, { count: number; amount: number }>;
      if (!byStatus[statusKey]) {
        byStatus[statusKey] = { count: 0, amount: 0 };
      }
      byStatus[statusKey].count++;
      byStatus[statusKey].amount += w.amount;

      // By provider
      const providerKey = w.provider;
      const byProvider = summary.byProvider as Record<string, { count: number; amount: number }>;
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = { count: 0, amount: 0 };
      }
      byProvider[providerKey].count++;
      byProvider[providerKey].amount += w.amount;

      // By user type
      const userTypeKey = w.userType;
      const byUserType = summary.byUserType as Record<string, { count: number; amount: number }>;
      if (!byUserType[userTypeKey]) {
        byUserType[userTypeKey] = { count: 0, amount: 0 };
      }
      byUserType[userTypeKey].count++;
      byUserType[userTypeKey].amount += w.amount;

      // Totals
      (summary.totalAmountRequested as number) += w.amount;
      if (w.status === 'completed') {
        (summary.totalAmountCompleted as number) += w.amount;
      }
      if (w.fees) {
        (summary.totalFees as number) += w.fees;
      }
    }

    // Calculate averages
    if (withdrawals.length > 0) {
      summary.averageAmount = Math.round(
        (summary.totalAmountRequested as number) / withdrawals.length
      );
    }

    // Calculate success rate
    const byStatus = summary.byStatus as Record<string, { count: number; amount: number }>;
    const completed = byStatus['completed']?.count || 0;
    const failed = byStatus['failed']?.count || 0;
    const total = completed + failed;
    summary.successRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 100;

    // Generate CSV data
    const csvData = await this.exportToCSV({ fromDate, toDate });

    return {
      summary,
      csvData,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let trackingServiceInstance: TrackingService | null = null;

/**
 * Get the singleton instance of TrackingService
 */
function getTrackingService(): TrackingService {
  if (!trackingServiceInstance) {
    trackingServiceInstance = new TrackingService();
  }
  return trackingServiceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { TrackingService, getTrackingService };

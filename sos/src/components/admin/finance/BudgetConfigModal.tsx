// src/components/admin/finance/BudgetConfigModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Zap,
  HardDrive,
  Phone,
  AlertTriangle,
  DollarSign,
  Percent,
  Save,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { cn } from '@/lib/utils';

/**
 * Service types for budget configuration
 */
export type BudgetServiceType = 'twilio' | 'firestore' | 'functions' | 'storage';

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  /** Threshold percentage (0-100) */
  percentage: number;
  /** Whether this threshold is enabled */
  enabled: boolean;
}

/**
 * Budget configuration for a single service
 */
export interface ServiceBudgetConfig {
  /** Monthly budget amount in USD */
  monthlyBudget: number;
  /** Alert thresholds */
  alertThresholds: AlertThreshold[];
}

/**
 * Complete budget configuration for all services
 */
export interface BudgetConfig {
  twilio: ServiceBudgetConfig;
  firestore: ServiceBudgetConfig;
  functions: ServiceBudgetConfig;
  storage: ServiceBudgetConfig;
}

export interface BudgetConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when configuration is saved */
  onSave: (config: BudgetConfig) => Promise<void>;
  /** Initial configuration values */
  initialConfig?: Partial<BudgetConfig>;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Service configuration metadata
 */
interface ServiceMetadata {
  key: BudgetServiceType;
  icon: LucideIcon;
  labelId: string;
  defaultLabel: string;
  descriptionId: string;
  defaultDescription: string;
  iconBg: string;
  iconColor: string;
}

const serviceMetadata: ServiceMetadata[] = [
  {
    key: 'twilio',
    icon: Phone,
    labelId: 'finance.budget.twilio',
    defaultLabel: 'Twilio (SMS/Voice)',
    descriptionId: 'finance.budget.twilioDesc',
    defaultDescription: 'SMS notifications, voice calls, and verification',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  {
    key: 'firestore',
    icon: Database,
    labelId: 'finance.budget.firestore',
    defaultLabel: 'Firestore',
    descriptionId: 'finance.budget.firestoreDesc',
    defaultDescription: 'Database reads, writes, and storage',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    key: 'functions',
    icon: Zap,
    labelId: 'finance.budget.functions',
    defaultLabel: 'Cloud Functions',
    descriptionId: 'finance.budget.functionsDesc',
    defaultDescription: 'Serverless function executions',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    key: 'storage',
    icon: HardDrive,
    labelId: 'finance.budget.storage',
    defaultLabel: 'Cloud Storage',
    descriptionId: 'finance.budget.storageDesc',
    defaultDescription: 'File storage and bandwidth',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
];

/**
 * Default alert thresholds
 */
const defaultThresholds: AlertThreshold[] = [
  { percentage: 50, enabled: true },
  { percentage: 80, enabled: true },
  { percentage: 100, enabled: true },
];

/**
 * Default budget configuration
 */
const defaultBudgetConfig: BudgetConfig = {
  twilio: { monthlyBudget: 100, alertThresholds: [...defaultThresholds] },
  firestore: { monthlyBudget: 50, alertThresholds: [...defaultThresholds] },
  functions: { monthlyBudget: 30, alertThresholds: [...defaultThresholds] },
  storage: { monthlyBudget: 20, alertThresholds: [...defaultThresholds] },
};

/**
 * Validation errors interface
 */
interface ValidationErrors {
  [key: string]: string | undefined;
}

/**
 * BudgetConfigModal Component
 *
 * A modal for configuring monthly budgets per service with:
 * - Budget input fields for each service (Twilio, Firestore, Functions, Storage)
 * - Configurable alert thresholds (50%, 80%, 100%)
 * - Cancel/Save buttons
 * - Amount validation
 */
export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  isLoading = false,
  className,
}) => {
  const intl = useIntl();

  // Initialize config state with defaults merged with initial config
  const [config, setConfig] = useState<BudgetConfig>(() => ({
    twilio: {
      ...defaultBudgetConfig.twilio,
      ...initialConfig?.twilio,
      alertThresholds: initialConfig?.twilio?.alertThresholds || [...defaultThresholds],
    },
    firestore: {
      ...defaultBudgetConfig.firestore,
      ...initialConfig?.firestore,
      alertThresholds: initialConfig?.firestore?.alertThresholds || [...defaultThresholds],
    },
    functions: {
      ...defaultBudgetConfig.functions,
      ...initialConfig?.functions,
      alertThresholds: initialConfig?.functions?.alertThresholds || [...defaultThresholds],
    },
    storage: {
      ...defaultBudgetConfig.storage,
      ...initialConfig?.storage,
      alertThresholds: initialConfig?.storage?.alertThresholds || [...defaultThresholds],
    },
  }));

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Reset config when modal opens with new initial config
  useEffect(() => {
    if (isOpen) {
      setConfig({
        twilio: {
          ...defaultBudgetConfig.twilio,
          ...initialConfig?.twilio,
          alertThresholds: initialConfig?.twilio?.alertThresholds || [...defaultThresholds],
        },
        firestore: {
          ...defaultBudgetConfig.firestore,
          ...initialConfig?.firestore,
          alertThresholds: initialConfig?.firestore?.alertThresholds || [...defaultThresholds],
        },
        functions: {
          ...defaultBudgetConfig.functions,
          ...initialConfig?.functions,
          alertThresholds: initialConfig?.functions?.alertThresholds || [...defaultThresholds],
        },
        storage: {
          ...defaultBudgetConfig.storage,
          ...initialConfig?.storage,
          alertThresholds: initialConfig?.storage?.alertThresholds || [...defaultThresholds],
        },
      });
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, initialConfig]);

  /**
   * Validate a budget amount
   */
  const validateBudget = useCallback((value: number, serviceKey: string): string | undefined => {
    if (isNaN(value) || value < 0) {
      return intl.formatMessage({
        id: 'finance.budget.error.invalidAmount',
        defaultMessage: 'Please enter a valid positive amount',
      });
    }
    if (value > 100000) {
      return intl.formatMessage({
        id: 'finance.budget.error.maxAmount',
        defaultMessage: 'Budget cannot exceed $100,000',
      });
    }
    return undefined;
  }, [intl]);

  /**
   * Handle budget change for a service
   */
  const handleBudgetChange = useCallback((serviceKey: BudgetServiceType, value: string) => {
    const numValue = parseFloat(value) || 0;

    setConfig((prev) => ({
      ...prev,
      [serviceKey]: {
        ...prev[serviceKey],
        monthlyBudget: numValue,
      },
    }));

    const error = validateBudget(numValue, serviceKey);
    setErrors((prev) => ({
      ...prev,
      [serviceKey]: error,
    }));

    setIsDirty(true);
  }, [validateBudget]);

  /**
   * Handle threshold toggle for a service
   */
  const handleThresholdToggle = useCallback((
    serviceKey: BudgetServiceType,
    percentage: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      [serviceKey]: {
        ...prev[serviceKey],
        alertThresholds: prev[serviceKey].alertThresholds.map((t) =>
          t.percentage === percentage ? { ...t, enabled: !t.enabled } : t
        ),
      },
    }));
    setIsDirty(true);
  }, []);

  /**
   * Validate all fields before saving
   */
  const validateAll = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    serviceMetadata.forEach((service) => {
      const error = validateBudget(config[service.key].monthlyBudget, service.key);
      if (error) {
        newErrors[service.key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, validateBudget]);

  /**
   * Handle save action
   */
  const handleSave = useCallback(async () => {
    if (!validateAll()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error('[BudgetConfigModal] Save error:', error);
      // Error handling is delegated to the parent component
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave, onClose, validateAll]);

  /**
   * Handle cancel action
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      // Could add a confirmation dialog here if needed
    }
    onClose();
  }, [isDirty, onClose]);

  /**
   * Get threshold color based on percentage
   */
  const getThresholdColor = (percentage: number, enabled: boolean): string => {
    if (!enabled) return 'bg-gray-100 text-gray-400 border-gray-200';
    if (percentage >= 100) return 'bg-red-100 text-red-700 border-red-300';
    if (percentage >= 80) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  /**
   * Calculate total monthly budget
   */
  const totalBudget = serviceMetadata.reduce(
    (sum, service) => sum + (config[service.key]?.monthlyBudget || 0),
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={intl.formatMessage({
        id: 'finance.budget.modalTitle',
        defaultMessage: 'Configure Monthly Budgets',
      })}
      size="large"
      closeLabel={intl.formatMessage({
        id: 'common.close',
        defaultMessage: 'Close',
      })}
    >
      <div className={cn('space-y-6', className)}>
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600">
          {intl.formatMessage({
            id: 'finance.budget.description',
            defaultMessage:
              'Set monthly budget limits for each service and configure alert thresholds to receive notifications when usage approaches your limits.',
          })}
        </p>

        {/* Service Budget Cards */}
        <div className="space-y-4">
          {serviceMetadata.map((service) => {
            const IconComponent = service.icon;
            const serviceConfig = config[service.key];
            const hasError = !!errors[service.key];

            return (
              <div
                key={service.key}
                className={cn(
                  'bg-white rounded-lg border p-4 transition-all duration-200',
                  hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Service Icon */}
                  <div
                    className={cn(
                      'flex-shrink-0 p-3 rounded-full',
                      service.iconBg
                    )}
                  >
                    <IconComponent className={cn('w-5 h-5', service.iconColor)} />
                  </div>

                  {/* Service Info and Inputs */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {intl.formatMessage({
                            id: service.labelId,
                            defaultMessage: service.defaultLabel,
                          })}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {intl.formatMessage({
                            id: service.descriptionId,
                            defaultMessage: service.defaultDescription,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Budget Input */}
                    <div className="mb-4">
                      <label
                        htmlFor={`budget-${service.key}`}
                        className="block text-sm font-medium text-gray-700 mb-1.5"
                      >
                        {intl.formatMessage({
                          id: 'finance.budget.monthlyLimit',
                          defaultMessage: 'Monthly Budget Limit',
                        })}
                      </label>
                      <div className="relative max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          id={`budget-${service.key}`}
                          name={`budget-${service.key}`}
                          min="0"
                          max="100000"
                          step="0.01"
                          value={serviceConfig.monthlyBudget || ''}
                          onChange={(e) => handleBudgetChange(service.key, e.target.value)}
                          className={cn(
                            'block w-full pl-9 pr-12 py-2 border rounded-lg text-sm',
                            'focus:outline-none focus:ring-2 focus:ring-offset-0',
                            hasError
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                              : 'border-gray-300 focus:border-red-500 focus:ring-red-200'
                          )}
                          placeholder="0.00"
                          aria-invalid={hasError}
                          aria-describedby={hasError ? `error-${service.key}` : undefined}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-sm">USD</span>
                        </div>
                      </div>
                      {hasError && (
                        <p
                          id={`error-${service.key}`}
                          className="mt-1.5 text-xs text-red-600 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {errors[service.key]}
                        </p>
                      )}
                    </div>

                    {/* Alert Thresholds */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {intl.formatMessage({
                          id: 'finance.budget.alertThresholds',
                          defaultMessage: 'Alert Thresholds',
                        })}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {serviceConfig.alertThresholds.map((threshold) => (
                          <button
                            key={`${service.key}-${threshold.percentage}`}
                            type="button"
                            onClick={() => handleThresholdToggle(service.key, threshold.percentage)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150',
                              getThresholdColor(threshold.percentage, threshold.enabled),
                              'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-300'
                            )}
                            aria-pressed={threshold.enabled}
                            aria-label={intl.formatMessage(
                              {
                                id: 'finance.budget.thresholdToggle',
                                defaultMessage: '{percentage}% threshold - {status}',
                              },
                              {
                                percentage: threshold.percentage,
                                status: threshold.enabled ? 'enabled' : 'disabled',
                              }
                            )}
                          >
                            <Percent className="w-3 h-3" />
                            <span>{threshold.percentage}%</span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-gray-500">
                        {intl.formatMessage({
                          id: 'finance.budget.thresholdHint',
                          defaultMessage: 'Click to toggle alert notifications at each threshold',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Budget Summary */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                {intl.formatMessage({
                  id: 'finance.budget.totalMonthly',
                  defaultMessage: 'Total Monthly Budget',
                })}
              </span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              {intl.formatNumber(totalBudget, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            {intl.formatMessage({
              id: 'common.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).some((k) => errors[k])}
            loading={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {intl.formatMessage({
              id: 'common.save',
              defaultMessage: 'Save',
            })}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BudgetConfigModal;

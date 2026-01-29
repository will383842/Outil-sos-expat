// src/components/payment/index.ts
/**
 * Payment Components
 *
 * Shared components for the centralized payment system.
 * Used by Chatter, Influencer, and Blogger modules.
 */

// Gateway components
export { PayPalPaymentForm } from "./PayPalPaymentForm";
export { GatewayIndicator } from "./GatewayIndicator";

// Forms
export { default as PaymentMethodForm } from "./Forms/PaymentMethodForm";
export { default as WithdrawalRequestForm } from "./Forms/WithdrawalRequestForm";

// Tracking
export { WithdrawalTracker } from "./Tracking";

// Core display components
export {
  PaymentMethodIcon,
  getMobileMoneyProviderColor,
  mobileMoneyProviderNames,
  type PaymentMethodIconProps,
  type PaymentMethodIconSize,
} from './PaymentMethodIcon';

export {
  PaymentMethodCard,
  type PaymentMethodCardProps,
} from './PaymentMethodCard';

export {
  WithdrawalStatusBadge,
  withdrawalStatusLabels,
  isTerminalWithdrawalStatus,
  isSuccessWithdrawalStatus,
  isErrorWithdrawalStatus,
  type WithdrawalStatusBadgeProps,
  type WithdrawalStatusBadgeSize,
} from './WithdrawalStatusBadge';

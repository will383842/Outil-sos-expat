// src/components/Payment/PaymentMethodIcon.tsx
import React from 'react';
import { Building2, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentMethodType, MobileMoneyProvider } from '@/types/payment';

export type PaymentMethodIconSize = 'sm' | 'md' | 'lg';

export interface PaymentMethodIconProps {
  /** Payment method type */
  methodType: PaymentMethodType;
  /** Mobile money provider (for provider-specific colors) */
  provider?: MobileMoneyProvider;
  /** Size variant */
  size?: PaymentMethodIconSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap: Record<PaymentMethodIconSize, { icon: string; container: string }> = {
  sm: { icon: 'w-4 h-4', container: 'w-8 h-8' },
  md: { icon: 'w-5 h-5', container: 'w-10 h-10' },
  lg: { icon: 'w-6 h-6', container: 'w-12 h-12' },
};

// Provider-specific colors for mobile money
const mobileMoneyColors: Record<MobileMoneyProvider, { bg: string; icon: string; gradient?: string }> = {
  wave: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    icon: 'text-white',
    gradient: 'from-blue-500 to-blue-600',
  },
  orange_money: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    icon: 'text-white',
    gradient: 'from-orange-500 to-orange-600',
  },
  mtn_momo: {
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
    icon: 'text-black',
    gradient: 'from-yellow-400 to-yellow-500',
  },
  moov_money: {
    bg: 'bg-gradient-to-br from-blue-600 to-blue-700',
    icon: 'text-white',
    gradient: 'from-blue-600 to-blue-700',
  },
  airtel_money: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    icon: 'text-white',
    gradient: 'from-red-500 to-red-600',
  },
  mpesa: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    icon: 'text-white',
    gradient: 'from-green-500 to-green-600',
  },
  free_money: {
    bg: 'bg-gradient-to-br from-red-600 to-red-700',
    icon: 'text-white',
    gradient: 'from-red-600 to-red-700',
  },
  t_money: {
    bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    icon: 'text-white',
    gradient: 'from-blue-500 to-indigo-600',
  },
  flooz: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    icon: 'text-white',
    gradient: 'from-purple-500 to-purple-600',
  },
  vodacom: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    icon: 'text-white',
    gradient: 'from-red-500 to-red-600',
  },
  mobilis: {
    bg: 'bg-gradient-to-br from-green-600 to-green-700',
    icon: 'text-white',
    gradient: 'from-green-600 to-green-700',
  },
};

// Default color for mobile money when provider not specified
const defaultMobileMoneyColor = {
  bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  icon: 'text-white',
};

// Bank transfer gradient
const bankTransferStyle = {
  bg: 'bg-gradient-to-br from-slate-600 to-slate-700',
  icon: 'text-white',
};

/**
 * PaymentMethodIcon - Displays an icon for a payment method type
 *
 * For bank transfers: Shows Building2 icon with gradient background
 * For mobile money: Shows Smartphone icon with provider-specific colors
 */
export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  methodType,
  provider,
  size = 'md',
  className,
}) => {
  const sizes = sizeMap[size];

  const renderBankTransferIcon = () => (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-lg shadow-sm',
        bankTransferStyle.bg,
        sizes.container,
        className
      )}
    >
      <Building2 className={cn(sizes.icon, bankTransferStyle.icon)} />
    </div>
  );

  const renderMobileMoneyIcon = () => {
    const colors = provider ? mobileMoneyColors[provider] : defaultMobileMoneyColor;

    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-lg shadow-sm',
          colors.bg,
          sizes.container,
          className
        )}
      >
        <Smartphone className={cn(sizes.icon, colors.icon)} />
      </div>
    );
  };

  if (methodType === 'bank_transfer') {
    return renderBankTransferIcon();
  }

  return renderMobileMoneyIcon();
};

// Export provider colors for use in other components
export const getMobileMoneyProviderColor = (provider: MobileMoneyProvider) => {
  return mobileMoneyColors[provider] || defaultMobileMoneyColor;
};

// Export provider display names
export const mobileMoneyProviderNames: Record<MobileMoneyProvider, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN Mobile Money',
  moov_money: 'Moov Money',
  airtel_money: 'Airtel Money',
  mpesa: 'M-Pesa',
  free_money: 'Free Money',
  t_money: 'T-Money',
  flooz: 'Flooz',
  vodacom: 'Vodacom M-Pesa',
  mobilis: 'Mobilis',
};

export default PaymentMethodIcon;

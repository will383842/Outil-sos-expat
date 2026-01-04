// src/components/admin/finance/PaymentMethodIcon.tsx
import React from 'react';
import { CreditCard, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethodType =
  | 'stripe'
  | 'paypal'
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'card'
  | 'bank_transfer'
  | 'sepa'
  | 'unknown';

export type PaymentMethodSize = 'sm' | 'md' | 'lg';

export interface PaymentMethodIconProps {
  /** Payment method type */
  method: PaymentMethodType;
  /** Card brand (for automatic detection when method is 'card') */
  cardBrand?: string;
  /** Size variant */
  size?: PaymentMethodSize;
  /** Show tooltip with method name */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap: Record<PaymentMethodSize, { icon: string; container: string }> = {
  sm: { icon: 'w-4 h-4', container: 'w-6 h-6' },
  md: { icon: 'w-5 h-5', container: 'w-8 h-8' },
  lg: { icon: 'w-6 h-6', container: 'w-10 h-10' },
};

const methodLabels: Record<PaymentMethodType, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  sepa: 'SEPA Transfer',
  unknown: 'Unknown',
};

// Stripe Logo SVG
const StripeLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
  </svg>
);

// PayPal Logo SVG
const PayPalLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.063 4.49-1.267 7.26-5.817 7.26H12.6c-.524 0-.968.382-1.05.9l-1.12 7.106-.107.682a.641.641 0 0 0 .633.74h3.61c.44 0 .814-.319.882-.752l.037-.19.706-4.45.044-.24a.88.88 0 0 1 .87-.752h.54c3.545 0 6.323-1.44 7.133-5.602.338-1.74.163-3.195-.596-4.161z"/>
  </svg>
);

// Visa Logo SVG
const VisaLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102h2.037zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.332c-1.917 0-3.266 1.02-3.278 2.479-.013 1.08.963 1.683 1.7 2.042.756.368 1.01.603 1.006.932-.005.503-.603.726-1.16.734-.975.015-1.54-.263-1.992-.474l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.375-2.567zm5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.551l-2.909 6.945h2.036l.405-1.12h2.488l.233 1.12zm-2.166-2.656l1.02-2.815.588 2.815h-1.608zm-8.17-4.84l-1.603 7.496H8.34l1.605-7.496h1.925z"/>
  </svg>
);

// Mastercard Logo SVG
const MastercardLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="7" cy="12" r="7" fill="#EB001B"/>
    <circle cx="17" cy="12" r="7" fill="#F79E1B"/>
    <path d="M12 5.5a6.98 6.98 0 012.61 5.5 6.98 6.98 0 01-2.61 5.5A6.98 6.98 0 019.39 11a6.98 6.98 0 012.61-5.5z" fill="#FF5F00"/>
  </svg>
);

// Amex Logo SVG
const AmexLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#006FCF" aria-hidden="true">
    <path d="M22.4 12c0 5.73-4.67 10.4-10.4 10.4S1.6 17.73 1.6 12 6.27 1.6 12 1.6 22.4 6.27 22.4 12zM5.5 8.5L3.5 12l2 3.5h2.2l-1.5-2.6h1.3v2.6h1.8v-2.6h1.3l-1.5 2.6h2.2l2-3.5-2-3.5h-2.2l1.5 2.6H9.3V8.5H7.5v2.6H6.2l1.5-2.6H5.5zm9.1 0v7h5.4v-1.5h-3.4v-1.4h3.2v-1.5h-3.2v-1.1h3.4V8.5h-5.4z"/>
  </svg>
);

// Detect card brand from card number prefix or brand string
const detectCardBrand = (cardBrand?: string): PaymentMethodType => {
  if (!cardBrand) return 'card';

  const brand = cardBrand.toLowerCase();
  if (brand.includes('visa')) return 'visa';
  if (brand.includes('mastercard') || brand.includes('master')) return 'mastercard';
  if (brand.includes('amex') || brand.includes('american')) return 'amex';

  return 'card';
};

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  method,
  cardBrand,
  size = 'md',
  showTooltip = true,
  className,
}) => {
  const sizes = sizeMap[size];

  // Auto-detect card brand if method is 'card'
  const effectiveMethod = method === 'card' ? detectCardBrand(cardBrand) : method;
  const label = methodLabels[effectiveMethod];

  const renderIcon = () => {
    switch (effectiveMethod) {
      case 'stripe':
        return <StripeLogo className={cn(sizes.icon, 'text-[#635BFF]')} />;

      case 'paypal':
        return <PayPalLogo className={cn(sizes.icon, 'text-[#003087]')} />;

      case 'visa':
        return <VisaLogo className={cn(sizes.icon, 'text-[#1A1F71]')} />;

      case 'mastercard':
        return <MastercardLogo className={sizes.icon} />;

      case 'amex':
        return <AmexLogo className={sizes.icon} />;

      case 'bank_transfer':
      case 'sepa':
        return <Building2 className={cn(sizes.icon, 'text-gray-600')} />;

      case 'card':
      case 'unknown':
      default:
        return <CreditCard className={cn(sizes.icon, 'text-gray-600')} />;
    }
  };

  const iconContent = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded bg-gray-50 border border-gray-200',
        sizes.container,
        className
      )}
    >
      {renderIcon()}
    </div>
  );

  if (showTooltip) {
    return (
      <div className="relative group">
        {iconContent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return iconContent;
};

export default PaymentMethodIcon;

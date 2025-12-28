// src/components/common/ShareButton.tsx
import React, { useState, useCallback } from 'react';
import { Share2, Check, Copy, Link2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useWebShare } from '@/hooks/useWebShare';

interface ShareButtonProps {
  /** Content to share */
  data: {
    title?: string;
    text?: string;
    url?: string;
  };
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label */
  label?: string;
  /** Show label on mobile */
  showLabelOnMobile?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback after successful share */
  onShareSuccess?: (method: 'native' | 'clipboard') => void;
  /** Callback after share error */
  onShareError?: (error: Error) => void;
}

type FeedbackState = 'idle' | 'shared' | 'copied' | 'error';

const ShareButton: React.FC<ShareButtonProps> = ({
  data,
  variant = 'secondary',
  size = 'md',
  label,
  showLabelOnMobile = false,
  className = '',
  onShareSuccess,
  onShareError,
}) => {
  const intl = useIntl();
  const { share, isSupported } = useWebShare();
  const effectiveLabel = label || intl.formatMessage({ id: 'common.share' });
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setFeedback('idle');

    try {
      const result = await share(data);

      if (result.success) {
        setFeedback(result.method === 'native' ? 'shared' : 'copied');
        onShareSuccess?.(result.method);
      } else if (result.error?.name !== 'AbortError') {
        // User cancelled is not an error
        setFeedback('error');
        onShareError?.(result.error || new Error('Share failed'));
      }
    } catch (error) {
      setFeedback('error');
      onShareError?.(error as Error);
    } finally {
      setIsLoading(false);

      // Reset feedback after delay
      setTimeout(() => setFeedback('idle'), 2000);
    }
  }, [data, share, isLoading, onShareSuccess, onShareError]);

  // Size classes
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Variant classes
  const variantClasses = {
    primary:
      'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm',
    secondary:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    ghost:
      'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500',
    icon: 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:ring-gray-500 !p-2 rounded-full',
  };

  // Get current icon based on feedback state
  const getIcon = () => {
    switch (feedback) {
      case 'shared':
        return <Check className={`${iconSizes[size]} text-green-500`} />;
      case 'copied':
        return <Copy className={`${iconSizes[size]} text-blue-500`} />;
      case 'error':
        return <Link2 className={`${iconSizes[size]} text-red-500`} />;
      default:
        return <Share2 className={iconSizes[size]} />;
    }
  };

  // Get feedback text
  const getFeedbackText = () => {
    switch (feedback) {
      case 'shared':
        return intl.formatMessage({ id: 'common.shared' });
      case 'copied':
        return intl.formatMessage({ id: 'common.copied' });
      case 'error':
        return intl.formatMessage({ id: 'common.error' });
      default:
        return effectiveLabel;
    }
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={isLoading}
        className={`
          inline-flex items-center justify-center
          rounded-full transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses.icon}
          ${className}
        `}
        aria-label={effectiveLabel}
        title={effectiveLabel}
      >
        {isLoading ? (
          <div className={`${iconSizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-gray-600`} />
        ) : (
          getIcon()
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isLoading}
      className={`
        inline-flex items-center justify-center
        rounded-lg font-medium transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-label={effectiveLabel}
    >
      {isLoading ? (
        <div className={`${iconSizes[size]} animate-spin rounded-full border-2 border-current border-t-transparent`} />
      ) : (
        getIcon()
      )}
      <span className={showLabelOnMobile ? '' : 'hidden sm:inline'}>
        {getFeedbackText()}
      </span>
    </button>
  );
};

// Quick share utilities
export const ShareProviderButton: React.FC<{
  provider: { name: string; specialty?: string; slug: string };
  variant?: ShareButtonProps['variant'];
  size?: ShareButtonProps['size'];
  className?: string;
}> = ({ provider, variant = 'ghost', size = 'sm', className }) => {
  const intl = useIntl();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <ShareButton
      data={{
        title: `${provider.name} - SOS Expat`,
        text: provider.specialty
          ? intl.formatMessage({ id: 'share.provider.withSpecialty' }, { name: provider.name, specialty: provider.specialty })
          : intl.formatMessage({ id: 'share.provider.simple' }, { name: provider.name }),
        url: `${baseUrl}/provider/${provider.slug}`,
      }}
      variant={variant}
      size={size}
      label={intl.formatMessage({ id: 'share.profile' })}
      className={className}
    />
  );
};

export const ShareAppButton: React.FC<{
  referralCode?: string;
  variant?: ShareButtonProps['variant'];
  size?: ShareButtonProps['size'];
  className?: string;
}> = ({ referralCode, variant = 'primary', size = 'md', className }) => {
  const intl = useIntl();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com';

  return (
    <ShareButton
      data={{
        title: intl.formatMessage({ id: 'share.app.title' }),
        text: intl.formatMessage({ id: 'share.app.text' }),
        url: referralCode ? `${baseUrl}/?ref=${referralCode}` : baseUrl,
      }}
      variant={variant}
      size={size}
      label={intl.formatMessage({ id: 'share.app.label' })}
      showLabelOnMobile
      className={className}
    />
  );
};

export default ShareButton;

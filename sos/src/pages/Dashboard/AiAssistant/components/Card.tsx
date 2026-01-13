/**
 * Modern Card Components - 2026 Design System
 * Glassmorphism, Gradients, Elevated styles
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

type CardVariant = 'default' | 'glass' | 'gradient' | 'elevated' | 'interactive' | 'status';
type StatusType = 'success' | 'warning' | 'error' | 'info';

interface CardProps {
  variant?: CardVariant;
  status?: StatusType;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const statusStyles: Record<StatusType, string> = {
  success: 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/50 to-transparent',
  warning: 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-transparent',
  error: 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-transparent',
  info: 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent',
};

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-gray-200',
  glass: 'bg-white/70 backdrop-blur-xl border border-white/30 shadow-lg',
  gradient: 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-0',
  elevated: 'bg-white border border-gray-100 shadow-lg hover:shadow-xl',
  interactive: 'bg-white border border-gray-200 cursor-pointer active:scale-[0.98]',
  status: 'bg-white border border-gray-200',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  status,
  hoverable = false,
  onClick,
  className,
  children,
}) => {
  const isClickable = onClick || variant === 'interactive';

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={cn(
        'rounded-2xl p-6 transition-all duration-200',
        variantStyles[variant],
        status && variant === 'status' && statusStyles[status],
        hoverable && 'hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5',
        isClickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  );
};

// Glass Card with blur effect
export const GlassCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="glass" {...props} />
);

// Gradient Card for CTAs
export const GradientCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="gradient" {...props} />
);

// Elevated Card with shadow
export const ElevatedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="elevated" {...props} />
);

// Interactive Card with press effect
export const InteractiveCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="interactive" hoverable {...props} />
);

// Status Card with colored border
export const StatusCard: React.FC<Omit<CardProps, 'variant'> & { status: StatusType }> = (props) => (
  <Card variant="status" {...props} />
);

// Card Header component
interface CardHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  icon,
  title,
  subtitle,
  action,
  className,
}) => (
  <div className={cn('flex items-center justify-between mb-4', className)}>
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2 bg-indigo-100 rounded-xl">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Card Content wrapper
export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('', className)}>{children}</div>
);

// Card Footer
export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-100', className)}>{children}</div>
);

export default Card;

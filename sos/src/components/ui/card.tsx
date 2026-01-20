// src/components/ui/card.tsx
// Design moderne 2026 - Responsive et accessible
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'article' | 'section' | 'div';
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  id?: string;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

// Helper function to merge class names
const mergeClasses = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(' ');

// Card principal - semantique et responsive
export function Card({ children, className, as: Component = 'div' }: CardProps) {
  return (
    <Component
      className={mergeClasses(
        'rounded-2xl bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-800',
        'shadow-sm hover:shadow-md transition-shadow duration-200',
        'overflow-hidden',
        className
      )}
    >
      {children}
    </Component>
  );
}

// CardHeader - responsive padding
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={mergeClasses(
        'px-4 py-4 sm:px-6 sm:py-5',
        'border-b border-gray-100 dark:border-gray-800',
        className
      )}
    >
      {children}
    </div>
  );
}

// CardTitle - accessible heading
export function CardTitle({ children, className, as: Component = 'h2', id }: CardTitleProps) {
  return (
    <Component
      id={id}
      className={mergeClasses(
        'text-lg sm:text-xl font-semibold',
        'text-gray-900 dark:text-white',
        'leading-tight',
        className
      )}
    >
      {children}
    </Component>
  );
}

// CardDescription - text secondaire
export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p
      className={mergeClasses(
        'text-sm text-gray-600 dark:text-gray-400',
        'mt-1.5',
        className
      )}
    >
      {children}
    </p>
  );
}

// CardContent - responsive padding
export function CardContent({ children, className }: CardContentProps) {
  return (
    <div
      className={mergeClasses(
        'px-4 py-4 sm:px-6 sm:py-5',
        className
      )}
    >
      {children}
    </div>
  );
}

// CardFooter - pour actions
export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={mergeClasses(
        'px-4 py-3 sm:px-6 sm:py-4',
        'border-t border-gray-100 dark:border-gray-800',
        'bg-gray-50 dark:bg-gray-900/50',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Card;

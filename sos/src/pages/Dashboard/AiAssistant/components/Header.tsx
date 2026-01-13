/**
 * AI Assistant Header Component
 * Modern header with gradient icon and animations
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { useIntl } from 'react-intl';
import { cn } from '../../../../utils/cn';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const intl = useIntl();

  return (
    <header className={cn('mb-8', className)}>
      <div className="flex items-center gap-4">
        {/* Animated Icon Container */}
        <div className="relative">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/25 animate-float">
            <Bot className="w-7 h-7 text-white" />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-xl opacity-40 -z-10" />
        </div>

        {/* Title & Description */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {intl.formatMessage({ id: 'aiAssistant.title' })}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {intl.formatMessage({ id: 'aiAssistant.description' })}
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;

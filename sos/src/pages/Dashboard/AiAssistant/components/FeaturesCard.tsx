/**
 * AI Features Card Component
 * Showcases AI assistant capabilities
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader } from './Card';

interface FeaturesCardProps {
  className?: string;
}

export const FeaturesCard: React.FC<FeaturesCardProps> = ({ className }) => {
  const intl = useIntl();

  const features = [
    { key: 'autoBooking', id: 'aiAssistant.feature.autoBooking' },
    { key: 'realTimeChat', id: 'aiAssistant.feature.realTimeChat' },
    { key: 'webSearch', id: 'aiAssistant.feature.webSearch' },
    { key: 'contextPreserved', id: 'aiAssistant.feature.contextPreserved' },
  ];

  return (
    <Card className={className}>
      <CardHeader
        icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        title={intl.formatMessage({ id: 'aiAssistant.features' })}
      />

      <ul className="space-y-2.5">
        {features.map((feature, index) => (
          <li
            key={feature.key}
            className="flex items-center gap-3 text-sm text-gray-600 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <span className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex-shrink-0" />
            {intl.formatMessage({ id: feature.id })}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default FeaturesCard;

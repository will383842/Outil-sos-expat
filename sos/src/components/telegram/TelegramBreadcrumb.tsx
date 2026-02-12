// =============================================================================
// TelegramBreadcrumb.tsx - Fil d'Ariane pour Telegram Marketing
// =============================================================================

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Send } from 'lucide-react';
import { useIntl } from 'react-intl';
import { buildTelegramBreadcrumb } from '../../config/telegramMenu';

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramBreadcrumb: React.FC = () => {
  const location = useLocation();
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  const breadcrumbItems = useMemo(() => {
    const items = buildTelegramBreadcrumb(location.pathname);

    // Toujours ajouter "Home" au début
    const homeItem = {
      id: 'home',
      labelKey: 'telegram.breadcrumb.home',
      path: '/admin/toolbox',
      label: t('telegram.breadcrumb.home'),
    };

    // Ajouter "Telegram" après Home
    const telegramItem = {
      id: 'telegram',
      labelKey: 'telegram.breadcrumb.telegram',
      path: '/admin/toolbox/telegram/dashboard',
      label: t('telegram.breadcrumb.telegram'),
    };

    const fullItems = [homeItem, telegramItem];

    // Ajouter les items du menu
    items.forEach((item) => {
      fullItems.push({
        ...item,
        label: t(item.labelKey),
      });
    });

    return fullItems;
  }, [location.pathname, t]);

  return (
    <nav className="flex items-center text-sm" aria-label="Breadcrumb">
      <Send className="h-4 w-4 text-sky-600 mr-2 flex-shrink-0" />

      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
          )}
          {index < breadcrumbItems.length - 1 ? (
            <Link
              to={item.path || '#'}
              className="text-gray-500 hover:text-sky-600 transition-colors truncate"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium truncate">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default TelegramBreadcrumb;

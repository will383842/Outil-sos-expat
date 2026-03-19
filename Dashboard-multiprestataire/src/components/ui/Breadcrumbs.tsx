import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ROUTE_LABELS: Record<string, string> = {
  '': 'nav.dashboard',
  'requests': 'nav.requests',
  'team': 'nav.team',
  'stats': 'nav.stats',
  'billing': 'nav.billing',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { t } = useTranslation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      <Link to="/" className="flex items-center gap-1 hover:text-gray-700 transition-colors min-h-[32px]">
        <Home className="w-4 h-4" aria-hidden="true" />
      </Link>
      {segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = ROUTE_LABELS[segment] ? t(ROUTE_LABELS[segment]) : segment;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-gray-900">{label}</span>
            ) : (
              <Link to={path} className="hover:text-gray-700 transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

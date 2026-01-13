/**
 * LocaleLink Component
 * Link component that automatically adds locale prefix to paths
 */
import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { getLocaleString, parseLocaleFromPath } from "../core/routing/localeRoutes";

interface LocaleLinkProps {
  to: string;
  children: React.ReactNode;
  [key: string]: any;
}

export const LocaleLink: React.FC<LocaleLinkProps> = ({ to, children, ...props }) => {
  const location = useLocation();
  const { language } = useApp();

  // Get current locale from URL or use default - must be called before any early returns
  const currentLocale = useMemo(() => {
    const parsed = parseLocaleFromPath(location.pathname);
    return parsed.locale || getLocaleString(language);
  }, [location.pathname, language]);

  // Skip locale for admin routes
  if (to.startsWith("/admin")) {
    return <Link to={to} {...props}>{children}</Link>;
  }

  // If path already has locale, use as-is
  if (/^\/[a-z]{2}-[a-z]{2}\//.test(to)) {
    return <Link to={to} {...props}>{children}</Link>;
  }

  const localePath = `/${currentLocale}${to.startsWith("/") ? to : `/${to}`}`;

  return <Link to={localePath} {...props}>{children}</Link>;
};


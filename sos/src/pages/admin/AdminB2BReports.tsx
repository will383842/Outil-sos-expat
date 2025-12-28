import React from 'react';
import { useIntl } from 'react-intl';

export default function Page(){
  const intl = useIntl();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">{intl.formatMessage({ id: 'admin.b2b.reports.title' })}</h1>
      <p className="text-sm opacity-80">{intl.formatMessage({ id: 'admin.b2b.uiOnlyNotice' })}</p>
    </div>
  );
}

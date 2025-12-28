import { useIntl } from 'react-intl';

export default function Invoices() {
  const intl = useIntl();
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">{intl.formatMessage({ id: 'admin.finance.invoices.title' })}</h1>
      <p>{intl.formatMessage({ id: 'admin.finance.invoices.subtitle' })}</p>
    </div>
  );
}

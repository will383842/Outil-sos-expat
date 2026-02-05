import React from 'react';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { resolveCountryName, OTHER_COUNTRY } from '@/data/countries';

export const Step6ConfirmScreen: React.FC = () => {
  const intl = useIntl();
  const { form, provider, isLawyer, displayEUR, displayDuration } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const currentCountryCode = watch('currentCountry');
  const autrePays = watch('autrePays');
  const title = watch('title');
  const clientPhone = watch('clientPhone');

  // Resolve country code to display name in user's language
  const locale = intl.locale;
  const countryDisplay = currentCountryCode === OTHER_COUNTRY
    ? (autrePays || currentCountryCode)
    : resolveCountryName(currentCountryCode, locale);

  return (
    <div className="px-4 py-6 pb-32">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step6.title',
          defaultMessage: 'Confirmez votre demande',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step6.subtitle',
          defaultMessage: 'Vérifiez vos informations',
        })}
      </p>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Nom</span>
            <span className="font-medium">{firstName} {lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pays</span>
            <span className="font-medium">{countryDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Demande</span>
            <span className="font-medium truncate max-w-[200px]">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Téléphone</span>
            <span className="font-medium">{clientPhone}</span>
          </div>
        </div>
      </div>

      {/* Provider + Price */}
      <div className="bg-red-50 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {provider?.avatar ? (
            <img
              src={provider.avatar}
              alt={provider.name || ''}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-600 font-bold">
              {provider?.name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{provider?.name}</p>
            <p className="text-xs text-gray-500">{isLawyer ? 'Avocat' : 'Expatrié'} • {displayDuration} min</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-red-600">{displayEUR.toFixed(2)}€</p>
        </div>
      </div>

      {/* Terms checkbox */}
      <div className={`p-4 rounded-xl border-2 mb-4 ${watch('acceptTerms') ? 'border-green-400 bg-green-50' : 'border-amber-400 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <Controller
            control={control}
            name="acceptTerms"
            rules={{
              validate: (v) => v ? true : intl.formatMessage({ id: 'bookingRequest.validators.accept' }),
            }}
            render={({ field }) => (
              <input
                id="acceptTerms"
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-5 w-5 mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
            )}
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700">
            {intl.formatMessage({ id: 'bookingRequest.fields.accept' })}
            <Link target="_blank" to="/cgu-clients" className="text-red-600 underline font-medium">
              {intl.formatMessage({ id: 'bookingRequest.cgu' })}
            </Link>
            {intl.formatMessage({ id: 'bookingRequest.fields.andConfirm' })}
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="mt-2 text-sm text-red-600">{String(errors.acceptTerms.message)}</p>
        )}
      </div>

      {/* Payment reassurance */}
      <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex items-start gap-3">
        <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">
            {intl.formatMessage({ id: 'bookingRequest.paymentReassurance.title' })}
          </p>
          <p className="text-xs text-green-700">
            {intl.formatMessage({ id: 'bookingRequest.paymentReassurance' })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step6ConfirmScreen;

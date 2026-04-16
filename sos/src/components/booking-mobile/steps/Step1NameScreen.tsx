import React from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { CheckCircle } from 'lucide-react';
import { useMobileBooking } from '../context/MobileBookingContext';

export const Step1NameScreen: React.FC = () => {
  const intl = useIntl();
  const { form } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const firstName = watch('firstName');
  // Considéré "pré-rempli depuis le profil" si la valeur existe dès le montage
  // et que l'utilisateur n'a pas encore interagi (pas d'erreur de validation)
  const isPrefilled = Boolean(firstName?.trim()) && !errors.firstName;

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step1.title',
          defaultMessage: 'Comment vous appelez-vous ?',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step1.subtitle',
          defaultMessage: 'Pour que l\'expert puisse vous identifier',
        })}
      </p>

      <div className="space-y-4">
        {/* First name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: 'bookingRequest.fields.firstName' })}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <Controller
            control={control}
            name="firstName"
            rules={{
              required: intl.formatMessage({ id: 'bookingRequest.validators.firstName' }),
            }}
            render={({ field }) => (
              <div className="relative">
                <input
                  {...field}
                  type="text"
                  autoComplete="given-name"
                  placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.firstName' })}
                  className={`w-full px-4 py-4 border-2 rounded-2xl text-base pr-12 ${
                    errors.firstName
                      ? 'border-red-400 focus:border-red-500'
                      : isPrefilled
                      ? 'border-green-400 bg-green-50 focus:border-green-500'
                      : 'border-gray-300 focus:border-red-500'
                  }`}
                  maxLength={50}
                  autoFocus={!isPrefilled}
                />
                {isPrefilled && !errors.firstName && (
                  <CheckCircle
                    size={20}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </div>
            )}
          />
          {errors.firstName && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {String(errors.firstName.message)}
            </p>
          )}
          {isPrefilled && !errors.firstName && (
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step1.prefilled',
                defaultMessage: 'Récupéré depuis votre profil',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1NameScreen;

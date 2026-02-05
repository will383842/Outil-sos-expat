import React from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useMobileBooking } from '../context/MobileBookingContext';
import IntlPhoneInput from '@/components/forms-data/IntlPhoneInput';

export const Step5PhoneScreen: React.FC = () => {
  const intl = useIntl();
  const { form } = useMobileBooking();
  const { control, formState: { errors } } = form;

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step5.title',
          defaultMessage: 'Votre numéro de téléphone',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step5.subtitle',
          defaultMessage: 'Pour que l\'expert puisse vous rappeler',
        })}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {intl.formatMessage({ id: 'bookingRequest.fields.phone' })}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Controller
          control={control}
          name="clientPhone"
          rules={{
            required: intl.formatMessage({ id: 'bookingRequest.validators.phone' }),
            validate: (v) => {
              if (!v) return intl.formatMessage({ id: 'bookingRequest.validators.phone' });
              try {
                const p = parsePhoneNumberFromString(v);
                return p?.isValid() ? true : intl.formatMessage({ id: 'bookingRequest.validators.phone' });
              } catch {
                return intl.formatMessage({ id: 'bookingRequest.validators.phone' });
              }
            },
          }}
          render={({ field }) => (
            <IntlPhoneInput
              value={field.value || ''}
              onChange={(val: string) => field.onChange(val)}
              defaultCountry="fr"
              placeholder="+33 6 12 34 56 78"
              className={errors.clientPhone ? 'error' : ''}
              name="clientPhone"
            />
          )}
        />
        {errors.clientPhone && (
          <p className="mt-1 text-sm text-red-600">{String(errors.clientPhone.message)}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          {intl.formatMessage({ id: 'bookingRequest.hints.phone' })}
        </p>
      </div>
    </div>
  );
};

export default Step5PhoneScreen;

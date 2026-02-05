import React, { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { getCountriesForLocale, OTHER_COUNTRY } from '@/data/countries';

export const Step2CountryScreen: React.FC = () => {
  const intl = useIntl();
  const { form, goNextStep, isCurrentStepValid } = useMobileBooking();
  const { control, watch, setValue, formState: { errors } } = form;

  const currentCountry = watch('currentCountry');

  // Generate countries list in the user's current language
  const locale = intl.locale;
  const countries = useMemo(() => getCountriesForLocale(locale), [locale]);

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step2.title',
          defaultMessage: 'Dans quel pays êtes-vous ?',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step2.subtitle',
          defaultMessage: 'Le pays où vous avez besoin d\'aide',
        })}
      </p>

      {/* Country select */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {intl.formatMessage({ id: 'bookingRequest.fields.currentCountry' })}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Controller
          control={control}
          name="currentCountry"
          rules={{
            required: intl.formatMessage({ id: 'bookingRequest.validators.currentCountry' }),
          }}
          render={({ field }) => (
            <select
              {...field}
              className={`w-full px-4 py-4 border-2 rounded-xl text-base bg-white appearance-none ${
                errors.currentCountry ? 'border-red-400' : 'border-gray-200 focus:border-red-500'
              }`}
              onChange={(e) => {
                field.onChange(e.target.value);
                if (e.target.value !== OTHER_COUNTRY) {
                  setValue('autrePays', '');
                }
              }}
            >
              <option value="">
                {intl.formatMessage({ id: 'bookingRequest.validators.selectCountry' })}
              </option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
              <option value={OTHER_COUNTRY}>
                {intl.formatMessage({ id: 'bookingRequest.mobile.step2.other', defaultMessage: 'Autre pays' })}
              </option>
            </select>
          )}
        />
        {errors.currentCountry && (
          <p className="mt-1 text-sm text-red-600">{String(errors.currentCountry.message)}</p>
        )}
      </div>

      {/* Other country input */}
      {currentCountry === OTHER_COUNTRY && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: 'bookingRequest.fields.otherCountry' })}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <Controller
            control={control}
            name="autrePays"
            rules={{
              validate: (v) => v?.trim() ? true : intl.formatMessage({ id: 'bookingRequest.validators.otherCountry' }),
            }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isCurrentStepValid) goNextStep();
                  }
                }}
                placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.otherCountry' })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-base focus:border-red-500"
              />
            )}
          />
        </div>
      )}
    </div>
  );
};

export default Step2CountryScreen;

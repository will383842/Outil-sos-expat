import React from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

export const Step3TitleScreen: React.FC = () => {
  const intl = useIntl();
  const { form } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const title = watch('title');
  const titleLength = title?.trim().length ?? 0;
  const minLength = 10;

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step3.title',
          defaultMessage: 'Résumez votre demande',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step3.subtitle',
          defaultMessage: 'Un titre court et clair',
        })}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {intl.formatMessage({ id: 'bookingRequest.fields.title' })}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Controller
          control={control}
          name="title"
          rules={{
            required: intl.formatMessage({ id: 'bookingRequest.validators.title' }),
            minLength: {
              value: minLength,
              message: intl.formatMessage({ id: 'bookingRequest.validators.title' }),
            },
          }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.title' })}
              className={`w-full px-4 py-4 border-2 rounded-xl text-base ${
                errors.title ? 'border-red-400' : 'border-gray-200 focus:border-red-500'
              }`}
              maxLength={150}
              autoFocus
            />
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.title ? (
            <p className="text-sm text-red-600">{String(errors.title.message)}</p>
          ) : (
            <p className="text-xs text-gray-500">
              {intl.formatMessage({ id: 'bookingRequest.hints.title' })}
            </p>
          )}
          <span className={`text-xs ${titleLength < minLength ? 'text-orange-500' : 'text-green-600'}`}>
            {titleLength}/{minLength} min
          </span>
        </div>
      </div>
    </div>
  );
};

export default Step3TitleScreen;

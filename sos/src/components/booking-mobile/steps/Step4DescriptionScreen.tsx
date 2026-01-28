import React from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

export const Step4DescriptionScreen: React.FC = () => {
  const intl = useIntl();
  const { form } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const description = watch('description');
  const descLength = description?.trim().length ?? 0;
  const minLength = 50;

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step4.title',
          defaultMessage: 'Décrivez en détail',
        })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        {intl.formatMessage({
          id: 'bookingRequest.mobile.step4.subtitle',
          defaultMessage: 'Plus vous détaillez, meilleure sera l\'aide',
        })}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {intl.formatMessage({ id: 'bookingRequest.fields.description' })}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Controller
          control={control}
          name="description"
          rules={{
            required: intl.formatMessage({ id: 'bookingRequest.validators.description' }),
            minLength: {
              value: minLength,
              message: intl.formatMessage({ id: 'bookingRequest.validators.description' }),
            },
          }}
          render={({ field }) => (
            <textarea
              {...field}
              placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.description' })}
              className={`w-full px-4 py-4 border-2 rounded-xl text-base resize-none ${
                errors.description ? 'border-red-400' : 'border-gray-200 focus:border-red-500'
              }`}
              rows={6}
              autoFocus
            />
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-sm text-red-600">{String(errors.description.message)}</p>
          ) : (
            <p className="text-xs text-gray-500">
              {intl.formatMessage({ id: 'bookingRequest.hints.desc' })}
            </p>
          )}
          <span className={`text-xs ${descLength < minLength ? 'text-orange-500' : 'text-green-600'}`}>
            {descLength}/{minLength} min
          </span>
        </div>
      </div>
    </div>
  );
};

export default Step4DescriptionScreen;

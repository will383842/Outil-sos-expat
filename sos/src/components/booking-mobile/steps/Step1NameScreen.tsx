import React, { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

export const Step1NameScreen: React.FC = () => {
  const intl = useIntl();
  const { form, goNextStep, isCurrentStepValid } = useMobileBooking();
  const { control, formState: { errors } } = form;
  const lastNameRef = useRef<HTMLInputElement | null>(null);

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
              <input
                {...field}
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lastNameRef.current?.focus();
                  }
                }}
                placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.firstName' })}
                className={`w-full px-4 py-4 border-2 rounded-xl text-base ${
                  errors.firstName ? 'border-red-400' : 'border-gray-200 focus:border-red-500'
                }`}
                maxLength={50}
                autoFocus
              />
            )}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{String(errors.firstName.message)}</p>
          )}
        </div>

        {/* Last name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: 'bookingRequest.fields.lastName' })}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <Controller
            control={control}
            name="lastName"
            rules={{
              required: intl.formatMessage({ id: 'bookingRequest.validators.lastName' }),
            }}
            render={({ field }) => (
              <input
                {...field}
                ref={(el) => {
                  field.ref(el);
                  lastNameRef.current = el;
                }}
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isCurrentStepValid) goNextStep();
                  }
                }}
                placeholder={intl.formatMessage({ id: 'bookingRequest.placeholders.lastName' })}
                className={`w-full px-4 py-4 border-2 rounded-xl text-base ${
                  errors.lastName ? 'border-red-400' : 'border-gray-200 focus:border-red-500'
                }`}
                maxLength={50}
              />
            )}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{String(errors.lastName.message)}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step1NameScreen;

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { User, Sparkles } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { AnimatedInput } from '../ui/AnimatedInput';

export const Step1NameScreen: React.FC = () => {
  const intl = useIntl();
  const { form, animationDirection, getStepValidationStatus } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const firstName = watch('firstName');
  const lastName = watch('lastName');

  const firstNameRef = useRef<HTMLInputElement>(null);

  // Auto-focus first field
  useEffect(() => {
    const timer = setTimeout(() => {
      firstNameRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === 'forward' ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === 'forward' ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      custom={animationDirection}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="px-4 py-6"
    >
      {/* Question header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 mb-4 shadow-lg shadow-red-500/25">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step1.title',
            defaultMessage: 'Comment vous appelez-vous ?',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step1.subtitle',
            defaultMessage: 'Pour que l\'expert puisse vous identifier',
          })}
        </p>
      </motion.div>

      {/* Form fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        {/* First name */}
        <Controller
          control={control}
          name="firstName"
          rules={{
            required: intl.formatMessage({
              id: 'bookingRequest.validators.firstName',
              defaultMessage: 'Prenom requis',
            }),
          }}
          render={({ field }) => (
            <AnimatedInput
              label={intl.formatMessage({
                id: 'bookingRequest.fields.firstName',
                defaultMessage: 'Prenom',
              })}
              name="firstName"
              placeholder={intl.formatMessage({
                id: 'bookingRequest.placeholders.firstName',
                defaultMessage: 'Votre prenom',
              })}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.firstName?.message as string}
              isValid={Boolean(firstName?.trim())}
              required
              autoFocus
              maxLength={50}
            />
          )}
        />

        {/* Last name */}
        <Controller
          control={control}
          name="lastName"
          rules={{
            required: intl.formatMessage({
              id: 'bookingRequest.validators.lastName',
              defaultMessage: 'Nom requis',
            }),
          }}
          render={({ field }) => (
            <AnimatedInput
              label={intl.formatMessage({
                id: 'bookingRequest.fields.lastName',
                defaultMessage: 'Nom',
              })}
              name="lastName"
              placeholder={intl.formatMessage({
                id: 'bookingRequest.placeholders.lastName',
                defaultMessage: 'Votre nom',
              })}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.lastName?.message as string}
              isValid={Boolean(lastName?.trim())}
              required
              maxLength={50}
            />
          )}
        />
      </motion.div>

      {/* Success feedback */}
      {getStepValidationStatus(1) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-800">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step1.success',
                defaultMessage: 'Parfait !',
              })}
            </p>
            <p className="text-sm text-green-600">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step1.successHint',
                defaultMessage: 'Continuez vers le pays',
              })}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step1NameScreen;

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { Phone, Shield, Clock, Ban } from 'lucide-react';
import { useIntl } from 'react-intl';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useMobileBooking } from '../context/MobileBookingContext';
import IntlPhoneInput from '@/components/forms-data/IntlPhoneInput';

export const Step5PhoneScreen: React.FC = () => {
  const intl = useIntl();
  const { form, animationDirection, getStepValidationStatus } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const clientPhone = watch('clientPhone');

  // Validate phone
  const isPhoneValid = useMemo(() => {
    if (!clientPhone) return false;
    try {
      const parsed = parsePhoneNumberFromString(clientPhone);
      return parsed?.isValid() ?? false;
    } catch {
      return false;
    }
  }, [clientPhone]);

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
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 mb-4 shadow-lg shadow-green-500/25">
          <Phone className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step5.title',
            defaultMessage: 'Votre numero de telephone',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step5.subtitle',
            defaultMessage: 'Pour que l\'expert puisse vous rappeler',
          })}
        </p>
      </motion.div>

      {/* Phone input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
        style={{ zIndex: 100 }}
      >
        <label className="block text-base font-semibold text-gray-800 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.fields.phone',
            defaultMessage: 'Telephone',
          })}
          <span className="text-red-500 ml-1">*</span>
        </label>

        <Controller
          control={control}
          name="clientPhone"
          rules={{
            required: intl.formatMessage({
              id: 'bookingRequest.validators.phone',
              defaultMessage: 'Numero de telephone invalide',
            }),
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

        {/* Error message */}
        {errors.clientPhone && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-red-600"
          >
            {String(errors.clientPhone.message)}
          </motion.p>
        )}

        {/* Valid phone display */}
        {isPhoneValid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2 text-green-600"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step5.valid',
                defaultMessage: 'Numero valide',
              })}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 space-y-3"
      >
        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step5.timing',
                defaultMessage: 'Appel dans les 5 minutes',
              })}
            </p>
            <p className="text-xs text-gray-500">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step5.timingDesc',
                defaultMessage: 'Apres validation du paiement',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Ban className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step5.noSpam',
                defaultMessage: 'Zero spam garanti',
              })}
            </p>
            <p className="text-xs text-gray-500">
              {intl.formatMessage({
                id: 'bookingRequest.hints.phone',
                defaultMessage: 'Uniquement pour l\'appel avec l\'expert',
              })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success feedback */}
      {getStepValidationStatus(5) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200"
        >
          <p className="text-green-800 font-medium text-center">
            {intl.formatMessage({
              id: 'bookingRequest.mobile.step5.success',
              defaultMessage: 'Parfait ! Derniere etape : confirmation.',
            })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step5PhoneScreen;

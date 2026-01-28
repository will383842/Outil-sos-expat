import React from 'react';
import { motion } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { MessageSquare, Target, Clock, HelpCircle } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { AnimatedInput } from '../ui/AnimatedInput';

export const Step4DescriptionScreen: React.FC = () => {
  const intl = useIntl();
  const { form, animationDirection, getStepValidationStatus } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const description = watch('description');
  const descLength = description?.trim().length ?? 0;
  const minLength = 50;

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

  const tips = [
    {
      icon: Target,
      label: intl.formatMessage({ id: 'bookingRequest.mobile.step4.tip1', defaultMessage: 'Votre objectif' }),
    },
    {
      icon: Clock,
      label: intl.formatMessage({ id: 'bookingRequest.mobile.step4.tip2', defaultMessage: 'Vos delais' }),
    },
    {
      icon: HelpCircle,
      label: intl.formatMessage({ id: 'bookingRequest.mobile.step4.tip3', defaultMessage: 'Vos questions' }),
    },
  ];

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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 mb-4 shadow-lg shadow-cyan-500/25">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step4.title',
            defaultMessage: 'Decrivez en detail',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step4.subtitle',
            defaultMessage: 'Plus vous detaillez, meilleure sera l\'aide',
          })}
        </p>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex justify-center gap-4 mb-5"
      >
        {tips.map(({ icon: Icon, label }, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs text-gray-600 text-center">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Description textarea */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Controller
          control={control}
          name="description"
          rules={{
            required: intl.formatMessage({
              id: 'bookingRequest.validators.description',
              defaultMessage: 'Description requise (min. 50 caracteres)',
            }),
            minLength: {
              value: minLength,
              message: intl.formatMessage({
                id: 'bookingRequest.validators.description',
                defaultMessage: 'La description doit contenir au moins 50 caracteres',
              }),
            },
          }}
          render={({ field }) => (
            <AnimatedInput
              label={intl.formatMessage({
                id: 'bookingRequest.fields.description',
                defaultMessage: 'Description detaillee',
              })}
              name="description"
              type="textarea"
              placeholder={intl.formatMessage({
                id: 'bookingRequest.placeholders.description',
                defaultMessage: 'Expliquez votre situation : contexte, questions precises, objectifs, delais...',
              })}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.description?.message as string}
              isValid={descLength >= minLength}
              hint={intl.formatMessage({
                id: 'bookingRequest.hints.desc',
                defaultMessage: 'Contexte, objectif, delais... donnez-nous de la matiere',
              })}
              required
              autoFocus
              rows={6}
              minLength={minLength}
              showCharCount
            />
          )}
        />
      </motion.div>

      {/* Progress indicator */}
      {descLength > 0 && descLength < minLength && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step4.progress',
                defaultMessage: 'Progression',
              })}
            </span>
            <span className="text-orange-500 font-medium">
              {descLength} / {minLength}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (descLength / minLength) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {minLength - descLength > 0
              ? intl.formatMessage(
                  { id: 'bookingRequest.mobile.step4.remaining', defaultMessage: 'Encore {count} caracteres' },
                  { count: minLength - descLength }
                )
              : ''}
          </p>
        </motion.div>
      )}

      {/* Success feedback */}
      {getStepValidationStatus(4) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-200"
        >
          <p className="text-green-800 font-medium text-center">
            {intl.formatMessage({
              id: 'bookingRequest.mobile.step4.success',
              defaultMessage: 'Description complete ! Plus qu\'une etape.',
            })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step4DescriptionScreen;

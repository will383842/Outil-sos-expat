import React from 'react';
import { motion } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { FileText, Lightbulb } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { AnimatedInput } from '../ui/AnimatedInput';

const TITLE_EXAMPLES = [
  'Visa de travail au Canada',
  'Retraite a l\'etranger',
  'Creation d\'entreprise',
  'Demenagement international',
];

export const Step3TitleScreen: React.FC = () => {
  const intl = useIntl();
  const { form, animationDirection, getStepValidationStatus } = useMobileBooking();
  const { control, watch, setValue, formState: { errors } } = form;

  const title = watch('title');
  const titleLength = title?.trim().length ?? 0;
  const minLength = 10;

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

  const handleExampleClick = (example: string) => {
    setValue('title', example);
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/25">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step3.title',
            defaultMessage: 'Resumez votre demande',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step3.subtitle',
            defaultMessage: 'Un titre court et clair',
          })}
        </p>
      </motion.div>

      {/* Title input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Controller
          control={control}
          name="title"
          rules={{
            required: intl.formatMessage({
              id: 'bookingRequest.validators.title',
              defaultMessage: 'Titre requis (min. 10 caracteres)',
            }),
            minLength: {
              value: minLength,
              message: intl.formatMessage({
                id: 'bookingRequest.validators.title',
                defaultMessage: 'Le titre doit contenir au moins 10 caracteres',
              }),
            },
          }}
          render={({ field }) => (
            <AnimatedInput
              label={intl.formatMessage({
                id: 'bookingRequest.fields.title',
                defaultMessage: 'Titre de votre demande',
              })}
              name="title"
              placeholder={intl.formatMessage({
                id: 'bookingRequest.placeholders.title',
                defaultMessage: 'Ex: Visa travail Canada',
              })}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.title?.message as string}
              isValid={titleLength >= minLength}
              hint={intl.formatMessage({
                id: 'bookingRequest.hints.title',
                defaultMessage: 'Plus votre titre est precis, mieux c\'est !',
              })}
              required
              autoFocus
              maxLength={150}
              minLength={minLength}
              showCharCount
            />
          )}
        />
      </motion.div>

      {/* Examples / suggestions */}
      {titleLength < minLength && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.step3.suggestions',
                defaultMessage: 'Idees de titres',
              })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TITLE_EXAMPLES.map((example, idx) => (
              <motion.button
                key={example}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                onClick={() => handleExampleClick(example)}
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 active:scale-95 transition-all"
              >
                {example}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Success feedback */}
      {getStepValidationStatus(3) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200"
        >
          <p className="text-green-800 font-medium text-center">
            {intl.formatMessage({
              id: 'bookingRequest.mobile.step3.success',
              defaultMessage: 'Titre valide ! Passons aux details.',
            })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step3TitleScreen;

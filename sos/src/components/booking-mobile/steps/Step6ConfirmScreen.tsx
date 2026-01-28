import React from 'react';
import { motion } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { CheckCircle, User, MapPin, FileText, Phone, Shield, Clock, Euro } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

export const Step6ConfirmScreen: React.FC = () => {
  const intl = useIntl();
  const {
    form,
    animationDirection,
    provider,
    isLawyer,
    displayEUR,
    displayDuration,
  } = useMobileBooking();
  const { control, watch, formState: { errors } } = form;

  const firstName = watch('firstName');
  const lastName = watch('lastName');
  const currentCountry = watch('currentCountry');
  const title = watch('title');
  const clientPhone = watch('clientPhone');
  const acceptTerms = watch('acceptTerms');

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

  const summaryItems = [
    { icon: User, label: 'Nom', value: `${firstName} ${lastName}` },
    { icon: MapPin, label: 'Pays', value: currentCountry },
    { icon: FileText, label: 'Demande', value: title },
    { icon: Phone, label: 'Telephone', value: clientPhone },
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 mb-4 shadow-lg shadow-emerald-500/25">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step6.title',
            defaultMessage: 'Confirmez votre demande',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step6.subtitle',
            defaultMessage: 'Verifiez vos informations avant de payer',
          })}
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-50 rounded-2xl p-4 mb-5"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step6.summary',
            defaultMessage: 'Recapitulatif',
          })}
        </h3>
        <div className="space-y-3">
          {summaryItems.map(({ icon: Icon, label, value }, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Icon className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-800 truncate">{value || '---'}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Price card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 mb-5 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {provider?.avatar ? (
              <img
                src={provider.avatar}
                alt={provider.name || ''}
                className="w-12 h-12 rounded-xl object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <p className="font-bold">{provider?.name || '---'}</p>
              <p className="text-sm text-white/80">
                {isLawyer ? 'Avocat' : 'Expat'} • {displayDuration} min
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold">
              {displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 mb-5"
      >
        <div className="flex-1 p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
          <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-blue-700">
            {intl.formatMessage({ id: 'bookingRequest.securePay', defaultMessage: 'Securise' })}
          </p>
        </div>
        <div className="flex-1 p-3 bg-green-50 rounded-xl border border-green-100 text-center">
          <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-green-700">5 min</p>
        </div>
        <div className="flex-1 p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
          <Euro className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-amber-700">
            {intl.formatMessage({ id: 'bookingRequest.mobile.step6.refund', defaultMessage: 'Remboursable' })}
          </p>
        </div>
      </motion.div>

      {/* Terms checkbox */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className={`p-4 rounded-2xl border-2 transition-colors ${
          acceptTerms ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <Controller
            control={control}
            name="acceptTerms"
            rules={{
              validate: (v) =>
                v ? true : intl.formatMessage({ id: 'bookingRequest.validators.accept' }),
            }}
            render={({ field }) => (
              <input
                id="acceptTerms"
                type="checkbox"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-6 w-6 min-w-[24px] mt-0.5 rounded-lg border-2 border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
              />
            )}
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
            {intl.formatMessage({ id: 'bookingRequest.fields.accept', defaultMessage: 'J\'accepte les ' })}
            <Link
              target="_blank"
              to="/cgu-clients"
              className="text-red-600 hover:text-red-700 underline font-medium"
            >
              {intl.formatMessage({ id: 'bookingRequest.cgu', defaultMessage: 'CGU Clients' })}
            </Link>
            {intl.formatMessage({
              id: 'bookingRequest.fields.andConfirm',
              defaultMessage: ' et confirme que les informations sont exactes.',
            })}
          </label>
        </div>
        {errors.acceptTerms && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-red-600"
          >
            {String(errors.acceptTerms.message)}
          </motion.p>
        )}
      </motion.div>

      {/* Payment reassurance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-5 p-4 bg-emerald-50 rounded-2xl border border-emerald-200"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {intl.formatMessage({
                id: 'bookingRequest.paymentReassurance.title',
                defaultMessage: 'Paiement securise',
              })}
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              {intl.formatMessage({
                id: 'bookingRequest.paymentReassurance',
                defaultMessage: 'Votre carte ne sera debitee qu\'apres la mise en relation.',
              })}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Step6ConfirmScreen;

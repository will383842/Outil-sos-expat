import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { MapPin, Search, Check, Globe } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';
import { countriesData } from '@/data/countries';

export const Step2CountryScreen: React.FC = () => {
  const intl = useIntl();
  const { form, animationDirection, getStepValidationStatus } = useMobileBooking();
  const { control, watch, setValue } = form;

  const currentCountry = watch('currentCountry');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate countries list
  const countries = useMemo(() =>
    countriesData
      .filter((c) => c.code !== 'SEPARATOR')
      .map((c) => ({ code: c.code, name: c.nameEn, flag: c.flag }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    );
  }, [countries, searchQuery]);

  // Popular countries (shown when no search)
  const popularCountries = useMemo(() =>
    ['France', 'United States', 'Canada', 'United Kingdom', 'Germany', 'Spain', 'Belgium', 'Switzerland'].map(
      (name) => countries.find((c) => c.name === name)
    ).filter(Boolean) as typeof countries,
    [countries]
  );

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

  const handleCountrySelect = (countryName: string) => {
    setValue('currentCountry', countryName);
    setSearchQuery('');
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 mb-4 shadow-lg shadow-blue-500/25">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step2.title',
            defaultMessage: 'Dans quel pays etes-vous ?',
          })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({
            id: 'bookingRequest.mobile.step2.subtitle',
            defaultMessage: 'Le pays ou vous avez besoin d\'aide',
          })}
        </p>
      </motion.div>

      {/* Selected country display */}
      <AnimatePresence>
        {currentCountry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-4 p-4 bg-green-50 rounded-2xl border-2 border-green-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800">{currentCountry}</p>
                <p className="text-xs text-green-600">
                  {intl.formatMessage({
                    id: 'bookingRequest.mobile.step2.selected',
                    defaultMessage: 'Pays selectionne',
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValue('currentCountry', '')}
              className="text-sm text-green-600 font-medium hover:underline"
            >
              {intl.formatMessage({
                id: 'common.change',
                defaultMessage: 'Modifier',
              })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search input */}
      {!currentCountry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'bookingRequest.mobile.step2.searchPlaceholder',
                defaultMessage: 'Rechercher un pays...',
              })}
              className="w-full pl-12 pr-4 py-4 min-h-[56px] border-2 border-gray-200 rounded-2xl text-[16px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </motion.div>
      )}

      {/* Country list */}
      {!currentCountry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-h-[40vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white"
        >
          {/* Popular section */}
          {!searchQuery && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {intl.formatMessage({
                  id: 'bookingRequest.mobile.step2.popular',
                  defaultMessage: 'Pays populaires',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                {popularCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country.name)}
                    className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                  >
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All countries */}
          <div className="divide-y divide-gray-100">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country.name)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <span className="text-xl">{country.flag}</span>
                <span className="flex-1 font-medium text-gray-800">{country.name}</span>
                <Globe className="w-4 h-4 text-gray-400" />
              </button>
            ))}

            {filteredCountries.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                {intl.formatMessage({
                  id: 'bookingRequest.mobile.step2.noResults',
                  defaultMessage: 'Aucun pays trouve',
                })}
              </div>
            )}
          </div>

          {/* Other option */}
          {!searchQuery && (
            <button
              type="button"
              onClick={() => handleCountrySelect('Autre')}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-t border-gray-100 text-gray-600"
            >
              <span className="text-xl">🌍</span>
              <span className="flex-1 font-medium">
                {intl.formatMessage({
                  id: 'bookingRequest.mobile.step2.other',
                  defaultMessage: 'Autre pays',
                })}
              </span>
            </button>
          )}
        </motion.div>
      )}

      {/* Other country input */}
      <AnimatePresence>
        {currentCountry === 'Autre' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <Controller
              control={control}
              name="autrePays"
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder={intl.formatMessage({
                    id: 'bookingRequest.placeholders.otherCountry',
                    defaultMessage: 'Ex: Paraguay',
                  })}
                  className="w-full px-4 py-4 min-h-[56px] border-2 border-gray-200 rounded-2xl text-[16px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Step2CountryScreen;

// src/components/forms-data/SpecialtySelect.tsx
// ✅ FICHIER COMPLET - DÉBUT
import React, { useMemo } from 'react';
import Select, { MultiValue, StylesConfig, GroupBase } from 'react-select';
import {
  lawyerSpecialitiesData,
  type LawyerSpecialityGroup,
  type LawyerSpecialityItem,
} from '@/data/lawyer-specialties';

type SupportedLocale = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'ch' | 'ar' | 'hi';

interface OptionType {
  value: string;
  label: string;
}

interface GroupedOption {
  label: string;
  options: OptionType[];
}

interface SpecialtySelectProps {
  value: MultiValue<OptionType>;
  onChange: (newValue: MultiValue<OptionType>) => void;
  locale?: SupportedLocale;
  placeholder?: string;
  isDisabled?: boolean;
  'aria-label'?: string;
}

const SpecialtySelect: React.FC<SpecialtySelectProps> = ({
  value,
  onChange,
  locale = 'fr',
  placeholder = 'Sélectionnez vos spécialités...',
  isDisabled = false,
  'aria-label': ariaLabel,
}) => {
  // Préparer les options groupées
  const groupedOptions = useMemo((): GroupedOption[] => {
    // Fonction pour obtenir le label traduit d'un groupe
    const getGroupLabel = (group: LawyerSpecialityGroup): string => {
      const localeMap: Record<SupportedLocale, keyof LawyerSpecialityGroup> = {
        fr: 'labelFr',
        en: 'labelEn',
        es: 'labelEs',
        de: 'labelDe',
        pt: 'labelPt',
        ru: 'labelRu',
        ch: 'labelZh',
        ar: 'labelAr',
        hi: 'labelHi',
      };
      const key = localeMap[locale] || 'labelFr';
      return (group[key] as string) || group.labelFr;
    };

    // Fonction pour obtenir le label traduit d'une spécialité
    const getItemLabel = (item: LawyerSpecialityItem): string => {
      const localeMap: Record<SupportedLocale, keyof LawyerSpecialityItem> = {
        fr: 'labelFr',
        en: 'labelEn',
        es: 'labelEs',
        de: 'labelDe',
        pt: 'labelPt',
        ru: 'labelRu',
        ch: 'labelZh',
        ar: 'labelAr',
        hi: 'labelHi',
      };
      const key = localeMap[locale] || 'labelFr';
      return (item[key] as string) || item.labelFr;
    };

    return lawyerSpecialitiesData
      .filter(group => !group.disabled)
      .map(group => ({
        label: getGroupLabel(group),
        options: group.items.map(item => ({
          value: item.code,
          label: getItemLabel(item),
        })),
      }));
  }, [locale]);

  // Styles personnalisés pour react-select
  const customStyles: StylesConfig<OptionType, true, GroupBase<OptionType>> = {
    control: (base, _state) => ({
      ...base,
      minHeight: '48px',
      border: 'none',
      borderRadius: '0.75rem',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'transparent',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '8px 12px',
      gap: '6px',
      flexWrap: 'wrap',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#d1d5db', // Lighter gray for dark backgrounds
      fontSize: '15px',
      fontWeight: '500',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
      color: '#f3f4f6', // Light color for dark backgrounds
      fontSize: '15px',
      fontWeight: '500',
    }),
    menu: (base) => ({
      ...base,
      marginTop: '8px',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      zIndex: 99999, // Augmenté pour être au-dessus de tout
      backgroundColor: '#ffffff', // Fond blanc explicite
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 99999, // Même z-index très élevé pour le portal
    }),
    menuList: (base) => ({
      ...base,
      padding: '8px',
      maxHeight: '320px',
      '::-webkit-scrollbar': {
        width: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: '#f1f5f9',
        borderRadius: '10px',
      },
      '::-webkit-scrollbar-thumb': {
        background: '#cbd5e1',
        borderRadius: '10px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: '#94a3b8',
      },
    }),
    group: (base) => ({
      ...base,
      padding: '0',
      marginBottom: '4px',
    }),
    groupHeading: (base) => ({
      ...base,
      fontSize: '13px',
      fontWeight: '700',
      color: '#4f46e5',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      padding: '12px 12px 8px 12px',
      margin: '0',
      backgroundColor: '#eef2ff',
      borderRadius: '8px',
      marginBottom: '4px',
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '14px',
      fontWeight: '500',
      color: state.isSelected ? '#4f46e5' : '#374151',
      backgroundColor: state.isSelected
        ? '#eef2ff'
        : state.isFocused
        ? '#f9fafb'
        : 'transparent',
      cursor: 'pointer',
      padding: '10px 12px',
      borderRadius: '6px',
      marginBottom: '2px',
      transition: 'all 0.15s ease',
      '&:active': {
        backgroundColor: '#e0e7ff',
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: '#eef2ff',
      borderRadius: '6px',
      border: '1px solid #c7d2fe',
      padding: '2px 4px',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#4f46e5',
      fontSize: '13px',
      fontWeight: '600',
      padding: '2px 6px',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: '#6366f1',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: '#c7d2fe',
        color: '#4338ca',
      },
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#6b7280',
      padding: '8px',
      transition: 'all 0.2s ease',
      '&:hover': {
        color: '#4f46e5',
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: '#6b7280',
      padding: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        color: '#ef4444',
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      fontSize: '14px',
      color: '#6b7280',
      padding: '12px',
    }),
  };

  // Messages "Aucune option" traduits
  const getNoOptionsMessage = () => {
    const messages: Record<SupportedLocale, string> = {
      fr: 'Aucune spécialité trouvée',
      en: 'No specialty found',
      es: 'No se encontró especialidad',
      de: 'Keine Fachrichtung gefunden',
      pt: 'Nenhuma especialidade encontrada',
      ru: 'Специальность не найдена',
      ch: '未找到专业',
      ar: 'لم يتم العثور على تخصص',
      hi: 'कोई विशेषता नहीं मिली',
    };
    return messages[locale] || messages.fr;
  };

  return (
    <Select<OptionType, true, GroupBase<OptionType>>
      isMulti
      value={value}
      onChange={onChange}
      options={groupedOptions}
      styles={customStyles}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable
      isSearchable
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      aria-label={ariaLabel}
      noOptionsMessage={() => getNoOptionsMessage()}
      classNamePrefix="react-select"
    />
  );
};

export default SpecialtySelect;
// ✅ FICHIER COMPLET - FIN
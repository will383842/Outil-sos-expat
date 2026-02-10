import React, { Suspense, lazy } from 'react';
import type { ThemeTokens } from './theme';

const ImageUploader = lazy(() => import('@/components/common/ImageUploader'));

interface DarkImageUploaderProps {
  theme: ThemeTokens;
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  locale: string;
  altText: string;
  loadingLabel: string;
}

const DarkImageUploader: React.FC<DarkImageUploaderProps> = ({
  theme,
  label,
  value,
  onChange,
  error,
  locale,
  altText,
  loadingLabel,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">
        {label}
        <span className="text-red-400 ml-1" aria-hidden="true">*</span>
      </label>

      <Suspense
        fallback={
          <div
            className="h-32 bg-white/5 animate-pulse rounded-2xl border border-white/10"
            aria-label={loadingLabel}
          />
        }
      >
        <div
          className="border-2 border-white/10 rounded-2xl bg-white/5 p-4"
          role="region"
          aria-label={label}
        >
          <ImageUploader
            locale={locale as never}
            currentImage={value}
            onImageUploaded={onChange}
            hideNativeFileLabel
            cropShape="round"
            outputSize={512}
            uploadPath="registration_temp"
            isRegistration={true}
            alt={altText}
          />
        </div>
      </Suspense>
    </div>
  );
};

export default DarkImageUploader;

// Theme tokens for registration forms - per-role color system

export type RegistrationRole = 'lawyer' | 'expat';

export interface ThemeTokens {
  // Background gradient
  bgGradient: string;
  // Accent gradient (progress bar, tags, buttons)
  accentGradient: string;
  accentGradientHover: string;
  // Focus ring
  focusRing: string;
  focusBorder: string;
  // Tags
  tagBg: string;
  tagText: string;
  tagBorder: string;
  // Icon accent
  iconBg: string;
  iconText: string;
  // Link color
  linkColor: string;
  linkHover: string;
  // Theme color (for meta tag)
  themeColor: string;
  // reCAPTCHA action name
  recaptchaAction: string;
  // CGU link
  cguPath: string;
  // i18n prefix
  i18nPrefix: 'registerLawyer' | 'registerExpat';
  // Hero icon name
  heroIcon: 'Scale' | 'Heart';
  // Phone input accent hex
  phoneAccentHex: string;
  phoneAccentRgb: string;
}

const lawyerTheme: ThemeTokens = {
  bgGradient: 'from-indigo-950 via-gray-950 to-black',
  accentGradient: 'from-indigo-500 to-purple-500',
  accentGradientHover: 'from-indigo-600 to-purple-600',
  focusRing: 'focus:ring-indigo-400/40',
  focusBorder: 'focus:border-indigo-400/50',
  tagBg: 'bg-indigo-500/20',
  tagText: 'text-indigo-300',
  tagBorder: 'border-indigo-400/30',
  iconBg: 'bg-indigo-500/20',
  iconText: 'text-indigo-400',
  linkColor: 'text-indigo-400',
  linkHover: 'hover:text-indigo-300',
  themeColor: '#4f46e5',
  recaptchaAction: 'register_lawyer',
  cguPath: '/cgu-avocats',
  i18nPrefix: 'registerLawyer',
  heroIcon: 'Scale',
  phoneAccentHex: '#818cf8',
  phoneAccentRgb: '129, 140, 248',
};

const expatTheme: ThemeTokens = {
  bgGradient: 'from-emerald-950 via-gray-950 to-black',
  accentGradient: 'from-emerald-500 to-green-500',
  accentGradientHover: 'from-emerald-600 to-green-600',
  focusRing: 'focus:ring-emerald-400/40',
  focusBorder: 'focus:border-emerald-400/50',
  tagBg: 'bg-emerald-500/20',
  tagText: 'text-emerald-300',
  tagBorder: 'border-emerald-400/30',
  iconBg: 'bg-emerald-500/20',
  iconText: 'text-emerald-400',
  linkColor: 'text-emerald-400',
  linkHover: 'hover:text-emerald-300',
  themeColor: '#10b981',
  recaptchaAction: 'register_expat',
  cguPath: '/cgu-expatries',
  i18nPrefix: 'registerExpat',
  heroIcon: 'Heart',
  phoneAccentHex: '#34d399',
  phoneAccentRgb: '52, 211, 153',
};

export const getTheme = (role: RegistrationRole): ThemeTokens => {
  return role === 'lawyer' ? lawyerTheme : expatTheme;
};

// Shared dark input base classes (glassmorphism)
export const darkInputBase = `
  w-full px-4 py-3.5
  bg-white/5 border-2 border-white/10
  rounded-2xl
  text-base text-white
  placeholder:text-gray-500
  focus:outline-none focus:ring-2 focus:ring-offset-0
  focus:bg-white/10
  transition-all duration-200 ease-out
  disabled:opacity-50 disabled:cursor-not-allowed
  min-h-[48px]
`.replace(/\s+/g, ' ').trim();

export const darkInputError = 'border-red-500/60 focus:ring-red-500/30 bg-red-500/10';
export const darkInputFilled = 'bg-white/10 border-white/20';

// Shared dark card style
export const darkCard = 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg';

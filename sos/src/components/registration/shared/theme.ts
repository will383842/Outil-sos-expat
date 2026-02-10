// Theme tokens for registration forms - per-role color system

export type RegistrationRole = 'lawyer' | 'expat' | 'client' | 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';

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
  i18nPrefix: 'registerLawyer' | 'registerExpat' | 'registerClient' | 'registerChatter' | 'registerInfluencer' | 'registerBlogger' | 'registerGroupAdmin';
  // Hero icon name
  heroIcon: 'Scale' | 'Heart' | 'UserPlus' | 'Star' | 'Megaphone' | 'FileText' | 'UsersRound';
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

const clientTheme: ThemeTokens = {
  bgGradient: 'from-blue-950 via-gray-950 to-black',
  accentGradient: 'from-blue-500 to-indigo-500',
  accentGradientHover: 'from-blue-600 to-indigo-600',
  focusRing: 'focus:ring-blue-400/40',
  focusBorder: 'focus:border-blue-400/50',
  tagBg: 'bg-blue-500/20',
  tagText: 'text-blue-300',
  tagBorder: 'border-blue-400/30',
  iconBg: 'bg-blue-500/20',
  iconText: 'text-blue-400',
  linkColor: 'text-blue-400',
  linkHover: 'hover:text-blue-300',
  themeColor: '#3b82f6',
  recaptchaAction: 'register_client',
  cguPath: '/cgu-clients',
  i18nPrefix: 'registerClient',
  heroIcon: 'UserPlus',
  phoneAccentHex: '#60a5fa',
  phoneAccentRgb: '96, 165, 250',
};

const chatterTheme: ThemeTokens = {
  bgGradient: 'from-red-950 via-gray-950 to-black',
  accentGradient: 'from-amber-400 to-yellow-400',
  accentGradientHover: 'from-amber-500 to-yellow-500',
  focusRing: 'focus:ring-amber-400/40',
  focusBorder: 'focus:border-amber-400/50',
  tagBg: 'bg-amber-500/20',
  tagText: 'text-amber-300',
  tagBorder: 'border-amber-400/30',
  iconBg: 'bg-amber-500/20',
  iconText: 'text-amber-400',
  linkColor: 'text-amber-400',
  linkHover: 'hover:text-amber-300',
  themeColor: '#f59e0b',
  recaptchaAction: 'register_chatter',
  cguPath: '/cgu-chatters',
  i18nPrefix: 'registerChatter',
  heroIcon: 'Star',
  phoneAccentHex: '#fbbf24',
  phoneAccentRgb: '251, 191, 36',
};

const influencerTheme: ThemeTokens = {
  bgGradient: 'from-red-950 via-gray-950 to-black',
  accentGradient: 'from-red-500 to-rose-500',
  accentGradientHover: 'from-red-600 to-rose-600',
  focusRing: 'focus:ring-red-400/40',
  focusBorder: 'focus:border-red-400/50',
  tagBg: 'bg-red-500/20',
  tagText: 'text-red-300',
  tagBorder: 'border-red-400/30',
  iconBg: 'bg-red-500/20',
  iconText: 'text-red-400',
  linkColor: 'text-red-400',
  linkHover: 'hover:text-red-300',
  themeColor: '#ef4444',
  recaptchaAction: 'register_influencer',
  cguPath: '/cgu-influenceurs',
  i18nPrefix: 'registerInfluencer',
  heroIcon: 'Megaphone',
  phoneAccentHex: '#f87171',
  phoneAccentRgb: '248, 113, 113',
};

const bloggerTheme: ThemeTokens = {
  bgGradient: 'from-purple-950 via-gray-950 to-black',
  accentGradient: 'from-purple-500 to-violet-500',
  accentGradientHover: 'from-purple-600 to-violet-600',
  focusRing: 'focus:ring-purple-400/40',
  focusBorder: 'focus:border-purple-400/50',
  tagBg: 'bg-purple-500/20',
  tagText: 'text-purple-300',
  tagBorder: 'border-purple-400/30',
  iconBg: 'bg-purple-500/20',
  iconText: 'text-purple-400',
  linkColor: 'text-purple-400',
  linkHover: 'hover:text-purple-300',
  themeColor: '#a855f7',
  recaptchaAction: 'register_blogger',
  cguPath: '/cgu-bloggers',
  i18nPrefix: 'registerBlogger',
  heroIcon: 'FileText',
  phoneAccentHex: '#c084fc',
  phoneAccentRgb: '192, 132, 252',
};

const groupAdminTheme: ThemeTokens = {
  bgGradient: 'from-indigo-950 via-gray-950 to-black',
  accentGradient: 'from-indigo-500 to-blue-500',
  accentGradientHover: 'from-indigo-600 to-blue-600',
  focusRing: 'focus:ring-indigo-400/40',
  focusBorder: 'focus:border-indigo-400/50',
  tagBg: 'bg-indigo-500/20',
  tagText: 'text-indigo-300',
  tagBorder: 'border-indigo-400/30',
  iconBg: 'bg-indigo-500/20',
  iconText: 'text-indigo-400',
  linkColor: 'text-indigo-400',
  linkHover: 'hover:text-indigo-300',
  themeColor: '#6366f1',
  recaptchaAction: 'register_group_admin',
  cguPath: '/cgu-group-admins',
  i18nPrefix: 'registerGroupAdmin',
  heroIcon: 'UsersRound',
  phoneAccentHex: '#818cf8',
  phoneAccentRgb: '129, 140, 248',
};

const themeMap: Record<RegistrationRole, ThemeTokens> = {
  lawyer: lawyerTheme,
  expat: expatTheme,
  client: clientTheme,
  chatter: chatterTheme,
  influencer: influencerTheme,
  blogger: bloggerTheme,
  groupAdmin: groupAdminTheme,
};

export const getTheme = (role: RegistrationRole): ThemeTokens => {
  return themeMap[role] || expatTheme;
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

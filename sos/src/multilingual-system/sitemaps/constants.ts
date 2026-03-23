/**
 * Constants for sitemap generation
 */

import { Language, StaticRoute } from './types';
import countriesConfig from '../config/countries.json';

export const SITE_URL = 'https://sos-expat.com';

// Valid language-country pairs (only the 9 supported locales)
export const LANGUAGES: Language[] = countriesConfig.languages.map(locale => {
  const [lang, country] = locale.split('-');
  return { code: lang, country: country.toLowerCase() };
});

// LANGUAGE_COUNTRY_COMBINATIONS now equals LANGUAGES (only valid locales)
// Previously this was a cartesian product of 9 languages × 197 countries = 1773 invalid combos
export const LANGUAGE_COUNTRY_COMBINATIONS: Language[] = LANGUAGES;

// All unique countries from config
export const COUNTRIES: string[] = countriesConfig.countries.map(c => c.toLowerCase());

// Static public routes (exclude protected routes)
export const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/login', translated: 'login', priority: 0.5, changefreq: 'monthly' },
  { path: '/register', translated: 'register', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/client', translated: 'register-client', priority: 0.5, changefreq: 'monthly' },
  { path: '/register/lawyer', translated: 'register-lawyer', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/expat', translated: 'register-expat', priority: 0.6, changefreq: 'monthly' },
  // password-reset removed from sitemap — utility page, noindex
  { path: '/tarifs', translated: 'pricing', priority: 0.8, changefreq: 'monthly' },
  { path: '/contact', translated: 'contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/how-it-works', translated: 'how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/faq', translated: 'faq', priority: 0.7, changefreq: 'weekly' },
  { path: '/centre-aide', translated: 'help-center', priority: 0.6, changefreq: 'weekly' },
  { path: '/testimonials', translated: 'testimonials', priority: 0.7, changefreq: 'weekly' },
  { path: '/terms-clients', translated: 'terms-clients', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-lawyers', translated: 'terms-lawyers', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-expats', translated: 'terms-expats', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-chatters', translated: 'terms-chatters', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-affiliate', translated: 'terms-affiliate', priority: 0.4, changefreq: 'yearly' },
  { path: '/privacy-policy', translated: 'privacy-policy', priority: 0.5, changefreq: 'yearly' },
  { path: '/cookies', translated: 'cookies', priority: 0.3, changefreq: 'yearly' },
  { path: '/consumers', translated: 'consumers', priority: 0.5, changefreq: 'monthly' },
  { path: '/statut-service', translated: 'service-status', priority: 0.6, changefreq: 'daily' },
  { path: '/seo', translated: 'seo', priority: 0.5, changefreq: 'monthly' },
  { path: '/sos-appel', translated: 'sos-call', priority: 0.9, changefreq: 'daily' },
  { path: '/appel-expatrie', translated: 'expat-call', priority: 0.9, changefreq: 'daily' },
  { path: '/providers', translated: 'providers', priority: 0.8, changefreq: 'daily' },
];

// Route translations mapping
// IMPORTANT: These MUST match the router translations in localeRoutes.ts
// Using Latin transliterations for ru/ch/hi (same as frontend router)
// to avoid sitemap URLs that don't exist in the app
export const ROUTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'login': { fr: 'connexion', en: 'login', es: 'iniciar-sesion', ru: 'vkhod', de: 'anmeldung', hi: 'login', pt: 'entrar', ch: 'denglu', ar: 'تسجيل-الدخول' },
  'register': { fr: 'inscription', en: 'register', es: 'registro', ru: 'registratsiya', de: 'registrierung', hi: 'panjikaran', pt: 'cadastro', ch: 'zhuce', ar: 'التسجيل' },
  'register-client': { fr: 'inscription/client', en: 'register/client', es: 'registro/cliente', ru: 'registratsiya/klient', de: 'registrierung/kunde', hi: 'panjikaran/grahak', pt: 'registro/cliente', ch: 'zhuce/kehu', ar: 'تسجيل/عميل' },
  'register-lawyer': { fr: 'inscription/avocat', en: 'register/lawyer', es: 'registro/abogado', ru: 'registratsiya/advokat', de: 'registrierung/anwalt', hi: 'panjikaran/vakil', pt: 'registro/advogado', ch: 'zhuce/lushi', ar: 'تسجيل/محام' },
  'register-expat': { fr: 'inscription/expatrie', en: 'register/expat', es: 'registro/expatriado', ru: 'registratsiya/expatriant', de: 'registrierung/expatriate', hi: 'panjikaran/pravasi', pt: 'registro/expatriado', ch: 'zhuce/waipai', ar: 'تسجيل/مغترب' },
  'password-reset': { fr: 'reinitialisation-mot-de-passe', en: 'password-reset', es: 'restablecer-contrasena', ru: 'sbros-parolya', de: 'passwort-zurucksetzen', hi: 'password-reset', pt: 'redefinir-senha', ch: 'chongzhi-mima', ar: 'إعادة-تعيين-كلمة-المرور' },
  'pricing': { fr: 'tarifs', en: 'pricing', es: 'precios', ru: 'tseny', de: 'preise', hi: 'mulya', pt: 'precos', ch: 'jiage', ar: 'الأسعار' },
  'contact': { fr: 'contact', en: 'contact', es: 'contacto', ru: 'kontakt', de: 'kontakt', hi: 'sampark', pt: 'contato', ch: 'lianxi', ar: 'اتصل-بنا' },
  'how-it-works': { fr: 'comment-ca-marche', en: 'how-it-works', es: 'como-funciona', ru: 'kak-eto-rabotaet', de: 'wie-es-funktioniert', hi: 'kaise-kaam-karta-hai', pt: 'como-funciona', ch: 'ruhe-yunzuo', ar: 'كيف-يعمل' },
  'faq': { fr: 'faq', en: 'faq', es: 'preguntas-frecuentes', ru: 'voprosy-otvety', de: 'faq', hi: 'aksar-puche-jaane-wale-sawal', pt: 'perguntas-frequentes', ch: 'changjian-wenti', ar: 'الأسئلة-الشائعة' },
  'help-center': { fr: 'centre-aide', en: 'help-center', es: 'centro-ayuda', ru: 'tsentr-pomoshchi', de: 'hilfezentrum', hi: 'sahayata-kendra', pt: 'centro-ajuda', ch: 'bangzhu-zhongxin', ar: 'مركز-المساعدة' },
  'testimonials': { fr: 'temoignages', en: 'testimonials', es: 'testimonios', ru: 'otzyvy', de: 'testimonials', hi: 'prashansapatra', pt: 'depoimentos', ch: 'yonghu-pingjia', ar: 'الشهادات' },
  'terms-clients': { fr: 'cgu-clients', en: 'terms-clients', es: 'terminos-clientes', ru: 'usloviya-klienty', de: 'agb-kunden', hi: 'shartein-grahak', pt: 'termos-clientes', ch: 'tiaokuan-kehu', ar: 'شروط-العملاء' },
  'terms-lawyers': { fr: 'cgu-avocats', en: 'terms-lawyers', es: 'terminos-abogados', ru: 'usloviya-advokaty', de: 'agb-anwaelte', hi: 'shartein-vakil', pt: 'termos-advogados', ch: 'tiaokuan-lushi', ar: 'شروط-المحامون' },
  'terms-expats': { fr: 'cgu-expatries', en: 'terms-expats', es: 'terminos-expatriados', ru: 'usloviya-expatrianty', de: 'agb-expatriates', hi: 'shartein-pravasi', pt: 'termos-expatriados', ch: 'tiaokuan-waipai', ar: 'شروط-المغتربين' },
  'terms-chatters': { fr: 'cgu-chatters', en: 'terms-chatters', es: 'terminos-chatters', ru: 'usloviya-chattery', de: 'agb-chatters', hi: 'shartein-chatters', pt: 'termos-chatters', ch: 'tiaokuan-chatters', ar: 'شروط-المروجين' },
  'terms-affiliate': { fr: 'cgu-affiliation', en: 'terms-affiliate', es: 'terminos-afiliacion', de: 'agb-partnerprogramm', ru: 'usloviya-partnerstva', pt: 'termos-afiliacao', ch: 'tiaokuan-lianmeng', hi: 'shartein-affiliate', ar: 'شروط-الشراكة' },
  'privacy-policy': { fr: 'politique-confidentialite', en: 'privacy-policy', es: 'politica-privacidad', ru: 'politika-konfidentsialnosti', de: 'datenschutzrichtlinie', hi: 'gopaniyata-niti', pt: 'politica-privacidade', ch: 'yinsi-zhengce', ar: 'سياسة-الخصوصية' },
  'cookies': { fr: 'cookies', en: 'cookies', es: 'cookies', ru: 'cookies', de: 'cookies', hi: 'cookies', pt: 'cookies', ch: 'cookies', ar: 'ملفات-التعريف' },
  'consumers': { fr: 'consommateurs', en: 'consumers', es: 'consumidores', ru: 'potrebiteli', de: 'verbraucher', hi: 'upbhokta', pt: 'consumidores', ch: 'xiaofeizhe', ar: 'المستهلكين' },
  'service-status': { fr: 'statut-service', en: 'service-status', es: 'estado-servicio', ru: 'status-servisa', de: 'dienststatus', hi: 'seva-sthiti', pt: 'status-servico', ch: 'fuwu-zhuangtai', ar: 'حالة-الخدمة' },
  'seo': { fr: 'referencement', en: 'seo', es: 'seo', ru: 'seo', de: 'seo', hi: 'seo', pt: 'seo', ch: 'seo', ar: 'تحسين-محركات-البحث' },
  'sos-call': { fr: 'sos-appel', en: 'emergency-call', es: 'llamada-emergencia', ru: 'ekstrenniy-zvonok', de: 'notruf', hi: 'aapatkaalin-call', pt: 'chamada-emergencia', ch: 'jinji-dianhua', ar: 'مكالمة-طوارئ' },
  'expat-call': { fr: 'appel-expatrie', en: 'expat-call', es: 'llamada-expatriado', ru: 'zvonok-expatriantu', de: 'expatriate-anruf', hi: 'pravasi-call', pt: 'chamada-expatriado', ch: 'waipai-dianhua', ar: 'مكالمة-المغترب' },
  'providers': { fr: 'prestataires', en: 'providers', es: 'proveedores', ru: 'postavshchiki', de: 'anbieter', hi: 'seva-pradaata', pt: 'prestadores', ch: 'fuwu-tigongzhe', ar: 'مقدمي-الخدمات' },
};


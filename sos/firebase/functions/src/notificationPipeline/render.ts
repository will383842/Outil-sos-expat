import { formatMoney } from "./money";

export function render(tpl: string, ctx: any) {
  if (!tpl) return "";
  return tpl
    .replace(/\{\{\s*money\s+([^}\s]+)\s+([^}\s]+)\s*\}\}/g, (_m, a, c) =>
      formatMoney(get(ctx, a), String(get(ctx, c) || "EUR"), resolveLocale(ctx)))
    .replace(/\{\{\s*date\s+([^}\s]+)\s*\}\}/g, (_m, d) => {
      const iso = String(get(ctx, d) || "");
      if (!iso) return "";
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return "";
      const loc = resolveLocale(ctx);
      return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(dt);
    })
    .replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_m, p1) => {
      const v = get(ctx, p1);
      return v == null ? "" : String(v);
    });
}

function get(obj: any, path: string) {
  return String(path || "").split(".").reduce((acc: any, k: string) => (acc != null ? acc[k] : undefined), obj);
}
const LOCALE_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  pt: "pt-PT",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  ch: "zh-CN",
  zh: "zh-CN",
};

function resolveLocale(ctx: any): string {
  const pref = ctx?.user?.preferredLanguage || ctx?.user?.language || ctx?.locale;
  const lang = String(pref || "en").toLowerCase().split("-")[0];
  return LOCALE_MAP[lang] || "en-US";
}

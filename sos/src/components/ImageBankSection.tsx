/**
 * ImageBankSection — Reusable CTA section linking to the SOS Expat Image Bank.
 * Used on: ChatterLanding, InfluencerLanding, GroupAdminLanding, PartnerLanding, BloggerLanding, Press.
 *
 * Dark theme variant (default) — for dark landing pages.
 * Adapts gallery URL to current language.
 */

import React from "react";
import { useApp } from "../contexts/AppContext";
import { ImageIcon, Shield, ExternalLink } from "lucide-react";

const GALLERY_SEGMENTS: Record<string, string> = {
  fr: "fr-fr/galerie",
  en: "en-us/gallery",
  es: "es-es/galeria",
  de: "de-de/bildergalerie",
  pt: "pt-pt/galeria",
  ru: "ru-ru/galereya",
  zh: "zh-cn/tuku",
  hi: "hi-in/chitravali",
  ar: "ar-sa/maarad",
};

const TEXTS: Record<string, { title: string; desc: string; cta: string }> = {
  en: {
    title: "SOS Expat Image Bank — 210+ Free HD Images",
    desc: "Use our professional images in your content for free (CC BY 4.0). Just credit SOS Expat. Ready-to-copy embed code on every image.",
    cta: "Browse Image Gallery",
  },
  fr: {
    title: "Banque d'images SOS Expat — 210+ visuels HD gratuits",
    desc: "Utilisez nos images professionnelles dans vos contenus gratuitement (CC BY 4.0). Mentionnez SOS Expat. Code embed pret a copier sur chaque image.",
    cta: "Voir la galerie",
  },
  es: {
    title: "Banco de imagenes SOS Expat — 210+ imagenes HD gratis",
    desc: "Use nuestras imagenes profesionales en su contenido gratis (CC BY 4.0). Solo acredite SOS Expat. Codigo embed listo para copiar.",
    cta: "Ver galeria",
  },
  de: {
    title: "SOS Expat Bildergalerie — 210+ HD-Bilder kostenlos",
    desc: "Nutzen Sie unsere professionellen Bilder kostenlos (CC BY 4.0). Nennen Sie SOS Expat. Embed-Code zum Kopieren auf jedem Bild.",
    cta: "Bildergalerie ansehen",
  },
  pt: {
    title: "Banco de imagens SOS Expat — 210+ imagens HD gratis",
    desc: "Use nossas imagens profissionais gratuitamente (CC BY 4.0). Credite SOS Expat. Codigo embed pronto para copiar.",
    cta: "Ver galeria",
  },
  ru: {
    title: "Банк изображений SOS Expat — 210+ бесплатных HD-изображений",
    desc: "Используйте наши профессиональные изображения бесплатно (CC BY 4.0). Укажите SOS Expat. Код для встраивания готов к копированию.",
    cta: "Открыть галерею",
  },
  zh: {
    title: "SOS Expat 图库 — 210+ 免费高清图片",
    desc: "免费使用我们的专业图片（CC BY 4.0）。注明 SOS Expat 即可。每张图片都有即用型嵌入代码。",
    cta: "浏览图库",
  },
  hi: {
    title: "SOS Expat छवि बैंक — 210+ मुफ्त HD छवियां",
    desc: "हमारी पेशेवर छवियों का मुफ्त उपयोग करें (CC BY 4.0)। बस SOS Expat का श्रेय दें। हर छवि पर कॉपी-रेडी एम्बेड कोड।",
    cta: "गैलरी देखें",
  },
  ar: {
    title: "بنك صور SOS Expat — 210+ صورة HD مجانية",
    desc: "استخدم صورنا المهنية مجانًا (CC BY 4.0). فقط اذكر SOS Expat. رمز التضمين جاهز للنسخ على كل صورة.",
    cta: "تصفح المعرض",
  },
};

type AccentColor = "emerald" | "pink" | "blue" | "amber" | "purple" | "red";

/** Static Tailwind class maps — dynamic interpolation doesn't compile */
const ACCENT_STYLES: Record<AccentColor, { iconBg: string; iconText: string; btnBg: string; containerBg: string }> = {
  emerald: {
    iconBg: "bg-emerald-500/20",
    iconText: "text-emerald-400",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    containerBg: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20",
  },
  pink: {
    iconBg: "bg-pink-500/20",
    iconText: "text-pink-400",
    btnBg: "bg-pink-600 hover:bg-pink-700",
    containerBg: "bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20",
  },
  blue: {
    iconBg: "bg-blue-500/20",
    iconText: "text-blue-400",
    btnBg: "bg-blue-600 hover:bg-blue-700",
    containerBg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20",
  },
  amber: {
    iconBg: "bg-amber-500/20",
    iconText: "text-amber-400",
    btnBg: "bg-amber-600 hover:bg-amber-700",
    containerBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20",
  },
  purple: {
    iconBg: "bg-purple-500/20",
    iconText: "text-purple-400",
    btnBg: "bg-purple-600 hover:bg-purple-700",
    containerBg: "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20",
  },
  red: {
    iconBg: "bg-red-500/20",
    iconText: "text-red-400",
    btnBg: "bg-red-600 hover:bg-red-700",
    containerBg: "bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20",
  },
};

interface ImageBankSectionProps {
  accent?: AccentColor;
}

const ImageBankSection: React.FC<ImageBankSectionProps> = ({ accent = "emerald" }) => {
  const { language } = useApp();
  const lang = language || "en";
  const t = TEXTS[lang] || TEXTS.en;
  const galleryPath = GALLERY_SEGMENTS[lang] || GALLERY_SEGMENTS.en;
  const s = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald;

  return (
    <div className={`${s.containerBg} rounded-2xl p-5 sm:p-8`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <div className={`w-12 h-12 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <ImageIcon className={`w-6 h-6 ${s.iconText}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold mb-1">{t.title}</h3>
          <p className="text-sm opacity-80 mb-3">{t.desc}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/${galleryPath}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 ${s.btnBg} text-white text-sm font-semibold rounded-lg transition-colors`}
            >
              <ImageIcon className="w-4 h-4" />
              {t.cta}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 text-xs font-medium rounded-lg border border-green-500/20">
              <Shield className="w-3.5 h-3.5" />
              CC BY 4.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageBankSection;

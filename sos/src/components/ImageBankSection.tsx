/**
 * ImageBankSection — Carousel of image thumbnails with horizontal swipe.
 * Mobile-first: touch swipe, snap scroll, small thumbnails.
 * Used on: all landing pages (Chatter, Influencer, GroupAdmin, Partner, Blogger, Press).
 */

import React, { useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { ImageIcon, Shield, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

const GALLERY_SEGMENTS: Record<string, string> = {
  fr: "fr-fr/galerie", en: "en-us/gallery", es: "es-es/galeria",
  de: "de-de/bildergalerie", pt: "pt-pt/galeria", ru: "ru-ru/galereya",
  zh: "zh-cn/tuku", hi: "hi-in/chitravali", ar: "ar-sa/maarad",
};

const TEXTS: Record<string, { title: string; desc: string; cta: string }> = {
  en: {
    title: "SOS Expat Image Bank — 210+ Free HD Images",
    desc: "Free to use. Just include a link to sos-expat.com. Copy the embed code — the link is already included.",
    cta: "View full gallery",
  },
  fr: {
    title: "Banque d'images SOS Expat — 210+ visuels HD",
    desc: "Utilisation libre. Incluez un lien vers sos-expat.com. Copiez le code embed, le lien est deja inclus.",
    cta: "Voir la galerie",
  },
  es: {
    title: "Banco de imagenes — 210+ HD gratis",
    desc: "Uso libre. Incluya un enlace a sos-expat.com. Copie el codigo embed, el enlace ya esta incluido.",
    cta: "Ver galeria",
  },
  de: {
    title: "SOS Expat Bildergalerie — 210+ HD kostenlos",
    desc: "Frei nutzbar. Link zu sos-expat.com einfuegen. Embed-Code kopieren — Link ist enthalten.",
    cta: "Galerie ansehen",
  },
  pt: {
    title: "Banco de imagens — 210+ HD gratis",
    desc: "Uso livre. Inclua um link para sos-expat.com. Copie o codigo embed, o link ja esta incluido.",
    cta: "Ver galeria",
  },
  ru: {
    title: "Банк изображений — 210+ бесплатных HD",
    desc: "Свободное использование. Добавьте ссылку на sos-expat.com. Код встраивания уже содержит ссылку.",
    cta: "Открыть галерею",
  },
  zh: {
    title: "SOS Expat 图库 — 210+ 免费高清",
    desc: "免费使用。包含指向sos-expat.com的链接。嵌入代码已包含链接。",
    cta: "浏览图库",
  },
  hi: {
    title: "SOS Expat छवि बैंक — 210+ मुफ्त HD",
    desc: "मुफ्त उपयोग। sos-expat.com का लिंक शामिल करें। एम्बेड कोड में लिंक पहले से है।",
    cta: "गैलरी देखें",
  },
  ar: {
    title: "بنك صور SOS Expat — 210+ HD مجانية",
    desc: "استخدام مجاني. أضف رابطًا إلى sos-expat.com. كود التضمين يحتوي الرابط بالفعل.",
    cta: "تصفح المعرض",
  },
};

// Sample image paths from the production image bank (first 8 images)
// These are static preview thumbnails — the full gallery is on the blog
const PREVIEW_IMAGES = [
  { id: 1, src: "https://sos-expat.com/storage/image-bank/4326dbbc-7b8f-484e-9916-7924199a5349/thumb.webp" },
  { id: 2, src: "https://sos-expat.com/storage/image-bank/8c1ca4ae-ea65-4c92-971b-e9c1e5d8d2f1/thumb.webp" },
  { id: 3, src: "https://sos-expat.com/storage/image-bank/16dd002c-8d2b-40d5-ae12-6919b6ed522b/thumb.webp" },
  { id: 4, src: "https://sos-expat.com/storage/image-bank/e195baec-9cc5-46ea-ac3f-174d48b618a6/thumb.webp" },
  { id: 5, src: "https://sos-expat.com/storage/image-bank/3206f225-8da2-4f15-9a21-e42a852d1d43/thumb.webp" },
  { id: 6, src: "https://sos-expat.com/storage/image-bank/605ad117-a30a-47c9-ad42-2676e175f9bb/thumb.webp" },
  { id: 7, src: "https://sos-expat.com/storage/image-bank/137822c2-b30d-4e36-9425-43de55dac3e8/thumb.webp" },
  { id: 8, src: "https://sos-expat.com/storage/image-bank/b5ec8291-6c78-4174-a384-9effc9ca0be2/thumb.webp" },
];

type AccentColor = "emerald" | "pink" | "blue" | "amber" | "purple" | "red";

const ACCENT_STYLES: Record<AccentColor, { btnBg: string; containerBg: string; scrollBg: string }> = {
  emerald: {
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    containerBg: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20",
    scrollBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  pink: {
    btnBg: "bg-pink-600 hover:bg-pink-700",
    containerBg: "bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20",
    scrollBg: "bg-pink-500/10 border-pink-500/20",
  },
  blue: {
    btnBg: "bg-blue-600 hover:bg-blue-700",
    containerBg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20",
    scrollBg: "bg-blue-500/10 border-blue-500/20",
  },
  amber: {
    btnBg: "bg-amber-600 hover:bg-amber-700",
    containerBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20",
    scrollBg: "bg-amber-500/10 border-amber-500/20",
  },
  purple: {
    btnBg: "bg-purple-600 hover:bg-purple-700",
    containerBg: "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20",
    scrollBg: "bg-purple-500/10 border-purple-500/20",
  },
  red: {
    btnBg: "bg-red-600 hover:bg-red-700",
    containerBg: "bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20",
    scrollBg: "bg-red-500/10 border-red-500/20",
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.7;
    scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  const galleryUrl = `/${galleryPath}/`;

  return (
    <div className={`${s.containerBg} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 pt-5 sm:px-8 sm:pt-8 pb-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold mb-1 truncate">{t.title}</h3>
            <p className="text-xs sm:text-sm opacity-70 line-clamp-2">{t.desc}</p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded border border-green-500/20">
            <Shield className="w-3 h-3" />
            CC BY 4.0
          </span>
        </div>
      </div>

      {/* Scrollable image strip with arrows */}
      <div className="relative group">
        {/* Left arrow (hidden on mobile — use swipe instead) */}
        <button
          onClick={() => scroll("left")}
          className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Scrollable container — snap scroll on mobile, smooth on desktop */}
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto px-5 sm:px-8 pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PREVIEW_IMAGES.map((img) => (
            <a
              key={img.id}
              href={galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-start rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ width: "120px" }}
            >
              <div className="aspect-[4/3] bg-white/5">
                <img
                  src={img.src}
                  alt="SOS Expat"
                  width={120}
                  height={90}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </a>
          ))}

          {/* "View all" card */}
          <a
            href={galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 snap-start rounded-lg overflow-hidden border ${s.scrollBg} flex flex-col items-center justify-center text-center hover:scale-[1.03] active:scale-[0.98] transition-all`}
            style={{ width: "120px", aspectRatio: "4/3" }}
          >
            <ImageIcon className="w-5 h-5 opacity-60 mb-1" />
            <span className="text-[11px] font-bold opacity-80">+200</span>
            <span className="text-[10px] opacity-50">{t.cta}</span>
          </a>
        </div>
      </div>

      {/* CTA button */}
      <div className="px-5 pb-5 sm:px-8 sm:pb-8">
        <a
          href={galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 px-5 py-2.5 ${s.btnBg} text-white text-sm font-semibold rounded-lg transition-colors touch-manipulation`}
        >
          <ImageIcon className="w-4 h-4" />
          {t.cta}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default ImageBankSection;

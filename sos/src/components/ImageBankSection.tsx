/**
 * ImageBankSection — Carousel of image thumbnails with horizontal swipe.
 * Mobile-first: touch swipe, snap scroll, small thumbnails.
 * Used on: all landing pages (Chatter, Influencer, GroupAdmin, Partner, Blogger, Press).
 *
 * showDownload=true  → used on dashboards (affiliates can download original.webp directly)
 * showDownload=false → used on landing pages (links to full gallery only)
 */

import React, { useRef, useState, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { ImageIcon, Shield, ExternalLink, ChevronLeft, ChevronRight, Download, Loader2, CheckCircle2 } from "lucide-react";

const GALLERY_SEGMENTS: Record<string, string> = {
  fr: "fr-fr/galerie", en: "en-us/gallery", es: "es-es/galeria",
  de: "de-de/bildergalerie", pt: "pt-pt/galeria", ru: "ru-ru/galereya",
  zh: "zh-cn/tuku", hi: "hi-in/chitravali", ar: "ar-sa/maarad",
};

const TEXTS: Record<string, { title: string; desc: string; cta: string; download: string; downloading: string; downloaded: string; viewAll: string; iosHint: string; iosSaved: string }> = {
  en: {
    title: "SOS Expat Image Bank — 210+ Free HD Images",
    desc: "Free to use. Just include a link to sos-expat.com. Copy the embed code — the link is already included.",
    cta: "View full gallery",
    download: "Download HD",
    downloading: "Downloading…",
    downloaded: "Downloaded!",
    viewAll: "View all 210+",
    iosHint: "Hold & save",
    iosSaved: "Opened!",
  },
  fr: {
    title: "Banque d'images SOS Expat — 210+ visuels HD",
    desc: "Utilisation libre. Incluez un lien vers sos-expat.com. Copiez le code embed, le lien est deja inclus.",
    cta: "Voir la galerie",
    download: "Télécharger HD",
    downloading: "Téléchargement…",
    downloaded: "Téléchargé !",
    viewAll: "Voir les 210+",
    iosHint: "Maintenir & sauver",
    iosSaved: "Ouvert !",
  },
  es: {
    title: "Banco de imagenes — 210+ HD gratis",
    desc: "Uso libre. Incluya un enlace a sos-expat.com. Copie el codigo embed, el enlace ya esta incluido.",
    cta: "Ver galeria",
    download: "Descargar HD",
    downloading: "Descargando…",
    downloaded: "¡Descargado!",
    viewAll: "Ver las 210+",
    iosHint: "Mantener y guardar",
    iosSaved: "¡Abierto!",
  },
  de: {
    title: "SOS Expat Bildergalerie — 210+ HD kostenlos",
    desc: "Frei nutzbar. Link zu sos-expat.com einfuegen. Embed-Code kopieren — Link ist enthalten.",
    cta: "Galerie ansehen",
    download: "HD herunterladen",
    downloading: "Wird geladen…",
    downloaded: "Heruntergeladen!",
    viewAll: "Alle 210+ ansehen",
    iosHint: "Halten & sichern",
    iosSaved: "Geöffnet!",
  },
  pt: {
    title: "Banco de imagens — 210+ HD gratis",
    desc: "Uso livre. Inclua um link para sos-expat.com. Copie o codigo embed, o link ja esta incluido.",
    cta: "Ver galeria",
    download: "Baixar HD",
    downloading: "Baixando…",
    downloaded: "Baixado!",
    viewAll: "Ver as 210+",
    iosHint: "Manter e salvar",
    iosSaved: "Aberto!",
  },
  ru: {
    title: "Банк изображений — 210+ бесплатных HD",
    desc: "Свободное использование. Добавьте ссылку на sos-expat.com. Код встраивания уже содержит ссылку.",
    cta: "Открыть галерею",
    download: "Скачать HD",
    downloading: "Загрузка…",
    downloaded: "Скачано!",
    viewAll: "Смотреть все 210+",
    iosHint: "Держать и сохранить",
    iosSaved: "Открыто!",
  },
  zh: {
    title: "SOS Expat 图库 — 210+ 免费高清",
    desc: "免费使用。包含指向sos-expat.com的链接。嵌入代码已包含链接。",
    cta: "浏览图库",
    download: "下载高清",
    downloading: "下载中…",
    downloaded: "已下载！",
    viewAll: "查看全部 210+",
    iosHint: "长按保存",
    iosSaved: "已打开！",
  },
  hi: {
    title: "SOS Expat छवि बैंक — 210+ मुफ्त HD",
    desc: "मुफ्त उपयोग। sos-expat.com का लिंक शामिल करें। एम्बेड कोड में लिंक पहले से है।",
    cta: "गैलरी देखें",
    download: "HD डाउनलोड",
    downloading: "डाउनलोड हो रहा है…",
    downloaded: "डाउनलोड हुआ!",
    viewAll: "सभी 210+ देखें",
    iosHint: "दबाएं और सेव करें",
    iosSaved: "खुला!",
  },
  ar: {
    title: "بنك صور SOS Expat — 210+ HD مجانية",
    desc: "استخدام مجاني. أضف رابطًا إلى sos-expat.com. كود التضمين يحتوي الرابط بالفعل.",
    cta: "تصفح المعرض",
    download: "تحميل HD",
    downloading: "جاري التحميل…",
    downloaded: "تم التحميل!",
    viewAll: "عرض الكل 210+",
    iosHint: "اضغط مطولاً للحفظ",
    iosSaved: "تم الفتح!",
  },
};

// 8 preview images — thumb.webp for display, original.webp for download
// Images served from sos-expat.com with CORS headers
const PREVIEW_IMAGES = [
  { id: 1, src: "https://sos-expat.com/storage/image-bank/ea7e67d5-404c-4dd1-bee1-61ef70a0c7b9/thumb.webp" },
  { id: 2, src: "https://sos-expat.com/storage/image-bank/1f7b33b2-618e-40ed-9e47-878e5ec1ac13/thumb.webp" },
  { id: 3, src: "https://sos-expat.com/storage/image-bank/b1a4fe2d-e1e6-482c-9daf-8e7e6fb8e5ba/thumb.webp" },
  { id: 4, src: "https://sos-expat.com/storage/image-bank/1fa35ff2-9ee1-4983-8dbc-bcb2f83ca97d/thumb.webp" },
  { id: 5, src: "https://sos-expat.com/storage/image-bank/5172d6c0-6dd1-4fd1-b80b-8093e778ef77/thumb.webp" },
  { id: 6, src: "https://sos-expat.com/storage/image-bank/e28243cf-2074-4950-b50b-2ad8eb02d112/thumb.webp" },
  { id: 7, src: "https://sos-expat.com/storage/image-bank/48cb78d9-f56b-4375-a076-17a223913853/thumb.webp" },
  { id: 8, src: "https://sos-expat.com/storage/image-bank/afe72e67-f177-4e3a-b6a2-8e652d62e213/thumb.webp" },
];

type AccentColor = "emerald" | "pink" | "blue" | "amber" | "purple" | "red";

const ACCENT_STYLES: Record<AccentColor, { btnBg: string; containerBg: string; scrollBg: string; downloadBg: string }> = {
  emerald: {
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
    containerBg: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20",
    scrollBg: "bg-emerald-500/10 border-emerald-500/20",
    downloadBg: "bg-emerald-600 hover:bg-emerald-700",
  },
  pink: {
    btnBg: "bg-pink-600 hover:bg-pink-700",
    containerBg: "bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20",
    scrollBg: "bg-pink-500/10 border-pink-500/20",
    downloadBg: "bg-pink-600 hover:bg-pink-700",
  },
  blue: {
    btnBg: "bg-blue-600 hover:bg-blue-700",
    containerBg: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20",
    scrollBg: "bg-blue-500/10 border-blue-500/20",
    downloadBg: "bg-blue-600 hover:bg-blue-700",
  },
  amber: {
    btnBg: "bg-amber-600 hover:bg-amber-700",
    containerBg: "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20",
    scrollBg: "bg-amber-500/10 border-amber-500/20",
    downloadBg: "bg-amber-600 hover:bg-amber-700",
  },
  purple: {
    btnBg: "bg-purple-600 hover:bg-purple-700",
    containerBg: "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20",
    scrollBg: "bg-purple-500/10 border-purple-500/20",
    downloadBg: "bg-purple-600 hover:bg-purple-700",
  },
  red: {
    btnBg: "bg-red-600 hover:bg-red-700",
    containerBg: "bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20",
    scrollBg: "bg-red-500/10 border-red-500/20",
    downloadBg: "bg-red-600 hover:bg-red-700",
  },
};

interface ImageBankSectionProps {
  accent?: AccentColor;
  /** Show download button on each thumbnail (dashboard mode). Default: false */
  showDownload?: boolean;
}

// ─── Download state per image ─────────────────────────────────────────────────
type DownloadState = "idle" | "loading" | "done";

function getOriginalUrl(thumbUrl: string): string {
  return thumbUrl.replace("/thumb.webp", "/original.webp");
}

/** True on iOS Safari — download attribute not supported, must open in new tab */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
}

async function downloadImage(thumbUrl: string, id: number): Promise<"downloaded" | "opened"> {
  const url = getOriginalUrl(thumbUrl);
  const filename = `sos-expat-image-${id}.webp`;

  // iOS Safari: <a download> doesn't work — open in new tab, user long-presses to save
  if (isIOS()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "opened";
  }

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return "downloaded";
  } catch {
    // Fallback: open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
    return "opened";
  }
}

// ─── Single thumbnail with download overlay ───────────────────────────────────
interface ThumbProps {
  img: { id: number; src: string };
  galleryUrl: string;
  showDownload: boolean;
  downloadLabel: string;
  downloadingLabel: string;
  downloadedLabel: string;
  iosLabel: string;
  accentDownloadBg: string;
}

const Thumbnail = React.memo(function Thumbnail({
  img, galleryUrl, showDownload,
  downloadLabel, downloadingLabel, downloadedLabel, iosLabel, accentDownloadBg,
}: ThumbProps) {
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const [wasIOS, setWasIOS] = useState(false);

  const handleDownload = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dlState !== "idle") return;
    setDlState("loading");
    const result = await downloadImage(img.src, img.id);
    setWasIOS(result === "opened");
    setDlState("done");
    setTimeout(() => { setDlState("idle"); setWasIOS(false); }, 3000);
  }, [dlState, img]);

  const content = (
    <div
      className="relative flex-shrink-0 snap-start rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:scale-[1.03] active:scale-[0.98] group/thumb"
      style={{ width: "clamp(130px, 28vw, 160px)" }}
    >
      {/* Thumbnail image — eager (lazy ne fonctionne pas dans overflow-x-auto) */}
      <div className="aspect-[4/3] bg-white/10">
        <img
          src={img.src}
          alt={`SOS Expat image ${img.id}`}
          width={160}
          height={120}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {showDownload && (
        <>
          {/* Desktop: overlay visible on hover only */}
          <div className="hidden sm:flex absolute inset-0 bg-black/55 flex-col items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              disabled={dlState !== "idle"}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-white text-[10px] font-bold transition-all active:scale-95 ${accentDownloadBg} disabled:opacity-70`}
              aria-label={`Download image ${img.id}`}
            >
              {dlState === "loading" ? (
                <><Loader2 className="w-3 h-3 animate-spin" />{downloadingLabel}</>
              ) : dlState === "done" ? (
                wasIOS
                  ? <><CheckCircle2 className="w-3 h-3" /><span className="max-w-[70px] text-center leading-tight">{iosLabel}</span></>
                  : <><CheckCircle2 className="w-3 h-3" />{downloadedLabel}</>
              ) : (
                <><Download className="w-3 h-3" />{downloadLabel}</>
              )}
            </button>
          </div>

          {/* Mobile: small download icon pinned bottom-right, always visible */}
          <button
            onClick={handleDownload}
            disabled={dlState !== "idle"}
            className={`sm:hidden absolute bottom-1 right-1 w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all active:scale-90 ${accentDownloadBg} disabled:opacity-60`}
            aria-label={`Download image ${img.id}`}
          >
            {dlState === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            ) : dlState === "done" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </>
      )}
    </div>
  );

  if (showDownload) return content;

  return (
    <a href={galleryUrl} target="_blank" rel="noopener noreferrer" className="contents">
      {content}
    </a>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
const ImageBankSection: React.FC<ImageBankSectionProps> = ({ accent = "emerald", showDownload = false }) => {
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
            <p className="text-xs sm:text-sm opacity-70 line-clamp-2">
              {t.desc}
              {showDownload && (
                <span className="ml-1 opacity-90 font-medium hidden sm:inline">
                  {" "}— {lang === "fr" ? "Survolez une image pour la télécharger en HD (WebP, ~220 Ko)." : "Hover an image to download it in HD (WebP, ~220 KB)."}
                </span>
              )}
            </p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded border border-green-500/20">
            <Shield className="w-3 h-3" />
            CC BY 4.0
          </span>
        </div>
      </div>

      {/* Scrollable image strip with arrows */}
      <div className="relative group">
        {/* Left arrow */}
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

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto px-5 sm:px-8 pb-4 snap-x snap-mandatory scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PREVIEW_IMAGES.map((img) => (
            <Thumbnail
              key={img.id}
              img={img}
              galleryUrl={galleryUrl}
              showDownload={showDownload}
              downloadLabel={t.download}
              downloadingLabel={t.downloading}
              downloadedLabel={t.downloaded}
              iosLabel={t.iosSaved}
              accentDownloadBg={s.downloadBg}
            />
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
            <span className="text-[10px] opacity-50">{t.viewAll}</span>
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

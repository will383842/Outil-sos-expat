import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Download, Copy, Check, Image as ImageIcon, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import SEOHead from '../../components/layout/SEOHead';
import { BreadcrumbSchema } from '../../components/seo';
import { useApp } from '../../contexts/AppContext';
import { parseLocaleFromPath, getLocaleString } from '../../multilingual-system';
import { useLocation } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GalleryImage {
  id: number;
  slug: string;
  thumb_url: string;
  full_url: string;
  avif_url: string | null;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait' | 'square';
  aspect_ratio: string;
  is_featured: boolean;
  alt: string;
  title: string;
  caption: string;
  embed_code: string;
  category: { name: string; slug: string } | null;
  license: string;
}

interface GalleryMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

// ─── i18n ────────────────────────────────────────────────────────────────────

const T: Record<string, Record<string, string>> = {
  fr: {
    title: 'Banque d\'images SOS Expat',
    subtitle: '210+ visuels HD libres de droits pour vos articles, réseaux et sites web.',
    license: 'Licence CC BY 4.0 — Utilisation libre avec lien vers sos-expat.com',
    all: 'Toutes',
    landscape: 'Paysage',
    portrait: 'Portrait',
    square: 'Carré',
    copy: 'Copier le code',
    copied: 'Copié !',
    download: 'Télécharger',
    embed: 'Code embed',
    loading: 'Chargement…',
    noResults: 'Aucune image trouvée.',
    prev: 'Précédent',
    next: 'Suivant',
    of: 'sur',
    images: 'images',
    home: 'Accueil',
  },
  en: {
    title: 'SOS Expat Image Bank',
    subtitle: '210+ royalty-free HD visuals for articles, social media, and websites.',
    license: 'CC BY 4.0 License — Free to use with a link to sos-expat.com',
    all: 'All',
    landscape: 'Landscape',
    portrait: 'Portrait',
    square: 'Square',
    copy: 'Copy code',
    copied: 'Copied!',
    download: 'Download',
    embed: 'Embed code',
    loading: 'Loading…',
    noResults: 'No images found.',
    prev: 'Previous',
    next: 'Next',
    of: 'of',
    images: 'images',
    home: 'Home',
  },
  es: {
    title: 'Banco de imágenes SOS Expat',
    subtitle: '210+ imágenes HD libres de derechos para artículos, redes y sitios web.',
    license: 'Licencia CC BY 4.0 — Uso libre con enlace a sos-expat.com',
    all: 'Todas', landscape: 'Paisaje', portrait: 'Retrato', square: 'Cuadrado',
    copy: 'Copiar código', copied: '¡Copiado!', download: 'Descargar', embed: 'Código embed',
    loading: 'Cargando…', noResults: 'No se encontraron imágenes.', prev: 'Anterior', next: 'Siguiente',
    of: 'de', images: 'imágenes', home: 'Inicio',
  },
  de: {
    title: 'SOS Expat Bildergalerie',
    subtitle: '210+ lizenzfreie HD-Bilder für Artikel, soziale Medien und Websites.',
    license: 'CC BY 4.0 Lizenz — Kostenlos mit Link zu sos-expat.com',
    all: 'Alle', landscape: 'Querformat', portrait: 'Hochformat', square: 'Quadratisch',
    copy: 'Code kopieren', copied: 'Kopiert!', download: 'Herunterladen', embed: 'Einbettungscode',
    loading: 'Laden…', noResults: 'Keine Bilder gefunden.', prev: 'Zurück', next: 'Weiter',
    of: 'von', images: 'Bilder', home: 'Startseite',
  },
  pt: {
    title: 'Banco de imagens SOS Expat',
    subtitle: '210+ visuais HD livres de direitos para artigos, redes e sites.',
    license: 'Licença CC BY 4.0 — Uso livre com link para sos-expat.com',
    all: 'Todas', landscape: 'Paisagem', portrait: 'Retrato', square: 'Quadrado',
    copy: 'Copiar código', copied: 'Copiado!', download: 'Baixar', embed: 'Código embed',
    loading: 'Carregando…', noResults: 'Nenhuma imagem encontrada.', prev: 'Anterior', next: 'Próximo',
    of: 'de', images: 'imagens', home: 'Início',
  },
  ru: {
    title: 'Банк изображений SOS Expat',
    subtitle: '210+ бесплатных HD-изображений для статей, соцсетей и сайтов.',
    license: 'Лицензия CC BY 4.0 — Бесплатно со ссылкой на sos-expat.com',
    all: 'Все', landscape: 'Пейзаж', portrait: 'Портрет', square: 'Квадрат',
    copy: 'Копировать код', copied: 'Скопировано!', download: 'Скачать', embed: 'Код вставки',
    loading: 'Загрузка…', noResults: 'Изображения не найдены.', prev: 'Назад', next: 'Вперёд',
    of: 'из', images: 'изображений', home: 'Главная',
  },
  zh: {
    title: 'SOS Expat 图库',
    subtitle: '210+ 免费高清图片，用于文章、社交媒体和网站。',
    license: 'CC BY 4.0 许可证 — 免费使用，附链接至 sos-expat.com',
    all: '全部', landscape: '横向', portrait: '纵向', square: '正方形',
    copy: '复制代码', copied: '已复制！', download: '下载', embed: '嵌入代码',
    loading: '加载中…', noResults: '未找到图片。', prev: '上一页', next: '下一页',
    of: '共', images: '张图片', home: '首页',
  },
  hi: {
    title: 'SOS Expat छवि बैंक',
    subtitle: '210+ रॉयल्टी-फ्री HD विज़ुअल — लेख, सोशल मीडिया और वेबसाइट के लिए।',
    license: 'CC BY 4.0 लाइसेंस — sos-expat.com के लिंक के साथ मुफ्त उपयोग',
    all: 'सभी', landscape: 'लैंडस्केप', portrait: 'पोर्ट्रेट', square: 'वर्गाकार',
    copy: 'कोड कॉपी करें', copied: 'कॉपी हो गया!', download: 'डाउनलोड', embed: 'एम्बेड कोड',
    loading: 'लोड हो रहा है…', noResults: 'कोई छवि नहीं मिली।', prev: 'पिछला', next: 'अगला',
    of: 'में से', images: 'छवियाँ', home: 'होम',
  },
  ar: {
    title: 'بنك صور SOS Expat',
    subtitle: '210+ صورة HD مجانية للمقالات ووسائل التواصل والمواقع.',
    license: 'ترخيص CC BY 4.0 — استخدام مجاني مع رابط إلى sos-expat.com',
    all: 'الكل', landscape: 'أفقي', portrait: 'رأسي', square: 'مربع',
    copy: 'نسخ الكود', copied: 'تم النسخ!', download: 'تحميل', embed: 'كود التضمين',
    loading: 'جارٍ التحميل…', noResults: 'لم يتم العثور على صور.', prev: 'السابق', next: 'التالي',
    of: 'من', images: 'صورة', home: 'الرئيسية',
  },
};

const BLOG_API = 'https://sos-expat.com/api/v1/public/gallery';

// ─── Component ────────────────────────────────────────────────────────────────

const Galerie: React.FC = () => {
  const { language, isRTL } = useApp();
  const location = useLocation();
  const lang = (language === 'ch' ? 'zh' : language) || 'fr';
  const t = T[lang] || T.fr;

  const { country } = parseLocaleFromPath(location.pathname);
  const localeSlug = getLocaleString(language as any);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [meta, setMeta] = useState<GalleryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [orientation, setOrientation] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  const fetchGallery = useCallback(async (p: number, orient: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lang, page: String(p), per_page: '24' });
      if (orient) params.set('orientation', orient);
      const res = await fetch(`${BLOG_API}?${params}`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      setImages(json.data || []);
      setMeta(json.meta || null);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchGallery(page, orientation);
  }, [fetchGallery, page, orientation]);

  // Reset page on filter change
  const handleOrientationChange = (o: string) => {
    setOrientation(o);
    setPage(1);
  };

  const copyEmbed = async (img: GalleryImage) => {
    const code = img.embed_code || `<a href="https://sos-expat.com" rel="nofollow"><img src="${img.full_url}" alt="${img.alt}" width="${img.width}" height="${img.height}" loading="lazy" /></a>`;
    await navigator.clipboard.writeText(code);
    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canonicalUrl = `https://sos-expat.com/${localeSlug}/galerie`;

  return (
    <Layout>
      <SEOHead
        title={`${t.title} | SOS Expat`}
        description={t.subtitle}
        canonicalUrl={canonicalUrl}
        ogType="website"
      />
      <BreadcrumbSchema items={[
        { name: t.home, url: `https://sos-expat.com/${localeSlug}` },
        { name: t.title },
      ]} />

      <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-xl flex-shrink-0">
                <ImageIcon className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.title}</h1>
                <p className="mt-1 text-gray-500 text-sm sm:text-base">{t.subtitle}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                  {t.license}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Orientation filter */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {(['', 'landscape', 'portrait', 'square'] as const).map((o) => (
              <button
                key={o}
                onClick={() => handleOrientationChange(o)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  orientation === o
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {o === '' ? t.all : o === 'landscape' ? t.landscape : o === 'portrait' ? t.portrait : t.square}
              </button>
            ))}
            {meta && (
              <span className="text-xs text-gray-400 ml-auto">
                {meta.total} {t.images}
              </span>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-20 text-gray-400">{t.noResults}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setLightbox(img)}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={img.thumb_url}
                      alt={img.alt || 'SOS Expat'}
                      width={img.width}
                      height={img.height}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                  </div>
                  {img.is_featured && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
                      ★
                    </span>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center opacity-0 group-hover:opacity-100 pb-3 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyEmbed(img); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                      title={t.copy}
                    >
                      {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === img.id ? t.copied : t.copy}
                    </button>
                    <a
                      href={img.full_url}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      title={t.download}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.prev}
              </button>
              <span className="text-sm text-gray-500">
                {page} {t.of} {meta.last_page}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page === meta.last_page}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                {t.next}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.full_url}
              alt={lightbox.alt || 'SOS Expat'}
              className="w-full max-h-[60vh] object-contain bg-gray-100"
            />
            <div className="p-5">
              {lightbox.title && <p className="font-semibold text-gray-900 mb-1">{lightbox.title}</p>}
              {lightbox.caption && <p className="text-sm text-gray-500 mb-3">{lightbox.caption}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copyEmbed(lightbox)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {copiedId === lightbox.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === lightbox.id ? t.copied : t.embed}
                </button>
                <a
                  href={lightbox.full_url}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t.download}
                </a>
                <span className="text-xs text-gray-400 ml-auto">{lightbox.license}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Galerie;

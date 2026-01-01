import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  Phone,
  Globe,
  Facebook,
  Twitter,
  Linkedin,
  ArrowUp,
  type LucideIcon,
} from "lucide-react";
import { useIntl } from "react-intl";
import { useApp } from "../../contexts/AppContext";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { getLocaleString } from "../../multilingual-system";

// ============================================================================
// TYPES
// ============================================================================

interface LegalLink {
  readonly label: string;
  readonly href: string;
  readonly order?: number;
}

interface ContactInfo {
  readonly icon: LucideIcon;
  readonly text: string;
  readonly href?: string;
  readonly ariaLabel: string;
  readonly isExternal?: boolean;
}

interface FooterSection {
  readonly title: string;
  readonly links: readonly LegalLink[];
}

interface SocialLink {
  readonly icon: LucideIcon;
  readonly href: string;
  readonly ariaLabel: string;
  readonly name: string;
}

interface CacheData {
  readonly version: number;
  readonly timestamp: number;
  readonly data: LegalLink[];
}

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar";

// ============================================================================
// CONSTANTS
// ============================================================================

const IS_DEV = import.meta.env.MODE !== "production";
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const SOCIAL_URLS = {
  facebook: (import.meta.env.VITE_FACEBOOK_URL as string) || "",
  twitter: (import.meta.env.VITE_TWITTER_URL as string) || "",
  linkedin: (import.meta.env.VITE_LINKEDIN_URL as string) || "",
} as const;

const EXCLUDED_LEGAL_LABELS = new Set([
  "CGU Avocats",
  "CGU Expatriés",
  "Lawyer Terms",
  "Expat Terms",
]);

// ============================================================================
// UTILITIES
// ============================================================================

const getCacheKey = (lang: SupportedLanguage): string =>
  `sos_footer_legal_v${CACHE_VERSION}_${lang}`;

const readCache = (lang: SupportedLanguage): LegalLink[] | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    if (!raw) return null;

    const cached: CacheData = JSON.parse(raw);

    if (cached.version !== CACHE_VERSION) return null;
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) return null;

    return cached.data;
  } catch {
    return null;
  }
};

const writeCache = (lang: SupportedLanguage, data: LegalLink[]): void => {
  try {
    const cacheData: CacheData = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data,
    };
    localStorage.setItem(getCacheKey(lang), JSON.stringify(cacheData));
  } catch {
    // Silently fail - cache is optional
  }
};

const filterLegalLinks = (links: LegalLink[]): LegalLink[] =>
  links.filter((link) => !EXCLUDED_LEGAL_LABELS.has(link.label));

const resolveDocumentHref = (data: Record<string, unknown>): string => {
  if (typeof data.path === "string" && data.path) return data.path;
  if (typeof data.slug === "string" && data.slug) return `/${data.slug}`;

  const type = typeof data.type === "string" ? data.type : "";

  const typeToPath: Record<string, string> = {
    terms: "/cgu-clients",
    privacy: "/politique-confidentialite",
    cookies: "/cookies",
    legal: "/consommateurs",
    faq: "/faq",
    help: "/centre-aide",
    seo: "/referencement",
  };

  return typeToPath[type] || `/${type || "legal"}`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FooterLinkProps {
  readonly href: string;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly isExternal?: boolean;
  readonly prefetch?: boolean;
}

const FooterLink = memo<FooterLinkProps>(function FooterLink({
  href,
  children,
  className = "",
  ariaLabel,
  isExternal = false,
  prefetch = false,
}) {
  const baseClass = `group flex items-center text-gray-400 hover:text-white 
    focus:text-white transition-all duration-300 text-sm 
    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
    py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/5 focus:bg-white/5 
    touch-manipulation ${className}`;

  if (isExternal || href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className={baseClass}
      aria-label={ariaLabel}
      {...(prefetch && { "data-prefetch": "true" })}
    >
      {children}
    </Link>
  );
});

interface FooterSectionNavProps {
  readonly title: string;
  readonly links: readonly LegalLink[];
  readonly navAriaLabel: string;
}

const FooterSectionNav = memo<FooterSectionNavProps>(function FooterSectionNav({
  title,
  links,
  navAriaLabel,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        {title}
        <span
          className="w-6 h-px bg-gradient-to-r from-red-500 to-red-600"
          aria-hidden="true"
        />
      </h3>
      <nav aria-label={navAriaLabel}>
        <ul className="space-y-2" role="list">
          {links.map((link, index) => (
            <li key={`${link.href}-${index}`}>
              <FooterLink href={link.href}>
                <span
                  className="w-1 h-1 bg-gray-600 rounded-full mr-3 
                    group-hover:bg-red-400 group-focus:bg-red-400 
                    transition-colors duration-300"
                  aria-hidden="true"
                />
                {link.label}
              </FooterLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
});

interface SocialLinksProps {
  readonly links: readonly SocialLink[];
  readonly ariaLabel: string;
}

const SocialLinks = memo<SocialLinksProps>(function SocialLinks({
  links,
  ariaLabel,
}) {
  return (
    <div className="flex space-x-3" role="list" aria-label={ariaLabel}>
      {links.map((social) => (
        <a
          key={social.name}
          href={social.href || "#"}
          className="group p-2.5 rounded-xl bg-white/5 border border-white/10 
            hover:bg-white/10 hover:border-white/20 hover:scale-105 
            focus:bg-white/10 focus:border-white/20 focus:scale-105 
            focus-visible:ring-2 focus-visible:ring-red-500/50
            transition-all duration-300 focus:outline-none 
            touch-manipulation active:scale-95"
          aria-label={social.ariaLabel}
          target="_blank"
          rel="noopener noreferrer"
        >
          <social.icon
            size={16}
            className="text-gray-400 group-hover:text-white transition-colors duration-300"
            aria-hidden="true"
          />
        </a>
      ))}
    </div>
  );
});

interface ContactItemProps {
  readonly item: ContactInfo;
}

const ContactItem = memo<ContactItemProps>(function ContactItem({ item }) {
  const content = (
    <>
      <div
        className="flex-shrink-0 p-1.5 rounded-lg bg-white/5 border border-white/10 
          group-hover:bg-white/10 group-hover:border-white/20 
          transition-all duration-300"
        aria-hidden="true"
      >
        <item.icon size={14} className="text-red-400" />
      </div>
      <span className="text-gray-400 group-hover:text-white transition-colors duration-300 text-sm leading-relaxed">
        {item.text}
      </span>
    </>
  );

  const wrapperClass = `group flex items-start space-x-3 p-2 rounded-lg 
    transition-all duration-300 hover:bg-white/5 focus-within:bg-white/5`;

  if (!item.href) {
    return <div className={wrapperClass}>{content}</div>;
  }

  if (item.isExternal || item.href.startsWith("http")) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 touch-manipulation`}
        aria-label={item.ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={item.href}
      className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 touch-manipulation`}
      aria-label={item.ariaLabel}
    >
      {content}
    </Link>
  );
});

interface LegalLinksNavProps {
  readonly links: readonly LegalLink[];
  readonly isLoading: boolean;
  readonly loadingText: string;
  readonly navAriaLabel: string;
}

const LegalLinksNav = memo<LegalLinksNavProps>(function LegalLinksNav({
  links,
  isLoading,
  loadingText,
  navAriaLabel,
}) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-3 text-gray-400"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex gap-1" aria-hidden="true">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-red-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
        <span className="text-sm">{loadingText}</span>
      </div>
    );
  }

  return (
    <nav aria-label={navAriaLabel}>
      <ul
        className="flex flex-wrap justify-center lg:justify-end gap-1 text-sm"
        role="list"
      >
        {links.map((link, index) => (
          <li key={`${link.href}-${index}`} className="flex items-center">
            <Link
              to={link.href}
              className="px-3 py-2 rounded-lg text-gray-400 hover:text-white 
                focus:text-white transition-all duration-300 
                hover:bg-white/5 focus:bg-white/5 focus:outline-none
                focus-visible:ring-2 focus-visible:ring-red-500/50
                touch-manipulation relative group overflow-hidden"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
                aria-hidden="true"
              />
              <span className="relative z-10">{link.label}</span>
            </Link>
            {index < links.length - 1 && (
              <span
                className="text-gray-600 select-none flex items-center px-1"
                aria-hidden="true"
              >
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
});

interface ScrollToTopButtonProps {
  readonly visible: boolean;
  readonly onClick: () => void;
  readonly ariaLabel: string;
}

const ScrollToTopButton = memo<ScrollToTopButtonProps>(
  function ScrollToTopButton({ visible, onClick, ariaLabel }) {
    if (!visible) return null;

    return (
      <button
        type="button"
        onClick={onClick}
        className="hidden lg:flex fixed bottom-6 right-6 z-50 group
          bg-gradient-to-r from-red-500 to-red-600
          text-white p-3 rounded-2xl shadow-xl
          hover:shadow-red-500/25 hover:scale-110
          focus:scale-110 active:scale-95
          transition-all duration-300 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
          backdrop-blur-sm border border-red-400/20
          animate-fade-in"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
        }}
        aria-label={ariaLabel}
      >
        <ArrowUp
          size={18}
          className="transform group-hover:translate-y-[-2px] transition-transform duration-300"
          aria-hidden="true"
        />
      </button>
    );
  }
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Footer: React.FC = () => {
  const intl = useIntl();
  const { language: ctxLang } = useApp();

  // Resolve language
  const resolvedLang = useMemo<SupportedLanguage>(() => {
    const supportedLangs: SupportedLanguage[] = ["fr", "en", "es", "de", "ru", "hi", "pt", "ch", "ar"];

    if (supportedLangs.includes(ctxLang as SupportedLanguage)) {
      return ctxLang as SupportedLanguage;
    }
    if (supportedLangs.includes(intl.locale as SupportedLanguage)) {
      return intl.locale as SupportedLanguage;
    }
    return "fr";
  }, [ctxLang, intl.locale]);

  const [legalLinks, setLegalLinks] = useState<LegalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Default legal links (fallback)
  const defaultLegalLinks = useMemo<LegalLink[]>(
    () => [
      {
        label: intl.formatMessage({ id: "footer.legal.privacy" }),
        href: "/politique-confidentialite",
        order: 10,
      },
      {
        label: intl.formatMessage({ id: "footer.legal.termsClients" }),
        href: "/cgu-clients",
        order: 20,
      },
      {
        label: intl.formatMessage({ id: "footer.legal.cookies" }),
        href: "/cookies",
        order: 50,
      },
      {
        label: intl.formatMessage({ id: "footer.legal.consumers" }),
        href: "/consommateurs",
        order: 60,
      },
    ],
    [intl]
  );

  // Footer sections - SANS le lien "appel-expatrie"
  const footerSections = useMemo<Record<string, FooterSection>>(
    () => ({
      services: {
        title: intl.formatMessage({ id: "footer.services.title" }),
        links: [
          {
            label: intl.formatMessage({ id: "footer.services.sosCall" }),
            href: "/sos-appel",
          },
          {
            label: intl.formatMessage({ id: "footer.services.pricing" }),
            href: "/tarifs",
          },
          {
            label: intl.formatMessage({ id: "footer.services.experts" }),
            href: "/nos-experts",
          },
          {
            label: intl.formatMessage({ id: "footer.services.testimonials" }),
            href: "/temoignages",
          },
        ],
      },
      support: {
        title: intl.formatMessage({ id: "footer.support.title" }),
        links: [
          {
            label: intl.formatMessage({ id: "footer.support.faq" }),
            href: `/${getLocaleString(resolvedLang)}/faq`,
          },
          {
            label: intl.formatMessage({ id: "footer.support.contact" }),
            href: "/contact",
          },
          {
            label: intl.formatMessage({ id: "footer.support.helpCenter" }),
            href: "/centre-aide",
          },
          {
            label: intl.formatMessage({ id: "footer.support.serviceStatus" }),
            href: "/statut-service",
          },
        ],
      },
    }),
    [intl, resolvedLang]
  );

  // Contact info
  const contactInfo = useMemo<ContactInfo[]>(
    () => [
      {
        icon: Globe,
        text: intl.formatMessage({ id: "footer.contact.presence" }),
        ariaLabel: intl.formatMessage({ id: "footer.contact.locationAria" }),
      },
      {
        icon: Phone,
        text: intl.formatMessage({ id: "footer.contact.callUs" }),
        href: "/contact",
        ariaLabel: intl.formatMessage({ id: "footer.contact.phoneAria" }),
      },
      {
        icon: Globe,
        text: intl.formatMessage({ id: "footer.contact.ulixai" }),
        href: "https://www.ulixai.com/",
        ariaLabel: intl.formatMessage({ id: "footer.contact.ulixaiAria" }),
        isExternal: true,
      },
    ],
    [intl]
  );

  // Social links
  const socialLinks = useMemo<SocialLink[]>(
    () => [
      {
        icon: Facebook,
        href: SOCIAL_URLS.facebook || "#",
        ariaLabel: intl.formatMessage({ id: "footer.social.facebookAria" }),
        name: "Facebook",
      },
      {
        icon: Twitter,
        href: SOCIAL_URLS.twitter || "#",
        ariaLabel: intl.formatMessage({ id: "footer.social.twitterAria" }),
        name: "Twitter",
      },
      {
        icon: Linkedin,
        href: SOCIAL_URLS.linkedin || "#",
        ariaLabel: intl.formatMessage({ id: "footer.social.linkedinAria" }),
        name: "LinkedIn",
      },
    ],
    [intl]
  );

  // Note: Le JSON-LD principal (Organization, WebSite, WebPage, BreadcrumbList)
  // est géré par SEOPage.tsx dans chaque page.
  // Le Footer ne contient PAS de JSON-LD pour éviter les duplications.
  // Voir SEO-USAGE-EXAMPLES.tsx pour l'architecture recommandée.

  // Load legal documents from Firestore
  useEffect(() => {
    let isMounted = true;

    const loadLegalDocuments = async () => {
      // Check cache first
      const cached = readCache(resolvedLang);
      if (cached?.length) {
        setLegalLinks(filterLegalLinks(cached));
        setIsLoading(false);
        // Continue to fetch fresh data in background
      }

      try {
        if (!db) {
          if (IS_DEV) {
            console.debug("[Footer] Firebase unavailable, using defaults");
          }
          if (isMounted && !cached) {
            setLegalLinks(defaultLegalLinks);
            setIsLoading(false);
          }
          return;
        }

        if (!cached) {
          setIsLoading(true);
        }

        const col = collection(db, "legal_documents");
        const qLang = query(
          col,
          where("language", "==", resolvedLang),
          where("isActive", "==", true)
        );
        const qLocale = query(
          col,
          where("locale", "==", resolvedLang),
          where("isActive", "==", true)
        );

        let snapshot = await getDocs(qLang);
        if (snapshot.empty) {
          snapshot = await getDocs(qLocale);
        }

        if (!isMounted) return;

        if (snapshot.empty) {
          if (IS_DEV) {
            console.debug("[Footer] No legal docs found, using defaults");
          }
          if (!cached) {
            setLegalLinks(defaultLegalLinks);
          }
          writeCache(resolvedLang, defaultLegalLinks);
        } else {
          const items: LegalLink[] = snapshot.docs
            .map((doc) => {
              const data = doc.data() as Record<string, unknown>;
              const title = String(data.title || data.type || "Document");
              const order =
                typeof data.order === "number" ? data.order : 999;
              const href = resolveDocumentHref(data);

              return { label: title, href, order };
            })
            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

          const filteredItems = filterLegalLinks(items);
          setLegalLinks(filteredItems);
          writeCache(resolvedLang, filteredItems);
        }
      } catch (err) {
        console.error("[Footer] Firestore error:", err);
        if (isMounted && !cached) {
          setLegalLinks(defaultLegalLinks);
          writeCache(resolvedLang, defaultLegalLinks);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLegalDocuments();

    return () => {
      isMounted = false;
    };
  }, [resolvedLang, defaultLegalLinks]);

  // Intersection Observer for scroll-to-top button (more performant than scroll event)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Fallback for older browsers
      const onScroll = () => setShowScrollTop(window.scrollY > 160);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const sentinel = document.createElement("div");
    sentinel.id = "footer-scroll-sentinel";
    sentinel.style.cssText =
      "position:absolute;top:160px;left:0;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollTop(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const scrollToTop = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer
      className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-hidden print:bg-white print:text-black"
      role="contentinfo"
      aria-label={intl.formatMessage({ id: "footer.ariaLabel" })}
      itemScope
      itemType="https://schema.org/WPFooter"
    >

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 left-1/4 w-48 h-48 bg-blue-500/8 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Scroll to top button */}
      <ScrollToTopButton
        visible={showScrollTop}
        onClick={scrollToTop}
        ariaLabel={intl.formatMessage({ id: "footer.scrollToTop" })}
      />

      {/* Main content */}
      <div className="relative backdrop-blur-sm bg-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Company Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="group">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                      aria-hidden="true"
                    />
                    <div className="relative bg-gradient-to-r from-red-500 to-red-600 p-2.5 rounded-xl shadow-lg">
                      <Phone className="text-white" size={18} aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <span
                      className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                      itemProp="name"
                    >
                      SOS Urgently
                    </span>
                    <div
                      className="h-0.5 w-12 bg-gradient-to-r from-red-500 to-red-600 mt-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <p
                  className="text-gray-300 text-sm leading-relaxed mb-6"
                  itemProp="description"
                >
                  {intl.formatMessage({ id: "footer.company.description" })}
                </p>
              </div>

              <SocialLinks
                links={socialLinks}
                ariaLabel={intl.formatMessage({ id: "footer.social.ariaLabel" })}
              />
            </div>

            {/* Services */}
            <FooterSectionNav
              title={footerSections.services.title}
              links={footerSections.services.links}
              navAriaLabel={intl.formatMessage({ id: "footer.services.navAria" })}
            />

            {/* Support */}
            <FooterSectionNav
              title={footerSections.support.title}
              links={footerSections.support.links}
              navAriaLabel={intl.formatMessage({ id: "footer.support.navAria" })}
            />

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {intl.formatMessage({ id: "footer.contact.title" })}
                <span
                  className="w-6 h-px bg-gradient-to-r from-red-500 to-red-600"
                  aria-hidden="true"
                />
              </h3>
              <ul className="space-y-3" role="list">
                {contactInfo.map((item, index) => (
                  <li key={index}>
                    <ContactItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Separator */}
          <div className="relative mb-8" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <div className="mx-2 bg-transparent px-4">
                <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="text-gray-400 text-sm text-center lg:text-left order-2 lg:order-1">
              <span className="font-medium text-white">
                © {currentYear} SOS Urgently.
              </span>
              <span className="ml-1">
                {intl.formatMessage({ id: "footer.copyright" })}
              </span>
            </div>

            <div className="order-1 lg:order-2">
              <LegalLinksNav
                links={legalLinks}
                isLoading={isLoading}
                loadingText={intl.formatMessage({ id: "common.loading" })}
                navAriaLabel={intl.formatMessage({ id: "footer.legal.navAria" })}
              />
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-1 bg-gradient-to-r from-red-500/50 via-red-600/80 to-red-500/50"
          aria-hidden="true"
        />
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @media print {
          footer { display: none !important; }
        }
      `}</style>
    </footer>
  );
};

export default memo(Footer);
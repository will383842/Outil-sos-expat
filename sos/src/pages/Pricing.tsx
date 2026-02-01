// src/pages/Pricing.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import {
  Check,
  Phone,
  Clock,
  Shield,
  Star,
  CreditCard,
  CheckCircle,
  Briefcase,
  User,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useLocaleNavigate } from "../multilingual-system";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { validateCoupon } from "../utils/coupon";
import {
  usePricingConfig,
  detectUserCurrency,
  getEffectivePrice,
} from "../services/pricingService";
import { FormattedMessage } from "react-intl";
import { trackMetaViewContent, trackMetaInitiateCheckout, trackMetaAddToCart } from "../utils/metaPixel";

interface PromoCode {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  isActive: boolean;
  expiresAt: Date;
  services: string[];
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  couponId?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
}

type CurrencyCode = "eur" | "usd";
type ServiceType = "expat_call" | "lawyer_call";

interface DynamicService {
  id: "expat_call" | "lawyer_call";
  type: ServiceType;
  title: string;
  price: number;
  duration: number;
  currency: CurrencyCode;
  description: string;
  isActive: boolean;
  connectionFee: number;
  providerAmount: number;
  effectivePrice?: any;
}

const PROMO_STORAGE_KEY = "activePromoCode";

const Pricing: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const { user } = useAuth();
  const navigate = useLocaleNavigate();

  const {
    pricing,
    loading: pricingLoading,
    error: pricingError,
  } = usePricingConfig();

  const [promoCode, setPromoCode] = useState<string>("");
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    try {
      const saved = sessionStorage.getItem(
        "selectedCurrency"
      ) as CurrencyCode | null;
      return saved && (saved === "eur" || saved === "usd")
        ? saved
        : detectUserCurrency();
    } catch {
      return detectUserCurrency();
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("selectedCurrency", selectedCurrency);
      localStorage.setItem("preferredCurrency", selectedCurrency);
    } catch {
      // noop
    }
  }, [selectedCurrency]);

  // Track Meta Pixel ViewContent - page Pricing vue
  useEffect(() => {
    trackMetaViewContent({
      content_name: 'pricing_page',
      content_category: 'pricing',
      content_type: 'service',
    });
  }, []);

  // ✅ FIX: Move effectivePrices and dynamicServices before handleSelectService
  // ✅ FIX 2026: Calculate prices for BOTH currencies to display side by side
  const effectivePrices = useMemo(() => {
    if (!pricing) return { lawyer: null, expat: null, lawyerUsd: null, expatUsd: null };

    return {
      lawyer: getEffectivePrice(pricing as any, "lawyer", "eur"),
      expat: getEffectivePrice(pricing as any, "expat", "eur"),
      lawyerUsd: getEffectivePrice(pricing as any, "lawyer", "usd"),
      expatUsd: getEffectivePrice(pricing as any, "expat", "usd"),
    };
  }, [pricing]);

  const dynamicServices = useMemo<DynamicService[]>(() => {
    if (!pricing || !effectivePrices.lawyer || !effectivePrices.expat)
      return [];

    return [
      {
        id: "expat_call",
        type: "expat_call",
        title: intl.formatMessage({ id: "pricing.expatTitle" }),
        price: effectivePrices.expat.price.totalAmount,
        duration: effectivePrices.expat.price.duration,
        currency: selectedCurrency,
        description: intl.formatMessage({ id: "pricing.expatDescription" }),
        isActive: true,
        connectionFee: effectivePrices.expat.price.connectionFeeAmount,
        providerAmount: effectivePrices.expat.price.providerAmount,
        effectivePrice: effectivePrices.expat,
      },
      {
        id: "lawyer_call",
        type: "lawyer_call",
        title: intl.formatMessage({ id: "pricing.lawyerTitle" }),
        price: effectivePrices.lawyer.price.totalAmount,
        duration: effectivePrices.lawyer.price.duration,
        currency: selectedCurrency,
        description: intl.formatMessage({ id: "pricing.lawyerDescription" }),
        isActive: true,
        connectionFee: effectivePrices.lawyer.price.connectionFeeAmount,
        providerAmount: effectivePrices.lawyer.price.providerAmount,
        effectivePrice: effectivePrices.lawyer,
      },
    ];
  }, [pricing, effectivePrices, selectedCurrency, intl]);

  const handleSelectService = useCallback(
    (serviceType: ServiceType | string) => {
      // Get price for selected service
      const selectedService = dynamicServices.find(s => s.type === serviceType);
      const price = selectedService?.price || 0;
      const currency = selectedCurrency.toUpperCase();

      // Track AddToCart - before InitiateCheckout
      trackMetaAddToCart({
        content_name: serviceType === "lawyer_call" ? "lawyer_consultation" : "expat_consultation",
        content_category: "sos_call",
        content_type: "service",
        value: price,
        currency: currency,
      });

      // Track InitiateCheckout for Meta Pixel
      trackMetaInitiateCheckout({
        content_name: serviceType === "lawyer_call" ? "lawyer_consultation" : "expat_consultation",
        content_category: "sos_call",
        value: price,
        currency: currency,
      });

      if (serviceType === "lawyer_call") {
        navigate("/sos-appel?tab=avocat");
      } else if (serviceType === "expat_call") {
        navigate("/sos-appel?tab=expat");
      } else {
        navigate("/sos-appel");
      }
    },
    [navigate, dynamicServices, selectedCurrency]
  );

  const fetchAndSetPromoCode = useCallback(async () => {
    try {
      const savedPromo = sessionStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) {
        setActivePromo(JSON.parse(savedPromo) as PromoCode);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("promo");

      if (codeFromUrl) {
        setPromoCode(codeFromUrl);
      }
    } catch (err) {
      console.error("Error fetching promo codes:", err);
      setError(intl.formatMessage({ id: "pricing.error.loadingPromo" }));
    }
  }, [intl]);

  const validatePromoCode = useCallback(
    async (code: string = promoCode) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        setError(intl.formatMessage({ id: "pricing.error.enterPromo" }));
        return;
      }

      setIsValidating(true);
      setError("");

      try {
        const result: ValidationResult = await validateCoupon({
          code: trimmedCode,
          userId: user?.id || "anonymous",
          totalAmount: 49,
          serviceType: "lawyer_call",
        });

        if (
          result.isValid &&
          result.discountType &&
          typeof result.discountValue === "number"
        ) {
          const promoData: PromoCode = {
            id: result.couponId || `promo-${Date.now()}`,
            code: trimmedCode.toUpperCase(),
            discountType: result.discountType,
            discountValue: result.discountValue,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            services: ["lawyer_call", "expat_call"],
          };

          setActivePromo(promoData);
          sessionStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promoData));
        } else {
          setError(
            result.message ||
              intl.formatMessage({ id: "pricing.error.invalidPromo" })
          );
          setActivePromo(null);
        }
      } catch (err) {
        console.error("Error validating promo code:", err);
        setError(intl.formatMessage({ id: "pricing.error.validatingPromo" }));
        setActivePromo(null);
      } finally {
        setIsValidating(false);
      }
    },
    [promoCode, user?.id, intl]
  );

  const getServiceFeatures = useCallback(
    (isLawyer: boolean): string[] => {
      const commonFeatures: string[] = [
        intl.formatMessage({ id: "benefits.common.secureCall" }),
        intl.formatMessage({ id: "benefits.common.pdfInvoice" }),
        intl.formatMessage({ id: "benefits.common.support247" }),
        intl.formatMessage({ id: "benefits.common.moneyBack" }),
      ];

      if (isLawyer) {
        return [
          intl.formatMessage({ id: "benefits.lawyer.certified" }),
          ...commonFeatures.slice(0, 1),
          intl.formatMessage({ id: "benefits.lawyer.duration" }),
          ...commonFeatures.slice(1),
        ];
      }

      return [
        intl.formatMessage({ id: "benefits.expat.experienced" }),
        ...commonFeatures.slice(0, 1),
        intl.formatMessage({ id: "benefits.expat.duration" }),
        ...commonFeatures.slice(1),
      ];
    },
    [intl]
  );

  const calculateDiscountedPrice = useCallback(
    (service: DynamicService): number => {
      if (!activePromo || !activePromo.services.includes(service.type)) {
        return service.price;
      }
      if (activePromo.discountType === "percentage") {
        return service.price * (1 - activePromo.discountValue / 100);
      }
      return Math.max(0, service.price - activePromo.discountValue);
    },
    [activePromo]
  );

  useEffect(() => {
    fetchAndSetPromoCode();
  }, [fetchAndSetPromoCode]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get("promo");
    if (codeFromUrl && promoCode === codeFromUrl && !activePromo) {
      validatePromoCode(codeFromUrl);
    }
  }, [promoCode, validatePromoCode, activePromo]);

  // Helper function to format price with proper internationalization
  const formatPrice = useCallback(
    (amount: number): string => {
      return intl.formatNumber(amount, {
        style: "currency",
        currency: selectedCurrency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    [intl, selectedCurrency]
  );

  // ✅ FIX 2026: Format prices for EUR and USD display
  const formatPriceEur = useCallback(
    (amount: number): string => {
      return intl.formatNumber(amount, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    [intl]
  );

  const formatPriceUsd = useCallback(
    (amount: number): string => {
      return intl.formatNumber(amount, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    [intl]
  );

  // SEO configuration
  const pageTitle = intl.formatMessage({ id: "pricing.heading" }) + " " + intl.formatMessage({ id: "pricing.headingHighlight" }) + " - SOS Expat";
  const pageDescription = intl.formatMessage({ id: "pricing.subtitle" });

  const pricingStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "PriceSpecification",
    "name": "Tarifs SOS Expat",
    "description": pageDescription,
    "priceCurrency": selectedCurrency.toUpperCase(),
    "eligibleQuantity": {
      "@type": "QuantitativeValue",
      "unitCode": "MIN"
    },
    "offers": dynamicServices.filter(s => s.isActive).map(service => ({
      "@type": "Offer",
      "name": service.title,
      "description": service.description,
      "price": service.price,
      "priceCurrency": selectedCurrency.toUpperCase(),
      "availability": "https://schema.org/InStock",
      "validFrom": new Date().toISOString()
    }))
  }), [selectedCurrency, dynamicServices, pageDescription]);

  return (
    <Layout>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`/${language}/pricing`}
        ogType="website"
        keywords="tarifs, prix, consultation avocat expatrié, aide juridique expatriation, consultation en ligne"
        locale={language === "fr" ? "fr_FR" : language === "en" ? "en_US" : `${language}_${language.toUpperCase()}`}
        structuredData={pricingStructuredData}
        contentType="PriceSpecification"
        aiSummary="Tarifs transparents pour les consultations avec avocats et expatriés aidants sur SOS Expat"
      />
      <BreadcrumbSchema
        items={[
          { name: intl.formatMessage({ id: "nav.home" }), url: `/${language}` },
          { name: intl.formatMessage({ id: "nav.pricing" }) }
        ]}
      />
      <div className="min-h-screen bg-gray-950">
        {/* Banner */}
        {(pricingLoading || pricingError) && (
          <div className="bg-red-600/10 border border-red-600/30 text-red-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <p className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {pricingLoading
                  ? intl.formatMessage({ id: "pricing.loading" })
                  : intl.formatMessage({ id: "pricing.error.unavailable" })}
              </p>
              {!pricingLoading && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                >
                  {intl.formatMessage({ id: "pricing.reload" })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-8">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">
                  <FormattedMessage id="pricing.badge" />
                </span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black mb-8 leading-tight">
                <span className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  <FormattedMessage id="pricing.heading" />{" "}
                </span>
                <span className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  <FormattedMessage id="pricing.headingHighlight" />
                </span>
              </h1>

              <h2 className="text-2xl md:text-3xl text-white font-semibold max-w-4xl mx-auto mb-12 leading-relaxed">
                <FormattedMessage
                  id="pricing.subtitle"
                  values={{
                    strong: (chunks) => <strong className="text-red-400">{chunks}</strong>
                  }}
                />
              </h2>

            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-28 bg-gradient-to-b from-white via-rose-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-red-400/10 to-orange-400/10 rounded-full blur-2xl" />
            <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4">
                <FormattedMessage id="pricing.ourOffers" />{" "}
                <span className="text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  <FormattedMessage id="pricing.ourOffersHighlight" />
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
                <FormattedMessage id="pricing.chooseServiceDesc" />
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {dynamicServices.filter((svc) => svc.isActive).length > 0 ? (
                dynamicServices
                  .filter((svc) => svc.isActive)
                  .map((service) => {
                    const isLawyer = service.type === "lawyer_call";
                    const originalPrice = service.price;
                    const discountedPrice = calculateDiscountedPrice(service);
                    const hasPromoDiscount =
                      !!activePromo &&
                      activePromo.services.includes(service.type);
                    const hasOverride = service.effectivePrice?.override;

                    return (
                      <article
                        key={service.id}
                        className={`group relative rounded-3xl border ${
                          isLawyer
                            ? "border-red-200 bg-red-50"
                            : "border-blue-200 bg-blue-50"
                        } overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] focus-within:scale-[1.02]`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${
                            isLawyer
                              ? "from-red-600 to-red-700"
                              : "from-blue-600 to-indigo-600"
                          } opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`}
                        />
                        <div className="relative z-10 p-8 sm:p-10">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-8">
                            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-white/80 rounded-full px-4 py-2 text-gray-900 text-sm font-semibold">
                              {isLawyer ? (
                                <Briefcase className="w-4 h-4" />
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                              {isLawyer ? (
                                <FormattedMessage id="pricing.lawyer.badge" />
                              ) : (
                                <FormattedMessage id="pricing.expat.badge" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              <FormattedMessage id="callInApprox5Min" />
                            </div>
                          </div>

                          {/* Title */}
                          <h3
                            className={`text-3xl font-extrabold mb-3 ${
                              isLawyer ? "text-red-600" : "text-blue-600"
                            }`}
                          >
                            {service.title}
                          </h3>

                          {/* Description */}
                          <p className="text-gray-700 mb-8 leading-relaxed text-lg">
                            {service.description}
                          </p>

                          {/* Price */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
                            <div className="flex items-end gap-3">
                              {hasOverride ? (
                                <div className="flex flex-col">
                                  <div className="flex items-end gap-3">
                                    <span className="text-gray-500 line-through text-2xl">
                                      {formatPrice(
                                        Math.round(
                                          hasPromoDiscount
                                            ? discountedPrice
                                            : originalPrice
                                        )
                                      )}
                                    </span>
                                    <span className="text-5xl font-black text-red-600 leading-none">
                                      {formatPrice(
                                        Math.round(
                                          hasPromoDiscount
                                            ? service.effectivePrice.standard
                                                .totalAmount -
                                                (activePromo.discountType ===
                                                "percentage"
                                                  ? service.effectivePrice
                                                      .standard.totalAmount *
                                                    (activePromo.discountValue /
                                                      100)
                                                  : activePromo.discountValue)
                                            : service.effectivePrice.standard
                                                .totalAmount
                                        )
                                      )}
                                    </span>
                                  </div>
                                  {service.effectivePrice.override.label && (
                                    <span className="mt-2 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 self-start">
                                      {service.effectivePrice.override.label}
                                    </span>
                                  )}
                                  {hasPromoDiscount && (
                                    <span className="mt-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 self-start">
                                      <FormattedMessage id="pricing.promoCodeApplied" />
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-3">
                                  {/* ✅ FIX 2026: Display BOTH EUR and USD prices */}
                                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 leading-none">
                                    {formatPriceEur(isLawyer ? effectivePrices.lawyer?.price.totalAmount || 0 : effectivePrices.expat?.price.totalAmount || 0)}
                                  </span>
                                  <span className="text-xl sm:text-2xl font-extrabold text-gray-600 leading-none">
                                    / {formatPriceUsd(isLawyer ? effectivePrices.lawyerUsd?.price.totalAmount || 0 : effectivePrices.expatUsd?.price.totalAmount || 0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                              <Clock className="w-4 h-4" />
                              <span>
                                {service.duration}{" "}
                                {intl.formatMessage({ id: "pricing.minutes" })}
                              </span>
                            </div>
                          </div>

                          {/* Features */}
                          <ul
                            className="space-y-4 mb-10"
                            role="list"
                            aria-label={intl.formatMessage({ id: "pricing.benefits.ariaLabel" })}
                          >
                            {getServiceFeatures(isLawyer).map(
                              (feature, index) => (
                                <li
                                  key={index}
                                  role="listitem"
                                  className="flex items-start gap-3"
                                >
                                  <span
                                    className={`mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-gradient-to-r ${
                                      isLawyer
                                        ? "from-red-600 to-red-700"
                                        : "from-blue-600 to-indigo-600"
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </span>
                                  <span className="text-gray-800 font-medium">
                                    {feature}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>

                          {/* CTA Button */}
                          <button
                            onClick={() => handleSelectService(service.type)}
                            className={`w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl font-bold text-lg text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
                              isLawyer
                                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            } hover:scale-105`}
                            aria-label={`${intl.formatMessage({ id: "pricing.chooseService" })} – ${service.title}`}
                          >
                            {intl.formatMessage({ id: "pricing.chooseService" })}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </article>
                    );
                  })
              ) : (
                <div className="col-span-1 lg:col-span-2">
                  <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
                    <p className="text-gray-800 text-lg mb-4">
                      {pricingLoading
                        ? intl.formatMessage({ id: "pricing.loadingPlans" })
                        : intl.formatMessage({ id: "pricing.unavailable" })}
                    </p>
                    {!pricingLoading && (
                      <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
                      >
                        {intl.formatMessage({ id: "pricing.reload" })}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center mt-8">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                <FormattedMessage id="pricing.priceSyncNote" />
              </span>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-28 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/3 w-64 h-64 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
                <FormattedMessage id="pricing.securityTitle" />{" "}
                <span className="text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
                  <FormattedMessage id="pricing.securityHighlight" />
                </span>
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
                <FormattedMessage id="pricing.securitySubtitle" />
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <article className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-8 sm:p-10 hover:border-white/25 hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mr-6">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">
                      {intl.formatMessage({ id: "pricing.securePayment" })}
                    </h3>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed text-lg">
                    {intl.formatMessage({ id: "pricing.securePaymentDesc" })}
                  </p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                    <CreditCard className="w-6 h-6 text-green-400" />
                    <span className="text-gray-300 font-medium">
                      Visa, Mastercard, American Express
                    </span>
                  </div>
                </div>
              </article>

              <article className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/5 backdrop-blur-xl p-8 sm:p-10 hover:border-white/25 hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mr-6">
                      <Star className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-white">
                      {intl.formatMessage({
                        id: "pricing.satisfactionGuarantee",
                      })}
                    </h3>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed text-lg">
                    {intl.formatMessage({
                      id: "pricing.satisfactionGuaranteeDesc",
                    })}
                  </p>
                  <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
                    <Clock className="w-6 h-6 text-blue-400" />
                    <span className="text-gray-300 font-medium">
                      {intl.formatMessage({ id: "pricing.refundTime" })}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-28 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: "pricing.faq" })}
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
                <FormattedMessage id="pricing.faqSubtitle" />
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  question: "pricing.faq.payment.question",
                  answer: "pricing.faq.payment.answer",
                },
                {
                  question: "pricing.faq.availability.question",
                  answer: "pricing.faq.availability.answer",
                },
                {
                  question: "pricing.faq.invoice.question",
                  answer: "pricing.faq.invoice.answer",
                },
              ].map((faq, index) => (
                <article
                  key={index}
                  className="group bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {intl.formatMessage({ id: faq.question })}
                    </h3>
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {intl.formatMessage({ id: faq.answer })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-8">
              <FormattedMessage id="pricing.ctaTitle" />
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-12 leading-relaxed">
              <FormattedMessage
                id="pricing.ctaDesc"
                values={{
                  strong: (chunks) => <strong>{chunks}</strong>,
                }}
              />
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={() => navigate("/sos-appel")}
                className="group bg-white hover:bg-gray-100 text-red-600 px-12 py-6 rounded-3xl font-black text-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center space-x-4 touch-manipulation"
              >
                <Phone className="w-8 h-8 group-hover:animate-pulse" />
                <span>
                  <FormattedMessage id="pricing.ctaButton" />
                </span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </button>

              <button
                onClick={() => navigate("/register")}
                className="group bg-transparent border-2 border-white hover:bg-white hover:text-red-600 text-white px-12 py-6 rounded-3xl font-bold text-xl transition-all duration-300 hover:scale-105 flex items-center space-x-4 touch-manipulation"
              >
                <User className="w-6 h-6" />
                <span>
                  <FormattedMessage id="pricing.ctaButtonSecondary" />
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Pricing;

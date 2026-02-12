/**
 * Hook: useCountryLandingConfig
 *
 * Fetches country-specific landing config from Firestore.
 * Falls back to region-based defaults if no Firestore doc exists.
 * Simple in-memory cache (5 min) — no React Query dependency needed.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { LandingRole, CountryLandingConfig, ResolvedLandingConfig } from './types';
import { buildDocumentId, getDefaultConfigForCountry } from './defaults';

// Simple in-memory cache: key → { data, timestamp }
const cache = new Map<string, { data: ResolvedLandingConfig; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): ResolvedLandingConfig | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: ResolvedLandingConfig) {
  cache.set(key, { data, ts: Date.now() });
}

interface UseCountryLandingConfigResult {
  config: ResolvedLandingConfig;
  isLoading: boolean;
}

export function useCountryLandingConfig(
  role: LandingRole,
  countryCode: string | null,
  lang: string | null,
): UseCountryLandingConfigResult {
  const defaults = getDefaultConfigForCountry(countryCode);
  const [config, setConfig] = useState<ResolvedLandingConfig>(defaults);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!countryCode || !lang) {
      setConfig(getDefaultConfigForCountry(countryCode));
      return;
    }

    const docId = buildDocumentId(role, countryCode, lang);
    const cached = getCached(docId);
    if (cached) {
      setConfig(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getDoc(doc(db, 'country_landing_configs', docId))
      .then(snap => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as CountryLandingConfig;
          const resolved: ResolvedLandingConfig = {
            paymentMethods: data.paymentMethods?.length ? data.paymentMethods : defaults.paymentMethods,
            currency: data.currency || defaults.currency,
            testimonials: data.testimonials?.length ? data.testimonials : defaults.testimonials,
            seoOverrides: data.seoOverrides || {},
            isActive: data.isActive ?? true,
            countryCode,
            source: 'firestore',
          };
          setCache(docId, resolved);
          setConfig(resolved);
        } else {
          // No Firestore doc → use region defaults
          const fallback = getDefaultConfigForCountry(countryCode);
          setCache(docId, fallback);
          setConfig(fallback);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(getDefaultConfigForCountry(countryCode));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [role, countryCode, lang]);

  return { config, isLoading };
}

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CountryConfig } from '../types/country';
import { useEffect, useState } from 'react';

export function useCountryConfig(countryCode?: string) {
  const [config, setConfig] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      setLoading(true);
      try {
        const defRef = doc(db, 'countryConfigs', 'default');
        const defSnap = await getDoc(defRef);
        const defaultData = defSnap.exists() ? (defSnap.data() as CountryConfig) : {};

        let merged: CountryConfig = { ...defaultData };
        if (countryCode) {
          const cRef = doc(db, 'countryConfigs', countryCode);
          const cSnap = await getDoc(cRef);
          if (cSnap.exists()) {
            const d = cSnap.data() as CountryConfig;
            merged = { ...defaultData, ...d };
            const arrays: (keyof CountryConfig)[] = ['emergency','authorities','embassiesConsulates','associations','faq','procedures'];
            for (const k of arrays) {
              const a = Array.isArray((defaultData as any)[k]) ? (defaultData as any)[k] : [];
              const b = Array.isArray((d as any)[k]) ? (d as any)[k] : [];
              const map = new Map<string, any>();
              for (const item of [...a, ...b]) {
                const key = (item?.name || item?.topic || JSON.stringify(item)).toLowerCase();
                map.set(key, item);
              }
              (merged as any)[k] = Array.from(map.values());
            }
          }
        }
        if (isMounted) setConfig(merged);
      } catch (e:any) {
        if (isMounted) setError(e.message || 'Failed to load country config');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    run();
    return () => { isMounted = false; };
  }, [countryCode]);

  return { config, loading, error };
}

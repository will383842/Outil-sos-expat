// =============================================================================
// Données pays / langues / types de problème — SOS Expats
// Fichier reconstruit proprement pour corriger la compilation TS
// =============================================================================

export interface Country {
  name: string;
  code: string;         // ISO-2
  flag: string;         // emoji
  region: string;
  timezone: string;
  currency: string;
  languages: string[];  // noms en français
  riskLevel: 'low' | 'medium' | 'high';
  consulateContact?: string;
  emergencyNumber?: string;
}

export interface Language {
  name: string;
  code: string;
  nativeName: string;
  isCommon: boolean;
}

export interface ProblemType {
  id: string;
  name: string;
  category: string;
  icon: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  expertType: 'avocat' | 'expert' | 'consultant';
  estimatedDuration: number; // minutes
  requiredDocuments?: string[];
  gptPromptKeywords: string[];
}

// =============================================================================
// PAYS — échantillon propre (ajoutez-en librement si besoin)
// =============================================================================

export const countries: Country[] = [
  // Europe
  { name: 'France', code: 'FR', flag: '🇫🇷', region: 'Europe Occidentale', timezone: 'UTC+1', currency: 'EUR', languages: ['Français'], riskLevel: 'low', consulateContact: 'N/A', emergencyNumber: '112' },
  { name: 'Allemagne', code: 'DE', flag: '🇩🇪', region: 'Europe Occidentale', timezone: 'UTC+1', currency: 'EUR', languages: ['Allemand'], riskLevel: 'low', consulateContact: 'N/A', emergencyNumber: '112' },
  { name: 'Espagne', code: 'ES', flag: '🇪🇸', region: 'Europe Occidentale', timezone: 'UTC+1', currency: 'EUR', languages: ['Espagnol'], riskLevel: 'low', consulateContact: 'N/A', emergencyNumber: '112' },
  { name: 'Italie', code: 'IT', flag: '🇮🇹', region: 'Europe Occidentale', timezone: 'UTC+1', currency: 'EUR', languages: ['Italien'], riskLevel: 'low', consulateContact: 'N/A', emergencyNumber: '112' },

  // Maghreb
  { name: 'Maroc', code: 'MA', flag: '🇲🇦', region: 'Afrique du Nord', timezone: 'UTC+0', currency: 'MAD', languages: ['Arabe', 'Français'], riskLevel: 'medium', consulateContact: '+212 537 689 500', emergencyNumber: '190' },
  { name: 'Algérie', code: 'DZ', flag: '🇩🇿', region: 'Afrique du Nord', timezone: 'UTC+1', currency: 'DZD', languages: ['Arabe', 'Français'], riskLevel: 'high', consulateContact: '+213 21 98 17 17', emergencyNumber: '17' },
  { name: 'Tunisie', code: 'TN', flag: '🇹🇳', region: 'Afrique du Nord', timezone: 'UTC+1', currency: 'TND', languages: ['Arabe', 'Français'], riskLevel: 'medium', consulateContact: '+216 71 105 000', emergencyNumber: '197' },

  // Afrique — ceux mentionnés dans les erreurs
  { name: 'Nigeria', code: 'NG', flag: '🇳🇬', region: 'Afrique de l\'Ouest', timezone: 'UTC+1', currency: 'NGN', languages: ['Anglais'], riskLevel: 'high', consulateContact: '+234 9 461 2400', emergencyNumber: '199' },
  { name: 'Kenya', code: 'KE', flag: '🇰🇪', region: 'Afrique de l\'Est', timezone: 'UTC+3', currency: 'KES', languages: ['Anglais'], riskLevel: 'medium', consulateContact: '+254 20 277 8000', emergencyNumber: '999' },
  { name: 'Ghana', code: 'GH', flag: '🇬🇭', region: 'Afrique de l\'Ouest', timezone: 'UTC+0', currency: 'GHS', languages: ['Anglais'], riskLevel: 'medium', consulateContact: '+233 30 221 4550', emergencyNumber: '191' },
];

// Quelques utilitaires simples
export const getCountryByCode = (code: string): Country | undefined =>
  countries.find(c => c.code === code);

export const searchCountries = (query: string): Country[] => {
  const q = query.toLowerCase();
  return countries.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.region.toLowerCase().includes(q) ||
    c.languages.some(l => l.toLowerCase().includes(q))
  );
};

// =============================================================================
// LANGUES
// =============================================================================

export const localLanguages: Language[] = [
  { name: 'Français', code: 'fr', nativeName: 'Français', isCommon: true },
  { name: 'Anglais', code: 'en', nativeName: 'English', isCommon: true },
  { name: 'Espagnol', code: 'es', nativeName: 'Español', isCommon: true },
  { name: 'Allemand', code: 'de', nativeName: 'Deutsch', isCommon: true },
  { name: 'Arabe', code: 'ar', nativeName: 'العربية', isCommon: true },
];

// =============================================================================
/* TYPES DE PROBLÈMES — échantillon compact */
// =============================================================================

export const problemTypes: ProblemType[] = [
  { id: 'visa-immigration', name: 'Visa et immigration', category: 'Administratif', icon: '📋', urgency: 'high', expertType: 'avocat', estimatedDuration: 45, requiredDocuments: ['passeport', 'formulaire visa'], gptPromptKeywords: ['visa','immigration','séjour'] },
  { id: 'sante', name: 'Problèmes de santé', category: 'Santé', icon: '🏥', urgency: 'high', expertType: 'expert', estimatedDuration: 30, requiredDocuments: ['assurance','ordonnances'], gptPromptKeywords: ['hôpital','médecin'] },
  { id: 'banque', name: 'Banque et paiement', category: 'Pratique', icon: '🏦', urgency: 'medium', expertType: 'consultant', estimatedDuration: 25, gptPromptKeywords: ['banque','virement','carte'] },
];

// Noms pratiques
export const countryNames = countries.map(c => c.name);
export const languageNames = localLanguages.map(l => l.name);
export const problemTypeNames = problemTypes.map(p => p.name);

// Statistiques simples (exemple)
export const getCountryStats = () => {
  const byRegion: Record<string, number> = {};
  const byRiskLevel: Record<'low'|'medium'|'high', number> = { low: 0, medium: 0, high: 0 };

  for (const c of countries) {
    byRegion[c.region] = (byRegion[c.region] || 0) + 1;
    byRiskLevel[c.riskLevel] += 1;
  }

  return {
    totalCountries: countries.length,
    byRegion,
    byRiskLevel,
  };
};

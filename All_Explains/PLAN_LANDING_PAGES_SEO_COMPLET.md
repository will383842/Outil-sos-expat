# PLAN COMPLET D'IMPLEMENTATION DES LANDING PAGES SEO
## SOS EXPAT - 9 Langues x 197 Pays x Toutes Spécialités

**Date de création** : 2026-01-26
**Version** : 1.0.0
**Statut** : A IMPLEMENTER

---

## TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Données de référence](#3-données-de-référence)
4. [Landing Pages AVOCATS](#4-landing-pages-avocats)
5. [Landing Pages EXPATRIES](#5-landing-pages-expatriés)
6. [Landing Pages CLIENTS](#6-landing-pages-clients)
7. [Landing Pages ACQUISITION](#7-landing-pages-acquisition)
8. [Landing Pages PAR PAYS](#8-landing-pages-par-pays)
9. [Système de suivi d'avancement](#9-système-de-suivi-davancement)
10. [SEO & Schema.org](#10-seo--schemaorg)
11. [Traductions requises](#11-traductions-requises)
12. [Planning d'implémentation](#12-planning-dimplémentation)

---

## 1. VUE D'ENSEMBLE

### 1.1 Objectif

Créer un système complet de landing pages SEO pour maximiser le trafic organique et les conversions sur les 4 cibles principales :
- **Avocats** : Recrutement par spécialité juridique
- **Expatriés aidants** : Recrutement par type d'aide
- **Clients** : Acquisition par besoin spécifique
- **Affiliés/Partenaires** : Recrutement d'ambassadeurs

### 1.2 Volume estimé

| Type de landing page | Calcul | Total |
|---------------------|--------|-------|
| Spécialités avocats | 24 catégories × 9 langues | 216 |
| Sous-spécialités avocats | 70 items × 9 langues | 630 |
| Services expatriés | 45 types × 9 langues | 405 |
| Par pays (avocats) | 197 pays × 9 langues | 1,773 |
| Par pays (expatriés) | 197 pays × 9 langues | 1,773 |
| Besoins clients | 50 besoins × 9 langues | 450 |
| Acquisition (affiliés, B2B, blogueurs) | 4 types × 9 langues | 36 |
| **TOTAL PAGES À CRÉER** | | **~5,283** |

### 1.3 Langues supportées

| Code interne | Code URL | Hreflang | Langue | Pays par défaut |
|--------------|----------|----------|---------|-----------------|
| fr | fr | fr | Français | France (fr) |
| en | en | en | English | United States (us) |
| es | es | es | Español | Spain (es) |
| de | de | de | Deutsch | Germany (de) |
| pt | pt | pt | Português | Portugal (pt) |
| ru | ru | ru | Русский | Russia (ru) |
| ch | zh | zh-Hans | 中文 | China (cn) |
| hi | hi | hi | हिन्दी | India (in) |
| ar | ar | ar | العربية | Saudi Arabia (sa) |

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Structure des fichiers

```
sos/src/
├── pages/
│   └── landing/
│       ├── lawyers/
│       │   ├── LandingLawyerSpecialty.tsx      # Par spécialité (catégorie)
│       │   ├── LandingLawyerSubSpecialty.tsx   # Par sous-spécialité
│       │   └── LandingLawyerCountry.tsx        # Par pays
│       ├── expats/
│       │   ├── LandingExpatService.tsx         # Par type d'aide
│       │   └── LandingExpatCountry.tsx         # Par pays
│       ├── clients/
│       │   ├── LandingClientNeed.tsx           # Par besoin
│       │   └── LandingClientUrgent.tsx         # Urgences
│       └── acquisition/
│           ├── LandingAffiliateProgram.tsx     # Programme affiliation
│           ├── LandingBusiness.tsx             # B2B
│           ├── LandingBloggers.tsx             # Blogueurs
│           └── LandingPartners.tsx             # Partenaires
├── data/
│   ├── landing-pages/
│   │   ├── lawyer-specialty-slugs.ts           # Slugs traduits
│   │   ├── expat-service-slugs.ts              # Slugs traduits
│   │   ├── client-need-slugs.ts                # Slugs traduits
│   │   └── country-slugs.ts                    # Slugs traduits
│   └── seo/
│       ├── landing-seo-templates.ts            # Templates SEO
│       └── landing-schema-templates.ts         # Templates Schema.org
├── components/
│   └── landing/
│       ├── LandingHero.tsx
│       ├── LandingBenefits.tsx
│       ├── LandingTestimonials.tsx
│       ├── LandingFAQ.tsx
│       ├── LandingCTA.tsx
│       └── LandingProvidersList.tsx
└── hooks/
    └── useLandingPageData.ts                   # Hook pour données landing
```

### 2.2 Collection Firestore pour suivi

```typescript
// Collection: landing_pages_tracking
interface LandingPageTracking {
  id: string;                     // Auto-generated
  type: 'lawyer_specialty' | 'lawyer_subspecialty' | 'lawyer_country'
      | 'expat_service' | 'expat_country' | 'client_need'
      | 'affiliate' | 'business' | 'bloggers' | 'partners';
  code: string;                   // Ex: "IMMI", "FR", "INSTALLATION"
  slug: {
    fr: string;
    en: string;
    es: string;
    de: string;
    pt: string;
    ru: string;
    zh: string;
    ar: string;
    hi: string;
  };
  status: {
    fr: 'pending' | 'draft' | 'review' | 'published';
    en: 'pending' | 'draft' | 'review' | 'published';
    es: 'pending' | 'draft' | 'review' | 'published';
    de: 'pending' | 'draft' | 'review' | 'published';
    pt: 'pending' | 'draft' | 'review' | 'published';
    ru: 'pending' | 'draft' | 'review' | 'published';
    zh: 'pending' | 'draft' | 'review' | 'published';
    ar: 'pending' | 'draft' | 'review' | 'published';
    hi: 'pending' | 'draft' | 'review' | 'published';
  };
  content: {
    fr?: LandingPageContent;
    en?: LandingPageContent;
    es?: LandingPageContent;
    de?: LandingPageContent;
    pt?: LandingPageContent;
    ru?: LandingPageContent;
    zh?: LandingPageContent;
    ar?: LandingPageContent;
    hi?: LandingPageContent;
  };
  seo: {
    fr?: LandingPageSEO;
    en?: LandingPageSEO;
    // ... autres langues
  };
  stats: {
    views: number;
    conversions: number;
    lastUpdated: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface LandingPageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  benefits: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
  testimonials: string[];           // IDs des témoignages
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
}

interface LandingPageSEO {
  title: string;                    // Max 60 chars
  description: string;              // Max 160 chars
  keywords: string[];
  ogImage: string;
  canonicalUrl: string;
  schema: object;                   // JSON-LD schema
}
```

### 2.3 Routes à ajouter

```typescript
// Dans localeRoutes.ts - NOUVELLES ROUTES

// === LANDING PAGES AVOCATS ===
"lawyer-specialty": {
  fr: "avocat/specialite",
  en: "lawyers/specialty",
  es: "abogados/especialidad",
  de: "anwaelte/fachgebiet",
  pt: "advogados/especialidade",
  ru: "advokaty/spetsializatsiya",
  zh: "lushi/zhuanye",
  ar: "محامون/تخصص",
  hi: "vakil/visheshagyata"
},
"lawyer-country": {
  fr: "avocat/pays",
  en: "lawyers/country",
  es: "abogados/pais",
  de: "anwaelte/land",
  pt: "advogados/pais",
  ru: "advokaty/strana",
  zh: "lushi/guojia",
  ar: "محامون/بلد",
  hi: "vakil/desh"
},

// === LANDING PAGES EXPATRIES ===
"expat-service": {
  fr: "expatrie/service",
  en: "expats/service",
  es: "expatriados/servicio",
  de: "expatriates/service",
  pt: "expatriados/servico",
  ru: "expatrianty/usluga",
  zh: "waipai/fuwu",
  ar: "مغتربون/خدمة",
  hi: "pravasi/seva"
},
"expat-country": {
  fr: "expatrie/pays",
  en: "expats/country",
  es: "expatriados/pais",
  de: "expatriates/land",
  pt: "expatriados/pais",
  ru: "expatrianty/strana",
  zh: "waipai/guojia",
  ar: "مغتربون/بلد",
  hi: "pravasi/desh"
},

// === LANDING PAGES CLIENTS ===
"client-need": {
  fr: "besoin",
  en: "need",
  es: "necesidad",
  de: "bedarf",
  pt: "necessidade",
  ru: "potrebnost",
  zh: "xuqiu",
  ar: "حاجة",
  hi: "zaroorat"
},
"emergency": {
  fr: "urgence",
  en: "emergency",
  es: "emergencia",
  de: "notfall",
  pt: "emergencia",
  ru: "ekstrennaya",
  zh: "jinji",
  ar: "طوارئ",
  hi: "aapatkaalin"
},

// === LANDING PAGES ACQUISITION ===
"affiliate-program": {
  fr: "programme-affiliation",
  en: "affiliate-program",
  es: "programa-afiliados",
  de: "partnerprogramm",
  pt: "programa-afiliados",
  ru: "partnerskaya-programma",
  zh: "lianmeng-jihua",
  ar: "برنامج-الإحالة",
  hi: "sahbhagi-karyakram"
},
"business": {
  fr: "entreprises",
  en: "business",
  es: "empresas",
  de: "unternehmen",
  pt: "empresas",
  ru: "biznes",
  zh: "qiye",
  ar: "الشركات",
  hi: "vyavsay"
},
"bloggers-partners": {
  fr: "blogueurs-partenaires",
  en: "blogger-partners",
  es: "bloggers-socios",
  de: "blogger-partner",
  pt: "blogueiros-parceiros",
  ru: "blogery-partnery",
  zh: "boke-hezuo",
  ar: "المدونين-الشركاء",
  hi: "blogger-sathi"
},
```

---

## 3. DONNÉES DE RÉFÉRENCE

### 3.1 SPECIALITES AVOCATS (24 catégories, 70+ sous-spécialités)

```typescript
// Source: sos/src/data/lawyer-specialties.ts

export const LAWYER_CATEGORIES = [
  {
    code: "URG",
    slugs: { fr: "urgences", en: "emergencies", es: "emergencias", de: "notfalle", pt: "emergencias", ru: "srochnye", zh: "jinji", ar: "طوارئ", hi: "aapatkaal" },
    items: [
      { code: "URG_ASSISTANCE_PENALE_INTERNATIONALE", slugs: { fr: "assistance-penale-internationale", en: "international-criminal-assistance", ... } },
      { code: "URG_ACCIDENTS_RESPONSABILITE_CIVILE", slugs: { fr: "accidents-responsabilite-civile", en: "accidents-civil-liability", ... } },
      { code: "URG_RAPATRIEMENT_URGENCE", slugs: { fr: "rapatriement-urgence", en: "emergency-repatriation", ... } }
    ]
  },
  {
    code: "CUR",
    slugs: { fr: "services-courants", en: "current-services", ... },
    items: [
      { code: "CUR_TRADUCTIONS_LEGALISATIONS", slugs: { fr: "traductions-legalisations", en: "translations-legalizations", ... } },
      { code: "CUR_RECLAMATIONS_LITIGES_MINEURS", slugs: { fr: "reclamations-litiges-mineurs", en: "claims-minor-disputes", ... } },
      { code: "CUR_DEMARCHES_ADMINISTRATIVES", slugs: { fr: "demarches-administratives", en: "administrative-procedures", ... } }
    ]
  },
  {
    code: "IMMI",
    slugs: { fr: "immigration-travail", en: "immigration-work", ... },
    items: [
      { code: "IMMI_VISAS_PERMIS_SEJOUR", slugs: { fr: "visas-permis-sejour", en: "visas-residence-permits", ... } },
      { code: "IMMI_CONTRATS_TRAVAIL_INTERNATIONAL", slugs: { fr: "contrats-travail-international", en: "international-employment-contracts", ... } },
      { code: "IMMI_NATURALISATION", slugs: { fr: "naturalisation", en: "naturalization", ... } },
      { code: "IMMI_VISA_ETUDIANT", slugs: { fr: "visa-etudiant", en: "student-visa", ... } },
      { code: "IMMI_VISA_INVESTISSEUR", slugs: { fr: "visa-investisseur-golden-visa", en: "investor-visa-golden-visa", ... } },
      { code: "IMMI_VISA_RETRAITE", slugs: { fr: "visa-retraite", en: "retirement-visa", ... } },
      { code: "IMMI_VISA_NOMADE_DIGITAL", slugs: { fr: "visa-nomade-digital", en: "digital-nomad-visa", ... } },
      { code: "IMMI_REGROUPEMENT_FAMILIAL", slugs: { fr: "regroupement-familial", en: "family-reunification", ... } }
    ]
  },
  {
    code: "TRAV",
    slugs: { fr: "droit-travail-international", en: "international-labor-law", ... },
    items: [
      { code: "TRAV_DROITS_TRAVAILLEURS", slugs: { fr: "droits-travailleurs-expatries", en: "expat-workers-rights", ... } },
      { code: "TRAV_LICENCIEMENT_INTERNATIONAL", slugs: { fr: "licenciement-international", en: "international-dismissal", ... } },
      { code: "TRAV_SECURITE_SOCIALE_INTERNATIONALE", slugs: { fr: "securite-sociale-internationale", en: "international-social-security", ... } },
      { code: "TRAV_RETRAITE_INTERNATIONALE", slugs: { fr: "retraite-internationale", en: "international-retirement", ... } },
      { code: "TRAV_DETACHEMENT_EXPATRIATION", slugs: { fr: "detachement-expatriation", en: "secondment-expatriation", ... } },
      { code: "TRAV_DISCRIMINATION_TRAVAIL", slugs: { fr: "discrimination-travail", en: "workplace-discrimination", ... } }
    ]
  },
  {
    code: "IMMO",
    slugs: { fr: "immobilier", en: "real-estate", ... },
    items: [
      { code: "IMMO_ACHAT_VENTE", slugs: { fr: "achat-vente-etranger", en: "purchase-sale-abroad", ... } },
      { code: "IMMO_LOCATION_BAUX", slugs: { fr: "location-baux", en: "rental-leases", ... } },
      { code: "IMMO_LITIGES_IMMOBILIERS", slugs: { fr: "litiges-immobiliers", en: "real-estate-disputes", ... } }
    ]
  },
  {
    code: "FISC",
    slugs: { fr: "fiscalite", en: "taxation", ... },
    items: [
      { code: "FISC_DECLARATIONS_INTERNATIONALES", slugs: { fr: "declarations-fiscales-internationales", en: "international-tax-returns", ... } },
      { code: "FISC_DOUBLE_IMPOSITION", slugs: { fr: "double-imposition", en: "double-taxation", ... } },
      { code: "FISC_OPTIMISATION_EXPATRIES", slugs: { fr: "optimisation-fiscale-expatries", en: "expat-tax-optimization", ... } }
    ]
  },
  {
    code: "FAM",
    slugs: { fr: "famille", en: "family", ... },
    items: [
      { code: "FAM_MARIAGE_DIVORCE", slugs: { fr: "mariage-divorce-international", en: "international-marriage-divorce", ... } },
      { code: "FAM_GARDE_ENFANTS_TRANSFRONTALIERE", slugs: { fr: "garde-enfants-transfrontaliere", en: "cross-border-child-custody", ... } },
      { code: "FAM_SCOLARITE_INTERNATIONALE", slugs: { fr: "scolarite-internationale", en: "international-schooling", ... } }
    ]
  },
  {
    code: "PATR",
    slugs: { fr: "patrimoine", en: "wealth-management", ... },
    items: [
      { code: "PATR_SUCCESSIONS_INTERNATIONALES", slugs: { fr: "successions-internationales", en: "international-inheritance", ... } },
      { code: "PATR_GESTION_PATRIMOINE", slugs: { fr: "gestion-patrimoine", en: "wealth-management", ... } },
      { code: "PATR_TESTAMENTS", slugs: { fr: "testaments", en: "wills", ... } }
    ]
  },
  {
    code: "ENTR",
    slugs: { fr: "entreprise", en: "business", ... },
    items: [
      { code: "ENTR_CREATION_ENTREPRISE_ETRANGER", slugs: { fr: "creation-entreprise-etranger", en: "business-creation-abroad", ... } },
      { code: "ENTR_INVESTISSEMENTS", slugs: { fr: "investissements", en: "investments", ... } },
      { code: "ENTR_IMPORT_EXPORT", slugs: { fr: "import-export", en: "import-export", ... } }
    ]
  },
  {
    code: "ASSU",
    slugs: { fr: "assurances-protection", en: "insurance-protection", ... },
    items: [
      { code: "ASSU_ASSURANCES_INTERNATIONALES", slugs: { fr: "assurances-internationales", en: "international-insurance", ... } },
      { code: "ASSU_PROTECTION_DONNEES", slugs: { fr: "protection-donnees", en: "data-protection", ... } },
      { code: "ASSU_CONTENTIEUX_ADMINISTRATIFS", slugs: { fr: "contentieux-administratifs", en: "administrative-litigation", ... } }
    ]
  },
  {
    code: "CONS",
    slugs: { fr: "consommation-services", en: "consumer-services", ... },
    items: [
      { code: "CONS_ACHATS_DEFECTUEUX_ETRANGER", slugs: { fr: "achats-defectueux-etranger", en: "defective-purchases-abroad", ... } },
      { code: "CONS_SERVICES_NON_CONFORMES", slugs: { fr: "services-non-conformes", en: "non-compliant-services", ... } },
      { code: "CONS_ECOMMERCE_INTERNATIONAL", slugs: { fr: "ecommerce-international", en: "international-ecommerce", ... } }
    ]
  },
  {
    code: "BANK",
    slugs: { fr: "banque-finance", en: "banking-finance", ... },
    items: [
      { code: "BANK_PROBLEMES_COMPTES_BANCAIRES", slugs: { fr: "problemes-comptes-bancaires", en: "bank-account-issues", ... } },
      { code: "BANK_VIREMENTS_CREDITS", slugs: { fr: "virements-credits", en: "transfers-credits", ... } },
      { code: "BANK_SERVICES_FINANCIERS", slugs: { fr: "services-financiers", en: "financial-services", ... } }
    ]
  },
  {
    code: "ARGT",
    slugs: { fr: "problemes-argent", en: "money-problems", ... },
    items: [
      { code: "ARGT_RETARDS_SALAIRE_IMPAYES", slugs: { fr: "retards-salaire-impayes", en: "salary-delays-unpaid-wages", ... } },
      { code: "ARGT_ARNAQUES_ESCROQUERIES", slugs: { fr: "arnaques-escroqueries", en: "scams-fraud", ... } },
      { code: "ARGT_SURENDETTEMENT_PLANS", slugs: { fr: "surendettement-plans-remboursement", en: "over-indebtedness-repayment-plans", ... } },
      { code: "ARGT_FRAIS_BANCAIRES_ABUSIFS", slugs: { fr: "frais-bancaires-abusifs", en: "excessive-bank-fees", ... } },
      { code: "ARGT_LITIGES_ETABLISSEMENTS_CREDIT", slugs: { fr: "litiges-etablissements-credit", en: "disputes-credit-institutions", ... } }
    ]
  },
  {
    code: "RELA",
    slugs: { fr: "problemes-relationnels", en: "relationship-problems", ... },
    items: [
      { code: "RELA_CONFLITS_VOISINAGE", slugs: { fr: "conflits-voisinage", en: "neighborhood-disputes", ... } },
      { code: "RELA_CONFLITS_TRAVAIL", slugs: { fr: "conflits-travail", en: "workplace-conflicts", ... } },
      { code: "RELA_CONFLITS_FAMILIAUX", slugs: { fr: "conflits-familiaux", en: "family-conflicts", ... } },
      { code: "RELA_MEDIATION_RESOLUTION_AMIABLE", slugs: { fr: "mediation-resolution-amiable", en: "mediation-amicable-resolution", ... } },
      { code: "RELA_DIFFAMATION_REPUTATION", slugs: { fr: "diffamation-reputation", en: "defamation-reputation-damage", ... } }
    ]
  },
  {
    code: "TRAN",
    slugs: { fr: "transport", en: "transport", ... },
    items: [
      { code: "TRAN_PROBLEMES_AERIENS", slugs: { fr: "problemes-aeriens", en: "flight-problems", ... } },
      { code: "TRAN_BAGAGES_PERDUS_ENDOMMAGES", slugs: { fr: "bagages-perdus-endommages", en: "lost-damaged-luggage", ... } },
      { code: "TRAN_ACCIDENTS_TRANSPORT", slugs: { fr: "accidents-transport", en: "transport-accidents", ... } }
    ]
  },
  {
    code: "SANT",
    slugs: { fr: "sante", en: "health", ... },
    items: [
      { code: "SANT_ERREURS_MEDICALES", slugs: { fr: "erreurs-medicales", en: "medical-errors", ... } },
      { code: "SANT_REMBOURSEMENTS_SOINS", slugs: { fr: "remboursements-soins", en: "healthcare-reimbursements", ... } },
      { code: "SANT_DROIT_MEDICAL", slugs: { fr: "droit-medical", en: "medical-law", ... } }
    ]
  },
  {
    code: "NUM",
    slugs: { fr: "numerique", en: "digital", ... },
    items: [
      { code: "NUM_CYBERCRIMINALITE", slugs: { fr: "cybercriminalite", en: "cybercrime", ... } },
      { code: "NUM_CONTRATS_EN_LIGNE", slugs: { fr: "contrats-en-ligne", en: "online-contracts", ... } },
      { code: "NUM_PROTECTION_NUMERIQUE", slugs: { fr: "protection-numerique", en: "digital-protection", ... } }
    ]
  },
  {
    code: "VIO",
    slugs: { fr: "violences-discriminations", en: "violence-discrimination", ... },
    items: [
      { code: "VIO_HARCELEMENT", slugs: { fr: "harcelement", en: "harassment", ... } },
      { code: "VIO_VIOLENCES_DOMESTIQUES", slugs: { fr: "violences-domestiques", en: "domestic-violence", ... } },
      { code: "VIO_DISCRIMINATIONS", slugs: { fr: "discriminations", en: "discrimination", ... } }
    ]
  },
  {
    code: "IP",
    slugs: { fr: "propriete-intellectuelle", en: "intellectual-property", ... },
    items: [
      { code: "IP_CONTREFACONS", slugs: { fr: "contrefacons", en: "counterfeiting", ... } },
      { code: "IP_BREVETS_MARQUES", slugs: { fr: "brevets-marques", en: "patents-trademarks", ... } },
      { code: "IP_DROITS_AUTEUR", slugs: { fr: "droits-auteur", en: "copyrights", ... } }
    ]
  },
  {
    code: "ENV",
    slugs: { fr: "environnement", en: "environment", ... },
    items: [
      { code: "ENV_NUISANCES", slugs: { fr: "nuisances", en: "nuisances", ... } },
      { code: "ENV_PERMIS_CONSTRUIRE", slugs: { fr: "permis-construire", en: "building-permits", ... } },
      { code: "ENV_DROIT_URBANISME", slugs: { fr: "droit-urbanisme", en: "urban-planning-law", ... } }
    ]
  },
  {
    code: "COMP",
    slugs: { fr: "droit-compare-international", en: "international-comparative-law", ... },
    items: [
      { code: "COMP_DROIT_ISLAMIQUE", slugs: { fr: "droit-islamique-charia", en: "islamic-law-sharia", ... } },
      { code: "COMP_COMMON_LAW", slugs: { fr: "common-law", en: "common-law", ... } },
      { code: "COMP_DROIT_ASIATIQUE", slugs: { fr: "droit-asiatique", en: "asian-law", ... } },
      { code: "COMP_DROIT_AFRICAIN", slugs: { fr: "droit-africain", en: "african-law", ... } },
      { code: "COMP_DROIT_LATINO", slugs: { fr: "droit-latino-americain", en: "latin-american-law", ... } },
      { code: "COMP_RECONNAISSANCE_JUGEMENTS", slugs: { fr: "reconnaissance-jugements-etrangers", en: "recognition-foreign-judgments", ... } }
    ]
  },
  {
    code: "EDUC",
    slugs: { fr: "education-reconnaissance", en: "education-recognition", ... },
    items: [
      { code: "EDUC_RECONNAISSANCE_DIPLOMES", slugs: { fr: "reconnaissance-diplomes-etrangers", en: "recognition-foreign-diplomas", ... } },
      { code: "EDUC_EQUIVALENCES", slugs: { fr: "equivalences-academiques", en: "academic-equivalences", ... } },
      { code: "EDUC_QUALIFICATIONS_PROFESSIONNELLES", slugs: { fr: "qualifications-professionnelles", en: "professional-qualifications", ... } }
    ]
  },
  {
    code: "RET",
    slugs: { fr: "retour-pays-origine", en: "return-home-country", ... },
    items: [
      { code: "RET_RAPATRIEMENT_BIENS", slugs: { fr: "rapatriement-biens", en: "repatriation-goods", ... } },
      { code: "RET_REINTEGRATION_FISCALE_SOCIALE", slugs: { fr: "reintegration-fiscale-sociale", en: "fiscal-social-reintegration", ... } },
      { code: "RET_TRANSFERT_PATRIMOINE", slugs: { fr: "transfert-patrimoine", en: "asset-transfer", ... } },
      { code: "RET_CLOTURE_COMPTES", slugs: { fr: "cloture-comptes-contrats", en: "account-contract-closure", ... } }
    ]
  },
  {
    code: "OTH",
    slugs: { fr: "autre", en: "other", ... },
    items: [
      { code: "OTH_PRECISER_BESOIN", slugs: { fr: "autre-besoin", en: "other-need", ... } }
    ]
  }
];
```

### 3.2 SERVICES EXPATRIES (45 types d'aide)

```typescript
// Source: sos/src/data/expat-help-types.ts

export const EXPAT_SERVICES = [
  // === INSTALLATION DE BASE ===
  { code: "INSTALLATION", slugs: { fr: "installation", en: "settling-in", es: "instalarse", de: "niederlassen", pt: "instalar-se", ru: "obustrojstvo", zh: "dingju", ar: "استقرار", hi: "basna" } },
  { code: "DEMARCHES_ADMINISTRATIVES", slugs: { fr: "demarches-administratives", en: "administrative-procedures", ... } },
  { code: "RECHERCHE_LOGEMENT", slugs: { fr: "recherche-logement", en: "housing-search", ... } },
  { code: "OUVERTURE_COMPTE_BANCAIRE", slugs: { fr: "ouverture-compte-bancaire", en: "bank-account-opening", ... } },
  { code: "SYSTEME_SANTE", slugs: { fr: "systeme-sante", en: "healthcare-system", ... } },
  { code: "EDUCATION_ECOLES", slugs: { fr: "education-ecoles", en: "education-schools", ... } },
  { code: "TRANSPORT", slugs: { fr: "transport", en: "transportation", ... } },

  // === TRAVAIL & ENTREPRISE ===
  { code: "RECHERCHE_EMPLOI", slugs: { fr: "recherche-emploi", en: "job-search", ... } },
  { code: "CREATION_ENTREPRISE", slugs: { fr: "creation-entreprise", en: "business-creation", ... } },
  { code: "FISCALITE_LOCALE", slugs: { fr: "fiscalite-locale", en: "local-taxation", ... } },

  // === VIE QUOTIDIENNE ===
  { code: "CULTURE_INTEGRATION", slugs: { fr: "culture-integration", en: "culture-integration", ... } },
  { code: "VISA_IMMIGRATION", slugs: { fr: "visa-immigration", en: "visa-immigration", ... } },
  { code: "ASSURANCES", slugs: { fr: "assurances", en: "insurance", ... } },
  { code: "TELEPHONE_INTERNET", slugs: { fr: "telephone-internet", en: "phone-internet", ... } },
  { code: "ALIMENTATION_COURSES", slugs: { fr: "alimentation-courses", en: "food-shopping", ... } },
  { code: "LOISIRS_SORTIES", slugs: { fr: "loisirs-sorties", en: "leisure-outings", ... } },
  { code: "SPORTS_ACTIVITES", slugs: { fr: "sports-activites", en: "sports-activities", ... } },

  // === URGENCES & PROBLEMES ===
  { code: "SECURITE", slugs: { fr: "securite", en: "security", ... } },
  { code: "URGENCES", slugs: { fr: "urgences", en: "emergencies", ... } },
  { code: "PROBLEMES_ARGENT", slugs: { fr: "problemes-argent", en: "money-problems", ... } },
  { code: "PROBLEMES_RELATIONNELS", slugs: { fr: "problemes-relationnels", en: "relationship-problems", ... } },
  { code: "PROBLEMES_DIVERS", slugs: { fr: "problemes-divers", en: "various-problems", ... } },
  { code: "PARTIR_OU_RENTRER", slugs: { fr: "partir-ou-rentrer", en: "leaving-returning", ... } },

  // === VOYAGEURS & TOURISTES ===
  { code: "ARNAQUE_VOL", slugs: { fr: "arnaque-vol", en: "scam-theft", ... } },
  { code: "PERTE_DOCUMENTS", slugs: { fr: "perte-documents", en: "lost-documents", ... } },
  { code: "ASSISTANCE_CONSULAIRE", slugs: { fr: "assistance-consulaire", en: "consular-assistance", ... } },
  { code: "HEBERGEMENT_URGENCE", slugs: { fr: "hebergement-urgence", en: "emergency-accommodation", ... } },
  { code: "TRADUCTION_INTERPRETATION", slugs: { fr: "traduction-interpretation", en: "translation-interpretation", ... } },
  { code: "PROBLEMES_VOYAGE", slugs: { fr: "problemes-voyage", en: "travel-problems", ... } },

  // === NOMADES DIGITAUX ===
  { code: "TRAVAIL_DISTANCE", slugs: { fr: "travail-distance-freelance", en: "remote-work-freelance", ... } },
  { code: "COWORKING_COLIVING", slugs: { fr: "coworking-coliving", en: "coworking-coliving", ... } },
  { code: "FISCALITE_NOMADE", slugs: { fr: "fiscalite-nomade-digital", en: "digital-nomad-taxation", ... } },

  // === ETUDIANTS ===
  { code: "ETUDES_INTERNATIONALES", slugs: { fr: "etudes-etranger", en: "studying-abroad", ... } },
  { code: "LOGEMENT_ETUDIANT", slugs: { fr: "logement-etudiant", en: "student-housing", ... } },
  { code: "BOURSE_FINANCEMENT", slugs: { fr: "bourses-financement", en: "scholarships-funding", ... } },
  { code: "STAGE_INTERNATIONAL", slugs: { fr: "stage-international", en: "international-internship", ... } },

  // === RETRAITES ===
  { code: "RETRAITE_ETRANGER", slugs: { fr: "retraite-etranger", en: "retirement-abroad", ... } },
  { code: "SANTE_SENIORS", slugs: { fr: "sante-seniors", en: "senior-health", ... } },
  { code: "PENSION_INTERNATIONALE", slugs: { fr: "pension-internationale", en: "international-pension", ... } },

  // === FAMILLES ===
  { code: "SCOLARITE_ENFANTS", slugs: { fr: "scolarite-enfants", en: "children-schooling", ... } },
  { code: "GARDE_ENFANTS", slugs: { fr: "garde-enfants", en: "childcare", ... } },
  { code: "ACTIVITES_ENFANTS", slugs: { fr: "activites-enfants", en: "children-activities", ... } },

  // === SERVICES SPECIALISES ===
  { code: "DEMENAGEMENT_INTERNATIONAL", slugs: { fr: "demenagement-international", en: "international-moving", ... } },
  { code: "ANIMAUX_COMPAGNIE", slugs: { fr: "animaux-compagnie", en: "pets", ... } },
  { code: "PERMIS_CONDUIRE", slugs: { fr: "permis-conduire", en: "drivers-license", ... } },
  { code: "COMMUNAUTE_EXPATRIES", slugs: { fr: "communaute-expatries", en: "expat-community", ... } },
  { code: "SOUTIEN_PSYCHOLOGIQUE", slugs: { fr: "soutien-psychologique", en: "psychological-support", ... } },
  { code: "AUTRE_PRECISER", slugs: { fr: "autre", en: "other", ... } }
];
```

### 3.3 LISTE DES 197 PAYS

```typescript
// Source: sos/src/multilingual-system/config/countries.json

export const COUNTRIES = [
  // TOP PRIORITY (Tier 1)
  { code: "gb", priority: 1, slugs: { fr: "royaume-uni", en: "united-kingdom", es: "reino-unido", de: "vereinigtes-koenigreich", pt: "reino-unido", ru: "velikobritaniya", zh: "yingguo", ar: "المملكة-المتحدة", hi: "britain" } },
  { code: "fr", priority: 1, slugs: { fr: "france", en: "france", es: "francia", de: "frankreich", pt: "franca", ru: "frantsiya", zh: "faguo", ar: "فرنسا", hi: "france" } },
  { code: "de", priority: 1, slugs: { fr: "allemagne", en: "germany", es: "alemania", de: "deutschland", pt: "alemanha", ru: "germaniya", zh: "deguo", ar: "ألمانيا", hi: "germany" } },
  { code: "es", priority: 1, slugs: { fr: "espagne", en: "spain", es: "espana", de: "spanien", pt: "espanha", ru: "ispaniya", zh: "xibanya", ar: "إسبانيا", hi: "spain" } },
  { code: "us", priority: 1, slugs: { fr: "etats-unis", en: "united-states", es: "estados-unidos", de: "vereinigte-staaten", pt: "estados-unidos", ru: "ssha", zh: "meiguo", ar: "الولايات-المتحدة", hi: "america" } },
  { code: "ca", priority: 1, slugs: { fr: "canada", en: "canada", es: "canada", de: "kanada", pt: "canada", ru: "kanada", zh: "jianada", ar: "كندا", hi: "canada" } },
  { code: "au", priority: 1, slugs: { fr: "australie", en: "australia", es: "australia", de: "australien", pt: "australia", ru: "avstraliya", zh: "aodaliya", ar: "أستراليا", hi: "australia" } },
  { code: "ae", priority: 1, slugs: { fr: "emirats-arabes-unis", en: "united-arab-emirates", es: "emiratos-arabes-unidos", de: "vereinigte-arabische-emirate", pt: "emirados-arabes-unidos", ru: "oae", zh: "alianqiu", ar: "الإمارات", hi: "uae" } },
  { code: "sg", priority: 1, slugs: { fr: "singapour", en: "singapore", es: "singapur", de: "singapur", pt: "singapura", ru: "singapur", zh: "xinjiapo", ar: "سنغافورة", hi: "singapore" } },
  { code: "ch", priority: 1, slugs: { fr: "suisse", en: "switzerland", es: "suiza", de: "schweiz", pt: "suica", ru: "shveytsariya", zh: "ruishi", ar: "سويسرا", hi: "switzerland" } },

  // HIGH PRIORITY (Tier 2) - 20 pays
  { code: "it", priority: 2, slugs: { fr: "italie", en: "italy", ... } },
  { code: "nl", priority: 2, slugs: { fr: "pays-bas", en: "netherlands", ... } },
  { code: "be", priority: 2, slugs: { fr: "belgique", en: "belgium", ... } },
  { code: "pt", priority: 2, slugs: { fr: "portugal", en: "portugal", ... } },
  { code: "jp", priority: 2, slugs: { fr: "japon", en: "japan", ... } },
  { code: "kr", priority: 2, slugs: { fr: "coree-du-sud", en: "south-korea", ... } },
  { code: "cn", priority: 2, slugs: { fr: "chine", en: "china", ... } },
  { code: "in", priority: 2, slugs: { fr: "inde", en: "india", ... } },
  { code: "br", priority: 2, slugs: { fr: "bresil", en: "brazil", ... } },
  { code: "mx", priority: 2, slugs: { fr: "mexique", en: "mexico", ... } },
  { code: "th", priority: 2, slugs: { fr: "thailande", en: "thailand", ... } },
  { code: "my", priority: 2, slugs: { fr: "malaisie", en: "malaysia", ... } },
  { code: "id", priority: 2, slugs: { fr: "indonesie", en: "indonesia", ... } },
  { code: "ph", priority: 2, slugs: { fr: "philippines", en: "philippines", ... } },
  { code: "vn", priority: 2, slugs: { fr: "vietnam", en: "vietnam", ... } },
  { code: "za", priority: 2, slugs: { fr: "afrique-du-sud", en: "south-africa", ... } },
  { code: "ma", priority: 2, slugs: { fr: "maroc", en: "morocco", ... } },
  { code: "eg", priority: 2, slugs: { fr: "egypte", en: "egypt", ... } },
  { code: "sa", priority: 2, slugs: { fr: "arabie-saoudite", en: "saudi-arabia", ... } },
  { code: "qa", priority: 2, slugs: { fr: "qatar", en: "qatar", ... } },

  // STANDARD (Tier 3) - 167 autres pays...
  // (Liste complète dans countries.json)
];
```

---

## 4. LANDING PAGES AVOCATS

### 4.1 Format des URLs

```
# Par catégorie de spécialité
/{locale}/avocat/specialite/{category-slug}
Exemple: /fr-fr/avocat/specialite/immigration-travail
Exemple: /en-us/lawyers/specialty/immigration-work

# Par sous-spécialité
/{locale}/avocat/specialite/{category-slug}/{subspecialty-slug}
Exemple: /fr-fr/avocat/specialite/immigration-travail/visa-etudiant
Exemple: /en-us/lawyers/specialty/immigration-work/student-visa

# Par pays
/{locale}/avocat/pays/{country-slug}
Exemple: /fr-fr/avocat/pays/emirats-arabes-unis
Exemple: /en-us/lawyers/country/united-arab-emirates

# Combinaison spécialité + pays
/{locale}/avocat/specialite/{category-slug}/pays/{country-slug}
Exemple: /fr-fr/avocat/specialite/immigration-travail/pays/emirats-arabes-unis
Exemple: /en-us/lawyers/specialty/immigration-work/country/united-arab-emirates
```

### 4.2 Contenu type d'une landing page avocat

```typescript
interface LawyerLandingContent {
  // HERO
  heroTitle: string;          // "Trouvez un avocat en {spécialité} en 5 minutes"
  heroSubtitle: string;       // "Consultez un avocat spécialisé par téléphone, 24/7, dans 197 pays"
  heroDescription: string;
  heroCTA: string;            // "Trouver mon avocat"
  heroImage: string;

  // STATS
  stats: {
    lawyersCount: number;     // Nombre d'avocats dans cette spécialité
    countriesCount: number;   // Nombre de pays couverts
    avgResponseTime: string;  // "< 5 min"
    satisfactionRate: string; // "98%"
  };

  // BENEFITS
  benefits: Array<{
    icon: 'clock' | 'globe' | 'shield' | 'star' | 'phone';
    title: string;
    description: string;
  }>;

  // HOW IT WORKS
  howItWorks: Array<{
    step: number;
    title: string;
    description: string;
    icon: string;
  }>;

  // USE CASES (pour cette spécialité)
  useCases: Array<{
    title: string;
    description: string;
    example: string;
  }>;

  // FAQ (5-10 questions spécifiques)
  faq: Array<{
    question: string;
    answer: string;
  }>;

  // TESTIMONIALS (filtrés par spécialité)
  testimonialIds: string[];

  // PROVIDERS LIST (avocats disponibles)
  showProvidersList: boolean;
  providersFilter: {
    type: 'lawyer';
    specialties: string[];
    countries?: string[];
    minRating?: number;
  };

  // CTA FINAL
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonPrimary: string;
  ctaButtonSecondary: string;

  // RELATED PAGES
  relatedSpecialties: string[];  // Codes des spécialités liées
  relatedCountries: string[];    // Codes des pays liés
}
```

### 4.3 Tableau de suivi - Spécialités Avocats

| Code | Catégorie | FR | EN | ES | DE | PT | RU | ZH | AR | HI |
|------|-----------|----|----|----|----|----|----|----|----|-----|
| URG | Urgences | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CUR | Services courants | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| IMMI | Immigration | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TRAV | Droit du travail | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| IMMO | Immobilier | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FISC | Fiscalité | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FAM | Famille | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PATR | Patrimoine | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ENTR | Entreprise | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ASSU | Assurances | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CONS | Consommation | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| BANK | Banque | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ARGT | Argent | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RELA | Relations | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TRAN | Transport | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SANT | Santé | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| NUM | Numérique | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| VIO | Violences | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| IP | Propriété intellectuelle | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ENV | Environnement | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| COMP | Droit comparé | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| EDUC | Éducation | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RET | Retour pays | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| OTH | Autre | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Légende** : ⬜ Pending | 📝 Draft | 👀 Review | ✅ Published

**Total catégories** : 24 × 9 langues = **216 pages**
**Total sous-spécialités** : 70 × 9 langues = **630 pages**

---

## 5. LANDING PAGES EXPATRIÉS

### 5.1 Format des URLs

```
# Par type de service
/{locale}/expatrie/service/{service-slug}
Exemple: /fr-fr/expatrie/service/recherche-logement
Exemple: /en-us/expats/service/housing-search

# Par pays
/{locale}/expatrie/pays/{country-slug}
Exemple: /fr-fr/expatrie/pays/thailande
Exemple: /en-us/expats/country/thailand

# Combinaison service + pays
/{locale}/expatrie/service/{service-slug}/pays/{country-slug}
Exemple: /fr-fr/expatrie/service/recherche-logement/pays/thailande
Exemple: /en-us/expats/service/housing-search/country/thailand
```

### 5.2 Tableau de suivi - Services Expatriés

| Code | Service | FR | EN | ES | DE | PT | RU | ZH | AR | HI |
|------|---------|----|----|----|----|----|----|----|----|-----|
| INSTALLATION | S'installer | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| DEMARCHES_ADMINISTRATIVES | Démarches | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RECHERCHE_LOGEMENT | Logement | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| OUVERTURE_COMPTE_BANCAIRE | Banque | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SYSTEME_SANTE | Santé | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| EDUCATION_ECOLES | Écoles | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TRANSPORT | Transport | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RECHERCHE_EMPLOI | Emploi | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CREATION_ENTREPRISE | Entreprise | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FISCALITE_LOCALE | Fiscalité | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| CULTURE_INTEGRATION | Culture | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| VISA_IMMIGRATION | Visa | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ASSURANCES | Assurances | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TELEPHONE_INTERNET | Téléphone | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ALIMENTATION_COURSES | Courses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| LOISIRS_SORTIES | Loisirs | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SPORTS_ACTIVITES | Sports | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SECURITE | Sécurité | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| URGENCES | Urgences | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PROBLEMES_ARGENT | Argent | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PROBLEMES_RELATIONNELS | Relations | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PROBLEMES_DIVERS | Divers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PARTIR_OU_RENTRER | Partir/Rentrer | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ARNAQUE_VOL | Arnaque/Vol | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PERTE_DOCUMENTS | Documents | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ASSISTANCE_CONSULAIRE | Consulaire | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| HEBERGEMENT_URGENCE | Hébergement | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TRADUCTION_INTERPRETATION | Traduction | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PROBLEMES_VOYAGE | Voyage | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| TRAVAIL_DISTANCE | Remote/Freelance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| COWORKING_COLIVING | Coworking | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| FISCALITE_NOMADE | Fiscalité nomade | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ETUDES_INTERNATIONALES | Études | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| LOGEMENT_ETUDIANT | Logement étudiant | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| BOURSE_FINANCEMENT | Bourses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| STAGE_INTERNATIONAL | Stage | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| RETRAITE_ETRANGER | Retraite | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SANTE_SENIORS | Santé seniors | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PENSION_INTERNATIONALE | Pension | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SCOLARITE_ENFANTS | Scolarité | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| GARDE_ENFANTS | Garde | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ACTIVITES_ENFANTS | Activités enfants | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| DEMENAGEMENT_INTERNATIONAL | Déménagement | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ANIMAUX_COMPAGNIE | Animaux | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| PERMIS_CONDUIRE | Permis | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| COMMUNAUTE_EXPATRIES | Communauté | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SOUTIEN_PSYCHOLOGIQUE | Soutien psy | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Total services** : 45 × 9 langues = **405 pages**

---

## 6. LANDING PAGES CLIENTS

### 6.1 Types de landing pages clients

Les clients arrivent avec des **besoins spécifiques**. Il faut créer des landing pages pour chaque besoin urgent ou récurrent.

### 6.2 Besoins clients prioritaires (50 besoins)

```typescript
export const CLIENT_NEEDS = [
  // === URGENCES JURIDIQUES ===
  { code: "URGENCE_JURIDIQUE_ETRANGER", slugs: { fr: "urgence-juridique-etranger", en: "legal-emergency-abroad", ... } },
  { code: "ARRETE_POLICE_ETRANGER", slugs: { fr: "arrete-police-etranger", en: "arrested-abroad", ... } },
  { code: "ACCIDENT_ETRANGER", slugs: { fr: "accident-etranger", en: "accident-abroad", ... } },
  { code: "VICTIME_ARNAQUE", slugs: { fr: "victime-arnaque-etranger", en: "scam-victim-abroad", ... } },
  { code: "PERTE_PASSEPORT", slugs: { fr: "perte-passeport-etranger", en: "lost-passport-abroad", ... } },

  // === IMMIGRATION ===
  { code: "OBTENIR_VISA", slugs: { fr: "obtenir-visa", en: "get-visa", ... } },
  { code: "VISA_REFUSE", slugs: { fr: "visa-refuse", en: "visa-denied", ... } },
  { code: "PROBLEME_TITRE_SEJOUR", slugs: { fr: "probleme-titre-sejour", en: "residence-permit-problem", ... } },
  { code: "REGROUPEMENT_FAMILIAL", slugs: { fr: "regroupement-familial", en: "family-reunification", ... } },
  { code: "NATURALISATION", slugs: { fr: "demande-naturalisation", en: "naturalization-application", ... } },

  // === TRAVAIL ===
  { code: "PROBLEME_CONTRAT_TRAVAIL", slugs: { fr: "probleme-contrat-travail-etranger", en: "employment-contract-abroad", ... } },
  { code: "LICENCIEMENT_ETRANGER", slugs: { fr: "licenciement-etranger", en: "dismissal-abroad", ... } },
  { code: "SALAIRE_IMPAYE", slugs: { fr: "salaire-impaye-etranger", en: "unpaid-salary-abroad", ... } },
  { code: "HARCELEMENT_TRAVAIL", slugs: { fr: "harcelement-travail-etranger", en: "workplace-harassment-abroad", ... } },

  // === FAMILLE ===
  { code: "DIVORCE_INTERNATIONAL", slugs: { fr: "divorce-international", en: "international-divorce", ... } },
  { code: "GARDE_ENFANTS_INTERNATIONAL", slugs: { fr: "garde-enfants-international", en: "international-child-custody", ... } },
  { code: "ENLEVEMENT_ENFANT", slugs: { fr: "enlevement-parental-international", en: "international-child-abduction", ... } },
  { code: "MARIAGE_ETRANGER", slugs: { fr: "mariage-etranger", en: "marriage-abroad", ... } },

  // === IMMOBILIER ===
  { code: "ACHETER_BIEN_ETRANGER", slugs: { fr: "acheter-bien-immobilier-etranger", en: "buy-property-abroad", ... } },
  { code: "VENDRE_BIEN_ETRANGER", slugs: { fr: "vendre-bien-immobilier-etranger", en: "sell-property-abroad", ... } },
  { code: "PROBLEME_LOCATION_ETRANGER", slugs: { fr: "probleme-location-etranger", en: "rental-problem-abroad", ... } },
  { code: "LITIGE_PROPRIETE", slugs: { fr: "litige-propriete-etranger", en: "property-dispute-abroad", ... } },

  // === FISCALITE ===
  { code: "DECLARATION_IMPOTS_ETRANGER", slugs: { fr: "declaration-impots-etranger", en: "tax-declaration-abroad", ... } },
  { code: "DOUBLE_IMPOSITION", slugs: { fr: "eviter-double-imposition", en: "avoid-double-taxation", ... } },
  { code: "OPTIMISATION_FISCALE_EXPAT", slugs: { fr: "optimisation-fiscale-expatrie", en: "expat-tax-optimization", ... } },
  { code: "CONTROLE_FISCAL_ETRANGER", slugs: { fr: "controle-fiscal-etranger", en: "tax-audit-abroad", ... } },

  // === ENTREPRISE ===
  { code: "CREER_ENTREPRISE_ETRANGER", slugs: { fr: "creer-entreprise-etranger", en: "start-business-abroad", ... } },
  { code: "OUVRIR_FILIALE_ETRANGER", slugs: { fr: "ouvrir-filiale-etranger", en: "open-subsidiary-abroad", ... } },
  { code: "PROBLEME_FOURNISSEUR_ETRANGER", slugs: { fr: "probleme-fournisseur-etranger", en: "supplier-problem-abroad", ... } },
  { code: "RECOUVREMENT_CREANCES", slugs: { fr: "recouvrement-creances-international", en: "international-debt-collection", ... } },

  // === SUCCESSION ===
  { code: "HERITAGE_INTERNATIONAL", slugs: { fr: "heritage-international", en: "international-inheritance", ... } },
  { code: "TESTAMENT_INTERNATIONAL", slugs: { fr: "testament-international", en: "international-will", ... } },
  { code: "DECES_ETRANGER", slugs: { fr: "deces-proche-etranger", en: "death-abroad", ... } },

  // === PENAL ===
  { code: "ACCUSATION_PENALE_ETRANGER", slugs: { fr: "accusation-penale-etranger", en: "criminal-charge-abroad", ... } },
  { code: "EXTRADITION", slugs: { fr: "procedure-extradition", en: "extradition-proceedings", ... } },
  { code: "CASIER_JUDICIAIRE_ETRANGER", slugs: { fr: "casier-judiciaire-etranger", en: "criminal-record-abroad", ... } },

  // === TRANSPORT ===
  { code: "VOL_ANNULE_INDEMNISATION", slugs: { fr: "vol-annule-indemnisation", en: "flight-cancelled-compensation", ... } },
  { code: "BAGAGES_PERDUS", slugs: { fr: "bagages-perdus-indemnisation", en: "lost-luggage-compensation", ... } },
  { code: "ACCIDENT_VOITURE_ETRANGER", slugs: { fr: "accident-voiture-etranger", en: "car-accident-abroad", ... } },

  // === CONSOMMATION ===
  { code: "ARNAQUE_ACHAT_ETRANGER", slugs: { fr: "arnaque-achat-etranger", en: "purchase-scam-abroad", ... } },
  { code: "PRODUIT_DEFECTUEUX", slugs: { fr: "produit-defectueux-etranger", en: "defective-product-abroad", ... } },
  { code: "SERVICE_NON_RENDU", slugs: { fr: "service-non-rendu-etranger", en: "service-not-provided-abroad", ... } },

  // === SANTE ===
  { code: "ERREUR_MEDICALE_ETRANGER", slugs: { fr: "erreur-medicale-etranger", en: "medical-error-abroad", ... } },
  { code: "REMBOURSEMENT_SOINS_ETRANGER", slugs: { fr: "remboursement-soins-etranger", en: "healthcare-reimbursement-abroad", ... } },
  { code: "HOSPITALISATION_URGENCE", slugs: { fr: "hospitalisation-urgence-etranger", en: "emergency-hospitalization-abroad", ... } },

  // === AIDE EXPATRIE ===
  { code: "AIDE_INSTALLATION", slugs: { fr: "aide-installation-pays", en: "help-settling-country", ... } },
  { code: "TROUVER_LOGEMENT", slugs: { fr: "trouver-logement-etranger", en: "find-housing-abroad", ... } },
  { code: "OUVRIR_COMPTE_BANCAIRE", slugs: { fr: "ouvrir-compte-bancaire-etranger", en: "open-bank-account-abroad", ... } },
  { code: "INSCRIPTION_ECOLE_ENFANTS", slugs: { fr: "inscription-ecole-enfants-etranger", en: "school-enrollment-abroad", ... } },
  { code: "DEMENAGEMENT_INTERNATIONAL", slugs: { fr: "organiser-demenagement-international", en: "organize-international-move", ... } },
];
```

### 6.3 Format des URLs clients

```
# Par besoin
/{locale}/besoin/{need-slug}
Exemple: /fr-fr/besoin/divorce-international
Exemple: /en-us/need/international-divorce

# Urgences
/{locale}/urgence/{urgency-slug}
Exemple: /fr-fr/urgence/arrete-police-etranger
Exemple: /en-us/emergency/arrested-abroad

# Combinaison besoin + pays
/{locale}/besoin/{need-slug}/pays/{country-slug}
Exemple: /fr-fr/besoin/acheter-bien-immobilier-etranger/pays/espagne
Exemple: /en-us/need/buy-property-abroad/country/spain
```

### 6.4 Tableau de suivi - Besoins clients (50 besoins)

| Code | Besoin | FR | EN | ES | DE | PT | RU | ZH | AR | HI |
|------|--------|----|----|----|----|----|----|----|----|-----|
| URGENCE_JURIDIQUE | Urgence juridique | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ARRETE_POLICE | Arrêté par police | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Total besoins clients** : 50 × 9 langues = **450 pages**

---

## 7. LANDING PAGES ACQUISITION

### 7.1 Types de pages acquisition

| Type | Description | URL FR | URL EN |
|------|-------------|--------|--------|
| **Programme Affiliation** | Recrutement affiliés | /programme-affiliation | /affiliate-program |
| **B2B Entreprises** | Offre entreprises | /entreprises | /business |
| **Blogueurs/Influenceurs** | Partenariats contenu | /blogueurs-partenaires | /blogger-partners |
| **Partenariats** | Partenariats stratégiques | /partenariats | /partnerships |

### 7.2 Contenu Landing Page Programme Affiliation

```typescript
interface AffiliateProgramLanding {
  // HERO
  heroTitle: string;          // "Gagnez de l'argent en recommandant SOS Expat"
  heroSubtitle: string;       // "Jusqu'à 30% de commission sur chaque vente"
  heroCTA: string;            // "Devenir affilié"

  // STATS
  stats: {
    commissionRate: string;   // "Jusqu'à 30%"
    avgEarnings: string;      // "500€/mois en moyenne"
    affiliatesCount: number;  // Nombre d'affiliés
    payoutFrequency: string;  // "Mensuel"
  };

  // BENEFITS
  benefits: [
    { title: "Commission attractive", description: "Jusqu'à 30% sur chaque client référé" },
    { title: "Paiement mensuel", description: "Retrait via Wise, SEPA, ACH..." },
    { title: "Suivi en temps réel", description: "Dashboard avec statistiques" },
    { title: "Outils marketing", description: "Bannières, liens, QR codes" },
    { title: "Support dédié", description: "Équipe support affiliés" },
    { title: "Bonus performance", description: "Paliers de commission progressifs" }
  ];

  // HOW IT WORKS
  howItWorks: [
    { step: 1, title: "Inscrivez-vous", description: "Créez votre compte affilié gratuit" },
    { step: 2, title: "Partagez", description: "Utilisez vos liens personnalisés" },
    { step: 3, title: "Gagnez", description: "Recevez vos commissions chaque mois" }
  ];

  // COMMISSION STRUCTURE
  commissionTiers: [
    { tier: "Bronze", sales: "0-10", rate: "15%" },
    { tier: "Silver", sales: "11-50", rate: "20%" },
    { tier: "Gold", sales: "51-100", rate: "25%" },
    { tier: "Platinum", sales: "100+", rate: "30%" }
  ];

  // TESTIMONIALS
  affiliateTestimonials: [...];

  // FAQ
  faq: [
    { q: "Comment devenir affilié ?", a: "..." },
    { q: "Quand suis-je payé ?", a: "..." },
    { q: "Combien puis-je gagner ?", a: "..." },
    { q: "Quels outils sont disponibles ?", a: "..." }
  ];

  // CTA
  ctaTitle: "Prêt à gagner de l'argent ?";
  ctaDescription: "Rejoignez des centaines d'affiliés qui recommandent SOS Expat";
  ctaButton: "Créer mon compte affilié";
}
```

### 7.3 Tableau de suivi - Pages Acquisition

| Type | FR | EN | ES | DE | PT | RU | ZH | AR | HI |
|------|----|----|----|----|----|----|----|----|-----|
| Programme Affiliation | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| B2B Entreprises | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Blogueurs/Influenceurs | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Partenariats | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Total pages acquisition** : 4 × 9 langues = **36 pages**

---

## 8. LANDING PAGES PAR PAYS

### 8.1 Priorité des pays

**Tier 1 (Priorité maximale)** - 10 pays :
- 🇬🇧 Royaume-Uni, 🇫🇷 France, 🇩🇪 Allemagne, 🇪🇸 Espagne, 🇺🇸 États-Unis
- 🇨🇦 Canada, 🇦🇺 Australie, 🇦🇪 Émirats, 🇸🇬 Singapour, 🇨🇭 Suisse

**Tier 2 (Haute priorité)** - 20 pays :
- 🇮🇹 Italie, 🇳🇱 Pays-Bas, 🇧🇪 Belgique, 🇵🇹 Portugal
- 🇯🇵 Japon, 🇰🇷 Corée du Sud, 🇨🇳 Chine, 🇮🇳 Inde
- 🇧🇷 Brésil, 🇲🇽 Mexique, 🇹🇭 Thaïlande, 🇲🇾 Malaisie
- 🇮🇩 Indonésie, 🇵🇭 Philippines, 🇻🇳 Vietnam
- 🇿🇦 Afrique du Sud, 🇲🇦 Maroc, 🇪🇬 Égypte, 🇸🇦 Arabie Saoudite, 🇶🇦 Qatar

**Tier 3 (Standard)** - 167 autres pays

### 8.2 Format des URLs par pays

```
# Avocat par pays
/{locale}/avocat/pays/{country-slug}
Exemple: /fr-fr/avocat/pays/emirats-arabes-unis

# Expatrié par pays
/{locale}/expatrie/pays/{country-slug}
Exemple: /fr-fr/expatrie/pays/thailande

# Service spécifique dans un pays
/{locale}/avocat/specialite/{specialty}/pays/{country}
/{locale}/expatrie/service/{service}/pays/{country}
```

### 8.3 Tableau de suivi - Pays Tier 1 (Avocats)

| Pays | Code | FR | EN | ES | DE | PT | RU | ZH | AR | HI |
|------|------|----|----|----|----|----|----|----|----|-----|
| Royaume-Uni | gb | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| France | fr | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Allemagne | de | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Espagne | es | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| États-Unis | us | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Canada | ca | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Australie | au | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Émirats | ae | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Singapour | sg | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Suisse | ch | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**Total Tier 1 avocats** : 10 pays × 9 langues = **90 pages**
**Total Tier 1 expatriés** : 10 pays × 9 langues = **90 pages**

### 8.4 Calcul total pages par pays

| Tier | Pays | Avocats (×9) | Expatriés (×9) | Total |
|------|------|--------------|----------------|-------|
| Tier 1 | 10 | 90 | 90 | 180 |
| Tier 2 | 20 | 180 | 180 | 360 |
| Tier 3 | 167 | 1,503 | 1,503 | 3,006 |
| **TOTAL** | **197** | **1,773** | **1,773** | **3,546** |

---

## 9. SYSTÈME DE SUIVI D'AVANCEMENT

### 9.1 Collection Firestore `landing_pages_progress`

```typescript
// Collection pour suivre l'avancement global

interface LandingPagesProgress {
  id: "global_progress";

  // Compteurs globaux
  totalPages: number;           // 5,283
  publishedPages: number;       // Nombre publié
  draftPages: number;           // En brouillon
  pendingPages: number;         // En attente

  // Par type
  byType: {
    lawyer_specialty: ProgressByLang;
    lawyer_subspecialty: ProgressByLang;
    lawyer_country: ProgressByLang;
    expat_service: ProgressByLang;
    expat_country: ProgressByLang;
    client_need: ProgressByLang;
    acquisition: ProgressByLang;
  };

  // Par pays
  byCountry: {
    [countryCode: string]: {
      lawyerPage: StatusByLang;
      expatPage: StatusByLang;
    };
  };

  // Dernière mise à jour
  lastUpdated: Timestamp;
}

interface ProgressByLang {
  fr: { total: number; published: number; draft: number; pending: number };
  en: { total: number; published: number; draft: number; pending: number };
  es: { total: number; published: number; draft: number; pending: number };
  de: { total: number; published: number; draft: number; pending: number };
  pt: { total: number; published: number; draft: number; pending: number };
  ru: { total: number; published: number; draft: number; pending: number };
  zh: { total: number; published: number; draft: number; pending: number };
  ar: { total: number; published: number; draft: number; pending: number };
  hi: { total: number; published: number; draft: number; pending: number };
}

type StatusByLang = {
  fr: 'pending' | 'draft' | 'review' | 'published';
  en: 'pending' | 'draft' | 'review' | 'published';
  // ... autres langues
};
```

### 9.2 Page Admin de suivi

Créer une page admin `/admin/landing-pages-progress` avec :

1. **Dashboard global** : Pourcentage d'avancement total
2. **Vue par type** : Tableau de progression par catégorie
3. **Vue par pays** : Carte du monde avec couleurs de progression
4. **Vue par langue** : Graphique de complétion par langue
5. **Actions** : Générer pages manquantes, exporter rapport

### 9.3 Automatisation de génération

```typescript
// Cloud Function pour générer les pages automatiquement

export const generateLandingPages = functions.pubsub
  .schedule('0 2 * * *')  // Tous les jours à 2h
  .onRun(async (context) => {
    // 1. Récupérer les pages non générées
    const pendingPages = await getPendingLandingPages();

    // 2. Générer le contenu via GPT-4/Claude
    for (const page of pendingPages.slice(0, 10)) {  // Max 10/jour
      const content = await generateLandingContent(page);
      await saveLandingPage(page.id, content);
    }

    // 3. Mettre à jour les compteurs
    await updateProgressCounters();
  });
```

---

## 10. SEO & SCHEMA.ORG

### 10.1 Schema.org par type de page

**Landing Avocat Spécialité** :
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Avocat en droit de l'immigration - SOS Expat",
  "description": "Trouvez un avocat spécialisé en immigration...",
  "mainEntity": {
    "@type": "Service",
    "name": "Consultation avocat immigration",
    "provider": {
      "@type": "Organization",
      "name": "SOS Expat"
    },
    "serviceType": "Legal consultation - Immigration law",
    "areaServed": {
      "@type": "Place",
      "name": "Worldwide"
    }
  },
  "breadcrumb": {...},
  "speakable": {...}
}
```

**Landing Client Besoin** :
```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Divorce international - Aide juridique",
  "mainEntity": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Comment divorcer à l'étranger ?",
        "acceptedAnswer": {...}
      }
    ]
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "..."
  }
}
```

### 10.2 Meta SEO templates

```typescript
// Templates SEO par type de page

export const SEO_TEMPLATES = {
  lawyer_specialty: {
    title: {
      fr: "Avocat {specialty} en ligne | Consultation 24/7 - SOS Expat",
      en: "{specialty} Lawyer Online | 24/7 Consultation - SOS Expat",
      // ...
    },
    description: {
      fr: "Trouvez un avocat spécialisé en {specialty} en 5 minutes. Consultation par téléphone 24/7 dans 197 pays. Réponse immédiate garantie.",
      en: "Find a {specialty} specialist lawyer in 5 minutes. Phone consultation 24/7 in 197 countries. Immediate response guaranteed.",
      // ...
    }
  },
  expat_service: {
    title: {
      fr: "Aide {service} pour expatriés | Assistance 24/7 - SOS Expat",
      en: "{service} Help for Expats | 24/7 Assistance - SOS Expat",
      // ...
    },
    description: {
      fr: "Besoin d'aide pour {service} à l'étranger ? Parlez à un expatrié expérimenté en 5 minutes. Support dans 197 pays.",
      en: "Need help with {service} abroad? Talk to an experienced expat in 5 minutes. Support in 197 countries.",
      // ...
    }
  },
  // ... autres templates
};
```

---

## 11. TRADUCTIONS REQUISES

### 11.1 Fichiers de traduction à créer

```
sos/src/locales/
├── fr-fr/
│   └── landing.json        # Nouveau fichier
├── en/
│   └── landing.json
├── es-es/
│   └── landing.json
├── de-de/
│   └── landing.json
├── pt-pt/
│   └── landing.json
├── ru-ru/
│   └── landing.json
├── zh-cn/
│   └── landing.json
├── ar-sa/
│   └── landing.json
└── hi-in/
    └── landing.json
```

### 11.2 Structure du fichier landing.json

```json
{
  "common": {
    "findLawyer": "Trouver un avocat",
    "findExpat": "Trouver un expatrié",
    "getHelp": "Obtenir de l'aide",
    "callNow": "Appeler maintenant",
    "learnMore": "En savoir plus",
    "available247": "Disponible 24/7",
    "countries197": "197 pays",
    "responseIn5min": "Réponse en 5 min"
  },
  "lawyer": {
    "hero": {
      "title": "Trouvez un avocat spécialisé en {specialty}",
      "subtitle": "Consultation par téléphone en moins de 5 minutes",
      "cta": "Trouver mon avocat"
    },
    "benefits": {
      "fast": {
        "title": "Réponse rapide",
        "description": "Connectez-vous à un avocat en moins de 5 minutes"
      },
      "global": {
        "title": "Couverture mondiale",
        "description": "Avocats disponibles dans 197 pays"
      },
      // ...
    },
    "howItWorks": {
      "step1": {
        "title": "Décrivez votre besoin",
        "description": "Expliquez brièvement votre situation juridique"
      },
      // ...
    }
  },
  "expat": {
    // Structure similaire
  },
  "client": {
    // Structure similaire
  },
  "affiliate": {
    // Structure pour programme affiliation
  }
}
```

---

## 12. PLANNING D'IMPLÉMENTATION

### Phase 1 : Infrastructure (Semaine 1-2)

- [ ] Créer la structure des fichiers landing pages
- [ ] Ajouter les routes dans localeRoutes.ts
- [ ] Créer les composants réutilisables (LandingHero, LandingBenefits, etc.)
- [ ] Mettre en place la collection Firestore landing_pages_tracking
- [ ] Créer le fichier de slugs traduits

### Phase 2 : Pages prioritaires (Semaine 3-4)

- [ ] Landing Programme Affiliation (9 langues)
- [ ] Landing B2B Entreprises (9 langues)
- [ ] 5 spécialités avocats prioritaires × 9 langues = 45 pages
- [ ] 5 services expatriés prioritaires × 9 langues = 45 pages

### Phase 3 : Pays Tier 1 (Semaine 5-6)

- [ ] 10 pays × avocats × 9 langues = 90 pages
- [ ] 10 pays × expatriés × 9 langues = 90 pages

### Phase 4 : Complétion spécialités/services (Semaine 7-10)

- [ ] Toutes les catégories avocats (24 × 9 = 216 pages)
- [ ] Toutes les sous-spécialités avocats (70 × 9 = 630 pages)
- [ ] Tous les services expatriés (45 × 9 = 405 pages)

### Phase 5 : Besoins clients (Semaine 11-12)

- [ ] 50 besoins clients × 9 langues = 450 pages

### Phase 6 : Pays Tier 2 & 3 (Semaine 13+)

- [ ] Génération automatique progressive
- [ ] 20 pays Tier 2 × 2 types × 9 langues = 360 pages
- [ ] 167 pays Tier 3 × 2 types × 9 langues = 3,006 pages

---

## RÉCAPITULATIF FINAL

### Volume total de pages à créer

| Catégorie | Calcul | Total |
|-----------|--------|-------|
| Spécialités avocats (catégories) | 24 × 9 | 216 |
| Sous-spécialités avocats | 70 × 9 | 630 |
| Services expatriés | 45 × 9 | 405 |
| Besoins clients | 50 × 9 | 450 |
| Avocats par pays | 197 × 9 | 1,773 |
| Expatriés par pays | 197 × 9 | 1,773 |
| Acquisition (affiliation, B2B, etc.) | 4 × 9 | 36 |
| **TOTAL** | | **5,283 pages** |

### Prochaines étapes immédiates

1. **Valider ce plan** avec les parties prenantes
2. **Créer le fichier de slugs traduits** pour toutes les spécialités/services
3. **Implémenter les composants de base** des landing pages
4. **Commencer par les pages acquisition** (programme affiliation)
5. **Mettre en place le système de tracking** d'avancement

---

**Document créé par Claude Opus 4.5**
**Date** : 2026-01-26
**Statut** : Prêt pour validation et implémentation

export type CountryCode = string;

export interface CountryConfig {
  llm?: {
    tone?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    styleGuide?: string;
    do?: string[];
    dont?: string[];
  };
  emergency?: Array<{ name: string; phone: string; shortCode?: string; availability?: string }>;
  authorities?: Array<{ name: string; role?: string; phone?: string; email?: string; address?: string; hours?: string; website?: string; lat?: number; lng?: number }>;
  embassiesConsulates?: Array<{ nationality?: string; city?: string; phone?: string; email?: string; address?: string; website?: string }>;
  associations?: Array<{ name: string; scope?: string; phone?: string; email?: string; address?: string; website?: string; notes?: string }>;
  health?: { hotlines?: string[]; hospitals?: string[]; clinics?: string[] };
  legal?: { hotlines?: string[]; barAssociations?: string[]; notaries?: string[] };
  procedures?: Array<{ topic: string; steps?: string[]; docsRequired?: string[]; processingTime?: string; fees?: string | number; links?: string[] }>;
  templates?: { firstReply?: string; followUp?: string; disclaimer?: string; whatsappTemplate?: string };
  phrases?: { greeting?: string; empathy?: string; closing?: string };
  faq?: Array<{ q: string; a: string }>;
  tags?: string[];
  i18n?: { defaultLang?: string; translations?: Record<string, any> };
  meta?: { lastUpdatedBy?: string; lastUpdatedAt?: any; version?: string };
}

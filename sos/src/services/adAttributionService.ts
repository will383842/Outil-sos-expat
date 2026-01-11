// src/services/adAttributionService.ts
// Service d'attribution publicitaire - Lie les conversions aux sources de trafic
// Préparé pour: Facebook Ads, Instagram, TikTok, YouTube, Google Ads

import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  TrafficSource,
  getTrafficSourceForConversion,
  getCurrentTrafficSource,
  getSessionId,
  normalizeSourceName,
} from '../utils/trafficSource';
import {
  ContentType,
  ContentTypeStats,
  CreativeStats,
  parseUtmContent,
  detectContentType,
  aggregateByContentType,
  getTopCreatives,
} from '../utils/utmContentParser';

/* --------------------------------- Types ----------------------------------- */

export interface AdConversion {
  // Identification
  conversionId?: string;
  sessionId: string;
  userId?: string;
  event_id?: string; // Pour déduplication CAPI (Conversions API)

  // Type de conversion
  conversionType: 'lead' | 'registration' | 'purchase' | 'contact' | 'view_content' | 'initiate_checkout';

  // Valeur
  value?: number;
  currency?: string;

  // Détails
  contentName?: string;
  contentCategory?: string;
  contentType?: string;
  orderId?: string;
  providerId?: string;
  providerType?: 'lawyer' | 'expat';

  // Données internationales
  user_country?: string;    // Code pays ISO (FR, US, DE, etc.)
  user_timezone?: string;   // Timezone IANA (Europe/Paris, America/New_York, etc.)

  // Content parsing (depuis utm_content)
  content_type?: ContentType;    // Type extrait: video, image, carousel, etc.
  content_variant?: string;      // Variante: testimonial, promo, demo, etc.

  // Attribution
  trafficSource: {
    firstTouch: TrafficSource | null;
    lastTouch: TrafficSource | null;
    currentSession: TrafficSource | null;
  };

  // Metadata
  timestamp?: Date;
  url?: string;
  userAgent?: string;
}

export interface AdStats {
  source: string;
  sourceName: string;
  conversions: number;
  revenue: number;
  leads: number;
  registrations: number;
  purchases: number;
  avgOrderValue: number;
  conversionRate?: number;
}

export interface CampaignStats {
  campaign: string;
  source: string;
  medium: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
}

export interface CountryStats {
  country: string;
  countryName: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
  avgOrderValue: number;
}

export interface TimezoneStats {
  timezone: string;
  region: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
  peakHours: number[]; // Heures de pointe pour les conversions
}

// Re-export types from utmContentParser
export type { ContentType, ContentTypeStats, CreativeStats };

/* -------------------------------- Service ---------------------------------- */

class AdAttributionService {
  private isDev = import.meta.env.DEV;

  private log(...args: unknown[]): void {
    if (this.isDev) {
      console.log('%c[AdAttribution]', 'color: #9C27B0; font-weight: bold', ...args);
    }
  }

  /**
   * Génère un event_id unique pour la déduplication CAPI
   * Format: timestamp-random pour unicité garantie
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    return `evt_${timestamp}_${randomPart}`;
  }

  /**
   * Détecte le pays de l'utilisateur depuis les données disponibles
   * Priorité: trafficSource data > navigator.language > défaut
   */
  private detectUserCountry(): string {
    try {
      // Essayer d'obtenir depuis la langue du navigateur
      if (typeof navigator !== 'undefined' && navigator.language) {
        const langParts = navigator.language.split('-');
        if (langParts.length >= 2) {
          return langParts[1].toUpperCase(); // ex: en-US -> US
        }
      }
      // Fallback: essayer languages array
      if (typeof navigator !== 'undefined' && navigator.languages?.length) {
        for (const lang of navigator.languages) {
          const parts = lang.split('-');
          if (parts.length >= 2) {
            return parts[1].toUpperCase();
          }
        }
      }
    } catch {
      // Silently fail
    }
    return 'unknown';
  }

  /**
   * Détecte le timezone de l'utilisateur
   */
  private detectUserTimezone(): string {
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
      }
    } catch {
      // Silently fail
    }
    return 'unknown';
  }

  /**
   * Enregistre une conversion avec ses données d'attribution
   */
  async trackConversion(data: Omit<AdConversion, 'trafficSource' | 'sessionId' | 'timestamp' | 'url' | 'userAgent' | 'event_id' | 'user_country' | 'user_timezone' | 'content_type' | 'content_variant'>): Promise<string | null> {
    try {
      const trafficSources = getTrafficSourceForConversion();

      // Générer l'event_id pour déduplication CAPI
      const eventId = this.generateEventId();

      // Détecter pays et timezone
      const userCountry = this.detectUserCountry();
      const userTimezone = this.detectUserTimezone();

      // Parser utm_content pour extraire type et variant
      const lastTouchContent = trafficSources.lastTouch?.utm_content;
      const parsedContent = parseUtmContent(lastTouchContent);

      const conversionData: Record<string, unknown> = {
        ...data,
        sessionId: getSessionId(),
        trafficSource: trafficSources,
        timestamp: serverTimestamp(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,

        // Event ID pour déduplication CAPI
        event_id: eventId,

        // Données internationales
        user_country: userCountry,
        user_timezone: userTimezone,

        // Content parsing enrichi
        content_type: parsedContent.contentType,
        content_variant: parsedContent.variant || null,

        // Champs indexés pour les requêtes
        source_firstTouch: trafficSources.firstTouch?.utm_source || 'direct',
        source_lastTouch: trafficSources.lastTouch?.utm_source || 'direct',
        medium_firstTouch: trafficSources.firstTouch?.utm_medium || 'none',
        medium_lastTouch: trafficSources.lastTouch?.utm_medium || 'none',
        campaign_firstTouch: trafficSources.firstTouch?.utm_campaign || null,
        campaign_lastTouch: trafficSources.lastTouch?.utm_campaign || null,

        // Click IDs pour les plateformes
        fbclid: trafficSources.lastTouch?.fbclid || trafficSources.firstTouch?.fbclid || null,
        gclid: trafficSources.lastTouch?.gclid || trafficSources.firstTouch?.gclid || null,
        ttclid: trafficSources.lastTouch?.ttclid || trafficSources.firstTouch?.ttclid || null,

        // Content type parsing (video, image, carousel, story, reel, collection)
        content_firstTouch: trafficSources.firstTouch?.utm_content || null,
        content_lastTouch: trafficSources.lastTouch?.utm_content || null,
        contentType_firstTouch: detectContentType(trafficSources.firstTouch?.utm_content),
        contentType_lastTouch: detectContentType(trafficSources.lastTouch?.utm_content),
      };

      const docRef = await addDoc(collection(db, 'ad_conversions'), conversionData);

      this.log('Conversion tracked:', {
        id: docRef.id,
        event_id: eventId,
        type: data.conversionType,
        value: data.value,
        source: conversionData.source_lastTouch,
        country: userCountry,
        timezone: userTimezone,
        contentType: parsedContent.contentType,
      });

      return docRef.id;
    } catch (error) {
      console.error('[AdAttribution] Error tracking conversion:', error);
      return null;
    }
  }

  /**
   * Track un Lead (demande d'appel, consultation)
   */
  async trackLead(data: {
    contentName?: string;
    contentCategory?: string;
    value?: number;
    providerId?: string;
    providerType?: 'lawyer' | 'expat';
  }): Promise<string | null> {
    return this.trackConversion({
      conversionType: 'lead',
      ...data,
      currency: 'EUR',
    });
  }

  /**
   * Track une inscription complétée
   */
  async trackRegistration(data: {
    contentName?: string;
    userId?: string;
    value?: number;
  }): Promise<string | null> {
    return this.trackConversion({
      conversionType: 'registration',
      ...data,
      currency: 'EUR',
    });
  }

  /**
   * Track un achat/paiement
   */
  async trackPurchase(data: {
    value: number;
    currency: string;
    orderId?: string;
    contentName?: string;
    providerId?: string;
    providerType?: 'lawyer' | 'expat';
    userId?: string;
  }): Promise<string | null> {
    return this.trackConversion({
      conversionType: 'purchase',
      ...data,
    });
  }

  /**
   * Track une prise de contact
   */
  async trackContact(data: {
    contentName?: string;
    contentCategory?: string;
  }): Promise<string | null> {
    return this.trackConversion({
      conversionType: 'contact',
      ...data,
    });
  }

  /**
   * Track un initiate checkout
   */
  async trackInitiateCheckout(data: {
    value?: number;
    currency?: string;
    contentName?: string;
    providerId?: string;
    providerType?: 'lawyer' | 'expat';
  }): Promise<string | null> {
    return this.trackConversion({
      conversionType: 'initiate_checkout',
      ...data,
    });
  }

  /* ---------------------------- Stats Queries ----------------------------- */

  /**
   * Récupère les stats par source de trafic
   */
  async getStatsBySource(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch'
  ): Promise<AdStats[]> {
    try {
      const sourceField = attribution === 'firstTouch' ? 'source_firstTouch' : 'source_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);

      // Agrégation côté client (pour éviter les index composites complexes)
      const statsMap = new Map<string, AdStats>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const source = data[sourceField] || 'direct';

        if (!statsMap.has(source)) {
          statsMap.set(source, {
            source,
            sourceName: normalizeSourceName(source),
            conversions: 0,
            revenue: 0,
            leads: 0,
            registrations: 0,
            purchases: 0,
            avgOrderValue: 0,
          });
        }

        const stats = statsMap.get(source)!;
        stats.conversions++;

        if (data.value && data.conversionType === 'purchase') {
          stats.revenue += data.value;
          stats.purchases++;
        }

        if (data.conversionType === 'lead') {
          stats.leads++;
        }

        if (data.conversionType === 'registration') {
          stats.registrations++;
        }
      });

      // Calculer AOV
      statsMap.forEach((stats) => {
        if (stats.purchases > 0) {
          stats.avgOrderValue = stats.revenue / stats.purchases;
        }
      });

      return Array.from(statsMap.values())
        .sort((a, b) => b.conversions - a.conversions);
    } catch (error) {
      console.error('[AdAttribution] Error getting stats by source:', error);
      return [];
    }
  }

  /**
   * Récupère les stats par campagne
   */
  async getStatsByCampaign(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch'
  ): Promise<CampaignStats[]> {
    try {
      const campaignField = attribution === 'firstTouch' ? 'campaign_firstTouch' : 'campaign_lastTouch';
      const sourceField = attribution === 'firstTouch' ? 'source_firstTouch' : 'source_lastTouch';
      const mediumField = attribution === 'firstTouch' ? 'medium_firstTouch' : 'medium_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const statsMap = new Map<string, CampaignStats>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const campaign = data[campaignField] || '(not set)';
        const source = data[sourceField] || 'direct';
        const medium = data[mediumField] || 'none';
        const key = `${campaign}_${source}_${medium}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            campaign,
            source,
            medium,
            conversions: 0,
            revenue: 0,
            leads: 0,
            purchases: 0,
          });
        }

        const stats = statsMap.get(key)!;
        stats.conversions++;

        if (data.value && data.conversionType === 'purchase') {
          stats.revenue += data.value;
          stats.purchases++;
        }

        if (data.conversionType === 'lead') {
          stats.leads++;
        }
      });

      return Array.from(statsMap.values())
        .filter(s => s.campaign !== '(not set)')
        .sort((a, b) => b.conversions - a.conversions);
    } catch (error) {
      console.error('[AdAttribution] Error getting stats by campaign:', error);
      return [];
    }
  }

  /**
   * Récupère les conversions récentes
   */
  async getRecentConversions(limitCount = 50): Promise<AdConversion[]> {
    try {
      const q = query(
        collection(db, 'ad_conversions'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        conversionId: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as AdConversion[];
    } catch (error) {
      console.error('[AdAttribution] Error getting recent conversions:', error);
      return [];
    }
  }

  /**
   * Récupère le résumé global
   */
  async getSummary(startDate: Date, endDate: Date): Promise<{
    totalConversions: number;
    totalRevenue: number;
    totalLeads: number;
    totalPurchases: number;
    avgOrderValue: number;
    topSource: string;
  }> {
    try {
      const stats = await this.getStatsBySource(startDate, endDate);

      const summary = stats.reduce((acc, s) => ({
        totalConversions: acc.totalConversions + s.conversions,
        totalRevenue: acc.totalRevenue + s.revenue,
        totalLeads: acc.totalLeads + s.leads,
        totalPurchases: acc.totalPurchases + s.purchases,
      }), {
        totalConversions: 0,
        totalRevenue: 0,
        totalLeads: 0,
        totalPurchases: 0,
      });

      return {
        ...summary,
        avgOrderValue: summary.totalPurchases > 0 ? summary.totalRevenue / summary.totalPurchases : 0,
        topSource: stats[0]?.sourceName || 'N/A',
      };
    } catch (error) {
      console.error('[AdAttribution] Error getting summary:', error);
      return {
        totalConversions: 0,
        totalRevenue: 0,
        totalLeads: 0,
        totalPurchases: 0,
        avgOrderValue: 0,
        topSource: 'N/A',
      };
    }
  }

  /**
   * Récupère les données pour le graphique par jour
   */
  async getDailyStats(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: string;
    conversions: number;
    revenue: number;
    leads: number;
    purchases: number;
  }>> {
    try {
      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const dailyMap = new Map<string, {
        date: string;
        conversions: number;
        revenue: number;
        leads: number;
        purchases: number;
      }>();

      // Initialiser tous les jours de la période
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          conversions: 0,
          revenue: 0,
          leads: 0,
          purchases: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        if (!timestamp) return;

        const dateStr = timestamp.toISOString().split('T')[0];
        const dayStats = dailyMap.get(dateStr);

        if (dayStats) {
          dayStats.conversions++;

          if (data.value && data.conversionType === 'purchase') {
            dayStats.revenue += data.value;
            dayStats.purchases++;
          }

          if (data.conversionType === 'lead') {
            dayStats.leads++;
          }
        }
      });

      return Array.from(dailyMap.values());
    } catch (error) {
      console.error('[AdAttribution] Error getting daily stats:', error);
      return [];
    }
  }

  /* ----------------------- Content Type Analytics -------------------------- */

  /**
   * Récupère les stats par type de contenu publicitaire (video, image, carousel, etc.)
   */
  async getStatsByContentType(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch'
  ): Promise<ContentTypeStats[]> {
    try {
      const contentField = attribution === 'firstTouch' ? 'content_firstTouch' : 'content_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);

      // Préparer les données pour l'agrégation
      const conversions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          utmContent: data[contentField] || undefined,
          conversionType: data.conversionType,
          value: data.value,
        };
      });

      // Utiliser l'utilitaire d'agrégation
      return aggregateByContentType(conversions);
    } catch (error) {
      console.error('[AdAttribution] Error getting stats by content type:', error);
      return [];
    }
  }

  /**
   * Récupère les top créatifs (utm_content) par performance
   */
  async getTopCreatives(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch',
    limitCount = 10
  ): Promise<CreativeStats[]> {
    try {
      const contentField = attribution === 'firstTouch' ? 'content_firstTouch' : 'content_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);

      const conversions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          utmContent: data[contentField] || undefined,
          conversionType: data.conversionType,
          value: data.value,
        };
      });

      return getTopCreatives(conversions, limitCount);
    } catch (error) {
      console.error('[AdAttribution] Error getting top creatives:', error);
      return [];
    }
  }

  /**
   * Récupère les stats par type de contenu et par jour (pour graphiques temporels)
   */
  async getDailyStatsByContentType(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch'
  ): Promise<Array<{
    date: string;
    video: number;
    image: number;
    carousel: number;
    story: number;
    reel: number;
    collection: number;
  }>> {
    try {
      const contentTypeField = attribution === 'firstTouch' ? 'contentType_firstTouch' : 'contentType_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const dailyMap = new Map<string, {
        date: string;
        video: number;
        image: number;
        carousel: number;
        story: number;
        reel: number;
        collection: number;
      }>();

      // Initialiser tous les jours
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          video: 0,
          image: 0,
          carousel: 0,
          story: 0,
          reel: 0,
          collection: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        if (!timestamp) return;

        const dateStr = timestamp.toISOString().split('T')[0];
        const dayStats = dailyMap.get(dateStr);
        const contentType = data[contentTypeField] as ContentType;

        if (dayStats && contentType && contentType !== 'unknown') {
          dayStats[contentType]++;
        }
      });

      return Array.from(dailyMap.values());
    } catch (error) {
      console.error('[AdAttribution] Error getting daily stats by content type:', error);
      return [];
    }
  }

  /**
   * Compare les performances entre types de contenu
   */
  async getContentTypeComparison(
    startDate: Date,
    endDate: Date
  ): Promise<{
    bestPerforming: { type: ContentType; metric: string; value: number } | null;
    worstPerforming: { type: ContentType; metric: string; value: number } | null;
    insights: string[];
  }> {
    try {
      const stats = await this.getStatsByContentType(startDate, endDate);

      if (stats.length === 0) {
        return {
          bestPerforming: null,
          worstPerforming: null,
          insights: ['Aucune donnée disponible pour cette période'],
        };
      }

      const insights: string[] = [];

      // Meilleur par conversions
      const bestByConversions = stats.reduce((a, b) =>
        a.conversions > b.conversions ? a : b
      );

      // Meilleur par revenus
      const bestByRevenue = stats.reduce((a, b) =>
        a.revenue > b.revenue ? a : b
      );

      // Meilleur par AOV
      const statsWithAOV = stats.filter(s => s.avgOrderValue > 0);
      const bestByAOV = statsWithAOV.length > 0
        ? statsWithAOV.reduce((a, b) => a.avgOrderValue > b.avgOrderValue ? a : b)
        : null;

      // Générer des insights
      if (bestByConversions.conversions > 0) {
        insights.push(
          `${bestByConversions.label} génère le plus de conversions (${bestByConversions.conversions})`
        );
      }

      if (bestByRevenue.revenue > 0 && bestByRevenue.contentType !== bestByConversions.contentType) {
        insights.push(
          `${bestByRevenue.label} génère le plus de revenus (${bestByRevenue.revenue.toFixed(0)}€)`
        );
      }

      if (bestByAOV && bestByAOV.avgOrderValue > 0) {
        insights.push(
          `${bestByAOV.label} a le meilleur panier moyen (${bestByAOV.avgOrderValue.toFixed(0)}€)`
        );
      }

      // Comparer vidéo vs image
      const videoStats = stats.find(s => s.contentType === 'video');
      const imageStats = stats.find(s => s.contentType === 'image');

      if (videoStats && imageStats && videoStats.conversions > 0 && imageStats.conversions > 0) {
        const videoPerf = videoStats.revenue / videoStats.conversions;
        const imagePerf = imageStats.revenue / imageStats.conversions;

        if (videoPerf > imagePerf * 1.2) {
          insights.push('Les vidéos convertissent 20%+ mieux que les images statiques');
        } else if (imagePerf > videoPerf * 1.2) {
          insights.push('Les images statiques convertissent 20%+ mieux que les vidéos');
        }
      }

      return {
        bestPerforming: bestByConversions.conversions > 0
          ? { type: bestByConversions.contentType, metric: 'conversions', value: bestByConversions.conversions }
          : null,
        worstPerforming: stats.length > 1
          ? { type: stats[stats.length - 1].contentType, metric: 'conversions', value: stats[stats.length - 1].conversions }
          : null,
        insights,
      };
    } catch (error) {
      console.error('[AdAttribution] Error getting content type comparison:', error);
      return {
        bestPerforming: null,
        worstPerforming: null,
        insights: ['Erreur lors de l\'analyse'],
      };
    }
  }

  /* ----------------------- International Analytics -------------------------- */

  /**
   * Mapping des codes pays ISO vers noms lisibles
   */
  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      'FR': 'France',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'ES': 'Spain',
      'IT': 'Italy',
      'PT': 'Portugal',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'CA': 'Canada',
      'AU': 'Australia',
      'NL': 'Netherlands',
      'LU': 'Luxembourg',
      'AT': 'Austria',
      'IE': 'Ireland',
      'NZ': 'New Zealand',
      'SG': 'Singapore',
      'HK': 'Hong Kong',
      'JP': 'Japan',
      'AE': 'United Arab Emirates',
      'MA': 'Morocco',
      'TN': 'Tunisia',
      'SN': 'Senegal',
      'CI': "Ivory Coast",
      'unknown': 'Unknown',
    };
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Extrait la région depuis un timezone IANA
   */
  private getTimezoneRegion(timezone: string): string {
    if (!timezone || timezone === 'unknown') return 'Unknown';
    const parts = timezone.split('/');
    return parts[0] || 'Unknown';
  }

  /**
   * Récupère les stats groupées par pays
   */
  async getStatsByCountry(
    startDate: Date,
    endDate: Date
  ): Promise<CountryStats[]> {
    try {
      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const statsMap = new Map<string, CountryStats>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const country = data.user_country || 'unknown';

        if (!statsMap.has(country)) {
          statsMap.set(country, {
            country,
            countryName: this.getCountryName(country),
            conversions: 0,
            revenue: 0,
            leads: 0,
            purchases: 0,
            avgOrderValue: 0,
          });
        }

        const stats = statsMap.get(country)!;
        stats.conversions++;

        if (data.value && data.conversionType === 'purchase') {
          stats.revenue += data.value;
          stats.purchases++;
        }

        if (data.conversionType === 'lead') {
          stats.leads++;
        }
      });

      // Calculer AOV
      statsMap.forEach((stats) => {
        if (stats.purchases > 0) {
          stats.avgOrderValue = stats.revenue / stats.purchases;
        }
      });

      return Array.from(statsMap.values())
        .sort((a, b) => b.conversions - a.conversions);
    } catch (error) {
      console.error('[AdAttribution] Error getting stats by country:', error);
      return [];
    }
  }

  /**
   * Récupère les conversions groupées par timezone
   */
  async getConversionsByTimezone(
    startDate: Date,
    endDate: Date
  ): Promise<TimezoneStats[]> {
    try {
      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const statsMap = new Map<string, {
        stats: Omit<TimezoneStats, 'peakHours'>;
        hourCounts: Map<number, number>;
      }>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timezone = data.user_timezone || 'unknown';

        if (!statsMap.has(timezone)) {
          statsMap.set(timezone, {
            stats: {
              timezone,
              region: this.getTimezoneRegion(timezone),
              conversions: 0,
              revenue: 0,
              leads: 0,
              purchases: 0,
            },
            hourCounts: new Map(),
          });
        }

        const entry = statsMap.get(timezone)!;
        entry.stats.conversions++;

        if (data.value && data.conversionType === 'purchase') {
          entry.stats.revenue += data.value;
          entry.stats.purchases++;
        }

        if (data.conversionType === 'lead') {
          entry.stats.leads++;
        }

        // Compter les heures de conversion pour trouver les peak hours
        const timestamp = data.timestamp?.toDate();
        if (timestamp) {
          const hour = timestamp.getHours();
          entry.hourCounts.set(hour, (entry.hourCounts.get(hour) || 0) + 1);
        }
      });

      // Convertir en tableau et calculer les peak hours
      return Array.from(statsMap.values())
        .map(({ stats, hourCounts }) => {
          // Trouver les 3 heures avec le plus de conversions
          const sortedHours = Array.from(hourCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => hour);

          return {
            ...stats,
            peakHours: sortedHours,
          };
        })
        .sort((a, b) => b.conversions - a.conversions);
    } catch (error) {
      console.error('[AdAttribution] Error getting conversions by timezone:', error);
      return [];
    }
  }

  /**
   * Récupère les top créatifs (utm_content) par revenu
   * Différent de getTopCreatives qui trie par conversions
   */
  async getTopCreativesByRevenue(
    startDate: Date,
    endDate: Date,
    attribution: 'firstTouch' | 'lastTouch' = 'lastTouch',
    limitCount = 10
  ): Promise<CreativeStats[]> {
    try {
      const contentField = attribution === 'firstTouch' ? 'content_firstTouch' : 'content_lastTouch';

      const q = query(
        collection(db, 'ad_conversions'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);

      const conversions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          utmContent: data[contentField] || undefined,
          conversionType: data.conversionType,
          value: data.value,
        };
      });

      // Utiliser la fonction utilitaire mais trier par revenu
      const creativeMap = new Map<string, {
        conversions: number;
        revenue: number;
        leads: number;
        purchases: number;
      }>();

      conversions.forEach(conv => {
        const key = conv.utmContent || '(not set)';
        const stats = creativeMap.get(key) || {
          conversions: 0,
          revenue: 0,
          leads: 0,
          purchases: 0,
        };

        stats.conversions++;

        if (conv.conversionType === 'purchase' && conv.value) {
          stats.revenue += conv.value;
          stats.purchases++;
        }

        if (conv.conversionType === 'lead') {
          stats.leads++;
        }

        creativeMap.set(key, stats);
      });

      return Array.from(creativeMap.entries())
        .map(([utmContent, stats]) => {
          const parsed = parseUtmContent(utmContent);
          return {
            utmContent,
            contentType: parsed.contentType,
            label: parsed.fullLabel,
            ...stats,
          };
        })
        .filter(stat => stat.utmContent !== '(not set)')
        .sort((a, b) => b.revenue - a.revenue) // Trier par revenu
        .slice(0, limitCount);
    } catch (error) {
      console.error('[AdAttribution] Error getting top creatives by revenue:', error);
      return [];
    }
  }

  /**
   * Obtient un résumé international avec insights
   */
  async getInternationalSummary(
    startDate: Date,
    endDate: Date
  ): Promise<{
    topCountries: CountryStats[];
    topTimezones: TimezoneStats[];
    totalCountries: number;
    totalTimezones: number;
    insights: string[];
  }> {
    try {
      const [countryStats, timezoneStats] = await Promise.all([
        this.getStatsByCountry(startDate, endDate),
        this.getConversionsByTimezone(startDate, endDate),
      ]);

      const insights: string[] = [];

      // Insights sur les pays
      if (countryStats.length > 0) {
        const topCountry = countryStats[0];
        insights.push(
          `${topCountry.countryName} génère ${topCountry.conversions} conversions (${((topCountry.conversions / countryStats.reduce((sum, c) => sum + c.conversions, 0)) * 100).toFixed(1)}% du total)`
        );

        // Revenu par pays
        const topRevenueCountry = countryStats.reduce((a, b) => a.revenue > b.revenue ? a : b);
        if (topRevenueCountry.country !== topCountry.country) {
          insights.push(
            `${topRevenueCountry.countryName} génère le plus de revenus (${topRevenueCountry.revenue.toFixed(0)}€)`
          );
        }
      }

      // Insights sur les timezones
      if (timezoneStats.length > 0) {
        const topTimezone = timezoneStats[0];
        if (topTimezone.peakHours.length > 0) {
          const peakHoursStr = topTimezone.peakHours.map(h => `${h}h`).join(', ');
          insights.push(
            `Heures de pointe pour ${topTimezone.timezone}: ${peakHoursStr}`
          );
        }

        // Diversité géographique
        const europeCount = timezoneStats.filter(t => t.region === 'Europe').length;
        const americaCount = timezoneStats.filter(t => t.region === 'America').length;
        const asiaCount = timezoneStats.filter(t => t.region === 'Asia').length;
        const africaCount = timezoneStats.filter(t => t.region === 'Africa').length;

        const regions = [
          { name: 'Europe', count: europeCount },
          { name: 'America', count: americaCount },
          { name: 'Asia', count: asiaCount },
          { name: 'Africa', count: africaCount },
        ].filter(r => r.count > 0);

        if (regions.length > 1) {
          insights.push(
            `Présence dans ${regions.length} régions: ${regions.map(r => r.name).join(', ')}`
          );
        }
      }

      return {
        topCountries: countryStats.slice(0, 5),
        topTimezones: timezoneStats.slice(0, 5),
        totalCountries: countryStats.length,
        totalTimezones: timezoneStats.length,
        insights,
      };
    } catch (error) {
      console.error('[AdAttribution] Error getting international summary:', error);
      return {
        topCountries: [],
        topTimezones: [],
        totalCountries: 0,
        totalTimezones: 0,
        insights: ['Erreur lors de l\'analyse internationale'],
      };
    }
  }
}

/* ------------------------------- Export ------------------------------------ */

export const adAttributionService = new AdAttributionService();

// Export des méthodes individuelles pour utilisation directe
export const trackAdLead = adAttributionService.trackLead.bind(adAttributionService);
export const trackAdRegistration = adAttributionService.trackRegistration.bind(adAttributionService);
export const trackAdPurchase = adAttributionService.trackPurchase.bind(adAttributionService);
export const trackAdContact = adAttributionService.trackContact.bind(adAttributionService);
export const trackAdInitiateCheckout = adAttributionService.trackInitiateCheckout.bind(adAttributionService);

export default adAttributionService;

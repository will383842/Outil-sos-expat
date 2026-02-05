/**
 * Provider Types for Dashboard Multiprestataire
 * Mirrors the sos_profiles collection structure
 */
import { Timestamp } from 'firebase/firestore';

/**
 * Provider type enum
 */
export type ProviderType = 'lawyer' | 'expat';

/**
 * Provider availability status
 */
export type AvailabilityStatus = 'available' | 'busy' | 'offline';

/**
 * Minimal provider info for lists and cards
 */
export interface ProviderSummary {
  id: string;
  name: string;
  email: string;
  type: ProviderType;
  photoURL?: string;
  availability: AvailabilityStatus;
  isOnline: boolean;
  isActive: boolean;
}

/**
 * Full provider profile from sos_profiles collection
 */
export interface Provider {
  id: string;
  userId: string;
  name: string;
  email: string;
  type: ProviderType;
  photoURL?: string;
  phone?: string;

  // Status
  availability: AvailabilityStatus;
  isOnline: boolean;
  isActive: boolean;
  isApproved: boolean;
  isVisible: boolean;

  // Professional info
  specialties?: string[];
  languages?: string[];
  bio?: string;
  experience?: number;

  // Location
  country?: string;
  timezone?: string;

  // Stats (denormalized)
  totalCalls?: number;
  totalHoursOnline?: number;
  rating?: number;
  reviewCount?: number;

  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastOnlineAt?: Timestamp | Date;
}

/**
 * Agency manager user with linked providers
 */
export interface AgencyManager {
  id: string;
  email: string;
  displayName: string;
  role: 'agency_manager';
  linkedProviderIds: string[];
  shareBusyStatus: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Normalize provider from Firestore document
 */
export function normalizeProvider(data: Partial<Provider> & { id: string }): Provider {
  return {
    id: data.id,
    userId: data.userId || data.id,
    name: data.name || 'Unknown',
    email: data.email || '',
    type: data.type || 'lawyer',
    photoURL: data.photoURL,
    phone: data.phone,
    availability: data.availability || 'offline',
    isOnline: data.isOnline ?? false,
    isActive: data.isActive ?? true,
    isApproved: data.isApproved ?? true,
    isVisible: data.isVisible ?? true,
    specialties: data.specialties || [],
    languages: data.languages || [],
    bio: data.bio,
    experience: data.experience,
    country: data.country,
    timezone: data.timezone,
    totalCalls: data.totalCalls || 0,
    totalHoursOnline: data.totalHoursOnline || 0,
    rating: data.rating,
    reviewCount: data.reviewCount || 0,
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
    lastOnlineAt: data.lastOnlineAt,
  };
}

/**
 * Convert to summary for lists
 */
export function toProviderSummary(provider: Provider): ProviderSummary {
  return {
    id: provider.id,
    name: provider.name,
    email: provider.email,
    type: provider.type,
    photoURL: provider.photoURL,
    availability: provider.availability,
    isOnline: provider.isOnline,
    isActive: provider.isActive,
  };
}

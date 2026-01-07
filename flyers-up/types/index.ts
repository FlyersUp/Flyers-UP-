/**
 * Core types for the Flyers Up application.
 * 
 * NOTE: The primary types are now defined in:
 * - types/database.ts - Supabase database schema types
 * - lib/api.ts - API response types that match the old mockApi interface
 * 
 * This file is kept for backwards compatibility and re-exports useful types.
 * When migrating, prefer using types from lib/api.ts for consistency.
 */

// Re-export database types
export type { UserRole, BookingStatus } from './database';

// Re-export API types for convenience
export type {
  ServiceCategory,
  ServicePro,
  Booking,
  CreateBookingPayload,
  EarningsSummary,
  AuthResponse,
  UserWithProfile,
} from '@/lib/api';

// Legacy type aliases (for backwards compatibility)
// These map to the new types but keep the old names
export type Role = 'customer' | 'pro' | 'admin';

// Base user type - represents any authenticated user
export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
}

// Customer-specific profile data (kept for reference)
export interface Customer extends User {
  role: 'customer';
  name: string;
  phone?: string;
  address?: string;
}

/**
 * @deprecated Use ServicePro from lib/api.ts instead
 * This interface is kept for backwards compatibility during migration.
 */
export interface LegacyServicePro extends User {
  role: 'pro';
  name: string;
  phone?: string;
  bio: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  startingPrice: number;
  location: string;
  available: boolean;
}

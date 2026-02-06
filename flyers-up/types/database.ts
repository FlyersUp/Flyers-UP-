/**
 * Database Types for Supabase
 * 
 * These types match the database schema defined in supabase/schema.sql.
 * They provide type safety when querying the database.
 * 
 * To regenerate these types from your actual Supabase schema, run:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Role type matching the database CHECK constraint
export type UserRole = 'customer' | 'pro' | 'admin';

// Booking status matching the database CHECK constraint
// 'declined' is treated as a type of cancellation (pro refused the request)
export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          full_name?: string | null;
          created_at?: string;
        };
      };
      service_categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
      };
      service_pros: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          bio: string | null;
          category_id: string;
          secondary_category_id?: string | null;
          service_area_zip?: string | null;
          starting_price: number;
          rating: number;
          review_count: number;
          location: string | null;
          available: boolean;
          service_radius?: number | null;
          business_hours?: string | null;
          years_experience?: number | null;
          services_offered?: string[] | null;
          certifications?: Json | null;
          service_types?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          bio?: string | null;
          category_id: string;
          secondary_category_id?: string | null;
          service_area_zip?: string | null;
          starting_price?: number;
          rating?: number;
          review_count?: number;
          location?: string | null;
          available?: boolean;
          service_radius?: number | null;
          business_hours?: string | null;
          years_experience?: number | null;
          services_offered?: string[] | null;
          certifications?: Json | null;
          service_types?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          bio?: string | null;
          category_id?: string;
          secondary_category_id?: string | null;
          service_area_zip?: string | null;
          starting_price?: number;
          rating?: number;
          review_count?: number;
          location?: string | null;
          available?: boolean;
          service_radius?: number | null;
          business_hours?: string | null;
          years_experience?: number | null;
          services_offered?: string[] | null;
          certifications?: Json | null;
          service_types?: Json | null;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          pro_id: string;
          service_date: string;
          service_time: string;
          address: string;
          notes: string | null;
          status: string;
          price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          pro_id: string;
          service_date: string;
          service_time: string;
          address: string;
          notes?: string | null;
          status?: string;
          price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          pro_id?: string;
          service_date?: string;
          service_time?: string;
          address?: string;
          notes?: string | null;
          status?: string;
          price?: number | null;
          created_at?: string;
        };
      };
      pro_earnings: {
        Row: {
          id: string;
          pro_id: string;
          booking_id: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pro_id: string;
          booking_id: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pro_id?: string;
          booking_id?: string;
          amount?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier access
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ServiceCategory = Database['public']['Tables']['service_categories']['Row'];
export type ServiceProRow = Database['public']['Tables']['service_pros']['Row'];
export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type ProEarning = Database['public']['Tables']['pro_earnings']['Row'];

// Joined types for common queries
export interface ServiceProWithCategory extends ServiceProRow {
  service_categories: ServiceCategory;
}

export interface BookingWithDetails extends BookingRow {
  service_pros: ServiceProRow & {
    service_categories: ServiceCategory;
  };
  profiles: Profile;
}


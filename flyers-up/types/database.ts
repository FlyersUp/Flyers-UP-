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
  | 'on_the_way'
  | 'in_progress'
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
          role: string | null;
          email: string | null;
          first_name: string | null;
          zip_code: string | null;
          onboarding_step: string | null;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          language_preference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: string | null;
          email?: string | null;
          first_name?: string | null;
          zip_code?: string | null;
          onboarding_step?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          language_preference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: string | null;
          email?: string | null;
          first_name?: string | null;
          zip_code?: string | null;
          onboarding_step?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          language_preference?: string | null;
          created_at?: string;
          updated_at?: string;
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
          is_public?: boolean | null;
          is_active_phase1?: boolean | null;
          parent_id?: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
          is_public?: boolean | null;
          is_active_phase1?: boolean | null;
          parent_id?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
          is_public?: boolean | null;
          is_active_phase1?: boolean | null;
          parent_id?: string | null;
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
          logo_url?: string | null;
          service_descriptions?: string | null;
          before_after_photos?: Json | null;
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
          logo_url?: string | null;
          service_descriptions?: string | null;
          before_after_photos?: Json | null;
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
          logo_url?: string | null;
          service_descriptions?: string | null;
          before_after_photos?: Json | null;
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
      admin_inputs: {
        Row: {
          id: string;
          key: string;
          value: string;
          month: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: string;
          month?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string;
          month?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_targets: {
        Row: {
          id: string;
          mrr_target: number | null;
          jobs_target: number | null;
          active_pros_target: number | null;
          fill_rate_target: number | null;
          time_to_match_target_hours: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mrr_target?: number | null;
          jobs_target?: number | null;
          active_pros_target?: number | null;
          fill_rate_target?: number | null;
          time_to_match_target_hours?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mrr_target?: number | null;
          jobs_target?: number | null;
          active_pros_target?: number | null;
          fill_rate_target?: number | null;
          time_to_match_target_hours?: number | null;
          updated_at?: string;
        };
      };
      admin_alerts_log: {
        Row: {
          id: string;
          type: string;
          severity: string;
          message: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          severity?: string;
          message: string;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          severity?: string;
          message?: string;
          meta?: Json;
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
export type AdminInput = Database['public']['Tables']['admin_inputs']['Row'];
export type AdminTarget = Database['public']['Tables']['admin_targets']['Row'];
export type AdminAlertLog = Database['public']['Tables']['admin_alerts_log']['Row'];

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


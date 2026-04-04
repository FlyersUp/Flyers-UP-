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

/** profiles.account_status (migration 106) */
export type ProfileAccountStatusDb = 'active' | 'deactivated' | 'deleted';

// Booking status matching the database CHECK constraint (migrations 042, 047)
export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'pending'
  | 'payment_required'
  | 'deposit_paid'
  | 'fully_paid'
  | 'pending_pro_acceptance'
  | 'awaiting_deposit_payment'
  | 'on_the_way'
  | 'pro_en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed_pending_payment'
  | 'awaiting_payment'
  | 'work_completed_by_pro'
  | 'awaiting_remaining_payment'
  | 'awaiting_customer_confirmation'
  | 'completed'
  | 'review_pending'
  | 'paid'
  | 'expired_unpaid'
  | 'cancelled'
  | 'declined'
  | 'cancelled_expired'
  | 'cancelled_by_customer'
  | 'cancelled_by_pro'
  | 'cancelled_admin';

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
          account_status: ProfileAccountStatusDb;
          closed_at: string | null;
          closure_requested_at: string | null;
          closure_reason: string | null;
          deactivated_at: string | null;
          scheduled_deletion_at: string | null;
          deletion_reason: string | null;
          deleted_at: string | null;
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
          account_status?: ProfileAccountStatusDb;
          closed_at?: string | null;
          closure_requested_at?: string | null;
          closure_reason?: string | null;
          deactivated_at?: string | null;
          scheduled_deletion_at?: string | null;
          deletion_reason?: string | null;
          deleted_at?: string | null;
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
          account_status?: ProfileAccountStatusDb;
          closed_at?: string | null;
          closure_requested_at?: string | null;
          closure_reason?: string | null;
          deactivated_at?: string | null;
          scheduled_deletion_at?: string | null;
          deletion_reason?: string | null;
          deleted_at?: string | null;
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
          closed_at: string | null;
          available_before_deactivation?: boolean | null;
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
          closed_at?: string | null;
          available_before_deactivation?: boolean | null;
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
          closed_at?: string | null;
          available_before_deactivation?: boolean | null;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string | null;
          pro_id: string;
          service_date: string;
          service_time: string;
          booking_timezone: string;
          address: string;
          notes: string | null;
          status: string;
          price: number | null;
          created_at: string;
          duration_hours?: number | null;
          miles_distance?: number | null;
          selected_package_id?: string | null;
          selected_package_snapshot?: Json | null;
          /** Money / pricing snapshot (migrations 042+, 107) */
          payment_status?: string | null;
          final_payment_status?: string | null;
          subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          refunded_total_cents?: number | null;
        };
        Insert: {
          id?: string;
          customer_id?: string;
          pro_id: string;
          service_date: string;
          service_time: string;
          booking_timezone?: string;
          address: string;
          notes?: string | null;
          status?: string;
          price?: number | null;
          created_at?: string;
          duration_hours?: number | null;
          miles_distance?: number | null;
          selected_package_id?: string | null;
          selected_package_snapshot?: Json | null;
          payment_status?: string | null;
          final_payment_status?: string | null;
          subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          refunded_total_cents?: number | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          pro_id?: string;
          service_date?: string;
          service_time?: string;
          booking_timezone?: string;
          address?: string;
          notes?: string | null;
          status?: string;
          price?: number | null;
          created_at?: string;
          duration_hours?: number | null;
          miles_distance?: number | null;
          selected_package_id?: string | null;
          selected_package_snapshot?: Json | null;
          payment_status?: string | null;
          final_payment_status?: string | null;
          subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          refunded_total_cents?: number | null;
        };
      };
      booking_payment_intent_stripe_fees: {
        Row: {
          payment_intent_id: string;
          booking_id: string;
          stripe_fee_cents: number;
          created_at: string;
        };
        Insert: {
          payment_intent_id: string;
          booking_id: string;
          stripe_fee_cents: number;
          created_at?: string;
        };
        Update: {
          payment_intent_id?: string;
          booking_id?: string;
          stripe_fee_cents?: number;
          created_at?: string;
        };
      };
      service_packages: {
        Row: {
          id: string;
          pro_user_id: string;
          title: string;
          short_description: string | null;
          base_price_cents: number;
          estimated_duration_minutes: number | null;
          deliverables: Json;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pro_user_id: string;
          title: string;
          short_description?: string | null;
          base_price_cents: number;
          estimated_duration_minutes?: number | null;
          deliverables?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pro_user_id?: string;
          title?: string;
          short_description?: string | null;
          base_price_cents?: number;
          estimated_duration_minutes?: number | null;
          deliverables?: Json;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
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


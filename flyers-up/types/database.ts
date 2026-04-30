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
      booking_money_reconciliation_ops: {
        Row: {
          booking_id: string;
          assigned_to: string | null;
          last_reviewed_at: string | null;
          ops_note: string | null;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          assigned_to?: string | null;
          last_reviewed_at?: string | null;
          ops_note?: string | null;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          assigned_to?: string | null;
          last_reviewed_at?: string | null;
          ops_note?: string | null;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string | null;
          /** Apple App Review demo automation (migration 141); always false for normal users. */
          app_review_demo?: boolean;
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
          /** Money / pricing snapshot (migrations 042+, 107, 124, 125) */
          payment_status?: string | null;
          final_payment_status?: string | null;
          subtotal_cents?: number | null;
          service_fee_cents?: number | null;
          convenience_fee_cents?: number | null;
          protection_fee_cents?: number | null;
          demand_fee_cents?: number | null;
          original_subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          stripe_net_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          charge_model?: string | null;
          pro_earnings_cents?: number | null;
          platform_revenue_cents?: number | null;
          flat_fee_cents?: number | null;
          hourly_rate_cents?: number | null;
          base_fee_cents?: number | null;
          included_hours?: number | null;
          actual_hours_estimate?: number | null;
          overage_hourly_rate_cents?: number | null;
          minimum_job_cents?: number | null;
          demand_multiplier?: number | null;
          refunded_total_cents?: number | null;
          suggested_price_cents?: number | null;
          was_below_suggestion?: boolean | null;
          was_below_minimum?: boolean | null;
          /** Migration 112: marketplace payment lifecycle (parallel to legacy payment_status) */
          service_status?: string | null;
          payment_lifecycle_status?: string | null;
          dispute_status?: string | null;
          payout_hold_reason?: string | null;
          platform_fee_cents?: number | null;
          final_amount_cents?: number | null;
          tip_amount_cents?: number | null;
          tax_amount_cents?: number | null;
          stripe_customer_id?: string | null;
          saved_payment_method_id?: string | null;
          payment_method_brand?: string | null;
          payment_method_last4?: string | null;
          off_session_ready?: boolean | null;
          deposit_payment_intent_id?: string | null;
          payout_transfer_id?: string | null;
          refunded_at?: string | null;
          customer_review_deadline_at?: string | null;
          payout_processing_started_at?: string | null;
          payout_stuck_detected_at?: string | null;
          payout_needs_admin_review?: boolean | null;
          final_charge_attempted_at?: string | null;
          final_charge_retry_count?: number | null;
          final_payment_retry_reason?: string | null;
          last_failure_code?: string | null;
          last_failure_message?: string | null;
          requires_customer_action_at?: string | null;
          payment_failed_at?: string | null;
          final_charge_id?: string | null;
          amount_refunded_cents?: number | null;
          amount_paid_cents?: number | null;
          refund_after_payout?: boolean | null;
          pro_clawback_remediation_status?: string | null;
          stripe_outbound_recovery_status?: string | null;
          payout_amount_cents?: number | null;
          payout_blocked?: boolean | null;
          requires_admin_review?: boolean | null;
          issue_reported_at?: string | null;
          issue_summary?: string | null;
          admin_hold?: boolean | null;
          admin_hold_reason?: string | null;
          payout_failure_reason?: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string;
          app_review_demo?: boolean;
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
          service_fee_cents?: number | null;
          convenience_fee_cents?: number | null;
          protection_fee_cents?: number | null;
          demand_fee_cents?: number | null;
          original_subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          stripe_net_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          charge_model?: string | null;
          pro_earnings_cents?: number | null;
          platform_revenue_cents?: number | null;
          flat_fee_cents?: number | null;
          hourly_rate_cents?: number | null;
          base_fee_cents?: number | null;
          included_hours?: number | null;
          actual_hours_estimate?: number | null;
          overage_hourly_rate_cents?: number | null;
          minimum_job_cents?: number | null;
          demand_multiplier?: number | null;
          refunded_total_cents?: number | null;
          suggested_price_cents?: number | null;
          was_below_suggestion?: boolean;
          was_below_minimum?: boolean;
          service_status?: string | null;
          payment_lifecycle_status?: string | null;
          dispute_status?: string | null;
          payout_hold_reason?: string | null;
          platform_fee_cents?: number | null;
          final_amount_cents?: number | null;
          tip_amount_cents?: number | null;
          tax_amount_cents?: number | null;
          stripe_customer_id?: string | null;
          saved_payment_method_id?: string | null;
          payment_method_brand?: string | null;
          payment_method_last4?: string | null;
          off_session_ready?: boolean | null;
          deposit_payment_intent_id?: string | null;
          payout_transfer_id?: string | null;
          refunded_at?: string | null;
          customer_review_deadline_at?: string | null;
          payout_processing_started_at?: string | null;
          payout_stuck_detected_at?: string | null;
          payout_needs_admin_review?: boolean | null;
          final_charge_attempted_at?: string | null;
          final_charge_retry_count?: number | null;
          final_payment_retry_reason?: string | null;
          last_failure_code?: string | null;
          last_failure_message?: string | null;
          requires_customer_action_at?: string | null;
          payment_failed_at?: string | null;
          final_charge_id?: string | null;
          amount_refunded_cents?: number | null;
          amount_paid_cents?: number | null;
          refund_after_payout?: boolean | null;
          pro_clawback_remediation_status?: string | null;
          stripe_outbound_recovery_status?: string | null;
          payout_amount_cents?: number | null;
          payout_blocked?: boolean | null;
          requires_admin_review?: boolean | null;
          issue_reported_at?: string | null;
          issue_summary?: string | null;
          admin_hold?: boolean | null;
          admin_hold_reason?: string | null;
          payout_failure_reason?: string | null;
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
          service_fee_cents?: number | null;
          convenience_fee_cents?: number | null;
          protection_fee_cents?: number | null;
          demand_fee_cents?: number | null;
          original_subtotal_cents?: number | null;
          fee_total_cents?: number | null;
          customer_total_cents?: number | null;
          amount_platform_fee?: number | null;
          stripe_estimated_fee_cents?: number | null;
          stripe_actual_fee_cents?: number | null;
          stripe_net_cents?: number | null;
          platform_gross_margin_cents?: number | null;
          contribution_margin_cents?: number | null;
          effective_take_rate?: number | null;
          pricing_version?: string | null;
          pricing_band?: string | null;
          charge_model?: string | null;
          pro_earnings_cents?: number | null;
          platform_revenue_cents?: number | null;
          flat_fee_cents?: number | null;
          hourly_rate_cents?: number | null;
          base_fee_cents?: number | null;
          included_hours?: number | null;
          actual_hours_estimate?: number | null;
          overage_hourly_rate_cents?: number | null;
          minimum_job_cents?: number | null;
          demand_multiplier?: number | null;
          refunded_total_cents?: number | null;
          suggested_price_cents?: number | null;
          was_below_suggestion?: boolean;
          was_below_minimum?: boolean;
          service_status?: string | null;
          payment_lifecycle_status?: string | null;
          dispute_status?: string | null;
          payout_hold_reason?: string | null;
          platform_fee_cents?: number | null;
          final_amount_cents?: number | null;
          tip_amount_cents?: number | null;
          tax_amount_cents?: number | null;
          stripe_customer_id?: string | null;
          saved_payment_method_id?: string | null;
          payment_method_brand?: string | null;
          payment_method_last4?: string | null;
          off_session_ready?: boolean | null;
          deposit_payment_intent_id?: string | null;
          payout_transfer_id?: string | null;
          refunded_at?: string | null;
          customer_review_deadline_at?: string | null;
          payout_processing_started_at?: string | null;
          payout_stuck_detected_at?: string | null;
          payout_needs_admin_review?: boolean | null;
          final_charge_attempted_at?: string | null;
          final_charge_retry_count?: number | null;
          final_payment_retry_reason?: string | null;
          last_failure_code?: string | null;
          last_failure_message?: string | null;
          requires_customer_action_at?: string | null;
          payment_failed_at?: string | null;
          final_charge_id?: string | null;
          amount_refunded_cents?: number | null;
          amount_paid_cents?: number | null;
          refund_after_payout?: boolean | null;
          pro_clawback_remediation_status?: string | null;
          stripe_outbound_recovery_status?: string | null;
          payout_amount_cents?: number | null;
          payout_blocked?: boolean | null;
          requires_admin_review?: boolean | null;
          issue_reported_at?: string | null;
          issue_summary?: string | null;
          admin_hold?: boolean | null;
          admin_hold_reason?: string | null;
          payout_failure_reason?: string | null;
        };
      };
      booking_payment_intent_stripe_fees: {
        Row: {
          payment_intent_id: string;
          booking_id: string;
          stripe_fee_cents: number;
          stripe_net_cents?: number | null;
          created_at: string;
        };
        Insert: {
          payment_intent_id: string;
          booking_id: string;
          stripe_fee_cents: number;
          stripe_net_cents?: number | null;
          created_at?: string;
        };
        Update: {
          payment_intent_id?: string;
          booking_id?: string;
          stripe_fee_cents?: number;
          stripe_net_cents?: number | null;
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
      category_borough_status: {
        Row: {
          id: string;
          occupation_slug: string;
          borough_slug: string;
          active_pro_count: number;
          visible_state: 'strong' | 'weak' | 'inactive';
          is_customer_visible: boolean;
          force_hidden: boolean;
          force_visible: boolean;
          last_checked_at: string;
          ops_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          occupation_slug: string;
          borough_slug: string;
          active_pro_count?: number;
          visible_state: 'strong' | 'weak' | 'inactive';
          is_customer_visible?: boolean;
          force_hidden?: boolean;
          force_visible?: boolean;
          last_checked_at?: string;
          ops_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          occupation_slug?: string;
          borough_slug?: string;
          active_pro_count?: number;
          visible_state?: 'strong' | 'weak' | 'inactive';
          is_customer_visible?: boolean;
          force_hidden?: boolean;
          force_visible?: boolean;
          last_checked_at?: string;
          ops_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_requests: {
        Row: {
          id: string;
          customer_id: string;
          occupation_slug: string;
          borough_slug: string;
          preferred_time: string | null;
          urgency: 'asap' | 'today' | 'flexible';
          notes: string | null;
          status:
            | 'pending_review'
            | 'candidate_selected'
            | 'offer_sent'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'matched'
            | 'fallback_needed';
          matched_pro_id: string | null;
          booking_id: string | null;
          matched_by_user_id: string | null;
          matched_at?: string | null;
          outreach_cap?: number;
          outreach_attempt_count?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          occupation_slug: string;
          borough_slug: string;
          preferred_time?: string | null;
          urgency: 'asap' | 'today' | 'flexible';
          notes?: string | null;
          status?:
            | 'pending_review'
            | 'candidate_selected'
            | 'offer_sent'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'matched'
            | 'fallback_needed';
          matched_pro_id?: string | null;
          booking_id?: string | null;
          matched_by_user_id?: string | null;
          matched_at?: string | null;
          outreach_cap?: number;
          outreach_attempt_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          occupation_slug?: string;
          borough_slug?: string;
          preferred_time?: string | null;
          urgency?: 'asap' | 'today' | 'flexible';
          notes?: string | null;
          status?:
            | 'pending_review'
            | 'candidate_selected'
            | 'offer_sent'
            | 'accepted'
            | 'declined'
            | 'expired'
            | 'matched'
            | 'fallback_needed';
          matched_pro_id?: string | null;
          booking_id?: string | null;
          matched_by_user_id?: string | null;
          matched_at?: string | null;
          outreach_cap?: number;
          outreach_attempt_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_outreach_log: {
        Row: {
          id: string;
          match_request_id: string;
          pro_id: string;
          outreach_channel: 'push' | 'sms' | 'manual';
          outreach_status:
            | 'not_contacted'
            | 'push_sent'
            | 'sms_sent'
            | 'viewed'
            | 'accepted'
            | 'declined'
            | 'no_response';
          sent_at: string;
          responded_at: string | null;
          notes: string | null;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_request_id: string;
          pro_id: string;
          outreach_channel: 'push' | 'sms' | 'manual';
          outreach_status?:
            | 'not_contacted'
            | 'push_sent'
            | 'sms_sent'
            | 'viewed'
            | 'accepted'
            | 'declined'
            | 'no_response';
          sent_at?: string;
          responded_at?: string | null;
          notes?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_request_id?: string;
          pro_id?: string;
          outreach_channel?: 'push' | 'sms' | 'manual';
          outreach_status?:
            | 'not_contacted'
            | 'push_sent'
            | 'sms_sent'
            | 'viewed'
            | 'accepted'
            | 'declined'
            | 'no_response';
          sent_at?: string;
          responded_at?: string | null;
          notes?: string | null;
          created_by_user_id?: string | null;
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


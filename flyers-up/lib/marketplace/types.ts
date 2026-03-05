/**
 * Marketplace types: Surge Pricing, Demand Heatmap, Instant Job Claim
 */

export type DemandRequestUrgency = 'normal' | 'priority' | 'emergency';
export type DemandRequestStatus = 'open' | 'claimed' | 'closed' | 'expired' | 'cancelled';

export interface DemandRequest {
  id: string;
  created_at: string;
  customer_id: string | null;
  service_slug: string;
  subcategory_slug: string | null;
  borough: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_for: string | null;
  urgency: DemandRequestUrgency;
  status: DemandRequestStatus;
  claimed_by_pro_id: string | null;
  claimed_at: string | null;
  base_price_cents: number;
  surge_multiplier: number;
  final_price_cents: number;
}

export interface DemandCell {
  cell_key: string;
  service_slug: string;
  open_requests: number;
  pros_online: number;
  surge_multiplier: number;
  updated_at?: string;
}

export interface HeatmapResponse {
  cells: DemandCell[];
}

export interface SurgeRules {
  enabled: boolean;
  maxMultiplier: number;
  minMultiplier: number;
  targetRequestsPerPro: number;
  urgencyBoost: Record<string, number>;
}

export interface HeatmapRules {
  enabled: boolean;
  cellMode: string;
  staleMinutes: number;
}

export interface ClaimRules {
  enabled: boolean;
  holdSeconds: number;
}

export interface MarketplaceEvent {
  id: string;
  created_at: string;
  actor_type: 'system' | 'admin' | 'customer' | 'pro';
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
}

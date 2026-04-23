/**
 * Types for hybrid marketplace UI (customer + admin).
 * Wire to Supabase later: match_requests, category_borough_status, service_pros, etc.
 */

export type SupplyState = 'strong' | 'weak' | 'inactive';

export type MatchRequestUrgency = 'asap' | 'today' | 'flexible';

/** Raw / mapped lifecycle for queue table styling */
export type MatchQueueStatusKey = string;

export interface TrustPill {
  id: string;
  label: string;
  variant: 'accent' | 'trust' | 'neutral';
}

export interface TrustStripItem {
  id: string;
  title: string;
  description: string;
  icon: 'check' | 'wallet' | 'headset';
}

export interface HybridFeaturedPro {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  descriptor: string;
  specialistLabel?: string;
  rating: number;
  jobsLabel: string;
}

export interface OccupationPageContent {
  locationPill: string;
  headline: string;
  supporting: string;
  chips: string[];
  /** STRONG only */
  featuredPro?: HybridFeaturedPro;
  /** WEAK only */
  availabilityTitle?: string;
  availabilityBody?: string;
  /** INACTIVE only */
  spotlightLabel?: string;
  heroPlaceholder?: 'dj' | 'generic';
}

export interface MatchQueueRow {
  id: string;
  displayId: string;
  customerName: string;
  customerAvatarUrl?: string | null;
  occupation: string;
  borough: string;
  urgency: MatchRequestUrgency;
  urgencyLabel: string;
  status: MatchQueueStatusKey;
  statusLabel: string;
  createdAt: string;
}

export interface AdminKpiStat {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export type ResponseSpeedBadge = 'fast' | 'medium' | 'slow' | 'unknown';

export interface CandidatePro {
  id: string;
  /** 1-based display rank */
  rank: number;
  rankScore: number;
  name: string;
  avatarUrl?: string | null;
  rating: number;
  jobsCompleted: number;
  /** Bookings created in the last 7 days (overload signal) */
  jobsThisWeek: number;
  neighborhoods: string;
  tags: string[];
  responseLabel: string;
  responseSpeed: ResponseSpeedBadge;
  /** Minutes since last outreach log for this request+pro, if any */
  lastContactedMinutesAgo: number | null;
}

export interface OutreachLogEntry {
  id: string;
  at: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
  /** Raw outreach_status for admin badges */
  statusKey?: string;
}

export interface BoroughHealthRow {
  id: string;
  occupation: string;
  activePros: number;
  state: SupplyState;
  responseReliability: string;
  weakSignals: string;
  opsNote?: string;
  forceVisible: boolean;
  forceHidden: boolean;
}

export interface ProAvailabilityRow {
  id: string;
  name: string;
  email: string;
  occupation: string;
  neighborhoods: string;
  borough: string;
  verified: boolean;
  activityLabel: string;
  activityTone: 'good' | 'warn' | 'muted';
  activeThisWeek: boolean;
  paused: boolean;
  matchable: boolean;
}

export type TimelineStepState = 'complete' | 'active' | 'pending';

export interface RequestTimelineStep {
  id: string;
  title: string;
  description: string;
  state: TimelineStepState;
}

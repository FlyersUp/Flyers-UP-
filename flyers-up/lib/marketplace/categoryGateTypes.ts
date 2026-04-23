export type CategoryVisibleState = 'strong' | 'weak' | 'inactive';

export type MatchRequestUrgency = 'asap' | 'today' | 'flexible';

export type MatchRequestStatus =
  | 'pending_review'
  | 'candidate_selected'
  | 'offer_sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'matched'
  | 'fallback_needed';

export type MatchOutreachChannel = 'push' | 'sms' | 'manual';

export type MatchOutreachStatus =
  | 'not_contacted'
  | 'push_sent'
  | 'sms_sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'no_response';

export interface CategoryGateResolution {
  visibleState: CategoryVisibleState;
  isCustomerVisible: boolean;
}

export interface CategoryGateRowView {
  occupationSlug: string;
  boroughSlug: string;
  activeProCount: number;
  visibleState: CategoryVisibleState;
  isCustomerVisible: boolean;
  forceHidden: boolean;
  forceVisible: boolean;
  lastCheckedAt: string;
  opsNote: string | null;
}

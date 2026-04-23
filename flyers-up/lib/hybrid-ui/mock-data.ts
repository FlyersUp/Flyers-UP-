import type {
  AdminKpiStat,
  BoroughHealthRow,
  CandidatePro,
  HybridFeaturedPro,
  MatchQueueRow,
  MatchRequestUrgency,
  OccupationPageContent,
  OutreachLogEntry,
  ProAvailabilityRow,
  RequestTimelineStep,
  TrustPill,
  TrustStripItem,
} from '@/lib/hybrid-ui/types';

export const MOCK_TRUST_PILLS_HOME: TrustPill[] = [
  { id: '1', label: 'Neighborhood Favorite', variant: 'accent' },
  { id: '2', label: 'NYC Verified', variant: 'trust' },
];

export const MOCK_TRUST_STRIP: TrustStripItem[] = [
  {
    id: 'v',
    title: 'Verified NYC Pros',
    description: 'Background checked & vetted',
    icon: 'check',
  },
  {
    id: 'p',
    title: 'Clear Pricing',
    description: 'No hidden fees, local rates',
    icon: 'wallet',
  },
  {
    id: 's',
    title: '24/7 Local Support',
    description: 'Always here to help you',
    icon: 'headset',
  },
];

export const MOCK_FEATURED_PRO_CLEANING: HybridFeaturedPro = {
  id: 'pro-elena',
  name: 'Elena Rodriguez',
  initials: 'ER',
  descriptor: 'Premium brownstone specialist',
  specialistLabel: 'Premium Brownstone Specialist',
  rating: 4.9,
  jobsLabel: '214 jobs',
};

export const MOCK_OCCUPATION_STRONG: OccupationPageContent = {
  locationPill: 'Brooklyn, NY',
  headline: 'Premium Cleaning in the Neighborhood.',
  supporting:
    'Curated cleaners who know NYC homes—from pre-war details to new builds. Book vetted pros with clear, local pricing.',
  chips: ['Deep Clean', 'Eco-Friendly', 'Last Minute'],
  featuredPro: MOCK_FEATURED_PRO_CLEANING,
};

export const MOCK_OCCUPATION_WEAK: OccupationPageContent = {
  locationPill: 'Williamsburg, NY',
  headline: 'Handyman Services',
  supporting:
    'Connect with trusted neighborhood craftsmen for repairs, installs, and small projects. Same-day options when pros are available.',
  chips: ['Plumbing', 'Electrical', 'Mounting'],
  availabilityTitle: 'Availability is limited right now',
  availabilityBody:
    'Demand is high in Williamsburg this week. Fewer pros have open slots for instant booking—but we can still match you through our concierge queue and follow up fast.',
};

export const MOCK_OCCUPATION_INACTIVE: OccupationPageContent = {
  locationPill: 'Brooklyn, NY',
  headline: 'DJ & Sound Curation',
  supporting:
    'Bespoke soundtracks and thoughtful setups for weddings, rooftops, and neighborhood events. This category is match-led so we can pair you with the right talent.',
  chips: ['Weddings', 'Corporate', 'Private'],
  spotlightLabel: 'Service Spotlight',
  heroPlaceholder: 'dj',
};

export const MOCK_MATCH_QUEUE_KPIS: AdminKpiStat[] = [
  { id: 'p', label: 'Pending Requests', value: 142, trend: 'up', trendLabel: 'Up' },
  { id: 'o', label: 'Offers Sent', value: 89, trendLabel: 'New' },
  { id: 'a', label: 'Accepted', value: '1,204', hint: '82.4% win rate' },
  { id: 'e', label: 'Expired', value: 34, trend: 'down', trendLabel: '7%' },
];

export const MOCK_MATCH_QUEUE_ROWS: MatchQueueRow[] = [
  {
    id: '1',
    displayId: '#FU-3241',
    customerName: 'Julianne Abernathy',
    occupation: 'Plumbing',
    borough: 'Brooklyn',
    urgency: 'asap' as MatchRequestUrgency,
    urgencyLabel: 'Immediate',
    status: 'candidate_selected',
    statusLabel: 'Matching',
    createdAt: '2026-04-22T14:20:00Z',
  },
  {
    id: '2',
    displayId: '#FU-3240',
    customerName: 'Marcus Chen',
    occupation: 'Electrical',
    borough: 'Manhattan',
    urgency: 'today' as MatchRequestUrgency,
    urgencyLabel: 'Next day',
    status: 'offer_sent',
    statusLabel: 'Offer sent',
    createdAt: '2026-04-22T11:05:00Z',
  },
  {
    id: '3',
    displayId: '#FU-3238',
    customerName: 'Samira Okonkwo',
    occupation: 'Landscaping',
    borough: 'Queens',
    urgency: 'flexible' as MatchRequestUrgency,
    urgencyLabel: 'Flexible',
    status: 'pending_review',
    statusLabel: 'Pending',
    createdAt: '2026-04-21T09:00:00Z',
  },
];

export const MOCK_CANDIDATE_PROS: CandidatePro[] = [
  {
    id: 'c1',
    rank: 1,
    rankScore: 98,
    name: 'Marcus Vane',
    rating: 4.9,
    jobsCompleted: 312,
    jobsThisWeek: 4,
    neighborhoods: 'Park Slope, Carroll Gardens',
    tags: ['Heritage woodwork', 'Restoration'],
    responseLabel: 'Usually replies in 12m',
    responseSpeed: 'fast',
    lastContactedMinutesAgo: 18,
  },
  {
    id: 'c2',
    rank: 2,
    rankScore: 91,
    name: 'Sarah Landrum',
    rating: 4.8,
    jobsCompleted: 188,
    jobsThisWeek: 2,
    neighborhoods: 'Brooklyn Heights, DUMBO',
    tags: ['Built-ins', 'Finishing'],
    responseLabel: 'Usually replies in 25m',
    responseSpeed: 'medium',
    lastContactedMinutesAgo: null,
  },
];

export const MOCK_OUTREACH_LOG: OutreachLogEntry[] = [
  {
    id: '1',
    at: '2026-04-22T14:22:00Z',
    message: 'Match request created',
    tone: 'info',
    statusKey: 'not_contacted',
  },
  {
    id: '2',
    at: '2026-04-22T14:28:00Z',
    message: 'Push notification sent to 3 pros',
    tone: 'success',
    statusKey: 'push_sent',
  },
  {
    id: '3',
    at: '2026-04-22T15:01:00Z',
    message: 'SMS sent to Marcus Vane',
    tone: 'info',
    statusKey: 'sms_sent',
  },
];

export const MOCK_BOROUGH_HEALTH_ROWS: BoroughHealthRow[] = [
  {
    id: '1',
    occupation: 'Pet Sitting',
    activePros: 42,
    state: 'strong',
    responseReliability: '94%',
    weakSignals: '—',
    opsNote: 'Optimal coverage',
    forceVisible: false,
    forceHidden: false,
  },
  {
    id: '2',
    occupation: 'Landscaping',
    activePros: 8,
    state: 'weak',
    responseReliability: '78%',
    weakSignals: 'Low weekend slots',
    opsNote: 'Promote match queue',
    forceVisible: false,
    forceHidden: false,
  },
  {
    id: '3',
    occupation: 'Emergency Plumbing',
    activePros: 0,
    state: 'inactive',
    responseReliability: '—',
    weakSignals: 'No verified pros',
    opsNote: 'Request-only',
    forceVisible: false,
    forceHidden: false,
  },
];

export const MOCK_PRO_AVAILABILITY: ProAvailabilityRow[] = [
  {
    id: 'p1',
    name: 'Avery Brooks',
    email: 'avery.b@example.com',
    occupation: 'Handyman',
    neighborhoods: 'Williamsburg, Greenpoint',
    borough: 'Brooklyn',
    verified: true,
    activityLabel: 'Active today',
    activityTone: 'good',
    activeThisWeek: true,
    paused: false,
    matchable: true,
  },
  {
    id: 'p2',
    name: 'Jordan Lee',
    email: 'jordan.lee@example.com',
    occupation: 'Cleaner',
    neighborhoods: 'UES, Midtown',
    borough: 'Manhattan',
    verified: true,
    activityLabel: 'Quiet 48h',
    activityTone: 'warn',
    activeThisWeek: true,
    paused: false,
    matchable: true,
  },
  {
    id: 'p3',
    name: 'Riley Santos',
    email: 'riley.s@example.com',
    occupation: 'DJ',
    neighborhoods: 'Bushwick',
    borough: 'Brooklyn',
    verified: false,
    activityLabel: 'Paused',
    activityTone: 'muted',
    activeThisWeek: false,
    paused: true,
    matchable: false,
  },
];

export const MOCK_REQUEST_TIMELINE: RequestTimelineStep[] = [
  {
    id: '1',
    title: 'Request received',
    description: 'Your flyer has been posted to the Digital Civic Center.',
    state: 'complete',
  },
  {
    id: '2',
    title: 'Pros being contacted',
    description: 'Matching with high-rated professionals in your immediate area.',
    state: 'active',
  },
  {
    id: '3',
    title: 'Match confirmed',
    description: "We'll introduce you to your neighborhood pro shortly.",
    state: 'pending',
  },
];

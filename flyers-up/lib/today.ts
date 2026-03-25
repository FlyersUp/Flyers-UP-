import { getProJobs } from '@/lib/api';
import {
  DEFAULT_BOOKING_TIMEZONE,
  todayIsoInBookingTimezone,
  bookingWallTimeToUtcDate,
  addHoursToUtcIso,
  normalizeBookingTimeZone,
} from '@/lib/datetime';

export type TodayJobStatus = 'upcoming' | 'in_progress' | 'completed' | 'delayed';
export type TodayRiskLevel = 'low' | 'medium' | 'high';

export type TodayJob = {
  id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  client_name: string;
  client_phone?: string | null;
  address: string;
  service_type: string;
  status: TodayJobStatus;
  dbStatus?: string; // Raw DB booking status for API transitions
  eta_minutes?: number | null;
  risk: TodayRiskLevel;
  bookingId?: string;
};

export type TodayAlert = {
  id: string;
  type: 'late_risk' | 'pending_message' | 'missing_task' | 'general';
  title: string;
  ctaLabel?: string;
};

export type TodayTask = {
  id: string;
  title: string;
  helper?: string;
  done: boolean;
};

export type TodayMessageThread = {
  thread_id: string;
  client_name: string;
  snippet: string;
  updated_at: string; // ISO
};

export type TodayEarnings = {
  expected: number | null;
  completed: number | null;
  pending_release: number | null;
  tips: number | null;
};

export type TodayOverview = {
  dateISO: string; // YYYY-MM-DD (local)
  jobs: TodayJob[];
  alerts: TodayAlert[];
  tasks: TodayTask[];
  earnings: TodayEarnings;
  messages: TodayMessageThread[];
};

function deriveRisk(jobStart: Date, etaMinutes: number | null | undefined): TodayRiskLevel {
  if (etaMinutes == null) return 'low';
  // Simple heuristic: if ETA pushes arrival close to (or past) start time, raise risk.
  const now = new Date();
  const etaAt = new Date(now.getTime() + etaMinutes * 60000);
  const diff = jobStart.getTime() - etaAt.getTime();
  if (diff < -5 * 60000) return 'high';
  if (diff < 10 * 60000) return 'medium';
  return 'low';
}

function inferStatusesForToday(jobs: TodayJob[]): TodayJob[] {
  const now = new Date();
  // If nothing is marked in_progress, promote the nearest started-but-not-completed job.
  const hasInProgress = jobs.some((j) => j.status === 'in_progress');
  if (hasInProgress) return jobs;

  const sorted = [...jobs].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const candidate = sorted.find((j) => {
    if (j.status === 'completed') return false;
    const start = new Date(j.start_time).getTime();
    return start <= now.getTime();
  });

  if (!candidate) return jobs;
  return jobs.map((j) => (j.id === candidate.id ? { ...j, status: 'in_progress' as TodayJobStatus } : j));
}

function buildDefaultTasks(): TodayTask[] {
  return [
    { id: 'photos', title: 'Upload before/after photos', helper: 'Attach to today’s completed jobs.', done: false },
    { id: 'offer', title: 'Accept pending offer', helper: 'If you received a new request today.', done: false },
    { id: 'arrival', title: 'Confirm arrival', helper: 'Send a quick update when you arrive.', done: false },
    { id: 'docs', title: 'Submit documentation', helper: 'Only if required for this job type.', done: false },
  ];
}

export async function getTodayOverview(proUserId: string): Promise<TodayOverview> {
  const dateISO = todayIsoInBookingTimezone(DEFAULT_BOOKING_TIMEZONE);

  // Prefer real jobs if Supabase is configured.
  const SUPABASE_CONFIGURED = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let jobs: TodayJob[] = [];
  if (SUPABASE_CONFIGURED) {
    const all = await getProJobs(proUserId);
    const todays = (all || []).filter((b) => b.date === dateISO);

    const tzFor = (b: (typeof todays)[number]) =>
      normalizeBookingTimeZone(b.bookingTimezone ?? DEFAULT_BOOKING_TIMEZONE);

    jobs = todays
      .flatMap((b) => {
        const zone = tzFor(b);
        const startAt =
          bookingWallTimeToUtcDate(b.date, b.time, zone) ??
          bookingWallTimeToUtcDate(b.date, '9:00 AM', zone);
        if (!startAt) return [];
        const endIso = addHoursToUtcIso(startAt.toISOString(), 1);
        const endAt = endIso ? new Date(endIso) : new Date(startAt.getTime() + 60 * 60000);

        const dbStatus = b.status as string;
        let status: TodayJobStatus = 'upcoming';
        if (dbStatus === 'completed' || dbStatus === 'paid' || dbStatus === 'cancelled' || dbStatus === 'declined') status = 'completed';
        if (['awaiting_remaining_payment', 'awaiting_payment', 'completed_pending_payment', 'awaiting_customer_confirmation'].includes(dbStatus)) status = 'completed';
        if (dbStatus === 'in_progress') status = 'in_progress';
        if (dbStatus === 'pro_en_route' || dbStatus === 'on_the_way') status = 'upcoming';

        const eta = null;
        const job: TodayJob = {
          id: b.id,
          start_time: startAt.toISOString(),
          end_time: endAt.toISOString(),
          client_name: b.customerName || 'Customer',
          client_phone: b.customerPhone,
          address: b.address,
          service_type: b.category || 'Service',
          status,
          dbStatus,
          eta_minutes: eta,
          risk: deriveRisk(startAt, eta),
          bookingId: b.id,
        };
        return [job];
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  jobs = inferStatusesForToday(jobs);

  const expected = jobs.reduce((sum, j) => sum + 0, 0);
  // TODO: derive from booking.price or earnings table when present
  const earnings: TodayEarnings = {
    expected: expected === 0 ? null : expected,
    completed: null,
    pending_release: null,
    tips: null,
  };

  // Basic, calm alerts derived from simple heuristics.
  const alerts: TodayAlert[] = [];
  const nextUpcoming = jobs.find((j) => j.status === 'upcoming');
  if (nextUpcoming) {
    const start = new Date(nextUpcoming.start_time);
    const mins = Math.round((start.getTime() - Date.now()) / 60000);
    if (mins >= 0 && mins <= 45) {
      alerts.push({ id: 'next-job', type: 'general', title: 'Next job starts soon', ctaLabel: 'Review' });
    }
  }

  const tasks = buildDefaultTasks();
  const messages: TodayMessageThread[] = []; // TODO: wire real message threads per pro

  return { dateISO, jobs, alerts, tasks, earnings, messages };
}

